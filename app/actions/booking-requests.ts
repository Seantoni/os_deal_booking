'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getUserRole } from '@/lib/roles'
import { resend, EMAIL_CONFIG } from '@/lib/email'
import { renderBookingRequestEmail } from '@/lib/email-templates'
import { generateApprovalToken } from '@/lib/tokens'

export type BookingRequestStatus = 'draft' | 'pending' | 'approved' | 'booked' | 'rejected'

/**
 * Create or update a booking request as draft
 */
export async function saveBookingRequestDraft(formData: FormData, requestId?: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const merchant = formData.get('merchant') as string
    const businessEmail = formData.get('businessEmail') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    // Validation
    if (!name || !businessEmail || !startDate || !endDate) {
      return { 
        success: false, 
        error: 'Missing required fields: name, businessEmail, startDate, endDate' 
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(businessEmail)) {
      return { success: false, error: 'Invalid email format' }
    }

    // Parse dates in Panama timezone for consistency
    const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
    const startDateTime = parseDateInPanamaTime(startDate)
    const endDateTime = parseEndDateInPanamaTime(endDate)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { success: false, error: 'Invalid date format' }
    }

    if (endDateTime < startDateTime) {
      return { success: false, error: 'End date must be after start date' }
    }

    const data = {
      name,
      description: description || null,
      category: category || null,
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      merchant: merchant || null,
      businessEmail,
      startDate: startDateTime,
      endDate: endDateTime,
      status: 'draft' as BookingRequestStatus,
      userId,
    }

    let bookingRequest
    if (requestId) {
      // Update existing draft
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: requestId, userId },
        data,
      })
    } else {
      // Create new draft
      bookingRequest = await prisma.bookingRequest.create({
        data,
      })
    }

    revalidatePath('/booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    console.error('Error saving booking request draft:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save draft' 
    }
  }
}

/**
 * Send a booking request (changes status to pending)
 */
export async function sendBookingRequest(formData: FormData, requestId?: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const merchant = formData.get('merchant') as string
    const businessEmail = formData.get('businessEmail') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    // Validation
    if (!name || !businessEmail || !startDate || !endDate) {
      return { 
        success: false, 
        error: 'Missing required fields: name, businessEmail, startDate, endDate' 
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(businessEmail)) {
      return { success: false, error: 'Invalid email format' }
    }

    // Parse dates in Panama timezone for consistency
    const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
    const startDateTime = parseDateInPanamaTime(startDate)
    const endDateTime = parseEndDateInPanamaTime(endDate)

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { success: false, error: 'Invalid date format' }
    }

    if (endDateTime < startDateTime) {
      return { success: false, error: 'End date must be after start date' }
    }

    const data = {
      name,
      description: description || null,
      category: category || null,
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      merchant: merchant || null,
      businessEmail,
      startDate: startDateTime,
      endDate: endDateTime,
      status: 'pending' as BookingRequestStatus,
      userId,
    }

    let bookingRequest
    let event
    
    // Create or update the booking request
    if (requestId) {
      // Update existing request and set to pending
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: requestId, userId },
        data,
      })
    } else {
      // Create new request with pending status
      bookingRequest = await prisma.bookingRequest.create({
        data,
      })
    }

    // Create a pending event in the calendar
    if (bookingRequest.eventId) {
      // Update existing event
      event = await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: {
          name,
          description: description || null,
          category: category || null,
          parentCategory: parentCategory || null,
          subCategory1: subCategory1 || null,
          subCategory2: subCategory2 || null,
          merchant: merchant || null,
          startDate: startDateTime,
          endDate: endDateTime,
          status: 'pending',
          userId,
          bookingRequestId: bookingRequest.id,
        },
      })
    } else {
      // Create new event with pending status
      event = await prisma.event.create({
        data: {
          name,
          description: description || null,
          category: category || null,
          parentCategory: parentCategory || null,
          subCategory1: subCategory1 || null,
          subCategory2: subCategory2 || null,
          merchant: merchant || null,
          startDate: startDateTime,
          endDate: endDateTime,
          status: 'pending',
          userId,
          bookingRequestId: bookingRequest.id,
        },
      })
      
      // Link the event to the booking request
      bookingRequest = await prisma.bookingRequest.update({
        where: { id: bookingRequest.id },
        data: { eventId: event.id },
      })
    }

    // Get user information for email
    const user = await currentUser()
    const userEmail = user?.emailAddresses[0]?.emailAddress

    // Generate secure tokens for approve/reject actions
    const approveToken = generateApprovalToken(bookingRequest.id, 'approve')
    const rejectToken = generateApprovalToken(bookingRequest.id, 'reject')

    // Build approval URLs (use absolute URL for email)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const approveUrl = `${baseUrl}/api/booking-requests/approve?token=${approveToken}`
    const rejectUrl = `${baseUrl}/api/booking-requests/reject?token=${rejectToken}`

    // Format dates for email in Panama timezone
    const formatDateForEmail = (date: Date) => {
      return new Date(date).toLocaleDateString('es-PA', {
        timeZone: 'America/Panama', // Panama EST (UTC-5)
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // Build category string
    const categoryString = parentCategory 
      ? `${parentCategory}${subCategory1 ? ` > ${subCategory1}` : ''}${subCategory2 ? ` > ${subCategory2}` : ''}`
      : category || 'No especificada'

    // Generate email HTML
    const emailHtml = renderBookingRequestEmail({
      requestName: name,
      businessEmail,
      merchant: merchant || undefined,
      category: categoryString,
      description: description || undefined,
      startDate: formatDateForEmail(startDateTime),
      endDate: formatDateForEmail(endDateTime),
      approveUrl,
      rejectUrl,
      requesterEmail: userEmail,
    })

    // Send email to business and CC to requester
    try {
      await resend.emails.send({
        from: `OS Deals Booking <${EMAIL_CONFIG.from}>`,
        to: businessEmail,
        cc: userEmail ? [userEmail] : [],
        replyTo: userEmail || EMAIL_CONFIG.replyTo,
        subject: `Solicitud de Reserva: ${name}${merchant ? ` (${merchant})` : ''}`,
        html: emailHtml,
      })
      
      console.log(`✓ Email sent to ${businessEmail} (CC: ${userEmail})`)
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Don't fail the request if email fails - log and continue
      // The request is still created, just email failed
    }

    revalidatePath('/booking-requests')
    revalidatePath('/events')
    return { success: true, data: bookingRequest }
  } catch (error) {
    console.error('Error sending booking request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send request' 
    }
  }
}

/**
 * Get booking requests based on user role
 * - Admin: sees all requests
 * - Sales: sees only their own requests
 */
export async function getBookingRequests() {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const role = await getUserRole()
    
    let requests
    if (role === 'admin') {
      // Admin sees all requests
      requests = await prisma.bookingRequest.findMany({
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Sales sees only their own requests
      requests = await prisma.bookingRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    }

    return { success: true, data: requests }
  } catch (error) {
    console.error('Error fetching booking requests:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch requests' 
    }
  }
}

/**
 * Delete a booking request
 */
export async function deleteBookingRequest(requestId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const role = await getUserRole()
    
    await prisma.bookingRequest.delete({
      where: { 
        id: requestId,
        // Admin can delete any request, sales can only delete their own
        ...(role === 'admin' ? {} : { userId })
      },
    })

    revalidatePath('/booking-requests')
    return { success: true }
  } catch (error) {
    console.error('Error deleting booking request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete request' 
    }
  }
}

/**
 * Update a booking request (dates, category, etc.)
 */
export async function updateBookingRequest(requestId: string, formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const subCategory3 = formData.get('subCategory3') as string
    const merchant = formData.get('merchant') as string
    const businessEmail = formData.get('businessEmail') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    // Parse dates in Panama timezone for consistency
    const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
    const startDateTime = parseDateInPanamaTime(startDate)
    const endDateTime = parseEndDateInPanamaTime(endDate)

    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: {
        name,
        description: description || null,
        category: category || null,
        parentCategory: parentCategory || null,
        subCategory1: subCategory1 || null,
        subCategory2: subCategory2 || null,
        subCategory3: subCategory3 || null,
        merchant: merchant || null,
        businessEmail,
        startDate: startDateTime,
        endDate: endDateTime,
      },
    })

    // Also update the linked event if it exists
    if (bookingRequest.eventId) {
      await prisma.event.update({
        where: { id: bookingRequest.eventId },
        data: {
          name,
          description: description || null,
          category: category || null,
          parentCategory: parentCategory || null,
          subCategory1: subCategory1 || null,
          subCategory2: subCategory2 || null,
          subCategory3: subCategory3 || null,
          merchant: merchant || null,
          startDate: startDateTime,
          endDate: endDateTime,
        },
      })
    }

    revalidatePath('/events')
    revalidatePath('/booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    console.error('Error updating booking request:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update request' 
    }
  }
}

/**
 * Update booking request status (for future use by admins)
 */
export async function updateBookingRequestStatus(
  requestId: string, 
  status: BookingRequestStatus
) {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const bookingRequest = await prisma.bookingRequest.update({
      where: { id: requestId },
      data: { status },
    })

    revalidatePath('/booking-requests')
    return { success: true, data: bookingRequest }
  } catch (error) {
    console.error('Error updating booking request status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update status' 
    }
  }
}

