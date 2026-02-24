'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'

import type { Opportunity, BookingRequest, UserData, Deal, PricingOption } from '@/types'
import type { DealStatus } from '@/lib/constants'
import type { Category } from '@prisma/client'

import { NOT_ARCHIVED_CONDITION } from './_shared/constants'

/**
 * Get all data needed for BusinessFormModal in a single request
 * Replaces multiple separate fetches for categories, users, opportunities, requests
 */
export async function getBusinessFormData(businessId?: string | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    const admin = role === 'admin'

    // Build parallel fetch promises
    const fetchPromises: Promise<unknown>[] = [
      // Categories (always needed)
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { parentCategory: 'asc' }],
      }),
    ]

    // Users (only for admin)
    if (admin) {
      fetchPromises.push(
        prisma.userProfile.findMany({
          where: { isActive: true },
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            role: true,
            team: true,
          },
          orderBy: { name: 'asc' },
        })
      )
    } else {
      fetchPromises.push(Promise.resolve([]))
    }

    // Business-specific data (only if editing existing business)
    let businessName = ''
    if (businessId) {
      // Opportunities for this business
      fetchPromises.push(
        prisma.opportunity.findMany({
          where: { businessId },
          include: {
            business: {
              include: {
                category: {
                  select: {
                    id: true,
                    categoryKey: true,
                    parentCategory: true,
                    subCategory1: true,
                    subCategory2: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      )

      // Get business name for request lookup
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { name: true },
      })
      businessName = business?.name?.toLowerCase() || ''

      // Requests matching this business name
      fetchPromises.push(
        businessName
          ? prisma.bookingRequest.findMany({
              where: {
                merchant: { mode: 'insensitive', equals: businessName },
              },
              orderBy: { createdAt: 'desc' },
              take: 50, // Limit to recent requests
            })
          : Promise.resolve([])
      )
    } else {
      // New business - no business-specific data
      fetchPromises.push(Promise.resolve([]))
      fetchPromises.push(Promise.resolve([]))
    }

    const [categories, users, opportunities, requests] = await Promise.all(fetchPromises)

    let deals: Deal[] = []
    if (businessId) {
      const opportunityIds = (opportunities as Opportunity[]).map(o => o.id)
      const orConditions: Prisma.DealWhereInput[] = []
      if (opportunityIds.length > 0) {
        orConditions.push({
          bookingRequest: { opportunityId: { in: opportunityIds } },
        })
      }
      if (businessName) {
        orConditions.push({
          bookingRequest: { merchant: { mode: 'insensitive', equals: businessName } },
        })
      }

      if (orConditions.length > 0) {
        const dealResults = await prisma.deal.findMany({
          where: { OR: orConditions },
          include: {
            bookingRequest: {
              select: {
                id: true,
                dealId: true,
                name: true,
                businessEmail: true,
                startDate: true,
                endDate: true,
                status: true,
                parentCategory: true,
                subCategory1: true,
                subCategory2: true,
                processedAt: true,
                opportunityId: true,
                merchant: true,
                sourceType: true,
                redemptionContactName: true,
                redemptionContactEmail: true,
                redemptionContactPhone: true,
                legalName: true,
                rucDv: true,
                paymentType: true,
                businessReview: true,
                campaignDuration: true,
                redemptionMode: true,
                addressAndHours: true,
                bank: true,
                accountNumber: true,
                pricingOptions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })

        deals = Array.from(new Map(dealResults.map(d => [d.id, d])).values()).map(d => ({
          ...d,
          status: d.status as DealStatus,
          bookingRequest: {
            ...d.bookingRequest,
            pricingOptions: d.bookingRequest.pricingOptions as PricingOption[] | null,
          },
        }))
      }
    }

    return {
      success: true,
      data: {
        categories: categories as Category[],
        users: users as UserData[],
        opportunities: opportunities as Opportunity[],
        requests: requests as BookingRequest[],
        deals: deals as Deal[],
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessFormData')
  }
}

/**
 * Update business focus period
 * Only assigned sales rep or admin can update focus
 */

/**
 * Get a single business by ID
 */
export async function getBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
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
        opportunities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    return { success: true, data: business }
  } catch (error) {
    return handleServerActionError(error, 'getBusiness')
  }
}

/**
 * Create a new business
 */

/**
 * Get all businesses with booking status (has future events or active requests)
 * Used for BusinessSelect dropdown component
 */
export async function getBusinessesWithBookingStatus() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Use Panama timezone for date comparison
    const todayStr = getTodayInPanama()
    const today = parseDateInPanamaTime(todayStr)

    // Get all businesses with basic info
    const businesses = await prisma.business.findMany({
      where: NOT_ARCHIVED_CONDITION,
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPhone: true,
        contactEmail: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            categoryKey: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
          },
        },
        website: true,
        instagram: true,
        description: true,
        ruc: true,
        razonSocial: true,
        provinceDistrictCorregimiento: true,
        bank: true,
        beneficiaryName: true,
        accountNumber: true,
        accountType: true,
        paymentPlan: true,
        address: true,
        neighborhood: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Get all future booked events (by business name matching business name)
    // Use raw query against the physical DB column ("merchant") for compatibility
    // with schema transitions where Prisma client generation may lag behind.
    const futureBookedEvents = await prisma.$queryRaw<Array<{ business: string | null }>>`
      SELECT "merchant" AS "business"
      FROM "Event"
      WHERE "status" = 'booked'
        AND "endDate" >= ${today}
    `
    const bookedMerchants = new Set(
      futureBookedEvents
        .map(e => e.business?.toLowerCase())
        .filter(Boolean) as string[]
    )

    // Get all pending/approved booking requests with future dates
    const activeRequests = await prisma.bookingRequest.findMany({
      where: {
        status: { in: ['pending', 'approved'] },
        endDate: { gte: today },
      },
      select: {
        merchant: true,
        name: true,
      },
    })
    const requestMerchants = new Set(
      activeRequests
        .flatMap(r => [r.merchant?.toLowerCase(), r.name?.toLowerCase()])
        .filter(Boolean) as string[]
    )

    // Map businesses with booking status
    const businessesWithStatus = businesses.map(business => {
      const nameLower = business.name.toLowerCase()
      return {
        ...business,
        hasFutureBooking: bookedMerchants.has(nameLower),
        hasActiveRequest: requestMerchants.has(nameLower),
      }
    })

    return { success: true, data: businessesWithStatus }
  } catch (error) {
    return handleServerActionError(error, 'getBusinessesWithBookingStatus')
  }
}

// Note: Bulk import (BulkBusinessRow, BulkUpsertResult, bulkUpsertBusinesses) 
// has been moved to app/actions/business-bulk.ts
// Import from there: import { bulkUpsertBusinesses, type BulkBusinessRow, type BulkUpsertResult } from '@/app/actions/business-bulk'

/**
 * Preview changes that would be synced to external vendor API
 * Returns the list of field changes without actually sending them
 */
