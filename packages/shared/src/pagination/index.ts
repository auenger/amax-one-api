/**
 * Cursor-based pagination types and utilities
 */

export interface CursorPage<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

/**
 * Encode pagination cursor fields to a base64 string
 */
export function encodeCursor(fields: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(fields)).toString('base64url')
}

/**
 * Decode a cursor string back to fields
 * @throws Error if cursor is invalid
 */
export function decodeCursor(token: string): Record<string, unknown> {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf-8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    throw new Error(`Invalid cursor token: ${token}`)
  }
}
