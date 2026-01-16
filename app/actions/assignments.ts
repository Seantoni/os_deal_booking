'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError, requireAdmin } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { logActivity } from '@/lib/activity-log'

export type ReassignmentType = 'reasignar' | 'sacar'

// Type for sales rep relation
type SalesRepRelation = {
  id: string
  salesRepId: string
  userProfile: {
    id: string
    clerkId: string
    name: string | null
    email: string | null
  }
}

// Business include config for consistent queries
const businessInclude = {
  category: {
    select: {
      id: true,
      categoryKey: true,
      parentCategory: true,
      subCategory1: true,
      subCategory2: true,
    },
  },
  salesReps: {
    include: {
      userProfile: {
        select: {
          id: true,
          clerkId: true,
          name: true,
          email: true,
        },
      },
    },
  },
}

// Extended business type with reassignment fields (post-migration)
interface BusinessWithReassignment {
  id: string
  name: string
  contactName: string | null
  contactEmail: string | null
  reassignmentStatus: string | null
  reassignmentType: string | null
  reassignmentRequestedBy: string | null
  reassignmentRequestedAt: Date | null
  reassignmentReason: string | null
  reassignmentPreviousOwner: string | null
  ownerId: string | null
  category?: {
    id: string
    categoryKey: string
    parentCategory: string
    subCategory1: string | null
    subCategory2: string | null
  } | null
  salesReps?: SalesRepRelation[]
  [key: string]: unknown
}

/**
 * Request reassignment for a business
 * Can be called by owner (for their own businesses) or admin (for any business)
 */
export async function requestReassignment(
  businessId: string,
  type: ReassignmentType,
  reason: string
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'La razón es requerida' }
  }

  try {
    const role = await getUserRole()
    
    // Fetch the business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, ownerId: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Check if already pending reassignment (using $queryRaw for new fields)
    const businessWithReassignment = await prisma.$queryRaw<Array<{ reassignmentStatus: string | null }>>`
      SELECT "reassignmentStatus" FROM businesses WHERE id = ${businessId}
    `
    
    if (businessWithReassignment[0]?.reassignmentStatus) {
      return { success: false, error: 'Este negocio ya tiene una solicitud de reasignación pendiente' }
    }

    // Authorization: sales can only request for their own businesses
    if (role === 'sales' && business.ownerId !== userId) {
      return { success: false, error: 'No tienes permiso para solicitar reasignación de este negocio' }
    }

    // Update business with reassignment info using raw query for new fields
    const status = type === 'reasignar' ? 'pending_reassign' : 'pending_removal'
    await prisma.$executeRaw`
      UPDATE businesses 
      SET 
        "reassignmentStatus" = ${status},
        "reassignmentType" = ${type},
        "reassignmentRequestedBy" = ${userId},
        "reassignmentRequestedAt" = ${new Date()},
        "reassignmentReason" = ${reason.trim()},
        "reassignmentPreviousOwner" = ${business.ownerId}
      WHERE id = ${businessId}
    `

    // Log activity
    await logActivity({
      action: type === 'reasignar' ? 'ASSIGN' : 'STATUS_CHANGE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name,
      details: {
        metadata: { reason: reason.trim(), type, action: 'reassignment_requested' }
      }
    })

    invalidateEntity('assignments')
    invalidateEntity('businesses')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'requestReassignment')
  }
}

/**
 * Get businesses pending reassignment (admin only)
 * With pagination support
 */
export async function getAssignmentsPaginated(options: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  typeFilter?: string // 'all' | 'reasignar' | 'sacar'
} = {}) {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) {
    return adminResult
  }

  try {
    const { page = 0, pageSize = 50, sortDirection = 'desc', typeFilter } = options

    // Build where clause - only businesses with pending reassignment
    // Cast to allow new fields that TypeScript may not yet recognize
    const whereClause = {
      reassignmentStatus: { not: null },
    } as Record<string, unknown>

    // Apply type filter
    if (typeFilter && typeFilter !== 'all') {
      whereClause.reassignmentType = typeFilter
    }

    // Get total count
    const total = await prisma.business.count({ where: whereClause as never })

    // Fetch paginated businesses with all relations
    const businesses = await prisma.business.findMany({
      where: whereClause as never,
      include: businessInclude as never,
      orderBy: {
        reassignmentRequestedAt: sortDirection,
      } as never,
      skip: page * pageSize,
      take: pageSize,
    }) as unknown as BusinessWithReassignment[]

    if (businesses.length === 0) {
      return { success: true, data: [], total: 0, page, pageSize }
    }

    // Fetch requester info for each business
    const requesterIds = businesses
      .map(b => b.reassignmentRequestedBy)
      .filter((id): id is string => id !== null)
    
    const requesters = requesterIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: requesterIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []

    const requesterMap = new Map(requesters.map(r => [r.clerkId, r]))

    // Fetch previous owner info
    const previousOwnerIds = businesses
      .map(b => b.reassignmentPreviousOwner)
      .filter((id): id is string => id !== null)

    const previousOwners = previousOwnerIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: previousOwnerIds } },
          select: { clerkId: true, name: true, email: true },
        })
      : []

    const previousOwnerMap = new Map(previousOwners.map(o => [o.clerkId, o]))

    // Transform to include requester and previous owner info
    const transformedBusinesses = businesses.map(biz => {
      return {
        ...biz,
        salesReps: (biz.salesReps || []).map((sr: SalesRepRelation) => ({
          id: sr.id,
          salesRepId: sr.salesRepId,
          salesRep: sr.userProfile,
        })),
        reassignmentRequester: biz.reassignmentRequestedBy 
          ? requesterMap.get(biz.reassignmentRequestedBy) || null
          : null,
        previousOwner: biz.reassignmentPreviousOwner
          ? previousOwnerMap.get(biz.reassignmentPreviousOwner) || null
          : null,
      }
    })

    return { success: true, data: transformedBusinesses, total, page, pageSize }
  } catch (error) {
    return handleServerActionError(error, 'getAssignmentsPaginated')
  }
}

/**
 * Get counts for assignment filters (admin only)
 */
export async function getAssignmentsCounts() {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) {
    return adminResult
  }

  try {
    const [total, reasignar, sacar] = await Promise.all([
      prisma.business.count({
        where: { reassignmentStatus: { not: null } } as never,
      }),
      prisma.business.count({
        where: { reassignmentType: 'reasignar' } as never,
      }),
      prisma.business.count({
        where: { reassignmentType: 'sacar' } as never,
      }),
    ])

    return {
      success: true,
      data: {
        all: total,
        reasignar,
        sacar,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getAssignmentsCounts')
  }
}

/**
 * Assign business to a new owner (admin only)
 */
export async function assignToNewOwner(businessId: string, newOwnerId: string) {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) {
    return adminResult
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Get reassignment data
    const reassignmentData = await prisma.$queryRaw<Array<{
      reassignmentStatus: string | null
      reassignmentPreviousOwner: string | null
    }>>`
      SELECT "reassignmentStatus", "reassignmentPreviousOwner" 
      FROM businesses WHERE id = ${businessId}
    `

    if (!reassignmentData[0]?.reassignmentStatus) {
      return { success: false, error: 'Este negocio no tiene una solicitud de reasignación pendiente' }
    }

    // Verify new owner exists
    const newOwner = await prisma.userProfile.findUnique({
      where: { clerkId: newOwnerId },
      select: { clerkId: true, name: true },
    })

    if (!newOwner) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Update business - assign to new owner and clear reassignment fields
    await prisma.$executeRaw`
      UPDATE businesses 
      SET 
        "ownerId" = ${newOwnerId},
        "reassignmentStatus" = NULL,
        "reassignmentType" = NULL,
        "reassignmentRequestedBy" = NULL,
        "reassignmentRequestedAt" = NULL,
        "reassignmentReason" = NULL,
        "reassignmentPreviousOwner" = NULL
      WHERE id = ${businessId}
    `

    // Log activity
    await logActivity({
      action: 'ASSIGN',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name,
      details: {
        metadata: { 
          action: 'reassignment_completed',
          newOwner: newOwner.name || newOwnerId,
          previousOwner: reassignmentData[0].reassignmentPreviousOwner,
        }
      }
    })

    invalidateEntity('assignments')
    invalidateEntity('businesses')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'assignToNewOwner')
  }
}

/**
 * Cancel reassignment and return to original owner (admin only)
 */
export async function cancelReassignment(businessId: string) {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) {
    return adminResult
  }

  try {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })

    if (!business) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // Get reassignment data
    const reassignmentData = await prisma.$queryRaw<Array<{
      reassignmentStatus: string | null
      reassignmentPreviousOwner: string | null
    }>>`
      SELECT "reassignmentStatus", "reassignmentPreviousOwner" 
      FROM businesses WHERE id = ${businessId}
    `

    if (!reassignmentData[0]?.reassignmentStatus) {
      return { success: false, error: 'Este negocio no tiene una solicitud de reasignación pendiente' }
    }

    const previousOwner = reassignmentData[0].reassignmentPreviousOwner

    // Update business - restore to previous owner and clear reassignment fields
    await prisma.$executeRaw`
      UPDATE businesses 
      SET 
        "ownerId" = ${previousOwner},
        "reassignmentStatus" = NULL,
        "reassignmentType" = NULL,
        "reassignmentRequestedBy" = NULL,
        "reassignmentRequestedAt" = NULL,
        "reassignmentReason" = NULL,
        "reassignmentPreviousOwner" = NULL
      WHERE id = ${businessId}
    `

    // Log activity
    await logActivity({
      action: 'CANCEL',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name,
      details: {
        metadata: { 
          action: 'reassignment_cancelled',
          restoredOwner: previousOwner,
        }
      }
    })

    invalidateEntity('assignments')
    invalidateEntity('businesses')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'cancelReassignment')
  }
}

/**
 * Search assignments (admin only)
 */
export async function searchAssignments(query: string) {
  const adminResult = await requireAdmin()
  if ('error' in adminResult) {
    return adminResult
  }

  if (!query || query.trim().length < 2) {
    return { success: true, data: [] }
  }

  try {
    const searchTerm = query.trim()

    const businesses = await prisma.business.findMany({
      where: {
        AND: [
          { reassignmentStatus: { not: null } } as never,
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { contactName: { contains: searchTerm, mode: 'insensitive' } },
              { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      } as never,
      include: businessInclude as never,
      take: 50,
    }) as unknown as BusinessWithReassignment[]

    // Transform salesReps structure
    const transformedBusinesses = businesses.map(biz => {
      return {
        ...biz,
        salesReps: (biz.salesReps || []).map((sr: SalesRepRelation) => ({
          id: sr.id,
          salesRepId: sr.salesRepId,
          salesRep: sr.userProfile,
        })),
      }
    })

    return { success: true, data: transformedBusinesses }
  } catch (error) {
    return handleServerActionError(error, 'searchAssignments')
  }
}
