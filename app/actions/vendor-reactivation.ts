'use server'

import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { handleServerActionError } from '@/lib/utils/server-actions'
import { requireAdmin } from '@/lib/auth/roles'

type EligibilityFilter = 'all' | 'eligible' | 'ineligible'
type StatusFilter = 'all' | 'active' | 'ended'

type ReactivationDealWithBusiness = Prisma.DealMetricsGetPayload<{
  include: {
    business: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

export interface VendorReactivationDealRow {
  id: string
  externalDealId: string
  dealName: string | null
  externalVendorId: string | null
  businessId: string | null
  businessName: string | null
  category1Name: string | null
  category2Name: string | null
  category3Name: string | null
  quantitySold: number
  netRevenue: number
  margin: number
  dealUrl: string | null
  previewUrl: string | null
  runAt: Date | null
  endAt: Date | null
  lastSyncedAt: Date
  vendorReactivateEligible: boolean
  vendorReactivateEligibleAt: Date | null
  vendorReactivateEligibleBy: string | null
}

async function lookupFallbackBusinessesByVendorIds(vendorIds: string[]) {
  if (vendorIds.length === 0) {
    return new Map<string, { id: string; name: string }>()
  }

  const businesses = await prisma.business.findMany({
    where: { osAdminVendorId: { in: vendorIds } },
    select: { id: true, osAdminVendorId: true, name: true },
  })

  return new Map(
    businesses
      .filter((business) => business.osAdminVendorId)
      .map((business) => [business.osAdminVendorId!, { id: business.id, name: business.name }])
  )
}

function buildDealMetricsWhereClause(options: Record<string, string | number | boolean | undefined>): Prisma.DealMetricsWhereInput {
  const whereClause: Prisma.DealMetricsWhereInput = {}
  const search = options.search as string | undefined
  const eligibilityFilter = (options.eligibilityFilter as EligibilityFilter) || 'all'
  const statusFilter = (options.statusFilter as StatusFilter) || 'all'

  if (eligibilityFilter === 'eligible') {
    whereClause.vendorReactivateEligible = true
  } else if (eligibilityFilter === 'ineligible') {
    whereClause.vendorReactivateEligible = false
  }

  if (search?.trim()) {
    whereClause.OR = [
      { externalDealId: { contains: search.trim(), mode: 'insensitive' } },
      { dealName: { contains: search.trim(), mode: 'insensitive' } },
      { externalVendorId: { contains: search.trim(), mode: 'insensitive' } },
      { business: { name: { contains: search.trim(), mode: 'insensitive' } } },
    ]
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (statusFilter === 'active') {
    const activeConditions: Prisma.DealMetricsWhereInput[] = [
      { runAt: { lte: now } },
      { endAt: { gte: today } },
    ]
    if (whereClause.OR) {
      const searchOr = whereClause.OR
      delete whereClause.OR
      whereClause.AND = [{ OR: searchOr }, ...activeConditions]
    } else {
      whereClause.AND = activeConditions
    }
  } else if (statusFilter === 'ended') {
    const endedConditions: Prisma.DealMetricsWhereInput = {
      OR: [
        { runAt: { gt: now } },
        { runAt: null },
        { endAt: { lt: today } },
        { endAt: null },
      ],
    }
    if (whereClause.OR) {
      const searchOr = whereClause.OR
      delete whereClause.OR
      whereClause.AND = [{ OR: searchOr }, endedConditions]
    } else {
      whereClause.AND = [endedConditions]
    }
  }

  return whereClause
}

function buildOrderBy(sortBy?: string, sortDirection: 'asc' | 'desc' = 'desc'): Prisma.DealMetricsOrderByWithRelationInput {
  switch (sortBy) {
    case 'externalDealId':
      return { externalDealId: sortDirection }
    case 'businessName':
      return { business: { name: sortDirection } }
    case 'dealName':
      return { dealName: sortDirection }
    case 'quantitySold':
      return { quantitySold: sortDirection }
    case 'margin':
      return { margin: sortDirection }
    case 'runAt':
      return { runAt: sortDirection }
    case 'endAt':
      return { endAt: sortDirection }
    case 'vendorReactivateEligible':
      return { vendorReactivateEligible: sortDirection }
    default:
      return { netRevenue: sortDirection }
  }
}

function formatVendorReactivationRow(
  deal: ReactivationDealWithBusiness,
  fallbackBusinessesByVendorId: Map<string, { id: string; name: string }>
): VendorReactivationDealRow {
  const fallbackBusiness = deal.externalVendorId
    ? fallbackBusinessesByVendorId.get(deal.externalVendorId)
    : null
  const businessId = deal.business?.id || fallbackBusiness?.id || null
  const businessName = deal.business?.name || fallbackBusiness?.name || null

  return {
    id: deal.id,
    externalDealId: deal.externalDealId,
    dealName: deal.dealName,
    externalVendorId: deal.externalVendorId,
    businessId,
    businessName,
    category1Name: deal.category1Name,
    category2Name: deal.category2Name,
    category3Name: deal.category3Name,
    quantitySold: deal.quantitySold,
    netRevenue: Number(deal.netRevenue),
    margin: Number(deal.margin),
    dealUrl: deal.dealUrl,
    previewUrl: deal.previewUrl,
    runAt: deal.runAt,
    endAt: deal.endAt,
    lastSyncedAt: deal.lastSyncedAt,
    vendorReactivateEligible: deal.vendorReactivateEligible,
    vendorReactivateEligibleAt: deal.vendorReactivateEligibleAt,
    vendorReactivateEligibleBy: deal.vendorReactivateEligibleBy,
  }
}

export async function getVendorReactivationDealsPaginated(
  options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  } & Record<string, string | number | boolean | undefined> = {}
) {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await requireAdmin()

    const {
      page = 0,
      pageSize = 50,
      sortBy = 'netRevenue',
      sortDirection = 'desc',
    } = options

    const whereClause = buildDealMetricsWhereClause(options)
    const orderBy = buildOrderBy(sortBy, sortDirection)

    const [deals, total] = await Promise.all([
      prisma.dealMetrics.findMany({
        where: whereClause,
        orderBy,
        skip: page * pageSize,
        take: pageSize,
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.dealMetrics.count({ where: whereClause }),
    ])

    const missingVendorIds = [...new Set(
      deals
        .filter((deal) => !deal.business && deal.externalVendorId)
        .map((deal) => deal.externalVendorId!)
    )]
    const fallbackBusinessesByVendorId = await lookupFallbackBusinessesByVendorIds(missingVendorIds)

    return {
      success: true,
      data: deals.map((deal) => formatVendorReactivationRow(deal, fallbackBusinessesByVendorId)),
      total,
    }
  } catch (error) {
    return handleServerActionError(error, 'getVendorReactivationDealsPaginated')
  }
}

export async function searchVendorReactivationDeals(
  query: string,
  options: { limit?: number } & Record<string, string | number | boolean | undefined> = {}
) {
  return getVendorReactivationDealsPaginated({
    ...options,
    page: 0,
    pageSize: options.limit ?? 100,
    search: query,
  })
}

export async function getVendorReactivationCounts(
  filters: Record<string, string | number | boolean | undefined> = {}
) {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await requireAdmin()

    const baseWhere = buildDealMetricsWhereClause({
      ...filters,
      eligibilityFilter: 'all',
    })

    const [all, eligible, ineligible] = await Promise.all([
      prisma.dealMetrics.count({ where: baseWhere }),
      prisma.dealMetrics.count({
        where: {
          ...baseWhere,
          vendorReactivateEligible: true,
        },
      }),
      prisma.dealMetrics.count({
        where: {
          ...baseWhere,
          vendorReactivateEligible: false,
        },
      }),
    ])

    return {
      success: true,
      data: { all, eligible, ineligible },
    }
  } catch (error) {
    return handleServerActionError(error, 'getVendorReactivationCounts')
  }
}

export async function setVendorReactivationEligibility(externalDealId: string, eligible: boolean) {
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await requireAdmin()

    const updated = await prisma.dealMetrics.update({
      where: { externalDealId },
      data: {
        vendorReactivateEligible: eligible,
        vendorReactivateEligibleAt: eligible ? new Date() : null,
        vendorReactivateEligibleBy: eligible ? userId : null,
      },
      select: {
        id: true,
        externalDealId: true,
        vendorReactivateEligible: true,
        vendorReactivateEligibleAt: true,
        vendorReactivateEligibleBy: true,
      },
    })

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'setVendorReactivationEligibility')
  }
}
