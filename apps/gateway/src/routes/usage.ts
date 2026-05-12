import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { createProblemError } from '@aihub/shared'
import { adminAuthHook } from '../plugins/admin-auth.js'
import { getUsageLogs, getUsageGroupSummary } from '../services/usage.js'

// ============================================================
// Auth helpers
// ============================================================

interface VkInfo {
  valid: boolean
  virtualKeyId?: string
  scopes?: string[]
}

/**
 * Determine auth context: admin or virtual key user.
 * Admin uses Bearer with admin_api_key; VK uses Bearer with aihub-* or x-api-key.
 */
function getAuthContext(request: FastifyRequest): {
  isAdmin: boolean
  virtualKeyId?: string
} {
  // Check for admin auth (admin API key)
  const authHeader = request.headers['authorization']
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (!token.startsWith('aihub-')) {
      // This is an admin API key
      return { isAdmin: true }
    }
    // This could be a VK — extract from vkInfo
  }

  // Check for VK info attached by vkAuthHook
  const vkInfo = (request as unknown as { vkInfo?: VkInfo }).vkInfo
  if (vkInfo?.virtualKeyId) {
    return { isAdmin: false, virtualKeyId: vkInfo.virtualKeyId }
  }

  return { isAdmin: false }
}

// ============================================================
// Validation Schemas
// ============================================================

const usageQuerySchema = z.object({
  virtual_key_id: z.string().optional(),
  provider_id: z.string().optional(),
  model_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

const summaryQuerySchema = z.object({
  virtual_key_id: z.string().optional(),
  provider_id: z.string().optional(),
  model_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  group_by: z.enum(['virtual_key', 'provider', 'model']).default('model'),
})

// ============================================================
// Route Registration
// ============================================================

export async function registerUsageRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // GET /v1/usage — Query usage records
  // Admin: full access with all filters
  // VK: own usage only, no provider_id filter
  // ----------------------------------------------------------
  app.get('/admin/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    // Try admin auth first
    const authHeader = request.headers['authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    // Check if admin
    const { loadConfig } = await import('../config/index.js')
    const config = loadConfig()
    const isAdmin =
      token && token !== config.ADMIN_API_KEY ? false : !!token && token === config.ADMIN_API_KEY

    // Extract VK info if present
    const vkInfo = (request as unknown as { vkInfo?: VkInfo }).vkInfo

    if (!isAdmin && !vkInfo?.virtualKeyId) {
      throw createProblemError(401, 'Unauthorized', 'Authentication required')
    }

    const query = usageQuerySchema.parse(request.query)

    if (isAdmin) {
      // Admin: support all filters
      const result = await getUsageLogs({
        virtualKeyId: query.virtual_key_id,
        providerId: query.provider_id,
        modelId: query.model_id,
        startDate: query.start_date ? new Date(query.start_date) : undefined,
        endDate: query.end_date ? new Date(query.end_date) : undefined,
        limit: query.limit,
        cursor: query.cursor,
      })

      return {
        data: result.data.map(formatUsageLogAdmin),
        next_cursor: result.nextCursor,
        has_more: result.hasMore,
      }
    }

    // VK user: own usage only, no provider_id
    const result = await getUsageLogs({
      virtualKeyId: vkInfo!.virtualKeyId,
      modelId: query.model_id,
      startDate: query.start_date ? new Date(query.start_date) : undefined,
      endDate: query.end_date ? new Date(query.end_date) : undefined,
      limit: query.limit,
      cursor: query.cursor,
    })

    return {
      data: result.data.map(formatUsageLogUser),
      next_cursor: result.nextCursor,
      has_more: result.hasMore,
    }
  })

  // ----------------------------------------------------------
  // GET /v1/usage/summary — Usage aggregation
  // Admin: group by virtual_key, provider, or model
  // VK: own usage only, group by model only
  // ----------------------------------------------------------
  app.get('/v1/usage/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers['authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    const { loadConfig } = await import('../config/index.js')
    const config = loadConfig()
    const isAdmin =
      token && token !== config.ADMIN_API_KEY ? false : !!token && token === config.ADMIN_API_KEY

    const vkInfo = (request as unknown as { vkInfo?: VkInfo }).vkInfo

    if (!isAdmin && !vkInfo?.virtualKeyId) {
      throw createProblemError(401, 'Unauthorized', 'Authentication required')
    }

    const query = summaryQuerySchema.parse(request.query)

    if (isAdmin) {
      const result = await getUsageGroupSummary({
        virtualKeyId: query.virtual_key_id,
        providerId: query.provider_id,
        modelId: query.model_id,
        startDate: query.start_date ? new Date(query.start_date) : undefined,
        endDate: query.end_date ? new Date(query.end_date) : undefined,
        groupBy: query.group_by,
      })

      return { data: result }
    }

    // VK user: only own usage, only model grouping
    const result = await getUsageGroupSummary({
      virtualKeyId: vkInfo!.virtualKeyId,
      modelId: query.model_id,
      startDate: query.start_date ? new Date(query.start_date) : undefined,
      endDate: query.end_date ? new Date(query.end_date) : undefined,
      groupBy: 'model', // VK users can only group by model
    })

    return { data: result }
  })
}

// ============================================================
// Response formatters
// ============================================================

/**
 * Admin view — includes provider_id
 */
function formatUsageLogAdmin(log: {
  id: string
  virtualKeyId: string
  providerId: string | null
  modelId: string | null
  modelName: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requestId: string
  requestType: string
  status: string
  errorCode: string | null
  latencyMs: number
  createdAt: Date
}) {
  return {
    id: log.id,
    virtual_key_id: log.virtualKeyId,
    provider_id: log.providerId,
    model_id: log.modelId,
    model_name: log.modelName,
    prompt_tokens: log.promptTokens,
    completion_tokens: log.completionTokens,
    total_tokens: log.totalTokens,
    request_id: log.requestId,
    request_type: log.requestType,
    status: log.status,
    error_code: log.errorCode,
    latency_ms: log.latencyMs,
    created_at: log.createdAt.toISOString(),
  }
}

/**
 * User view — hides provider_id
 */
function formatUsageLogUser(log: {
  id: string
  modelName: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requestType: string
  status: string
  latencyMs: number
  createdAt: Date
}) {
  return {
    id: log.id,
    model_name: log.modelName,
    prompt_tokens: log.promptTokens,
    completion_tokens: log.completionTokens,
    total_tokens: log.totalTokens,
    request_type: log.requestType,
    status: log.status,
    latency_ms: log.latencyMs,
    created_at: log.createdAt.toISOString(),
  }
}
