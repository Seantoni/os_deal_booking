'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import { getEditableBusinessIds, canEditBusiness } from '@/lib/auth/entity-access'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import { sendVendorToExternalApi, updateVendorInExternalApi, getChangedVendorFields } from '@/lib/api/external-oferta'
import { getBusinessDealMetricsByVendorIds, type BusinessDealMetricsSummary } from '@/app/actions/deal-metrics'
import type { VendorFieldChange, ExternalOfertaVendorUpdateRequest, UpdateVendorResult } from '@/lib/api/external-oferta/vendor/types'
import type { Business, Opportunity, BookingRequest, UserData, Deal, PricingOption } from '@/types'
import type { DealStatus } from '@/lib/constants'
import type { Category } from '@prisma/client'

type BusinessWhereClause = Prisma.BusinessWhereInput

const ARCHIVED_BUSINESS_STATUS = 'archived'

/**
 * Prisma WHERE condition that excludes archived businesses while including NULLs.
 * 
 * Prisma's `{ not: 'archived' }` and `{ NOT: { reassignmentStatus: 'archived' } }`
 * both generate SQL `!= 'archived'` which excludes NULL values due to SQL
 * three-valued logic. This explicit OR guarantees NULLs are included.
 */
const NOT_ARCHIVED_CONDITION: Prisma.BusinessWhereInput = {
  OR: [
    { reassignmentStatus: null },
    { reassignmentStatus: { not: ARCHIVED_BUSINESS_STATUS } },
  ],
}

// Map column names to database fields for sorting
const SORT_COLUMN_MAP: Record<string, string> = {
  topSold: 'topSoldQuantity',
  topRevenue: 'topRevenueAmount',
  lastLaunch: 'lastLaunchDate',
  deals360d: 'totalDeals360d',
}

const LIVE_METRIC_SORT_COLUMNS = new Set(['topSold', 'topRevenue', 'lastLaunch', 'deals360d'])

const BUSINESS_LIST_INCLUDE = Prisma.validator<Prisma.BusinessInclude>()({
  category: {
    select: {
      id: true,
      categoryKey: true,
      parentCategory: true,
      subCategory1: true,
      subCategory2: true,
    },
  },
  owner: {
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
    },
  },
})

type BusinessListRecord = Prisma.BusinessGetPayload<{
  include: typeof BUSINESS_LIST_INCLUDE
}>

type BusinessDealMetricsDisplayFields = {
  osAdminVendorId?: string | null
  topSoldQuantity?: number | null
  topSoldDealUrl?: string | null
  topRevenueAmount?: number | string | null
  topRevenueDealUrl?: string | null
  lastLaunchDate?: Date | string | null
  totalDeals360d?: number | null
}

/**
 * Overlay live deal-metrics summaries (source: dealMetrics table) onto business rows.
 * This avoids stale denormalized business metric fields in list/search views.
 */
async function overlayLiveDealMetrics<T extends BusinessDealMetricsDisplayFields>(
  businesses: T[],
  preloadedMetricsByVendorId?: Map<string, BusinessDealMetricsSummary>
): Promise<T[]> {
  if (businesses.length === 0) return businesses

  let resolvedMetricsByVendorId = preloadedMetricsByVendorId
  if (!resolvedMetricsByVendorId) {
    const vendorIds = [...new Set(
      businesses
        .map(business => business.osAdminVendorId)
        .filter((vendorId): vendorId is string => !!vendorId)
    )]

    if (vendorIds.length === 0) return businesses
    resolvedMetricsByVendorId = await getBusinessDealMetricsByVendorIds(vendorIds)
  }

  return businesses.map((business) => {
    if (!business.osAdminVendorId) return business

    const summary = resolvedMetricsByVendorId.get(business.osAdminVendorId)
    if (!summary) return business

    return {
      ...business,
      topSoldQuantity: summary.topSoldQuantity,
      topSoldDealUrl: summary.topSoldDealUrl,
      topRevenueAmount: summary.topRevenueAmount,
      topRevenueDealUrl: summary.topRevenueDealUrl,
      lastLaunchDate: summary.lastLaunchDate,
      totalDeals360d: summary.totalDeals360d > 0 ? summary.totalDeals360d : null,
    }
  })
}

function getLiveMetricSortValue(
  sortBy: string,
  summary: BusinessDealMetricsSummary | undefined
): number | null {
  if (!summary) return null

  switch (sortBy) {
    case 'topSold':
      return summary.topSoldQuantity ?? null
    case 'topRevenue':
      return summary.topRevenueAmount ?? null
    case 'lastLaunch':
      return summary.lastLaunchDate ? new Date(summary.lastLaunchDate).getTime() : null
    case 'deals360d':
      return summary.totalDeals360d > 0 ? summary.totalDeals360d : null
    default:
      return null
  }
}

function compareNullableMetricValues(
  a: number | null,
  b: number | null,
  direction: 'asc' | 'desc'
): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (a === b) return 0
  return direction === 'asc' ? a - b : b - a
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
        } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
          // Editors and ERE don't have access to businesses
          return []
        } else {
          Object.assign(whereClause, NOT_ARCHIVED_CONDITION)
        }

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
            owner: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
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
 * 
 * NOTE: Sales users can VIEW all businesses but only EDIT assigned ones.
 * The response includes `editableBusinessIds` which is either:
 * - null: User can edit all businesses (admin/editor)
 * - string[]: Array of business IDs the user can edit
 */
export async function getBusinessesPaginated(options: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  opportunityFilter?: string // 'all' | 'with-open' | 'without-open'
  focusFilter?: string // 'all' | 'with-focus'
  activeDealFilter?: boolean // Filter to businesses with active deals
  ownerId?: string // Filter by owner (admin quick filter)
  myBusinessesOnly?: boolean // Filter to show only businesses assigned to current user (for sales users)
  advancedFilters?: string // JSON-serialized FilterRule[] for advanced field filtering
} = {}) {
  // Import here to avoid circular dependencies
  const { buildPrismaWhere, parseAdvancedFilters } = await import('@/lib/filters/buildPrismaWhere')
  
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { page = 0, pageSize = 50, sortBy = 'createdAt', sortDirection = 'desc', opportunityFilter, focusFilter, activeDealFilter, ownerId: ownerFilter, myBusinessesOnly, advancedFilters } = options

    // Build where clause based on role
    // Sales users can VIEW all businesses (no ownerId filter by default)
    // They can only EDIT assigned ones (handled by editableBusinessIds)
    const whereClause: BusinessWhereClause = {}
    if (role === 'sales') {
      // Sales can view all businesses, but filter out those pending reassignment
      whereClause.reassignmentStatus = null
      
      // "My Businesses Only" filter - defaults to TRUE for sales users
      // Only show all businesses if explicitly set to false
      const showMyBusinessesOnly = myBusinessesOnly !== false
      if (showMyBusinessesOnly) {
        whereClause.ownerId = userId
      }
    } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
      return { success: true, data: [], total: 0, page, pageSize, editableBusinessIds: [] as string[] }
    } else {
      Object.assign(whereClause, NOT_ARCHIVED_CONDITION)
    }
    
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
    
    // Apply advanced filters (field-based filtering from AdvancedFilterBuilder)
    if (advancedFilters) {
      const filterRules = parseAdvancedFilters(advancedFilters)
      if (filterRules.length > 0) {
        const advancedWhere = buildPrismaWhere(filterRules)
        if (Object.keys(advancedWhere).length > 0) {
          // Snapshot existing conditions into a new object to avoid circular refs,
          // then reset whereClause and combine with AND.
          const existingConditions = { ...whereClause }
          for (const key of Object.keys(whereClause)) {
            delete (whereClause as Record<string, unknown>)[key]
          }
          whereClause.AND = [existingConditions, advancedWhere]
        }
      }
    }

    let total = 0
    let businesses: BusinessListRecord[] = []
    let preloadedMetricsByVendorId: Map<string, BusinessDealMetricsSummary> | undefined

    if (LIVE_METRIC_SORT_COLUMNS.has(sortBy)) {
      // Sort by live metrics so table sort order matches expandable/detail metrics source.
      const sortableBusinesses = await prisma.business.findMany({
        where: whereClause,
        select: {
          id: true,
          osAdminVendorId: true,
          focusPeriod: true,
          createdAt: true,
        },
      })

      total = sortableBusinesses.length

      const vendorIds = [...new Set(
        sortableBusinesses
          .map(business => business.osAdminVendorId)
          .filter((vendorId): vendorId is string => !!vendorId)
      )]

      preloadedMetricsByVendorId = vendorIds.length > 0
        ? await getBusinessDealMetricsByVendorIds(vendorIds)
        : new Map<string, BusinessDealMetricsSummary>()

      const sortedBusinessIds = sortableBusinesses
        .sort((a, b) => {
          // Keep focused businesses first, matching existing behavior.
          const focusCompare = Number(Boolean(b.focusPeriod)) - Number(Boolean(a.focusPeriod))
          if (focusCompare !== 0) return focusCompare

          const summaryA = a.osAdminVendorId ? preloadedMetricsByVendorId?.get(a.osAdminVendorId) : undefined
          const summaryB = b.osAdminVendorId ? preloadedMetricsByVendorId?.get(b.osAdminVendorId) : undefined
          const valueA = getLiveMetricSortValue(sortBy, summaryA)
          const valueB = getLiveMetricSortValue(sortBy, summaryB)
          const metricCompare = compareNullableMetricValues(valueA, valueB, sortDirection)
          if (metricCompare !== 0) return metricCompare

          // Stable tiebreaker
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
        .map(business => business.id)

      const start = page * pageSize
      const pagedBusinessIds = sortedBusinessIds.slice(start, start + pageSize)

      if (pagedBusinessIds.length > 0) {
        const pageBusinesses = await prisma.business.findMany({
          where: { id: { in: pagedBusinessIds } },
          include: BUSINESS_LIST_INCLUDE,
        })
        const pageBusinessById = new Map(pageBusinesses.map(business => [business.id, business]))
        businesses = pagedBusinessIds
          .map(businessId => pageBusinessById.get(businessId))
          .filter((business): business is BusinessListRecord => !!business)
      }
    } else {
      // Get total count (with filters applied)
      total = await prisma.business.count({ where: whereClause })

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
      businesses = await prisma.business.findMany({
        where: whereClause,
        include: BUSINESS_LIST_INCLUDE,
        orderBy: orderByArray,
        skip: page * pageSize,
        take: pageSize,
      })
    }

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

    // Overlay live deal metrics for table columns: Top #, Top $, Lanz., #Deals
    const businessesWithLiveMetrics = await overlayLiveDealMetrics(
      businessesWithCustomFields,
      preloadedMetricsByVendorId
    )

    // Get editable business IDs for this user
    // null = can edit all (admin/editor), string[] = specific IDs user can edit
    const editableBusinessIds = await getEditableBusinessIds()

    return { 
      success: true, 
      data: businessesWithLiveMetrics, 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      editableBusinessIds,
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessesPaginated')
  }
}

/**
 * Get business IDs that the current user can edit
 * Returns null if user can edit all (admin/editor), or array of editable IDs
 * 
 * Used by UI to determine which businesses should show edit controls
 */
export async function fetchEditableBusinessIds(): Promise<{
  success: boolean
  data?: string[] | null
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const editableIds = await getEditableBusinessIds()
    return { success: true, data: editableIds }
  } catch (error) {
    return handleServerActionError(error, 'fetchEditableBusinessIds')
  }
}

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
            team: true,
          },
          orderBy: { name: 'asc' },
        })
      )
    } else {
      fetchPromises.push(Promise.resolve([]))
    }

    // Business-specific data (only if editing existing business)
    let businessName = ''
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
      businessName = business?.name?.toLowerCase() || ''

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

    let deals: Deal[] = []
    if (businessId) {
      const opportunityIds = (opportunities as Opportunity[]).map(o => o.id)
      const orConditions: Prisma.DealWhereInput[] = []
      if (opportunityIds.length > 0) {
        orConditions.push({
          bookingRequest: { opportunityId: { in: opportunityIds } },
        })
      }
      if (businessName) {
        orConditions.push({
          bookingRequest: { merchant: { mode: 'insensitive', equals: businessName } },
        })
      }

      if (orConditions.length > 0) {
        const dealResults = await prisma.deal.findMany({
          where: { OR: orConditions },
          include: {
            bookingRequest: {
              select: {
                id: true,
                dealId: true,
                name: true,
                businessEmail: true,
                startDate: true,
                endDate: true,
                status: true,
                parentCategory: true,
                subCategory1: true,
                subCategory2: true,
                processedAt: true,
                opportunityId: true,
                merchant: true,
                sourceType: true,
                redemptionContactName: true,
                redemptionContactEmail: true,
                redemptionContactPhone: true,
                legalName: true,
                rucDv: true,
                paymentType: true,
                businessReview: true,
                campaignDuration: true,
                redemptionMode: true,
                addressAndHours: true,
                bank: true,
                accountNumber: true,
                pricingOptions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })

        deals = Array.from(new Map(dealResults.map(d => [d.id, d])).values()).map(d => ({
          ...d,
          status: d.status as DealStatus,
          bookingRequest: {
            ...d.bookingRequest,
            pricingOptions: d.bookingRequest.pricingOptions as PricingOption[] | null,
          },
        }))
      }
    }

    return {
      success: true,
      data: {
        categories: categories as Category[],
        users: users as UserData[],
        opportunities: opportunities as Opportunity[],
        requests: requests as BookingRequest[],
        deals: deals as Deal[],
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
    // Get business to check permissions
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    if (business.reassignmentStatus === ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'No se puede modificar el foco de un negocio archivado' }
    }

    // Check permissions: must be admin or owner
    const admin = await isAdmin()
    const isOwner = business.ownerId === userId

    if (!admin && !isOwner) {
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
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
 * 
 * NOTE: Sales users can VIEW all businesses but only EDIT assigned ones.
 */
export async function searchBusinesses(query: string, options: {
  limit?: number
  ownerId?: string // Filter by owner (admin quick filter)
  activeDealFilter?: boolean // Filter to businesses with active deals
  myBusinessesOnly?: boolean // Filter to show only businesses owned by current user (for sales users)
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { limit = 100, ownerId: ownerFilter, activeDealFilter, myBusinessesOnly } = options

    if (!query || query.trim().length < 2) {
      return { success: true, data: [], editableBusinessIds: null as string[] | null }
    }

    const searchTerm = query.trim()

    // Build where clause based on role
    // Sales users can VIEW all businesses (no ownerId filter by default)
    const roleFilter: BusinessWhereClause = {}
    if (role === 'sales') {
      // Sales can view all businesses, but filter out those pending reassignment
      roleFilter.reassignmentStatus = null
      
      // "My Businesses Only" filter - defaults to TRUE for sales users
      // Only show all businesses if explicitly set to false
      const showMyBusinessesOnly = myBusinessesOnly !== false
      if (showMyBusinessesOnly) {
        roleFilter.ownerId = userId
      }
    } else if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
      return { success: true, data: [], editableBusinessIds: [] as string[] }
    } else {
      // Hide archived businesses from active search
      Object.assign(roleFilter, NOT_ARCHIVED_CONDITION)
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
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

    // Overlay live deal metrics for table columns: Top #, Top $, Lanz., #Deals
    const businessesWithLiveMetrics = await overlayLiveDealMetrics(businessesWithCustomFields)

    // Get editable business IDs for this user
    const editableBusinessIds = await getEditableBusinessIds()

    return { success: true, data: businessesWithLiveMetrics, editableBusinessIds }
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
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
    const admin = await isAdmin()
    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const provinceDistrictCorregimiento = formData.get('provinceDistrictCorregimiento') as string | null
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
    const ownerIdRaw = formData.get('ownerId') as string | null

    // Prevent duplicates by business name (case-insensitive)
    const existingBusiness = await prisma.business.findFirst({
      where: {
        AND: [
          {
            name: {
              equals: name,
              mode: 'insensitive',
            },
          },
          NOT_ARCHIVED_CONDITION,
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (existingBusiness) {
      return { 
        success: false, 
        error: 'Business already exists', 
        existingBusiness
      }
    }

    // Only 'name' is always required at server level (canSetRequired: false in form config)
    // Other field requirements are determined by admin in Settings → Entity Fields
    if (!name) {
      return { success: false, error: 'Campos requeridos faltantes: Business Name' }
    }

    // Owner/team are admin-editable only.
    // Non-admin creators always use their own profile (owner and team).
    let effectiveOwnerId = userId
    let effectiveSalesTeam = salesTeam || null
    if (admin) {
      if (ownerIdRaw && ownerIdRaw !== '__unassigned__') {
        effectiveOwnerId = ownerIdRaw
      }
    } else {
      const currentProfile = await prisma.userProfile.findUnique({
        where: { clerkId: userId },
        select: { team: true },
      })
      effectiveSalesTeam = currentProfile?.team || null
    }

    // Create business with sales reps
    // Owner is set to the current user by default
    const businessData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: effectiveSalesTeam,
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      provinceDistrictCorregimiento: provinceDistrictCorregimiento || null,
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
    }

    // Set owner if userId exists
    if (effectiveOwnerId) {
      businessData.owner = {
        connect: { clerkId: effectiveOwnerId }
      }
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Send to external vendor API (non-blocking, don't fail if API fails)
    // This creates the vendor in the external OfertaSimple system
    let vendorApiResult: { success: boolean; externalVendorId?: number; error?: string; logId?: string } | null = null
    try {
      // Convert Prisma result to Business type for the mapper
      // Use unknown intermediate cast as Prisma types have different shapes
      let businessForApi = business as unknown as Business
      
      // If contactEmail is empty, use the current user's email as fallback for vendor API
      // This ensures the vendor can be created even if contact email wasn't provided
      if (!businessForApi.contactEmail) {
        const user = await currentUser()
        const userEmail = user?.emailAddresses?.[0]?.emailAddress
        if (userEmail) {
          businessForApi = { ...businessForApi, contactEmail: userEmail }
          console.log(`[createBusiness] Using user email as fallback for vendor API: ${userEmail}`)
        }
      }
      
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
            owner: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
              },
            },
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
    // Check if user can edit this business
    // Sales users can VIEW all businesses but only EDIT assigned ones
    const editPermission = await canEditBusiness(businessId)
    if (!editPermission.canEdit) {
      return { 
        success: false, 
        error: 'No tienes permiso para editar este negocio. Solo puedes editar negocios que te han sido asignados.' 
      }
    }

    // Fetch current business data for comparison
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!currentBusiness) {
      return { success: false, error: 'Business not found' }
    }

    if (currentBusiness.reassignmentStatus === ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'No se puede editar un negocio archivado' }
    }

    const name = formData.get('name') as string
    const contactName = formData.get('contactName') as string
    const contactPhone = formData.get('contactPhone') as string
    const contactEmail = formData.get('contactEmail') as string
    const categoryId = formData.get('categoryId') as string | null
    const salesTeam = formData.get('salesTeam') as string | null
    const website = formData.get('website') as string | null
    const instagram = formData.get('instagram') as string | null
    const description = formData.get('description') as string | null
    const tier = formData.get('tier') ? parseInt(formData.get('tier') as string) : null
    const ruc = formData.get('ruc') as string | null
    const razonSocial = formData.get('razonSocial') as string | null
    const provinceDistrictCorregimiento = formData.get('provinceDistrictCorregimiento') as string | null
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

    // Only 'name' is always required at server level (canSetRequired: false in form config)
    // Other field requirements are determined by admin in Settings → Entity Fields
    if (!name) {
      return { success: false, error: 'Campos requeridos faltantes: Business Name' }
    }

    // Check if user is admin to allow owner editing
    const admin = await isAdmin()
    const ownerIdRaw = formData.get('ownerId') as string | null
    // Handle special '__unassigned__' value to clear owner
    const ownerId = admin && ownerIdRaw ? (ownerIdRaw === '__unassigned__' ? '__unassigned__' : ownerIdRaw) : undefined

    // Update business
    const updateData: Record<string, unknown> = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      salesTeam: admin ? (salesTeam || null) : (currentBusiness?.salesTeam || null),
      website: website || null,
      instagram: instagram || null,
      description: description || null,
      tier: tier || null,
      ruc: ruc || null,
      razonSocial: razonSocial || null,
      provinceDistrictCorregimiento: provinceDistrictCorregimiento || null,
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
      if (ownerId === '__unassigned__') {
        // Clear the owner - disconnect the relation
        updateData.owner = {
          disconnect: true
        }
      } else {
        // Connect to the specified owner
        updateData.owner = {
          connect: { clerkId: ownerId }
        }
      }
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
        owner: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        },
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
 * Archive a business (soft delete)
 */
export async function deleteBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can archive businesses
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get business details before archiving for logging and idempotency checks
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, reassignmentStatus: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    // Idempotent behavior if already archived
    if (business.reassignmentStatus !== ARCHIVED_BUSINESS_STATUS) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          reassignmentStatus: ARCHIVED_BUSINESS_STATUS,
          reassignmentType: null,
          reassignmentRequestedBy: authResult.userId,
          reassignmentRequestedAt: new Date(),
          reassignmentReason: 'archived',
          reassignmentPreviousOwner: null,
        },
      })
    }

    // Log activity
    await logActivity({
      action: 'STATUS_CHANGE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business?.name || undefined,
      details: {
        statusChange: { from: business.reassignmentStatus || 'active', to: ARCHIVED_BUSINESS_STATUS },
      },
    })

    invalidateEntity('businesses')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteBusiness')
  }
}

/**
 * Get archived businesses (admin only)
 */
export async function getArchivedBusinesses(options: {
  page?: number
  pageSize?: number
  query?: string
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const { page = 0, pageSize = 50, query = '' } = options
    const searchTerm = query.trim()

    let whereClause: Prisma.BusinessWhereInput = {
      reassignmentStatus: ARCHIVED_BUSINESS_STATUS,
    }

    if (searchTerm.length >= 2) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { contactName: { contains: searchTerm, mode: 'insensitive' } },
              { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
              { salesTeam: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      }
    }

    const [total, archivedBusinesses] = await Promise.all([
      prisma.business.count({ where: whereClause }),
      prisma.business.findMany({
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
          owner: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { reassignmentRequestedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip: page * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: archivedBusinesses as unknown as Business[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getArchivedBusinesses')
  }
}

/**
 * Unarchive a business (admin only)
 */
export async function unarchiveBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, reassignmentStatus: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    if (business.reassignmentStatus !== ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'El negocio no está archivado' }
    }

    await prisma.business.update({
      where: { id: businessId },
      data: {
        reassignmentStatus: null,
        reassignmentType: null,
        reassignmentRequestedBy: null,
        reassignmentRequestedAt: null,
        reassignmentReason: null,
        reassignmentPreviousOwner: null,
      },
    })

    await logActivity({
      action: 'STATUS_CHANGE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name || undefined,
      details: {
        statusChange: { from: ARCHIVED_BUSINESS_STATUS, to: 'active' },
      },
    })

    invalidateEntity('businesses')
    invalidateEntity('assignments')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'unarchiveBusiness')
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
    // Use Panama timezone for date comparison
    const todayStr = getTodayInPanama()
    const today = parseDateInPanamaTime(todayStr)

    // Get all businesses with basic info
    const businesses = await prisma.business.findMany({
      where: NOT_ARCHIVED_CONDITION,
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
        provinceDistrictCorregimiento: true,
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

    // Get all future booked events (by business name matching business name)
    // Use raw query against the physical DB column ("merchant") for compatibility
    // with schema transitions where Prisma client generation may lag behind.
    const futureBookedEvents = await prisma.$queryRaw<Array<{ business: string | null }>>`
      SELECT "merchant" AS "business"
      FROM "Event"
      WHERE "status" = 'booked'
        AND "endDate" >= ${today}
    `
    const bookedMerchants = new Set(
      futureBookedEvents
        .map(e => e.business?.toLowerCase())
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

// Note: Bulk import (BulkBusinessRow, BulkUpsertResult, bulkUpsertBusinesses) 
// has been moved to app/actions/business-bulk.ts
// Import from there: import { bulkUpsertBusinesses, type BulkBusinessRow, type BulkUpsertResult } from '@/app/actions/business-bulk'

/**
 * Preview changes that would be synced to external vendor API
 * Returns the list of field changes without actually sending them
 */
export async function previewVendorSync(
  businessId: string,
  newValues: Record<string, string | null | undefined>
): Promise<{
  success: boolean
  data?: {
    changes: VendorFieldChange[]
    vendorId: string
  }
  error?: string
}> {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: 'No autorizado' }
    }
    const { userId } = authResult

    // Get current business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { category: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Require admin OR business owner
    const adminCheck = await isAdmin()
    const isOwner = business.ownerId === userId

    if (!adminCheck && !isOwner) {
      return { success: false, error: 'Solo administradores o propietarios del negocio pueden sincronizar con OfertaSimple' }
    }

    if (!business.osAdminVendorId) {
      return { success: false, error: 'Este negocio no tiene un Vendor ID de OfertaSimple' }
    }

    // Get changed fields
    const { changes } = getChangedVendorFields(business as unknown as Business, newValues)

    return {
      success: true,
      data: {
        changes,
        vendorId: business.osAdminVendorId,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'previewVendorSync')
  }
}

/**
 * Sync business changes to external vendor API
 * 
 * This function:
 * 1. Validates admin permissions
 * 2. Saves business locally first (auto-save)
 * 3. Calculates changed fields
 * 4. Sends PATCH to external API with only changed fields
 * 
 * @param businessId - Business ID to sync
 * @param formData - Form data with new values (used for local save)
 * @returns Result with sync status and updated business
 */
export async function syncVendorToExternal(
  businessId: string,
  formData: FormData
): Promise<{
  success: boolean
  data?: {
    business: Business
    syncResult: UpdateVendorResult
    fieldsUpdated: number
  }
  error?: string
}> {
  try {
    const authResult = await requireAuth()
    if (!('userId' in authResult)) {
      return { success: false, error: 'No autorizado' }
    }
    const { userId } = authResult

    // Get current business before update
    const currentBusiness = await prisma.business.findUnique({
      where: { id: businessId },
      include: { category: true },
    })

    if (!currentBusiness) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Require admin OR business owner
    const adminCheck = await isAdmin()
    const isOwner = currentBusiness.ownerId === userId

    if (!adminCheck && !isOwner) {
      return { success: false, error: 'Solo administradores o propietarios del negocio pueden sincronizar con OfertaSimple' }
    }

    if (!currentBusiness.osAdminVendorId) {
      return { success: false, error: 'Este negocio no tiene un Vendor ID de OfertaSimple' }
    }

    // Extract form values into a record
    const newValues: Record<string, string | null> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        newValues[key] = value || null
      }
    }

    // Get changed fields for API (before saving locally)
    const { changes, apiPayload } = getChangedVendorFields(
      currentBusiness as unknown as Business, 
      newValues
    )

    // If no changes, return early
    if (changes.length === 0) {
      return { 
        success: false, 
        error: 'No hay cambios para sincronizar' 
      }
    }

    // Step 1: Save locally first (auto-save)
    const updateResult = await updateBusiness(businessId, formData)
    if (!updateResult.success || !updateResult.data) {
      return { 
        success: false, 
        error: `Error al guardar localmente: ${updateResult.error || 'Error desconocido'}` 
      }
    }

    // Step 2: Send PATCH to external API
    const syncResult = await updateVendorInExternalApi(
      currentBusiness.osAdminVendorId,
      apiPayload,
      {
        userId,
        triggeredBy: 'manual',
      }
    )

    // Log activity
    await logActivity({
      action: 'SEND',
      entityType: 'Business',
      entityId: businessId,
      details: {
        newValues: {
          vendorId: currentBusiness.osAdminVendorId,
          fieldsUpdated: changes.length,
          syncSuccess: syncResult.success,
          syncError: syncResult.error,
        },
      },
    })

    if (!syncResult.success) {
      return {
        success: false,
        error: `Guardado local exitoso, pero error al sincronizar: ${syncResult.error}`,
      }
    }

    return {
      success: true,
      data: {
        business: updateResult.data,
        syncResult,
        fieldsUpdated: changes.length,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'syncVendorToExternal')
  }
}
