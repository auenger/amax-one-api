import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createLogger, createProblemError } from '@aihub/shared'
import { resolveModel } from '../services/model-resolver.js'
import { writeAuditLog } from '../services/virtual-key.js'
import {
  proxyRequest,
  proxyStreamRequest,
  extractUsageFromBody,
  sanitizeResponse,
  sanitizeHeaders,
} from '../services/proxy.js'
import type { UsageData } from '../services/proxy.js'
import { recordUsage } from '../services/usage.js'
import { vkAuthHook } from '../plugins/vk-auth.js'

const logger = createLogger('proxy-routes')

// ============================================================
// Types
// ============================================================

interface VkInfo {
  valid: boolean
  virtualKeyId?: string
  scopes?: string[]
}

interface RequestWithVk extends FastifyRequest {
  vkInfo?: VkInfo
}

interface ResolvedModelInfo {
  actualModel: string
  originalModel: string
  providerId: string
  modelId: string
}

// ============================================================
// Helpers
// ============================================================

/**
 * Extract the model name from request body (OpenAI or Anthropic format)
 */
function extractModelName(body: Record<string, unknown>): string | null {
  return (body.model as string) ?? null
}

/**
 * Estimate prompt tokens from request body (rough: chars / 4)
 */
function estimatePromptTokens(body: Record<string, unknown>): number {
  const messages = body.messages as Array<Record<string, unknown>> | undefined
  if (messages) {
    const text = messages.map((m) => String(m.content ?? '')).join('')
    return Math.ceil(text.length / 4)
  }
  const input = body.input as string | Array<string> | undefined
  if (input) {
    const text = Array.isArray(input) ? input.join('') : input
    return Math.ceil(text.length / 4)
  }
  return 0
}

/**
 * Resolve model alias to actual model name with IDs
 * Returns ResolvedModelInfo or throws
 */
async function resolveModelAlias(modelName: string): Promise<ResolvedModelInfo> {
  const resolved = await resolveModel(modelName)
  if (!resolved) {
    throw createProblemError(404, 'Model Not Found', `No model or alias found for "${modelName}"`)
  }

  if (resolved.model.status !== 'active') {
    throw createProblemError(
      404,
      'Model Not Found',
      `Model "${modelName}" is not available (status: ${resolved.model.status})`,
    )
  }

  return {
    actualModel: resolved.model.name,
    originalModel: modelName,
    providerId: resolved.provider.id,
    modelId: resolved.model.id,
  }
}

/**
 * Record usage asynchronously (fire-and-forget)
 * Uses the usage-metering recordUsage() service.
 */
function recordUsageAsync(
  vkInfo: VkInfo,
  usage: UsageData | null,
  resolved: ResolvedModelInfo,
  requestId: string,
  requestType: 'chat' | 'embedding',
  latencyMs: number,
  status: 'success' | 'error' = 'success',
  errorCode?: string,
): void {
  if (!usage || !vkInfo.virtualKeyId) return

  // Fire-and-forget usage recording
  recordUsage({
    virtualKeyId: vkInfo.virtualKeyId,
    providerId: resolved.providerId,
    modelId: resolved.modelId,
    modelName: resolved.actualModel,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    requestId,
    requestType,
    status,
    errorCode,
    latencyMs,
  }).catch((err) => {
    logger.warn({ err, requestId }, 'Failed to record usage')
  })
}

/**
 * Handle upstream error — record error usage and convert to RFC 7807 without leaking provider info
 */
function handleUpstreamErrorWithUsage(
  status: number,
  _body: unknown,
  vkInfo: VkInfo,
  resolved: ResolvedModelInfo,
  requestId: string,
  requestType: 'chat' | 'embedding',
  latencyMs: number,
  requestBody: Record<string, unknown>,
): never {
  // Record error usage
  const estimatedPrompt = estimatePromptTokens(requestBody)
  recordUsageAsync(
    vkInfo,
    { prompt_tokens: estimatedPrompt, completion_tokens: 0, total_tokens: estimatedPrompt },
    resolved,
    requestId,
    requestType,
    latencyMs,
    'error',
    String(status),
  )

  // Provider 429 -> 503
  if (status === 429) {
    throw createProblemError(
      503,
      'Service Temporarily Unavailable',
      'The upstream service is currently busy. Please retry later.',
    )
  }

  // Provider 401/403 -> 502 (don't expose key issues)
  if (status === 401 || status === 403) {
    throw createProblemError(502, 'Bad Gateway', 'An upstream service error occurred.')
  }

  // Provider 404 -> 404
  if (status === 404) {
    throw createProblemError(404, 'Not Found', 'The requested resource was not found.')
  }

  // Provider 5xx or other -> 502
  if (status >= 500) {
    throw createProblemError(502, 'Bad Gateway', 'An upstream service error occurred.')
  }

  // Other 4xx
  throw createProblemError(
    status >= 400 ? 502 : status,
    'Bad Gateway',
    'An upstream service error occurred.',
  )
}

// ============================================================
// Route Registration
// ============================================================

export async function registerProxyRoutes(app: FastifyInstance): Promise<void> {
  // All proxy routes require VK authentication
  const proxyPreHandler = [vkAuthHook]

  // ----------------------------------------------------------
  // POST /v1/chat/completions — OpenAI Chat Completions
  // ----------------------------------------------------------
  app.post(
    '/v1/chat/completions',
    { preHandler: proxyPreHandler },
    async (request: RequestWithVk, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>
      const vkInfo = request.vkInfo!
      const startTime = Date.now()

      const modelName = extractModelName(body)
      if (!modelName) {
        throw createProblemError(400, 'Bad Request', 'Missing "model" field in request body')
      }

      const resolved = await resolveModelAlias(modelName)
      const isStream = body.stream === true

      // Replace model with actual model name for upstream
      const upstreamBody = { ...body, model: resolved.actualModel }

      if (isStream) {
        // Streaming response — pipe SSE directly
        const { stream, usagePromise } = await proxyStreamRequest(
          {
            method: 'POST',
            path: '/v1/chat/completions',
            headers: {
              'content-type': 'application/json',
              accept: 'text/event-stream',
            },
            body: upstreamBody,
          },
          'openai',
        )

        // Set SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })

        // Pipe stream to response
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            reply.raw.write(value)
          }
        } finally {
          reader.releaseLock()
          reply.raw.end()
        }

        // Record usage asynchronously
        const usage = await usagePromise
        const latencyMs = Date.now() - startTime
        recordUsageAsync(vkInfo, usage, resolved, request.id, 'chat', latencyMs)

        return reply
      }

      // Non-streaming response
      const response = await proxyRequest({
        method: 'POST',
        path: '/v1/chat/completions',
        headers: {
          'content-type': 'application/json',
        },
        body: upstreamBody,
      })

      const latencyMs = Date.now() - startTime

      if (response.status !== 200) {
        handleUpstreamErrorWithUsage(
          response.status,
          response.body,
          vkInfo,
          resolved,
          request.id,
          'chat',
          latencyMs,
          body,
        )
      }

      const sanitizedBody = sanitizeResponse(
        response.body as Record<string, unknown>,
        resolved.originalModel,
      )
      const sanitizedHeaders = sanitizeHeaders(response.headers)

      // Set sanitized headers
      for (const [key, value] of Object.entries(sanitizedHeaders)) {
        reply.header(key, value)
      }

      // Extract and record usage
      const usage = extractUsageFromBody(response.body as Record<string, unknown>, 'openai')
      recordUsageAsync(vkInfo, usage, resolved, request.id, 'chat', latencyMs)

      return reply.status(200).send(sanitizedBody)
    },
  )

  // ----------------------------------------------------------
  // POST /v1/embeddings — OpenAI Embeddings
  // ----------------------------------------------------------
  app.post(
    '/v1/embeddings',
    { preHandler: proxyPreHandler },
    async (request: RequestWithVk, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>
      const vkInfo = request.vkInfo!
      const startTime = Date.now()

      const modelName = extractModelName(body)
      if (!modelName) {
        throw createProblemError(400, 'Bad Request', 'Missing "model" field in request body')
      }

      const resolved = await resolveModelAlias(modelName)

      // Replace model with actual model name for upstream
      const upstreamBody = { ...body, model: resolved.actualModel }

      const response = await proxyRequest({
        method: 'POST',
        path: '/v1/embeddings',
        headers: {
          'content-type': 'application/json',
        },
        body: upstreamBody,
      })

      const latencyMs = Date.now() - startTime

      if (response.status !== 200) {
        handleUpstreamErrorWithUsage(
          response.status,
          response.body,
          vkInfo,
          resolved,
          request.id,
          'embedding',
          latencyMs,
          body,
        )
      }

      const sanitizedBody = sanitizeResponse(
        response.body as Record<string, unknown>,
        resolved.originalModel,
      )
      const sanitizedHeaders = sanitizeHeaders(response.headers)

      for (const [key, value] of Object.entries(sanitizedHeaders)) {
        reply.header(key, value)
      }

      const usage = extractUsageFromBody(response.body as Record<string, unknown>, 'openai')
      recordUsageAsync(vkInfo, usage, resolved, request.id, 'embedding', latencyMs)

      return reply.status(200).send(sanitizedBody)
    },
  )

  // ----------------------------------------------------------
  // GET /v1/models — Models list (proxy to model-registry)
  // ----------------------------------------------------------
  app.get(
    '/v1/models',
    { preHandler: proxyPreHandler },
    async (request: RequestWithVk, _reply: FastifyReply) => {
      // Query internal resolve endpoint or return all active models
      // For OpenAI compatibility, return a list of models in OpenAI format
      const { prisma } = await import('@aihub/database')

      const models = await prisma.model.findMany({
        where: { status: 'active' },
        include: {
          provider: {
            select: { type: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      // Also include aliases
      const aliases = await prisma.modelAlias.findMany({
        include: {
          model: {
            select: { name: true, status: true },
          },
        },
      })

      const aliasMap = new Map<string, string>()
      for (const alias of aliases) {
        if (alias.model.status === 'active') {
          aliasMap.set(alias.alias, alias.model.name)
        }
      }

      // Format as OpenAI models list
      const data = [
        ...models.map((m) => ({
          id: m.name,
          object: 'model' as const,
          created: Math.floor(m.createdAt.getTime() / 1000),
          owned_by: 'aihub',
        })),
        ...Array.from(aliasMap.keys()).map((alias) => ({
          id: alias,
          object: 'model' as const,
          created: Math.floor(Date.now() / 1000),
          owned_by: 'aihub',
        })),
      ]

      // Audit
      if (request.vkInfo?.virtualKeyId) {
        writeAuditLog('proxy.models_list', 'virtual_key', request.vkInfo.virtualKeyId, {
          request_id: request.id,
        }).catch(() => {})
      }

      return { object: 'list', data }
    },
  )

  // ----------------------------------------------------------
  // POST /v1/messages — Anthropic Messages API
  // ----------------------------------------------------------
  app.post(
    '/v1/messages',
    { preHandler: proxyPreHandler },
    async (request: RequestWithVk, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>
      const vkInfo = request.vkInfo!
      const startTime = Date.now()

      const modelName = extractModelName(body)
      if (!modelName) {
        throw createProblemError(400, 'Bad Request', 'Missing "model" field in request body')
      }

      const resolved = await resolveModelAlias(modelName)
      const isStream = body.stream === true

      // Replace model with actual model name for upstream
      const upstreamBody = { ...body, model: resolved.actualModel }

      if (isStream) {
        // Streaming — Anthropic SSE
        const { stream, usagePromise } = await proxyStreamRequest(
          {
            method: 'POST',
            path: '/v1/messages',
            headers: {
              'content-type': 'application/json',
              accept: 'text/event-stream',
              'anthropic-version': '2023-06-01',
            },
            body: upstreamBody,
          },
          'anthropic',
        )

        // Set SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })

        // Pipe stream
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            reply.raw.write(value)
          }
        } finally {
          reader.releaseLock()
          reply.raw.end()
        }

        const usage = await usagePromise
        const latencyMs = Date.now() - startTime
        recordUsageAsync(vkInfo, usage, resolved, request.id, 'chat', latencyMs)

        return reply
      }

      // Non-streaming Anthropic response
      const response = await proxyRequest({
        method: 'POST',
        path: '/v1/messages',
        headers: {
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: upstreamBody,
      })

      const latencyMs = Date.now() - startTime

      if (response.status !== 200) {
        handleUpstreamErrorWithUsage(
          response.status,
          response.body,
          vkInfo,
          resolved,
          request.id,
          'chat',
          latencyMs,
          body,
        )
      }

      const sanitizedBody = sanitizeResponse(
        response.body as Record<string, unknown>,
        resolved.originalModel,
      )
      const sanitizedHeaders = sanitizeHeaders(response.headers)

      for (const [key, value] of Object.entries(sanitizedHeaders)) {
        reply.header(key, value)
      }

      const usage = extractUsageFromBody(response.body as Record<string, unknown>, 'anthropic')
      recordUsageAsync(vkInfo, usage, resolved, request.id, 'chat', latencyMs)

      return reply.status(200).send(sanitizedBody)
    },
  )
}
