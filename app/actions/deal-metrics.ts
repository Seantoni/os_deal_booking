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
  // Validate and convert deal_id (API returns number, we store as string)
  const rawDealId = deal.deal_id
  
  if (!rawDealId && rawDealId !== 0) {
    return { created: false, updated: false, snapshotCreated: false, skipped: true }
  }
  
  // Convert to string (API may return number or string)
  const externalDealId = String(rawDealId)
  
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

  // Get unique vendor IDs and look up business info (id + name)
  const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
  const businesses = vendorIds.length > 0
    ? await prisma.business.findMany({
        where: { osAdminVendorId: { in: vendorIds } },
        select: { id: true, osAdminVendorId: true, name: true },
      })
    : []
  const vendorToBusinessInfo = new Map(businesses.map(b => [b.osAdminVendorId, { id: b.id, name: b.name }]))

  // Format deals
  const formattedDeals: FormattedDealMetric[] = deals.map(deal => {
    const businessInfo = deal.externalVendorId ? vendorToBusinessInfo.get(deal.externalVendorId) : null
    return {
      id: deal.id,
      externalDealId: deal.externalDealId,
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
  })

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

    // Get unique vendor IDs and look up business info (id + name)
    const vendorIds = [...new Set(deals.map(d => d.externalVendorId).filter(Boolean))] as string[]
    const businesses = vendorIds.length > 0
      ? await prisma.business.findMany({
          where: { osAdminVendorId: { in: vendorIds } },
          select: { id: true, osAdminVendorId: true, name: true },
        })
      : []
    const vendorToBusinessInfo = new Map(businesses.map(b => [b.osAdminVendorId, { id: b.id, name: b.name }]))

    const data = deals.map(deal => {
      const businessInfo = deal.externalVendorId ? vendorToBusinessInfo.get(deal.externalVendorId) : null
      return {
        id: deal.id,
        externalDealId: deal.externalDealId,
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
    })

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

// Type for consolidated business metrics
export interface ConsolidatedBusinessMetric {
  vendorId: string
  businessId: string | null
  businessName: string | null
  ownerId: string | null
  ownerName: string | null
  topSoldDeal: {
    dealId: string
    quantity: number
    dealUrl: string | null
  } | null
  topRevenueDeal: {
    dealId: string
    revenue: number
    dealUrl: string | null
  } | null
  lastLaunchDate: Date | null
  totalDeals360d: number
}

/**
 * Get consolidated business metrics for the Negocios tab
 * Groups deals by business, finds top performers, counts deals in last 360 days
 */
export async function getConsolidatedBusinessMetrics(options: {
  search?: string
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  ownerId?: string
} = {}): Promise<{ success: boolean; data?: ConsolidatedBusinessMetric[]; error?: string }> {
  try {
    const { search, sortBy = 'totalDeals360d', sortDirection = 'desc', ownerId } = options

    // Get date 360 days ago
    const date360DaysAgo = new Date()
    date360DaysAgo.setDate(date360DaysAgo.getDate() - 360)

    // Get all deals (we'll aggregate in memory for flexibility)
    const deals = await prisma.dealMetrics.findMany({
      where: {
        externalVendorId: { not: null },
      },
      orderBy: { runAt: 'desc' },
    })

    // Group deals by vendor
    const vendorDealsMap = new Map<string, typeof deals>()
    for (const deal of deals) {
      if (!deal.externalVendorId) continue
      const existing = vendorDealsMap.get(deal.externalVendorId) || []
      existing.push(deal)
      vendorDealsMap.set(deal.externalVendorId, existing)
    }

    // Get business info for all vendors
    const vendorIds = [...vendorDealsMap.keys()]
    const businesses = vendorIds.length > 0
      ? await prisma.business.findMany({
          where: { osAdminVendorId: { in: vendorIds } },
          select: { 
            id: true, 
            osAdminVendorId: true, 
            name: true,
            ownerId: true,
          },
        })
      : []

    // Get owner info for all ownerIds
    const ownerIds = [...new Set(businesses.map(b => b.ownerId).filter(Boolean))] as string[]
    const owners = ownerIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: ownerIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []
    const ownerMap = new Map(owners.map(o => [o.clerkId, o.name || o.email || o.clerkId]))

    const vendorToBusinessInfo = new Map(businesses.map(b => [b.osAdminVendorId, { 
      id: b.id, 
      name: b.name,
      ownerId: b.ownerId,
      ownerName: b.ownerId ? ownerMap.get(b.ownerId) || null : null
    }]))

    // Build consolidated metrics for each vendor
    let consolidatedData: ConsolidatedBusinessMetric[] = []

    for (const [vendorId, vendorDeals] of vendorDealsMap) {
      const businessInfo = vendorToBusinessInfo.get(vendorId)
      const businessName = businessInfo?.name || null
      const businessId = businessInfo?.id || null
      const businessOwnerId = businessInfo?.ownerId || null
      const businessOwnerName = businessInfo?.ownerName || null

      // Apply owner filter
      if (ownerId && businessOwnerId !== ownerId) continue

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch = 
          vendorId.toLowerCase().includes(searchLower) ||
          (businessName && businessName.toLowerCase().includes(searchLower))
        if (!matchesSearch) continue
      }

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

      consolidatedData.push({
        vendorId,
        businessId,
        businessName,
        ownerId: businessOwnerId,
        ownerName: businessOwnerName,
        topSoldDeal: topSoldDeal ? {
          dealId: topSoldDeal.externalDealId,
          quantity: topSoldDeal.quantitySold,
          dealUrl: topSoldDeal.dealUrl,
        } : null,
        topRevenueDeal: topRevenueDeal ? {
          dealId: topRevenueDeal.externalDealId,
          revenue: Number(topRevenueDeal.netRevenue),
          dealUrl: topRevenueDeal.dealUrl,
        } : null,
        lastLaunchDate,
        totalDeals360d,
      })
    }

    // Sort the data
    consolidatedData.sort((a, b) => {
      let aVal: string | number | null = null
      let bVal: string | number | null = null

      switch (sortBy) {
        case 'businessName':
          aVal = (a.businessName || a.vendorId).toLowerCase()
          bVal = (b.businessName || b.vendorId).toLowerCase()
          break
        case 'topSold':
          aVal = a.topSoldDeal?.quantity ?? 0
          bVal = b.topSoldDeal?.quantity ?? 0
          break
        case 'topRevenue':
          aVal = a.topRevenueDeal?.revenue ?? 0
          bVal = b.topRevenueDeal?.revenue ?? 0
          break
        case 'lastLaunchDate':
          aVal = a.lastLaunchDate?.getTime() ?? 0
          bVal = b.lastLaunchDate?.getTime() ?? 0
          break
        case 'totalDeals360d':
        default:
          aVal = a.totalDeals360d
          bVal = b.totalDeals360d
          break
      }

      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return { success: true, data: consolidatedData }
  } catch (error) {
    console.error('getConsolidatedBusinessMetrics error:', error)
    return { success: false, error: 'Error fetching consolidated business metrics' }
  }
}

/**
 * Get consolidated business metrics paginated (for usePaginatedSearch)
 */
export async function getConsolidatedBusinessMetricsPaginated(
  options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  } & Record<string, string | number | boolean | undefined> = {}
): Promise<{ success: boolean; data?: ConsolidatedBusinessMetric[]; total?: number; error?: string }> {
  try {
    const {
      page = 0,
      pageSize = 50,
      sortBy = 'totalDeals360d',
      sortDirection = 'desc',
    } = options
    const ownerId = options.ownerId as string | undefined

    // Get all consolidated data (sorted and filtered)
    const result = await getConsolidatedBusinessMetrics({
      sortBy,
      sortDirection,
      ownerId,
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }

    const allData = result.data
    const total = allData.length

    // Apply pagination
    const start = page * pageSize
    const paginatedData = allData.slice(start, start + pageSize)

    return { success: true, data: paginatedData, total }
  } catch (error) {
    console.error('getConsolidatedBusinessMetricsPaginated error:', error)
    return { success: false, error: 'Error fetching paginated business metrics' }
  }
}

/**
 * Search consolidated business metrics (for usePaginatedSearch)
 */
export async function searchConsolidatedBusinessMetrics(
  query: string,
  options?: { limit?: number } & Record<string, string | number | boolean | undefined>
): Promise<{ success: boolean; data?: ConsolidatedBusinessMetric[]; error?: string }> {
  try {
    const limit = options?.limit ?? 100
    const ownerId = options?.ownerId as string | undefined

    // Get all consolidated data with search filter
    const result = await getConsolidatedBusinessMetrics({
      search: query,
      sortBy: 'totalDeals360d',
      sortDirection: 'desc',
      ownerId,
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error }
    }

    // Apply limit
    const data = result.data.slice(0, limit)

    return { success: true, data }
  } catch (error) {
    console.error('searchConsolidatedBusinessMetrics error:', error)
    return { success: false, error: 'Error searching business metrics' }
  }
}

/**
 * Get unique owners who have businesses with deal metrics
 */
export async function getBusinessOwnersWithMetrics(): Promise<{ id: string; name: string; businessCount: number }[]> {
  try {
    // Get all vendor IDs from deal metrics
    const vendorIds = await prisma.dealMetrics.findMany({
      where: { externalVendorId: { not: null } },
      select: { externalVendorId: true },
      distinct: ['externalVendorId'],
    })

    const vendorIdList = vendorIds.map(v => v.externalVendorId).filter(Boolean) as string[]

    // Get businesses with these vendor IDs
    const businesses = await prisma.business.findMany({
      where: { 
        osAdminVendorId: { in: vendorIdList },
        ownerId: { not: null },
      },
      select: {
        ownerId: true,
      }
    })

    // Get unique owner IDs
    const ownerIds = [...new Set(businesses.map(b => b.ownerId).filter(Boolean))] as string[]

    // Get owner info from UserProfile
    const owners = ownerIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: ownerIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []
    const ownerInfoMap = new Map(owners.map(o => [o.clerkId, o.name || o.email || o.clerkId]))

    // Group by owner and count
    const ownerCountMap = new Map<string, number>()
    for (const b of businesses) {
      if (!b.ownerId) continue
      ownerCountMap.set(b.ownerId, (ownerCountMap.get(b.ownerId) || 0) + 1)
    }

    // Convert to array and sort by count
    return Array.from(ownerCountMap.entries())
      .map(([id, count]) => ({ 
        id, 
        name: ownerInfoMap.get(id) || id, 
        businessCount: count 
      }))
      .sort((a, b) => b.businessCount - a.businessCount)
  } catch (error) {
    console.error('getBusinessOwnersWithMetrics error:', error)
    return []
  }
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
