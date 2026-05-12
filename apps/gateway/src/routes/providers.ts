import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@aihub/database'
import { createProblemError } from '@aihub/shared'
import { encrypt, maskKey } from '../utils/crypto.js'
import { syncProviderToChannel, deleteChannel } from '../services/new-api-sync.js'
import { decrypt } from '../utils/crypto.js'

/**
 * Prisma JSON input type — matches Prisma's InputJsonValue
 */
type JsonInput = string | number | boolean | JsonInput[] | { [key: string]: JsonInput | undefined }

// ============================================================
// Validation Schemas
// ============================================================

const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['openai', 'anthropic']),
  endpoint: z.string().url(),
  status: z.enum(['active', 'degraded', 'disabled']).default('active'),
  rateLimits: z.record(z.string(), z.unknown()).optional(),
  keys: z
    .array(
      z.object({
        key: z.string().min(1),
        weight: z.number().int().min(1).max(1000).default(100),
      }),
    )
    .optional(),
})

const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  endpoint: z.string().url().optional(),
  status: z.enum(['active', 'degraded', 'disabled']).optional(),
  rateLimits: z.record(z.string(), z.unknown()).optional(),
})

const listProvidersQuerySchema = z.object({
  status: z.enum(['active', 'degraded', 'disabled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ============================================================
// Route Registration
// ============================================================

export async function registerProviderRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // POST /v1/providers — Create provider
  // ----------------------------------------------------------
  app.post('/v1/providers', async (request, reply) => {
    const body = createProviderSchema.parse(request.body)

    // Check duplicate name
    const existing = await prisma.provider.findUnique({ where: { name: body.name } })
    if (existing) {
      throw createProblemError(
        409,
        'Duplicate provider name',
        `Provider "${body.name}" already exists`,
      )
    }

    // Create provider
    const provider = await prisma.provider.create({
      data: {
        name: body.name,
        type: body.type,
        endpoint: body.endpoint,
        status: body.status,
        rateLimits: body.rateLimits as JsonInput | undefined,
      },
    })

    // Create keys if provided
    const createdKeys: Array<{ id: string; keyPrefix: string; weight: number; status: string }> = []
    if (body.keys && body.keys.length > 0) {
      for (const keyData of body.keys) {
        const encryptedKey = encrypt(keyData.key)
        const keyPrefix = maskKey(keyData.key)
        const key = await prisma.providerKey.create({
          data: {
            providerId: provider.id,
            encryptedKey,
            keyPrefix,
            weight: keyData.weight,
          },
        })
        createdKeys.push({
          id: key.id,
          keyPrefix: key.keyPrefix,
          weight: key.weight,
          status: key.status,
        })
      }
    }

    // Sync to new-api (async, don't block response)
    const syncPromise = syncProviderToChannel({
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      endpoint: provider.endpoint,
      keys: (body.keys ?? []).map((k, i) => ({
        encryptedKey: createdKeys[i]?.id ? encrypt(k.key) : '',
        decryptedKey: k.key,
      })),
      modelNames: [],
      action: 'create',
    })

    // Fire and forget, but update channel ID
    syncPromise
      .then(async (result) => {
        if (result.success && result.channelId) {
          await prisma.provider.update({
            where: { id: provider.id },
            data: { newApiChannelId: result.channelId },
          })
        }
      })
      .catch(() => {
        // Already logged in syncProviderToChannel
      })

    reply.status(201).send({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      endpoint: provider.endpoint,
      status: provider.status,
      rate_limits: provider.rateLimits,
      keys: createdKeys,
      created_at: provider.createdAt.toISOString(),
      updated_at: provider.updatedAt.toISOString(),
    })
  })

  // ----------------------------------------------------------
  // GET /v1/providers — List providers
  // ----------------------------------------------------------
  app.get('/v1/providers', async (request) => {
    const query = listProvidersQuerySchema.parse(request.query)

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cursor ? { id: { gt: query.cursor } } : {}),
    }

    const providers = await prisma.provider.findMany({
      where,
      take: query.limit + 1,
      orderBy: { id: 'asc' },
    })

    const hasMore = providers.length > query.limit
    const data = hasMore ? providers.slice(0, -1) : providers

    return {
      data: data.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        endpoint: p.endpoint,
        status: p.status,
        rate_limits: p.rateLimits,
        new_api_channel_id: p.newApiChannelId,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      })),
      next_cursor: hasMore ? (data[data.length - 1]?.id ?? null) : null,
      has_more: hasMore,
    }
  })

  // ----------------------------------------------------------
  // GET /v1/providers/:id — Get provider detail
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/v1/providers/:id', async (request) => {
    const { id } = request.params

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        keys: { orderBy: { createdAt: 'asc' } },
        models: { orderBy: { name: 'asc' } },
      },
    })

    if (!provider) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      endpoint: provider.endpoint,
      status: provider.status,
      rate_limits: provider.rateLimits,
      new_api_channel_id: provider.newApiChannelId,
      keys: provider.keys.map((k) => ({
        id: k.id,
        key_prefix: k.keyPrefix,
        weight: k.weight,
        status: k.status,
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
      })),
      models: provider.models.map((m) => ({
        id: m.id,
        name: m.name,
        display_name: m.displayName,
        status: m.status,
      })),
      created_at: provider.createdAt.toISOString(),
      updated_at: provider.updatedAt.toISOString(),
    }
  })

  // ----------------------------------------------------------
  // PUT /v1/providers/:id — Update provider
  // ----------------------------------------------------------
  app.put<{ Params: { id: string } }>('/v1/providers/:id', async (request) => {
    const { id } = request.params
    const body = updateProviderSchema.parse(request.body)

    const existing = await prisma.provider.findUnique({
      where: { id },
      include: {
        keys: { where: { status: 'active' } },
        models: { where: { status: 'active' } },
      },
    })

    if (!existing) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    // Check duplicate name if renaming
    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.provider.findUnique({ where: { name: body.name } })
      if (duplicate) {
        throw createProblemError(
          409,
          'Duplicate provider name',
          `Provider "${body.name}" already exists`,
        )
      }
    }

    const provider = await prisma.provider.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.endpoint !== undefined ? { endpoint: body.endpoint } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.rateLimits !== undefined ? { rateLimits: body.rateLimits as JsonInput } : {}),
      },
    })

    // Sync to new-api
    const keys = existing.keys.map((k) => ({
      encryptedKey: k.encryptedKey,
      decryptedKey: decrypt(k.encryptedKey),
    }))
    const modelNames = existing.models.map((m) => m.name)

    syncProviderToChannel({
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      endpoint: provider.endpoint,
      keys,
      modelNames,
      action: 'update',
    }).catch(() => {
      // Already logged
    })

    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      endpoint: provider.endpoint,
      status: provider.status,
      rate_limits: provider.rateLimits,
      created_at: provider.createdAt.toISOString(),
      updated_at: provider.updatedAt.toISOString(),
    }
  })

  // ----------------------------------------------------------
  // DELETE /v1/providers/:id — Delete provider (cascade)
  // ----------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/v1/providers/:id', async (request, reply) => {
    const { id } = request.params

    const provider = await prisma.provider.findUnique({
      where: { id },
    })

    if (!provider) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    // Delete from our DB (cascade handles keys, models, aliases, sync_logs)
    await prisma.provider.delete({ where: { id } })

    // Sync delete to new-api
    if (provider.newApiChannelId) {
      deleteChannel({
        providerId: provider.id,
        channelId: provider.newApiChannelId,
      }).catch(() => {
        // Already logged
      })
    }

    reply.status(204).send()
  })

  // ----------------------------------------------------------
  // POST /v1/providers/:id/keys — Add provider key
  // ----------------------------------------------------------
  app.post<{ Params: { id: string } }>('/v1/providers/:id/keys', async (request, reply) => {
    const { id } = request.params
    const body = z
      .object({
        key: z.string().min(1),
        weight: z.number().int().min(1).max(1000).default(100),
      })
      .parse(request.body)

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        keys: { where: { status: 'active' } },
        models: { where: { status: 'active' } },
      },
    })

    if (!provider) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    const encryptedKey = encrypt(body.key)
    const keyPrefix = maskKey(body.key)

    const providerKey = await prisma.providerKey.create({
      data: {
        providerId: provider.id,
        encryptedKey,
        keyPrefix,
        weight: body.weight,
      },
    })

    // Sync updated keys to new-api
    const allKeys = [
      ...provider.keys.map((k) => ({
        encryptedKey: k.encryptedKey,
        decryptedKey: decrypt(k.encryptedKey),
      })),
      { encryptedKey, decryptedKey: body.key },
    ]
    const modelNames = provider.models.map((m) => m.name)

    syncProviderToChannel({
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type,
      endpoint: provider.endpoint,
      keys: allKeys,
      modelNames,
      action: 'update',
    }).catch(() => {})

    reply.status(201).send({
      id: providerKey.id,
      key_prefix: providerKey.keyPrefix,
      weight: providerKey.weight,
      status: providerKey.status,
      created_at: providerKey.createdAt.toISOString(),
    })
  })

  // ----------------------------------------------------------
  // GET /v1/providers/:id/keys — List provider keys (masked)
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/v1/providers/:id/keys', async (request) => {
    const { id } = request.params

    const provider = await prisma.provider.findUnique({
      where: { id },
      include: { keys: { orderBy: { createdAt: 'asc' } } },
    })

    if (!provider) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    return {
      data: provider.keys.map((k) => ({
        id: k.id,
        key_prefix: k.keyPrefix,
        weight: k.weight,
        status: k.status,
        last_used_at: k.lastUsedAt?.toISOString() ?? null,
        created_at: k.createdAt.toISOString(),
      })),
    }
  })

  // ----------------------------------------------------------
  // DELETE /v1/providers/:id/keys/:keyId — Delete provider key
  // ----------------------------------------------------------
  app.delete<{ Params: { id: string; keyId: string } }>(
    '/v1/providers/:id/keys/:keyId',
    async (request, reply) => {
      const { id, keyId } = request.params

      const provider = await prisma.provider.findUnique({
        where: { id },
        include: {
          keys: { where: { status: 'active' } },
          models: { where: { status: 'active' } },
        },
      })

      if (!provider) {
        throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
      }

      const key = await prisma.providerKey.findFirst({
        where: { id: keyId, providerId: id },
      })

      if (!key) {
        throw createProblemError(
          404,
          'Key not found',
          `Key "${keyId}" does not exist for this provider`,
        )
      }

      await prisma.providerKey.delete({ where: { id: keyId } })

      // Sync updated keys to new-api
      const remainingKeys = provider.keys
        .filter((k) => k.id !== keyId)
        .map((k) => ({
          encryptedKey: k.encryptedKey,
          decryptedKey: decrypt(k.encryptedKey),
        }))
      const modelNames = provider.models.map((m) => m.name)

      syncProviderToChannel({
        providerId: provider.id,
        providerName: provider.name,
        providerType: provider.type,
        endpoint: provider.endpoint,
        keys: remainingKeys,
        modelNames,
        action: 'update',
      }).catch(() => {})

      reply.status(204).send()
    },
  )

  // ----------------------------------------------------------
  // GET /v1/providers/:id/sync-status — Get sync status
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/v1/providers/:id/sync-status', async (request) => {
    const { id } = request.params

    const provider = await prisma.provider.findUnique({ where: { id } })
    if (!provider) {
      throw createProblemError(404, 'Provider not found', `Provider "${id}" does not exist`)
    }

    const recentLogs = await prisma.channelSyncLog.findMany({
      where: { providerId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const lastSuccess = recentLogs.find((l) => l.status === 'success')
    const lastFailure = recentLogs.find((l) => l.status === 'failed')

    return {
      provider_id: provider.id,
      new_api_channel_id: provider.newApiChannelId,
      last_sync: lastSuccess
        ? {
            action: lastSuccess.action,
            status: lastSuccess.status,
            at: lastSuccess.createdAt.toISOString(),
          }
        : null,
      last_failure: lastFailure
        ? {
            action: lastFailure.action,
            error: lastFailure.error,
            at: lastFailure.createdAt.toISOString(),
          }
        : null,
      recent_syncs: recentLogs.map((l) => ({
        action: l.action,
        status: l.status,
        error: l.error,
        at: l.createdAt.toISOString(),
      })),
    }
  })
}
