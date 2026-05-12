import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@aihub/database'
import { createProblemError, encodeCursor, decodeCursor } from '@aihub/shared'

// ============================================================
// Validation Schemas
// ============================================================

const createAliasSchema = z.object({
  alias: z.string().min(1).max(200),
  model_id: z.string().min(1),
})

const listAliasesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
})

// ============================================================
// Route Registration
// ============================================================

export async function registerAliasRoutes(app: FastifyInstance): Promise<void> {
  // ----------------------------------------------------------
  // POST /v1/aliases — Create alias
  // ----------------------------------------------------------
  app.post('/admin/aliases', async (request, reply) => {
    const body = createAliasSchema.parse(request.body)

    // Verify model exists
    const model = await prisma.model.findUnique({ where: { id: body.model_id } })
    if (!model) {
      throw createProblemError(404, 'Model not found', `Model "${body.model_id}" does not exist`)
    }

    // Check duplicate alias
    const existingAlias = await prisma.modelAlias.findUnique({ where: { alias: body.alias } })
    if (existingAlias) {
      throw createProblemError(409, 'Duplicate alias', `Alias "${body.alias}" already exists`)
    }

    const alias = await prisma.modelAlias.create({
      data: {
        alias: body.alias,
        modelId: body.model_id,
      },
    })

    reply.status(201).send({
      id: alias.id,
      alias: alias.alias,
      model_id: alias.modelId,
      created_at: alias.createdAt.toISOString(),
    })
  })

  // ----------------------------------------------------------
  // GET /v1/aliases — List aliases
  // ----------------------------------------------------------
  app.get('/admin/aliases', async (request) => {
    const query = listAliasesQuerySchema.parse(request.query)

    const where: Record<string, unknown> = {}
    if (query.cursor) {
      const cursorFields = decodeCursor(query.cursor)
      where.id = { gt: cursorFields['id'] as string }
    }

    const aliases = await prisma.modelAlias.findMany({
      where,
      take: query.limit + 1,
      orderBy: { id: 'asc' },
      include: { model: { select: { id: true, name: true } } },
    })

    const hasMore = aliases.length > query.limit
    const data = hasMore ? aliases.slice(0, -1) : aliases

    return {
      data: data.map((a) => ({
        id: a.id,
        alias: a.alias,
        model_id: a.modelId,
        model_name: a.model.name,
        created_at: a.createdAt.toISOString(),
      })),
      next_cursor:
        hasMore && data.length > 0 ? encodeCursor({ id: data[data.length - 1]!.id }) : null,
      has_more: hasMore,
    }
  })

  // ----------------------------------------------------------
  // DELETE /v1/aliases/:alias — Delete alias
  // ----------------------------------------------------------
  app.delete<{ Params: { alias: string } }>('/v1/aliases/:alias', async (request, reply) => {
    const { alias } = request.params

    const existing = await prisma.modelAlias.findUnique({ where: { alias } })
    if (!existing) {
      throw createProblemError(404, 'Alias not found', `Alias "${alias}" does not exist`)
    }

    await prisma.modelAlias.delete({ where: { alias } })

    reply.status(204).send()
  })
}
