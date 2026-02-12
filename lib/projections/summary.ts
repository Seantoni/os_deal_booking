export type ProjectionBucket = 'in_process' | 'booked' | 'other'
export type ProjectionSource = 'actual_deal' | 'business_history' | 'category_benchmark' | 'none'

export interface ProjectionAggregateRow {
  projectedRevenue: number | null
  projectionSource?: ProjectionSource
  bucket: ProjectionBucket
  metricsLastSyncedAt: Date | string | null
}

export interface ProjectionEntitySummary {
  totalRequests: number
  projectedRequests: number
  coveragePct: number
  totalProjectedRevenue: number
  inProcessRequests: number
  inProcessProjectedCount: number
  inProcessProjectedRevenue: number
  bookedRequests: number
  bookedProjectedCount: number
  bookedProjectedRevenue: number
  latestMetricsSyncAt: Date | null
  projectionSource: ProjectionSource
}

const SOURCE_PRIORITY: Record<ProjectionSource, number> = {
  none: 0,
  category_benchmark: 1,
  business_history: 2,
  actual_deal: 3,
}

function pickHigherPrioritySource(current: ProjectionSource, incoming: ProjectionSource): ProjectionSource {
  return SOURCE_PRIORITY[incoming] > SOURCE_PRIORITY[current] ? incoming : current
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getEmptyProjectionEntitySummary(): ProjectionEntitySummary {
  return {
    totalRequests: 0,
    projectedRequests: 0,
    coveragePct: 0,
    totalProjectedRevenue: 0,
    inProcessRequests: 0,
    inProcessProjectedCount: 0,
    inProcessProjectedRevenue: 0,
    bookedRequests: 0,
    bookedProjectedCount: 0,
    bookedProjectedRevenue: 0,
    latestMetricsSyncAt: null,
    projectionSource: 'none',
  }
}

export function buildProjectionEntitySummary(rows: ProjectionAggregateRow[]): ProjectionEntitySummary {
  if (rows.length === 0) return getEmptyProjectionEntitySummary()

  const summary = getEmptyProjectionEntitySummary()
  summary.totalRequests = rows.length

  for (const row of rows) {
    const value = row.projectedRevenue
    const hasProjection = value !== null && Number.isFinite(value)

    if (row.bucket === 'in_process') {
      summary.inProcessRequests += 1
      if (hasProjection) {
        summary.inProcessProjectedCount += 1
        summary.inProcessProjectedRevenue += value as number
      }
    } else if (row.bucket === 'booked') {
      summary.bookedRequests += 1
      if (hasProjection) {
        summary.bookedProjectedCount += 1
        summary.bookedProjectedRevenue += value as number
      }
    }

    if (hasProjection) {
      summary.projectedRequests += 1
      summary.totalProjectedRevenue += value as number
      summary.projectionSource = pickHigherPrioritySource(
        summary.projectionSource,
        row.projectionSource ?? 'none'
      )
    }

    const metricsDate = toDate(row.metricsLastSyncedAt)
    if (metricsDate && (!summary.latestMetricsSyncAt || metricsDate > summary.latestMetricsSyncAt)) {
      summary.latestMetricsSyncAt = metricsDate
    }
  }

  summary.inProcessProjectedRevenue = roundCurrency(summary.inProcessProjectedRevenue)
  summary.bookedProjectedRevenue = roundCurrency(summary.bookedProjectedRevenue)
  summary.totalProjectedRevenue = roundCurrency(summary.totalProjectedRevenue)
  summary.coveragePct = summary.totalRequests > 0
    ? roundCurrency((summary.projectedRequests / summary.totalRequests) * 100)
    : 0

  // Backward-safe default for callers that don't provide per-row sources.
  if (summary.projectedRequests > 0 && summary.projectionSource === 'none') {
    summary.projectionSource = 'actual_deal'
  }

  return summary
}

export function buildProjectionEntitySummaryMap<Row extends ProjectionAggregateRow>(
  rows: Row[],
  getKey: (row: Row) => string | null | undefined
): Record<string, ProjectionEntitySummary> {
  const groupedRows = new Map<string, Row[]>()

  for (const row of rows) {
    const key = getKey(row)
    if (!key) continue
    const existingRows = groupedRows.get(key) || []
    existingRows.push(row)
    groupedRows.set(key, existingRows)
  }

  const summaryMap: Record<string, ProjectionEntitySummary> = {}
  for (const [key, valueRows] of groupedRows.entries()) {
    summaryMap[key] = buildProjectionEntitySummary(valueRows)
  }

  return summaryMap
}
