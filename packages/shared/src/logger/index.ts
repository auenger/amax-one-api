import pino, { type Logger } from 'pino'

/**
 * Create a structured JSON logger with pino
 * Respects LOG_LEVEL environment variable (default: 'info')
 */
export function createLogger(name: string): Logger {
  return pino({
    name,
    level: process.env['LOG_LEVEL'] ?? 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  })
}
