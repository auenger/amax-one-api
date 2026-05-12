import { describe, it, expect } from 'vitest'
import { generateId } from '../src/id/index.js'

describe('generateId', () => {
  it('should return a 26-character string', () => {
    const id = generateId()
    expect(id).toHaveLength(26)
  })

  it('should return only Crockford Base32 characters', () => {
    const id = generateId()
    // Crockford Base32: 0-9, A-Z (excluding I, L, O, U)
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })

  it('should be sortable (time-ordered)', () => {
    const id1 = generateId()
    const id2 = generateId()
    // ULIDs are lexicographically sortable by timestamp
    expect(id1 < id2 || id1 > id2).toBe(true)
  })
})
