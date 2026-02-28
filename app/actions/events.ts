'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity, invalidateEntities } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
import { buildCategoryKey } from '@/lib/category-utils'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { logger } from '@/lib/logger'
import { buildEventNameFromBookingRequest } from '@/lib/utils/request-name-parsing'
import type { BookingRequest, Event } from '@/types'
import type { Prisma } from '@prisma/client'

type RefreshCalendarDataOptions = {
  startDate?: string
  endDate?: string
  includePendingRequests?: boolean
}

const calendarEventSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  parentCategory: true,
  subCategory1: true,
  subCategory2: true,
  subCategory3: true,
  subCategory4: true,
  business: true,
  businessId: true,
  startDate: true,
  endDate: true,
  status: true,
  userId: true,
  bookingRequestId: true,
  createdAt: true,
  updatedAt: true,
} as const

const calendarPendingRequestSelect = {
  id: true,
  name: true,
  category: true,
  parentCategory: true,
  subCategory1: true,
  subCategory2: true,
  subCategory3: true,
  subCategory4: true,
  merchant: true,
  businessEmail: true,
  startDate: true,
  endDate: true,
  status: true,
  eventId: true,
  opportunityId: true,
  dealId: true,
  userId: true,
  processedAt: true,
  processedBy: true,
  rejectionReason: true,
  sourceType: true,
  publicLinkToken: true,
  createdAt: true,
  updatedAt: true,
} as const

type CalendarEventRecord = Prisma.EventGetPayload<{ select: typeof calendarEventSelect }>
type CalendarPendingRequestRecord = Prisma.BookingRequestGetPayload<{ select: typeof calendarPendingRequestSelect }>

function buildCalendarEventWhere(
  role: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Prisma.EventWhereInput {
  const visibilityFilters: Prisma.EventWhereInput[] = [
    { status: 'booked' },
    { status: 'pre-booked' },
    {
      status: 'approved',
      ...(role === 'admin' ? {} : { userId }),
    },
    {
      status: 'pending',
      ...(role === 'admin' ? {} : { userId }),
    },
  ]

  return {
    OR: visibilityFilters,
    ...(startDate && endDate
      ? {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        }
      : {}),
  }
}

function toCalendarEvent(record: CalendarEventRecord): Event {
  return {
    ...record,
    bookingRequestId: record.bookingRequestId ?? null,
    subCategory4: record.subCategory4 ?? null,
  }
}

async function resolveBookingLinkedNames(events: Event[]): Promise<Event[]> {
  const bookingRequestIds = Array.from(
    new Set(events.map((event) => event.bookingRequestId).filter((id): id is string => Boolean(id)))
  )

  if (bookingRequestIds.length === 0) return events

  const bookingRequests = await prisma.bookingRequest.findMany({
    where: { id: { in: bookingRequestIds } },
    select: {
      id: true,
      name: true,
      merchant: true,
      pricingOptions: true,
    },
  })

  const bookingRequestById = new Map(bookingRequests.map((request) => [request.id, request]))

  return events.map((event) => {
    if (!event.bookingRequestId) return event
    const bookingRequest = bookingRequestById.get(event.bookingRequestId)
    if (!bookingRequest) return event

    const generatedName = buildEventNameFromBookingRequest({
      requestName: bookingRequest.name || '',
      merchant: bookingRequest.merchant || event.business || null,
      pricingOptions: bookingRequest.pricingOptions,
    })

    if (!generatedName || generatedName === event.name) return event
    return { ...event, name: generatedName }
  })
}

async function fetchCalendarEvents(
  role: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Event[]> {
  const eventRows = await prisma.event.findMany({
    where: buildCalendarEventWhere(role, userId, startDate, endDate),
    select: calendarEventSelect,
    orderBy: { startDate: 'asc' },
  })

  return resolveBookingLinkedNames(eventRows.map(toCalendarEvent))
}

async function fetchCalendarPendingRequests(role: string, userId: string): Promise<BookingRequest[]> {
  if (role !== 'admin' && role !== 'sales') {
    return []
  }

  const pendingRows = await prisma.bookingRequest.findMany({
    where: {
      status: 'approved',
      ...(role === 'admin' ? {} : { userId }),
    },
    select: calendarPendingRequestSelect,
    orderBy: { createdAt: 'desc' },
  })

  return pendingRows.map((request: CalendarPendingRequestRecord) => ({
    ...request,
    status: request.status as BookingRequest['status'],
    merchant: request.merchant ?? null,
    category: request.category ?? null,
    parentCategory: request.parentCategory ?? null,
    subCategory1: request.subCategory1 ?? null,
    subCategory2: request.subCategory2 ?? null,
    subCategory3: request.subCategory3 ?? null,
    subCategory4: request.subCategory4 ?? null,
    eventId: request.eventId ?? null,
    opportunityId: request.opportunityId ?? null,
    dealId: request.dealId ?? null,
    processedAt: request.processedAt ?? null,
    processedBy: request.processedBy ?? null,
    rejectionReason: request.rejectionReason ?? null,
    publicLinkToken: request.publicLinkToken ?? null,
  }))
}

export async function createEvent(formData: FormData) {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: authResult.error || 'Unauthorized' }
    }
    const { userId } = authResult

    const submittedName = formData.get('name') as string
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

    if (!startDate || !endDate) {
      return { success: false, error: 'Missing required fields' }
    }

    let name = (submittedName || '').trim()

    if (bookingRequestId) {
      const bookingRequest = await prisma.bookingRequest.findUnique({
        where: { id: bookingRequestId },
        select: {
          name: true,
          merchant: true,
          pricingOptions: true,
        },
      })

      if (bookingRequest) {
        const generatedName = buildEventNameFromBookingRequest({
          requestName: bookingRequest.name || '',
          merchant: bookingRequest.merchant || null,
          pricingOptions: bookingRequest.pricingOptions,
        })
        name = generatedName || bookingRequest.name || name
      }
    }

    if (!name) {
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

  // Always persist new calendar events as booked so they appear in the default calendar view.
  const eventStatus = 'booked'

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
      status: eventStatus,
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
      async () => fetchCalendarEvents(role, userId),
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
 * Fetch events for only the requested calendar range.
 * Date format expected: YYYY-MM-DD
 */
export async function getCalendarEventsInRange(startDate: string, endDate: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    const rangeStart = parseDateInPanamaTime(startDate)
    const rangeEnd = parseEndDateInPanamaTime(endDate)
    const events = await fetchCalendarEvents(role, authResult.userId, rangeStart, rangeEnd)

    return { success: true, data: events }
  } catch (error) {
    return handleServerActionError(error, 'getCalendarEventsInRange')
  }
}

/**
 * Fetch only calendar-pending booking requests (approved, not yet booked/rejected).
 */
export async function getCalendarPendingRequests() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    const bookingRequests = await fetchCalendarPendingRequests(role, authResult.userId)
    return { success: true, data: bookingRequests }
  } catch (error) {
    return handleServerActionError(error, 'getCalendarPendingRequests')
  }
}

/**
 * Lightweight daily event counts for a single month.
 * Returns { "YYYY-MM-DD": count } for booked/pre-booked events starting on each day.
 * Cached for 5 minutes and tagged with 'events' for invalidation on mutations.
 */
export async function getDailyEventCounts(year: number, month: number) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: true, data: {} as Record<string, number> }
  }

  try {
    const cacheKey = `daily-counts-${year}-${month}`

    const getCached = unstable_cache(
      async () => {
        const monthStart = parseDateInPanamaTime(
          `${year}-${String(month).padStart(2, '0')}-01`
        )
        const nextMonthStart = month === 12
          ? parseDateInPanamaTime(`${year + 1}-01-01`)
          : parseDateInPanamaTime(
              `${year}-${String(month + 1).padStart(2, '0')}-01`
            )

        const rows = await prisma.event.groupBy({
          by: ['startDate'],
          where: {
            status: { in: ['booked', 'pre-booked'] },
            startDate: { gte: monthStart, lt: nextMonthStart },
          },
          _count: { id: true },
        })

        const counts: Record<string, number> = {}
        for (const row of rows) {
          const d = new Date(row.startDate)
          const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
          counts[key] = (counts[key] || 0) + row._count.id
        }
        return counts
      },
      [cacheKey],
      { tags: ['events'], revalidate: 300 }
    )

    const data = await getCached()
    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getDailyEventCounts')
  }
}

export async function getCalendarPendingRequestsCount() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()

    if (role !== 'admin' && role !== 'sales') {
      return { success: true, data: 0 }
    }

    const pendingCount = await prisma.bookingRequest.count({
      where: {
        status: 'approved',
        ...(role === 'admin' ? {} : { userId: authResult.userId }),
      },
    })

    return { success: true, data: pendingCount }
  } catch (error) {
    return handleServerActionError(error, 'getCalendarPendingRequestsCount')
  }
}

/**
 * Refresh calendar data (events + booking requests) without full page refresh
 * This is more efficient than router.refresh() as it doesn't re-fetch user data
 */
export async function refreshCalendarData(options: RefreshCalendarDataOptions = {}): Promise<{
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

    const hasRange = Boolean(options.startDate && options.endDate)
    const rangeStart = hasRange ? parseDateInPanamaTime(options.startDate!) : undefined
    const rangeEnd = hasRange ? parseEndDateInPanamaTime(options.endDate!) : undefined

    // Fetch events (bypass cache to get fresh data)
    const events = await fetchCalendarEvents(role, userId, rangeStart, rangeEnd)

    let bookingRequests: BookingRequest[] | undefined
    if (options.includePendingRequests) {
      bookingRequests = await fetchCalendarPendingRequests(role, userId)
    }

    return {
      success: true,
      events,
      ...(options.includePendingRequests ? { bookingRequests } : {}),
    }
  } catch (error) {
    return handleServerActionError(error, 'refreshCalendarData')
  }
}

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
  const previousValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}
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
    const updateValues: Record<string, unknown> = {
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
            try {
              const { sendDealAssignmentReadyEmail } = await import('@/lib/email/services/deal-assignment-ready')
              await sendDealAssignmentReadyEmail(bookingRequest.id)
            } catch (emailError) {
              logger.error('Failed to send deal assignment ready email:', emailError)
            }
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
