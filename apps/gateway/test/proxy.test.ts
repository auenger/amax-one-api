import { describe, it, expect } from 'vitest'
import {
  extractUsageFromBody,
  extractUsageFromObject,
  sanitizeResponse,
  sanitizeHeaders,
} from '../src/services/proxy.js'

// ============================================================
// Usage Extraction Tests
// ============================================================

describe('extractUsageFromObject', () => {
  it('should extract OpenAI usage format', () => {
    let result: Record<string, number> | null = null
    extractUsageFromObject(
      {
        id: 'chatcmpl-123',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      },
      'openai',
      (usage) => {
        result = usage
      },
    )
    expect(result).toEqual({
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30,
    })
  })

  it('should extract Anthropic non-streaming usage format', () => {
    let result: Record<string, number> | null = null
    extractUsageFromObject(
      {
        id: 'msg_123',
        usage: {
          input_tokens: 15,
          output_tokens: 25,
        },
      },
      'anthropic',
      (usage) => {
        result = usage
      },
    )
    expect(result).toEqual({
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40,
    })
  })

  it('should extract Anthropic streaming message_start usage', () => {
    let result: Record<string, number> | null = null
    extractUsageFromObject(
      {
        type: 'message_start',
        message: {
          id: 'msg_123',
          usage: {
            input_tokens: 10,
            output_tokens: 0,
          },
        },
      },
      'anthropic',
      (usage) => {
        result = usage
      },
    )
    expect(result).toEqual({
      prompt_tokens: 10,
      completion_tokens: 0,
      total_tokens: 10,
    })
  })

  it('should not call callback when no usage present', () => {
    let called = false
    extractUsageFromObject(
      {
        id: 'chatcmpl-123',
        choices: [],
      },
      'openai',
      () => {
        called = true
      },
    )
    expect(called).toBe(false)
  })
})

describe('extractUsageFromBody', () => {
  it('should extract OpenAI usage from non-streaming body', () => {
    const result = extractUsageFromBody(
      {
        id: 'chatcmpl-123',
        model: 'gpt-4o',
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      },
      'openai',
    )
    expect(result).toEqual({
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    })
  })

  it('should extract Anthropic usage from non-streaming body', () => {
    const result = extractUsageFromBody(
      {
        id: 'msg_123',
        type: 'message',
        usage: {
          input_tokens: 50,
          output_tokens: 75,
        },
      },
      'anthropic',
    )
    expect(result).toEqual({
      prompt_tokens: 50,
      completion_tokens: 75,
      total_tokens: 125,
    })
  })

  it('should return null when no usage present', () => {
    const result = extractUsageFromBody(
      {
        id: 'chatcmpl-123',
        choices: [],
      },
      'openai',
    )
    expect(result).toBeNull()
  })
})

// ============================================================
// Response Sanitization Tests
// ============================================================

describe('sanitizeResponse', () => {
  it('should replace model field with original model name', () => {
    const body = {
      id: 'chatcmpl-123',
      model: 'gpt-4o-2024-08-06',
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }

    const result = sanitizeResponse(body, 'smart')

    expect(result.model).toBe('smart')
  })

  it('should remove provider-identifying fields', () => {
    const body = {
      id: 'chatcmpl-123',
      model: 'gpt-4o',
      x_provider: 'openai',
      x_model_id: 'gpt-4o-2024-08-06',
      provider: 'openai',
      system_fingerprint: 'fp_abc123',
    }

    const result = sanitizeResponse(body, 'gpt-4o')

    expect(result).not.toHaveProperty('x_provider')
    expect(result).not.toHaveProperty('x-model-id')
    expect(result).not.toHaveProperty('provider')
    expect(result).not.toHaveProperty('system_fingerprint')
  })

  it('should keep other fields intact', () => {
    const body = {
      id: 'chatcmpl-123',
      model: 'gpt-4o',
      choices: [{ message: { role: 'assistant', content: 'Hello' } }],
    }

    const result = sanitizeResponse(body, 'gpt-4o')

    expect(result.id).toBe('chatcmpl-123')
    expect(result.choices).toEqual([{ message: { role: 'assistant', content: 'Hello' } }])
  })
})

describe('sanitizeHeaders', () => {
  it('should remove provider-identifying headers', () => {
    const headers = {
      'content-type': 'application/json',
      'x-provider': 'openai',
      'x-model-id': 'gpt-4o-2024',
      'x-request-id': 'abc123',
      server: 'new-api/1.0',
    }

    const result = sanitizeHeaders(headers)

    expect(result).not.toHaveProperty('x-provider')
    expect(result).not.toHaveProperty('x-model-id')
    expect(result).not.toHaveProperty('server')
    expect(result['content-type']).toBe('application/json')
    expect(result['x-request-id']).toBe('abc123')
  })

  it('should keep safe headers', () => {
    const headers = {
      'content-type': 'application/json',
      'x-request-id': 'req_123',
      'cache-control': 'no-cache',
    }

    const result = sanitizeHeaders(headers)

    expect(result).toEqual(headers)
  })
})
