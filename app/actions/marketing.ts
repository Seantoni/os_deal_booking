'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { MARKETING_OPTIONS_CONFIG } from '@/lib/constants/marketing'

/**
 * Get all marketing campaigns with their options and booking request info
 */
export async function getMarketingCampaigns() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `marketing-campaigns-${userId}-${role}`

    const getCachedCampaigns = unstable_cache(
      async () => {
        // Access control: admin, marketing, and the creator can view
        // For now, let's allow all authenticated users to view (will refine later)
        const campaigns = await prisma.marketingCampaign.findMany({
          include: {
            bookingRequest: {
              select: {
                id: true,
                name: true,
                merchant: true,
                businessEmail: true,
                parentCategory: true,
                subCategory1: true,
                startDate: true,
                endDate: true,
                status: true,
                processedAt: true,
                userId: true,
              },
            },
            options: {
              orderBy: [
                { platform: 'asc' },
                { optionType: 'asc' },
              ],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get user info for creators
        const userIds = [...new Set([
          ...campaigns.map(c => c.createdBy).filter(Boolean),
          ...campaigns.map(c => c.bookingRequest.userId).filter(Boolean),
        ])] as string[]

        const users = userIds.length > 0
          ? await prisma.userProfile.findMany({
              where: { clerkId: { in: userIds } },
              select: { clerkId: true, name: true, email: true },
            })
          : []

        const userMap = new Map(users.map(u => [u.clerkId, u]))

        // Enrich campaigns with user info and progress
        return campaigns.map(campaign => {
          const plannedOptions = campaign.options.filter(o => o.isPlanned)
          const completedOptions = plannedOptions.filter(o => o.isCompleted)
          
          return {
            ...campaign,
            createdByUser: campaign.createdBy ? userMap.get(campaign.createdBy) || null : null,
            bookingRequestUser: userMap.get(campaign.bookingRequest.userId) || null,
            progress: {
              planned: plannedOptions.length,
              completed: completedOptions.length,
            },
          }
        })
      },
      [cacheKey],
      {
        tags: ['marketing-campaigns'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const campaigns = await getCachedCampaigns()
    return { success: true, data: campaigns }
  } catch (error) {
    return handleServerActionError(error, 'getMarketingCampaigns')
  }
}

/**
 * Get a single marketing campaign by ID
 */
export async function getMarketingCampaign(campaignId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        bookingRequest: {
          select: {
            id: true,
            name: true,
            merchant: true,
            businessEmail: true,
            parentCategory: true,
            subCategory1: true,
            subCategory2: true,
            startDate: true,
            endDate: true,
            status: true,
            processedAt: true,
            userId: true,
            // Additional fields for campaign planning
            whatWeLike: true,
            aboutCompany: true,
            aboutOffer: true,
            goodToKnow: true,
            socialMedia: true,
            // Images for multimedia section
            pricingOptions: true,
            dealImages: true,
          },
        },
        options: {
          orderBy: [
            { platform: 'asc' },
            { optionType: 'asc' },
          ],
        },
      },
    })

    if (!campaign) {
      return { success: false, error: 'Marketing campaign not found' }
    }

    // Get user info for completedBy and notesUpdatedBy fields
    const userIds = [
      ...campaign.options.map(o => o.completedBy),
      ...campaign.options.map(o => o.notesUpdatedBy),
    ].filter(Boolean) as string[]

    const uniqueUserIds = [...new Set(userIds)]

    const users = uniqueUserIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: uniqueUserIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []

    const userMap = new Map(users.map(u => [u.clerkId, u]))

    // Enrich options with user info
    const enrichedOptions = campaign.options.map(option => ({
      ...option,
      completedByUser: option.completedBy ? userMap.get(option.completedBy) || null : null,
      notesUpdatedByUser: option.notesUpdatedBy ? userMap.get(option.notesUpdatedBy) || null : null,
    }))

    return {
      success: true,
      data: {
        ...campaign,
        options: enrichedOptions,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getMarketingCampaign')
  }
}

/**
 * Get a marketing campaign by booking request ID
 */
export async function getMarketingCampaignByBookingRequestId(bookingRequestId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { bookingRequestId },
      include: {
        bookingRequest: {
          select: {
            id: true,
            name: true,
            merchant: true,
            startDate: true,
            endDate: true,
          },
        },
        options: true,
      },
    })

    if (!campaign) {
      return { success: false, error: 'Marketing campaign not found for this booking request' }
    }

    return { success: true, data: campaign }
  } catch (error) {
    return handleServerActionError(error, 'getMarketingCampaignByBookingRequestId')
  }
}

/**
 * Create a marketing campaign for a booked booking request
 * This is called automatically when a booking request is marked as booked
 */
export async function createMarketingCampaign(bookingRequestId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Check if booking request exists
    const bookingRequest = await prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true, status: true, name: true, startDate: true },
    })

    if (!bookingRequest) {
      return { success: false, error: 'Booking request not found' }
    }

    // Check if campaign already exists
    const existingCampaign = await prisma.marketingCampaign.findUnique({
      where: { bookingRequestId },
    })

    if (existingCampaign) {
      logger.debug('Marketing campaign already exists', { bookingRequestId })
      return { success: true, data: existingCampaign }
    }

    // Calculate default due date (startDate + 1 day)
    const defaultDueDate = bookingRequest.startDate
      ? new Date(new Date(bookingRequest.startDate).getTime() + 24 * 60 * 60 * 1000)
      : null

    // Create campaign with all possible options (not planned yet)
    const campaign = await prisma.marketingCampaign.create({
      data: {
        bookingRequestId,
        createdBy: userId,
        doMarketing: true,
        options: {
          create: generateDefaultOptions(defaultDueDate),
        },
      },
      include: {
        options: true,
        bookingRequest: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'MarketingCampaign',
      entityId: campaign.id,
      entityName: bookingRequest.name || undefined,
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true, data: campaign }
  } catch (error) {
    return handleServerActionError(error, 'createMarketingCampaign')
  }
}

/**
 * Generate default options for all platforms and types
 */
function generateDefaultOptions(defaultDueDate: Date | null) {
  const options: Array<{
    platform: string
    optionType: string
    dueDate: Date | null
    isPlanned: boolean
    isCompleted: boolean
  }> = []

  for (const [platform, config] of Object.entries(MARKETING_OPTIONS_CONFIG)) {
    for (const option of config.options) {
      options.push({
        platform,
        optionType: option.type,
        dueDate: defaultDueDate,
        isPlanned: false,
        isCompleted: false,
      })
    }
  }

  return options
}

/**
 * Update marketing campaign settings (doMarketing toggle, skipReason, generatedCopy, videoScript)
 */
export async function updateMarketingCampaign(
  campaignId: string,
  data: {
    doMarketing?: boolean
    skipReason?: string | null
    generatedCopy?: string | null
    videoScript?: string | null
  }
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    const updated = await prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        doMarketing: data.doMarketing,
        skipReason: data.skipReason,
        generatedCopy: data.generatedCopy,
        videoScript: data.videoScript,
      },
      include: {
        options: true,
        bookingRequest: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'MarketingCampaign',
      entityId: campaignId,
      entityName: updated.bookingRequest.name || undefined,
      details: { changes: data },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateMarketingCampaign')
  }
}

/**
 * Update a marketing option (plan/unplan, complete/uncomplete, due date, notes)
 */
export async function updateMarketingOption(
  optionId: string,
  data: {
    isPlanned?: boolean
    isCompleted?: boolean
    dueDate?: Date | null
    notes?: string | null
    mediaUrls?: string[] | null
  }
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    // Build update data
    const updateData: any = {}
    
    if (data.isPlanned !== undefined) {
      updateData.isPlanned = data.isPlanned
    }
    
    if (data.isCompleted !== undefined) {
      updateData.isCompleted = data.isCompleted
      if (data.isCompleted) {
        updateData.completedAt = new Date()
        updateData.completedBy = userId
      } else {
        updateData.completedAt = null
        updateData.completedBy = null
      }
    }
    
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate
    }
    
    if (data.notes !== undefined) {
      updateData.notes = data.notes
      updateData.notesUpdatedBy = userId
      updateData.notesUpdatedAt = new Date()
    }
    
    if (data.mediaUrls !== undefined) {
      updateData.mediaUrls = data.mediaUrls
    }

    const updated = await prisma.marketingOption.update({
      where: { id: optionId },
      data: updateData,
      include: {
        campaign: {
          select: {
            id: true,
            bookingRequest: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'MarketingOption',
      entityId: optionId,
      entityName: `${updated.platform}/${updated.optionType}`,
      details: { changes: data },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateMarketingOption')
  }
}

/**
 * Bulk update marketing options (for selecting multiple options at once)
 */
export async function bulkUpdateMarketingOptions(
  campaignId: string,
  updates: Array<{
    optionId: string
    isPlanned: boolean
  }>
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    // Update all options in a transaction
    await prisma.$transaction(
      updates.map(update =>
        prisma.marketingOption.update({
          where: { id: update.optionId },
          data: { isPlanned: update.isPlanned },
        })
      )
    )

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'MarketingCampaign',
      entityId: campaignId,
      details: { bulkUpdate: true, optionsUpdated: updates.length },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'bulkUpdateMarketingOptions')
  }
}

/**
 * Add media attachment to a marketing option
 */
export async function addMarketingOptionAttachment(optionId: string, url: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    // Get current option
    const option = await prisma.marketingOption.findUnique({
      where: { id: optionId },
      select: { mediaUrls: true },
    })

    if (!option) {
      return { success: false, error: 'Marketing option not found' }
    }

    // Add URL to existing array
    const currentUrls = (option.mediaUrls as string[]) || []
    const updatedUrls = [...currentUrls, url]

    const updated = await prisma.marketingOption.update({
      where: { id: optionId },
      data: { mediaUrls: updatedUrls },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'addMarketingOptionAttachment')
  }
}

/**
 * Remove media attachment from a marketing option
 */
export async function removeMarketingOptionAttachment(optionId: string, url: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    // Get current option
    const option = await prisma.marketingOption.findUnique({
      where: { id: optionId },
      select: { mediaUrls: true },
    })

    if (!option) {
      return { success: false, error: 'Marketing option not found' }
    }

    // Remove URL from array
    const currentUrls = (option.mediaUrls as string[]) || []
    const updatedUrls = currentUrls.filter(u => u !== url)

    const updated = await prisma.marketingOption.update({
      where: { id: optionId },
      data: { mediaUrls: updatedUrls },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'removeMarketingOptionAttachment')
  }
}

/**
 * Batch update marketing options by IDs (for initial selection flow)
 */
export async function batchUpdateMarketingOptions(
  optionIds: string[],
  data: {
    isPlanned?: boolean
    isCompleted?: boolean
  }
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Access control: admin and marketing can edit
    const role = await getUserRole()
    if (role !== 'admin' && role !== 'marketing') {
      return { success: false, error: 'Unauthorized: Admin or Marketing access required' }
    }

    if (optionIds.length === 0) {
      return { success: false, error: 'No options provided' }
    }

    // Update all options at once
    await prisma.marketingOption.updateMany({
      where: { id: { in: optionIds } },
      data,
    })

    // Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'MarketingOption',
      entityId: optionIds[0],
      details: { 
        newValues: { 
          batchUpdate: true, 
          optionsUpdated: optionIds.length, 
          ...data 
        } 
      },
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'batchUpdateMarketingOptions')
  }
}

/**
 * Delete a marketing campaign (admin only)
 */
export async function deleteMarketingCampaign(campaignId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get campaign info for logging
    const campaign = await prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
      select: { bookingRequest: { select: { name: true } } },
    })

    await prisma.marketingCampaign.delete({
      where: { id: campaignId },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'MarketingCampaign',
      entityId: campaignId,
      entityName: campaign?.bookingRequest?.name || undefined,
    })

    // Revalidate cache
    invalidateEntity('marketing-campaigns')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteMarketingCampaign')
  }
}

