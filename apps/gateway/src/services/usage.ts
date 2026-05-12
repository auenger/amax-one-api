import { prisma } from '@aihub/database'
import { createLogger } from '@aihub/shared'
import type { UsageLog } from '@prisma/client'

const logger = createLogger('usage')

// ============================================================
// Types
// ============================================================

export interface RecordUsageParams {
  virtualKeyId: string
  providerId?: string
  modelId?: string
  modelName: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  requestId: string
  requestType: 'chat' | 'embedding'
  status: 'success' | 'error'
  errorCode?: string
  latencyMs: number
}

export interface UsageSummary {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface UsageGroupSummary {
  group_key: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  request_count: number
}

// ============================================================
// recordUsage — Fire-and-forget usage recording
// ============================================================

/**
 * Record a single API request's token usage to UsageLog.
 * Designed to be called in fire-and-forget mode — failures are logged but don't propagate.
 */
export async function recordUsage(params: RecordUsageParams): Promise<UsageLog> {
  try {
    const log = await prisma.usageLog.create({
      data: {
        virtualKeyId: params.virtualKeyId,
        providerId: params.providerId ?? null,
        modelId: params.modelId ?? null,
        modelName: params.modelName,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens: params.totalTokens,
        requestId: params.requestId,
        requestType: params.requestType,
        status: params.status,
        errorCode: params.errorCode ?? null,
        latencyMs: params.latencyMs,
      },
    })
    return log
  } catch (err) {
    // Log but don't throw — fire-and-forget
    logger.warn({ err, requestId: params.requestId }, 'Failed to record usage')
    throw err
  }
}

// ============================================================
// getUsageSummary — Aggregate usage for budget check
// ============================================================

/**
 * Get cumulative token usage for a Virtual Key since a given date.
 * Used by auth-pool for budget enforcement.
 */
export async function getUsageSummary(virtualKeyId: string, since: Date): Promise<UsageSummary> {
  const result = await prisma.usageLog.aggregate({
    where: {
      virtualKeyId,
      createdAt: { gte: since },
      status: 'success',
    },
    _sum: {
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
    },
  })

  return {
    promptTokens: result._sum.promptTokens ?? 0,
    completionTokens: result._sum.completionTokens ?? 0,
    totalTokens: result._sum.totalTokens ?? 0,
  }
}

// ============================================================
// getUsageLogs — Query usage records with cursor-based pagination
// ============================================================

export interface UsageLogQueryOptions {
  virtualKeyId?: string
  providerId?: string
  modelId?: string
  startDate?: Date
  endDate?: Date
  limit: number
  cursor?: string
}

/**
 * Query usage logs with cursor-based pagination.
 */
export async function getUsageLogs(options: UsageLogQueryOptions): Promise<{
  data: UsageLog[]
  nextCursor: string | null
  hasMore: boolean
}> {
  const { virtualKeyId, providerId, modelId, startDate, endDate, limit, cursor } = options

  const where: Record<string, unknown> = {}
  if (virtualKeyId) where.virtualKeyId = virtualKeyId
  if (providerId) where.providerId = providerId
  if (modelId) where.modelId = modelId
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {}
    if (startDate) createdAt.gte = startDate
    if (endDate) createdAt.lte = endDate
    where.createdAt = createdAt
  }
  if (cursor) {
    where.id = { lt: cursor }
  }

  const logs = await prisma.usageLog.findMany({
    where,
    take: limit + 1,
    orderBy: { createdAt: 'desc' },
  })

  const hasMore = logs.length > limit
  const data = hasMore ? logs.slice(0, -1) : logs

  return {
    data,
    nextCursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
    hasMore,
  }
}

// ============================================================
// getUsageGroupSummary — Aggregate usage by dimension
// ============================================================

export interface UsageGroupQueryOptions {
  virtualKeyId?: string
  providerId?: string
  modelId?: string
  startDate?: Date
  endDate?: Date
  groupBy: 'virtual_key' | 'provider' | 'model'
}

/**
 * Get aggregated usage grouped by a dimension (virtual_key, provider, or model).
 * Uses raw SQL for GROUP BY since Prisma doesn't natively support it.
 */
export async function getUsageGroupSummary(
  options: UsageGroupQueryOptions,
): Promise<UsageGroupSummary[]> {
  const { virtualKeyId, providerId, modelId, startDate, endDate, groupBy } = options

  // Map groupBy to the correct column
  const groupColumn = (() => {
    switch (groupBy) {
      case 'virtual_key':
        return 'virtual_key_id'
      case 'provider':
        return 'provider_id'
      case 'model':
        return 'model_id'
    }
  })()

  // Build WHERE conditions
  const conditions: string[] = []
  const params: unknown[] = []
  let paramIndex = 1

  if (virtualKeyId) {
    conditions.push(`virtual_key_id = $${paramIndex++}`)
    params.push(virtualKeyId)
  }
  if (providerId) {
    conditions.push(`provider_id = $${paramIndex++}`)
    params.push(providerId)
  }
  if (modelId) {
    conditions.push(`model_id = $${paramIndex++}`)
    params.push(modelId)
  }
  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`)
    params.push(startDate)
  }
  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`)
    params.push(endDate)
  }

  conditions.push(`status = 'success'`)

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const query = `
    SELECT
      ${groupColumn} AS group_key,
      SUM(prompt_tokens) AS prompt_tokens,
      SUM(completion_tokens) AS completion_tokens,
      SUM(total_tokens) AS total_tokens,
      COUNT(*)::int AS request_count
    FROM usage_logs
    ${whereClause}
    GROUP BY ${groupColumn}
    ORDER BY total_tokens DESC
  `

  const results = await prisma.$queryRawUnsafe<UsageGroupSummary[]>(query, ...params)
  return results
}
