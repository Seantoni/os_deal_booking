import crypto from 'crypto'

/**
 * Generate a secure, unique token for public booking request links
 * Uses crypto.randomBytes for cryptographically secure random tokens
 */
export function generatePublicLinkToken(): string {
  // Generate 32 random bytes and convert to base64url (URL-safe)
  const randomBytes = crypto.randomBytes(32)
  return randomBytes.toString('base64url')
}

