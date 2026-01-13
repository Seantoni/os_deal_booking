import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// Cookie name for caching access check result
const ACCESS_COOKIE_NAME = 'os_access_verified'
// Cache duration: 5 minutes (in seconds)
const ACCESS_CACHE_SECONDS = 300

const isPublicRoute = createRouteMatcher([
  // Auth routes
  '/sign-in(.*)',
  '/sign-up(.*)',
  // API routes for external approval/rejection
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/api/health/(.*)',
  '/api/access/check(.*)', // Allow access check API route
  // Public booking request pages (new organized routes)
  '/booking-request/(.*)', // All public booking request pages (status, form, etc.)
  // Public pages
  '/no-access(.*)', // Allow access to no-access page
  '/t-c(.*)', // Terms & conditions
])

export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request)

  // Logging only in development
  logger.debug('[middleware] path:', request.nextUrl.pathname, 'public:', isPublic)

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
      if (cachedUserId === userId && !isNaN(cacheTime) && (now - cacheTime) < ACCESS_CACHE_SECONDS * 1000) {
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
        maxAge: ACCESS_CACHE_SECONDS,
        path: '/',
      })

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
