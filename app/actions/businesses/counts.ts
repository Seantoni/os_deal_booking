'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'

import {
  NOT_ARCHIVED_CONDITION,
  type BusinessWhereClause,
} from './_shared/constants'

/**
 * Get business counts by opportunity status (for filter tabs)
 * Returns: all, with-open (has open opportunities), without-open (no open opportunities), with-active-deal
 */
export async function getBusinessCounts(filters?: { ownerId?: string; myBusinessesOnly?: boolean; advancedFilters?: string }) {
  // Import here to avoid circular dependencies
  const { buildPrismaWhere, parseAdvancedFilters } = await import('@/lib/filters/buildPrismaWhere')
  
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    
    // Build base where clause based on role
    // Sales users can VIEW all businesses, so no ownerId filter needed for counts by default
    const baseWhere: Record<string, unknown> = {}
    if (role === 'sales') {
      // Sales can view all businesses, but filter out those pending reassignment
      baseWhere.reassignmentStatus = null
      
      // "My Businesses Only" filter - defaults to TRUE for sales users
      // Only show all businesses if explicitly set to false
      const showMyBusinessesOnly = filters?.myBusinessesOnly !== false
      if (showMyBusinessesOnly) {
        baseWhere.ownerId = userId
      }
    } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
      return { success: true, data: { all: 0, 'with-open': 0, 'without-open': 0, 'with-focus': 0, 'with-active-deal': 0 } }
    } else {
      Object.assign(baseWhere, NOT_ARCHIVED_CONDITION)
    }
    
    // Apply owner filter (admin quick filter)
    if (filters?.ownerId) {
      baseWhere.ownerId = filters.ownerId
    }
    
    // Apply advanced filters
    if (filters?.advancedFilters) {
      const filterRules = parseAdvancedFilters(filters.advancedFilters)
      if (filterRules.length > 0) {
        const advancedWhere = buildPrismaWhere(filterRules)
        if (Object.keys(advancedWhere).length > 0) {
          const existingConditions = Object.keys(baseWhere).length > 0 ? [{ ...baseWhere }] : []
          const combinedWhere = existingConditions.length > 0
            ? { AND: [...existingConditions, advancedWhere] }
            : advancedWhere
          Object.assign(baseWhere, combinedWhere)
        }
      }
    }

    // Get active vendor IDs with active deals (runAt <= now && endAt >= startOfToday)
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const activeDealMetrics = await prisma.dealMetrics.findMany({
      where: {
        runAt: { lte: now },
        endAt: { gte: startOfToday },
        externalVendorId: { not: null },
        OR: [
          { dealUrl: null },
          { NOT: { dealUrl: { contains: 'egift', mode: 'insensitive' } } },
        ],
      },
      select: {
        externalVendorId: true,
      },
      distinct: ['externalVendorId'],
    })
    
    const activeVendorIds = activeDealMetrics
      .map(dm => dm.externalVendorId)
      .filter((id): id is string => id !== null)

    // Get counts in parallel
    const [all, withOpen, withoutOpen, withFocus, withActiveDeal] = await Promise.all([
      prisma.business.count({ where: baseWhere }),
      prisma.business.count({ 
        where: { 
          ...baseWhere, 
          opportunities: { 
            some: { stage: { notIn: ['won', 'lost'] } } 
          } 
        } 
      }),
      prisma.business.count({ 
        where: { 
          ...baseWhere, 
          opportunities: { 
            none: { stage: { notIn: ['won', 'lost'] } } 
          } 
        } 
      }),
      prisma.business.count({ 
        where: { 
          ...baseWhere, 
          focusPeriod: { not: null }
        } 
      }),
      activeVendorIds.length > 0
        ? prisma.business.count({
            where: {
              ...baseWhere,
              osAdminVendorId: { in: activeVendorIds },
            },
          })
        : Promise.resolve(0),
    ])

    return { 
      success: true, 
      data: { all, 'with-open': withOpen, 'without-open': withoutOpen, 'with-focus': withFocus, 'with-active-deal': withActiveDeal }
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessCounts')
  }
}

/**
 * Get active deal URLs for businesses (lazy loaded)
 * Returns: activeDealUrls (businessId -> dealUrl)
 * Only includes businesses that have at least one active deal
 */
export async function getBusinessActiveDealUrls() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    
    // Build base where clause based on role
    const baseWhere: Record<string, unknown> = {}
    if (role === 'sales') {
      baseWhere.ownerId = userId
      baseWhere.reassignmentStatus = null
    } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
      return { 
        success: true, 
        data: {} as Record<string, string>
      }
    } else {
      Object.assign(baseWhere, NOT_ARCHIVED_CONDITION)
    }

    // Get all businesses (with role filter applied)
    const businesses = await prisma.business.findMany({
      where: {
        ...baseWhere,
        osAdminVendorId: { not: null }, // Only businesses with vendor ID
      },
      select: {
        id: true,
        osAdminVendorId: true,
      },
    })

    if (businesses.length === 0) {
      return { success: true, data: {} as Record<string, string> }
    }

    // Get vendor IDs
    const vendorIds = businesses
      .map(b => b.osAdminVendorId)
      .filter((id): id is string => id !== null)

    // Find active deals (runAt <= now && endAt >= startOfToday) for these vendors
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const activeDeals = await prisma.dealMetrics.findMany({
      where: {
        externalVendorId: { in: vendorIds },
        runAt: { lte: now },
        endAt: { gte: startOfToday },
        dealUrl: { not: null },
        NOT: {
          dealUrl: { contains: 'egift', mode: 'insensitive' },
        },
      },
      select: {
        externalVendorId: true,
        dealUrl: true,
      },
      orderBy: { netRevenue: 'desc' }, // Get the highest revenue active deal per vendor
      distinct: ['externalVendorId'],
    })

    // Create map: businessId -> activeDealUrl
    const vendorToBusinessId = new Map(businesses.map(b => [b.osAdminVendorId, b.id]))
    const activeDealUrls: Record<string, string> = {}
    
    for (const deal of activeDeals) {
      if (deal.externalVendorId && deal.dealUrl) {
        const businessId = vendorToBusinessId.get(deal.externalVendorId)
        if (businessId) {
          activeDealUrls[businessId] = deal.dealUrl
        }
      }
    }

    return { 
      success: true, 
      data: activeDealUrls 
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessActiveDealUrls')
  }
}

/**
 * Get counts for business table display (lazy loaded)
 * Returns: openOpportunityCounts (businessId -> count), pendingRequestCountsByBusinessId (businessId -> count)
 * This is much more efficient than loading all opportunities and requests
 */
export async function getBusinessTableCounts() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    
    // Build base where clause based on role
    const baseWhere: BusinessWhereClause = {}
    if (role === 'sales') {
      baseWhere.ownerId = userId
      baseWhere.reassignmentStatus = null
    } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
      return { 
        success: true, 
        data: { 
          openOpportunityCounts: {} as Record<string, number>, 
          pendingRequestCountsByBusinessId: {} as Record<string, number> 
        } 
      }
    } else {
      Object.assign(baseWhere, NOT_ARCHIVED_CONDITION)
    }

    // Get open opportunity counts per business using groupBy
    const opportunityCounts = await prisma.opportunity.groupBy({
      by: ['businessId'],
      where: {
        stage: { notIn: ['won', 'lost'] },
        // For sales users, only count opportunities they own
        ...(role === 'sales' ? { responsibleId: userId } : {}),
      },
      _count: { id: true },
    })

    // Build scoped business lookup once so we can map legacy merchant-name requests.
    const scopedBusinesses = await prisma.business.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
      },
    })

    // Link pending requests to businesses through opportunityId -> opportunity.businessId.
    const requestCountsByOpportunity = await prisma.bookingRequest.groupBy({
      by: ['opportunityId'],
      where: {
        status: 'pending',
        opportunityId: { not: null },
      },
      _count: { id: true },
    })

    // Fallback path for legacy pending requests not linked to an opportunity.
    const legacyRequestCountsByMerchant = await prisma.bookingRequest.groupBy({
      by: ['merchant'],
      where: {
        status: 'pending',
        opportunityId: null,
        merchant: { not: null },
      },
      _count: { id: true },
    })

    const opportunityIds = requestCountsByOpportunity
      .map(request => request.opportunityId)
      .filter((opportunityId): opportunityId is string => !!opportunityId)

    const opportunities = opportunityIds.length > 0
      ? await prisma.opportunity.findMany({
          where: { id: { in: opportunityIds } },
          select: { id: true, businessId: true },
        })
      : []

    // Convert to Record objects
    const openOpportunityCounts: Record<string, number> = {}
    for (const opp of opportunityCounts) {
      if (opp.businessId) {
        openOpportunityCounts[opp.businessId] = opp._count.id
      }
    }

    const pendingRequestCountsByBusinessId: Record<string, number> = {}
    const opportunityBusinessById = new Map(opportunities.map(opportunity => [opportunity.id, opportunity.businessId]))

    for (const request of requestCountsByOpportunity) {
      if (!request.opportunityId) continue
      const linkedBusinessId = opportunityBusinessById.get(request.opportunityId)
      if (!linkedBusinessId) continue

      pendingRequestCountsByBusinessId[linkedBusinessId] = (pendingRequestCountsByBusinessId[linkedBusinessId] || 0) + request._count.id
    }

    const businessIdByNameLower = new Map<string, string>()
    for (const business of scopedBusinesses) {
      const key = business.name.trim().toLowerCase()
      if (key && !businessIdByNameLower.has(key)) {
        businessIdByNameLower.set(key, business.id)
      }
    }

    for (const request of legacyRequestCountsByMerchant) {
      if (!request.merchant) continue
      const businessId = businessIdByNameLower.get(request.merchant.trim().toLowerCase())
      if (!businessId) continue

      pendingRequestCountsByBusinessId[businessId] = (pendingRequestCountsByBusinessId[businessId] || 0) + request._count.id
    }

    return { 
      success: true, 
      data: { openOpportunityCounts, pendingRequestCountsByBusinessId } 
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessTableCounts')
  }
}

/**
 * Get all data needed for BusinessFormModal in a single request
 * Replaces multiple separate fetches for categories, users, opportunities, requests
 */
