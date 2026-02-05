/**
 * Single source of truth for finding a linked Business.
 * 
 * This module consolidates the business identification logic used across:
 * - getBookingRequest (for returning linkedBusiness in response)
 * - previewBusinessBackfill (for backfill preview)
 * - executeBackfillFromRequest (for backfill execution)
 * 
 * Resolution order (highest to lowest priority):
 * 1. Direct businessId
 * 2. Via opportunityId → Opportunity → Business
 * 3. Email lookup (fallback)
 */

import { prisma } from '@/lib/prisma'

export interface LinkedBusinessInfo {
  id: string
  name: string
  contactEmail: string | null
}

export interface FindLinkedBusinessOptions {
  /** Direct business ID (highest priority) */
  businessId?: string | null
  /** Opportunity ID to find business via relation */
  opportunityId?: string | null
  /** Email to find business by contactEmail (fallback) */
  email?: string | null
}

/**
 * Find a linked business using multiple resolution strategies.
 * 
 * @param options - Options for finding the business
 * @returns The linked business info or null if not found
 * 
 * @example
 * // From a booking request with direct businessId
 * const business = await findLinkedBusiness({ businessId: 'abc123' })
 * 
 * @example
 * // From a booking request with opportunityId
 * const business = await findLinkedBusiness({ opportunityId: 'opp123' })
 * 
 * @example
 * // Fallback to email lookup
 * const business = await findLinkedBusiness({ email: 'contact@business.com' })
 * 
 * @example
 * // Combined (will try in priority order)
 * const business = await findLinkedBusiness({
 *   businessId: formData.linkedBusinessId,
 *   opportunityId: request.opportunityId,
 *   email: request.businessEmail,
 * })
 */
export async function findLinkedBusiness(
  options: FindLinkedBusinessOptions
): Promise<LinkedBusinessInfo | null> {
  const { businessId, opportunityId, email } = options

  // Priority 1: Direct businessId
  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
      },
    })
    if (business) {
      return business
    }
  }

  // Priority 2: Via opportunityId → Opportunity → Business
  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: {
        business: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
          },
        },
      },
    })
    if (opportunity?.business) {
      return opportunity.business
    }
  }

  // Priority 3: Email lookup (fallback)
  if (email) {
    const business = await prisma.business.findFirst({
      where: { contactEmail: email },
      select: {
        id: true,
        name: true,
        contactEmail: true,
      },
    })
    if (business) {
      return business
    }
  }

  return null
}

/**
 * Find the full Business record for backfill operations.
 * Returns all fields needed for comparing and updating.
 * 
 * @param options - Options for finding the business
 * @returns The full business record or null if not found
 */
export async function findLinkedBusinessFull(
  options: FindLinkedBusinessOptions
): Promise<Awaited<ReturnType<typeof prisma.business.findUnique>> | null> {
  const { businessId, opportunityId, email } = options

  // Priority 1: Direct businessId
  if (businessId) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })
    if (business) {
      return business
    }
  }

  // Priority 2: Via opportunityId → Opportunity → Business
  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { businessId: true },
    })
    if (opportunity?.businessId) {
      const business = await prisma.business.findUnique({
        where: { id: opportunity.businessId },
      })
      if (business) {
        return business
      }
    }
  }

  // Priority 3: Email lookup (fallback)
  if (email) {
    const business = await prisma.business.findFirst({
      where: { contactEmail: email },
    })
    if (business) {
      return business
    }
  }

  return null
}
