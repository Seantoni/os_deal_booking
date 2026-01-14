/**
 * Rate Limiting Configuration
 * 
 * Uses Upstash Redis for serverless-friendly rate limiting.
 * 
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * Usage:
 *   import { checkRateLimit, aiLimiter, externalApiLimiter } from '@/lib/rate-limit'
 *   
 *   // In API route:
 *   const { success, limit, remaining, reset } = await checkRateLimit(aiLimiter, userId)
 *   if (!success) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 *   }
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Initialize Redis client (lazy - only connects when used)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * Check if rate limiting is configured
 */
export function isRateLimitConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * General API limiter - 100 requests per minute per user
 * Used as a safety net for all authenticated API routes
 */
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'ratelimit:general',
  analytics: true,
})

/**
 * AI endpoints limiter - 20 requests per minute per user
 * OpenAI API calls are expensive
 */
export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'ratelimit:ai',
  analytics: true,
})

/**
 * External API limiter - 5 requests per minute per user
 * Prevent accidental spam to external OfertaSimple API
 */
export const externalApiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'ratelimit:external',
  analytics: true,
})

/**
 * Public routes limiter - 10 requests per minute per IP
 * For unauthenticated routes (booking approve/reject)
 */
export const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:public',
  analytics: true,
})

/**
 * Upload limiter - 30 requests per minute per user
 * S3 uploads have bandwidth costs
 */
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'ratelimit:upload',
  analytics: true,
})

// ============================================================================
// HELPERS
// ============================================================================

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the limit resets
  pending: Promise<unknown>
}

/**
 * Check rate limit for a given identifier
 * 
 * @param limiter - The rate limiter to use
 * @param identifier - User ID, IP address, or other unique identifier
 * @returns Rate limit result
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  if (!isRateLimitConfigured()) {
    // Rate limiting not configured - allow all requests (development)
    logger.debug('[rate-limit] Not configured, allowing request')
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    }
  }

  try {
    const result = await limiter.limit(identifier)
    
    if (!result.success) {
      logger.warn('[rate-limit] Rate limit exceeded for:', identifier, {
        limit: result.limit,
        remaining: result.remaining,
      })
    }
    
    return result
  } catch (error) {
    // On Redis error, allow the request but log the issue
    logger.error('[rate-limit] Redis error, allowing request:', error)
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    }
  }
}

/**
 * Create a 429 Too Many Requests response with proper headers
 * 
 * @param reset - Unix timestamp when the limit resets
 * @param message - Custom error message
 */
export function rateLimitResponse(
  reset: number,
  message: string = 'Demasiadas solicitudes. Por favor, intenta de nuevo en unos momentos.'
): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      retryAfter: retryAfter > 0 ? retryAfter : 60,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(retryAfter > 0 ? retryAfter : 60),
        'X-RateLimit-Reset': String(reset),
      },
    }
  )
}

/**
 * Extract client IP from request headers
 * Works with Vercel's edge network
 */
export function getClientIp(request: Request): string {
  // Vercel provides the real client IP in x-forwarded-for
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP (client IP)
    return forwardedFor.split(',')[0].trim()
  }
  
  // Fallback headers
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  
  // Last resort - not ideal but better than nothing
  return 'unknown-ip'
}

/**
 * Helper to apply rate limiting in API routes
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResult = await applyRateLimit(aiLimiter, userId)
 *   if (rateLimitResult) return rateLimitResult // Returns 429 if rate limited
 *   
 *   // ... rest of handler
 * }
 * ```
 */
export async function applyRateLimit(
  limiter: Ratelimit,
  identifier: string,
  customMessage?: string
): Promise<NextResponse | null> {
  const result = await checkRateLimit(limiter, identifier)
  
  if (!result.success) {
    return rateLimitResponse(result.reset, customMessage)
  }
  
  return null // Not rate limited, continue
}

/**
 * Helper for public routes (uses IP instead of user ID)
 */
export async function applyPublicRateLimit(
  request: Request,
  customMessage?: string
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  return applyRateLimit(publicLimiter, ip, customMessage)
}
