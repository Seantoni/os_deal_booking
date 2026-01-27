'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { auth, currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'

/**
 * Activity log action types
 */
export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'
  | 'STATUS_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'SEND'
  | 'RESEND'
  | 'ASSIGN'
  | 'EXPORT'
  | 'IMPORT'
  | 'SETTINGS_UPDATE'

/**
 * Entity types that can be logged
 */
export type EntityType =
  | 'Business'
  | 'Opportunity'
  | 'Deal'
  | 'Lead'
  | 'BookingRequest'
  | 'Event'
  | 'Settings'
  | 'User'
  | 'Category'
  | 'CustomField'
  | 'Task'
  | 'MarketingCampaign'
  | 'MarketingOption'
  | 'SalesCampaign'
  | 'BusinessCampaign'

/**
 * Details object for logging additional context
 */
export interface ActivityDetails {
  /** Previous values before update */
  previousValues?: Record<string, unknown>
  /** New values after update */
  newValues?: Record<string, unknown>
  /** Specific fields that changed */
  changedFields?: string[]
  /** Status transition (e.g., "pending -> approved") */
  statusChange?: {
    from: string
    to: string
  }
  /** Any additional metadata */
  metadata?: Record<string, unknown>
  /** Generic changes object for update operations */
  changes?: Record<string, unknown>
  /** Bulk update indicator with count */
  bulkUpdate?: boolean
  /** Number of items affected in bulk operation */
  optionsUpdated?: number
  /** Task-related activity details */
  taskAction?: 'created' | 'updated' | 'completed' | 'reopened' | 'deleted'
  taskTitle?: string
  taskCategory?: string
  taskDate?: string
}

/**
 * Parameters for logging an activity
 */
export interface LogActivityParams {
  action: ActivityAction
  entityType: EntityType
  entityId?: string
  entityName?: string
  details?: ActivityDetails
}

/**
 * Log a user activity to the database
 * 
 * @example
 * // Log a business creation
 * await logActivity({
 *   action: 'CREATE',
 *   entityType: 'Business',
 *   entityId: newBusiness.id,
 *   entityName: newBusiness.name,
 * })
 * 
 * @example
 * // Log a status change with details
 * await logActivity({
 *   action: 'STATUS_CHANGE',
 *   entityType: 'Opportunity',
 *   entityId: opportunity.id,
 *   entityName: opportunity.name,
 *   details: {
 *     statusChange: { from: 'Nueva', to: 'Ganada' }
 *   }
 * })
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      // Skip logging if no user (shouldn't happen in authenticated routes)
      return
    }

    // Get user details
    let userName: string | null = null
    let userEmail: string | null = null
    
    try {
      const user = await currentUser()
      if (user) {
        userName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.username || null
        userEmail = user.emailAddresses?.[0]?.emailAddress || null
      }
    } catch (e) {
      // User details not critical, continue without them
    }

    // Get request headers for IP and user agent
    let ipAddress: string | null = null
    let userAgent: string | null = null
    
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || headersList.get('x-real-ip') 
        || null
      userAgent = headersList.get('user-agent') || null
    } catch (e) {
      // Headers not critical, continue without them
    }

    await prisma.activityLog.create({
      data: {
        userId,
        userName,
        userEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        details: params.details ? (params.details as unknown as Prisma.InputJsonValue) : undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Log error but don't throw - activity logging should never break the main operation
    console.error('[ActivityLog] Failed to log activity:', error)
  }
}

/**
 * Log multiple activities in a batch (more efficient for bulk operations)
 */
export async function logActivities(activities: LogActivityParams[]): Promise<void> {
  if (activities.length === 0) return

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return
    }

    // Get user details once
    let userName: string | null = null
    let userEmail: string | null = null
    
    try {
      const user = await currentUser()
      if (user) {
        userName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.firstName || user.username || null
        userEmail = user.emailAddresses?.[0]?.emailAddress || null
      }
    } catch (e) {
      // Continue without user details
    }

    // Get headers once
    let ipAddress: string | null = null
    let userAgent: string | null = null
    
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || headersList.get('x-real-ip') 
        || null
      userAgent = headersList.get('user-agent') || null
    } catch (e) {
      // Continue without headers
    }

    await prisma.activityLog.createMany({
      data: activities.map(params => ({
        userId,
        userName,
        userEmail,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        details: params.details ? (params.details as unknown as Prisma.InputJsonValue) : undefined,
        ipAddress,
        userAgent,
      })),
    })
  } catch (error) {
    console.error('[ActivityLog] Failed to log batch activities:', error)
  }
}

/**
 * Get activity logs with filtering and pagination
 */
export async function getActivityLogs(options: {
  userId?: string
  entityType?: EntityType
  entityId?: string
  action?: ActivityAction
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
} = {}) {
  const {
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options

  const where: {
    userId?: string
    entityType?: EntityType
    entityId?: string
    action?: ActivityAction
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (userId) where.userId = userId
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (action) where.action = action
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
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
    logs,
    total,
    hasMore: offset + logs.length < total,
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
  return prisma.activityLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get recent activity for the current user
 */
export async function getMyRecentActivity(limit = 20) {
  const { userId } = await auth()
  
  if (!userId) {
    return []
  }

  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
