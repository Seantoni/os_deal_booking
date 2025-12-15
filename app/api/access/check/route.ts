import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { checkEmailAccess } from '@/app/actions/access-control'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/auth/email-validation'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      logger.debug('[api/access/check] No user found')
      return NextResponse.json({ hasAccess: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Get primary email or first email
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress 
      || user.emailAddresses[0]?.emailAddress

    // Detailed logging only in development
    if (ENV.IS_DEV) {
      logger.debug('[api/access/check] User ID:', user.id)
      logger.debug('[api/access/check] Email from Clerk:', email)
      logger.debug('[api/access/check] All emails:', user.emailAddresses.map(e => e.emailAddress))
      logger.debug('[api/access/check] Primary email ID:', user.primaryEmailAddressId)
    }

    if (!email) {
      logger.debug('[api/access/check] No email found')
      return NextResponse.json({ hasAccess: false, error: 'No email found' }, { status: 403 })
    }

    // Normalize email for check
    const normalizedEmail = normalizeEmail(email)
    
    // Logging only in development
    if (ENV.IS_DEV) {
      logger.debug('[api/access/check] Normalized email:', normalizedEmail)
    }

    // Direct database check (more reliable than going through server action)
    try {
      const allowedEmail = await prisma.allowedEmail.findUnique({
        where: { email: normalizedEmail },
      })
      
      const hasAccess = allowedEmail?.isActive === true
      
      // Log access denial in all non-development environments (security monitoring)
      if (!hasAccess && !ENV.IS_DEV) {
        logger.warn('[api/access/check] Access denied for:', normalizedEmail)
      }
      
      // Detailed logging only in development
      if (ENV.IS_DEV) {
        logger.debug('[api/access/check] Database check result:', hasAccess)
        logger.debug('[api/access/check] AllowedEmail record:', allowedEmail ? { 
          email: allowedEmail.email, 
          isActive: allowedEmail.isActive 
        } : 'not found')
      }

      return NextResponse.json({ 
        hasAccess,
        email,
        normalizedEmail,
        userId: user.id,
        allEmails: user.emailAddresses.map(e => e.emailAddress),
        allowedEmail: allowedEmail ? { 
          email: allowedEmail.email, 
          isActive: allowedEmail.isActive 
        } : null
      })
    } catch (dbError) {
      logger.error('[api/access/check] Database error:', dbError)
      // Fallback to server action
      const hasAccess = await checkEmailAccess(email)
      if (ENV.IS_DEV) {
        logger.debug('[api/access/check] Fallback check result:', hasAccess)
      }
      
      return NextResponse.json({ 
        hasAccess,
        email,
        normalizedEmail,
        userId: user.id
      })
    }
  } catch (error) {
    logger.error('[api/access/check] Error:', error)
    return NextResponse.json(
      { hasAccess: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

