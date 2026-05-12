import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@aihub/database'
import type { VirtualKey, AuditLog } from '@prisma/client'
import { getUsageSummary } from './usage.js'

// ============================================================
// Types
// ============================================================

export interface VirtualKeyRateLimits {
  rpm?: number
  tpm?: number
}

export interface VirtualKeyBudget {
  token_limit: number
  reset_at: string // ISO date string
}

export interface ValidateResult {
  valid: boolean
  virtualKeyId?: string
  scopes?: string[]
  rateLimits?: VirtualKeyRateLimits | null
  budgetStatus?: 'ok' | 'exceeded'
  reason?: string
}

export interface UsageSummary {
  totalTokens: number
}

// ============================================================
// Key Generation & Hashing
// ============================================================

/**
 * Generate a Virtual Key with prefix format: aihub-{name}-{random}
 * The name is slug-safe (lowercase, hyphens only, max 20 chars)
 */
export function generateVirtualKey(name: string): { plaintext: string; prefix: string } {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20)
  const random = randomBytes(16).toString('base64url')
  const plaintext = `aihub-${slug}-${random}`
  const prefix = `aihub-${slug}`
  return { plaintext, prefix }
}

/**
 * SHA-256 hash of a key for storage
 */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Extract key prefix for fast lookup
 * e.g. "aihub-prod-app-abcdef123" => "aihub-prod-app"
 */
export function extractKeyPrefix(key: string): string {
  // VK format: aihub-{name}-{random}
  // The random part is 22+ chars of base64url
  // We take everything before the last segment
  const match = key.match(/^(aihub-[a-z0-9-]+)-[A-Za-z0-9_-]+$/)
  if (match) return match[1]
  // Fallback: first 3 dash-separated segments
  const parts = key.split('-')
  if (parts.length >= 3) return parts.slice(0, 3).join('-')
  return key
}

// ============================================================
// CRUD Operations
// ============================================================

export interface CreateVirtualKeyInput {
  name: string
  scopes: string[]
  rateLimits?: VirtualKeyRateLimits
  budget?: VirtualKeyBudget
  expiresAt?: Date
}

export interface UpdateVirtualKeyInput {
  name?: string
  scopes?: string[]
  rateLimits?: VirtualKeyRateLimits | null
  budget?: VirtualKeyBudget | null
  expiresAt?: Date | null
}

/**
 * Create a Virtual Key — returns plaintext key (only once)
 */
export async function createVirtualKey(
  input: CreateVirtualKeyInput,
  operator?: string,
): Promise<{ key: string; record: VirtualKey }> {
  const { plaintext, prefix } = generateVirtualKey(input.name)

  // Check duplicate prefix
  const existing = await prisma.virtualKey.findUnique({ where: { keyPrefix: prefix } })
  if (existing) {
    // Append a short random to make prefix unique
    const extraRandom = randomBytes(2).toString('hex')
    const newPrefix = `${prefix}-${extraRandom}`
    const newPlaintext = `aihub-${input.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 20)}-${extraRandom}-${randomBytes(16).toString('base64url')}`
    return createVirtualKeyWithPrefix(newPlaintext, newPrefix, input, operator)
  }

  return createVirtualKeyWithPrefix(plaintext, prefix, input, operator)
}

async function createVirtualKeyWithPrefix(
  plaintext: string,
  prefix: string,
  input: CreateVirtualKeyInput,
  operator?: string,
): Promise<{ key: string; record: VirtualKey }> {
  const keyHash = hashKey(plaintext)

  const record = await prisma.virtualKey.create({
    data: {
      name: input.name,
      keyHash,
      keyPrefix: prefix,
      scopes: input.scopes,
      rateLimits: input.rateLimits ?? undefined,
      budget: input.budget ?? undefined,
      expiresAt: input.expiresAt ?? undefined,
    },
  })

  // Audit log
  await writeAuditLog(
    'virtual_key.created',
    'virtual_key',
    record.id,
    {
      name: record.name,
      key_prefix: record.keyPrefix,
      scopes: record.scopes,
    },
    operator,
  )

  return { key: plaintext, record }
}

/**
 * List Virtual Keys with cursor-based pagination
 */
export async function listVirtualKeys(options: {
  status?: string
  limit: number
  cursor?: string
}): Promise<{ data: VirtualKey[]; nextCursor: string | null; hasMore: boolean }> {
  const { status, limit, cursor } = options

  const where = {
    ...(status ? { status } : {}),
    ...(cursor ? { id: { gt: cursor } } : {}),
  }

  const keys = await prisma.virtualKey.findMany({
    where,
    take: limit + 1,
    orderBy: { id: 'asc' },
  })

  const hasMore = keys.length > limit
  const data = hasMore ? keys.slice(0, -1) : keys

  return {
    data,
    nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    hasMore,
  }
}

/**
 * Get Virtual Key by ID
 */
export async function getVirtualKey(id: string): Promise<VirtualKey | null> {
  return prisma.virtualKey.findUnique({ where: { id } })
}

/**
 * Update Virtual Key
 */
export async function updateVirtualKey(
  id: string,
  input: UpdateVirtualKeyInput,
  operator?: string,
): Promise<VirtualKey> {
  const existing = await prisma.virtualKey.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`VirtualKey "${id}" not found`)
  }

  const data: Record<string, unknown> = {}
  if (input.scopes !== undefined) data.scopes = input.scopes
  if (input.rateLimits !== undefined) data.rateLimits = input.rateLimits
  if (input.budget !== undefined) data.budget = input.budget
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt

  const record = await prisma.virtualKey.update({
    where: { id },
    data,
  })

  // Audit log
  await writeAuditLog(
    'virtual_key.updated',
    'virtual_key',
    record.id,
    {
      updated_fields: Object.keys(data),
    },
    operator,
  )

  return record
}

/**
 * Revoke Virtual Key (soft delete — sets status to revoked)
 */
export async function revokeVirtualKey(id: string, operator?: string): Promise<VirtualKey> {
  const existing = await prisma.virtualKey.findUnique({ where: { id } })
  if (!existing) {
    throw new Error(`VirtualKey "${id}" not found`)
  }

  const record = await prisma.virtualKey.update({
    where: { id },
    data: { status: 'revoked' },
  })

  // Audit log
  await writeAuditLog(
    'virtual_key.revoked',
    'virtual_key',
    record.id,
    {
      name: record.name,
      key_prefix: record.keyPrefix,
    },
    operator,
  )

  return record
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate a Virtual Key — checks hash, status, scope, and budget
 */
export async function validateVirtualKey(
  key: string,
  requiredScope?: string,
): Promise<ValidateResult> {
  const prefix = extractKeyPrefix(key)
  const keyHash = hashKey(key)

  // Find by prefix first (fast lookup), then verify hash
  const vk = await prisma.virtualKey.findUnique({ where: { keyPrefix: prefix } })

  if (!vk) {
    return { valid: false, reason: 'key_not_found' }
  }

  // Verify hash
  if (vk.keyHash !== keyHash) {
    return { valid: false, reason: 'key_invalid' }
  }

  // Check status
  if (vk.status === 'revoked') {
    return { valid: false, reason: 'key_revoked' }
  }

  // Check expiry
  if (vk.expiresAt && vk.expiresAt < new Date()) {
    return { valid: false, reason: 'key_expired' }
  }

  // Check scope
  if (requiredScope && !vk.scopes.includes(requiredScope)) {
    return { valid: false, reason: 'scope_denied', virtualKeyId: vk.id, scopes: vk.scopes }
  }

  // Check budget
  if (vk.budget) {
    const budgetOk = await checkBudget(vk.id, vk.budget)
    if (!budgetOk) {
      return {
        valid: false,
        reason: 'budget_exceeded',
        virtualKeyId: vk.id,
        scopes: vk.scopes,
        rateLimits: vk.rateLimits as VirtualKeyRateLimits | null,
        budgetStatus: 'exceeded',
      }
    }
  }

  return {
    valid: true,
    virtualKeyId: vk.id,
    scopes: vk.scopes,
    rateLimits: vk.rateLimits as VirtualKeyRateLimits | null,
    budgetStatus: vk.budget ? 'ok' : undefined,
  }
}

/**
 * Check budget against usage summary
 * Queries actual token usage from UsageLog and compares to budget limit.
 */
async function checkBudget(virtualKeyId: string, budget: VirtualKeyBudget): Promise<boolean> {
  const since = new Date(budget.reset_at)
  const usage = await getUsageSummary(virtualKeyId, since)
  return usage.totalTokens < budget.token_limit
}

// ============================================================
// Audit Logging
// ============================================================

export interface AuditLogDetail {
  [key: string]: unknown
}

/**
 * Write an audit log entry
 */
export async function writeAuditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  detail?: AuditLogDetail,
  operator?: string,
): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action,
      resourceType,
      resourceId,
      detail: detail ?? undefined,
      operator: operator ?? 'admin',
    },
  })
}
