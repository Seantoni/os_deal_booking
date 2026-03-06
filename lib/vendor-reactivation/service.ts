import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { getDealById } from '@/lib/api/external-oferta'
import { mapApiToBookingForm } from '@/lib/api/external-oferta/deal/mapper'
import { buildCategoryKey } from '@/lib/category-utils'
import { getBusinessApprovedRequestAgingByIds } from '@/lib/business'
import {
  formatDateForPanama,
  getTodayInPanama,
  parseDateInPanamaTime,
  parseEndDateInPanamaTime,
} from '@/lib/date/timezone'
import { countBusinessRequests, generateRequestName } from '@/lib/utils/request-naming'
import { invalidateDashboard, invalidateEntities } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { DEFAULT_SETTINGS } from '@/lib/settings'

type CreateVendorReactivationBookingRequestParams = {
  businessId: string
  externalDealId: string
  triggeredBy?: 'public_link' | 'manual' | 'cron' | 'system'
}

type CreateVendorReactivationBookingRequestResult =
  | {
      success: true
      duplicate: false
      requestId: string
      eventId: string
      assignedUserId: string
    }
  | {
      success: true
      duplicate: true
      requestId: string
    }
  | {
      success: false
      error: string
    }

function deriveReplicatedDateRange(runAt: Date | null, endAt: Date | null) {
  const todayPanama = getTodayInPanama()
  const startDate = parseDateInPanamaTime(todayPanama)

  if (!runAt || !endAt) {
    const fallbackEnd = new Date(startDate.getTime() + 29 * ONE_DAY_MS)
    return {
      startDate,
      endDate: parseEndDateInPanamaTime(formatDateForPanama(fallbackEnd)),
    }
  }

  const originalStartPanama = parseDateInPanamaTime(formatDateForPanama(runAt))
  const originalEndPanama = parseDateInPanamaTime(formatDateForPanama(endAt))
  const durationDays = Math.max(
    1,
    Math.floor((originalEndPanama.getTime() - originalStartPanama.getTime()) / ONE_DAY_MS) + 1
  )
  const shiftedEndPanama = new Date(startDate.getTime() + (durationDays - 1) * ONE_DAY_MS)

  return {
    startDate,
    endDate: parseEndDateInPanamaTime(formatDateForPanama(shiftedEndPanama)),
  }
}

function normalizeJsonArray<T>(value: T[] | null | undefined): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return Array.isArray(value) && value.length > 0
    ? (value as Prisma.InputJsonValue)
    : Prisma.JsonNull
}

async function resolveAssignedUserId(businessOwnerId: string | null): Promise<string | null> {
  if (businessOwnerId) {
    return businessOwnerId
  }

  const adminUser = await prisma.userProfile.findFirst({
    where: { role: 'admin' },
    orderBy: { createdAt: 'asc' },
    select: { clerkId: true },
  })

  return adminUser?.clerkId || null
}

export interface VendorReactivationEligibleDeal {
  externalDealId: string
  dealName: string | null
  previewUrl: string | null
  dealUrl: string | null
  runAt: Date | null
  endAt: Date | null
  quantitySold: number
  netRevenue: number
  margin: number
}

export interface VendorReactivationTarget {
  businessId: string
  businessName: string
  contactEmail: string
  ownerId: string | null
  lastApprovedAt: Date | null
  lastTriggerEmailSentAt: Date | null
  daysSinceReferenceDate: number | null
  eligibleDeals: VendorReactivationEligibleDeal[]
}

export async function getVendorReactivationTargets(
  options: { limit?: number } = {}
): Promise<VendorReactivationTarget[]> {
  const [eligibleDeals, settings] = await Promise.all([
    prisma.dealMetrics.findMany({
      where: { vendorReactivateEligible: true },
      orderBy: [{ netRevenue: 'desc' }, { quantitySold: 'desc' }],
      select: {
        externalDealId: true,
        dealName: true,
        previewUrl: true,
        dealUrl: true,
        runAt: true,
        endAt: true,
        quantitySold: true,
        netRevenue: true,
        margin: true,
        externalVendorId: true,
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            ownerId: true,
          },
        },
      },
    }),
    prisma.setting.findUnique({
      where: { id: 'default' },
    }),
  ])
  const cooldownDays =
    (settings as { vendorReactivationCooldownDays?: number } | null)?.vendorReactivationCooldownDays ??
    DEFAULT_SETTINGS.vendorReactivationCooldownDays

  if (eligibleDeals.length === 0) {
    return []
  }

  const vendorIdsNeedingFallback = [...new Set(
    eligibleDeals
      .filter((deal) => !deal.business && deal.externalVendorId)
      .map((deal) => deal.externalVendorId!)
  )]
  const fallbackBusinesses = vendorIdsNeedingFallback.length > 0
    ? await prisma.business.findMany({
        where: { osAdminVendorId: { in: vendorIdsNeedingFallback } },
        select: {
          id: true,
          osAdminVendorId: true,
          name: true,
          contactEmail: true,
          ownerId: true,
        },
      })
    : []
  const fallbackBusinessByVendorId = new Map(
    fallbackBusinesses
      .filter((business) => business.osAdminVendorId)
      .map((business) => [business.osAdminVendorId!, business])
  )

  const groupedTargets = new Map<string, VendorReactivationTarget>()
  for (const deal of eligibleDeals) {
    const businessInfo = deal.business || (deal.externalVendorId
      ? fallbackBusinessByVendorId.get(deal.externalVendorId)
      : null)

    if (!businessInfo?.id || !businessInfo.contactEmail) {
      continue
    }

    const existing = groupedTargets.get(businessInfo.id) || {
      businessId: businessInfo.id,
      businessName: businessInfo.name,
      contactEmail: businessInfo.contactEmail,
      ownerId: businessInfo.ownerId || null,
      lastApprovedAt: null,
      lastTriggerEmailSentAt: null,
      daysSinceReferenceDate: null,
      eligibleDeals: [],
    }

    existing.eligibleDeals.push({
      externalDealId: deal.externalDealId,
      dealName: deal.dealName,
      previewUrl: deal.previewUrl,
      dealUrl: deal.dealUrl,
      runAt: deal.runAt,
      endAt: deal.endAt,
      quantitySold: deal.quantitySold,
      netRevenue: Number(deal.netRevenue),
      margin: Number(deal.margin),
    })
    groupedTargets.set(businessInfo.id, existing)
  }

  const businessIds = [...groupedTargets.keys()]
  const [approvedAgingMap, states] = await Promise.all([
    getBusinessApprovedRequestAgingByIds(businessIds),
    prisma.vendorReactivationState.findMany({
      where: { businessId: { in: businessIds } },
      select: { businessId: true, lastTriggerEmailSentAt: true },
    }),
  ])
  const stateByBusinessId = new Map(states.map((state) => [state.businessId, state.lastTriggerEmailSentAt]))
  const todayPanama = parseDateInPanamaTime(getTodayInPanama())

  const targets = [...groupedTargets.values()]
    .map((target) => {
      const approvedAging = approvedAgingMap.get(target.businessId)
      const lastApprovedAt = approvedAging?.lastApprovedAt || null
      const lastTriggerEmailSentAt = stateByBusinessId.get(target.businessId) || null
      const referenceDateCandidates = [lastApprovedAt, lastTriggerEmailSentAt].filter(
        (value): value is Date => Boolean(value)
      )
      const latestReferenceDate = referenceDateCandidates.length > 0
        ? new Date(Math.max(...referenceDateCandidates.map((value) => value.getTime())))
        : null

      return {
        ...target,
        lastApprovedAt,
        lastTriggerEmailSentAt,
        daysSinceReferenceDate: latestReferenceDate
          ? Math.max(
              0,
              Math.floor(
                (todayPanama.getTime() - parseDateInPanamaTime(formatDateForPanama(latestReferenceDate)).getTime()) /
                  ONE_DAY_MS
              )
            )
          : null,
      }
    })
    .filter((target) => target.daysSinceReferenceDate === null || target.daysSinceReferenceDate >= cooldownDays)
    .sort((a, b) => (b.daysSinceReferenceDate ?? 9999) - (a.daysSinceReferenceDate ?? 9999))

  if (!options.limit) {
    return targets
  }

  return targets.slice(0, options.limit)
}

export async function markVendorReactivationEmailSent(businessId: string, sentAt: Date = new Date()) {
  return prisma.vendorReactivationState.upsert({
    where: { businessId },
    update: { lastTriggerEmailSentAt: sentAt },
    create: {
      businessId,
      lastTriggerEmailSentAt: sentAt,
    },
  })
}

export async function createVendorReactivationBookingRequest(
  params: CreateVendorReactivationBookingRequestParams
): Promise<CreateVendorReactivationBookingRequestResult> {
  const externalDealId = params.externalDealId.trim()
  if (!params.businessId || !externalDealId) {
    return { success: false, error: 'Business ID and external deal ID are required' }
  }

  const business = await prisma.business.findUnique({
    where: { id: params.businessId },
    select: {
      id: true,
      name: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      ownerId: true,
      description: true,
      website: true,
      instagram: true,
      razonSocial: true,
      ruc: true,
      bank: true,
      beneficiaryName: true,
      accountNumber: true,
      accountType: true,
      paymentPlan: true,
      provinceDistrictCorregimiento: true,
      address: true,
      neighborhood: true,
      category: {
        select: {
          parentCategory: true,
          subCategory1: true,
          subCategory2: true,
          subCategory3: true,
          subCategory4: true,
          categoryKey: true,
        },
      },
    },
  })

  if (!business) {
    return { success: false, error: 'Business not found' }
  }

  const existingOpenRequest = await prisma.bookingRequest.findFirst({
    where: {
      businessId: business.id,
      sourceType: 'vendor_reactivation',
      originExternalDealId: externalDealId,
      status: { in: ['draft', 'pending', 'approved'] },
    },
    select: { id: true },
  })

  if (existingOpenRequest) {
    return {
      success: true,
      duplicate: true,
      requestId: existingOpenRequest.id,
    }
  }

  const assignedUserId = await resolveAssignedUserId(business.ownerId)
  if (!assignedUserId) {
    return { success: false, error: 'No assigned sales owner or admin fallback found' }
  }

  const externalFetchTrigger = params.triggeredBy === 'public_link'
    ? 'manual'
    : (params.triggeredBy || 'system')

  const [dealMetrics, externalDealResult] = await Promise.all([
    prisma.dealMetrics.findUnique({
      where: { externalDealId },
      select: {
        dealName: true,
        runAt: true,
        endAt: true,
      },
    }),
    getDealById(externalDealId, {
      userId: assignedUserId,
      triggeredBy: externalFetchTrigger,
    }),
  ])

  if (!externalDealResult.success || !externalDealResult.data) {
    return {
      success: false,
      error: externalDealResult.error || `Could not fetch external deal ${externalDealId}`,
    }
  }

  const externalDealData = externalDealResult.data
  const dealFormData = mapApiToBookingForm(externalDealData)
  const { startDate, endDate } = deriveReplicatedDateRange(dealMetrics?.runAt || null, dealMetrics?.endAt || null)

  const requestName = generateRequestName(
    business.name,
    await countBusinessRequests(business.name)
  )
  const standardizedCategory = business.category
    ? buildCategoryKey(
        business.category.parentCategory,
        business.category.subCategory1,
        business.category.subCategory2,
        business.category.subCategory3,
        business.category.subCategory4,
        business.category.categoryKey
      )
    : null

  const pricingOptionsJson = normalizeJsonArray(dealFormData.pricingOptions || null)
  const dealImagesJson = normalizeJsonArray(dealFormData.dealImages || null)
  const redemptionMethodsJson = normalizeJsonArray(dealFormData.redemptionMethods || null)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const bookingRequest = await tx.bookingRequest.create({
        data: {
          name: requestName,
          businessId: business.id,
          userId: assignedUserId,
          merchant: business.name,
          businessEmail: business.contactEmail,
          status: 'pending',
          sourceType: 'vendor_reactivation',
          originExternalDealId: externalDealId,
          originExternalDealName: dealMetrics?.dealName || externalDealData.nameEs || null,
          startDate,
          endDate,
          category: standardizedCategory,
          parentCategory: business.category?.parentCategory || null,
          subCategory1: business.category?.subCategory1 || null,
          subCategory2: business.category?.subCategory2 || null,
          subCategory3: business.category?.subCategory3 || null,
          subCategory4: business.category?.subCategory4 || null,
          redemptionContactName: business.contactName || null,
          redemptionContactPhone: business.contactPhone || null,
          redemptionContactEmail: business.contactEmail || null,
          legalName: business.razonSocial || null,
          rucDv: business.ruc || null,
          bank: business.bank || null,
          bankAccountName: business.beneficiaryName || null,
          accountNumber: business.accountNumber || null,
          accountType: business.accountType || null,
          paymentType: business.paymentPlan || null,
          provinceDistrictCorregimiento: business.provinceDistrictCorregimiento || null,
          addressAndHours:
            dealFormData.addressAndHours ||
            [business.address, business.neighborhood].filter(Boolean).join(', ') ||
            null,
          socialMedia:
            dealFormData.socialMedia ||
            [business.instagram, business.website].filter(Boolean).join(' | ') ||
            null,
          contactDetails: business.website || null,
          nameEs: dealFormData.nameEs || null,
          shortTitle: dealFormData.shortTitle || null,
          emailTitle: dealFormData.emailTitle || null,
          whatWeLike: dealFormData.whatWeLike || null,
          aboutOffer: dealFormData.aboutOffer || null,
          goodToKnow: dealFormData.goodToKnow || null,
          howToUseEs: dealFormData.howToUseEs || null,
          businessReview: dealFormData.businessReview || null,
          paymentInstructions: dealFormData.paymentInstructions || null,
          pricingOptions: pricingOptionsJson,
          dealImages: dealImagesJson,
          redemptionMethods: redemptionMethodsJson,
          offerMargin: dealFormData.offerMargin || null,
        },
      })

      const event = await tx.event.create({
        data: {
          name: bookingRequest.name,
          category: standardizedCategory,
          parentCategory: bookingRequest.parentCategory,
          subCategory1: bookingRequest.subCategory1,
          subCategory2: bookingRequest.subCategory2,
          business: business.name,
          businessId: business.id,
          startDate,
          endDate,
          status: 'pending',
          userId: assignedUserId,
          bookingRequestId: bookingRequest.id,
        },
        select: { id: true },
      })

      await tx.bookingRequest.update({
        where: { id: bookingRequest.id },
        data: { eventId: event.id },
      })

      await tx.activityLog.create({
        data: {
          userId: 'external',
          userName: business.contactName || business.name,
          userEmail: business.contactEmail,
          action: 'CREATE',
          entityType: 'BookingRequest',
          entityId: bookingRequest.id,
          entityName: bookingRequest.name,
          details: {
            metadata: {
              sourceType: 'vendor_reactivation',
              originExternalDealId: externalDealId,
              originExternalDealName: dealMetrics?.dealName || externalDealData.nameEs || null,
              assignedUserId,
            },
          },
        },
      })

      return {
        requestId: bookingRequest.id,
        eventId: event.id,
      }
    })

    invalidateEntities(['booking-requests', 'events'])
    invalidateDashboard()

    return {
      success: true,
      duplicate: false,
      requestId: result.requestId,
      eventId: result.eventId,
      assignedUserId,
    }
  } catch (error) {
    logger.error('[vendor-reactivation] Failed to create booking request', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vendor reactivation request',
    }
  }
}
