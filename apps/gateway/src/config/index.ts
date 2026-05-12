import { z } from 'zod'

const envSchema = z.object({
  GATEWAY_PORT: z.coerce.number().default(3000),
  GATEWAY_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://aihub:aihub@localhost:5432/aihub'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type EnvConfig = z.infer<typeof envSchema>

export function loadConfig(): EnvConfig {
  return envSchema.parse(process.env)
}
