import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ProblemError } from '@aihub/shared'

export async function errorHandler(
  error: Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (error instanceof ProblemError) {
    reply.status(error.status).send(error.toJSON())
    return
  }

  // Fastify validation errors
  if ('validation' in error && Array.isArray((error as { validation?: unknown[] }).validation)) {
    reply.status(400).send({
      status: 400,
      type: 'https://httpstatuses.com/400',
      title: 'Validation Error',
      detail: error.message,
    })
    return
  }

  // Unknown errors
  const status = (error as { statusCode?: number }).statusCode ?? 500
  reply.status(status).send({
    status,
    type: `https://httpstatuses.com/${status}`,
    title: 'Internal Server Error',
    detail: status === 500 ? 'An unexpected error occurred' : error.message,
  })
}

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler(errorHandler)
}
