import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApprovalToken } from '@/lib/tokens'
import { getAppBaseUrl } from '@/lib/config/env'
import { logger } from '@/lib/logger'
import { applyPublicRateLimit } from '@/lib/rate-limit'
import { invalidateEntities } from '@/lib/cache'
import { approveBookingRequestWithFollowUp } from '@/lib/booking-requests/approval'

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
  // Apply IP-based rate limiting for public routes (10 req/min)
  const rateLimitResult = await applyPublicRateLimit(
    request,
    'Demasiadas solicitudes. Por favor espera un momento.'
  )
  if (rateLimitResult) return rateLimitResult

  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  logger.debug('Approve route called with token:', token ? 'present' : 'missing')

  if (!token) {
    logger.error('Missing token in approve route')
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=Missing token`))
  }

  // Verify token
  const verification = verifyApprovalToken(token)
  logger.debug('Token verification result:', { 
    valid: verification.valid, 
    action: verification.action, 
    requestId: verification.requestId,
    error: verification.error 
  })

  if (!verification.valid || verification.action !== 'approve') {
    const baseUrl = getBaseUrl(request)
    const errorMsg = encodeURIComponent(verification.error || 'Invalid token')
    logger.error('Token verification failed:', verification.error)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=${errorMsg}`))
  }

  if (!verification.requestId) {
    const baseUrl = getBaseUrl(request)
    logger.error('No requestId in verified token')
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=Invalid token: missing request ID`))
  }

  try {
    // Get the booking request first to check its status
    logger.debug('Fetching booking request:', verification.requestId)
    const existingRequest = await prisma.bookingRequest.findUnique({
      where: { id: verification.requestId },
    })

    if (!existingRequest) {
      logger.error('Booking request not found:', verification.requestId)
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=Request not found`))
    }

    // Check if already processed (approved, booked, rejected, or cancelled)
    if (existingRequest.status === 'approved' || existingRequest.status === 'booked') {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-request/already-processed?status=approved&id=${existingRequest.id}`))
    }
    
    if (existingRequest.status === 'rejected') {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-request/already-processed?status=rejected&id=${existingRequest.id}`))
    }

    // Check if cancelled
    if (existingRequest.status === 'cancelled') {
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-request/cancelled?id=${existingRequest.id}`))
    }

    // Atomic pending -> approved transition + one-time follow-up opportunity creation
    logger.debug('Approving booking request atomically:', verification.requestId)
    const approvalResult = await approveBookingRequestWithFollowUp({
      requestId: verification.requestId,
      processedBy: existingRequest.businessEmail,
    })

    if (!approvalResult.success) {
      const baseUrl = getBaseUrl(request)

      if (approvalResult.code === 'NOT_FOUND') {
        logger.error('Booking request disappeared during approval:', verification.requestId)
        return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=Request not found`))
      }

      const currentStatus = approvalResult.status
      if (currentStatus === 'approved' || currentStatus === 'booked') {
        return NextResponse.redirect(new URL(`${baseUrl}/booking-request/already-processed?status=approved&id=${verification.requestId}`))
      }
      if (currentStatus === 'rejected') {
        return NextResponse.redirect(new URL(`${baseUrl}/booking-request/already-processed?status=rejected&id=${verification.requestId}`))
      }
      if (currentStatus === 'cancelled') {
        return NextResponse.redirect(new URL(`${baseUrl}/booking-request/cancelled?id=${verification.requestId}`))
      }

      const statusMsg = encodeURIComponent(`Request is not pending. Current status: ${currentStatus || 'unknown'}`)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=${statusMsg}`))
    }

    const bookingRequest = approvalResult.bookingRequest

    logger.info('Booking request approved successfully:', bookingRequest.id)
    logger.debug('Approved by:', bookingRequest.processedBy, 'at:', bookingRequest.processedAt)

    // Revalidate affected entities
    invalidateEntities(['booking-requests', 'events', 'opportunities', 'tasks'])

    // Redirect to success page with approver email
    const baseUrl = getBaseUrl(request)
    const approverEmail = encodeURIComponent(bookingRequest.processedBy || existingRequest.businessEmail)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/approved?id=${bookingRequest.id}&approvedBy=${approverEmail}`))
  } catch (error) {
    logger.error('Error approving booking request:', error)
    const baseUrl = getBaseUrl(request)
    const errorMsg = error instanceof Error ? encodeURIComponent(error.message) : 'Failed to approve request'
    return NextResponse.redirect(new URL(`${baseUrl}/booking-request/error?message=${errorMsg}`))
  }
}
