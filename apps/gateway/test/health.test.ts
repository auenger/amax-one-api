import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import { registerHealthRoute } from '../src/routes/health.js'

describe('GET /v1/health', () => {
  let app: ReturnType<typeof Fastify>

  beforeAll(async () => {
    app = Fastify()
    await registerHealthRoute(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return 200 with health status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    })

    expect(response.statusCode).toBe(200)

    const body = response.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('0.1.0')
    expect(body).toHaveProperty('uptime')
    expect(body).toHaveProperty('timestamp')
  })

  it('should return a valid timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    })

    const body = response.json()
    const timestamp = new Date(body.timestamp)
    expect(timestamp.getTime()).not.toBeNaN()
  })
})
