import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@aihub/database'
import { createProblemError, encodeCursor, decodeCursor } from '@aihub/shared'
import { syncProviderToChannel } from '../services/new-api-sync.js'
import { decrypt } from '../utils/crypto.js'

// ============================================================
// Validation Schemas
// ============================================================

const createModelSchema = z.object({
  provider_id: z.string().min(1),
  name: z.string().min(1).max(200),
  display_name: z.string().max(200).optional(),
  capabilities: z.array(z.string()).default([]),
  context_window: z.number().int().positive().optional(),
  pricing: z
    .object({
      input_per_1k: z.number().nonnegative(),
      output_per_1k: z.number().nonnegative(),
    })
    .optional(),
  status: z.enum(['active', 'deprecated', 'hidden']).default('active'),
})

const listModelsQuerySchema = z.object({
  capability: z.string().optional(),
  status: z.enum(['active', 'deprecated', 'hidden']).optional(),
  provider_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ============================================================
// Route Registration
// // ============================================================

export async function registerModelRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // POST /v1/models — Create model
  // ----------------------------------------------------------
  app.post('/v1/models', async (request, reply) => {
    const body = createModelSchema.parse(request.body)

    // Verify provider exists
    const provider = await prisma.provider.findUnique({
      where: { id: body.provider_id },
      include: {
        keys: { where: { status: 'active' } },
        models: { where: { status: 'active' } },
      },
    })

    if (!provider) {
      throw createProblemError(
        404,
        'Provider not found',
        `Provider "${body.provider_id}" does not exist`,
      )
    }

    // Check duplicate model name
    const existingModel = await prisma.model.findUnique({ where: { name: body.name } })
    if (existingModel) {
      throw createProblemError(409, 'Duplicate model name', `Model "${body.name}" already exists`)
    }

    const model = await prisma.model.create({
      data: {
        providerId: body.provider_id,
        name: body.name,
        displayName: body.display_name,
        capabilities: body.capabilities,
        contextWindow: body.context_window,
        pricing: body.pricing,
        status: body.status,
      },
    })

    // Sync model change to new-api channel
    const keys = provider.keys.map((k) => ({
      encryptedKey: k.encryptedKey,
      decryptedKey: decrypt(k.encryptedKey),
    }))
    const allModelNames = [...provider.models.map((m) => m.name), body.name]

    syncProviderToChannel({
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      endpoint: provider.endpoint,
      keys,
      modelNames: allModelNames,
      action: provider.newApiChannelId ? 'update' : 'create',
    }).catch(() => {})

    reply.status(201).send(formatModel(model, true))
  })

  // ----------------------------------------------------------
  // GET /v1/models — List models
  // ----------------------------------------------------------
  app.get('/v1/models', async (request) => {
    const query = listModelsQuerySchema.parse(request.query)

    // Build where clause
    const where: Record<string, unknown> = {}
    if (query.status) {
      where.status = query.status
    }
    if (query.provider_id) {
      where.providerId = query.provider_id
    }
    if (query.capability) {
      where.capabilities = { has: query.capability }
    }
    if (query.cursor) {
      const cursorFields = decodeCursor(query.cursor)
      where.id = { gt: cursorFields['id'] as string }
    }

    const models = await prisma.model.findMany({
      where,
      take: query.limit + 1,
      orderBy: { id: 'asc' },
      include: { provider: { select: { id: true, name: true, type: true } } },
    })

    const hasMore = models.length > query.limit
    const data = hasMore ? models.slice(0, -1) : models

    // For now, always return full info (admin view)
    // The auth-based view differentiation will be handled by the auth-pool feature
    const isAdmin = true

    return {
      data: data.map((m) => formatModelWithProvider(m, isAdmin)),
      next_cursor:
        hasMore && data.length > 0 ? encodeCursor({ id: data[data.length - 1]!.id }) : null,
      has_more: hasMore,
    }
  })

  // ----------------------------------------------------------
  // GET /v1/models/:id — Get model detail
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/v1/models/:id', async (request) => {
    const { id } = request.params

    const model = await prisma.model.findUnique({
      where: { id },
      include: { provider: { select: { id: true, name: true, type: true } } },
    })

    if (!model) {
      throw createProblemError(404, 'Model not found', `Model "${id}" does not exist`)
    }

    // Admin view for now
    return formatModelWithProvider(model, true)
  })

  // ----------------------------------------------------------
  // DELETE /v1/models/:id — Delete model
  // ----------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/v1/models/:id', async (request, reply) => {
    const { id } = request.params

    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            keys: { where: { status: 'active' } },
            models: { where: { status: 'active' } },
          },
        },
      },
    })

    if (!model) {
      throw createProblemError(404, 'Model not found', `Model "${id}" does not exist`)
    }

    // Delete model and its aliases (cascade)
    await prisma.model.delete({ where: { id } })

    // Sync updated models list to new-api
    if (model.provider) {
      const keys = model.provider.keys.map((k) => ({
        encryptedKey: k.encryptedKey,
        decryptedKey: decrypt(k.encryptedKey),
      }))
      const remainingModels = model.provider.models.filter((m) => m.id !== id).map((m) => m.name)

      syncProviderToChannel({
        providerId: model.provider.id,
        providerName: model.provider.name,
        providerType: model.provider.type,
        endpoint: model.provider.endpoint,
        keys,
        modelNames: remainingModels,
        action: 'update',
      }).catch(() => {})
    }

    reply.status(204).send()
  })
}

// ============================================================
// Helpers
// ============================================================

function formatModel(
  model: {
    id: string
    name: string
    displayName: string | null
    capabilities: string[]
    contextWindow: number | null
    pricing: unknown
    status: string
    providerId: string
    createdAt: Date
    updatedAt: Date
  },
  includeProvider: boolean,
) {
  return {
    id: model.id,
    name: model.name,
    display_name: model.displayName,
    capabilities: model.capabilities,
    context_window: model.contextWindow,
    pricing: model.pricing,
    status: model.status,
    ...(includeProvider ? { provider_id: model.providerId } : {}),
    created_at: model.createdAt.toISOString(),
    updated_at: model.updatedAt.toISOString(),
  }
}

function formatModelWithProvider(
  model: {
    id: string
    name: string
    displayName: string | null
    capabilities: string[]
    contextWindow: number | null
    pricing: unknown
    status: string
    providerId: string
    createdAt: Date
    updatedAt: Date
    provider: { id: string; name: string; type: string }
  },
  isAdmin: boolean,
) {
  if (isAdmin) {
    return {
      id: model.id,
      name: model.name,
      display_name: model.displayName,
      capabilities: model.capabilities,
      context_window: model.contextWindow,
      pricing: model.pricing,
      status: model.status,
      provider_id: model.provider.id,
      provider_name: model.provider.name,
      provider_type: model.provider.type,
      created_at: model.createdAt.toISOString(),
      updated_at: model.updatedAt.toISOString(),
    }
  }
  // User view — hide provider info
  return {
    id: model.id,
    name: model.name,
    display_name: model.displayName,
    capabilities: model.capabilities,
    context_window: model.contextWindow,
    status: model.status,
    created_at: model.createdAt.toISOString(),
    updated_at: model.updatedAt.toISOString(),
  }
}
