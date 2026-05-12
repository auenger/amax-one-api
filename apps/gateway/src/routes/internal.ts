import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createProblemError } from '@aihub/shared'
import { resolveModel, getProviderStatus } from '../services/model-resolver.js'
import { retryFailedSyncs } from '../services/new-api-sync.js'

// ============================================================
// Route Registration
// ============================================================

export async function registerInternalRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // GET /v1/internal/resolve?name=xxx — Resolve model/alias
  // Internal API for openai-proxy to call
  // ----------------------------------------------------------
  app.get('/v1/internal/resolve', async (request) => {
    const query = z
      .object({
        name: z.string().min(1),
      })
      .parse(request.query)

    const resolved = await resolveModel(query.name)
    if (!resolved) {
      throw createProblemError(
        404,
        'Model not found',
        `No model or alias found for "${query.name}"`,
      )
    }

    return {
      model: resolved.model,
      provider: resolved.provider,
    }
  })

  // ----------------------------------------------------------
  // GET /v1/internal/provider-status?id=xxx — Provider status
  // ----------------------------------------------------------
  app.get('/v1/internal/provider-status', async (request) => {
    const query = z
      .object({
        id: z.string().min(1),
      })
      .parse(request.query)

    const status = await getProviderStatus(query.id)
    if (!status) {
      throw createProblemError(404, 'Provider not found', `Provider "${query.id}" does not exist`)
    }

    return status
  })

  // ----------------------------------------------------------
  // POST /v1/internal/sync-retry — Trigger sync compensation
  // Can be called by cron or scheduler
  // ----------------------------------------------------------
  app.post('/v1/internal/sync-retry', async () => {
    const result = await retryFailedSyncs()
    return result
  })
}
