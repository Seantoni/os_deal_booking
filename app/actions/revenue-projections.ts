'use server'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getUserRole } from '@/lib/auth/roles'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { CACHE_SERVER_BUSINESS_PROJECTION_SUMMARY_MS } from '@/lib/constants/cache'
import {
  buildProjectionEntitySummaryMap,
  getEmptyProjectionEntitySummary,
  type ProjectionEntitySummary,
  type ProjectionSource as SummaryProjectionSource,
} from '@/lib/projections/summary'

const IN_PROCESS_STATUSES = new Set(['draft', 'pending', 'approved'])
const INCLUDED_DASHBOARD_STATUSES = ['draft', 'pending', 'approved', 'booked']
const CATEGORY_BENCHMARK_MIN_SAMPLE_SIZE = 5
const CATEGORY_BENCHMARK_LOOKBACK_DAYS = 360
const BUSINESS_HISTORY_RECENT_DEALS_SAMPLE_SIZE = 3
const DEAL_METRICS_BATCH_SIZE = 1000

export type ProjectionSource = SummaryProjectionSource
export type ProjectionConfidence = 'high' | 'medium' | 'low' | 'none'
export type ProjectionBucket = 'in_process' | 'booked' | 'other'

export interface BookingRequestProjectionValue {
  projectedRevenue: number | null
  projectionSource: ProjectionSource
  confidence: ProjectionConfidence
  bucket: ProjectionBucket
  businessId: string | null
  businessName: string | null
  vendorId: string | null
  metricsLastSyncedAt: Date | null
}

export interface BookingRequestProjectionRow extends BookingRequestProjectionValue {
  requestId: string
  requestName: string
  merchant: string | null
  businessEmail: string
  status: string
  startDate: Date
  endDate: Date
  createdAt: Date
  processedAt: Date | null
  dealId: string | null
  opportunityId: string | null
}

export interface ProjectionDashboardSummary {
  totalInProcessRequests: number
  totalBookedRequests: number
  totalProjectedInProcessRevenue: number
  totalProjectedBookedRevenue: number
  totalProjectedRevenue: number
  projectedInProcessCount: number
  projectedBookedCount: number
  inProcessCoveragePct: number
  bookedCoveragePct: number
  latestMetricsSyncAt: Date | null
}

export interface ProjectionEntitySummaryMapResult {
  success: boolean
  data?: Record<string, ProjectionEntitySummary>
  error?: string
}

type ProjectionRequestRow = {
  id: string
  name: string
  merchant: string | null
  businessEmail: string
  status: string
  startDate: Date
  endDate: Date
  createdAt: Date
  processedAt: Date | null
  dealId: string | null
  opportunityId: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

type ProjectionBusinessRow = {
  id: string
  name: string
  contactEmail: string
  osAdminVendorId: string | null
  metricsLastSyncedAt: Date | null
  category?: ProjectionCategoryRow | null
}

type ProjectionCategoryRow = {
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

type ProjectionDealMetricRow = {
  externalDealId: string
  externalVendorId: string | null
  netRevenue: Prisma.Decimal | number
  runAt: Date | null
  endAt: Date | null
  lastSyncedAt: Date
}

type CategoryBenchmarkRequestRow = {
  dealId: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

type CategoryBenchmarkStats = {
  medianRevenue: number
}

type BusinessHistoryStats = {
  medianRevenue: number
}

interface BusinessProjectionSummaryCacheEntry {
  data: Record<string, ProjectionEntitySummary>
  expiresAt: number
}

const businessProjectionSummaryCache = new Map<string, BusinessProjectionSummaryCacheEntry>()
const businessProjectionSummaryInFlight = new Map<string, Promise<ProjectionEntitySummaryMapResult>>()

function pruneExpiredBusinessProjectionSummaryCache() {
  const now = Date.now()
  for (const [cacheKey, entry] of businessProjectionSummaryCache.entries()) {
    if (entry.expiresAt <= now) {
      businessProjectionSummaryCache.delete(cacheKey)
    }
  }
}

function buildBusinessProjectionSummaryCacheKey(params: {
  role: string
  userId: string
  businessIds: string[]
}): string {
  const userScope = params.role === 'sales' ? params.userId : 'shared'
  return `business-projection-summary:v1:${params.role}:${userScope}:${params.businessIds.join(',')}`
}

function normalizeLookupKey(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => !!value))]
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function normalizeCategoryPart(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

function buildCategoryKeys(
  parentCategory: string | null | undefined,
  subCategory1: string | null | undefined,
  subCategory2: string | null | undefined,
  subCategory3: string | null | undefined,
  subCategory4: string | null | undefined
): string[] {
  const parent = normalizeCategoryPart(parentCategory)
  if (!parent) return []

  const parts = [parent]
  const sub1 = normalizeCategoryPart(subCategory1)
  const sub2 = normalizeCategoryPart(subCategory2)
  const sub3 = normalizeCategoryPart(subCategory3)
  const sub4 = normalizeCategoryPart(subCategory4)

  if (sub1) parts.push(sub1)
  if (sub2) parts.push(sub2)
  if (sub3) parts.push(sub3)
  if (sub4) parts.push(sub4)

  const keys: string[] = []
  for (let i = parts.length; i >= 1; i--) {
    keys.push(parts.slice(0, i).join(':'))
  }
  return keys
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getMetricReferenceDate(metric: Pick<ProjectionDealMetricRow, 'endAt' | 'runAt' | 'lastSyncedAt'>): Date | null {
  return metric.endAt || metric.runAt || metric.lastSyncedAt || null
}

function isWithinLastDays(
  metric: Pick<ProjectionDealMetricRow, 'endAt' | 'runAt' | 'lastSyncedAt'>,
  days: number
): boolean {
  const referenceDate = metric.endAt || metric.runAt || null
  if (!referenceDate) return false
  return referenceDate >= getDateDaysAgo(days)
}

async function loadDealMetricsByExternalDealIds(externalDealIds: string[]): Promise<Map<string, ProjectionDealMetricRow>> {
  const metricByExternalDealId = new Map<string, ProjectionDealMetricRow>()
  if (externalDealIds.length === 0) {
    return metricByExternalDealId
  }

  for (let offset = 0; offset < externalDealIds.length; offset += DEAL_METRICS_BATCH_SIZE) {
    const batchDealIds = externalDealIds.slice(offset, offset + DEAL_METRICS_BATCH_SIZE)
    if (batchDealIds.length === 0) continue

    const metrics = await prisma.dealMetrics.findMany({
      where: { externalDealId: { in: batchDealIds } },
      select: {
        externalDealId: true,
        externalVendorId: true,
        netRevenue: true,
        runAt: true,
        endAt: true,
        lastSyncedAt: true,
      },
    }) as ProjectionDealMetricRow[]

    for (const metric of metrics) {
      metricByExternalDealId.set(metric.externalDealId, metric)
    }
  }

  return metricByExternalDealId
}

async function buildCategoryBenchmarkLookupByCategoryKey(
  targetParentCategories: string[]
): Promise<Map<string, CategoryBenchmarkStats>> {
  const benchmarkByCategoryKey = new Map<string, CategoryBenchmarkStats>()
  if (targetParentCategories.length === 0) return benchmarkByCategoryKey

  const benchmarkRequests = await prisma.bookingRequest.findMany({
    where: {
      status: 'booked',
      dealId: { not: null },
      OR: targetParentCategories.map(parentCategory => ({
        parentCategory: { equals: parentCategory, mode: 'insensitive' },
      })),
    },
    select: {
      dealId: true,
      parentCategory: true,
      subCategory1: true,
      subCategory2: true,
      subCategory3: true,
      subCategory4: true,
    },
  }) as CategoryBenchmarkRequestRow[]
  if (benchmarkRequests.length === 0) return benchmarkByCategoryKey

  const benchmarkDealIds = uniqueIds(benchmarkRequests.map(row => row.dealId))
  if (benchmarkDealIds.length === 0) return benchmarkByCategoryKey

  const benchmarkMetricByExternalDealId = await loadDealMetricsByExternalDealIds(benchmarkDealIds)
  if (benchmarkMetricByExternalDealId.size === 0) return benchmarkByCategoryKey

  const revenuesByCategoryKey = new Map<string, number[]>()
  for (const row of benchmarkRequests) {
    if (!row.dealId) continue

    const metric = benchmarkMetricByExternalDealId.get(row.dealId)
    if (!metric) continue
    if (!isWithinLastDays(metric, CATEGORY_BENCHMARK_LOOKBACK_DAYS)) continue

    const netRevenue = Number(metric.netRevenue)
    if (!Number.isFinite(netRevenue) || netRevenue <= 0) continue

    const keys = buildCategoryKeys(
      row.parentCategory,
      row.subCategory1,
      row.subCategory2,
      row.subCategory3,
      row.subCategory4
    )
    if (keys.length === 0) continue

    for (const key of new Set(keys)) {
      const currentValues = revenuesByCategoryKey.get(key) || []
      currentValues.push(netRevenue)
      revenuesByCategoryKey.set(key, currentValues)
    }
  }

  for (const [categoryKey, values] of revenuesByCategoryKey.entries()) {
    if (values.length < CATEGORY_BENCHMARK_MIN_SAMPLE_SIZE) continue

    const median = computeMedian(values)
    if (median === null || !Number.isFinite(median) || median <= 0) continue

    benchmarkByCategoryKey.set(categoryKey, {
      medianRevenue: roundCurrency(median),
    })
  }

  return benchmarkByCategoryKey
}

async function buildCategoryBenchmarkByRequestId(
  requests: ProjectionRequestRow[]
): Promise<Map<string, CategoryBenchmarkStats>> {
  const byRequestId = new Map<string, CategoryBenchmarkStats>()
  if (requests.length === 0) return byRequestId

  const targetParentCategories = [
    ...new Set(
      requests
        .map(request => request.parentCategory?.trim())
        .filter((value): value is string => !!value)
    ),
  ]
  if (targetParentCategories.length === 0) return byRequestId

  const benchmarkByCategoryKey = await buildCategoryBenchmarkLookupByCategoryKey(targetParentCategories)
  if (benchmarkByCategoryKey.size === 0) return byRequestId

  for (const request of requests) {
    const keys = buildCategoryKeys(
      request.parentCategory,
      request.subCategory1,
      request.subCategory2,
      request.subCategory3,
      request.subCategory4
    )
    if (keys.length === 0) continue

    for (const key of keys) {
      const stats = benchmarkByCategoryKey.get(key)
      if (stats) {
        byRequestId.set(request.id, stats)
        break
      }
    }
  }

  return byRequestId
}

async function buildCategoryBenchmarkByBusinessId(
  businesses: ProjectionBusinessRow[]
): Promise<Map<string, CategoryBenchmarkStats>> {
  const byBusinessId = new Map<string, CategoryBenchmarkStats>()
  if (businesses.length === 0) return byBusinessId

  const targetParentCategories = [
    ...new Set(
      businesses
        .map(business => business.category?.parentCategory?.trim())
        .filter((value): value is string => !!value)
    ),
  ]
  if (targetParentCategories.length === 0) return byBusinessId

  const benchmarkByCategoryKey = await buildCategoryBenchmarkLookupByCategoryKey(targetParentCategories)
  if (benchmarkByCategoryKey.size === 0) return byBusinessId

  for (const business of businesses) {
    const keys = buildCategoryKeys(
      business.category?.parentCategory || null,
      business.category?.subCategory1 || null,
      business.category?.subCategory2 || null,
      business.category?.subCategory3 || null,
      business.category?.subCategory4 || null
    )
    if (keys.length === 0) continue

    for (const key of keys) {
      const stats = benchmarkByCategoryKey.get(key)
      if (stats) {
        byBusinessId.set(business.id, stats)
        break
      }
    }
  }

  return byBusinessId
}

function applyEntityFallbackProjection(
  summary: ProjectionEntitySummary,
  fallbackBusinessHistory: number | null | undefined,
  fallbackCategoryBenchmark: number | null | undefined
): ProjectionEntitySummary {
  if (summary.totalProjectedRevenue > 0) {
    if (summary.projectionSource !== 'none') return summary
    return {
      ...summary,
      projectionSource: summary.projectedRequests > 0 ? 'actual_deal' : 'none',
    }
  }

  if (fallbackBusinessHistory && fallbackBusinessHistory > 0) {
    return {
      ...summary,
      totalProjectedRevenue: roundCurrency(fallbackBusinessHistory),
      projectionSource: 'business_history',
    }
  }

  if (fallbackCategoryBenchmark && fallbackCategoryBenchmark > 0) {
    return {
      ...summary,
      totalProjectedRevenue: roundCurrency(fallbackCategoryBenchmark),
      projectionSource: 'category_benchmark',
    }
  }

  return {
    ...summary,
    projectionSource: 'none',
  }
}

async function buildBusinessHistoryByBusinessId(
  businesses: ProjectionBusinessRow[]
): Promise<Map<string, BusinessHistoryStats>> {
  const byBusinessId = new Map<string, BusinessHistoryStats>()
  if (businesses.length === 0) return byBusinessId

  const businessIds = uniqueIds(businesses.map(business => business.id))
  const vendorToBusinessId = new Map<string, string>()

  for (const business of businesses) {
    if (business.osAdminVendorId && !vendorToBusinessId.has(business.osAdminVendorId)) {
      vendorToBusinessId.set(business.osAdminVendorId, business.id)
    }
  }

  const vendorIds = uniqueIds(businesses.map(business => business.osAdminVendorId))
  if (businessIds.length === 0 && vendorIds.length === 0) return byBusinessId

  const dealMetrics = await prisma.dealMetrics.findMany({
    where: {
      OR: [
        businessIds.length > 0 ? { businessId: { in: businessIds } } : undefined,
        vendorIds.length > 0 ? { externalVendorId: { in: vendorIds } } : undefined,
      ].filter(Boolean) as Prisma.DealMetricsWhereInput[],
    },
    select: {
      businessId: true,
      externalVendorId: true,
      netRevenue: true,
      runAt: true,
      endAt: true,
      lastSyncedAt: true,
    },
  })

  const revenuesByBusinessId = new Map<string, Array<{ revenue: number; sortDate: Date }>>()
  for (const metric of dealMetrics) {
    const revenue = Number(metric.netRevenue)
    if (!Number.isFinite(revenue) || revenue <= 0) continue

    const sortDate = getMetricReferenceDate({
      endAt: metric.endAt,
      runAt: metric.runAt,
      lastSyncedAt: metric.lastSyncedAt,
    })
    if (!sortDate) continue

    const businessId = metric.businessId || (metric.externalVendorId ? vendorToBusinessId.get(metric.externalVendorId) : undefined)
    if (!businessId) continue

    const existingRows = revenuesByBusinessId.get(businessId) || []
    existingRows.push({ revenue, sortDate })
    revenuesByBusinessId.set(businessId, existingRows)
  }

  for (const [businessId, values] of revenuesByBusinessId.entries()) {
    if (values.length === 0) continue

    const recentValues = values
      .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      .slice(0, BUSINESS_HISTORY_RECENT_DEALS_SAMPLE_SIZE)
      .map(value => value.revenue)

    const median = computeMedian(recentValues)
    if (median === null || !Number.isFinite(median) || median <= 0) continue

    byBusinessId.set(businessId, { medianRevenue: roundCurrency(median) })
  }

  return byBusinessId
}

async function getRoleScopedBookingRequestWhere(
  userId: string,
  roleOverride?: string
): Promise<Prisma.BookingRequestWhereInput | null> {
  const role = roleOverride ?? await getUserRole()
  if (role === 'admin') return {}
  if (role === 'sales') return { userId }

  // Keep parity with booking actions: non-admin/sales gets empty datasets.
  return null
}

interface BuildProjectionRowsOptions {
  scopedBusinesses?: ProjectionBusinessRow[]
}

async function buildProjectionRows(
  requests: ProjectionRequestRow[],
  options: BuildProjectionRowsOptions = {}
): Promise<BookingRequestProjectionRow[]> {
  if (requests.length === 0) return []

  const opportunityIds = [...new Set(
    requests
      .map(request => request.opportunityId)
      .filter((id): id is string => !!id)
  )]

  const externalDealIds = [...new Set(
    requests
      .map(request => request.dealId)
      .filter((id): id is string => !!id)
  )]

  const scopedBusinesses = options.scopedBusinesses
  const businessesPromise = scopedBusinesses
    ? Promise.resolve(scopedBusinesses)
    : prisma.business.findMany({
        select: {
          id: true,
          name: true,
          contactEmail: true,
          osAdminVendorId: true,
          metricsLastSyncedAt: true,
        },
      }) as Promise<ProjectionBusinessRow[]>

  const [businesses, opportunities, metricByExternalDealId, categoryBenchmarkByRequestId] = await Promise.all([
    businessesPromise,
    opportunityIds.length > 0
      ? prisma.opportunity.findMany({
          where: { id: { in: opportunityIds } },
          select: { id: true, businessId: true },
        })
      : Promise.resolve([] as Array<{ id: string; businessId: string | null }>),
    loadDealMetricsByExternalDealIds(externalDealIds),
    buildCategoryBenchmarkByRequestId(requests),
  ])

  const businessById = new Map<string, ProjectionBusinessRow>()
  const businessByEmail = new Map<string, ProjectionBusinessRow>()
  const businessByName = new Map<string, ProjectionBusinessRow>()

  for (const business of businesses) {
    businessById.set(business.id, business)

    const emailKey = normalizeLookupKey(business.contactEmail)
    if (emailKey && !businessByEmail.has(emailKey)) {
      businessByEmail.set(emailKey, business)
    }

    const nameKey = normalizeLookupKey(business.name)
    if (nameKey && !businessByName.has(nameKey)) {
      businessByName.set(nameKey, business)
    }
  }

  const businessIdByOpportunityId = new Map<string, string>()
  for (const opportunity of opportunities) {
    if (opportunity.businessId) {
      businessIdByOpportunityId.set(opportunity.id, opportunity.businessId)
    }
  }

  const matchedBusinessByRequestId = new Map<string, ProjectionBusinessRow | null>()
  for (const request of requests) {
    let matchedBusiness: ProjectionBusinessRow | null = null

    const businessIdFromOpportunity = request.opportunityId
      ? businessIdByOpportunityId.get(request.opportunityId)
      : undefined
    if (businessIdFromOpportunity) {
      matchedBusiness = businessById.get(businessIdFromOpportunity) || null
    }

    if (!matchedBusiness) {
      const emailKey = normalizeLookupKey(request.businessEmail)
      if (emailKey) {
        matchedBusiness = businessByEmail.get(emailKey) || null
      }
    }

    if (!matchedBusiness) {
      const merchantKey = normalizeLookupKey(request.merchant)
      if (merchantKey) {
        matchedBusiness = businessByName.get(merchantKey) || null
      }
    }

    matchedBusinessByRequestId.set(request.id, matchedBusiness)
  }

  const matchedBusinesses = [
    ...new Map(
      [...matchedBusinessByRequestId.values()]
        .filter((business): business is ProjectionBusinessRow => !!business)
        .map(business => [business.id, business])
    ).values(),
  ]
  const businessHistoryByBusinessId = await buildBusinessHistoryByBusinessId(matchedBusinesses)

  return requests.map((request) => {
    const matchedBusiness = matchedBusinessByRequestId.get(request.id) || null

    const actualMetric = request.dealId ? metricByExternalDealId.get(request.dealId) : undefined
    const businessHistoryRevenue = matchedBusiness
      ? businessHistoryByBusinessId.get(matchedBusiness.id)?.medianRevenue || null
      : null
    const categoryBenchmark = categoryBenchmarkByRequestId.get(request.id)

    let projectedRevenue: number | null = null
    let projectionSource: ProjectionSource = 'none'
    let confidence: ProjectionConfidence = 'none'

    if (actualMetric) {
      const netRevenue = Number(actualMetric.netRevenue)
      if (Number.isFinite(netRevenue) && netRevenue > 0) {
        projectedRevenue = roundCurrency(netRevenue)
        projectionSource = 'actual_deal'
        confidence = 'high'
      }
    }

    if (projectedRevenue === null && businessHistoryRevenue && businessHistoryRevenue > 0) {
      projectedRevenue = roundCurrency(businessHistoryRevenue)
      projectionSource = 'business_history'
      confidence = 'medium'
    }

    if (projectedRevenue === null && categoryBenchmark) {
      projectedRevenue = categoryBenchmark.medianRevenue
      projectionSource = 'category_benchmark'
      confidence = 'low'
    }

    const bucket: ProjectionBucket =
      request.status === 'booked'
        ? 'booked'
        : IN_PROCESS_STATUSES.has(request.status)
          ? 'in_process'
          : 'other'

    return {
      requestId: request.id,
      requestName: request.name,
      merchant: request.merchant,
      businessEmail: request.businessEmail,
      status: request.status,
      startDate: request.startDate,
      endDate: request.endDate,
      createdAt: request.createdAt,
      processedAt: request.processedAt,
      dealId: request.dealId,
      opportunityId: request.opportunityId,
      projectedRevenue,
      projectionSource,
      confidence,
      bucket,
      businessId: matchedBusiness?.id || null,
      businessName: matchedBusiness?.name || null,
      vendorId: actualMetric?.externalVendorId || matchedBusiness?.osAdminVendorId || null,
      metricsLastSyncedAt: actualMetric?.lastSyncedAt || matchedBusiness?.metricsLastSyncedAt || null,
    }
  })
}

function buildDashboardSummary(rows: BookingRequestProjectionRow[]): ProjectionDashboardSummary {
  const inProcessRows = rows.filter(row => row.bucket === 'in_process')
  const bookedRows = rows.filter(row => row.bucket === 'booked')

  const projectedInProcessRows = inProcessRows.filter(row => row.projectedRevenue !== null)
  const projectedBookedRows = bookedRows.filter(row => row.projectedRevenue !== null)

  const totalProjectedInProcessRevenue = roundCurrency(
    projectedInProcessRows.reduce((sum, row) => sum + (row.projectedRevenue || 0), 0)
  )
  const totalProjectedBookedRevenue = roundCurrency(
    projectedBookedRows.reduce((sum, row) => sum + (row.projectedRevenue || 0), 0)
  )

  const latestMetricsSyncAt = rows.reduce<Date | null>((latest, row) => {
    if (!row.metricsLastSyncedAt) return latest
    if (!latest || row.metricsLastSyncedAt > latest) return row.metricsLastSyncedAt
    return latest
  }, null)

  const inProcessCoveragePct = inProcessRows.length > 0
    ? roundCurrency((projectedInProcessRows.length / inProcessRows.length) * 100)
    : 0
  const bookedCoveragePct = bookedRows.length > 0
    ? roundCurrency((projectedBookedRows.length / bookedRows.length) * 100)
    : 0

  return {
    totalInProcessRequests: inProcessRows.length,
    totalBookedRequests: bookedRows.length,
    totalProjectedInProcessRevenue,
    totalProjectedBookedRevenue,
    totalProjectedRevenue: roundCurrency(totalProjectedInProcessRevenue + totalProjectedBookedRevenue),
    projectedInProcessCount: projectedInProcessRows.length,
    projectedBookedCount: projectedBookedRows.length,
    inProcessCoveragePct,
    bookedCoveragePct,
    latestMetricsSyncAt,
  }
}

/**
 * Returns projection values keyed by booking request ID.
 * Useful for augmenting existing request lists in client tables.
 */
export async function getBookingRequestProjectionMap(requestIds: string[]): Promise<{
  success: boolean
  data?: Record<string, BookingRequestProjectionValue>
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!requestIds || requestIds.length === 0) {
    return { success: true, data: {} }
  }

  try {
    const whereRole = await getRoleScopedBookingRequestWhere(authResult.userId)
    if (whereRole === null) {
      return { success: true, data: {} }
    }

    const requests = await prisma.bookingRequest.findMany({
      where: {
        ...whereRole,
        id: { in: requestIds },
      },
      select: {
        id: true,
        name: true,
        merchant: true,
        businessEmail: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        processedAt: true,
        dealId: true,
        opportunityId: true,
        parentCategory: true,
        subCategory1: true,
        subCategory2: true,
        subCategory3: true,
        subCategory4: true,
      },
    }) as ProjectionRequestRow[]

    const rows = await buildProjectionRows(requests)
    const data: Record<string, BookingRequestProjectionValue> = {}

    for (const row of rows) {
      data[row.requestId] = {
        projectedRevenue: row.projectedRevenue,
        projectionSource: row.projectionSource,
        confidence: row.confidence,
        bucket: row.bucket,
        businessId: row.businessId,
        businessName: row.businessName,
        vendorId: row.vendorId,
        metricsLastSyncedAt: row.metricsLastSyncedAt,
      }
    }

    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getBookingRequestProjectionMap')
  }
}

export async function getBusinessProjectionSummaryMap(
  businessIds: string[]
): Promise<ProjectionEntitySummaryMapResult> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  const normalizedBusinessIds = uniqueIds(businessIds)
  if (normalizedBusinessIds.length === 0) {
    return { success: true, data: {} }
  }
  const sortedBusinessIds = [...normalizedBusinessIds].sort()

  try {
    const role = await getUserRole()
    const whereRole = await getRoleScopedBookingRequestWhere(authResult.userId, role)
    if (whereRole === null) {
      return { success: true, data: {} }
    }

    const cacheKey = buildBusinessProjectionSummaryCacheKey({
      role,
      userId: authResult.userId,
      businessIds: sortedBusinessIds,
    })

    pruneExpiredBusinessProjectionSummaryCache()
    const cachedEntry = businessProjectionSummaryCache.get(cacheKey)
    if (cachedEntry) {
      return { success: true, data: cachedEntry.data }
    }

    const inFlightRequest = businessProjectionSummaryInFlight.get(cacheKey)
    if (inFlightRequest) {
      return inFlightRequest
    }

    const computePromise: Promise<ProjectionEntitySummaryMapResult> = (async () => {
      const businesses = await prisma.business.findMany({
        where: { id: { in: normalizedBusinessIds } },
        select: {
          id: true,
          name: true,
          contactEmail: true,
          osAdminVendorId: true,
          metricsLastSyncedAt: true,
          category: {
            select: {
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
              subCategory3: true,
              subCategory4: true,
            },
          },
        },
      })

      if (businesses.length === 0) {
        return { success: true, data: {} }
      }

      const linkedOpportunities = await prisma.opportunity.findMany({
        where: { businessId: { in: normalizedBusinessIds } },
        select: { id: true },
      })

      const merchantMatchers: Prisma.BookingRequestWhereInput[] = uniqueIds(businesses.map(business => business.name))
        .map(name => ({
          merchant: { equals: name, mode: 'insensitive' as const },
        }))

      const emailMatchers: Prisma.BookingRequestWhereInput[] = uniqueIds(businesses.map(business => business.contactEmail))
        .map(email => ({
          businessEmail: { equals: email, mode: 'insensitive' as const },
        }))

      const requestOrConditions: Prisma.BookingRequestWhereInput[] = [
        ...(linkedOpportunities.length > 0
          ? [{ opportunityId: { in: linkedOpportunities.map(opportunity => opportunity.id) } }]
          : []),
        ...merchantMatchers,
        ...emailMatchers,
      ]

      const requests = requestOrConditions.length === 0
        ? ([] as ProjectionRequestRow[])
        : await prisma.bookingRequest.findMany({
            where: {
              ...whereRole,
              status: { in: INCLUDED_DASHBOARD_STATUSES },
              OR: requestOrConditions,
            },
            select: {
              id: true,
              name: true,
              merchant: true,
              businessEmail: true,
              status: true,
              startDate: true,
              endDate: true,
              createdAt: true,
              processedAt: true,
              dealId: true,
              opportunityId: true,
              parentCategory: true,
              subCategory1: true,
              subCategory2: true,
              subCategory3: true,
              subCategory4: true,
            },
          }) as ProjectionRequestRow[]

      const rows = await buildProjectionRows(requests, {
        scopedBusinesses: businesses as ProjectionBusinessRow[],
      })
      const requestedBusinessIdSet = new Set(normalizedBusinessIds)
      const filteredRows = rows.filter(row => row.businessId && requestedBusinessIdSet.has(row.businessId))

      const summaryMap = buildProjectionEntitySummaryMap(filteredRows, row => row.businessId)
      const businessHistoryByBusinessId = await buildBusinessHistoryByBusinessId(businesses)
      const categoryBenchmarkByBusinessId = await buildCategoryBenchmarkByBusinessId(businesses)
      const data: Record<string, ProjectionEntitySummary> = {}
      for (const business of businesses) {
        const summary = summaryMap[business.id] || getEmptyProjectionEntitySummary()
        data[business.id] = applyEntityFallbackProjection(
          summary,
          businessHistoryByBusinessId.get(business.id)?.medianRevenue,
          categoryBenchmarkByBusinessId.get(business.id)?.medianRevenue
        )
      }
      for (const businessId of normalizedBusinessIds) {
        if (!data[businessId]) {
          data[businessId] = getEmptyProjectionEntitySummary()
        }
      }

      pruneExpiredBusinessProjectionSummaryCache()
      businessProjectionSummaryCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + CACHE_SERVER_BUSINESS_PROJECTION_SUMMARY_MS,
      })

      return { success: true, data }
    })()

    businessProjectionSummaryInFlight.set(cacheKey, computePromise)
    try {
      return await computePromise
    } finally {
      businessProjectionSummaryInFlight.delete(cacheKey)
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessProjectionSummaryMap')
  }
}

export async function getOpportunityProjectionSummaryMap(
  opportunityIds: string[]
): Promise<ProjectionEntitySummaryMapResult> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  const normalizedOpportunityIds = uniqueIds(opportunityIds)
  if (normalizedOpportunityIds.length === 0) {
    return { success: true, data: {} }
  }

  try {
    const whereRole = await getRoleScopedBookingRequestWhere(authResult.userId)
    if (whereRole === null) {
      return { success: true, data: {} }
    }

    const opportunities = await prisma.opportunity.findMany({
      where: { id: { in: normalizedOpportunityIds } },
      select: {
        id: true,
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            osAdminVendorId: true,
            metricsLastSyncedAt: true,
            category: {
              select: {
                parentCategory: true,
                subCategory1: true,
                subCategory2: true,
                subCategory3: true,
                subCategory4: true,
              },
            },
          },
        },
      },
    })

    const businessById = new Map<string, ProjectionBusinessRow>()
    const businessIdByOpportunityId = new Map<string, string>()
    for (const opportunity of opportunities) {
      if (opportunity.businessId && opportunity.business) {
        businessById.set(opportunity.businessId, opportunity.business as ProjectionBusinessRow)
        businessIdByOpportunityId.set(opportunity.id, opportunity.businessId)
      }
    }

    const businesses = [...businessById.values()]
    const businessHistoryByBusinessId = await buildBusinessHistoryByBusinessId(businesses)
    const categoryBenchmarkByBusinessId = await buildCategoryBenchmarkByBusinessId(businesses)

    const requests = await prisma.bookingRequest.findMany({
      where: {
        ...whereRole,
        opportunityId: { in: normalizedOpportunityIds },
        status: { in: INCLUDED_DASHBOARD_STATUSES },
      },
      select: {
        id: true,
        name: true,
        merchant: true,
        businessEmail: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        processedAt: true,
        dealId: true,
        opportunityId: true,
        parentCategory: true,
        subCategory1: true,
        subCategory2: true,
        subCategory3: true,
        subCategory4: true,
      },
    }) as ProjectionRequestRow[]

    const rows = await buildProjectionRows(requests, { scopedBusinesses: businesses })
    const summaryMap = buildProjectionEntitySummaryMap(rows, row => row.opportunityId)
    const data: Record<string, ProjectionEntitySummary> = {}
    for (const opportunityId of normalizedOpportunityIds) {
      const summary = summaryMap[opportunityId] || getEmptyProjectionEntitySummary()
      const linkedBusinessId = businessIdByOpportunityId.get(opportunityId)
      data[opportunityId] = applyEntityFallbackProjection(
        summary,
        linkedBusinessId ? businessHistoryByBusinessId.get(linkedBusinessId)?.medianRevenue : null,
        linkedBusinessId ? categoryBenchmarkByBusinessId.get(linkedBusinessId)?.medianRevenue : null
      )
    }

    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunityProjectionSummaryMap')
  }
}

/**
 * Returns projection dashboard data for in-process and booked requests.
 */
export async function getRevenueProjectionDashboardData(): Promise<{
  success: boolean
  data?: BookingRequestProjectionRow[]
  summary?: ProjectionDashboardSummary
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const whereRole = await getRoleScopedBookingRequestWhere(authResult.userId)
    if (whereRole === null) {
      return {
        success: true,
        data: [],
        summary: {
          totalInProcessRequests: 0,
          totalBookedRequests: 0,
          totalProjectedInProcessRevenue: 0,
          totalProjectedBookedRevenue: 0,
          totalProjectedRevenue: 0,
          projectedInProcessCount: 0,
          projectedBookedCount: 0,
          inProcessCoveragePct: 0,
          bookedCoveragePct: 0,
          latestMetricsSyncAt: null,
        },
      }
    }

    const requests = await prisma.bookingRequest.findMany({
      where: {
        ...whereRole,
        status: { in: INCLUDED_DASHBOARD_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        merchant: true,
        businessEmail: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        processedAt: true,
        dealId: true,
        opportunityId: true,
        parentCategory: true,
        subCategory1: true,
        subCategory2: true,
        subCategory3: true,
        subCategory4: true,
      },
    }) as ProjectionRequestRow[]

    const rows = await buildProjectionRows(requests)
    const summary = buildDashboardSummary(rows)

    return { success: true, data: rows, summary }
  } catch (error) {
    return handleServerActionError(error, 'getRevenueProjectionDashboardData')
  }
}
