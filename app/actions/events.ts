'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity, invalidateEntities } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { validateDateRange } from '@/lib/utils/validation'
import { buildCategoryKey } from '@/lib/category-utils'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { logger } from '@/lib/logger'

export async function createEvent(formData: FormData) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: authResult.error || 'Unauthorized' }
    }
    const { userId } = authResult

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const business = formData.get('business') as string
    const businessId = formData.get('businessId') as string | null
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const bookingRequestId = formData.get('bookingRequestId') as string | null

    if (!name || !startDate || !endDate) {
      return { success: false, error: 'Missing required fields' }
    }

  // Parse dates in Panama timezone for consistency
  const startDateTime = parseDateInPanamaTime(startDate)
  const endDateTime = parseEndDateInPanamaTime(endDate)

  // Build standardized category key for consistent matching
  const standardizedCategory = buildCategoryKey(
    parentCategory || null,
    subCategory1 || null,
    subCategory2 || null,
    null, // subCategory3
    category || null
  )

  // Check if this is a direct admin creation (no booking request) vs from a booking request
  // If created directly by admin on calendar, set to 'pre-booked'
  // If created from a booking request, set to 'booked'
  const eventStatus = bookingRequestId ? 'booked' : 'pre-booked'

  const event = await prisma.event.create({
    data: {
      name,
      description: description || null,
      category: standardizedCategory, // Store standardized key in category field
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      business: business || null,
      businessId: businessId || null,
      startDate: startDateTime,
      endDate: endDateTime,
      status: eventStatus, // Direct admin creation = 'pre-booked', from booking request = 'booked'
      userId,
      bookingRequestId: bookingRequestId || null,
    },
  })

  // If linked to a booking request, update the request with the event ID and status
  if (bookingRequestId) {
    await prisma.bookingRequest.update({
      where: { id: bookingRequestId },
      data: { 
        eventId: event.id,
        status: 'booked',
        processedAt: new Date(),
      },
    })
    
    // Automatically create a marketing campaign for the booked request
    try {
      const { createMarketingCampaign } = await import('./marketing')
      await createMarketingCampaign(bookingRequestId)
      logger.info('Marketing campaign created for booking request:', bookingRequestId)
    } catch (marketingError) {
      // Log error but don't fail the booking process
      logger.error('Failed to create marketing campaign:', marketingError)
    }
    
    // Send deal to external OfertaSimple API
    try {
      const bookingRequestData = await prisma.bookingRequest.findUnique({
        where: { id: bookingRequestId },
        select: {
          id: true,
          merchant: true,
          name: true,
          businessEmail: true,
          startDate: true,
          endDate: true,
          campaignDuration: true,
          offerMargin: true,
          pricingOptions: true,
          shortTitle: true,
          aboutOffer: true,
          whatWeLike: true,
          goodToKnow: true,
          businessReview: true,
          addressAndHours: true,
          paymentInstructions: true,
          dealImages: true,
          socialMedia: true,
          contactDetails: true,
          parentCategory: true,
          subCategory1: true,
          subCategory2: true,
          subCategory3: true,
          opportunityId: true,
        },
      })
      
      if (bookingRequestData) {
        const { sendDealToExternalApi } = await import('@/lib/api/external-oferta')
        await sendDealToExternalApi(bookingRequestData, {
          userId,
          triggeredBy: 'system',
        })
        logger.info('Deal sent to external API for booking request:', bookingRequestId)
      }
    } catch (apiError) {
      // Log error but don't fail the booking process
      logger.error('Failed to send deal to external API:', apiError)
    }
    
    invalidateEntity('booking-requests')
  }

  invalidateEntity('events')

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Event',
      entityId: event.id,
      entityName: event.name,
      details: {
        metadata: {
          category: event.category,
          business: event.business,
          startDate: event.startDate,
          endDate: event.endDate
        }
      }
    })

    return { success: true, data: event }
  } catch (error) {
    return handleServerActionError(error, 'createEvent')
  }
}

export async function getEvents() {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: true, data: [] } // Return empty for unauthenticated users
    }
    const { userId } = authResult

    // Check user role
    const role = await getUserRole()

    // Cache key includes userId and role for proper cache invalidation
    const cacheKey = `events-${userId}-${role}`

    const getCachedEvents = unstable_cache(
      async () => {
        // Return pending, approved, pre-booked, and booked events
        // Filtering by booking status happens in the UI (CalendarView)
        // IMPORTANT: All users see ALL booked and pre-booked events, but only their own pending/approved events
        return await prisma.event.findMany({
          where: {
            OR: [
              // All booked events (visible to everyone)
              { status: 'booked' },
              // All pre-booked events (visible to everyone)
              { status: 'pre-booked' },
              // Approved events (filtered by user role)
              {
                status: 'approved',
                ...(role === 'admin' ? {} : { userId })
              },
              // Pending events (filtered by user role) - for drag and drop functionality
              {
                status: 'pending',
                ...(role === 'admin' ? {} : { userId })
              }
            ]
          },
          orderBy: {
            startDate: 'asc',
          },
        })
      },
      [cacheKey],
      {
        tags: ['events'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const events = await getCachedEvents()
    return { success: true, data: events }
  } catch (error) {
    return handleServerActionError(error, 'getEvents')
  }
}

/**
 * Refresh calendar data (events + booking requests) without full page refresh
 * This is more efficient than router.refresh() as it doesn't re-fetch user data
 */
export async function refreshCalendarData(): Promise<{
  success: boolean
  events?: Event[]
  bookingRequests?: BookingRequest[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()

    // Fetch events (bypass cache to get fresh data)
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { status: 'booked' },
          { status: 'pre-booked' },
          {
            status: 'approved',
            ...(role === 'admin' ? {} : { userId })
          },
          {
            status: 'pending',
            ...(role === 'admin' ? {} : { userId })
          }
        ]
      },
      orderBy: { startDate: 'asc' },
    })

    // Fetch booking requests
    let bookingRequests: BookingRequest[]
    if (role === 'admin') {
      bookingRequests = await prisma.bookingRequest.findMany({
        orderBy: { createdAt: 'desc' },
      }) as BookingRequest[]
    } else if (role === 'sales') {
      bookingRequests = await prisma.bookingRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }) as BookingRequest[]
    } else {
      bookingRequests = []
    }

    return {
      success: true,
      events: events as Event[],
      bookingRequests,
    }
  } catch (error) {
    return handleServerActionError(error, 'refreshCalendarData')
  }
}

// Type aliases for refreshCalendarData
type Event = Awaited<ReturnType<typeof prisma.event.findMany>>[0]
type BookingRequest = Awaited<ReturnType<typeof prisma.bookingRequest.findMany>>[0]

/**
 * Get all booked events regardless of user role
 * Used for date calculation to ensure accurate availability
 */
export async function getAllBookedEvents() {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: true, data: [] } // Return empty for unauthenticated users
    }

    // Return all booked and pre-booked events (no user filtering)
    // Both statuses count for restrictions (days apart, deals per day)
    const events = await prisma.event.findMany({
      where: {
        status: { in: ['booked', 'pre-booked'] }
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    return { success: true, data: events }
  } catch (error) {
    return handleServerActionError(error, 'getAllBookedEvents')
  }
}

export async function updateEvent(eventId: string, formData: FormData) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return authResult
    }
    const { userId } = authResult

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const parentCategory = formData.get('parentCategory') as string
    const subCategory1 = formData.get('subCategory1') as string
    const subCategory2 = formData.get('subCategory2') as string
    const business = formData.get('business') as string
    const businessId = formData.get('businessId') as string | null
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    if (!name || !startDate || !endDate) {
      return { success: false, error: 'Missing required fields' }
    }

  // Parse dates in Panama timezone for consistency
  const startDateTime = parseDateInPanamaTime(startDate)
  const endDateTime = parseEndDateInPanamaTime(endDate)

  // Build standardized category key for consistent matching
  const standardizedCategory = buildCategoryKey(
    parentCategory || null,
    subCategory1 || null,
    subCategory2 || null,
    null, // subCategory3
    category || null
  )

  // Check user role
  const role = await getUserRole()

  // Fetch current event for comparison
  const currentEvent = await prisma.event.findUnique({
    where: { id: eventId },
  })

  const event = await prisma.event.update({
    where: {
      id: eventId,
      // Admin can update any event, sales can only update their own
      ...(role === 'admin' ? {} : { userId }),
    },
    data: {
      name,
      description: description || null,
      category: standardizedCategory, // Store standardized key in category field
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      business: business || null,
      businessId: businessId || null,
      startDate: startDateTime,
      endDate: endDateTime,
    },
  })

  invalidateEntity('events')

  // Calculate changes for logging
  const previousValues: Record<string, any> = {}
  const newValues: Record<string, any> = {}
  const changedFields: string[] = []

  if (currentEvent) {
    // Compare dates
    if (currentEvent.startDate.getTime() !== startDateTime.getTime()) {
      changedFields.push('startDate')
      previousValues.startDate = currentEvent.startDate
      newValues.startDate = startDateTime
    }
    if (currentEvent.endDate.getTime() !== endDateTime.getTime()) {
      changedFields.push('endDate')
      previousValues.endDate = currentEvent.endDate
      newValues.endDate = endDateTime
    }

    // Compare other fields
    const simpleFields = ['name', 'description', 'category', 'parentCategory', 'subCategory1', 'subCategory2', 'business', 'businessId']
    
    // Helper values map for comparison
    const updateValues: Record<string, any> = {
      name,
      description: description || null,
      category: standardizedCategory,
      parentCategory: parentCategory || null,
      subCategory1: subCategory1 || null,
      subCategory2: subCategory2 || null,
      business: business || null,
      businessId: businessId || null,
    }

    simpleFields.forEach(field => {
      const oldValue = currentEvent[field as keyof typeof currentEvent]
      const newValue = updateValues[field]
      
      const normalizedOld = oldValue === null ? undefined : oldValue
      const normalizedNew = newValue === null ? undefined : newValue

      if (normalizedOld !== normalizedNew) {
        changedFields.push(field)
        previousValues[field] = oldValue
        newValues[field] = newValue
      }
    })
  }

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'Event',
      entityId: event.id,
      entityName: event.name,
      details: {
        changedFields,
        previousValues,
        newValues
      }
    })

    return { success: true, data: event }
  } catch (error) {
    return handleServerActionError(error, 'updateEvent')
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return authResult
    }

    // Only admins can delete events
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const deletedEvent = await prisma.event.delete({
      where: {
        id: eventId,
      },
    })

    invalidateEntity('events')

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Event',
      entityId: eventId,
      entityName: deletedEvent.name
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteEvent')
  }
}

/**
 * Book an approved event (changes status from 'approved' to 'booked')
 */
export async function bookEvent(eventId: string) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return authResult
    }
    const { userId } = authResult

    // Check user role - only admins can book events
    const role = await getUserRole()
    
    if (role !== 'admin') {
      return { success: false, error: 'Only admins can book events' }
    }
    let externalApiResult:
      | { success: true; externalId?: number; logId?: string }
      | { success: false; error?: string; logId?: string }
      | null = null

    // Get the event and its linked booking request
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      throw new Error('Event not found')
    }

    if (event.status !== 'approved' && event.status !== 'pending') {
      throw new Error('Only pending or approved events can be booked')
    }

    // Update event status to booked
    const updatedEvent = await prisma.event.update({
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

        // Automatically create a deal for the booked request
        try {
          // Check if deal already exists
          const existingDeal = await prisma.deal.findUnique({
            where: { bookingRequestId: bookingRequest.id },
          })

          if (!existingDeal) {
            // Create deal automatically
            await prisma.deal.create({
              data: {
                bookingRequestId: bookingRequest.id,
                responsibleId: null, // Can be assigned later
              },
            })
            logger.info('Deal created automatically for booking request:', bookingRequest.id)
          }
        } catch (dealError) {
          // Log error but don't fail the booking process
          logger.error('Failed to create deal automatically:', dealError)
        }

        // Automatically create a marketing campaign for the booked request
        try {
          const { createMarketingCampaign } = await import('./marketing')
          await createMarketingCampaign(bookingRequest.id)
          logger.info('Marketing campaign created for booking request:', bookingRequest.id)
        } catch (marketingError) {
          // Log error but don't fail the booking process
          logger.error('Failed to create marketing campaign:', marketingError)
        }

        // Send deal to external OfertaSimple API
        try {
          const bookingRequestData = await prisma.bookingRequest.findUnique({
            where: { id: bookingRequest.id },
            select: {
              id: true,
              merchant: true,
              name: true,
              businessEmail: true,
              startDate: true,
              endDate: true,
              campaignDuration: true,
              offerMargin: true,
              pricingOptions: true,
              shortTitle: true,
              aboutOffer: true,
              whatWeLike: true,
              goodToKnow: true,
              businessReview: true,
              addressAndHours: true,
              paymentInstructions: true,
              dealImages: true,
              socialMedia: true,
              contactDetails: true,
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
              subCategory3: true,
              opportunityId: true,
            },
          })
          
          if (bookingRequestData) {
            const { sendDealToExternalApi } = await import('@/lib/api/external-oferta')
            const apiResult = await sendDealToExternalApi(bookingRequestData, {
              userId,
              triggeredBy: 'system',
              // OfertaSimple dates should match the final booked event dates
              runAt: event.startDate,
              endAt: event.endDate,
            })
            externalApiResult = apiResult
            logger.info('Deal sent to external API for booking request:', bookingRequest.id)
            
            // Store the external deal ID on the booking request for linking
            if (apiResult.success && 'externalId' in apiResult && apiResult.externalId) {
              await prisma.bookingRequest.update({
                where: { id: bookingRequest.id },
                data: { dealId: String(apiResult.externalId) },
              })
              logger.info('External deal ID stored on booking request:', bookingRequest.id, apiResult.externalId)
            }
          } else {
            externalApiResult = { success: false, error: 'bookingRequestData not found' }
          }
        } catch (apiError) {
          // Log error but don't fail the booking process
          logger.error('Failed to send deal to external API:', apiError)
          externalApiResult = {
            success: false,
            error: apiError instanceof Error ? apiError.message : 'Failed to send deal to external API',
          }
        }

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

    // Invalidate only affected entities - deals and marketing-campaigns don't need refresh here
    // since the deal was just created and marketing-campaigns are unrelated
    invalidateEntities(['events', 'booking-requests'])

    // Log activity
    await logActivity({
      action: 'STATUS_CHANGE',
      entityType: 'Event',
      entityId: event.id,
      entityName: event.name,
      details: {
        statusChange: { from: event.status, to: 'booked' }
      }
    })

    return {
      success: true,
      data: {
        event: updatedEvent,
        externalApi: externalApiResult,
      }
    }
  } catch (error) {
    return handleServerActionError(error, 'bookEvent')
  }
}

/**
 * Reject an approved event with a reason (changes status to 'rejected' and sends email)
 */
export async function rejectEvent(eventId: string, rejectionReason: string) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return authResult
    }
    const { userId } = authResult

    // Get the event and its linked booking request
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    if (event.status !== 'approved' && event.status !== 'pending') {
      return { success: false, error: 'Only pending or approved events can be rejected' }
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
        logger.error('Error sending rejection email:', emailError)
        // Don't fail the rejection if email fails
      }
    }

    invalidateEntities(['events', 'booking-requests'])

    // Log activity
    await logActivity({
      action: 'REJECT',
      entityType: 'Event',
      entityId: eventId,
      entityName: event.name,
      details: {
        statusChange: { from: event.status, to: 'rejected' },
        metadata: { rejectionReason }
      }
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'rejectEvent')
  }
}

/**
 * Server action wrapper to calculate the next available launch date
 * Fetches events and calls the universal calculateNextAvailableDate function
 */
export async function calculateNextAvailableDateAction(
  category: string | null,
  parentCategory: string | null,
  merchant: string | null
): Promise<{ success: boolean; date?: string; daysUntilLaunch?: number; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get all booked events (regardless of user) for accurate date calculation
    const eventsResult = await getAllBookedEvents()
    const events = eventsResult.success ? eventsResult.data || [] : []

    // Get settings (use DEFAULT_SETTINGS on server)
    const { DEFAULT_SETTINGS } = await import('@/lib/settings')
    const { calculateNextAvailableDate } = await import('@/lib/event-validation')
    
    // Use the universal function
    const result = calculateNextAvailableDate(
      events,
      category,
      parentCategory,
      merchant,
      undefined, // duration - will be calculated from category
      undefined, // startFromDate - defaults to today
      undefined, // excludeEventId
      {
        minDailyLaunches: DEFAULT_SETTINGS.minDailyLaunches,
        maxDailyLaunches: DEFAULT_SETTINGS.maxDailyLaunches,
        merchantRepeatDays: DEFAULT_SETTINGS.merchantRepeatDays,
        businessExceptions: DEFAULT_SETTINGS.businessExceptions
      }
    )
    
    if (result.success && result.date) {
      const dateString = result.date.toISOString().split('T')[0]
      return {
        success: true,
        date: dateString,
        daysUntilLaunch: result.daysUntilLaunch
      }
    }
    
    return {
      success: false,
      error: result.error || 'Failed to calculate next available date'
    }
  } catch (error) {
    return handleServerActionError(error, 'calculateNextAvailableDateAction')
  }
}
