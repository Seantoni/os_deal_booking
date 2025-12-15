/**
 * Lightweight access control check for use in middleware
 * This version doesn't use 'use server' and can work in Edge Runtime
 * via API call or direct Prisma (if available in runtime)
 */

import { prisma } from '@/lib/prisma'
import { validateAndNormalizeEmail } from './email-validation'

/**
 * Check if an email has access to the application
 * This version is safe for middleware use (no 'use server' directive)
 */
export async function checkEmailAccessMiddleware(email: string): Promise<boolean> {
  try {
    const normalizedEmail = validateAndNormalizeEmail(email)
    
    const allowedEmail = await prisma.allowedEmail.findUnique({
      where: { email: normalizedEmail },
    })
    
    return allowedEmail?.isActive === true
  } catch (error) {
    console.error('Error checking email access in middleware:', error)
    // On error, deny access for security
    return false
  }
}

