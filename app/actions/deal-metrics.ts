'use server'

/**
 * Deal Metrics Server Actions
 * 
 * Syncs deal metrics from external Oferta API to local database
 */

import { prisma } from '@/lib/prisma'
import { fetchDealMetrics, fetchAllDealMetrics } from '@/lib/api/external-oferta/deal/metrics'
import type { DealMetric } from '@/lib/api/external-oferta/deal/types'

export interface SyncMetricsResult {
  success: boolean
  message: string
  stats?: {
    fetched: number
    created: number
    updated: number
    snapshots: number
    skipped?: number
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
    return {
      success: true,
      message: `Synced ${processed} deals: ${created} created, ${updated} updated, ${snapshots} snapshots${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      stats: {
        fetched: deals.length,
        created,
        updated,
        snapshots,
        skipped,
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
  // Validate deal_id (it's a string like "D44381")
  const externalDealId = deal.deal_id
  
  if (!externalDealId || typeof externalDealId !== 'string') {
    return { created: false, updated: false, snapshotCreated: false, skipped: true }
  }
  
  try {
    // Check if record exists
    const existing = await prisma.dealMetrics.findUnique({
      where: { externalDealId },
    })

    const now = new Date()
    const data = {
      externalVendorId: deal.vendor_id,
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
  } catch {
    return { created: false, updated: false, snapshotCreated: false, skipped: true }
  }
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
  externalVendorId: string | null
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {}

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

  if (statusFilter === 'active') {
    whereClause.endAt = { gt: new Date() }
  } else if (statusFilter === 'ended') {
    whereClause.OR = [
      { endAt: { lte: new Date() } },
      { endAt: null },
    ]
    // If there's already an OR for search, we need to combine
    if (search) {
      const searchOR = whereClause.OR
      delete whereClause.OR
      whereClause.AND = [
        { OR: searchOR },
        { OR: [{ endAt: { lte: new Date() } }, { endAt: null }] },
      ]
    }
  }

  // Build orderBy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { netRevenue: 'desc' }
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

  // Count active deals
  const activeDealsCount = await prisma.dealMetrics.count({
    where: {
      ...whereClause,
      endAt: { gt: new Date() },
    },
  })

  // Get unique vendor IDs and look up business names
  const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
  const businesses = vendorIds.length > 0
    ? await prisma.business.findMany({
        where: { osAdminVendorId: { in: vendorIds } },
        select: { osAdminVendorId: true, name: true },
      })
    : []
  const vendorToBusinessName = new Map(businesses.map(b => [b.osAdminVendorId, b.name]))

  // Format deals
  const formattedDeals: FormattedDealMetric[] = deals.map(deal => ({
    id: deal.id,
    externalDealId: deal.externalDealId,
    externalVendorId: deal.externalVendorId,
    businessName: deal.externalVendorId ? vendorToBusinessName.get(deal.externalVendorId) || null : null,
    quantitySold: deal.quantitySold,
    netRevenue: Number(deal.netRevenue),
    margin: Number(deal.margin),
    dealUrl: deal.dealUrl,
    runAt: deal.runAt,
    endAt: deal.endAt,
    lastSyncedAt: deal.lastSyncedAt,
    snapshotCount: deal._count.snapshots,
  }))

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = {}
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

    const [all, active, ended] = await Promise.all([
      prisma.dealMetrics.count({ where: baseWhere }),
      prisma.dealMetrics.count({
        where: { ...baseWhere, endAt: { gt: new Date() } },
      }),
      prisma.dealMetrics.count({
        where: {
          ...baseWhere,
          OR: [{ endAt: { lte: new Date() } }, { endAt: null }],
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      OR: [
        { externalDealId: { contains: query, mode: 'insensitive' } },
        { externalVendorId: { contains: query, mode: 'insensitive' } },
        { dealUrl: { contains: query, mode: 'insensitive' } },
      ],
    }

    if (vendorId) {
      whereClause.externalVendorId = vendorId
    }

    if (statusFilter === 'active') {
      whereClause.endAt = { gt: new Date() }
    } else if (statusFilter === 'ended') {
      whereClause.AND = [
        { OR: whereClause.OR },
        { OR: [{ endAt: { lte: new Date() } }, { endAt: null }] },
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

    // Get unique vendor IDs and look up business names
    const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
    const businesses = vendorIds.length > 0
      ? await prisma.business.findMany({
          where: { osAdminVendorId: { in: vendorIds } },
          select: { osAdminVendorId: true, name: true },
        })
      : []
    const vendorToBusinessName = new Map(businesses.map(b => [b.osAdminVendorId, b.name]))

    const data = deals.map(deal => ({
      id: deal.id,
      externalDealId: deal.externalDealId,
      externalVendorId: deal.externalVendorId,
      businessName: deal.externalVendorId ? vendorToBusinessName.get(deal.externalVendorId) || null : null,
      quantitySold: deal.quantitySold,
      netRevenue: Number(deal.netRevenue),
      margin: Number(deal.margin),
      dealUrl: deal.dealUrl,
      runAt: deal.runAt,
      endAt: deal.endAt,
      lastSyncedAt: deal.lastSyncedAt,
      snapshotCount: deal._count.snapshots,
    }))

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
