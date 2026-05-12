import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createProblemError } from '@aihub/shared'
import { loadConfig } from '../config/index.js'

/**
 * Admin API Key authentication hook
 * Validates Authorization: Bearer {admin_api_key}
 */
export async function adminAuthHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const config = loadConfig()
  const authHeader = request.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createProblemError(
      401,
      'Unauthorized',
      'Missing or invalid Authorization header. Expected: Bearer {admin_api_key}',
    )
  }

  const token = authHeader.slice(7)
  if (token !== config.ADMIN_API_KEY) {
    throw createProblemError(401, 'Unauthorized', 'Invalid Admin API Key')
  }
}

/**
 * Register admin auth as a named decorator so routes can use it via preHandler
 */
export async function registerAdminAuth(app: FastifyInstance): Promise<void> {
  app.decorate('requireAdminAuth', adminAuthHook)
}

// Type augmentation for FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    requireAdminAuth: typeof adminAuthHook
  }
}
