'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { sendVendorToExternalApi } from '@/lib/api/external-oferta'
import type { Business, Opportunity, BookingRequest, UserData } from '@/types'
import type { Category } from '@prisma/client'

// Extended where clause type to include reassignment fields not yet in Prisma schema
type BusinessWhereClause = Prisma.BusinessWhereInput & {
  reassignmentStatus?: null | string
}

// Map column names to database fields for sorting
const SORT_COLUMN_MAP: Record<string, string> = {
  topSold: 'topSoldQuantity',
  topRevenue: 'topRevenueAmount',
  lastLaunch: 'lastLaunchDate',
  deals360d: 'totalDeals360d',
}

/**
 * Helper to resolve categoryId - handles both category IDs and parent category strings
 * When displayMode="parentOnly" is used in CategorySelect, it returns parent strings like "Restaurantes"
 * instead of category IDs. This function finds the first matching category.
 * 
 * @param categoryValue - Either a category ID (cuid) or a parent category string
 * @returns The resolved category ID or null if not found
 */
async function resolveCategoryId(categoryValue: string | null): Promise<string | null> {
  if (!categoryValue) return null
  
  // CUIDs are typically 25+ characters and don't contain spaces
  // Parent category strings are usually shorter and may contain spaces
  const looksLikeCuid = categoryValue.length >= 20 && !categoryValue.includes(' ')
  
  if (looksLikeCuid) {
    // It looks like a category ID - verify it exists
    const category = await prisma.category.findUnique({
      where: { id: categoryValue },
      select: { id: true },
    })
    return category?.id || null
  }
  
  // It's likely a parent category string - find any matching category
  const matchingCategory = await prisma.category.findFirst({
    where: { parentCategory: categoryValue, isActive: true },
    select: { id: true },
    orderBy: { displayOrder: 'asc' },
  })
  
  return matchingCategory?.id || null
}

/**
 * Get all businesses (cached)
 */
export async function getBusinesses() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `businesses-${userId}-${role}`

    const getCachedBusinesses = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: BusinessWhereClause = {}
        
        if (role === 'sales') {
          // Sales only see businesses where they are the owner
          whereClause.ownerId = userId
          // Filter out businesses pending reassignment
          whereClause.reassignmentStatus = null
        } else if (role === 'editor' || role === 'ere') {
          // Editors and ERE don't have access to businesses
          return []
        }
        // Admin sees all (no where clause)

        const businesses = await prisma.business.findMany({
          where: whereClause,
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
            salesReps: {
              include: {
                userProfile: {
                  select: {
                    id: true,
                    clerkId: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get custom field values for all businesses
        const businessIds = businesses.map((b: { id: string }) => b.id)
        const customFieldValues = businessIds.length > 0
          ? await prisma.customFieldValue.findMany({
              where: {
                entityType: 'business',
                entityId: { in: businessIds },
              },
              include: {
                customField: {
                  select: {
                    fieldKey: true,
                  },
                },
              },
            })
          : []

        // Group custom field values by business ID
        const customFieldsByBusinessId = new Map<string, Record<string, string | null>>()
        for (const cfv of customFieldValues) {
          if (!customFieldsByBusinessId.has(cfv.entityId)) {
            customFieldsByBusinessId.set(cfv.entityId, {})
          }
          customFieldsByBusinessId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
        }

        // Add custom fields to each business
        return businesses.map((biz: { id: string }) => ({
          ...biz,
          customFields: customFieldsByBusinessId.get(biz.id) || {},
        }))
      },
      [cacheKey],
      {
        tags: ['businesses'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const businesses = await getCachedBusinesses()
    return { success: true, data: businesses }
  } catch (error) {
    return handleServerActionError(error, 'getBusinesses')
  }
}

/**
 * Get businesses with pagination (cacheable, <2MB per page)
 * Supports filtering by opportunity status (with-open, without-open)
 */
export async function getBusinessesPaginated(options: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  opportunityFilter?: string // 'all' | 'with-open' | 'without-open'
  focusFilter?: string // 'all' | 'with-focus'
  activeDealFilter?: boolean // Filter to businesses with active deals
  salesRepId?: string // Filter by owner (admin quick filter) - named salesRepId for consistency with other pages
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { page = 0, pageSize = 50, sortBy = 'createdAt', sortDirection = 'desc', opportunityFilter, focusFilter, activeDealFilter, salesRepId: ownerFilter } = options

    // Build where clause based on role
    const whereClause: BusinessWhereClause = {}
    if (role === 'sales') {
      whereClause.ownerId = userId
      // Filter out businesses pending reassignment for sales reps
      // Sales reps should not see businesses that have been flagged for reassignment
      whereClause.reassignmentStatus = null
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [], total: 0, page, pageSize }
    }
    // Admin sees all businesses (no reassignmentStatus filter)
    
    // Apply opportunity filter if provided
    if (opportunityFilter === 'with-open') {
      // Businesses with at least one open opportunity (not won/lost)
      whereClause.opportunities = {
        some: {
          stage: { notIn: ['won', 'lost'] }
        }
      }
    } else if (opportunityFilter === 'without-open') {
      // Businesses without any open opportunity
      whereClause.opportunities = {
        none: {
          stage: { notIn: ['won', 'lost'] }
        }
      }
    }
    
    // Apply focus filter if provided
    if (focusFilter === 'with-focus') {
      // Businesses with active focus (not null and not expired)
      // We check for non-null focusPeriod here; expiration is handled client-side
      whereClause.focusPeriod = { not: null }
    }
    
    // Apply active deal filter if provided
    if (activeDealFilter) {
      // Find vendor IDs that have active deals (endAt > now)
      const now = new Date()
      const activeDealMetrics = await prisma.dealMetrics.findMany({
        where: {
          endAt: { gt: now },
          externalVendorId: { not: null },
        },
        select: {
          externalVendorId: true,
        },
        distinct: ['externalVendorId'],
      })
      
      const activeVendorIds = activeDealMetrics
        .map(dm => dm.externalVendorId)
        .filter((id): id is string => id !== null)
      
      // Filter businesses to those with osAdminVendorId in the active vendor list
      if (activeVendorIds.length > 0) {
        whereClause.osAdminVendorId = { in: activeVendorIds }
      } else {
        // No active deals, return empty result
        whereClause.osAdminVendorId = { in: [] }
      }
    }
    
    // Apply owner filter (admin quick filter)
    if (ownerFilter) {
      whereClause.ownerId = ownerFilter
    }

    // Get total count (with filters applied)
    const total = await prisma.business.count({ where: whereClause })

    // Build orderBy array - all sorting is now native Prisma
    // Using Prisma's extended orderBy syntax for NULL handling
    type OrderByItem = Record<string, 'asc' | 'desc' | { sort: 'asc' | 'desc'; nulls: 'first' | 'last' }>
    const orderByArray: OrderByItem[] = []
    
    // Sort focused businesses first (those with focusPeriod) - asc puts non-null first (NULLs last)
    orderByArray.push({ focusPeriod: 'asc' })
    
    // Then apply user's sort
    const dbColumn = SORT_COLUMN_MAP[sortBy]
    if (dbColumn) {
      // Deal metrics column - always put NULLs last so actual data appears first
      orderByArray.push({ [dbColumn]: { sort: sortDirection, nulls: 'last' } })
    } else if (sortBy === 'name') {
      orderByArray.push({ name: sortDirection })
    } else if (sortBy === 'contact') {
      orderByArray.push({ contactName: sortDirection })
    } else {
      orderByArray.push({ createdAt: sortDirection })
    }

    // Get paginated businesses
    const businesses = await prisma.business.findMany({
      where: whereClause,
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
        salesReps: {
          include: {
            userProfile: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: orderByArray,
      skip: page * pageSize,
      take: pageSize,
    })

    // Get custom field values for this page of businesses
    const businessIds = businesses.map((b: { id: string }) => b.id)
    const customFieldValues = businessIds.length > 0
      ? await prisma.customFieldValue.findMany({
          where: {
            entityType: 'business',
            entityId: { in: businessIds },
          },
          include: {
            customField: {
              select: {
                fieldKey: true,
              },
            },
          },
        })
      : []

    // Group custom field values by business ID
    const customFieldsByBusinessId = new Map<string, Record<string, string | null>>()
    for (const cfv of customFieldValues) {
      if (!customFieldsByBusinessId.has(cfv.entityId)) {
        customFieldsByBusinessId.set(cfv.entityId, {})
      }
      customFieldsByBusinessId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
    }

    // Add custom fields to each business
    const businessesWithCustomFields = businesses.map((biz: { id: string }) => ({
      ...biz,
      customFields: customFieldsByBusinessId.get(biz.id) || {},
    }))

    return { 
      success: true, 
      data: businessesWithCustomFields, 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessesPaginated')
  }
}

/**
 * Get business counts by opportunity status (for filter tabs)
 * Returns: all, with-open (has open opportunities), without-open (no open opportunities), with-active-deal
 */
export async function getBusinessCounts(filters?: { salesRepId?: string }) {
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
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: { all: 0, 'with-open': 0, 'without-open': 0, 'with-focus': 0, 'with-active-deal': 0 } }
    }
    
    // Apply owner filter (admin quick filter)
    if (filters?.salesRepId) {
      baseWhere.ownerId = filters.salesRepId
    }

    // Get active vendor IDs with active deals
    const now = new Date()
    const activeDealMetrics = await prisma.dealMetrics.findMany({
      where: {
        endAt: { gt: now },
        externalVendorId: { not: null },
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
    } else if (role === 'editor' || role === 'ere') {
      return { 
        success: true, 
        data: {} as Record<string, string>
      }
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

    // Find active deals (endAt > now) for these vendors
    const now = new Date()
    const activeDeals = await prisma.dealMetrics.findMany({
      where: {
        externalVendorId: { in: vendorIds },
        endAt: { gt: now },
        dealUrl: { not: null },
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
 * Returns: openOpportunityCounts (businessId -> count), pendingRequestCounts (businessName lowercase -> count)
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
    const baseWhere: Record<string, unknown> = {}
    if (role === 'sales') {
      baseWhere.ownerId = userId
    } else if (role === 'editor' || role === 'ere') {
      return { 
        success: true, 
        data: { 
          openOpportunityCounts: {} as Record<string, number>, 
          pendingRequestCounts: {} as Record<string, number> 
        } 
      }
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

    // Get pending request counts per merchant name
    const requestCounts = await prisma.bookingRequest.groupBy({
      by: ['merchant'],
      where: {
        status: 'pending',
        merchant: { not: null },
      },
      _count: { id: true },
    })

    // Convert to Record objects
    const openOpportunityCounts: Record<string, number> = {}
    for (const opp of opportunityCounts) {
      if (opp.businessId) {
        openOpportunityCounts[opp.businessId] = opp._count.id
      }
    }

    const pendingRequestCounts: Record<string, number> = {}
    for (const req of requestCounts) {
      if (req.merchant) {
        pendingRequestCounts[req.merchant.toLowerCase()] = req._count.id
      }
    }

    return { 
      success: true, 
      data: { openOpportunityCounts, pendingRequestCounts } 
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessTableCounts')
  }
}

/**
 * Get all data needed for BusinessFormModal in a single request
 * Replaces multiple separate fetches for categories, users, opportunities, requests
 */
export async function getBusinessFormData(businessId?: string | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const admin = role === 'admin'

    // Build parallel fetch promises
    const fetchPromises: Promise<unknown>[] = [
      // Categories (always needed)
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { parentCategory: 'asc' }],
      }),
    ]

    // Users (only for admin)
    if (admin) {
      fetchPromises.push(
        prisma.userProfile.findMany({
          where: { isActive: true },
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            role: true,
          },
          orderBy: { name: 'asc' },
        })
      )
    } else {
      fetchPromises.push(Promise.resolve([]))
    }

    // Business-specific data (only if editing existing business)
    if (businessId) {
      // Opportunities for this business
      fetchPromises.push(
        prisma.opportunity.findMany({
          where: { businessId },
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
      )

      // Get business name for request lookup
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      })
      const businessName = business?.name?.toLowerCase() || ''

      // Requests matching this business name
      fetchPromises.push(
        businessName
          ? prisma.bookingRequest.findMany({
              where: {
                merchant: { mode: 'insensitive', equals: businessName },
              },
              orderBy: { createdAt: 'desc' },
              take: 50, // Limit to recent requests
            })
          : Promise.resolve([])
      )
    } else {
      // New business - no business-specific data
      fetchPromises.push(Promise.resolve([]))
      fetchPromises.push(Promise.resolve([]))
    }

    const [categories, users, opportunities, requests] = await Promise.all(fetchPromises)

    return {
      success: true,
      data: {
        categories: categories as Category[],
        users: users as UserData[],
        opportunities: opportunities as Opportunity[],
        requests: requests as BookingRequest[],
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessFormData')
  }
}

/**
 * Update business focus period
 * Only assigned sales rep or admin can update focus
 */
export async function updateBusinessFocus(
  businessId: string, 
  focusPeriod: 'month' | 'quarter' | 'year' | null
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Get business with salesReps to check permissions
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        salesReps: {
          select: { salesRepId: true }
        }
      }
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Check permissions: must be admin or assigned sales rep
    const admin = await isAdmin()
    const isAssignedRep = business.salesReps.some(rep => rep.salesRepId === userId)
    const isOwner = business.ownerId === userId

    if (!admin && !isAssignedRep && !isOwner) {
      return { success: false, error: 'No tienes permiso para modificar el foco de este negocio' }
    }

    // Update focus
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        focusPeriod: focusPeriod,
        focusSetAt: focusPeriod ? new Date() : null, // Set timestamp when focus is set, null when cleared
      },
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
        salesReps: {
          include: {
            userProfile: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Log activity
    const focusLabel = focusPeriod 
      ? { month: 'Mes', quarter: 'Trimestre', year: 'Año' }[focusPeriod] 
      : null
    await logActivity({
      action: 'UPDATE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name,
      details: {
        changedFields: ['focusPeriod', 'focusSetAt'],
        changes: {
          focusPeriod: { from: business.focusPeriod, to: focusPeriod },
        },
        metadata: {
          focusAction: focusPeriod ? 'set' : 'cleared',
          focusLabel: focusLabel,
        },
      },
    })

    // Invalidate cache
    invalidateEntity('businesses')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateBusinessFocus')
  }
}

/**
 * Search businesses across ALL records (server-side search)
 * Used when user types in search bar - searches name, contactName, contactEmail, contactPhone
 */
export async function searchBusinesses(query: string, options: {
  limit?: number
  salesRepId?: string // Filter by owner (admin quick filter) - named salesRepId for consistency
  activeDealFilter?: boolean // Filter to businesses with active deals
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { limit = 100, salesRepId: ownerFilter, activeDealFilter } = options

    if (!query || query.trim().length < 2) {
      return { success: true, data: [] }
    }

    const searchTerm = query.trim()

    // Build where clause based on role
    const roleFilter: BusinessWhereClause = {}
    if (role === 'sales') {
      roleFilter.ownerId = userId
      // Filter out businesses pending reassignment
      roleFilter.reassignmentStatus = null
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [] }
    }
    
    // Apply owner filter (admin quick filter)
    if (ownerFilter) {
      roleFilter.ownerId = ownerFilter
    }

    // Apply active deal filter if provided
    if (activeDealFilter) {
      // Find vendor IDs that have active deals (endAt > now)
      const now = new Date()
      const activeDealMetrics = await prisma.dealMetrics.findMany({
        where: {
          endAt: { gt: now },
          externalVendorId: { not: null },
        },
        select: {
          externalVendorId: true,
        },
        distinct: ['externalVendorId'],
      })
      
      const activeVendorIds = activeDealMetrics
        .map(dm => dm.externalVendorId)
        .filter((id): id is string => id !== null)
      
      // Filter businesses to those with osAdminVendorId in the active vendor list
      if (activeVendorIds.length > 0) {
        roleFilter.osAdminVendorId = { in: activeVendorIds }
      } else {
        // No active deals, return empty result
        roleFilter.osAdminVendorId = { in: [] }
      }
    }

    // Search across multiple fields with OR
    const businesses = await prisma.business.findMany({
      where: {
        ...roleFilter,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { contactName: { contains: searchTerm, mode: 'insensitive' } },
          { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
          { contactPhone: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
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
        salesReps: {
          include: {
            userProfile: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: limit,
    })

    // Get custom field values for search results
    const businessIds = businesses.map((b: { id: string }) => b.id)
    const customFieldValues = businessIds.length > 0
      ? await prisma.customFieldValue.findMany({
          where: {
            entityType: 'business',
            entityId: { in: businessIds },
          },
          include: {
            customField: {
              select: {
                fieldKey: true,
              },
            },
          },
        })
      : []

    // Group custom field values by business ID
    const customFieldsByBusinessId = new Map<string, Record<string, string | null>>()
    for (const cfv of customFieldValues) {
      if (!customFieldsByBusinessId.has(cfv.entityId)) {
        customFieldsByBusinessId.set(cfv.entityId, {})
      }
      customFieldsByBusinessId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
    }

    // Add custom fields to each business
    const businessesWithCustomFields = businesses.map((biz: { id: string }) => ({
      ...biz,
      customFields: customFieldsByBusinessId.get(biz.id) || {},
    }))

    return { success: true, data: businessesWithCustomFields }
  } catch (error) {
    return handleServerActionError(error, 'searchBusinesses')
  }
}

/**
 * Get a single business by ID
 */
export async function getBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
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
        salesReps: {
          include: {
            userProfile: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
          },
        },
        opportunities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    return { success: true, data: business }
  } catch (error) {
    return handleServerActionError(error, 'getBusiness')
  }
}

/**
 * Create a new business
 */
export async function createBusiness(formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesRepIds = formData.getAll('salesRepIds') as string[] // Array of clerkIds
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const province = formData.get('province') as string | null
    const district = formData.get('district') as string | null
    const corregimiento = formData.get('corregimiento') as string | null
    const accountManager = formData.get('accountManager') as string | null
    const ere = formData.get('ere') as string | null
    const salesType = formData.get('salesType') as string | null
    const isAsesor = formData.get('isAsesor') as string | null
    const osAsesor = formData.get('osAsesor') as string | null
    const paymentPlan = formData.get('paymentPlan') as string | null
    const bank = formData.get('bank') as string | null
    const beneficiaryName = formData.get('beneficiaryName') as string | null
    const accountNumber = formData.get('accountNumber') as string | null
    const accountType = formData.get('accountType') as string | null
    const emailPaymentContacts = formData.get('emailPaymentContacts') as string | null
    const address = formData.get('address') as string | null
    const neighborhood = formData.get('neighborhood') as string | null
    const osAdminVendorId = formData.get('osAdminVendorId') as string | null

    // Prevent duplicates by business name (case-insensitive)
    const existingBusiness = await prisma.business.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
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
        salesReps: true,
      },
    })

    if (existingBusiness) {
      // Get owner info if ownerId exists
      let ownerInfo: { name: string | null; email: string | null } | null = null
      if (existingBusiness.ownerId) {
        const ownerProfile = await prisma.userProfile.findUnique({
          where: { clerkId: existingBusiness.ownerId },
          select: { name: true, email: true },
        })
        ownerInfo = ownerProfile
      }
      return { 
        success: false, 
        error: 'Business already exists', 
        existingBusiness: { ...existingBusiness, owner: ownerInfo }
      }
    }

    if (!name || !contactName || !contactPhone || !contactEmail) {
      return { success: false, error: 'Missing required fields' }
    }

    // Create business with sales reps
    // Owner is set to the current user by default
    const businessData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: salesTeam || null,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      province: province || null,
      district: district || null,
      corregimiento: corregimiento || null,
      accountManager: accountManager || null,
      ere: ere || null,
      salesType: salesType || null,
      isAsesor: isAsesor || null,
      osAsesor: osAsesor || null,
      paymentPlan: paymentPlan || null,
      bank: bank || null,
      beneficiaryName: beneficiaryName || null,
      accountNumber: accountNumber || null,
      accountType: accountType || null,
      emailPaymentContacts: emailPaymentContacts || null,
      address: address || null,
      neighborhood: neighborhood || null,
      osAdminVendorId: osAdminVendorId || null,
      salesReps: {
        create: salesRepIds.map((clerkId) => ({
          salesRepId: clerkId,
        })),
      },
    }

    // Set ownerId if userId exists
    if (userId) {
      businessData.ownerId = userId
    }

    // Use relation field for category
    // Resolve categoryId which may be a real ID or a parent category string
    const resolvedCategoryId = await resolveCategoryId(categoryId)
    if (resolvedCategoryId) {
      businessData.category = {
        connect: { id: resolvedCategoryId },
      }
    }

    const business = await prisma.business.create({
      data: businessData as Parameters<typeof prisma.business.create>[0]['data'],
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
        salesReps: true,
      },
    })

    // Send to external vendor API (non-blocking, don't fail if API fails)
    // This creates the vendor in the external OfertaSimple system
    let vendorApiResult: { success: boolean; externalVendorId?: number; error?: string; logId?: string } | null = null
    try {
      // Convert Prisma result to Business type for the mapper
      // Use unknown intermediate cast as Prisma types have different shapes
      const businessForApi = business as unknown as Business
      vendorApiResult = await sendVendorToExternalApi(businessForApi, {
        userId,
        triggeredBy: 'manual',
      })
      if (!vendorApiResult.success) {
        console.warn(`[createBusiness] Vendor API failed for business ${business.id}:`, vendorApiResult.error)
      }
    } catch (vendorError) {
      // Don't fail business creation if vendor API fails
      console.error('[createBusiness] Vendor API error:', vendorError)
    }

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Business',
      entityId: business.id,
      entityName: business.name,
      details: vendorApiResult ? {
        metadata: {
          vendorApiSuccess: vendorApiResult.success,
          externalVendorId: vendorApiResult.externalVendorId,
          vendorApiError: vendorApiResult.error,
        },
      } : undefined,
    })

    invalidateEntity('businesses')
    
    // Refetch business to get updated osAdminVendorId if vendor was created
    const updatedBusiness = vendorApiResult?.success && vendorApiResult.externalVendorId
      ? await prisma.business.findUnique({
          where: { id: business.id },
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
            salesReps: true,
          },
        })
      : business

    return { 
      success: true, 
      data: (updatedBusiness || business) as unknown as Business,
      vendorApiResult: vendorApiResult ? {
        success: vendorApiResult.success,
        externalVendorId: vendorApiResult.externalVendorId,
        error: vendorApiResult.error,
        logId: vendorApiResult.logId,
      } : undefined,
    }
  } catch (error) {
    return handleServerActionError(error, 'createBusiness')
  }
}

/**
 * Update a business
 */
export async function updateBusiness(businessId: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Fetch current business data for comparison
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    })

    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesRepIds = formData.getAll('salesRepIds') as string[]
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const province = formData.get('province') as string | null
    const district = formData.get('district') as string | null
    const corregimiento = formData.get('corregimiento') as string | null
    const accountManager = formData.get('accountManager') as string | null
    const ere = formData.get('ere') as string | null
    const salesType = formData.get('salesType') as string | null
    const isAsesor = formData.get('isAsesor') as string | null
    const osAsesor = formData.get('osAsesor') as string | null
    const paymentPlan = formData.get('paymentPlan') as string | null
    const bank = formData.get('bank') as string | null
    const beneficiaryName = formData.get('beneficiaryName') as string | null
    const accountNumber = formData.get('accountNumber') as string | null
    const accountType = formData.get('accountType') as string | null
    const emailPaymentContacts = formData.get('emailPaymentContacts') as string | null
    const address = formData.get('address') as string | null
    const neighborhood = formData.get('neighborhood') as string | null
    const osAdminVendorId = formData.get('osAdminVendorId') as string | null

    if (!name || !contactName || !contactPhone || !contactEmail) {
      return { success: false, error: 'Missing required fields' }
    }

    // Check if user is admin to allow owner editing
    const admin = await isAdmin()
    const ownerId = admin && formData.get('ownerId') ? (formData.get('ownerId') as string) : undefined

    // Update business and sales reps
    // First, delete existing sales rep associations
    await prisma.businessSalesRep.deleteMany({
      where: { businessId },
    })

    // Then update business and create new associations
    const updateData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: salesTeam || null,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      province: province || null,
      district: district || null,
      corregimiento: corregimiento || null,
      accountManager: accountManager || null,
      ere: ere || null,
      salesType: salesType || null,
      isAsesor: isAsesor || null,
      osAsesor: osAsesor || null,
      paymentPlan: paymentPlan || null,
      bank: bank || null,
      beneficiaryName: beneficiaryName || null,
      accountNumber: accountNumber || null,
      accountType: accountType || null,
      emailPaymentContacts: emailPaymentContacts || null,
      address: address || null,
      neighborhood: neighborhood || null,
      osAdminVendorId: osAdminVendorId || null,
      salesReps: {
        create: salesRepIds.map((clerkId) => ({
          salesRepId: clerkId,
        })),
      },
    }

    // Use relation field for category
    // Resolve categoryId which may be a real ID or a parent category string
    const resolvedCategoryId = await resolveCategoryId(categoryId)
    if (resolvedCategoryId) {
      updateData.category = {
        connect: { id: resolvedCategoryId },
      }
    } else if (categoryId === null || categoryId === '') {
      // Explicitly clearing the category
      updateData.category = {
        disconnect: true,
      }
    }
    // If categoryId was provided but couldn't be resolved, don't change the category

    // Only update owner if admin
    if (admin && ownerId) {
      updateData.ownerId = ownerId
    }

    const business = await prisma.business.update({
      where: { id: businessId },
      data: updateData as Parameters<typeof prisma.business.update>[0]['data'],
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
        salesReps: true,
      },
    })

    // Calculate changes for logging
    const previousValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}
    const changedFields: string[] = []

    if (currentBusiness) {
      const fieldsToCheck = [
        'name', 'contactName', 'contactPhone', 'contactEmail', 
        'website', 'instagram', 'description', 'tier', 'ruc', 
        'razonSocial', 'paymentPlan', 'bank', 'accountNumber'
      ]
      
      fieldsToCheck.forEach(field => {
        const oldValue = currentBusiness[field as keyof typeof currentBusiness]
        const newValue = updateData[field]
        
        // Check for inequality (handling null/undefined/empty string nuances)
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
      entityType: 'Business',
      entityId: business.id,
      entityName: business.name,
      details: {
        changedFields,
        previousValues,
        newValues
      }
    })

    invalidateEntity('businesses')
    return { success: true, data: business }
  } catch (error) {
    return handleServerActionError(error, 'updateBusiness')
  }
}

/**
 * Delete a business
 */
export async function deleteBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete businesses
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get business name before deleting for logging
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    })

    await prisma.business.delete({
      where: { id: businessId },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business?.name || undefined,
    })

    invalidateEntity('businesses')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteBusiness')
  }
}

/**
 * Get all businesses with booking status (has future events or active requests)
 * Used for BusinessSelect dropdown component
 */
export async function getBusinessesWithBookingStatus() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all businesses with basic info
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            categoryKey: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
          },
        },
        website: true,
        instagram: true,
        description: true,
        ruc: true,
        razonSocial: true,
        province: true,
        district: true,
        corregimiento: true,
        bank: true,
        beneficiaryName: true,
        accountNumber: true,
        accountType: true,
        paymentPlan: true,
        address: true,
        neighborhood: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get all future booked events (by merchant name matching business name)
    const futureBookedEvents = await prisma.event.findMany({
      where: {
        status: 'booked',
        endDate: { gte: today },
      },
      select: {
        merchant: true,
      },
    })
    const bookedMerchants = new Set(
      futureBookedEvents
        .map(e => e.merchant?.toLowerCase())
        .filter(Boolean) as string[]
    )

    // Get all pending/approved booking requests with future dates
    const activeRequests = await prisma.bookingRequest.findMany({
      where: {
        status: { in: ['pending', 'approved'] },
        endDate: { gte: today },
      },
      select: {
        merchant: true,
        name: true,
      },
    })
    const requestMerchants = new Set(
      activeRequests
        .flatMap(r => [r.merchant?.toLowerCase(), r.name?.toLowerCase()])
        .filter(Boolean) as string[]
    )

    // Map businesses with booking status
    const businessesWithStatus = businesses.map(business => {
      const nameLower = business.name.toLowerCase()
      return {
        ...business,
        hasFutureBooking: bookedMerchants.has(nameLower),
        hasActiveRequest: requestMerchants.has(nameLower),
      }
    })

    return { success: true, data: businessesWithStatus }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessesWithBookingStatus')
  }
}

/**
 * Bulk upsert businesses from CSV import
 * Admin only
 */
export interface BulkBusinessRow {
  id?: string
  name: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  category?: string // Full category path (e.g., "Food > Restaurants > Italian")
  owner?: string
  salesReps?: string
  salesTeam?: string
  // Location
  province?: string
  district?: string
  corregimiento?: string
  address?: string
  neighborhood?: string
  // Legal/Tax
  ruc?: string
  razonSocial?: string
  // Online presence
  website?: string
  instagram?: string
  description?: string
  // Business info
  tier?: string
  accountManager?: string
  ere?: string
  salesType?: string
  isAsesor?: string
  osAsesor?: string
  // Payment
  paymentPlan?: string
  bank?: string
  beneficiaryName?: string
  accountNumber?: string
  accountType?: string
  emailPaymentContacts?: string
  // External IDs
  osAdminVendorId?: string
}

export interface BulkUpsertResult {
  created: number
  updated: number
  errors: string[]
}

export async function bulkUpsertBusinesses(
  rows: BulkBusinessRow[]
): Promise<{ success: boolean; data?: BulkUpsertResult; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  // Check admin access
  if (!(await isAdmin())) {
    return { success: false, error: 'Admin access required' }
  }

  try {
    let created = 0
    let updated = 0
    const errors: string[] = []

    // Get all users for owner/salesReps lookup
    const allUsers = await prisma.userProfile.findMany({
      select: { id: true, clerkId: true, name: true, email: true },
    })
    const userByName = new Map(allUsers.map(u => [(u.name || '').toLowerCase(), u]))
    const userByEmail = new Map(allUsers.map(u => [(u.email || '').toLowerCase(), u]))

    // Get all categories for lookup
    const allCategories = await prisma.category.findMany()
    const categoryByPath = new Map<string, string>()
    allCategories.forEach(cat => {
      let path = cat.parentCategory
      if (cat.subCategory1) path += ` > ${cat.subCategory1}`
      if (cat.subCategory2) path += ` > ${cat.subCategory2}`
      categoryByPath.set(path.toLowerCase(), cat.id)
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 for 1-indexed and header row

      try {
        // Validate required fields for new records
        if (!row.id && !row.name) {
          errors.push(`Fila ${rowNum}: Nombre es requerido para nuevos registros`)
          continue
        }

        // Find owner by name or email
        let ownerId: string | null = null
        if (row.owner) {
          const ownerLower = row.owner.toLowerCase()
          const ownerUser = userByName.get(ownerLower) || userByEmail.get(ownerLower)
          if (ownerUser) {
            ownerId = ownerUser.clerkId
          }
        }

        // Find category by path
        let categoryId: string | null = null
        if (row.category) {
          categoryId = categoryByPath.get(row.category.toLowerCase()) || null
        }

        // Build data object with all fields
        const data = {
          name: row.name,
          contactName: row.contactName || '',
          contactEmail: row.contactEmail || '',
          contactPhone: row.contactPhone || '',
          categoryId,
          ownerId,
          salesTeam: row.salesTeam || null,
          // Location
          province: row.province || null,
          district: row.district || null,
          corregimiento: row.corregimiento || null,
          address: row.address || null,
          neighborhood: row.neighborhood || null,
          // Legal/Tax
          ruc: row.ruc || null,
          razonSocial: row.razonSocial || null,
          // Online presence
          website: row.website || null,
          instagram: row.instagram || null,
          description: row.description || null,
          // Business info
          tier: row.tier ? parseInt(row.tier, 10) || null : null,
          accountManager: row.accountManager || null,
          ere: row.ere || null,
          salesType: row.salesType || null,
          isAsesor: row.isAsesor || null,
          osAsesor: row.osAsesor || null,
          // Payment
          paymentPlan: row.paymentPlan || null,
          bank: row.bank || null,
          beneficiaryName: row.beneficiaryName || null,
          accountNumber: row.accountNumber || null,
          accountType: row.accountType || null,
          emailPaymentContacts: row.emailPaymentContacts || null,
          // External IDs
          osAdminVendorId: row.osAdminVendorId || null,
        }

        if (row.id) {
          // Update existing
          const existing = await prisma.business.findUnique({ where: { id: row.id } })
          if (!existing) {
            errors.push(`Fila ${rowNum}: No se encontró negocio con ID ${row.id}`)
            continue
          }

          await prisma.business.update({
            where: { id: row.id },
            data,
          })
          updated++
        } else {
          // Create new - check for duplicate name
          const existingByName = await prisma.business.findFirst({
            where: { name: { equals: row.name, mode: 'insensitive' } },
          })
          
          if (existingByName) {
            errors.push(`Fila ${rowNum}: Ya existe un negocio con el nombre "${row.name}"`)
            continue
          }

          await prisma.business.create({ data })
          created++
        }
      } catch (err) {
        errors.push(`Fila ${rowNum}: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      }
    }

    // Invalidate cache
    await invalidateEntity('businesses')

    // Log activity
    await logActivity({
      action: 'IMPORT',
      entityType: 'Business',
      entityId: 'bulk',
      details: { 
        newValues: { created, updated, errorCount: errors.length },
      },
    })

    return { success: true, data: { created, updated, errors } }
  } catch (error) {
    return handleServerActionError(error, 'bulkUpsertBusinesses')
  }
}

