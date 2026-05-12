import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { vkAuthHook } from '../src/plugins/vk-auth.js'
import { registerErrorHandler } from '../src/plugins/error-handler.js'

// Mock virtual-key service
vi.mock('../src/services/virtual-key.js', () => ({
  validateVirtualKey: vi.fn(),
}))

import { validateVirtualKey } from '../src/services/virtual-key.js'

const mockValidateVirtualKey = vi.mocked(validateVirtualKey)

describe('vkAuthHook', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify()
    await registerErrorHandler(app)
    app.addHook('preHandler', vkAuthHook)
    app.get('/test', async () => ({ ok: true }))
  })

  it('should extract VK from Bearer header (OpenAI style)', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: true,
      virtualKeyId: 'vk-123',
      scopes: ['chat'],
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-abc123xyz',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(mockValidateVirtualKey).toHaveBeenCalledWith('aihub-test-abc123xyz')
  })

  it('should extract VK from x-api-key header (Anthropic style)', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: true,
      virtualKeyId: 'vk-456',
      scopes: ['chat'],
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        'x-api-key': 'aihub-test-xyz789',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(mockValidateVirtualKey).toHaveBeenCalledWith('aihub-test-xyz789')
  })

  it('should prefer x-api-key over Bearer header', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: true,
      virtualKeyId: 'vk-789',
      scopes: ['chat'],
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-bearer',
        'x-api-key': 'aihub-test-xapikey',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(mockValidateVirtualKey).toHaveBeenCalledWith('aihub-test-xapikey')
  })

  it('should return 401 when no VK is provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test',
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.title).toBe('Unauthorized')
  })

  it('should return 401 for invalid VK', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: false,
      reason: 'key_invalid',
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-invalid',
      },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.title).toBe('Unauthorized')
  })

  it('should return 429 when budget exceeded', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: false,
      reason: 'budget_exceeded',
      budgetStatus: 'exceeded',
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-nobudget',
      },
    })

    expect(response.statusCode).toBe(429)
    const body = response.json()
    expect(body.title).toBe('Budget Exceeded')
  })

  it('should return 401 for revoked key', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: false,
      reason: 'key_revoked',
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-revoked',
      },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.title).toBe('Unauthorized')
  })

  it('should return 401 for expired key', async () => {
    mockValidateVirtualKey.mockResolvedValue({
      valid: false,
      reason: 'key_expired',
    } as Awaited<ReturnType<typeof validateVirtualKey>>)

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer aihub-test-expired',
      },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.title).toBe('Unauthorized')
  })

  it('should not extract VK from non-aihub Bearer tokens', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: {
        authorization: 'Bearer sk-some-other-key',
      },
    })

    expect(response.statusCode).toBe(401)
  })
})
