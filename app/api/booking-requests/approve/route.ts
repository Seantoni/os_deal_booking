import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyApprovalToken } from '@/lib/tokens'

function getBaseUrl(request: NextRequest): string {
  // Try to get base URL from environment variable first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    // Remove trailing slash if present
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  
  // Fallback to constructing from request
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const host = request.headers.get('host') || 'localhost:3000'
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  console.log('Approve route called with token:', token ? 'present' : 'missing')

  if (!token) {
    console.error('Missing token in approve route')
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Missing token`))
  }

  // Verify token
  const verification = verifyApprovalToken(token)
  console.log('Token verification result:', { 
    valid: verification.valid, 
    action: verification.action, 
    requestId: verification.requestId,
    error: verification.error 
  })

  if (!verification.valid || verification.action !== 'approve') {
    const baseUrl = getBaseUrl(request)
    const errorMsg = encodeURIComponent(verification.error || 'Invalid token')
    console.error('Token verification failed:', verification.error)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=${errorMsg}`))
  }

  if (!verification.requestId) {
    const baseUrl = getBaseUrl(request)
    console.error('No requestId in verified token')
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Invalid token: missing request ID`))
  }

  try {
    // Get the booking request first to know who is approving
    console.log('Fetching booking request:', verification.requestId)
    const existingRequest = await prisma.bookingRequest.findUnique({
      where: { id: verification.requestId },
    })

    if (!existingRequest) {
      console.error('Booking request not found:', verification.requestId)
      const baseUrl = getBaseUrl(request)
      return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=Request not found`))
    }

    // Update booking request status to approved
    console.log('Updating booking request:', verification.requestId)
    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: verification.requestId },
      data: { 
        status: 'approved',
        processedAt: new Date(),
        processedBy: existingRequest.businessEmail,
      },
    })

    console.log('✓ Booking request approved successfully:', bookingRequest.id)
    console.log('✓ Approved by:', bookingRequest.processedBy, 'at:', bookingRequest.processedAt)

    // Also update the linked event status if it exists
    if (bookingRequest.eventId) {
      await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: { status: 'approved' },
      })
      console.log('Linked event updated to approved:', bookingRequest.eventId)
    }

    // Redirect to success page
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/approved?id=${bookingRequest.id}`))
  } catch (error) {
    console.error('Error approving booking request:', error)
    const baseUrl = getBaseUrl(request)
    const errorMsg = error instanceof Error ? encodeURIComponent(error.message) : 'Failed to approve request'
    return NextResponse.redirect(new URL(`${baseUrl}/booking-requests/error?message=${errorMsg}`))
  }
}

