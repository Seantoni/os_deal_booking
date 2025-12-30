'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getUserRole } from '@/lib/auth/roles'

// Inline type definition to avoid Prisma cache issues
type WhereInput = {
  sourceSite?: string
  status?: string
  firstSeenAt?: { gte?: Date; lt?: Date }
  OR?: Array<{
    merchantName?: { contains: string; mode: 'insensitive' }
    dealTitle?: { contains: string; mode: 'insensitive' }
  }>
}

// Snapshot type for calculations
interface SnapshotForCalc {
  totalSold: number
  scannedAt: Date
}

// Types
export interface CompetitorDealWithStats {
  id: string
  sourceUrl: string
  sourceSite: string
  merchantName: string
  dealTitle: string
  originalPrice: number
  offerPrice: number
  discountPercent: number
  totalSold: number
  imageUrl: string | null
  tag: string | null
  status: string
  isTracking: boolean
  firstSeenAt: Date
  lastScannedAt: Date
  expiresAt: Date | null
  // Calculated stats
  salesToday: number
  salesThisWeek: number
  salesThisMonth: number
}

export interface DealSnapshot {
  id: string
  totalSold: number
  offerPrice: number
  originalPrice: number
  scannedAt: Date
}

interface GetDealsParams {
  page?: number
  pageSize?: number
  sourceSite?: string
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  newOnly?: boolean // Filter for deals first seen today
}

interface GetDealsResult {
  deals: CompetitorDealWithStats[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Check if user has admin access
 */
async function checkAdminAccess(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

// Valid database columns that can be used in Prisma orderBy
const VALID_DB_SORT_FIELDS = new Set([
  'id', 'sourceUrl', 'sourceSite', 'merchantName', 'dealTitle',
  'originalPrice', 'offerPrice', 'discountPercent', 'totalSold',
  'imageUrl', 'tag', 'status', 'isTracking', 'firstSeenAt',
  'lastScannedAt', 'expiresAt', 'createdAt', 'updatedAt'
])

// Computed fields that require in-memory sorting after stats calculation
const COMPUTED_SORT_FIELDS = new Set(['salesToday', 'salesThisWeek', 'salesThisMonth'])

/**
 * Get competitor deals with pagination, filtering, and calculated stats
 */
export async function getCompetitorDeals(params: GetDealsParams = {}): Promise<GetDealsResult> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { deals: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }
  }
  
  const {
    page = 1,
    pageSize = 25,
    sourceSite,
    status,
    search,
    sortBy = 'totalSold',
    sortOrder = 'desc',
    newOnly = false,
  } = params
  
  // Check if we're sorting by a computed field
  const isComputedSort = COMPUTED_SORT_FIELDS.has(sortBy)
  
  // Build where clause
  const where: WhereInput = {}
  
  if (sourceSite) {
    where.sourceSite = sourceSite
  }
  
  if (status) {
    where.status = status
  }
  
  if (search) {
    where.OR = [
      { merchantName: { contains: search, mode: 'insensitive' } },
      { dealTitle: { contains: search, mode: 'insensitive' } },
    ]
  }
  
  // Filter for deals first seen today
  if (newOnly) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    
    where.firstSeenAt = {
      gte: todayStart,
      lt: tomorrowStart,
    }
  }
  
  // Get total count
  const total = await prisma.competitorDeal.count({ where })
  
  // For computed field sorting, we need to fetch all matching records, compute stats, sort, then paginate
  // For DB field sorting, we can use Prisma's orderBy with pagination
  const deals = await prisma.competitorDeal.findMany({
    where,
    // Only apply DB-level sorting for valid DB fields
    ...(isComputedSort ? {} : { orderBy: { [sortBy]: sortOrder } }),
    // For computed sorts, fetch all records; for DB sorts, use pagination
    ...(isComputedSort ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
  })
  
  // Calculate stats for each deal
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setMonth(monthStart.getMonth() - 1)
  
  const dealsWithStats: CompetitorDealWithStats[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    deals.map(async (deal: any) => {
      // Get snapshots for calculating sales
      const snapshots = await prisma.competitorDealSnapshot.findMany({
        where: { dealId: deal.id },
        orderBy: { scannedAt: 'asc' },
      })
      
      // Calculate sales for different periods
      let salesToday = 0
      let salesThisWeek = 0
      let salesThisMonth = 0
      
      if (snapshots.length >= 2) {
        // Find the snapshot closest to each period start
        const findClosestBefore = (date: Date): SnapshotForCalc | null => {
          const before = snapshots.filter((s: SnapshotForCalc) => s.scannedAt <= date)
          return before.length > 0 ? before[before.length - 1] : null
        }
        
        const todaySnapshot = findClosestBefore(todayStart)
        const weekSnapshot = findClosestBefore(weekStart)
        const monthSnapshot = findClosestBefore(monthStart)
        const latestSnapshot = snapshots[snapshots.length - 1]
        
        if (todaySnapshot && latestSnapshot) {
          salesToday = latestSnapshot.totalSold - todaySnapshot.totalSold
        }
        if (weekSnapshot && latestSnapshot) {
          salesThisWeek = latestSnapshot.totalSold - weekSnapshot.totalSold
        }
        if (monthSnapshot && latestSnapshot) {
          salesThisMonth = latestSnapshot.totalSold - monthSnapshot.totalSold
        }
      }
      
      return {
        id: deal.id,
        sourceUrl: deal.sourceUrl,
        sourceSite: deal.sourceSite,
        merchantName: deal.merchantName,
        dealTitle: deal.dealTitle,
        originalPrice: deal.originalPrice.toNumber(),
        offerPrice: deal.offerPrice.toNumber(),
        discountPercent: deal.discountPercent,
        totalSold: deal.totalSold,
        imageUrl: deal.imageUrl,
        tag: deal.tag,
        status: deal.status,
        isTracking: deal.isTracking,
        firstSeenAt: deal.firstSeenAt,
        lastScannedAt: deal.lastScannedAt,
        expiresAt: deal.expiresAt,
        salesToday: Math.max(0, salesToday),
        salesThisWeek: Math.max(0, salesThisWeek),
        salesThisMonth: Math.max(0, salesThisMonth),
      }
    })
  )
  
  // For computed field sorting, sort in memory and then paginate
  let finalDeals = dealsWithStats
  if (isComputedSort) {
    // Sort by the computed field
    finalDeals = [...dealsWithStats].sort((a, b) => {
      const aVal = a[sortBy as keyof CompetitorDealWithStats] as number
      const bVal = b[sortBy as keyof CompetitorDealWithStats] as number
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })
    
    // Apply pagination after sorting
    const startIndex = (page - 1) * pageSize
    finalDeals = finalDeals.slice(startIndex, startIndex + pageSize)
  }
  
  return {
    deals: finalDeals,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Get a single competitor deal with full snapshot history
 */
export async function getCompetitorDeal(dealId: string): Promise<{
  deal: CompetitorDealWithStats | null
  snapshots: DealSnapshot[]
}> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { deal: null, snapshots: [] }
  }
  
  const deal = await prisma.competitorDeal.findUnique({
    where: { id: dealId },
  })
  
  if (!deal) {
    return { deal: null, snapshots: [] }
  }
  
  const snapshots = await prisma.competitorDealSnapshot.findMany({
    where: { dealId },
    orderBy: { scannedAt: 'asc' },
  })
  
  // Calculate stats
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setMonth(monthStart.getMonth() - 1)
  
  let salesToday = 0
  let salesThisWeek = 0
  let salesThisMonth = 0
  
  if (snapshots.length >= 2) {
    const findClosestBefore = (date: Date): SnapshotForCalc | null => {
      const before = snapshots.filter((s: SnapshotForCalc) => s.scannedAt <= date)
      return before.length > 0 ? before[before.length - 1] : null
    }
    
    const todaySnapshot = findClosestBefore(todayStart)
    const weekSnapshot = findClosestBefore(weekStart)
    const monthSnapshot = findClosestBefore(monthStart)
    const latestSnapshot = snapshots[snapshots.length - 1] as SnapshotForCalc
    
    if (todaySnapshot && latestSnapshot) {
      salesToday = latestSnapshot.totalSold - todaySnapshot.totalSold
    }
    if (weekSnapshot && latestSnapshot) {
      salesThisWeek = latestSnapshot.totalSold - weekSnapshot.totalSold
    }
    if (monthSnapshot && latestSnapshot) {
      salesThisMonth = latestSnapshot.totalSold - monthSnapshot.totalSold
    }
  }
  
  const dealWithStats: CompetitorDealWithStats = {
    id: deal.id,
    sourceUrl: deal.sourceUrl,
    sourceSite: deal.sourceSite,
    merchantName: deal.merchantName,
    dealTitle: deal.dealTitle,
    originalPrice: deal.originalPrice.toNumber(),
    offerPrice: deal.offerPrice.toNumber(),
    discountPercent: deal.discountPercent,
    totalSold: deal.totalSold,
    imageUrl: deal.imageUrl,
    tag: deal.tag,
    status: deal.status,
    isTracking: deal.isTracking,
    firstSeenAt: deal.firstSeenAt,
    lastScannedAt: deal.lastScannedAt,
    expiresAt: deal.expiresAt,
    salesToday: Math.max(0, salesToday),
    salesThisWeek: Math.max(0, salesThisWeek),
    salesThisMonth: Math.max(0, salesThisMonth),
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedSnapshots: DealSnapshot[] = snapshots.map((s: any) => ({
    id: s.id,
    totalSold: s.totalSold,
    offerPrice: s.offerPrice.toNumber(),
    originalPrice: s.originalPrice.toNumber(),
    scannedAt: s.scannedAt,
  }))
  
  return { deal: dealWithStats, snapshots: formattedSnapshots }
}

/**
 * Toggle tracking for a deal
 */
export async function toggleDealTracking(dealId: string, isTracking: boolean): Promise<{ success: boolean }> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { success: false }
  }
  
  await prisma.competitorDeal.update({
    where: { id: dealId },
    data: { isTracking },
  })
  
  revalidatePath('/market-intelligence')
  return { success: true }
}

/**
 * Delete a competitor deal (and its snapshots)
 */
export async function deleteCompetitorDeal(dealId: string): Promise<{ success: boolean }> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { success: false }
  }
  
  await prisma.competitorDeal.delete({
    where: { id: dealId },
  })
  
  revalidatePath('/market-intelligence')
  return { success: true }
}

/**
 * Get summary stats for the dashboard
 * Includes total sold by site and aggregate sales over time periods
 */
export async function getCompetitorDealStats(): Promise<{
  totalDeals: number
  activeDeals: number
  totalSalesTracked: number
  bySite: { site: string; count: number; totalSold: number }[]
  lastScanAt: Date | null
  // Aggregate sales across all deals
  salesToday: number
  salesThisWeek: number
  salesLast30Days: number
}> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return {
      totalDeals: 0,
      activeDeals: 0,
      totalSalesTracked: 0,
      bySite: [],
      lastScanAt: null,
      salesToday: 0,
      salesThisWeek: 0,
      salesLast30Days: 0,
    }
  }
  
  // Time boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 30)
  
  const [
    totalDeals, 
    activeDeals, 
    bySiteStats, 
    lastDeal,
    // Get snapshots for sales calculations
    allDealsWithSnapshots
  ] = await Promise.all([
    prisma.competitorDeal.count(),
    prisma.competitorDeal.count({ where: { status: 'active' } }),
    // Get count AND total sold by site
    prisma.competitorDeal.groupBy({
      by: ['sourceSite'],
      _count: { id: true },
      _sum: { totalSold: true },
      where: { status: 'active' },
    }),
    prisma.competitorDeal.findFirst({
      orderBy: { lastScannedAt: 'desc' },
      select: { lastScannedAt: true },
    }),
    // Get all active deals with their snapshots for sales calculation
    prisma.competitorDeal.findMany({
      where: { status: 'active', totalSold: { gt: 0 } },
      select: {
        id: true,
        totalSold: true,
        snapshots: {
          orderBy: { scannedAt: 'asc' },
          select: { totalSold: true, scannedAt: true },
        },
      },
    }),
  ])
  
  // Calculate aggregate sales across all deals
  let salesToday = 0
  let salesThisWeek = 0
  let salesLast30Days = 0
  
  for (const deal of allDealsWithSnapshots) {
    if (deal.snapshots.length < 2) continue
    
    const currentSold = deal.totalSold
    const snapshots = deal.snapshots as SnapshotForCalc[]
    
    // Find snapshot closest to each time boundary (but before it)
    const findClosestBefore = (date: Date): SnapshotForCalc | null => {
      const before = snapshots.filter((s: SnapshotForCalc) => s.scannedAt <= date)
      return before.length > 0 ? before[before.length - 1] : null
    }
    
    const todaySnapshot = findClosestBefore(todayStart)
    const weekSnapshot = findClosestBefore(weekStart)
    const monthSnapshot = findClosestBefore(monthStart)
    
    // Calculate deltas
    if (todaySnapshot) {
      salesToday += Math.max(0, currentSold - todaySnapshot.totalSold)
    }
    if (weekSnapshot) {
      salesThisWeek += Math.max(0, currentSold - weekSnapshot.totalSold)
    }
    if (monthSnapshot) {
      salesLast30Days += Math.max(0, currentSold - monthSnapshot.totalSold)
    }
  }
  
  // Total across all sites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSalesTracked = bySiteStats.reduce((sum: number, s: any) => sum + (s._sum.totalSold || 0), 0)
  
  return {
    totalDeals,
    activeDeals,
    totalSalesTracked,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bySite: bySiteStats.map((r: any) => ({ 
      site: r.sourceSite, 
      count: r._count.id,
      totalSold: r._sum.totalSold || 0,
    })),
    lastScanAt: lastDeal?.lastScannedAt || null,
    salesToday,
    salesThisWeek,
    salesLast30Days,
  }
}

/**
 * Get daily statistics for charts
 * Returns deals launched per day and sales per day for the last N days
 */
export async function getCompetitorDealsDailyStats(days: number = 30, sourceSite?: string): Promise<{
  launchesPerDay: Array<{ date: string; count: number }>
  salesPerDay: Array<{ date: string; totalSold: number; dealsCount: number }>
}> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { launchesPerDay: [], salesPerDay: [] }
  }

  // Use local timezone dates
  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 0, 0, 0, 0)

  // Helper to get local date key (YYYY-MM-DD)
  const getDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Build where clause with optional source filter
  const whereClause: { firstSeenAt: { gte: Date; lte: Date }; sourceSite?: string } = {
    firstSeenAt: {
      gte: startDate,
      lte: endDate,
    },
  }
  if (sourceSite) {
    whereClause.sourceSite = sourceSite
  }

  // Get all deals launched in the period
  const deals = await prisma.competitorDeal.findMany({
    where: whereClause,
    select: {
      id: true,
      firstSeenAt: true,
      totalSold: true,
    },
    orderBy: {
      firstSeenAt: 'asc',
    },
  })

  // Group by day for launches (using local date)
  const launchesMap = new Map<string, number>()
  for (const deal of deals) {
    const dateKey = getDateKey(deal.firstSeenAt)
    launchesMap.set(dateKey, (launchesMap.get(dateKey) || 0) + 1)
  }

  // Get snapshots for sales calculation (filtered by source if specified)
  const snapshots = await prisma.competitorDealSnapshot.findMany({
    where: {
      scannedAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(sourceSite && {
        deal: {
          sourceSite: sourceSite,
        },
      }),
    },
    select: {
      dealId: true,
      scannedAt: true,
      totalSold: true,
    },
    orderBy: {
      scannedAt: 'asc',
    },
  })

  // Group snapshots by deal and calculate daily sales
  const dealSnapshots = new Map<string, SnapshotForCalc[]>()
  for (const snapshot of snapshots) {
    if (!dealSnapshots.has(snapshot.dealId)) {
      dealSnapshots.set(snapshot.dealId, [])
    }
    dealSnapshots.get(snapshot.dealId)!.push({
      totalSold: snapshot.totalSold,
      scannedAt: snapshot.scannedAt,
    })
  }

  // Calculate sales per day
  const salesMap = new Map<string, { totalSold: number; dealsCount: Set<string> }>()
  
  // For each day, calculate the delta in sales
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    const dateKey = getDateKey(date)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

    let daySales = 0
    const activeDeals = new Set<string>()

    // For each deal, find snapshots before and after this day
    for (const [dealId, dealSnaps] of dealSnapshots.entries()) {
      const beforeDay = dealSnaps.filter(s => s.scannedAt < dayStart)
      const afterDay = dealSnaps.filter(s => s.scannedAt <= dayEnd)
      
      const beforeSold = beforeDay.length > 0 ? beforeDay[beforeDay.length - 1].totalSold : 0
      const afterSold = afterDay.length > 0 ? afterDay[afterDay.length - 1].totalSold : 0
      
      const delta = afterSold - beforeSold
      if (delta > 0) {
        daySales += delta
        activeDeals.add(dealId)
      }
    }

    salesMap.set(dateKey, {
      totalSold: daySales,
      dealsCount: activeDeals,
    })
  }

  // Build arrays for all days in range
  const launchesPerDay: Array<{ date: string; count: number }> = []
  const salesPerDay: Array<{ date: string; totalSold: number; dealsCount: number }> = []

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    const dateKey = getDateKey(date)
    
    launchesPerDay.push({
      date: dateKey,
      count: launchesMap.get(dateKey) || 0,
    })

    const sales = salesMap.get(dateKey) || { totalSold: 0, dealsCount: new Set<string>() }
    salesPerDay.push({
      date: dateKey,
      totalSold: sales.totalSold,
      dealsCount: sales.dealsCount.size,
    })
  }

  return { launchesPerDay, salesPerDay }
}

