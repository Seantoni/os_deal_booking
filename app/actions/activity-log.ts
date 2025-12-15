'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import type { ActivityAction, EntityType } from '@/lib/activity-log'

interface GetActivityLogsParams {
  userId?: string
  entityType?: EntityType
  entityId?: string
  action?: ActivityAction
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Get activity logs with filtering (admin only)
 */
export async function getActivityLogs(params: GetActivityLogsParams = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const {
      userId,
      entityType,
      entityId,
      action,
      startDate,
      endDate,
      search,
      limit = 50,
      offset = 0,
    } = params

    // Build where clause
    const where: any = {}

    if (userId) where.userId = userId
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ])

    return {
      success: true,
      data: {
        logs,
        total,
        hasMore: offset + logs.length < total,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getActivityLogs')
  }
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogs(
  entityType: EntityType,
  entityId: string,
  limit = 20
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const logs = await prisma.activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return { success: true, data: logs }
  } catch (error) {
    return handleServerActionError(error, 'getEntityActivityLogs')
  }
}

/**
 * Get unique users who have activity logs (for filter dropdown)
 */
export async function getActivityLogUsers() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const users = await prisma.activityLog.findMany({
      where: {
        userName: { not: null },
      },
      select: {
        userId: true,
        userName: true,
        userEmail: true,
      },
      distinct: ['userId'],
    })

    return { success: true, data: users }
  } catch (error) {
    return handleServerActionError(error, 'getActivityLogUsers')
  }
}
