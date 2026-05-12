import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, maskKey } from '../src/utils/crypto.js'

describe('Crypto utils', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'sk-test-api-key-12345'
      const encrypted = encrypt(plaintext)

      // Encrypted should be different from plaintext
      expect(encrypted).not.toBe(plaintext)

      // Should decrypt back to original
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'sk-same-key'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      // Due to random IV, ciphertext should differ
      expect(encrypted1).not.toBe(encrypted2)

      // Both should decrypt correctly
      expect(decrypt(encrypted1)).toBe(plaintext)
      expect(decrypt(encrypted2)).toBe(plaintext)
    })

    it('should handle long keys', () => {
      const plaintext = 'sk-' + 'a'.repeat(200)
      const encrypted = encrypt(plaintext)
      expect(decrypt(encrypted)).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = 'sk-测试-key-🔑'
      const encrypted = encrypt(plaintext)
      expect(decrypt(encrypted)).toBe(plaintext)
    })
  })

  describe('maskKey', () => {
    it('should mask long keys showing first 3 + ... + last 4', () => {
      expect(maskKey('sk-abc123456789xyz')).toBe('sk-...9xyz')
    })

    it('should mask short keys', () => {
      expect(maskKey('abc')).toBe('ab***')
    })

    it('should handle medium keys', () => {
      expect(maskKey('12345678')).toBe('12***')
    })
  })
})
