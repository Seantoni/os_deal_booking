import crypto from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Timing-safe cron secret verification.
 *
 * Uses crypto.timingSafeEqual to prevent timing-based side-channel attacks
 * that could allow an attacker to recover the secret one character at a time.
 */
export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.warn('[cron] CRON_SECRET is not configured — denying request')
    return false
  }

  if (!authHeader) {
    return false
  }

  const expected = `Bearer ${cronSecret}`

  if (authHeader.length !== expected.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(authHeader, 'utf-8'),
    Buffer.from(expected, 'utf-8'),
  )
}
