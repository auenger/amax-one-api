import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @aihub/database before importing anything that depends on it
vi.mock('@aihub/database', () => ({
  prisma: {
    model: {
      findUnique: vi.fn(),
    },
    modelAlias: {
      findUnique: vi.fn(),
    },
  },
}))

// Import after mock setup
import { prisma } from '@aihub/database'
import { resolveModel, getProviderStatus } from '../src/services/model-resolver.js'

const mockPrisma = vi.mocked(prisma)

describe('resolveModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should resolve a direct model name', async () => {
    const mockModel = {
      id: 'model-1',
      name: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4',
      capabilities: ['text', 'vision'],
      contextWindow: 200000,
      status: 'active',
      provider: {
        id: 'provider-1',
        name: 'Anthropic',
        type: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        status: 'active',
      },
    }

    mockPrisma.model.findUnique.mockResolvedValue(mockModel as never)

    const result = await resolveModel('claude-sonnet-4-20250514')

    expect(result).toEqual({
      model: {
        id: 'model-1',
        name: 'claude-sonnet-4-20250514',
        display_name: 'Claude Sonnet 4',
        capabilities: ['text', 'vision'],
        context_window: 200000,
        status: 'active',
      },
      provider: {
        id: 'provider-1',
        name: 'Anthropic',
        type: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        status: 'active',
      },
    })
  })

  it('should resolve via alias when model name not found', async () => {
    // First call (direct model lookup) returns null
    mockPrisma.model.findUnique.mockResolvedValue(null as never)

    // Second call (alias lookup) returns the alias with model
    const mockAlias = {
      id: 'alias-1',
      alias: 'smart',
      modelId: 'model-1',
      createdAt: new Date(),
      model: {
        id: 'model-1',
        name: 'claude-sonnet-4-20250514',
        displayName: 'Claude Sonnet 4',
        capabilities: ['text', 'vision'],
        contextWindow: 200000,
        status: 'active',
        provider: {
          id: 'provider-1',
          name: 'Anthropic',
          type: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1',
          status: 'active',
        },
      },
    }

    mockPrisma.modelAlias.findUnique.mockResolvedValue(mockAlias as never)

    const result = await resolveModel('smart')

    expect(result).not.toBeNull()
    expect(result?.model.name).toBe('claude-sonnet-4-20250514')
    expect(result?.provider.type).toBe('anthropic')
  })

  it('should return null for unknown model/alias', async () => {
    mockPrisma.model.findUnique.mockResolvedValue(null as never)
    mockPrisma.modelAlias.findUnique.mockResolvedValue(null as never)

    const result = await resolveModel('unknown-model')
    expect(result).toBeNull()
  })
})

describe('getProviderStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null for non-existent provider', async () => {
    mockPrisma.provider = {
      findUnique: vi.fn().mockResolvedValue(null),
    } as never

    const result = await getProviderStatus('non-existent')
    expect(result).toBeNull()
  })

  it('should return provider status with last sync check', async () => {
    const mockProvider = {
      status: 'active',
    }
    const mockSyncLog = {
      createdAt: new Date('2026-05-12T10:00:00Z'),
    }

    mockPrisma.provider = {
      findUnique: vi.fn().mockResolvedValue(mockProvider),
    } as never
    mockPrisma.channelSyncLog = {
      findFirst: vi.fn().mockResolvedValue(mockSyncLog),
    } as never

    const result = await getProviderStatus('provider-1')

    expect(result).toEqual({
      status: 'active',
      lastCheck: '2026-05-12T10:00:00.000Z',
    })
  })
})
