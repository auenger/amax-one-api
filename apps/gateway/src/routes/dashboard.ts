import type { FastifyInstance } from 'fastify'
import { prisma } from '@aihub/database'

/**
 * Dashboard stats route — provides aggregated statistics for the admin dashboard.
 */
export async function registerDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/dashboard/stats', async () => {
    // Run all counts in parallel for performance
    const [modelCount, activeModelCount, providerCount, keyCount, usageToday, tokensToday] =
      await Promise.all([
        prisma.model.count(),
        prisma.model.count({ where: { status: 'active' } }),
        prisma.provider.count(),
        prisma.providerKey.count({ where: { status: 'active' } }),
        getTodayRequestCount(),
        getTodayTokenCount(),
      ])

    return {
      model_count: modelCount,
      active_model_count: activeModelCount,
      provider_count: providerCount,
      key_count: keyCount,
      today_requests: usageToday,
      today_tokens: tokensToday,
    }
  })
}

/** Count total requests today */
async function getTodayRequestCount(): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const result = await prisma.usageLog.aggregate({
    _count: { id: true },
    where: {
      createdAt: { gte: startOfDay },
      status: 'success',
    },
  })

  return result._count.id
}

/** Sum total tokens today */
async function getTodayTokenCount(): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const result = await prisma.usageLog.aggregate({
    _sum: { totalTokens: true },
    where: {
      createdAt: { gte: startOfDay },
      status: 'success',
    },
  })

  return result._sum.totalTokens ?? 0
}
