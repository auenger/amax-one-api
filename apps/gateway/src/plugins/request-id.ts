import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { generateId } from '@aihub/shared'

export async function registerRequestId(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request.headers['x-request-id'] as string) ?? generateId()
    request.id = requestId
    reply.header('x-request-id', requestId)
  })
}
