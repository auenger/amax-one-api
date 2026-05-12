import type { FastifyInstance } from 'fastify'

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get('/v1/health', async () => {
    return {
      status: 'ok',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  })
}
