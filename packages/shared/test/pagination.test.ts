import { describe, it, expect } from 'vitest'
import { encodeCursor, decodeCursor } from '../src/pagination/index.js'

describe('encodeCursor / decodeCursor', () => {
  it('should encode and decode a simple cursor', () => {
    const fields = { id: 'abc' }
    const encoded = encodeCursor(fields)
    const decoded = decodeCursor(encoded)

    expect(decoded).toEqual(fields)
  })

  it('should encode and decode a cursor with multiple fields', () => {
    const fields = { id: '123', created_at: '2024-01-01T00:00:00Z' }
    const encoded = encodeCursor(fields)
    const decoded = decodeCursor(encoded)

    expect(decoded).toEqual(fields)
  })

  it('should encode and decode a cursor with numeric values', () => {
    const fields = { id: 42, count: 100 }
    const encoded = encodeCursor(fields)
    const decoded = decodeCursor(encoded)

    expect(decoded).toEqual(fields)
  })

  it('should throw on invalid cursor', () => {
    expect(() => decodeCursor('invalid!!!')).toThrow('Invalid cursor token')
  })

  it('should produce a base64url-encoded string', () => {
    const encoded = encodeCursor({ id: 'test' })
    // base64url should not contain +, /, or =
    expect(encoded).not.toMatch(/[+/=]/)
  })
})
