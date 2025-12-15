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

  logger.debug('Approve route called with token:', token ? 'present' : 'missing')

  if (!token) {
    logger.error('Missing token in approve route')
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

  if (!verification.valid || verification.action !== 'approve') {
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
    // Get the booking request first to check its status
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

    // Update booking request status to approved
    logger.debug('Updating booking request:', verification.requestId)
    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: verification.requestId },
      data: { 
        status: 'approved',
        processedAt: new Date(),
        processedBy: existingRequest.businessEmail,
      },
    })

    logger.info('Booking request approved successfully:', bookingRequest.id)
    logger.debug('Approved by:', bookingRequest.processedBy, 'at:', bookingRequest.processedAt)

    // Also update the linked event status if it exists
    if (bookingRequest.eventId) {
      await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: { status: 'approved' },
      })
      logger.debug('Linked event updated to approved:', bookingRequest.eventId)
    }

    // Redirect to success page with approver email
    const baseUrl = getBaseUrl(request)
    const approverEmail = encodeURIComponent(bookingRequest.processedBy || existingRequest.businessEmail)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/approved?id=${bookingRequest.id}&approvedBy=${approverEmail}`))
  } catch (error) {
    logger.error('Error approving booking request:', error)
    const baseUrl = getBaseUrl(request)
    const errorMsg = error instanceof Error ? encodeURIComponent(error.message) : 'Failed to approve request'
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=${errorMsg}`))
  }
}

