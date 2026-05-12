import { createLogger } from '@aihub/shared'
import { loadConfig } from '../config/index.js'

const logger = createLogger('proxy')

// ============================================================
// Types
// ============================================================

export interface ProxyRequestOptions {
  method: string
  path: string
  headers: Record<string, string>
  body?: unknown
}

export interface ProxyResponse {
  status: number
  headers: Record<string, string>
  body: unknown
}

export interface UsageData {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface StreamCallbacks {
  onData: (chunk: Uint8Array) => void
  onEnd: () => void
  onError: (error: Error) => void
  onUsage?: (usage: UsageData) => void
}

// ============================================================
// Configuration
// ============================================================

function getProxyConfig() {
  const config = loadConfig()
  return {
    baseUrl: config.NEW_API_BASE_URL.replace(/\/$/, ''),
    internalToken: config.NEW_API_INTERNAL_TOKEN,
    timeout: 30_000, // 30s
  }
}

// ============================================================
// Non-streaming proxy
// ============================================================

/**
 * Proxy a non-streaming request to new-api
 * Replaces Authorization header with internal token
 */
export async function proxyRequest(options: ProxyRequestOptions): Promise<ProxyResponse> {
  const proxyConfig = getProxyConfig()
  const url = `${proxyConfig.baseUrl}${options.path}`

  const headers: Record<string, string> = {
    ...options.headers,
    authorization: `Bearer ${proxyConfig.internalToken}`,
    // Remove x-api-key from forwarded headers (Anthropic auth)
  }
  delete headers['x-api-key']
  // Remove host header to avoid conflicts
  delete headers['host']
  delete headers['content-length']

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), proxyConfig.timeout)

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      // Filter out provider-identifying headers
      const lower = key.toLowerCase()
      if (!lower.startsWith('x-provider') && !lower.startsWith('x-model-id')) {
        responseHeaders[key] = value
      }
    })

    const body = await response.text()
    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(body)
    } catch {
      parsedBody = body
    }

    return {
      status: response.status,
      headers: responseHeaders,
      body: parsedBody,
    }
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof DOMException && err.name === 'AbortError') {
      logger.error({ url, timeout: proxyConfig.timeout }, 'Proxy request timed out')
      throw Object.assign(new Error('UPSTREAM_TIMEOUT'), { status: 504 })
    }

    logger.error({ url, error: String(err) }, 'Proxy request failed')
    throw Object.assign(new Error('UPSTREAM_ERROR'), { status: 502 })
  }
}

// ============================================================
// Streaming proxy
// ============================================================

/**
 * Proxy a streaming request to new-api with SSE passthrough
 * Returns the raw stream for direct piping to client
 */
export async function proxyStreamRequest(
  options: ProxyRequestOptions,
  protocol: 'openai' | 'anthropic',
): Promise<{
  stream: ReadableStream<Uint8Array>
  usagePromise: Promise<UsageData | null>
}> {
  const proxyConfig = getProxyConfig()
  const url = `${proxyConfig.baseUrl}${options.path}`

  const headers: Record<string, string> = {
    ...options.headers,
    authorization: `Bearer ${proxyConfig.internalToken}`,
  }
  delete headers['x-api-key']
  delete headers['host']
  delete headers['content-length']

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), proxyConfig.timeout)

  let resolveUsage: (usage: UsageData | null) => void
  const usagePromise = new Promise<UsageData | null>((resolve) => {
    resolveUsage = resolve
  })

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error({ status: response.status, body: errorBody }, 'Upstream stream request failed')
      throw Object.assign(new Error('UPSTREAM_ERROR'), { status: response.status })
    }

    if (!response.body) {
      throw Object.assign(new Error('UPSTREAM_NO_BODY'), { status: 502 })
    }

    // Create a TransformStream to intercept SSE data for usage extraction
    let accumulatedUsage: UsageData | null = null
    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Pass through the chunk
        controller.enqueue(chunk)

        // Try to extract usage from SSE chunks
        try {
          const text = new TextDecoder().decode(chunk)
          extractUsageFromSSE(text, protocol, (usage) => {
            accumulatedUsage = usage
          })
        } catch {
          // Ignore parse errors in stream
        }
      },
      flush() {
        resolveUsage!(accumulatedUsage)
      },
    })

    const stream = response.body.pipeThrough(transformStream)

    return { stream, usagePromise }
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw Object.assign(new Error('UPSTREAM_TIMEOUT'), { status: 504 })
    }

    if ((err as { status?: number }).status) {
      throw err
    }

    throw Object.assign(new Error('UPSTREAM_ERROR'), { status: 502 })
  }
}

// ============================================================
// Usage extraction
// ============================================================

/**
 * Extract usage data from SSE text chunks
 */
function extractUsageFromSSE(
  text: string,
  protocol: 'openai' | 'anthropic',
  onUsage: (usage: UsageData) => void,
): void {
  const lines = text.split('\n')

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      extractUsageFromObject(parsed, protocol, onUsage)
    } catch {
      // Ignore parse errors
    }
  }
}

/**
 * Extract usage from a parsed SSE event or non-streaming response
 */
export function extractUsageFromObject(
  obj: Record<string, unknown>,
  protocol: 'openai' | 'anthropic',
  onUsage: (usage: UsageData) => void,
): void {
  if (protocol === 'openai') {
    // OpenAI format: { usage: { prompt_tokens, completion_tokens, total_tokens } }
    // May be in the last chunk or non-streaming response
    const usage = obj.usage as Record<string, unknown> | undefined
    if (usage && typeof usage.prompt_tokens === 'number') {
      onUsage({
        prompt_tokens: usage.prompt_tokens as number,
        completion_tokens: (usage.completion_tokens as number) ?? 0,
        total_tokens: (usage.total_tokens as number) ?? 0,
      })
    }
  } else {
    // Anthropic format:
    // Non-streaming: { usage: { input_tokens, output_tokens } }
    // Stream message_start: { message: { usage: { input_tokens, output_tokens } } }
    // Stream message_delta: { usage: { output_tokens } }
    const message = obj.message as Record<string, unknown> | undefined
    const usage = (message?.usage ?? obj.usage) as Record<string, unknown> | undefined

    if (usage) {
      const inputTokens = (usage.input_tokens as number) ?? 0
      const outputTokens = (usage.output_tokens as number) ?? 0
      if (inputTokens > 0 || outputTokens > 0) {
        onUsage({
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
        })
      }
    }
  }
}

/**
 * Extract usage from a non-streaming response
 */
export function extractUsageFromBody(
  body: Record<string, unknown>,
  protocol: 'openai' | 'anthropic',
): UsageData | null {
  let result: UsageData | null = null
  extractUsageFromObject(body, protocol, (usage) => {
    result = usage
  })
  return result
}

// ============================================================
// Response sanitization
// ============================================================

/**
 * Sanitize response body — replace model field with original requested name
 * and remove provider-identifying information
 */
export function sanitizeResponse(
  body: Record<string, unknown>,
  originalModel: string,
): Record<string, unknown> {
  // Replace model field with original requested model/alias
  if (typeof body.model === 'string') {
    body.model = originalModel
  }

  // Remove any provider-identifying fields (both hyphen and underscore variants)
  const fieldsToRemove = [
    'x-provider',
    'x_provider',
    'x-model-id',
    'x_model_id',
    'provider',
    'system_fingerprint', // OpenAI-specific, may leak info
  ]
  for (const field of fieldsToRemove) {
    delete body[field]
  }

  return body
}

/**
 * Sanitize response headers — remove provider-identifying headers
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (
      !lower.startsWith('x-provider') &&
      !lower.startsWith('x-model-id') &&
      lower !== 'server' // Hide upstream server info
    ) {
      sanitized[key] = value
    }
  }
  return sanitized
}
