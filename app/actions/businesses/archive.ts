'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole } from '@/lib/auth/roles'
import { logActivity } from '@/lib/activity-log'

import type { Business } from '@/types'

import { ARCHIVED_BUSINESS_STATUS } from './_shared/constants'

/**
 * Get archived businesses (admin only)
 */
export async function getArchivedBusinesses(options: {
  page?: number
  pageSize?: number
  query?: string
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const { page = 0, pageSize = 50, query = '' } = options
    const searchTerm = query.trim()

    let whereClause: Prisma.BusinessWhereInput = {
      reassignmentStatus: ARCHIVED_BUSINESS_STATUS,
    }

    if (searchTerm.length >= 2) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { contactName: { contains: searchTerm, mode: 'insensitive' } },
              { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
              { salesTeam: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      }
    }

    const [total, archivedBusinesses] = await Promise.all([
      prisma.business.count({ where: whereClause }),
      prisma.business.findMany({
        where: whereClause,
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
        },
        orderBy: [
          { reassignmentRequestedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
        skip: page * pageSize,
        take: pageSize,
      }),
    ])

    return {
      success: true,
      data: archivedBusinesses as unknown as Business[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getArchivedBusinesses')
  }
}

/**
 * Unarchive a business (admin only)
 */
export async function unarchiveBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, reassignmentStatus: true },
    })

    if (!business) {
      return { success: false, error: 'Business not found' }
    }

    if (business.reassignmentStatus !== ARCHIVED_BUSINESS_STATUS) {
      return { success: false, error: 'El negocio no está archivado' }
    }

    await prisma.business.update({
      where: { id: businessId },
      data: {
        reassignmentStatus: null,
        reassignmentType: null,
        reassignmentRequestedBy: null,
        reassignmentRequestedAt: null,
        reassignmentReason: null,
        reassignmentPreviousOwner: null,
      },
    })

    await logActivity({
      action: 'STATUS_CHANGE',
      entityType: 'Business',
      entityId: businessId,
      entityName: business.name || undefined,
      details: {
        statusChange: { from: ARCHIVED_BUSINESS_STATUS, to: 'active' },
      },
    })

    invalidateEntity('businesses')
    invalidateEntity('assignments')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'unarchiveBusiness')
  }
}

/**
 * Get all businesses with booking status (has future events or active requests)
 * Used for BusinessSelect dropdown component
 */
