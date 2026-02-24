'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { getEditableBusinessIds } from '@/lib/auth/entity-access'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { getBusinessDealMetricsByVendorIds, type BusinessDealMetricsSummary } from '@/app/actions/deal-metrics'

import {
  BUSINESS_LIST_INCLUDE,
  LIVE_METRIC_SORT_COLUMNS,
  NOT_ARCHIVED_CONDITION,
  SORT_COLUMN_MAP,
  type BusinessListRecord,
  type BusinessWhereClause,
} from './_shared/constants'
import {
  compareNullableMetricValues,
  getLiveMetricSortValue,
  overlayLiveDealMetrics,
} from './_shared/metrics'

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
    const businessesWithCustomFields = businesses.map((biz) => ({
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
    const businessesWithCustomFields = businesses.map((biz) => ({
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
