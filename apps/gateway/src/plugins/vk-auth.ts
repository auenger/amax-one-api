import type { FastifyRequest, FastifyReply } from 'fastify'
import { createProblemError } from '@aihub/shared'
import { validateVirtualKey } from '../services/virtual-key.js'

/**
 * Extract Virtual Key from request headers.
 * Supports both OpenAI (Bearer) and Anthropic (x-api-key) auth formats.
 */
function extractVirtualKey(request: FastifyRequest): string | null {
  // Try Anthropic x-api-key header first
  const xApiKey = request.headers['x-api-key']
  if (typeof xApiKey === 'string' && xApiKey.length > 0) {
    return xApiKey
  }

  // Try Authorization: Bearer header
  const authHeader = request.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const key = authHeader.slice(7)
    // Make sure it's not an admin API key (those use a different flow)
    if (key.startsWith('aihub-')) {
      return key
    }
  }

  return null
}

/**
 * VK Authentication hook for proxy routes.
 * Validates the Virtual Key and attaches VK info to request.
 */
export async function vkAuthHook(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const vk = extractVirtualKey(request)

  if (!vk) {
    throw createProblemError(
      401,
      'Unauthorized',
      'Missing Virtual Key. Provide via Authorization: Bearer {vk} or x-api-key: {vk}',
    )
  }

  const result = await validateVirtualKey(vk)

  if (!result.valid) {
    switch (result.reason) {
      case 'budget_exceeded':
        throw createProblemError(
          429,
          'Budget Exceeded',
          'Virtual Key budget has been exceeded. Please contact your administrator.',
        )
      case 'key_revoked':
        throw createProblemError(401, 'Unauthorized', 'Virtual Key has been revoked')
      case 'key_expired':
        throw createProblemError(401, 'Unauthorized', 'Virtual Key has expired')
      default:
        throw createProblemError(401, 'Unauthorized', 'Invalid Virtual Key')
    }
  }

  // Attach VK info to request for downstream use
  ;(request as unknown as { vkInfo: typeof result }).vkInfo = result
}
