import crypto from 'crypto'

const SECRET_KEY = process.env.TOKEN_SECRET_KEY || 'fallback-secret-key-change-in-production'

/**
 * Generate a secure token for approve/reject actions
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
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' }
    }
    
    // Parse payload
    const data = JSON.parse(payload)
    
    // Check token age (24 hours)
    const tokenAge = Date.now() - data.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (tokenAge > maxAge) {
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

