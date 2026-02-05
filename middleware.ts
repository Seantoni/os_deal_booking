import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { CACHE_ACCESS_CHECK_SECONDS } from '@/lib/constants/cache'
import { generalLimiter, checkRateLimit, rateLimitResponse, getClientIp, isRateLimitConfigured } from '@/lib/rate-limit'

// Cookie name for caching access check result
const ACCESS_COOKIE_NAME = 'os_access_verified'
// Cookie name for login logging deduplication (must match api/access/check)
const LOGIN_LOGGED_COOKIE = 'os_login_logged'

const isPublicRoute = createRouteMatcher([
  // Auth routes
  '/sign-in(.*)',
  '/sign-up(.*)',
  // API routes for external approval/rejection
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/api/health/(.*)',
  '/api/access/check(.*)', // Allow access check API route
  '/api/webhooks/(.*)', // Webhooks (verified by signature in route handlers)
  '/api/cron/(.*)', // Cron jobs (protected by CRON_SECRET in route handlers)
  // Public booking request pages (new organized routes)
  '/booking-request/(.*)', // All public booking request pages (status, form, etc.)
  // Public pages
  '/no-access(.*)', // Allow access to no-access page
  '/t-c(.*)', // Terms & conditions
])

export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  // Logging only in development
  logger.debug('[middleware] path:', request.nextUrl.pathname, 'public:', isPublic, 'api:', isApiRoute)

  // Apply general rate limiting for all API routes (if configured)
  if (isApiRoute && isRateLimitConfigured()) {
    // Use IP for public routes, will use userId for auth routes after auth check
    const ip = getClientIp(request)
    const rateLimitResult = await checkRateLimit(generalLimiter, ip)
    
    if (!rateLimitResult.success) {
      logger.warn('[middleware] General rate limit exceeded for IP:', ip)
      return rateLimitResponse(rateLimitResult.reset)
    }
  }

  if (!isPublic) {
    const session = await auth()
    if (!session.userId) {
      return session.redirectToSignIn()
    }

    const userId = session.userId

    // Check for cached access verification cookie
    // Format: "userId:timestamp" to ensure it belongs to current user
    const accessCookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value
    if (accessCookie) {
      const [cachedUserId, timestamp] = accessCookie.split(':')
      const cacheTime = parseInt(timestamp, 10)
      const now = Date.now()
      
      // Validate: same user and not expired (5 min cache)
      if (cachedUserId === userId && !isNaN(cacheTime) && (now - cacheTime) < CACHE_ACCESS_CHECK_SECONDS * 1000) {
        logger.debug('[middleware] Access granted from cache for userId:', userId)
        return NextResponse.next()
      }
    }

    // No valid cache - check access via API call
    // This avoids using Node.js modules (like pg/crypto) in Edge runtime
    try {
      const baseUrl = request.nextUrl.origin
      const accessCheckUrl = `${baseUrl}/api/access/check`
      
      // Forward cookies to the API call for authentication
      const cookieHeader = request.headers.get('cookie') || ''
      
      const response = await fetch(accessCheckUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
        },
      })
      
      if (!response.ok) {
        logger.warn('[middleware] Access check API failed:', response.status)
        return NextResponse.redirect(new URL('/no-access', request.url))
      }
      
      const data = await response.json()
      const hasAccess = data.hasAccess === true
      
      if (!hasAccess) {
        logger.warn('[middleware] Access denied for userId:', userId)
        const redirectResponse = NextResponse.redirect(new URL('/no-access', request.url))
        redirectResponse.cookies.delete(ACCESS_COOKIE_NAME)
        return redirectResponse
      }

      // Access granted - set cache cookie for subsequent requests
      const nextResponse = NextResponse.next()
      nextResponse.cookies.set(ACCESS_COOKIE_NAME, `${userId}:${Date.now()}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: CACHE_ACCESS_CHECK_SECONDS,
        path: '/',
      })

      // Forward the login logged cookie from API response to browser
      // This ensures the login deduplication cookie reaches the user's browser
      const loginLoggedCookie = response.headers.getSetCookie?.()
        ?.find(c => c.startsWith(`${LOGIN_LOGGED_COOKIE}=`))
      if (loginLoggedCookie) {
        // Parse and forward the cookie
        const cookieParts = loginLoggedCookie.split(';')
        const cookieValue = cookieParts[0]?.split('=')[1]
        if (cookieValue) {
          nextResponse.cookies.set(LOGIN_LOGGED_COOKIE, cookieValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 8 * 60 * 60, // 8 hours (must match api/access/check)
            path: '/',
          })
          logger.debug('[middleware] Forwarded login logged cookie for userId:', userId)
        }
      }

      logger.debug('[middleware] Access granted and cached for userId:', userId)

      return nextResponse
    } catch (error) {
      logger.error('[middleware] Error during access check:', error)
      // On error, deny access for security
      return NextResponse.redirect(new URL('/no-access', request.url))
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
