'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError, buildRoleBasedWhereClause } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

/**
 * Get all deals (deals created from booked booking requests)
 */
export async function getDeals() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `deals-${userId}-${role}`

    const getCachedDeals = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: Prisma.DealWhereInput = {}
        
        if (role === 'editor') {
          // Editors only see deals assigned to them as Editor
          whereClause.responsibleId = userId
        } else if (role === 'ere') {
          // ERE only see deals assigned to them as ERE
          whereClause.ereResponsibleId = userId
        }
        // Admin sees all (no where clause)
        // Sales filtering will be done after fetching (based on opportunity responsibleId)

        // Get all deals with booking request and opportunity info
        const deals = await prisma.deal.findMany({
          where: whereClause,
          include: {
            bookingRequest: {
              select: {
                id: true,
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
                // Additional fields for enhanced display
                merchant: true,
                sourceType: true,
                redemptionContactName: true,
                redemptionContactEmail: true,
                redemptionContactPhone: true,
                legalName: true,
                rucDv: true,
                commission: true,
                paymentType: true,
                businessReview: true,
                offerDetails: true,
                campaignDuration: true,
                redemptionMode: true,
                addressAndHours: true,
                bank: true,
                accountNumber: true,
                pricingOptions: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc', // Most recently created first
          },
        })

        // For sales users, filter by opportunity responsibleId
        let filteredDeals = deals
        if (role === 'sales') {
          // Get all opportunities that are linked to these booking requests
          const opportunityIds = deals
            .map(d => d.bookingRequest.opportunityId)
            .filter((id): id is string => id !== null)
          
          if (opportunityIds.length > 0) {
            const opportunities = await prisma.opportunity.findMany({
              where: {
                id: { in: opportunityIds },
                responsibleId: userId, // Only opportunities where sales user is responsible
              },
              select: {
                id: true,
                responsibleId: true,
              },
            })
            
            const allowedOpportunityIds = new Set(opportunities.map(o => o.id))
            filteredDeals = deals.filter(d => 
              d.bookingRequest.opportunityId && 
              allowedOpportunityIds.has(d.bookingRequest.opportunityId)
            )
          } else {
            filteredDeals = []
          }
        }

        // Get all users to map responsibleId to user info
        const users = await prisma.userProfile.findMany({
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
          },
        })

        // Get opportunities with responsibleId for deals that have opportunityId
        const opportunityIds = filteredDeals
          .map(d => d.bookingRequest.opportunityId)
          .filter((id): id is string => id !== null)
        
        const opportunities = opportunityIds.length > 0
          ? await prisma.opportunity.findMany({
              where: { id: { in: opportunityIds } },
              select: {
                id: true,
                responsibleId: true,
              },
            })
          : []

        const opportunityMap = new Map(opportunities.map(o => [o.id, o]))

        // Get custom field values for all deals
        const dealIds = filteredDeals.map(d => d.id)
        const customFieldValues = dealIds.length > 0
          ? await prisma.customFieldValue.findMany({
              where: {
                entityType: 'deal',
                entityId: { in: dealIds },
              },
              include: {
                customField: {
                  select: {
                    fieldKey: true,
                  },
                },
              },
            })
          : []

        // Group custom field values by deal ID
        const customFieldsByDealId = new Map<string, Record<string, string | null>>()
        for (const cfv of customFieldValues) {
          if (!customFieldsByDealId.has(cfv.entityId)) {
            customFieldsByDealId.set(cfv.entityId, {})
          }
          customFieldsByDealId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
        }

        // Map deals with responsible user info and opportunity responsible info
        const dealsWithUsers = filteredDeals.map(deal => {
          const opportunity = deal.bookingRequest.opportunityId 
            ? opportunityMap.get(deal.bookingRequest.opportunityId)
            : null
          
          const opportunityResponsible = opportunity?.responsibleId
            ? users.find(u => u.clerkId === opportunity.responsibleId) || null
            : null

          return {
            ...deal,
            responsible: deal.responsibleId 
              ? users.find(u => u.clerkId === deal.responsibleId) || null
              : null,
            ereResponsible: deal.ereResponsibleId
              ? users.find(u => u.clerkId === deal.ereResponsibleId) || null
              : null,
            opportunityResponsible: opportunityResponsible,
            customFields: customFieldsByDealId.get(deal.id) || {},
          }
        })

        return dealsWithUsers
      },
      [cacheKey],
      {
        tags: ['deals'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const deals = await getCachedDeals()
    return { success: true, data: deals }
  } catch (error) {
    return handleServerActionError(error, 'getDeals')
  }
}

/**
 * Get a deal by booking request ID
 */
export async function getDealByBookingRequestId(bookingRequestId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { bookingRequestId },
      include: {
        bookingRequest: {
          select: {
            id: true,
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
            // Additional fields for enhanced display
            merchant: true,
            sourceType: true,
            redemptionContactName: true,
            redemptionContactEmail: true,
            redemptionContactPhone: true,
            legalName: true,
            rucDv: true,
            commission: true,
            paymentType: true,
            businessReview: true,
            offerDetails: true,
            campaignDuration: true,
            redemptionMode: true,
            addressAndHours: true,
            bank: true,
            accountNumber: true,
            pricingOptions: true,
          },
        },
      },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    return { success: true, data: deal }
  } catch (error) {
    return handleServerActionError(error, 'getDealByBookingRequestId')
  }
}

/**
 * Create a deal from a booked booking request
 */
export async function createDeal(bookingRequestId: string, responsibleId?: string | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Check if booking request exists and is booked
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { status: true },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    if (bookingRequest.status !== 'booked') {
      return { success: false, error: 'Only booked requests can be converted to deals' }
    }

    // Check if deal already exists
    const existingDeal = await prisma.deal.findUnique({
      where: { bookingRequestId },
    })

    if (existingDeal) {
      return { success: false, error: 'Deal already exists for this booking request' }
    }

    // Create deal with pending draft status
    const deal = await prisma.deal.create({
      data: {
        bookingRequestId,
        responsibleId: responsibleId || null,
        status: 'pendiente_por_asignar', // Default status
        draftStatus: 'pending', // Draft will be generated
      },
      include: {
        bookingRequest: {
          select: {
            id: true,
            name: true,
            businessEmail: true,
            startDate: true,
            endDate: true,
            status: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
            processedAt: true,
          },
        },
      },
    })

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Deal',
      entityId: deal.id,
      entityName: deal.bookingRequest.name || undefined,
    })

    // Trigger draft generation in the background (non-blocking)
    // We use a dynamic import to avoid circular dependencies
    triggerDraftGeneration(deal.id).catch(err => {
      logger.error('Failed to trigger draft generation:', err)
    })

    // Revalidate cache
    invalidateEntity('deals')

    return { success: true, data: deal }
  } catch (error) {
    return handleServerActionError(error, 'createDeal')
  }
}

/**
 * Trigger draft generation for a deal (non-blocking)
 */
async function triggerDraftGeneration(dealId: string) {
  try {
    // Import the draft generation function dynamically to avoid circular deps
    const { generateDealDraft } = await import('./dealDraft')
    await generateDealDraft(dealId)
  } catch (error) {
    logger.error('Error generating draft:', error)
    // Update deal to show failed status
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        draftStatus: 'failed',
        draftError: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

/**
 * Update deal responsible user
 */
export async function updateDealResponsible(dealId: string, responsibleId: string | null, ereResponsibleId?: string | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Update responsible users
    const updateData: any = {
      responsibleId: responsibleId || null,
    }
    if (ereResponsibleId !== undefined) {
      updateData.ereResponsibleId = ereResponsibleId || null
    }
    
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: updateData,
      include: {
        bookingRequest: {
          select: {
            id: true,
            name: true,
            businessEmail: true,
            startDate: true,
            endDate: true,
            status: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
            processedAt: true,
          },
        },
      },
    })

    // Revalidate cache
    invalidateEntity('deals')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateDealResponsible')
  }
}

/**
 * Update deal status
 */
export async function updateDealStatus(dealId: string, status: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Validate status
    const { DEAL_STATUS_VALUES } = await import('@/lib/constants')
    if (!DEAL_STATUS_VALUES.includes(status as any)) {
      return { success: false, error: 'Invalid status' }
    }

    // Get current status for logging
    const currentDeal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { status: true, bookingRequest: { select: { name: true } } },
    })

    // Update status
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        status,
      },
      include: {
        bookingRequest: {
          select: {
            id: true,
            name: true,
            businessEmail: true,
            startDate: true,
            endDate: true,
            status: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
            processedAt: true,
          },
        },
      },
    })

    // Log status change
    if (currentDeal?.status !== status) {
      await logActivity({
        action: 'STATUS_CHANGE',
        entityType: 'Deal',
        entityId: dealId,
        entityName: updated.bookingRequest.name || undefined,
        details: {
          statusChange: { from: currentDeal?.status || 'unknown', to: status },
        },
      })
    }

    // Revalidate cache
    invalidateEntity('deals')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateDealStatus')
  }
}

/**
 * Delete a deal
 */
export async function deleteDeal(dealId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete deals
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get deal info for logging
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { bookingRequest: { select: { name: true } } },
    })

    await prisma.deal.delete({
      where: { id: dealId },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Deal',
      entityId: dealId,
      entityName: deal?.bookingRequest?.name || undefined,
    })

    // Revalidate cache
    invalidateEntity('deals')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteDeal')
  }
}

