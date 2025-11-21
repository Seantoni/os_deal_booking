import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/api/health/(.*)',
  '/booking-requests/approved(.*)',
  '/booking-requests/rejected(.*)',
  '/booking-requests/error(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[middleware] path:', request.nextUrl.pathname, 'public:', isPublic)
  }

  if (!isPublic) {
    const session = await auth()
    if (!session.userId) {
      return session.redirectToSignIn()
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

