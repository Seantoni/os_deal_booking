import { prisma } from '@/lib/prisma'
import { getBusinessDealMetricsByVendorIds, type BusinessDealMetricsSummary } from '@/app/actions/deal-metrics'

import type { BusinessDealMetricsDisplayFields } from './constants'

/**
 * Overlay live deal-metrics summaries (source: dealMetrics table) onto business rows.
 * This avoids stale denormalized business metric fields in list/search views.
 */
export async function overlayLiveDealMetrics<T extends BusinessDealMetricsDisplayFields>(
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

export function getLiveMetricSortValue(
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

export function compareNullableMetricValues(
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

export async function getActiveVendorIds(): Promise<string[]> {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const activeDealMetrics = await prisma.dealMetrics.findMany({
    where: {
      runAt: { lte: now },
      endAt: { gte: startOfToday },
      externalVendorId: { not: null },
      OR: [
        { dealUrl: null },
        { dealUrl: { not: { contains: 'egift', mode: 'insensitive' } } },
      ],
    },
    select: {
      externalVendorId: true,
    },
    distinct: ['externalVendorId'],
  })

  return activeDealMetrics
    .map(dm => dm.externalVendorId)
    .filter((id): id is string => id !== null)
}
