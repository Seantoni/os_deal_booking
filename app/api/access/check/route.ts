import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { checkEmailAccess } from '@/app/actions/access-control'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/auth/email-validation'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

// Cookie name for tracking if we've logged this session's login
const LOGIN_LOGGED_COOKIE = 'os_login_logged'
// How long to consider a "session" (8 hours)
const LOGIN_LOG_DURATION_SECONDS = 8 * 60 * 60

export async function GET(request: NextRequest) {
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

      // Check if we need to log this login (new session)
      const loginLoggedCookie = request.cookies.get(LOGIN_LOGGED_COOKIE)?.value
      const shouldLogLogin = hasAccess && !loginLoggedCookie

      // Log LOGIN activity for new sessions
      if (shouldLogLogin) {
        try {
          // Get user name for activity log
          const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.firstName || user.username || null

          // Get IP and user agent from request headers
          const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || null
          const userAgent = request.headers.get('user-agent') || null

          await prisma.activityLog.create({
            data: {
              userId: user.id,
              userName,
              userEmail: email,
              action: 'LOGIN',
              entityType: 'User',
              entityId: user.id,
              entityName: userName || email,
              details: undefined,
              ipAddress,
              userAgent,
            },
          })
          
          logger.debug('[api/access/check] Login activity logged for:', email)
        } catch (logError) {
          // Don't fail the access check if logging fails
          logger.error('[api/access/check] Failed to log login activity:', logError)
        }
      }

      // Build response
      const response = NextResponse.json({ 
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

      // Set login logged cookie if we just logged the login
      if (shouldLogLogin) {
        response.cookies.set(LOGIN_LOGGED_COOKIE, `${user.id}:${Date.now()}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: LOGIN_LOG_DURATION_SECONDS,
          path: '/',
        })
      }

      return response
    } catch (dbError) {
      logger.error('[api/access/check] Database error:', dbError)
      // Fallback to server action
      const hasAccess = await checkEmailAccess(email)
      if (ENV.IS_DEV) {
        logger.debug('[api/access/check] Fallback check result:', hasAccess)
      }
      
      // Check if we need to log this login (new session) - fallback path
      const loginLoggedCookie = request.cookies.get(LOGIN_LOGGED_COOKIE)?.value
      const shouldLogLogin = hasAccess && !loginLoggedCookie

      // Log LOGIN activity for new sessions (try even if main db query failed)
      if (shouldLogLogin) {
        try {
          const userName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`.trim()
            : user.firstName || user.username || null
          const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || null
          const userAgent = request.headers.get('user-agent') || null

          await prisma.activityLog.create({
            data: {
              userId: user.id,
              userName,
              userEmail: email,
              action: 'LOGIN',
              entityType: 'User',
              entityId: user.id,
              entityName: userName || email,
              details: undefined,
              ipAddress,
              userAgent,
            },
          })
        } catch (logError) {
          logger.error('[api/access/check] Failed to log login activity (fallback):', logError)
        }
      }

      const response = NextResponse.json({ 
        hasAccess,
        email,
        normalizedEmail,
        userId: user.id
      })

      if (shouldLogLogin) {
        response.cookies.set(LOGIN_LOGGED_COOKIE, `${user.id}:${Date.now()}`, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: LOGIN_LOG_DURATION_SECONDS,
          path: '/',
        })
      }

      return response
    }
  } catch (error) {
    logger.error('[api/access/check] Error:', error)
    return NextResponse.json(
      { hasAccess: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

