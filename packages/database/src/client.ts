import { PrismaClient } from '@prisma/client'

/**
 * PrismaClient singleton
 * Configured with connection pool limits and structured logging
 */
export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
})
