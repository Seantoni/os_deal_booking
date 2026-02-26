/**
 * Token utilities for secure link generation and verification
 * 
 * This module provides:
 * - Approval tokens: Signed tokens for approve/reject actions in emails
 * - Public link tokens: Random tokens for shareable booking request links
 */

import crypto from 'crypto'

// ============================================================================
// Configuration
// ============================================================================

import { TOKEN_EXPIRY_MS } from '@/lib/constants'
import { ENV } from '@/lib/config/env'

const SECRET_KEY = ENV.TOKEN_SECRET_KEY

/** Token expiration time in milliseconds (1 year) */
export const TOKEN_MAX_AGE_MS = TOKEN_EXPIRY_MS

// ============================================================================
// Approval Tokens
// Used for approve/reject links in booking request emails
// ============================================================================

/**
 * Generate a secure token for approve/reject actions
 * The token contains a signed payload with request ID and action type
 */
export function generateApprovalToken(requestId: string, action: 'approve' | 'reject'): string {
  const payload = JSON.stringify({
    requestId,
    action,
    timestamp: Date.now(),
  })
  
  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', SECRET_KEY)
  hmac.update(payload)
  const signature = hmac.digest('hex')
  
  // Encode payload and signature
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url')
  return token
}

/**
 * Verify and decode an approval token
 * Returns the decoded data if valid, or an error if invalid/expired
 */
export function verifyApprovalToken(token: string): {
  valid: boolean
  requestId?: string
  action?: 'approve' | 'reject'
  error?: string
} {
  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    // Split on the LAST colon only (since JSON payload contains colons)
    const lastColonIndex = decoded.lastIndexOf(':')
    if (lastColonIndex === -1) {
      return { valid: false, error: 'Invalid token format' }
    }
    const payload = decoded.substring(0, lastColonIndex)
    const signature = decoded.substring(lastColonIndex + 1)
    
    if (!payload || !signature) {
      return { valid: false, error: 'Invalid token format' }
    }
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', SECRET_KEY)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    
    const sigBuf = Buffer.from(signature, 'utf-8')
    const expectedBuf = Buffer.from(expectedSignature, 'utf-8')
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, error: 'Invalid signature' }
    }
    
    // Parse payload
    const data = JSON.parse(payload)
    
    // Check token age
    const tokenAge = Date.now() - data.timestamp
    
    if (tokenAge > TOKEN_MAX_AGE_MS) {
      return { valid: false, error: 'Token expired' }
    }
    
    return {
      valid: true,
      requestId: data.requestId,
      action: data.action,
    }
  } catch (error) {
    return { valid: false, error: 'Token verification failed' }
  }
}

// ============================================================================
// Public Link Tokens
// Used for shareable public booking request URLs
// ============================================================================

/**
 * Generate a secure, unique token for public booking request links
 * Uses crypto.randomBytes for cryptographically secure random tokens
 */
export function generatePublicLinkToken(): string {
  // Generate 32 random bytes and convert to base64url (URL-safe)
  const randomBytes = crypto.randomBytes(32)
  return randomBytes.toString('base64url')
}

