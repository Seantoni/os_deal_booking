import { prisma } from '@/lib/prisma'
import { ONE_DAY_MS } from '@/lib/constants/time'
import {
  formatDateForPanama,
  getTodayInPanama,
  parseDateInPanamaTime,
} from '@/lib/date/timezone'

export interface BusinessApprovedRequestAgingRecord {
  businessId: string
  lastApprovedAt: Date | null
  daysSinceLastApproved: number | null
  hasApprovedRequest: boolean
}

function normalizeLookupValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized ? normalized : null
}

function createEmptyRecord(businessId: string): BusinessApprovedRequestAgingRecord {
  return {
    businessId,
    lastApprovedAt: null,
    daysSinceLastApproved: null,
    hasApprovedRequest: false,
  }
}

function updateLatestApprovedAt(
  resultMap: Map<string, BusinessApprovedRequestAgingRecord>,
  businessId: string,
  approvedAt: Date
) {
  const existing = resultMap.get(businessId) || createEmptyRecord(businessId)

  if (!existing.lastApprovedAt || approvedAt > existing.lastApprovedAt) {
    existing.lastApprovedAt = approvedAt
    existing.hasApprovedRequest = true
    resultMap.set(businessId, existing)
  }
}

function buildDaysSinceLastApproved(approvedAt: Date): number {
  const todayPanama = parseDateInPanamaTime(getTodayInPanama())
  const approvedDayPanama = parseDateInPanamaTime(formatDateForPanama(approvedAt))
  return Math.max(0, Math.floor((todayPanama.getTime() - approvedDayPanama.getTime()) / ONE_DAY_MS))
}

export async function getBusinessApprovedRequestAgingByIds(
  businessIds: string[]
): Promise<Map<string, BusinessApprovedRequestAgingRecord>> {
  const normalizedBusinessIds = [...new Set(
    businessIds
      .map((businessId) => businessId?.trim())
      .filter((businessId): businessId is string => Boolean(businessId))
  )]

  const resultMap = new Map<string, BusinessApprovedRequestAgingRecord>()
  for (const businessId of normalizedBusinessIds) {
    resultMap.set(businessId, createEmptyRecord(businessId))
  }

  if (normalizedBusinessIds.length === 0) {
    return resultMap
  }

  const [businesses, opportunities, eventRows] = await Promise.all([
    prisma.business.findMany({
      where: { id: { in: normalizedBusinessIds } },
      select: {
        id: true,
        name: true,
        contactEmail: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { businessId: { in: normalizedBusinessIds } },
      select: {
        id: true,
        businessId: true,
      },
    }),
    prisma.event.findMany({
      where: {
        businessId: { in: normalizedBusinessIds },
        bookingRequestId: { not: null },
      },
      select: {
        bookingRequestId: true,
        businessId: true,
      },
    }),
  ])

  if (businesses.length === 0) {
    return resultMap
  }

  const opportunityIds = opportunities.map((opportunity) => opportunity.id)
  const opportunityToBusinessId = new Map(
    opportunities.map((opportunity) => [opportunity.id, opportunity.businessId])
  )

  const eventRequestToBusinessIds = new Map<string, Set<string>>()
  for (const row of eventRows) {
    if (!row.bookingRequestId || !row.businessId) continue
    const existing = eventRequestToBusinessIds.get(row.bookingRequestId) || new Set<string>()
    existing.add(row.businessId)
    eventRequestToBusinessIds.set(row.bookingRequestId, existing)
  }

  const businessNameToIds = new Map<string, string[]>()
  const businessEmailToIds = new Map<string, string[]>()
  for (const business of businesses) {
    const normalizedName = normalizeLookupValue(business.name)
    if (normalizedName) {
      const existing = businessNameToIds.get(normalizedName) || []
      existing.push(business.id)
      businessNameToIds.set(normalizedName, existing)
    }

    const normalizedEmail = normalizeLookupValue(business.contactEmail)
    if (normalizedEmail) {
      const existing = businessEmailToIds.get(normalizedEmail) || []
      existing.push(business.id)
      businessEmailToIds.set(normalizedEmail, existing)
    }
  }

  const directBusinessIdConditions = normalizedBusinessIds.length > 0
    ? [{ businessId: { in: normalizedBusinessIds } }]
    : []
  const opportunityConditions = opportunityIds.length > 0
    ? [{ opportunityId: { in: opportunityIds } }]
    : []
  const merchantConditions = [...businessNameToIds.keys()].map((businessName) => ({
    merchant: { equals: businessName, mode: 'insensitive' as const },
  }))
  const emailConditions = [...businessEmailToIds.keys()].map((businessEmail) => ({
    businessEmail: { equals: businessEmail, mode: 'insensitive' as const },
  }))

  const approvedRequests = await prisma.bookingRequest.findMany({
    where: {
      approvedAt: { not: null },
      OR: [
        ...directBusinessIdConditions,
        ...opportunityConditions,
        ...merchantConditions,
        ...emailConditions,
      ],
    },
    select: {
      id: true,
      businessId: true,
      approvedAt: true,
      opportunityId: true,
      merchant: true,
      businessEmail: true,
    },
  })

  for (const request of approvedRequests) {
    if (!request.approvedAt) continue

    const matchingBusinessIds = new Set<string>()

    if (request.businessId && resultMap.has(request.businessId)) {
      matchingBusinessIds.add(request.businessId)
    }

    if (request.opportunityId) {
      const opportunityBusinessId = opportunityToBusinessId.get(request.opportunityId)
      if (opportunityBusinessId) {
        matchingBusinessIds.add(opportunityBusinessId)
      }
    }

    const eventBusinessIds = eventRequestToBusinessIds.get(request.id)
    if (eventBusinessIds) {
      for (const businessId of eventBusinessIds) {
        matchingBusinessIds.add(businessId)
      }
    }

    const normalizedMerchant = normalizeLookupValue(request.merchant)
    if (normalizedMerchant) {
      const merchantBusinessIds = businessNameToIds.get(normalizedMerchant) || []
      for (const businessId of merchantBusinessIds) {
        matchingBusinessIds.add(businessId)
      }
    }

    const normalizedEmail = normalizeLookupValue(request.businessEmail)
    if (normalizedEmail) {
      const emailBusinessIds = businessEmailToIds.get(normalizedEmail) || []
      for (const businessId of emailBusinessIds) {
        matchingBusinessIds.add(businessId)
      }
    }

    for (const businessId of matchingBusinessIds) {
      updateLatestApprovedAt(resultMap, businessId, request.approvedAt)
    }
  }

  for (const [businessId, record] of resultMap.entries()) {
    if (!record.lastApprovedAt) {
      resultMap.set(businessId, record)
      continue
    }

    resultMap.set(businessId, {
      ...record,
      daysSinceLastApproved: buildDaysSinceLastApproved(record.lastApprovedAt),
    })
  }

  return resultMap
}
