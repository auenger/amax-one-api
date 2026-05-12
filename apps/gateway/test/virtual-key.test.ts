import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @aihub/database before importing anything that depends on it
vi.mock('@aihub/database', () => ({
  prisma: {
    virtualKey: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}))

// Import after mock setup
import { prisma } from '@aihub/database'
import {
  generateVirtualKey,
  hashKey,
  extractKeyPrefix,
  validateVirtualKey,
} from '../src/services/virtual-key.js'

const mockPrisma = vi.mocked(prisma)

// ============================================================
// Pure function tests (no DB)
// ============================================================

describe('generateVirtualKey', () => {
  it('should generate a key with aihub-{name}-{random} format', () => {
    const { plaintext, prefix } = generateVirtualKey('prod-app')

    expect(plaintext).toMatch(/^aihub-prod-app-[A-Za-z0-9_-]+$/)
    expect(prefix).toBe('aihub-prod-app')
  })

  it('should slug-safe the name', () => {
    const { plaintext, prefix } = generateVirtualKey('My Production App!')

    expect(prefix).toMatch(/^aihub-my-production-app$/)
    expect(plaintext).toMatch(/^aihub-my-production-app-[A-Za-z0-9_-]+$/)
  })

  it('should truncate long names to 20 chars', () => {
    const { prefix } = generateVirtualKey('a-very-long-name-that-exceeds-twenty-characters')

    // slug is max 20 chars, so prefix is "aihub-{slug}" => "aihub-" + 20 max
    expect(prefix.length).toBeLessThanOrEqual(27) // "aihub-" + 20
  })

  it('should generate unique keys each time', () => {
    const key1 = generateVirtualKey('test')
    const key2 = generateVirtualKey('test')

    expect(key1.plaintext).not.toBe(key2.plaintext)
    expect(key1.prefix).toBe(key2.prefix)
  })
})

describe('hashKey', () => {
  it('should produce a SHA-256 hex hash', () => {
    const hash = hashKey('test-key')

    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should be deterministic', () => {
    const hash1 = hashKey('same-key')
    const hash2 = hashKey('same-key')

    expect(hash1).toBe(hash2)
  })

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashKey('key-one')
    const hash2 = hashKey('key-two')

    expect(hash1).not.toBe(hash2)
  })
})

describe('extractKeyPrefix', () => {
  it('should extract prefix from a well-formed key', () => {
    expect(extractKeyPrefix('aihub-prod-app-abc123XYZ')).toBe('aihub-prod-app')
  })

  it('should extract prefix from multi-segment name', () => {
    expect(extractKeyPrefix('aihub-my-test-app-randomChars')).toBe('aihub-my-test-app')
  })

  it('should handle minimum format', () => {
    expect(extractKeyPrefix('aihub-test-abc')).toBe('aihub-test')
  })

  it('should handle fallback for malformed keys', () => {
    const result = extractKeyPrefix('malformed')
    expect(result).toBe('malformed')
  })
})

// ============================================================
// validateVirtualKey tests (with DB mock)
// ============================================================

describe('validateVirtualKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return invalid when key not found', async () => {
    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce(null)

    const result = await validateVirtualKey('aihub-test-nonexistent')

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('key_not_found')
  })

  it('should return invalid when hash does not match', async () => {
    const correctKey = 'aihub-test-correctkey'
    const wrongKey = 'aihub-test-wrongkey'
    const correctHash = hashKey(correctKey)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash: correctHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat'],
      rateLimits: null,
      budget: null,
      status: 'active',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(wrongKey)

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('key_invalid')
  })

  it('should return invalid for revoked key', async () => {
    const key = 'aihub-test-somekey'
    const keyHash = hashKey(key)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat'],
      rateLimits: null,
      budget: null,
      status: 'revoked',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(key)

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('key_revoked')
  })

  it('should return invalid for expired key', async () => {
    const key = 'aihub-test-somekey'
    const keyHash = hashKey(key)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat'],
      rateLimits: null,
      budget: null,
      status: 'active',
      expiresAt: new Date('2020-01-01'), // expired
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(key)

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('key_expired')
  })

  it('should return invalid when scope not permitted', async () => {
    const key = 'aihub-test-somekey'
    const keyHash = hashKey(key)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat'], // only chat
      rateLimits: null,
      budget: null,
      status: 'active',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(key, 'embeddings')

    expect(result.valid).toBe(false)
    expect(result.reason).toBe('scope_denied')
    expect(result.scopes).toEqual(['chat'])
  })

  it('should return valid for correct key with matching scope', async () => {
    const key = 'aihub-test-somekey'
    const keyHash = hashKey(key)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat', 'embeddings'],
      rateLimits: { rpm: 60 },
      budget: null,
      status: 'active',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(key, 'chat')

    expect(result.valid).toBe(true)
    expect(result.virtualKeyId).toBe('vk-1')
    expect(result.scopes).toEqual(['chat', 'embeddings'])
  })

  it('should return valid without scope check if no scope required', async () => {
    const key = 'aihub-test-somekey'
    const keyHash = hashKey(key)

    mockPrisma.virtualKey.findUnique.mockResolvedValueOnce({
      id: 'vk-1',
      name: 'test',
      keyHash,
      keyPrefix: 'aihub-test',
      scopes: ['chat'],
      rateLimits: null,
      budget: null,
      status: 'active',
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const result = await validateVirtualKey(key)

    expect(result.valid).toBe(true)
    expect(result.virtualKeyId).toBe('vk-1')
  })
})
