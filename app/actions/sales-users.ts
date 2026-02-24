'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'
import { getLastNDaysRangeInPanama, parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'

export interface SalesUserCardData {
  clerkId: string
  name: string | null
  email: string | null
  lastLoginAt: Date | null
  lastActivityAt: Date | null
  meetingsLast7Days: number
  tasksLast7Days: number
  approvalsLast7Days: number
}

export interface SalesUsersOverviewData {
  users: SalesUserCardData[]
  window: {
    startDate: string
    endDate: string
  }
}

/**
 * Admin-only: activity/performance snapshot for sales users.
 */
export async function getSalesUsersOverview() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const salesUsers = await prisma.userProfile.findMany({
      where: {
        role: 'sales',
        isActive: true,
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' },
      ],
    })

    if (salesUsers.length === 0) {
      return {
        success: true,
        data: {
          users: [],
          window: getLastNDaysRangeInPanama(7),
        } satisfies SalesUsersOverviewData,
      }
    }

    const clerkIds = salesUsers.map((user) => user.clerkId)
    const window = getLastNDaysRangeInPanama(7)
    const windowStart = parseDateInPanamaTime(window.startDate)
    const windowEnd = parseEndDateInPanamaTime(window.endDate)

    const [lastLogins, lastActivities, recentTasks, recentApprovals] = await Promise.all([
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: clerkIds },
          action: 'LOGIN',
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: clerkIds },
        },
        _max: {
          createdAt: true,
        },
      }),
      prisma.task.findMany({
        where: {
          date: {
            gte: windowStart,
            lte: windowEnd,
          },
          opportunity: {
            responsibleId: { in: clerkIds },
          },
        },
        select: {
          category: true,
          opportunity: {
            select: {
              responsibleId: true,
            },
          },
        },
      }),
      prisma.bookingRequest.groupBy({
        by: ['userId'],
        where: {
          userId: { in: clerkIds },
          status: 'approved',
          processedAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ])

    const lastLoginByUser = new Map(
      lastLogins.map((entry) => [entry.userId, entry._max.createdAt ?? null])
    )
    const lastActivityByUser = new Map(
      lastActivities.map((entry) => [entry.userId, entry._max.createdAt ?? null])
    )

    const taskCountsByUser = new Map<string, { meetings: number; tasks: number }>()
    for (const task of recentTasks) {
      const responsibleId = task.opportunity.responsibleId
      if (!responsibleId) continue

      const existing = taskCountsByUser.get(responsibleId) ?? { meetings: 0, tasks: 0 }
      if (task.category === 'meeting') {
        existing.meetings += 1
      } else {
        existing.tasks += 1
      }
      taskCountsByUser.set(responsibleId, existing)
    }

    const approvalsByUser = new Map(
      recentApprovals.map((entry) => [entry.userId, entry._count._all])
    )

    const users: SalesUserCardData[] = salesUsers
      .map((user) => {
        const taskCounts = taskCountsByUser.get(user.clerkId) ?? { meetings: 0, tasks: 0 }

        return {
          clerkId: user.clerkId,
          name: user.name,
          email: user.email,
          lastLoginAt: lastLoginByUser.get(user.clerkId) ?? null,
          lastActivityAt: lastActivityByUser.get(user.clerkId) ?? null,
          meetingsLast7Days: taskCounts.meetings,
          tasksLast7Days: taskCounts.tasks,
          approvalsLast7Days: approvalsByUser.get(user.clerkId) ?? 0,
        }
      })
      .sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
        const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
        return bTime - aTime
      })

    return {
      success: true,
      data: {
        users,
        window,
      } satisfies SalesUsersOverviewData,
    }
  } catch (error) {
    return handleServerActionError(error, 'getSalesUsersOverview')
  }
}
