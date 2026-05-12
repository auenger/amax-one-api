import { ulid } from 'ulidx'

/**
 * Generate a unique ID using ULID (26-character Crockford Base32)
 * ULIDs are lexicographically sortable and time-ordered
 */
export function generateId(): string {
  return ulid()
}
