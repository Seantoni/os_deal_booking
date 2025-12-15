import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Cookie name for caching access check result
const ACCESS_COOKIE_NAME = 'os_access_verified'
// Cache duration: 5 minutes (in seconds)
const ACCESS_CACHE_SECONDS = 300

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/booking-requests/approved(.*)',
  '/booking-requests/rejected(.*)',
  '/api/health/(.*)',
  '/api/access/check(.*)', // Allow access check API route
  '/booking-requests/error(.*)',
  '/booking-requests/already-processed(.*)',
  '/no-access(.*)', // Allow access to no-access page
  '/public/booking-request(.*)', // Public booking request form (no auth required)
])

export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request)

  // Logging only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[middleware] path:', request.nextUrl.pathname, 'public:', isPublic)
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
      if (cachedUserId === userId && !isNaN(cacheTime) && (now - cacheTime) < ACCESS_CACHE_SECONDS * 1000) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[middleware] Access granted from cache for userId:', userId)
        }
        return NextResponse.next()
      }
      }

    // No valid cache - need to check access via API
    try {
      const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
      
        const checkResponse = await fetch(`${baseUrl}/api/access/check`, {
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
        })

        if (!checkResponse.ok) {
          console.error('[middleware] Access check API failed:', checkResponse.status)
          const url = new URL('/no-access', request.url)
          return NextResponse.redirect(url)
        }

        const { hasAccess, email, error } = await checkResponse.json()

        if (!hasAccess) {
          // Log access denial in all environments (security monitoring)
          console.warn('[middleware] Access denied for email:', email, error ? `Error: ${error}` : '')
        // Clear any stale access cookie
        const response = NextResponse.redirect(new URL('/no-access', request.url))
        response.cookies.delete(ACCESS_COOKIE_NAME)
        return response
        }

      // Access granted - set cache cookie for subsequent requests
      const response = NextResponse.next()
      response.cookies.set(ACCESS_COOKIE_NAME, `${userId}:${Date.now()}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ACCESS_CACHE_SECONDS,
        path: '/',
      })

        if (process.env.NODE_ENV === 'development') {
        console.log('[middleware] Access granted and cached for email:', email)
        }

      return response
      } catch (fetchError) {
        console.error('[middleware] Error calling access check API:', fetchError)
        // On error, deny access for security
      const url = new URL('/no-access', request.url)
      return NextResponse.redirect(url)
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

