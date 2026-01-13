'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'

/**
 * Get pipeline data: all opportunities with their linked booking requests
 * Returns unified data for the pipeline view
 */
export async function getPipelineData() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `pipeline-data-${userId}-${role}`

    const getCachedPipelineData = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: Record<string, unknown> = {}
        
        if (role === 'sales') {
          whereClause.responsibleId = userId
        } else if (role === 'editor' || role === 'ere') {
          return { opportunities: [], deals: [], preBookedEvents: [] }
        }

        // Get all opportunities with business data
        const opportunities = await prisma.opportunity.findMany({
          where: whereClause,
          include: {
            business: {
              include: {
                category: {
                  select: {
                    id: true,
                    categoryKey: true,
                    parentCategory: true,
                    subCategory1: true,
                    subCategory2: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })

        // Get all booking requests that are linked to opportunities
        const opportunityIdsWithRequests = opportunities
          .filter(opp => opp.bookingRequestId)
          .map(opp => opp.bookingRequestId!)
        
        const linkedRequests = opportunityIdsWithRequests.length > 0
          ? await prisma.bookingRequest.findMany({
              where: { id: { in: opportunityIdsWithRequests } },
              orderBy: { createdAt: 'desc' },
            })
          : []

        // Get standalone booking requests (not linked to any opportunity)
        const standaloneWhere: Record<string, unknown> = { opportunityId: null }
        if (role === 'sales') {
          standaloneWhere.userId = userId
        }

        const standaloneRequests = await prisma.bookingRequest.findMany({
          where: standaloneWhere,
          orderBy: { createdAt: 'desc' },
        })

        // Combine all requests
        const allRequests = [...linkedRequests, ...standaloneRequests]
        const requestMap = new Map(allRequests.map(req => [req.id, req]))

        // Combine opportunities with their requests
        const opportunityItems = opportunities.map(opp => ({
          opportunity: opp,
          bookingRequest: opp.bookingRequestId ? requestMap.get(opp.bookingRequestId) || null : null,
        }))

        // Create pipeline items for standalone requests
        const standaloneItems = standaloneRequests.map(req => ({
          opportunity: null,
          bookingRequest: req,
        }))

        // Merge and sort pipeline data
        const pipelineData = [...opportunityItems, ...standaloneItems].sort((a, b) => {
          const dateA = a.opportunity?.createdAt || a.bookingRequest?.createdAt || new Date(0)
          const dateB = b.opportunity?.createdAt || b.bookingRequest?.createdAt || new Date(0)
          return dateB.getTime() - dateA.getTime()
        })

        // Get all deals (only for booked requests)
        const bookedRequestIds = allRequests
          .filter(req => req.status === 'booked')
          .map(req => req.id)
        
        const deals = bookedRequestIds.length > 0
          ? await prisma.deal.findMany({
              where: { bookingRequestId: { in: bookedRequestIds } },
              include: {
                bookingRequest: {
                  select: {
                    id: true, name: true, businessEmail: true, startDate: true, endDate: true,
                    status: true, parentCategory: true, subCategory1: true, subCategory2: true,
                    processedAt: true, opportunityId: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            })
          : []

        // Get opportunities for deals
        const dealOpportunityIds = deals
          .map(d => d.bookingRequest.opportunityId)
          .filter((id): id is string => id !== null)
        
        const dealOpportunities = dealOpportunityIds.length > 0
          ? await prisma.opportunity.findMany({
              where: { id: { in: dealOpportunityIds } },
              select: {
                id: true, responsibleId: true, businessId: true,
                business: {
                  include: {
                    category: {
                      select: { id: true, categoryKey: true, parentCategory: true, subCategory1: true, subCategory2: true },
                    },
                  },
                },
              },
            })
          : []

        const dealOpportunityMap = new Map(dealOpportunities.map(o => [o.id, o]))

        const dealsWithOpportunity = deals.map(deal => ({
          deal,
          opportunity: deal.bookingRequest.opportunityId
            ? dealOpportunityMap.get(deal.bookingRequest.opportunityId)
            : null,
          bookingRequest: deal.bookingRequest,
        }))

        // Get pre-booked events
        const preBookedEventsWhere: Record<string, unknown> = {
          status: 'pre-booked',
          bookingRequestId: null,
        }
        if (role === 'sales') {
          preBookedEventsWhere.userId = userId
        }

        const preBookedEvents = await prisma.event.findMany({
          where: preBookedEventsWhere,
          orderBy: { createdAt: 'desc' },
        })

        const formattedPreBookedEvents = preBookedEvents.map(event => ({
          event: {
            id: event.id, name: event.name, startDate: event.startDate, endDate: event.endDate,
            status: event.status, merchant: event.merchant, parentCategory: event.parentCategory,
            subCategory1: event.subCategory1, subCategory2: event.subCategory2, createdAt: event.createdAt,
          },
        }))

        return {
          opportunities: pipelineData,
          deals: dealsWithOpportunity,
          preBookedEvents: formattedPreBookedEvents,
        }
      },
      [cacheKey],
      {
        tags: ['pipeline', 'opportunities', 'booking-requests', 'deals', 'events'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const data = await getCachedPipelineData()
    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getPipelineData')
  }
}

/**
 * Get paginated pipeline data for the unified pipeline view
 * Fetches ALL item types and sorts them together by date for a true unified view
 */
export async function getPipelineDataPaginated(options: {
  page?: number
  pageSize?: number
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const page = options.page ?? 0
    const pageSize = options.pageSize ?? 50

    if (role === 'editor' || role === 'ere') {
      return { success: true, data: { opportunities: [], deals: [], preBookedEvents: [] }, total: 0, page, pageSize, totalPages: 0 }
    }

    // Build where clauses based on role
    const opportunityWhere: Record<string, unknown> = {}
    const standaloneRequestWhere: Record<string, unknown> = { opportunityId: null }
    const eventWhere: Record<string, unknown> = { status: 'pre-booked', bookingRequestId: null }
    
    if (role === 'sales') {
      opportunityWhere.responsibleId = userId
      standaloneRequestWhere.userId = userId
      eventWhere.userId = userId
    }

    // Fetch all types in parallel (we'll combine and paginate client-side for accuracy)
    const [
      opportunities,
      standaloneRequests,
      preBookedEvents,
      oppCount,
      requestCount,
      eventCount
    ] = await Promise.all([
      prisma.opportunity.findMany({
        where: opportunityWhere,
        include: {
          business: {
            include: {
              category: {
                select: { id: true, categoryKey: true, parentCategory: true, subCategory1: true, subCategory2: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bookingRequest.findMany({
        where: standaloneRequestWhere,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.event.findMany({
        where: eventWhere,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.opportunity.count({ where: opportunityWhere }),
      prisma.bookingRequest.count({ where: standaloneRequestWhere }),
      prisma.event.count({ where: eventWhere }),
    ])

    const totalCount = oppCount + requestCount + eventCount

    // Get booking requests linked to opportunities
    const opportunityIdsWithRequests = opportunities
      .filter(opp => opp.bookingRequestId)
      .map(opp => opp.bookingRequestId!)
    
    const linkedRequests = opportunityIdsWithRequests.length > 0
      ? await prisma.bookingRequest.findMany({
          where: { id: { in: opportunityIdsWithRequests } },
        })
      : []

    const requestMap = new Map(linkedRequests.map(req => [req.id, req]))

    // Create combined items with unified timestamp for sorting
    type UnifiedItem = {
      type: 'opportunity' | 'request' | 'event'
      createdAt: Date
      data: any
    }

    const allItems: UnifiedItem[] = []

    // Add opportunities (with their linked requests)
    opportunities.forEach(opp => {
      allItems.push({
        type: 'opportunity',
        createdAt: opp.createdAt,
        data: {
          opportunity: opp,
          bookingRequest: opp.bookingRequestId ? requestMap.get(opp.bookingRequestId) || null : null,
        }
      })
    })

    // Add standalone requests
    standaloneRequests.forEach(req => {
      allItems.push({
        type: 'request',
        createdAt: req.createdAt,
        data: {
          opportunity: null,
          bookingRequest: req,
        }
      })
    })

    // Add pre-booked events
    preBookedEvents.forEach(event => {
      allItems.push({
        type: 'event',
        createdAt: event.createdAt,
        data: {
          event: {
            id: event.id, name: event.name, startDate: event.startDate, endDate: event.endDate,
            status: event.status, merchant: event.merchant, parentCategory: event.parentCategory,
            subCategory1: event.subCategory1, subCategory2: event.subCategory2, createdAt: event.createdAt,
          }
        }
      })
    })

    // Sort all items by createdAt descending
    allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Paginate the combined results
    const paginatedItems = allItems.slice(page * pageSize, (page + 1) * pageSize)

    // Separate back into categories
    const pipelineData: { opportunity: any; bookingRequest: any }[] = []
    const formattedPreBookedEvents: { event: any }[] = []

    paginatedItems.forEach(item => {
      if (item.type === 'opportunity' || item.type === 'request') {
        pipelineData.push(item.data)
      } else if (item.type === 'event') {
        formattedPreBookedEvents.push(item.data)
      }
    })

    // Get deals for booked requests in the current page
    const allRequestsInPage = pipelineData
      .map(p => p.bookingRequest)
      .filter(req => req?.status === 'booked')
    
    const bookedRequestIds = allRequestsInPage.map(req => req!.id)
    
    const deals = bookedRequestIds.length > 0
      ? await prisma.deal.findMany({
          where: { bookingRequestId: { in: bookedRequestIds } },
          include: {
            bookingRequest: {
              select: {
                id: true, name: true, businessEmail: true, startDate: true, endDate: true,
                status: true, parentCategory: true, subCategory1: true, subCategory2: true,
                processedAt: true, opportunityId: true, createdAt: true, merchant: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Get opportunity data for deals
    const dealOpportunityIds = deals
      .map(d => d.bookingRequest.opportunityId)
      .filter((id): id is string => id !== null)
    
    const dealOpportunities = dealOpportunityIds.length > 0
      ? await prisma.opportunity.findMany({
          where: { id: { in: dealOpportunityIds } },
          select: {
            id: true, responsibleId: true, businessId: true,
            business: { include: { category: { select: { id: true, categoryKey: true, parentCategory: true, subCategory1: true, subCategory2: true } } } },
          },
        })
      : []

    const dealOpportunityMap = new Map(dealOpportunities.map(o => [o.id, o]))

    const dealsWithOpportunity = deals.map(deal => ({
      deal,
      opportunity: deal.bookingRequest.opportunityId ? dealOpportunityMap.get(deal.bookingRequest.opportunityId) : null,
      bookingRequest: deal.bookingRequest,
    }))

    return {
      success: true,
      data: {
        opportunities: pipelineData,
        deals: dealsWithOpportunity,
        preBookedEvents: formattedPreBookedEvents,
      },
      total: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getPipelineDataPaginated')
  }
}

/**
 * Search pipeline data across opportunities, requests, deals, and events
 */
export async function searchPipelineData(query: string, options: { limit?: number } = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const limit = options.limit ?? 100

    if (role === 'editor' || role === 'ere') {
      return { success: true, data: { opportunities: [], deals: [], preBookedEvents: [] } }
    }

    // Build base where clauses
    const opportunityWhere: Record<string, unknown> = {}
    const requestWhere: Record<string, unknown> = { opportunityId: null }
    const eventWhere: Record<string, unknown> = { status: 'pre-booked', bookingRequestId: null }
    
    if (role === 'sales') {
      opportunityWhere.responsibleId = userId
      requestWhere.userId = userId
      eventWhere.userId = userId
    }

    // Search opportunities by business name
    const opportunities = await prisma.opportunity.findMany({
      where: {
        ...opportunityWhere,
        business: { name: { contains: query, mode: 'insensitive' } },
      },
      include: {
        business: {
          include: { category: { select: { id: true, categoryKey: true, parentCategory: true, subCategory1: true, subCategory2: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Get linked booking requests
    const opportunityIdsWithRequests = opportunities
      .filter(opp => opp.bookingRequestId)
      .map(opp => opp.bookingRequestId!)
    
    const linkedRequests = opportunityIdsWithRequests.length > 0
      ? await prisma.bookingRequest.findMany({
          where: { id: { in: opportunityIdsWithRequests } },
        })
      : []

    const requestMap = new Map(linkedRequests.map(req => [req.id, req]))

    const opportunityItems = opportunities.map(opp => ({
      opportunity: opp,
      bookingRequest: opp.bookingRequestId ? requestMap.get(opp.bookingRequestId) || null : null,
    }))

    // Search standalone booking requests
    const standaloneRequests = await prisma.bookingRequest.findMany({
      where: {
        ...requestWhere,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { merchant: { contains: query, mode: 'insensitive' } },
          { businessEmail: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const standaloneItems = standaloneRequests.map(req => ({
      opportunity: null,
      bookingRequest: req,
    }))

    const pipelineData = [...opportunityItems, ...standaloneItems]

    // Get deals for booked requests that match
    const allBookedRequestIds = [...linkedRequests, ...standaloneRequests]
      .filter(req => req?.status === 'booked')
      .map(req => req!.id)
    
    const deals = allBookedRequestIds.length > 0
      ? await prisma.deal.findMany({
          where: { bookingRequestId: { in: allBookedRequestIds } },
          include: {
            bookingRequest: {
              select: {
                id: true, name: true, businessEmail: true, startDate: true, endDate: true,
                status: true, parentCategory: true, subCategory1: true, subCategory2: true,
                processedAt: true, opportunityId: true, createdAt: true, merchant: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    // Get opportunity data for deals
    const dealOpportunityIds = deals
      .map(d => d.bookingRequest.opportunityId)
      .filter((id): id is string => id !== null)
    
    const dealOpportunities = dealOpportunityIds.length > 0
      ? await prisma.opportunity.findMany({
          where: { id: { in: dealOpportunityIds } },
          select: {
            id: true, responsibleId: true, businessId: true,
            business: { include: { category: { select: { id: true, categoryKey: true, parentCategory: true, subCategory1: true, subCategory2: true } } } },
          },
        })
      : []

    const dealOpportunityMap = new Map(dealOpportunities.map(o => [o.id, o]))

    const dealsWithOpportunity = deals.map(deal => ({
      deal,
      opportunity: deal.bookingRequest.opportunityId ? dealOpportunityMap.get(deal.bookingRequest.opportunityId) : null,
      bookingRequest: deal.bookingRequest,
    }))

    // Search pre-booked events
    const preBookedEvents = await prisma.event.findMany({
      where: {
        ...eventWhere,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { merchant: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const formattedPreBookedEvents = preBookedEvents.map(event => ({
      event: {
        id: event.id, name: event.name, startDate: event.startDate, endDate: event.endDate,
        status: event.status, merchant: event.merchant, parentCategory: event.parentCategory,
        subCategory1: event.subCategory1, subCategory2: event.subCategory2, createdAt: event.createdAt,
      },
    }))

    return {
      success: true,
      data: {
        opportunities: pipelineData,
        deals: dealsWithOpportunity,
        preBookedEvents: formattedPreBookedEvents,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'searchPipelineData')
  }
}
