'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createEvent(formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const parentCategory = formData.get('parentCategory') as string
  const subCategory1 = formData.get('subCategory1') as string
  const subCategory2 = formData.get('subCategory2') as string
  const merchant = formData.get('merchant') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  if (!name || !startDate || !endDate) {
    throw new Error('Missing required fields')
  }

  // Parse dates in Panama timezone for consistency
  const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
  const startDateTime = parseDateInPanamaTime(startDate)
  const endDateTime = parseEndDateInPanamaTime(endDate)

  const event = await prisma.event.create({
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
      status: 'booked', // Manually created events are booked (finalized) by default
      userId,
    },
  })

  revalidatePath('/events')
  return event
}

export async function getEvents() {
  const { userId } = await auth()
  
  if (!userId) {
    return []
  }

  // Check user role
  const { getUserRole } = await import('@/lib/roles')
  const role = await getUserRole()

  // Return both approved (pending booking) and booked events
  // Filtering by booking status happens in the UI
  const events = await prisma.event.findMany({
    where: {
      // Admin sees all events, sales sees only their own
      ...(role === 'admin' ? {} : { userId }),
      status: {
        in: ['approved', 'booked']
      }
    },
    orderBy: {
      startDate: 'asc',
    },
  })

  return events
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const parentCategory = formData.get('parentCategory') as string
  const subCategory1 = formData.get('subCategory1') as string
  const subCategory2 = formData.get('subCategory2') as string
  const merchant = formData.get('merchant') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  if (!name || !startDate || !endDate) {
    throw new Error('Missing required fields')
  }

  // Parse dates in Panama timezone for consistency
  const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
  const startDateTime = parseDateInPanamaTime(startDate)
  const endDateTime = parseEndDateInPanamaTime(endDate)

  // Check user role
  const { getUserRole } = await import('@/lib/roles')
  const role = await getUserRole()

  const event = await prisma.event.update({
    where: {
      id: eventId,
      // Admin can update any event, sales can only update their own
      ...(role === 'admin' ? {} : { userId }),
    },
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
    },
  })

  revalidatePath('/events')
  return event
}

export async function deleteEvent(eventId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Check user role
  const { getUserRole } = await import('@/lib/roles')
  const role = await getUserRole()

  await prisma.event.delete({
    where: {
      id: eventId,
      // Admin can delete any event, sales can only delete their own
      ...(role === 'admin' ? {} : { userId }),
    },
  })

  revalidatePath('/events')
}

/**
 * Book an approved event (changes status from 'approved' to 'booked')
 */
export async function bookEvent(eventId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Check user role - only admins can book events
  const { getUserRole } = await import('@/lib/roles')
  const role = await getUserRole()
  
  if (role !== 'admin') {
    throw new Error('Only admins can book events')
  }

  try {
    // Get the event and its linked booking request
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (event.status !== 'approved') {
      throw new Error('Only approved events can be booked')
    }

    // Update event status to booked
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'booked' },
    })

    // Update linked booking request and send confirmation email
    if (event.bookingRequestId) {
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: event.bookingRequestId },
      })

      if (bookingRequest) {
        await prisma.bookingRequest.update({
          where: { id: bookingRequest.id },
          data: { 
            status: 'booked',
            processedAt: new Date(),
            processedBy: userId,
          },
        })

        // Send booking confirmation email
        const { sendBookingConfirmationEmail } = await import('@/lib/email/services/booking-confirmation')
        const { currentUser } = await import('@clerk/nextjs/server')
        const user = await currentUser()
        const requesterEmail = user?.emailAddresses?.[0]?.emailAddress

        await sendBookingConfirmationEmail(
          event,
          bookingRequest.businessEmail,
          requesterEmail
        )
      }
    }

    revalidatePath('/events')
    revalidatePath('/booking-requests')
    return { success: true, data: event }
  } catch (error) {
    console.error('Error booking event:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to book event' 
    }
  }
}

/**
 * Reject an approved event with a reason (changes status to 'rejected' and sends email)
 */
export async function rejectEvent(eventId: string, rejectionReason: string) {
  const { userId } = await auth()
  
  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Get the event and its linked booking request
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  })

  if (!event) {
    throw new Error('Event not found')
  }

  if (event.status !== 'approved') {
    throw new Error('Only approved events can be rejected')
  }

  // Get booking request to send email
  let bookingRequest = null
  if (event.bookingRequestId) {
    bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: event.bookingRequestId },
    })
  }

  // Update event status to rejected
  await prisma.event.update({
    where: { id: eventId },
    data: { status: 'rejected' },
  })

  // Update linked booking request if it exists
  if (event.bookingRequestId && bookingRequest) {
    await prisma.bookingRequest.update({
      where: { id: event.bookingRequestId },
      data: { 
        status: 'rejected',
        processedAt: new Date(),
        processedBy: userId,
        rejectionReason,
      },
    })

    // Send rejection email
    try {
      const { sendRejectionEmail } = await import('@/lib/email/services/rejection')
      await sendRejectionEmail(bookingRequest, rejectionReason)
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError)
      // Don't fail the rejection if email fails
    }
  }

  revalidatePath('/events')
  revalidatePath('/booking-requests')
}
