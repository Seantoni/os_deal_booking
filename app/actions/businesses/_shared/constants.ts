import { Prisma } from '@prisma/client'

export type BusinessWhereClause = Prisma.BusinessWhereInput

export const ARCHIVED_BUSINESS_STATUS = 'archived'

/**
 * Prisma WHERE condition that excludes archived businesses while including NULLs.
 *
 * Prisma's `{ not: 'archived' }` and `{ NOT: { reassignmentStatus: 'archived' } }`
 * both generate SQL `!= 'archived'` which excludes NULL values due to SQL
 * three-valued logic. This explicit OR guarantees NULLs are included.
 */
export const NOT_ARCHIVED_CONDITION: Prisma.BusinessWhereInput = {
  OR: [
    { reassignmentStatus: null },
    { reassignmentStatus: { not: ARCHIVED_BUSINESS_STATUS } },
  ],
}

/**
 * Sales-visible reassignment condition.
 *
 * Sales users should normally not see businesses pending reassignment.
 * Exception: auto-generated recurring reassignments must remain visible so
 * owners can keep working those accounts until reassignment is completed.
 */
export const SALES_VISIBLE_REASSIGNMENT_CONDITION: Prisma.BusinessWhereInput = {
  OR: [
    { reassignmentStatus: null },
    {
      AND: [
        { reassignmentStatus: 'pending_reassign' },
        { reassignmentType: 'recurrente' },
        { reassignmentRequestedBy: 'system-cron' },
        { reassignmentReason: { contains: 'Auto: Negocio recurrente', mode: 'insensitive' } },
      ],
    },
  ],
}

// Map column names to database fields for sorting
export const SORT_COLUMN_MAP: Record<string, string> = {
  topSold: 'topSoldQuantity',
  topRevenue: 'topRevenueAmount',
  lastLaunch: 'lastLaunchDate',
  deals360d: 'totalDeals360d',
}

export const LIVE_METRIC_SORT_COLUMNS = new Set(['topSold', 'topRevenue', 'lastLaunch', 'deals360d'])

export const BUSINESS_LIST_INCLUDE = Prisma.validator<Prisma.BusinessInclude>()({
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

export type BusinessListRecord = Prisma.BusinessGetPayload<{
  include: typeof BUSINESS_LIST_INCLUDE
}>

export type BusinessDealMetricsDisplayFields = {
  osAdminVendorId?: string | null
  topSoldQuantity?: number | null
  topSoldDealUrl?: string | null
  topRevenueAmount?: number | string | Prisma.Decimal | null
  topRevenueDealUrl?: string | null
  lastLaunchDate?: Date | string | null
  totalDeals360d?: number | null
}
