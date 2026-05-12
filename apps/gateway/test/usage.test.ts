import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @aihub/database before importing anything that depends on it
vi.mock('@aihub/database', () => ({
  prisma: {
    usageLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}))

// Import after mock setup
import { prisma } from '@aihub/database'
import {
  recordUsage,
  getUsageSummary,
  getUsageLogs,
  getUsageGroupSummary,
} from '../src/services/usage.js'

const mockPrisma = vi.mocked(prisma)

// ============================================================
// recordUsage tests
// ============================================================

describe('recordUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a UsageLog record with correct fields', async () => {
    const mockLog = {
      id: 'log-1',
      virtualKeyId: 'vk-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      modelName: 'gpt-4o',
      promptTokens: 50,
      completionTokens: 100,
      totalTokens: 150,
      requestId: 'req-1',
      requestType: 'chat',
      status: 'success',
      errorCode: null,
      latencyMs: 250,
      createdAt: new Date(),
    }

    mockPrisma.usageLog.create.mockResolvedValueOnce(mockLog as any)

    const result = await recordUsage({
      virtualKeyId: 'vk-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      modelName: 'gpt-4o',
      promptTokens: 50,
      completionTokens: 100,
      totalTokens: 150,
      requestId: 'req-1',
      requestType: 'chat',
      status: 'success',
      latencyMs: 250,
    })

    expect(result).toEqual(mockLog)
    expect(mockPrisma.usageLog.create).toHaveBeenCalledWith({
      data: {
        virtualKeyId: 'vk-1',
        providerId: 'prov-1',
        modelId: 'model-1',
        modelName: 'gpt-4o',
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
        requestId: 'req-1',
        requestType: 'chat',
        status: 'success',
        errorCode: null,
        latencyMs: 250,
      },
    })
  })

  it('should handle null optional fields', async () => {
    mockPrisma.usageLog.create.mockResolvedValueOnce({ id: 'log-2' } as any)

    await recordUsage({
      virtualKeyId: 'vk-1',
      modelName: 'gpt-4o',
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      requestId: 'req-2',
      requestType: 'chat',
      status: 'success',
      latencyMs: 100,
    })

    expect(mockPrisma.usageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerId: null,
        modelId: null,
        errorCode: null,
      }),
    })
  })

  it('should handle error status with errorCode', async () => {
    mockPrisma.usageLog.create.mockResolvedValueOnce({ id: 'log-3' } as any)

    await recordUsage({
      virtualKeyId: 'vk-1',
      modelName: 'gpt-4o',
      promptTokens: 25,
      completionTokens: 0,
      totalTokens: 25,
      requestId: 'req-3',
      requestType: 'chat',
      status: 'error',
      errorCode: '500',
      latencyMs: 5000,
    })

    expect(mockPrisma.usageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'error',
        errorCode: '500',
      }),
    })
  })

  it('should throw on database error (caller handles fire-and-forget)', async () => {
    mockPrisma.usageLog.create.mockRejectedValueOnce(new Error('DB connection failed'))

    await expect(
      recordUsage({
        virtualKeyId: 'vk-1',
        modelName: 'gpt-4o',
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        requestId: 'req-4',
        requestType: 'chat',
        status: 'success',
        latencyMs: 100,
      }),
    ).rejects.toThrow('DB connection failed')
  })
})

// ============================================================
// getUsageSummary tests
// ============================================================

describe('getUsageSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should aggregate token usage for a virtual key since a date', async () => {
    mockPrisma.usageLog.aggregate.mockResolvedValueOnce({
      _sum: {
        promptTokens: 500,
        completionTokens: 1000,
        totalTokens: 1500,
      },
    } as any)

    const since = new Date('2026-05-01T00:00:00Z')
    const result = await getUsageSummary('vk-1', since)

    expect(result).toEqual({
      promptTokens: 500,
      completionTokens: 1000,
      totalTokens: 1500,
    })

    expect(mockPrisma.usageLog.aggregate).toHaveBeenCalledWith({
      where: {
        virtualKeyId: 'vk-1',
        createdAt: { gte: since },
        status: 'success',
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
    })
  })

  it('should return zeros when no usage found', async () => {
    mockPrisma.usageLog.aggregate.mockResolvedValueOnce({
      _sum: {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      },
    } as any)

    const result = await getUsageSummary('vk-nonexistent', new Date())

    expect(result).toEqual({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    })
  })
})

// ============================================================
// getUsageLogs tests
// ============================================================

describe('getUsageLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return logs with cursor-based pagination', async () => {
    const logs = Array.from({ length: 11 }, (_, i) => ({
      id: `log-${i}`,
      virtualKeyId: 'vk-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      modelName: 'gpt-4o',
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      requestId: `req-${i}`,
      requestType: 'chat',
      status: 'success',
      errorCode: null,
      latencyMs: 100,
      createdAt: new Date(),
    }))

    mockPrisma.usageLog.findMany.mockResolvedValueOnce(logs as any)

    const result = await getUsageLogs({
      virtualKeyId: 'vk-1',
      limit: 10,
    })

    expect(result.data).toHaveLength(10)
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('log-9')
  })

  it('should return hasMore=false when no more results', async () => {
    const logs = Array.from({ length: 5 }, (_, i) => ({
      id: `log-${i}`,
    }))

    mockPrisma.usageLog.findMany.mockResolvedValueOnce(logs as any)

    const result = await getUsageLogs({ limit: 10 })

    expect(result.data).toHaveLength(5)
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('should apply date filters', async () => {
    mockPrisma.usageLog.findMany.mockResolvedValueOnce([] as any)

    const startDate = new Date('2026-05-01')
    const endDate = new Date('2026-05-31')

    await getUsageLogs({
      startDate,
      endDate,
      limit: 20,
    })

    expect(mockPrisma.usageLog.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      take: 21,
      orderBy: { createdAt: 'desc' },
    })
  })

  it('should apply cursor filter', async () => {
    mockPrisma.usageLog.findMany.mockResolvedValueOnce([] as any)

    await getUsageLogs({
      cursor: 'last-log-id',
      limit: 10,
    })

    expect(mockPrisma.usageLog.findMany).toHaveBeenCalledWith({
      where: {
        id: { lt: 'last-log-id' },
      },
      take: 11,
      orderBy: { createdAt: 'desc' },
    })
  })
})

// ============================================================
// getUsageGroupSummary tests
// ============================================================

describe('getUsageGroupSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should group by model with correct SQL', async () => {
    const mockResult = [
      {
        group_key: 'model-1',
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
        request_count: 10,
      },
      {
        group_key: 'model-2',
        prompt_tokens: 50,
        completion_tokens: 75,
        total_tokens: 125,
        request_count: 5,
      },
    ]

    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce(mockResult)

    const result = await getUsageGroupSummary({
      groupBy: 'model',
      startDate: new Date('2026-05-01'),
    })

    expect(result).toEqual(mockResult)
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1)

    // Verify the SQL contains model_id as group column
    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string
    expect(sql).toContain('model_id')
    expect(sql).toContain("status = 'success'")
    expect(sql).toContain('GROUP BY')
  })

  it('should group by provider with virtual_key_id filter', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([])

    await getUsageGroupSummary({
      virtualKeyId: 'vk-1',
      groupBy: 'provider',
    })

    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string
    expect(sql).toContain('provider_id')
    expect(sql).toContain('virtual_key_id')
  })

  it('should group by virtual_key', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([])

    await getUsageGroupSummary({
      groupBy: 'virtual_key',
    })

    const sql = mockPrisma.$queryRawUnsafe.mock.calls[0][0] as string
    expect(sql).toContain('virtual_key_id')
  })
})
