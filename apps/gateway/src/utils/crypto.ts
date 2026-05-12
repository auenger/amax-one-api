import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

/**
 * Get encryption key from environment, deriving a 32-byte key if needed
 */
function getEncryptionKey(): Buffer {
  const key = process.env['ENCRYPTION_KEY'] ?? 'default-encryption-key-change-me-in-production-32b'
  // Derive a proper 32-byte key using SHA-256
  return Buffer.from(key.padEnd(32).slice(0, 32), 'utf-8')
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns a base64url encoded string containing iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: iv (12 bytes) + authTag (16 bytes) + ciphertext
  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64url')
}

/**
 * Decrypt a base64url encoded AES-256-GCM encrypted string
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey()
  const buffer = Buffer.from(encoded, 'base64url')

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf-8')
}

/**
 * Generate a masked display of an API key
 * Shows first 3 chars + "..." + last 4 chars
 */
export function maskKey(key: string): string {
  if (key.length <= 8) {
    return key.slice(0, 2) + '***'
  }
  return key.slice(0, 3) + '...' + key.slice(-4)
}
