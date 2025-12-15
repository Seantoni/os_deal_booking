'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { generateFullDraft, generateDraftSection } from '@/lib/ai/dealDraftGenerator'
import type { DealDraftContent, DealDraftInput } from '@/lib/ai/dealDraftTypes'

// Type for JSON arrays from Prisma
type JsonArray = Prisma.JsonArray

/**
 * Get deal with draft content
 */
export async function getDealWithDraft(dealId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        bookingRequest: true,
      },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    return { success: true, data: deal }
  } catch (error) {
    return handleServerActionError(error, 'getDealWithDraft')
  }
}

/**
 * Refresh deal draft data without full page refresh
 * This avoids Clerk API calls on draft updates
 */
export async function refreshDealDraft(dealId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        bookingRequest: true,
      },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    return { success: true, data: deal }
  } catch (error) {
    return handleServerActionError(error, 'refreshDealDraft')
  }
}

/**
 * Generate draft for a deal using AI
 */
export async function generateDealDraft(dealId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get deal with booking request
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        bookingRequest: true,
      },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    // Update status to generating
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        draftStatus: 'generating',
        draftError: null,
      },
    })

    try {
      // Prepare input for AI
      const input: DealDraftInput = {
        name: deal.bookingRequest.name,
        businessEmail: deal.bookingRequest.businessEmail,
        merchant: deal.bookingRequest.merchant,
        startDate: deal.bookingRequest.startDate,
        endDate: deal.bookingRequest.endDate,
        parentCategory: deal.bookingRequest.parentCategory,
        subCategory1: deal.bookingRequest.subCategory1,
        subCategory2: deal.bookingRequest.subCategory2,
        businessReview: deal.bookingRequest.businessReview,
        offerDetails: deal.bookingRequest.offerDetails,
        addressAndHours: deal.bookingRequest.addressAndHours,
        socialMedia: deal.bookingRequest.socialMedia,
        pricingOptions: deal.bookingRequest.pricingOptions as JsonArray | null,
        redemptionMode: deal.bookingRequest.redemptionMode,
        includesTaxes: deal.bookingRequest.includesTaxes,
        validOnHolidays: deal.bookingRequest.validOnHolidays,
        blackoutDates: deal.bookingRequest.blackoutDates,
        vouchersPerPerson: deal.bookingRequest.vouchersPerPerson,
        giftVouchers: deal.bookingRequest.giftVouchers,
        hasOtherBranches: deal.bookingRequest.hasOtherBranches,
        cancellationPolicy: deal.bookingRequest.cancellationPolicy,
        redemptionContactName: deal.bookingRequest.redemptionContactName,
        redemptionContactEmail: deal.bookingRequest.redemptionContactEmail,
        redemptionContactPhone: deal.bookingRequest.redemptionContactPhone,
        contactDetails: deal.bookingRequest.contactDetails,
        redemptionMethods: deal.bookingRequest.redemptionMethods as JsonArray | null,
      }

      // Generate draft using AI
      const draftContent = await generateFullDraft(input)

      // Update deal with draft content
      const updatedDeal = await prisma.deal.update({
        where: { id: dealId },
        data: {
          draftContent: draftContent as unknown as Prisma.InputJsonValue,
          draftStatus: 'completed',
          draftError: null,
        },
        include: {
          bookingRequest: true,
        },
      })

      // Revalidate cache
      invalidateEntity('deals', { additionalPaths: [`/deals/${dealId}/draft`] })

      return { success: true, data: updatedDeal }
    } catch (aiError) {
      // Update status to failed
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          draftStatus: 'failed',
          draftError: aiError instanceof Error ? aiError.message : 'Unknown error during generation',
        },
      })

      throw aiError
    }
  } catch (error) {
    return handleServerActionError(error, 'generateDealDraft')
  }
}

/**
 * Regenerate a specific section of the draft
 */
export async function regenerateDraftSection(
  dealId: string,
  sectionName: keyof DealDraftContent
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get deal with booking request
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        bookingRequest: true,
      },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    // Prepare input for AI
    const input: DealDraftInput = {
      name: deal.bookingRequest.name,
      businessEmail: deal.bookingRequest.businessEmail,
      merchant: deal.bookingRequest.merchant,
      startDate: deal.bookingRequest.startDate,
      endDate: deal.bookingRequest.endDate,
      parentCategory: deal.bookingRequest.parentCategory,
      subCategory1: deal.bookingRequest.subCategory1,
      subCategory2: deal.bookingRequest.subCategory2,
      businessReview: deal.bookingRequest.businessReview,
      offerDetails: deal.bookingRequest.offerDetails,
      addressAndHours: deal.bookingRequest.addressAndHours,
      socialMedia: deal.bookingRequest.socialMedia,
      pricingOptions: deal.bookingRequest.pricingOptions as JsonArray | null,
      redemptionMode: deal.bookingRequest.redemptionMode,
      includesTaxes: deal.bookingRequest.includesTaxes,
      validOnHolidays: deal.bookingRequest.validOnHolidays,
      blackoutDates: deal.bookingRequest.blackoutDates,
      vouchersPerPerson: deal.bookingRequest.vouchersPerPerson,
      giftVouchers: deal.bookingRequest.giftVouchers,
      hasOtherBranches: deal.bookingRequest.hasOtherBranches,
      cancellationPolicy: deal.bookingRequest.cancellationPolicy,
      redemptionContactName: deal.bookingRequest.redemptionContactName,
      redemptionContactEmail: deal.bookingRequest.redemptionContactEmail,
      redemptionContactPhone: deal.bookingRequest.redemptionContactPhone,
      contactDetails: deal.bookingRequest.contactDetails,
      redemptionMethods: deal.bookingRequest.redemptionMethods as JsonArray | null,
    }

    // Generate only the requested section
    const newSectionContent = await generateDraftSection(sectionName, input)

    // Get existing draft content and update the section
    const existingContent = (deal.draftContent ? (deal.draftContent as unknown as DealDraftContent) : {})
    const updatedContent = {
      ...existingContent,
      [sectionName]: newSectionContent,
    }

    // Update deal with new draft content
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        draftContent: updatedContent as unknown as Prisma.InputJsonValue,
      },
      include: {
        bookingRequest: true,
      },
    })

    // Revalidate cache
    invalidateEntity('deals', { additionalPaths: [`/deals/${dealId}/draft`] })

    return { success: true, data: updatedDeal }
  } catch (error) {
    return handleServerActionError(error, 'regenerateDraftSection')
  }
}

/**
 * Update draft content manually (for editing)
 */
export async function updateDraftContent(
  dealId: string,
  content: Partial<DealDraftContent>
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get existing deal
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      return { success: false, error: 'Deal not found' }
    }

    // Merge with existing content
    const existingContent = (deal.draftContent ? (deal.draftContent as unknown as DealDraftContent) : {})
    const updatedContent = {
      ...existingContent,
      ...content,
    }

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        draftContent: updatedContent as unknown as Prisma.InputJsonValue,
      },
      include: {
        bookingRequest: true,
      },
    })

    // Revalidate cache
    invalidateEntity('deals', { additionalPaths: [`/deals/${dealId}/draft`] })

    return { success: true, data: updatedDeal }
  } catch (error) {
    return handleServerActionError(error, 'updateDraftContent')
  }
}

