import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApprovalToken } from '@/lib/tokens'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'

function getBaseUrl(request: NextRequest): string {
  // Prefer configured base URL (validated in production)
  try {
    return getAppBaseUrl()
  } catch {
    // Fallback to constructing from request (useful in dev/preview)
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    return `${protocol}://${host}`
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  logger.debug('Reject route called with token:', token ? 'present' : 'missing')

  if (!token) {
    logger.error('Missing token in reject route')
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Missing token`))
  }

  // Verify token
  const verification = verifyApprovalToken(token)
  logger.debug('Token verification result:', { 
    valid: verification.valid, 
    action: verification.action, 
    requestId: verification.requestId,
    error: verification.error 
  })

  if (!verification.valid || verification.action !== 'reject') {
    const baseUrl = getBaseUrl(request)
    const errorMsg = encodeURIComponent(verification.error || 'Invalid token')
    logger.error('Token verification failed:', verification.error)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=${errorMsg}`))
  }

  if (!verification.requestId) {
    const baseUrl = getBaseUrl(request)
    logger.error('No requestId in verified token')
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Invalid token: missing request ID`))
  }

  try {
    // Verify the booking request exists
    logger.debug('Fetching booking request:', verification.requestId)
    const existingRequest = await prisma.bookingRequest.findUnique({
      where: { id: verification.requestId },
    })

    if (!existingRequest) {
      logger.error('Booking request not found:', verification.requestId)
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Request not found`))
    }

    // Check if already processed (approved, booked, or rejected)
    if (existingRequest.status === 'approved' || existingRequest.status === 'booked') {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/already-processed?status=approved&id=${existingRequest.id}`))
    }
    
    if (existingRequest.status === 'rejected') {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/already-processed?status=rejected&id=${existingRequest.id}`))
    }

    // Redirect to form page to collect rejection reason
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/rejected?token=${token}`))
  } catch (error) {
    logger.error('Error in reject route:', error)
    const baseUrl = getBaseUrl(request)
    const errorMsg = error instanceof Error ? encodeURIComponent(error.message) : 'Failed to process request'
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=${errorMsg}`))
  }
}

