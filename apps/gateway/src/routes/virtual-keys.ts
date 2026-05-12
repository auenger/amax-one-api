import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createProblemError } from '@aihub/shared'
import {
  createVirtualKey,
  listVirtualKeys,
  getVirtualKey,
  updateVirtualKey,
  revokeVirtualKey,
  validateVirtualKey,
} from '../services/virtual-key.js'
import { adminAuthHook } from '../plugins/admin-auth.js'

// ============================================================
// Validation Schemas
// ============================================================

const createKeySchema = z.object({
  name: z.string().min(1).max(50),
  scopes: z.array(z.enum(['chat', 'embeddings'])).min(1),
  rate_limits: z
    .object({
      rpm: z.number().int().min(1).optional(),
      tpm: z.number().int().min(1).optional(),
    })
    .optional(),
  budget: z
    .object({
      token_limit: z.number().int().min(1),
      reset_at: z.string().datetime(),
    })
    .optional(),
  expires_at: z.string().datetime().optional(),
})

const updateKeySchema = z.object({
  scopes: z
    .array(z.enum(['chat', 'embeddings']))
    .min(1)
    .optional(),
  rate_limits: z
    .object({
      rpm: z.number().int().min(1).optional(),
      tpm: z.number().int().min(1).optional(),
    })
    .nullable()
    .optional(),
  budget: z
    .object({
      token_limit: z.number().int().min(1),
      reset_at: z.string().datetime(),
    })
    .nullable()
    .optional(),
  expires_at: z.string().datetime().nullable().optional(),
})

const listKeysQuerySchema = z.object({
  status: z.enum(['active', 'revoked']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// ============================================================
// Route Registration
// ============================================================

export async function registerVirtualKeyRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // POST /v1/keys — Create Virtual Key (Admin)
  // ----------------------------------------------------------
  app.post(
    '/v1/keys',
    {
      preHandler: [adminAuthHook],
    },
    async (request, reply) => {
      const body = createKeySchema.parse(request.body)

      const { key, record } = await createVirtualKey(
        {
          name: body.name,
          scopes: body.scopes,
          rateLimits: body.rate_limits,
          budget: body.budget,
          expiresAt: body.expires_at ? new Date(body.expires_at) : undefined,
        },
        'admin',
      )

      reply.status(201).send({
        id: record.id,
        name: record.name,
        key,
        key_prefix: record.keyPrefix,
        scopes: record.scopes,
        rate_limits: record.rateLimits,
        budget: record.budget,
        status: record.status,
        expires_at: record.expiresAt?.toISOString() ?? null,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString(),
      })
    },
  )

  // ----------------------------------------------------------
  // GET /v1/keys — List Virtual Keys (Admin)
  // ----------------------------------------------------------
  app.get(
    '/v1/keys',
    {
      preHandler: [adminAuthHook],
    },
    async (request) => {
      const query = listKeysQuerySchema.parse(request.query)

      const { data, nextCursor, hasMore } = await listVirtualKeys({
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      })

      return {
        data: data.map((vk) => ({
          id: vk.id,
          name: vk.name,
          key_prefix: vk.keyPrefix,
          scopes: vk.scopes,
          rate_limits: vk.rateLimits,
          budget: vk.budget,
          status: vk.status,
          expires_at: vk.expiresAt?.toISOString() ?? null,
          created_at: vk.createdAt.toISOString(),
          updated_at: vk.updatedAt.toISOString(),
        })),
        next_cursor: nextCursor,
        has_more: hasMore,
      }
    },
  )

  // ----------------------------------------------------------
  // GET /v1/keys/:id — Get Virtual Key detail (Admin)
  // ----------------------------------------------------------
  app.get<{ Params: { id: string } }>(
    '/v1/keys/:id',
    {
      preHandler: [adminAuthHook],
    },
    async (request) => {
      const { id } = request.params

      const vk = await getVirtualKey(id)
      if (!vk) {
        throw createProblemError(404, 'Virtual Key not found', `Virtual Key "${id}" does not exist`)
      }

      return {
        id: vk.id,
        name: vk.name,
        key_prefix: vk.keyPrefix,
        scopes: vk.scopes,
        rate_limits: vk.rateLimits,
        budget: vk.budget,
        status: vk.status,
        expires_at: vk.expiresAt?.toISOString() ?? null,
        created_at: vk.createdAt.toISOString(),
        updated_at: vk.updatedAt.toISOString(),
      }
    },
  )

  // ----------------------------------------------------------
  // PUT /v1/keys/:id — Update Virtual Key (Admin)
  // ----------------------------------------------------------
  app.put<{ Params: { id: string } }>(
    '/v1/keys/:id',
    {
      preHandler: [adminAuthHook],
    },
    async (request) => {
      const { id } = request.params
      const body = updateKeySchema.parse(request.body)

      try {
        const record = await updateVirtualKey(
          id,
          {
            scopes: body.scopes,
            rateLimits: body.rate_limits === null ? null : body.rate_limits,
            budget: body.budget === null ? null : body.budget,
            expiresAt:
              body.expires_at === null
                ? null
                : body.expires_at
                  ? new Date(body.expires_at)
                  : undefined,
          },
          'admin',
        )

        return {
          id: record.id,
          name: record.name,
          key_prefix: record.keyPrefix,
          scopes: record.scopes,
          rate_limits: record.rateLimits,
          budget: record.budget,
          status: record.status,
          expires_at: record.expiresAt?.toISOString() ?? null,
          created_at: record.createdAt.toISOString(),
          updated_at: record.updatedAt.toISOString(),
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        throw createProblemError(404, 'Virtual Key not found', message)
      }
    },
  )

  // ----------------------------------------------------------
  // DELETE /v1/keys/:id — Revoke Virtual Key (Admin)
  // ----------------------------------------------------------
  app.delete<{ Params: { id: string } }>(
    '/v1/keys/:id',
    {
      preHandler: [adminAuthHook],
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        await revokeVirtualKey(id, 'admin')
        reply.status(204).send()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        throw createProblemError(404, 'Virtual Key not found', message)
      }
    },
  )

  // ----------------------------------------------------------
  // POST /v1/internal/validate-key — Validate Virtual Key (Internal)
  // For openai-proxy to call, no admin auth required
  // ----------------------------------------------------------
  app.post('/v1/internal/validate-key', async (request) => {
    const body = z
      .object({
        key: z.string().min(1),
        scope: z.string().optional(),
      })
      .parse(request.body)

    const result = await validateVirtualKey(body.key, body.scope)
    return result
  })
}
