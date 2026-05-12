import { z } from 'zod'

const envSchema = z.object({
  GATEWAY_PORT: z.coerce.number().default(3000),
  GATEWAY_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://aihub:aihub@localhost:5432/aihub'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // new-api integration
  NEW_API_BASE_URL: z.string().default('http://localhost:3001'),
  NEW_API_INTERNAL_TOKEN: z.string().default(''),

  // Admin API Key
  ADMIN_API_KEY: z.string().default('sk-admin-change-me'),

  // Encryption key for ProviderKey storage
  ENCRYPTION_KEY: z.string().default('default-encryption-key-change-me-in-production-32b'),
})

export type EnvConfig = z.infer<typeof envSchema>

export function loadConfig(): EnvConfig {
  return envSchema.parse(process.env)
}
