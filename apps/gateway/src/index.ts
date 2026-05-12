import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { createLogger } from '@aihub/shared'
import { loadConfig } from './config/index.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { registerRequestId } from './plugins/request-id.js'
import { registerHealthRoute } from './routes/health.js'
import { registerProviderRoutes } from './routes/providers.js'
import { registerModelRoutes } from './routes/models.js'
import { registerAliasRoutes } from './routes/aliases.js'
import { registerInternalRoutes } from './routes/internal.js'
import { registerVirtualKeyRoutes } from './routes/virtual-keys.js'
import { registerProxyRoutes } from './routes/proxy.js'
import { registerUsageRoutes } from './routes/usage.js'
import { registerDashboardRoutes } from './routes/dashboard.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const logger = createLogger('gateway')

  const app = Fastify({
    logger: false,
  })

  // Register plugins
  await app.register(cors, { origin: true })
  await app.register(helmet)
  await registerRequestId(app)
  await registerErrorHandler(app)

  // Register routes
  await registerHealthRoute(app)
  await registerProviderRoutes(app)
  await registerModelRoutes(app)
  await registerAliasRoutes(app)
  await registerInternalRoutes(app)
  await registerVirtualKeyRoutes(app)
  await registerProxyRoutes(app)
  await registerUsageRoutes(app)
  await registerDashboardRoutes(app)

  // Start server
  const address = await app.listen({
    port: config.GATEWAY_PORT,
    host: config.GATEWAY_HOST,
  })

  logger.info({ address, env: config.NODE_ENV }, 'Gateway started')

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down')
    await app.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('Failed to start gateway:', err)
  process.exit(1)
})
