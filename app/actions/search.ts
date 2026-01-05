'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'

export interface SearchResult {
  id: string
  type: 'business' | 'opportunity' | 'booking-request' | 'deal' | 'event'
  title: string
  subtitle?: string
  url: string
}

/**
 * Global search across all entities
 */
export async function globalSearch(query: string): Promise<{ success: boolean; data?: SearchResult[]; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] }
  }

  try {
    const role = await getUserRole()
    const searchTerm = query.trim().toLowerCase()
    const results: SearchResult[] = []

    // Search Businesses
    let businessWhere: Prisma.BusinessWhereInput = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { contactName: { contains: searchTerm, mode: 'insensitive' } },
        { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
        { contactPhone: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }

    if (role === 'sales') {
      businessWhere.ownerId = userId
    } else if (role === 'editor' || role === 'ere') {
      // Editors and ERE don't have access to businesses
      businessWhere = { id: 'never-match' }
    }

    const businesses = await prisma.business.findMany({
      where: businessWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    businesses.forEach(business => {
      results.push({
        id: business.id,
        type: 'business',
        title: business.name,
        subtitle: business.contactEmail || business.contactName || undefined,
        url: `/businesses?open=${business.id}`,
      })
    })

    // Search Opportunities
    let opportunityWhere: Prisma.OpportunityWhereInput = {
      OR: [
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { business: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    }

    if (role === 'sales') {
      opportunityWhere.responsibleId = userId
    } else if (role === 'editor' || role === 'ere') {
      opportunityWhere = { id: 'never-match' }
    }

    const opportunities = await prisma.opportunity.findMany({
      where: opportunityWhere,
      include: {
        business: {
          select: {
            name: true,
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    opportunities.forEach(opportunity => {
      results.push({
        id: opportunity.id,
        type: 'opportunity',
        title: `${opportunity.business.name} - ${opportunity.stage}`,
        subtitle: opportunity.notes || undefined,
        url: `/opportunities?open=${opportunity.id}`,
      })
    })

    // Search Booking Requests
    let bookingRequestWhere: Prisma.BookingRequestWhereInput = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { merchant: { contains: searchTerm, mode: 'insensitive' } },
        { businessEmail: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }

    if (role === 'sales') {
      bookingRequestWhere.userId = userId
    } else if (role === 'editor' || role === 'ere') {
      bookingRequestWhere = { id: 'never-match' }
    }

    const bookingRequests = await prisma.bookingRequest.findMany({
      where: bookingRequestWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    bookingRequests.forEach(request => {
      results.push({
        id: request.id,
        type: 'booking-request',
        title: request.name,
        subtitle: request.merchant || request.businessEmail || undefined,
        url: `/booking-requests/${request.id}`,
      })
    })

    // Search Deals
    let dealWhere: Prisma.DealWhereInput = {
      OR: [
        { bookingRequest: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { bookingRequest: { merchant: { contains: searchTerm, mode: 'insensitive' } } },
        { bookingRequest: { businessEmail: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    }

    if (role === 'editor' || role === 'ere') {
      dealWhere.responsibleId = userId
    } else if (role === 'sales') {
      // Sales see deals based on opportunity responsibleId
      // We'll filter after fetching
    }

    const deals = await prisma.deal.findMany({
      where: dealWhere,
      include: {
        bookingRequest: {
          select: {
            name: true,
            merchant: true,
            businessEmail: true,
            opportunityId: true,
          },
        },
        opportunity: {
          select: {
            responsibleId: true,
          },
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    // Filter deals for sales role
    let filteredDeals = deals
    if (role === 'sales') {
      filteredDeals = deals.filter(deal => 
        deal.opportunity?.responsibleId === userId
      )
    }

    filteredDeals.forEach(deal => {
      results.push({
        id: deal.id,
        type: 'deal',
        title: deal.bookingRequest.name,
        subtitle: deal.bookingRequest.merchant || deal.bookingRequest.businessEmail || deal.status || undefined,
        url: `/deals?open=${deal.id}`,
      })
    })

    // Search Events
    let eventWhere: Prisma.EventWhereInput = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { merchant: { contains: searchTerm, mode: 'insensitive' } },
      ],
    }

    if (role === 'sales') {
      eventWhere.userId = userId
    }

    const events = await prisma.event.findMany({
      where: eventWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
    })

    events.forEach(event => {
      results.push({
        id: event.id,
        type: 'event',
        title: event.name,
        subtitle: event.merchant || event.description || undefined,
        url: `/events?open=${event.id}`,
      })
    })

    // Sort results by relevance (exact matches first, then partial)
    const sortedResults = results.sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      const aExact = aTitle === searchTerm
      const bExact = bTitle === searchTerm
      const aStarts = aTitle.startsWith(searchTerm)
      const bStarts = bTitle.startsWith(searchTerm)

      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })

    return { success: true, data: sortedResults.slice(0, 20) } // Limit to 20 results
  } catch (error) {
    return handleServerActionError(error, 'globalSearch')
  }
}

