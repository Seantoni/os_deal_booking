import crypto from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Timing-safe cron secret verification.
 *
 * Uses crypto.timingSafeEqual to prevent timing-based side-channel attacks
 * that could allow an attacker to recover the secret one character at a time.
 */
function verifyCronSecretFromEnvKey(request: Request, envKey: string): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env[envKey]

  if (!cronSecret) {
    logger.warn(`[cron] ${envKey} is not configured — denying request`)
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

export function verifyCronSecret(request: Request, envKey: string = 'CRON_SECRET'): boolean {
  return verifyCronSecretFromEnvKey(request, envKey)
}

export function verifyCronSecretWithFallback(
  request: Request,
  primaryEnvKey: string,
  fallbackEnvKey: string = 'CRON_SECRET'
): boolean {
  if (process.env[primaryEnvKey]) {
    return verifyCronSecretFromEnvKey(request, primaryEnvKey)
  }

  return verifyCronSecretFromEnvKey(request, fallbackEnvKey)
}
