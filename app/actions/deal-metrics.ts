'use server'

/**
 * Deal Metrics Server Actions
 * 
 * Syncs deal metrics from external Oferta API to local database
 */

import { prisma } from '@/lib/prisma'
import { fetchDealMetrics, fetchAllDealMetrics } from '@/lib/api/external-oferta/deal/metrics'
import type { DealMetric } from '@/lib/api/external-oferta/deal/types'
import type { Prisma } from '@prisma/client'

export interface SyncMetricsResult {
  success: boolean
  message: string
  stats?: {
    fetched: number
    created: number
    updated: number
    snapshots: number
    skipped?: number
    businessesUpdated?: number
    autoAddedToAssignments?: number
  }
  error?: string
  logId?: string
}

/**
 * Sync deal metrics from external API to database
 * - Upserts DealMetrics records
 * - Creates DealMetricsSnapshot for history tracking
 */
export async function syncDealMetrics(options: {
  sinceDays?: number
  userId?: string
  fetchAll?: boolean // If true, fetches all pages
}): Promise<SyncMetricsResult> {
  const { sinceDays = 30, userId, fetchAll = false } = options

  // Calculate since date
  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - sinceDays)

  try {
    // Fetch metrics from external API
    const result = fetchAll
      ? await fetchAllDealMetrics({
          since: sinceDate,
          userId,
          triggeredBy: 'manual',
        })
      : await fetchDealMetrics({
          since: sinceDate,
          limit: 100,
          userId,
          triggeredBy: 'manual',
        })

    if (!result.success || !result.data) {
      return {
        success: false,
        message: 'Failed to fetch metrics from external API',
        error: result.error,
        logId: result.logId,
      }
    }

    const deals = result.data.deals
    if (!deals || deals.length === 0) {
      return {
        success: true,
        message: 'No deals to sync',
        stats: { fetched: 0, created: 0, updated: 0, snapshots: 0 },
        logId: result.logId,
      }
    }

    // Process each deal metric
    let created = 0
    let updated = 0
    let snapshots = 0
    let skipped = 0

    for (const deal of deals) {
      const upsertResult = await upsertDealMetric(deal)
      if (upsertResult.skipped) skipped++
      if (upsertResult.created) created++
      if (upsertResult.updated) updated++
      if (upsertResult.snapshotCreated) snapshots++
    }

    const processed = created + updated

    // Update Business metrics for all affected vendors
    const vendorIds = [...new Set(deals.map(d => d.vendor_id).filter(Boolean))]
    const metricsResult = await updateBusinessMetricsForVendors(vendorIds)
    const businessesUpdated = metricsResult.updated
    const autoAddedToAssignments = metricsResult.autoAdded

    return {
      success: true,
      message: `Synced ${processed} deals: ${created} created, ${updated} updated, ${snapshots} snapshots, ${businessesUpdated} businesses updated${autoAddedToAssignments > 0 ? `, ${autoAddedToAssignments} auto-added to assignments` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      stats: {
        fetched: deals.length,
        created,
        updated,
        snapshots,
        skipped,
        businessesUpdated,
        autoAddedToAssignments,
      },
      logId: result.logId,
    }
  } catch (error) {
    console.error('syncDealMetrics error:', error)
    return {
      success: false,
      message: 'Internal error during sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upsert a single deal metric and create snapshot if values changed
 */
async function upsertDealMetric(deal: DealMetric): Promise<{
  created: boolean
  updated: boolean
  snapshotCreated: boolean
  skipped: boolean
}> {
  // Validate and convert deal_id (API returns number, we store as string)
  const rawDealId = deal.deal_id
  
  if (!rawDealId && rawDealId !== 0) {
    return { created: false, updated: false, snapshotCreated: false, skipped: true }
  }
  
  // Convert to string (API may return number or string)
  const externalDealId = String(rawDealId)
  
  try {
    // Find the business linked to this vendor
    let businessId: string | null = null
    if (deal.vendor_id) {
      const business = await prisma.business.findFirst({
        where: { osAdminVendorId: deal.vendor_id },
        select: { id: true },
      })
      businessId = business?.id || null
    }

    // Check if record exists
    const existing = await prisma.dealMetrics.findUnique({
      where: { externalDealId },
    })

    const now = new Date()
    const data = {
      externalVendorId: deal.vendor_id,
      businessId, // Link to Business
      dealName: deal.deal_name || null, // Deal name from external API
      quantitySold: deal.quantity_sold ?? 0,
      netRevenue: deal.net_revenue ?? 0,
      margin: deal.margin ?? 0,
      dealUrl: deal.url || null,
      runAt: deal.run_at ? new Date(deal.run_at) : null,
      endAt: deal.end_at ? new Date(deal.end_at) : null,
      externalUpdatedAt: deal.updated_at ? new Date(deal.updated_at) : null,
      lastSyncedAt: now,
    }

    if (!existing) {
      // Create new record
      const created = await prisma.dealMetrics.create({
        data: {
          externalDealId,
          ...data,
        },
      })

      // Create initial snapshot
      await prisma.dealMetricsSnapshot.create({
        data: {
          dealMetricsId: created.id,
          quantitySold: deal.quantity_sold ?? 0,
          netRevenue: deal.net_revenue ?? 0,
          margin: deal.margin ?? 0,
        },
      })

      return { created: true, updated: false, snapshotCreated: true, skipped: false }
    }

    // Check if values changed (worth creating a snapshot)
    const valuesChanged =
      existing.quantitySold !== (deal.quantity_sold ?? 0) ||
      Number(existing.netRevenue) !== (deal.net_revenue ?? 0) ||
      Number(existing.margin) !== (deal.margin ?? 0)

    // Update existing record
    await prisma.dealMetrics.update({
      where: { externalDealId },
      data,
    })

    // Create snapshot only if values changed
    if (valuesChanged) {
      await prisma.dealMetricsSnapshot.create({
        data: {
          dealMetricsId: existing.id,
          quantitySold: deal.quantity_sold ?? 0,
          netRevenue: deal.net_revenue ?? 0,
          margin: deal.margin ?? 0,
        },
      })
    }

    return { created: false, updated: true, snapshotCreated: valuesChanged, skipped: false }
  } catch (error) {
    console.error(`Error upserting deal ${deal.deal_id}:`, error)
    return { created: false, updated: false, snapshotCreated: false, skipped: true }
  }
}

/**
 * Update Business metrics aggregates for given vendor IDs
 * Called after syncing deal metrics to update the denormalized columns
 * Also auto-adds recurring businesses (>2 deals in 360 days) to assignments
 */
async function updateBusinessMetricsForVendors(vendorIds: string[]): Promise<{ updated: number; autoAdded: number }> {
  if (vendorIds.length === 0) return { updated: 0, autoAdded: 0 }

  // Import the auto-add function
  const { autoAddRecurringBusiness } = await import('./assignments')

  const date360DaysAgo = new Date()
  date360DaysAgo.setDate(date360DaysAgo.getDate() - 360)
  const now = new Date()

  let updated = 0
  let autoAdded = 0

  for (const vendorId of vendorIds) {
    try {
      // Find the business for this vendor (include more fields for auto-add check)
      const business = await prisma.business.findFirst({
        where: { osAdminVendorId: vendorId },
        select: { id: true, name: true, ownerId: true, salesTeam: true },
      })

      if (!business) continue

      // Get all deal metrics for this vendor
      const deals = await prisma.dealMetrics.findMany({
        where: { externalVendorId: vendorId },
        select: {
          quantitySold: true,
          netRevenue: true,
          dealUrl: true,
          runAt: true,
        },
      })

      if (deals.length === 0) continue

      // Calculate aggregates
      let topSoldQuantity = 0
      let topSoldDealUrl: string | null = null
      let topRevenueAmount = 0
      let topRevenueDealUrl: string | null = null
      let lastLaunchDate: Date | null = null
      let totalDeals360d = 0

      for (const deal of deals) {
        // Top sold
        if (deal.quantitySold > topSoldQuantity) {
          topSoldQuantity = deal.quantitySold
          topSoldDealUrl = deal.dealUrl
        }

        // Top revenue
        const revenue = Number(deal.netRevenue)
        if (revenue > topRevenueAmount) {
          topRevenueAmount = revenue
          topRevenueDealUrl = deal.dealUrl
        }

        // Last launch
        if (deal.runAt && (!lastLaunchDate || deal.runAt > lastLaunchDate)) {
          lastLaunchDate = deal.runAt
        }

        // Count deals in last 360 days
        if (deal.runAt && deal.runAt >= date360DaysAgo) {
          totalDeals360d++
        }
      }

      // Update the business
      await prisma.business.update({
        where: { id: business.id },
        data: {
          topSoldQuantity: topSoldQuantity > 0 ? topSoldQuantity : null,
          topSoldDealUrl,
          topRevenueAmount: topRevenueAmount > 0 ? topRevenueAmount : null,
          topRevenueDealUrl,
          lastLaunchDate,
          totalDeals360d: totalDeals360d > 0 ? totalDeals360d : null,
          metricsLastSyncedAt: now,
        },
      })

      updated++

      // Auto-add to assignments if recurring (>2 deals in 360 days)
      // Only for businesses with salesTeam = 'Outside Sales' or null/blank
      if (totalDeals360d > 2) {
        const salesTeam = business.salesTeam
        if (!salesTeam || salesTeam === 'Outside Sales') {
          const result = await autoAddRecurringBusiness(
            business.id,
            business.name,
            business.ownerId
          )
          if (result.added) {
            autoAdded++
            console.log(`[deal-metrics] Auto-added recurring business: ${business.name} (${totalDeals360d} deals in 360d)`)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to update business metrics for vendor ${vendorId}:`, error)
    }
  }

  return { updated, autoAdded }
}

/**
 * Get deal metrics summary
 */
export async function getDealMetricsSummary() {
  const [totalDeals, totalSnapshots, latestSync] = await Promise.all([
    prisma.dealMetrics.count(),
    prisma.dealMetricsSnapshot.count(),
    prisma.dealMetrics.findFirst({
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    }),
  ])

  return {
    totalDeals,
    totalSnapshots,
    lastSyncedAt: latestSync?.lastSyncedAt || null,
  }
}

/**
 * Get recent deal metrics
 */
export async function getRecentDealMetrics(limit = 20) {
  return prisma.dealMetrics.findMany({
    orderBy: { lastSyncedAt: 'desc' },
    take: limit,
    include: {
      _count: {
        select: { snapshots: true },
      },
    },
  })
}

/**
 * Get deal metrics by vendor ID (for business detail page)
 */
export async function getDealMetricsByVendorId(vendorId: string) {
  if (!vendorId) {
    return { deals: [], summary: null }
  }

  const deals = await prisma.dealMetrics.findMany({
    where: { externalVendorId: vendorId },
    orderBy: { runAt: 'desc' },
    include: {
      snapshots: {
        orderBy: { snapshotAt: 'asc' },
        take: 30, // Last 30 snapshots per deal
      },
    },
  })

  if (deals.length === 0) {
    return { deals: [], summary: null }
  }

  // Calculate summary
  const summary = {
    totalDeals: deals.length,
    totalQuantitySold: deals.reduce((sum, d) => sum + d.quantitySold, 0),
    totalRevenue: deals.reduce((sum, d) => sum + Number(d.netRevenue), 0),
    totalMargin: deals.reduce((sum, d) => sum + Number(d.margin), 0),
    activeDeals: deals.filter(d => d.endAt && new Date(d.endAt) > new Date()).length,
  }

  // Format deals for frontend
  const formattedDeals = deals.map(deal => ({
    id: deal.id,
    externalDealId: deal.externalDealId,
    dealName: deal.dealName,
    quantitySold: deal.quantitySold,
    netRevenue: Number(deal.netRevenue),
    margin: Number(deal.margin),
    dealUrl: deal.dealUrl,
    runAt: deal.runAt,
    endAt: deal.endAt,
    lastSyncedAt: deal.lastSyncedAt,
    snapshots: deal.snapshots.map(s => ({
      date: s.snapshotAt,
      quantitySold: s.quantitySold,
      netRevenue: Number(s.netRevenue),
      margin: Number(s.margin),
    })),
  }))

  return { deals: formattedDeals, summary }
}

// Type for formatted deal metric
export interface FormattedDealMetric {
  id: string
  externalDealId: string
  dealName: string | null
  externalVendorId: string | null
  businessId: string | null
  businessName: string | null
  quantitySold: number
  netRevenue: number
  margin: number
  dealUrl: string | null
  runAt: Date | null
  endAt: Date | null
  lastSyncedAt: Date
  snapshotCount: number
}

// Type for summary
export interface DealMetricsSummary {
  totalDeals: number
  totalQuantitySold: number
  totalRevenue: number
  totalMargin: number
  activeDeals: number
}

// ============================================
// Helper Functions (DRY)
// ============================================

type DealWithCount = {
  id: string
  externalDealId: string
  dealName: string | null
  externalVendorId: string | null
  quantitySold: number
  netRevenue: { toString(): string } | number
  margin: { toString(): string } | number
  dealUrl: string | null
  runAt: Date | null
  endAt: Date | null
  lastSyncedAt: Date
  _count: { snapshots: number }
}

/**
 * Lookup business info by vendor IDs
 * Returns a Map of vendorId -> { id, name }
 */
async function lookupBusinessInfoByVendorIds(
  vendorIds: string[]
): Promise<Map<string, { id: string; name: string }>> {
  if (vendorIds.length === 0) return new Map()
  
  const businesses = await prisma.business.findMany({
    where: { osAdminVendorId: { in: vendorIds } },
    select: { id: true, osAdminVendorId: true, name: true },
  })
  
  return new Map(businesses.map(b => [b.osAdminVendorId!, { id: b.id, name: b.name }]))
}

/**
 * Format a deal metric with business info lookup
 */
function formatDealMetric(
  deal: DealWithCount,
  vendorToBusinessInfo: Map<string, { id: string; name: string }>
): FormattedDealMetric {
  const businessInfo = deal.externalVendorId 
    ? vendorToBusinessInfo.get(deal.externalVendorId) 
    : null
  
  return {
    id: deal.id,
    externalDealId: deal.externalDealId,
    dealName: deal.dealName,
    externalVendorId: deal.externalVendorId,
    businessId: businessInfo?.id || null,
    businessName: businessInfo?.name || null,
    quantitySold: deal.quantitySold,
    netRevenue: Number(deal.netRevenue),
    margin: Number(deal.margin),
    dealUrl: deal.dealUrl,
    runAt: deal.runAt,
    endAt: deal.endAt,
    lastSyncedAt: deal.lastSyncedAt,
    snapshotCount: deal._count.snapshots,
  }
}

/**
 * Get deal metrics paginated (for main metrics page)
 * Matches usePaginatedSearch expected signature
 */
export async function getDealMetricsPaginated(
  options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  } & Record<string, string | number | boolean | undefined> = {}
): Promise<{ success: boolean; data?: FormattedDealMetric[]; total?: number; summary?: DealMetricsSummary; error?: string }> {
  try {
  const {
    page = 0,
    pageSize = 50,
    sortBy = 'netRevenue',
    sortDirection = 'desc',
  } = options
  const statusFilter = (options.statusFilter as 'all' | 'active' | 'ended') || 'all'
  const vendorId = options.vendorId as string | undefined
  const search = options.search as string | undefined

  // Build where clause
  const whereClause: Prisma.DealMetricsWhereInput = {}

  if (vendorId) {
    whereClause.externalVendorId = vendorId
  }

  if (search) {
    whereClause.OR = [
      { externalDealId: { contains: search, mode: 'insensitive' } },
      { externalVendorId: { contains: search, mode: 'insensitive' } },
      { dealUrl: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Active = runAt <= now AND endAt >= today
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Start of today
  
  if (statusFilter === 'active') {
    // Active: has started (runAt <= now) AND hasn't ended (endAt >= today)
    const activeConditions: Prisma.DealMetricsWhereInput[] = [
      { runAt: { lte: now } },
      { endAt: { gte: today } },
    ]
    if (search && whereClause.OR) {
      const searchOR = whereClause.OR
      delete whereClause.OR
      whereClause.AND = [{ OR: searchOR }, ...activeConditions]
    } else {
      whereClause.AND = activeConditions
    }
  } else if (statusFilter === 'ended') {
    // Ended: NOT active (hasn't started OR has ended)
    const endedConditions: Prisma.DealMetricsWhereInput = {
      OR: [
        { runAt: { gt: now } },  // Hasn't started yet
        { runAt: null },         // No start date
        { endAt: { lt: today } }, // Has ended
        { endAt: null },         // No end date
      ],
    }
    if (search && whereClause.OR) {
      const searchOR = whereClause.OR
      delete whereClause.OR
      whereClause.AND = [{ OR: searchOR }, endedConditions]
    } else {
      whereClause.AND = [endedConditions]
    }
  }

  // Build orderBy
  let orderBy: Prisma.DealMetricsOrderByWithRelationInput = { netRevenue: 'desc' }
  if (sortBy) {
    switch (sortBy) {
      case 'externalDealId':
        orderBy = { externalDealId: sortDirection }
        break
      case 'externalVendorId':
        orderBy = { externalVendorId: sortDirection }
        break
      case 'quantitySold':
        orderBy = { quantitySold: sortDirection }
        break
      case 'netRevenue':
        orderBy = { netRevenue: sortDirection }
        break
      case 'margin':
        orderBy = { margin: sortDirection }
        break
      case 'runAt':
        orderBy = { runAt: sortDirection }
        break
      case 'endAt':
        orderBy = { endAt: sortDirection }
        break
      case 'lastSyncedAt':
        orderBy = { lastSyncedAt: sortDirection }
        break
    }
  }

  // Fetch data
  const [deals, total, aggregates] = await Promise.all([
    prisma.dealMetrics.findMany({
      where: whereClause,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { snapshots: true },
        },
      },
    }),
    prisma.dealMetrics.count({ where: whereClause }),
    prisma.dealMetrics.aggregate({
      where: whereClause,
      _sum: {
        quantitySold: true,
        netRevenue: true,
        margin: true,
      },
      _count: true,
    }),
  ])

  // Count active deals (runAt <= now AND endAt >= today)
  const activeDealsCount = await prisma.dealMetrics.count({
    where: {
      ...whereClause,
      AND: [
        { runAt: { lte: now } },
        { endAt: { gte: today } },
      ],
    },
  })

  // Get unique vendor IDs and look up business info
  const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
  const vendorToBusinessInfo = await lookupBusinessInfoByVendorIds(vendorIds)

  // Format deals using helper
  const formattedDeals = deals.map(deal => formatDealMetric(deal, vendorToBusinessInfo))

  // Calculate summary from aggregates
  const summary: DealMetricsSummary = {
    totalDeals: aggregates._count,
    totalQuantitySold: aggregates._sum.quantitySold ?? 0,
    totalRevenue: Number(aggregates._sum.netRevenue ?? 0),
    totalMargin: Number(aggregates._sum.margin ?? 0),
    activeDeals: activeDealsCount,
  }

  return { success: true, data: formattedDeals, total, summary }
  } catch (error) {
    console.error('getDealMetricsPaginated error:', error)
    return { success: false, error: 'Error fetching deal metrics' }
  }
}

/**
 * Get deal metrics counts for filter tabs (matches usePaginatedSearch expected signature)
 */
export async function getDealMetricsCounts(
  filters?: Record<string, string | number | boolean | undefined>
): Promise<{ success: boolean; data?: Record<string, number>; error?: string }> {
  try {
    const vendorId = filters?.vendorId as string | undefined
    const search = filters?.search as string | undefined

    const baseWhere: Prisma.DealMetricsWhereInput = {}
    if (vendorId) {
      baseWhere.externalVendorId = vendorId
    }
    if (search) {
      baseWhere.OR = [
        { externalDealId: { contains: search, mode: 'insensitive' } },
        { externalVendorId: { contains: search, mode: 'insensitive' } },
        { dealUrl: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Active = runAt <= now AND endAt >= today
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const [all, active, ended] = await Promise.all([
      prisma.dealMetrics.count({ where: baseWhere }),
      prisma.dealMetrics.count({
        where: { 
          ...baseWhere, 
          AND: [
            { runAt: { lte: now } },
            { endAt: { gte: today } },
          ],
        },
      }),
      prisma.dealMetrics.count({
        where: {
          ...baseWhere,
          OR: [
            { runAt: { gt: now } },   // Hasn't started
            { runAt: null },          // No start date
            { endAt: { lt: today } }, // Has ended
            { endAt: null },          // No end date
          ],
        },
      }),
    ])

    return { success: true, data: { all, active, ended } }
  } catch (error) {
    console.error('getDealMetricsCounts error:', error)
    return { success: false, error: 'Error fetching counts' }
  }
}

/**
 * Search deal metrics (matches usePaginatedSearch expected signature)
 */
export async function searchDealMetrics(
  query: string,
  options?: { limit?: number } & Record<string, string | number | boolean | undefined>
): Promise<{ success: boolean; data?: FormattedDealMetric[]; error?: string }> {
  try {
    const statusFilter = (options?.statusFilter as 'all' | 'active' | 'ended') || 'all'
    const vendorId = options?.vendorId as string | undefined
    const limit = options?.limit ?? 100

    const searchOR: Prisma.DealMetricsWhereInput[] = [
      { externalDealId: { contains: query, mode: 'insensitive' } },
      { externalVendorId: { contains: query, mode: 'insensitive' } },
      { dealUrl: { contains: query, mode: 'insensitive' } },
    ]
    
    const whereClause: Prisma.DealMetricsWhereInput = {
      OR: searchOR,
    }

    if (vendorId) {
      whereClause.externalVendorId = vendorId
    }

    // Active = runAt <= now AND endAt >= today
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (statusFilter === 'active') {
      whereClause.AND = [
        { OR: searchOR },
        { runAt: { lte: now } },
        { endAt: { gte: today } },
      ]
      delete whereClause.OR
    } else if (statusFilter === 'ended') {
      whereClause.AND = [
        { OR: searchOR },
        { OR: [
          { runAt: { gt: now } },
          { runAt: null },
          { endAt: { lt: today } },
          { endAt: null },
        ]},
      ]
      delete whereClause.OR
    }

    const deals = await prisma.dealMetrics.findMany({
      where: whereClause,
      orderBy: { netRevenue: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { snapshots: true },
        },
      },
    })

    // Get unique vendor IDs and look up business info
    const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
    const vendorToBusinessInfo = await lookupBusinessInfoByVendorIds(vendorIds)

    // Format deals using helper
    const data = deals.map(deal => formatDealMetric(deal, vendorToBusinessInfo))

    return { success: true, data }
  } catch (error) {
    console.error('searchDealMetrics error:', error)
    return { success: false, error: 'Error searching deal metrics' }
  }
}

/**
 * Get unique vendor IDs for filter dropdown (with business names)
 */
export async function getUniqueVendorIds(): Promise<{ id: string; dealCount: number; businessName: string | null }[]> {
  const vendors = await prisma.dealMetrics.groupBy({
    by: ['externalVendorId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  const vendorIds = vendors.map(v => v.externalVendorId).filter(Boolean) as string[]
  const businesses = vendorIds.length > 0
    ? await prisma.business.findMany({
        where: { osAdminVendorId: { in: vendorIds } },
        select: { osAdminVendorId: true, name: true },
      })
    : []
  const vendorToBusinessName = new Map(businesses.map(b => [b.osAdminVendorId, b.name]))

  return vendors
    .filter(v => v.externalVendorId)
    .map(v => ({
      id: v.externalVendorId!,
      dealCount: v._count.id,
      businessName: vendorToBusinessName.get(v.externalVendorId!) || null,
    }))
}


// Type for simplified deal in expandable row
export interface SimplifiedDeal {
  id: string
  externalDealId: string
  quantitySold: number
  netRevenue: number
  runAt: Date | null
  endAt: Date | null
  dealUrl: string | null
  isActive: boolean
}

/**
 * Get deals by vendor ID for expandable row (limited to top N deals)
 * Returns simplified deal data sorted by revenue
 */
export async function getDealsByVendorId(
  vendorId: string,
  limit: number = 10
): Promise<{ success: boolean; data?: SimplifiedDeal[]; totalCount?: number; error?: string }> {
  try {
    if (!vendorId) {
      return { success: false, error: 'Vendor ID is required' }
    }

    // Get total count first
    const totalCount = await prisma.dealMetrics.count({
      where: { externalVendorId: vendorId },
    })

    // Fetch deals sorted by net revenue (top performers first)
    const deals = await prisma.dealMetrics.findMany({
      where: { externalVendorId: vendorId },
      orderBy: { netRevenue: 'desc' },
      take: limit,
    })

    const now = new Date()
    const data: SimplifiedDeal[] = deals.map(deal => ({
      id: deal.id,
      externalDealId: deal.externalDealId,
      quantitySold: deal.quantitySold,
      netRevenue: Number(deal.netRevenue),
      runAt: deal.runAt,
      endAt: deal.endAt,
      dealUrl: deal.dealUrl,
      isActive: deal.endAt ? deal.endAt > now : false,
    }))

    return { success: true, data, totalCount }
  } catch (error) {
    console.error('getDealsByVendorId error:', error)
    return { success: false, error: 'Error fetching deals' }
  }
}

// Type for business deal metrics summary (for table display)
export interface BusinessDealMetricsSummary {
  vendorId: string
  topSoldQuantity: number | null
  topSoldDealUrl: string | null
  topRevenueAmount: number | null
  topRevenueDealUrl: string | null
  lastLaunchDate: Date | null
  totalDeals360d: number
}

/**
 * Get deal metrics summary for multiple vendor IDs (for business table)
 * Returns aggregated metrics per vendor for display in the businesses table
 */
export async function getBusinessDealMetricsByVendorIds(
  vendorIds: string[]
): Promise<Map<string, BusinessDealMetricsSummary>> {
  const result = new Map<string, BusinessDealMetricsSummary>()
  
  if (vendorIds.length === 0) return result

  try {
    const date360DaysAgo = new Date()
    date360DaysAgo.setDate(date360DaysAgo.getDate() - 360)

    // Fetch all deals for the given vendor IDs
    const deals = await prisma.dealMetrics.findMany({
      where: {
        externalVendorId: { in: vendorIds },
      },
      select: {
        externalVendorId: true,
        quantitySold: true,
        netRevenue: true,
        dealUrl: true,
        runAt: true,
      },
    })

    // Group deals by vendor and calculate metrics
    const vendorDealsMap = new Map<string, typeof deals>()
    for (const deal of deals) {
      if (!deal.externalVendorId) continue
      const existing = vendorDealsMap.get(deal.externalVendorId) || []
      existing.push(deal)
      vendorDealsMap.set(deal.externalVendorId, existing)
    }

    // Calculate summary for each vendor
    for (const [vendorId, vendorDeals] of vendorDealsMap) {
      // Find top deal by quantity sold
      const topSoldDeal = vendorDeals.reduce((top, deal) => {
        if (!top || deal.quantitySold > top.quantitySold) return deal
        return top
      }, null as typeof deals[0] | null)

      // Find top deal by net revenue
      const topRevenueDeal = vendorDeals.reduce((top, deal) => {
        if (!top || Number(deal.netRevenue) > Number(top.netRevenue)) return deal
        return top
      }, null as typeof deals[0] | null)

      // Find most recent launch date
      const lastLaunchDate = vendorDeals.reduce((latest, deal) => {
        if (!deal.runAt) return latest
        if (!latest || deal.runAt > latest) return deal.runAt
        return latest
      }, null as Date | null)

      // Count deals in last 360 days
      const totalDeals360d = vendorDeals.filter(d => d.runAt && d.runAt >= date360DaysAgo).length

      result.set(vendorId, {
        vendorId,
        topSoldQuantity: topSoldDeal?.quantitySold ?? null,
        topSoldDealUrl: topSoldDeal?.dealUrl ?? null,
        topRevenueAmount: topRevenueDeal ? Number(topRevenueDeal.netRevenue) : null,
        topRevenueDealUrl: topRevenueDeal?.dealUrl ?? null,
        lastLaunchDate,
        totalDeals360d,
      })
    }

    return result
  } catch (error) {
    console.error('getBusinessDealMetricsByVendorIds error:', error)
    return result
  }
}
