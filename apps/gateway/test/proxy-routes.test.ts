import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import { registerProxyRoutes } from '../src/routes/proxy.js'
import { registerErrorHandler } from '../src/plugins/error-handler.js'

// ============================================================
// Mocks
// ============================================================

// Mock validateVirtualKey
vi.mock('../src/services/virtual-key.js', () => ({
  validateVirtualKey: vi.fn(),
  writeAuditLog: vi.fn().mockResolvedValue({}),
}))

// Mock resolveModel
vi.mock('../src/services/model-resolver.js', () => ({
  resolveModel: vi.fn(),
}))

// Mock proxy service
vi.mock('../src/services/proxy.js', () => ({
  proxyRequest: vi.fn(),
  proxyStreamRequest: vi.fn(),
  extractUsageFromBody: vi.fn().mockReturnValue(null),
  sanitizeResponse: vi.fn((body) => body),
  sanitizeHeaders: vi.fn((headers) => headers),
}))

// Mock @aihub/database
vi.mock('@aihub/database', () => ({
  prisma: {
    model: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    modelAlias: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}))

import { validateVirtualKey } from '../src/services/virtual-key.js'
import { resolveModel } from '../src/services/model-resolver.js'
import { proxyRequest, extractUsageFromBody, sanitizeResponse } from '../src/services/proxy.js'

const mockValidateVirtualKey = vi.mocked(validateVirtualKey)
const mockResolveModel = vi.mocked(resolveModel)
const mockProxyRequest = vi.mocked(proxyRequest)
const mockExtractUsageFromBody = vi.mocked(extractUsageFromBody)
const mockSanitizeResponse = vi.mocked(sanitizeResponse)

// ============================================================
// Test setup
// ============================================================

function setupValidVK() {
  mockValidateVirtualKey.mockResolvedValue({
    valid: true,
    virtualKeyId: 'vk-test-123',
    scopes: ['chat', 'embeddings'],
  } as Awaited<ReturnType<typeof validateVirtualKey>>)
}

function setupResolvedModel(modelName = 'gpt-4o') {
  mockResolveModel.mockResolvedValue({
    model: {
      id: 'model-123',
      name: modelName,
      display_name: null,
      capabilities: ['chat'],
      context_window: 128000,
      status: 'active',
    },
    provider: {
      id: 'provider-123',
      name: 'OpenAI',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1',
      status: 'active',
    },
  })
}

describe('Proxy Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify()
    await registerErrorHandler(app)
    await registerProxyRoutes(app)
  })

  afterEach(async () => {
    await app.close()
  })

  // ----------------------------------------------------------
  // POST /v1/chat/completions
  // ----------------------------------------------------------
  describe('POST /v1/chat/completions', () => {
    it('should return 401 without VK', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        payload: { model: 'gpt-4o', messages: [] },
      })
      expect(response.statusCode).toBe(401)
    })

    it('should proxy non-streaming chat completion request', async () => {
      setupValidVK()
      setupResolvedModel()
      mockSanitizeResponse.mockImplementation((body) => body)
      mockProxyRequest.mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: {
          id: 'chatcmpl-123',
          model: 'gpt-4o',
          choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      })
      mockExtractUsageFromBody.mockReturnValue({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      })

      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        headers: { authorization: 'Bearer aihub-test-abc123' },
        payload: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hello' }] },
      })

      expect(response.statusCode).toBe(200)
      expect(mockProxyRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/chat/completions',
        }),
      )
      // Verify model was resolved
      expect(mockResolveModel).toHaveBeenCalledWith('gpt-4o')
    })

    it('should return 404 for unknown model', async () => {
      setupValidVK()
      mockResolveModel.mockResolvedValue(null)

      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        headers: { authorization: 'Bearer aihub-test-abc123' },
        payload: { model: 'nonexistent', messages: [] },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.title).toBe('Model Not Found')
    })

    it('should return 400 when model is missing', async () => {
      setupValidVK()

      const response = await app.inject({
        method: 'POST',
        url: '/v1/chat/completions',
        headers: { authorization: 'Bearer aihub-test-abc123' },
        payload: { messages: [] },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  // ----------------------------------------------------------
  // POST /v1/embeddings
  // ----------------------------------------------------------
  describe('POST /v1/embeddings', () => {
    it('should proxy embeddings request', async () => {
      setupValidVK()
      setupResolvedModel('text-embedding-3-small')
      mockSanitizeResponse.mockImplementation((body) => body)
      mockProxyRequest.mockResolvedValue({
        status: 200,
        headers: {},
        body: {
          object: 'list',
          data: [{ object: 'embedding', embedding: [0.1, 0.2], index: 0 }],
          model: 'text-embedding-3-small',
        },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/v1/embeddings',
        headers: { authorization: 'Bearer aihub-test-abc123' },
        payload: { model: 'text-embedding-3-small', input: 'hello world' },
      })

      expect(response.statusCode).toBe(200)
      expect(mockProxyRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/v1/embeddings',
        }),
      )
    })
  })

  // ----------------------------------------------------------
  // GET /v1/models
  // ----------------------------------------------------------
  describe('GET /v1/models', () => {
    it('should return OpenAI-compatible models list', async () => {
      setupValidVK()

      const { prisma } = await import('@aihub/database')
      vi.mocked(prisma.model.findMany).mockResolvedValue([
        {
          id: 'model-1',
          name: 'gpt-4o',
          displayName: 'GPT-4o',
          capabilities: ['chat'],
          contextWindow: 128000,
          status: 'active',
          createdAt: new Date('2026-01-01'),
          provider: { type: 'openai' },
        } as Awaited<ReturnType<typeof prisma.model.findMany>>[0],
      ])
      vi.mocked(prisma.modelAlias.findMany).mockResolvedValue([
        {
          alias: 'smart',
          model: { name: 'gpt-4o', status: 'active' },
        } as Awaited<ReturnType<typeof prisma.modelAlias.findMany>>[0],
      ])

      const response = await app.inject({
        method: 'GET',
        url: '/v1/models',
        headers: { authorization: 'Bearer aihub-test-abc123' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.object).toBe('list')
      expect(body.data).toBeInstanceOf(Array)
      expect(body.data.length).toBeGreaterThanOrEqual(1)

      // Should include the model
      const modelEntry = body.data.find((m: { id: string }) => m.id === 'gpt-4o')
      expect(modelEntry).toBeDefined()
      expect(modelEntry.object).toBe('model')
      expect(modelEntry.owned_by).toBe('aihub')

      // Should include the alias
      const aliasEntry = body.data.find((m: { id: string }) => m.id === 'smart')
      expect(aliasEntry).toBeDefined()
    })

    it('should return 401 without VK', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/models',
      })
      expect(response.statusCode).toBe(401)
    })
  })

  // ----------------------------------------------------------
  // POST /v1/messages (Anthropic)
  // ----------------------------------------------------------
  describe('POST /v1/messages', () => {
    it('should proxy Anthropic Messages API request', async () => {
      setupValidVK()
      setupResolvedModel('claude-sonnet-4-20250514')
      mockSanitizeResponse.mockImplementation((body) => body)
      mockProxyRequest.mockResolvedValue({
        status: 200,
        headers: {},
        body: {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello!' }],
          model: 'claude-sonnet-4-20250514',
          usage: { input_tokens: 10, output_tokens: 5 },
        },
      })
      mockExtractUsageFromBody.mockReturnValue({
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      })

      const response = await app.inject({
        method: 'POST',
        url: '/v1/messages',
        headers: {
          'x-api-key': 'aihub-test-abc123',
        },
        payload: {
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 1024,
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockProxyRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/v1/messages',
        }),
      )
    })

    it('should support VK via x-api-key header', async () => {
      setupValidVK()
      setupResolvedModel()

      const response = await app.inject({
        method: 'POST',
        url: '/v1/messages',
        headers: {
          'x-api-key': 'aihub-test-abc123',
        },
        payload: {
          model: 'claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 1024,
        },
      })

      // Should get past auth (may fail at resolve/proxy but not 401)
      expect(response.statusCode).not.toBe(401)
    })

    it('should return 404 for unknown model', async () => {
      setupValidVK()
      mockResolveModel.mockResolvedValue(null)

      const response = await app.inject({
        method: 'POST',
        url: '/v1/messages',
        headers: { 'x-api-key': 'aihub-test-abc123' },
        payload: {
          model: 'nonexistent',
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 1024,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
