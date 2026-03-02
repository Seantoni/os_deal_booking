import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type BookingRequestAccessRecord = {
  id: string
  userId: string
  opportunityId: string | null
  eventId: string | null
}

/**
 * Sales visibility for booking requests:
 * 1) requests created by the sales user
 * 2) requests linked to opportunities whose business is owned by the sales user
 * 3) requests linked to events whose business is owned by the sales user
 */
export async function getSalesBookingRequestVisibilityWhere(userId: string): Promise<Prisma.BookingRequestWhereInput> {
  const [ownedOpportunityRows, ownedEventRows] = await Promise.all([
    prisma.opportunity.findMany({
      where: { business: { ownerId: userId } },
      select: { id: true },
    }),
    prisma.event.findMany({
      where: {
        bookingRequestId: { not: null },
        linkedBusiness: { ownerId: userId },
      },
      select: { bookingRequestId: true },
    }),
  ])

  const ownedOpportunityIds = ownedOpportunityRows.map((row) => row.id)
  const ownedEventRequestIds = Array.from(
    new Set(
      ownedEventRows
        .map((row) => row.bookingRequestId)
        .filter((id): id is string => Boolean(id))
    )
  )

  const filters: Prisma.BookingRequestWhereInput[] = [{ userId }]

  if (ownedOpportunityIds.length > 0) {
    filters.push({ opportunityId: { in: ownedOpportunityIds } })
  }

  if (ownedEventRequestIds.length > 0) {
    filters.push({ id: { in: ownedEventRequestIds } })
  }

  return filters.length === 1 ? filters[0] : { OR: filters }
}

export async function canSalesAccessBookingRequest(
  userId: string,
  bookingRequest: BookingRequestAccessRecord
): Promise<boolean> {
  if (bookingRequest.userId === userId) {
    return true
  }

  if (bookingRequest.opportunityId) {
    const ownedOpportunity = await prisma.opportunity.findFirst({
      where: {
        id: bookingRequest.opportunityId,
        business: { ownerId: userId },
      },
      select: { id: true },
    })

    if (ownedOpportunity) {
      return true
    }
  }

  if (bookingRequest.eventId) {
    const ownedEvent = await prisma.event.findFirst({
      where: {
        id: bookingRequest.eventId,
        linkedBusiness: { ownerId: userId },
      },
      select: { id: true },
    })

    if (ownedEvent) {
      return true
    }
  }

  const fallbackOwnedEvent = await prisma.event.findFirst({
    where: {
      bookingRequestId: bookingRequest.id,
      linkedBusiness: { ownerId: userId },
    },
    select: { id: true },
  })

  return Boolean(fallbackOwnedEvent)
}
