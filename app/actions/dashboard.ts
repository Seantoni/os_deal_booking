'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils/server-actions'
import { unstable_cache } from 'next/cache'
import { CACHE_REVALIDATE_DASHBOARD_SECONDS } from '@/lib/constants'
import { getUserProfile } from '@/lib/auth/roles'
import { logger } from '@/lib/logger'

export type DashboardFilters = {
  startDate?: string
  endDate?: string
  userId?: string
}

type UserProfileData = {
  clerkId: string
  role: string
}

// Internal function that fetches stats (no auth check - auth is done outside)
// User profile is passed in to avoid calling auth() inside cache
async function fetchDashboardStatsInternal(filters: DashboardFilters = {}, userProfile: UserProfileData) {
  try {
    const isSalesUser = userProfile.role === 'sales'
    const currentUserId = userProfile.clerkId

    // If sales user, force filter by their own ID for main stats
    // But we still want to see other sales reps in the team performance table
    const effectiveUserId = isSalesUser ? currentUserId : filters.userId

    const { startDate, endDate } = filters

    // Date filter logic
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate)
    }

    // 1. Main Stats Queries (Scoped to current user if Sales, or filtered user if Admin)
    // If Sales, we ONLY want their stats for the cards.
    // If Admin, we use the filter (specific user or all).
    const mainStatsUserId = isSalesUser ? currentUserId : filters.userId
    
    const mainStatsUserFilter = mainStatsUserId 
      ? { OR: [{ userId: mainStatsUserId }, { responsibleId: mainStatsUserId }] } 
      : {}
    
    const mainStatsTaskFilter = mainStatsUserId 
      ? { opportunity: { OR: [{ userId: mainStatsUserId }, { responsibleId: mainStatsUserId }] } } 
      : {}
      
    const mainStatsBookingFilter = mainStatsUserId 
      ? { userId: mainStatsUserId } 
      : {}

    // Opportunity Stats
    const oppsWhere = {
      ...mainStatsUserFilter,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    }

    const opportunities = await prisma.opportunity.findMany({
      where: oppsWhere,
      select: {
        id: true,
        stage: true,
        responsibleId: true,
        userId: true,
        createdAt: true,
      },
    })

    // Aggregations for Opportunities
    const oppsByStage = opportunities.reduce((acc: Record<string, number>, opp) => {
      acc[opp.stage] = (acc[opp.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Task Stats
    const tasksWhere = {
      ...mainStatsTaskFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    }

    const tasks = await prisma.task.findMany({
      where: tasksWhere,
      select: {
        id: true,
        completed: true,
        category: true,
        opportunity: {
          select: {
            responsibleId: true,
          }
        }
      },
    })

    const tasksStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      pending: tasks.filter(t => !t.completed).length,
      meetings: tasks.filter(t => t.category === 'meeting').length,
      meetingsCompleted: tasks.filter(t => t.category === 'meeting' && t.completed).length,
      meetingsPending: tasks.filter(t => t.category === 'meeting' && !t.completed).length,
      todos: tasks.filter(t => t.category === 'todo').length,
    }

    // Booking Request Stats
    const bookingsWhere = {
      ...mainStatsBookingFilter,
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    }

    const bookingRequests = await prisma.bookingRequest.findMany({
      where: bookingsWhere,
      select: {
        id: true,
        status: true,
        userId: true,
      },
    })

    const bookingStats = bookingRequests.reduce((acc: Record<string, number>, br) => {
      acc[br.status] = (acc[br.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 4. Team Performance (Leaderboard)
    // If Sales, fetch ALL sales users for comparison.
    // If Admin, fetch all users (or filtered user if that's desired behavior, but usually leaderboard shows all).
    // Let's say Admin sees everyone, unless filtered. If filtered, maybe just that one? 
    // For comparison sake, Admin usually wants to see everyone.
    // But if filter is applied, standard dashboard behavior is to filter everything.
    // However, the request specifically asks for "comparison of his data with his other sales roles reps".
    // So for Sales user, we MUST ignore the "mainStatsUserId" filter for this part.
    
    const teamRoleFilter = isSalesUser ? { role: 'sales' } : {}
    
    // If Admin and userId filter is present, do we show only that user in table? 
    // Or do we show everyone? Let's stick to the filter for Admin to avoid confusion.
    const teamUserFilter = (!isSalesUser && filters.userId) ? { clerkId: filters.userId } : {}

    const users = await prisma.userProfile.findMany({
      where: {
        ...teamRoleFilter,
        ...teamUserFilter
      }
    })
    
    const teamPerformanceDateFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    
    // We need aggregate stats for the users in the list
    // To be efficient and avoid N+1, we can fetch all relevant data for these users
    
    const teamUserIds = users.map(u => u.clerkId)
    
    // Fetch all stats for these users to build the table
    const teamOpps = await prisma.opportunity.findMany({
      where: {
        OR: [{ responsibleId: { in: teamUserIds } }, { userId: { in: teamUserIds } }],
        ...teamPerformanceDateFilter
      },
      select: { responsibleId: true, stage: true, userId: true }
    })

    const teamTasks = await prisma.task.findMany({
      where: {
        opportunity: { responsibleId: { in: teamUserIds } },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      select: { completed: true, category: true, opportunity: { select: { responsibleId: true } } }
    })

    const teamBookings = await prisma.bookingRequest.findMany({
      where: {
        userId: { in: teamUserIds },
        ...teamPerformanceDateFilter
      },
      select: { status: true, userId: true }
    })

    const teamPerformance = users.map(user => {
      const userOpps = teamOpps.filter(o => o.responsibleId === user.clerkId || o.userId === user.clerkId)
      const userTasks = teamTasks.filter(t => t.opportunity?.responsibleId === user.clerkId)
      const userBookings = teamBookings.filter(b => b.userId === user.clerkId)
      
      return {
        userId: user.clerkId,
        name: user.name || user.email || 'Unknown',
        isCurrentUser: user.clerkId === currentUserId,
        oppsOpen: userOpps.filter(o => !['won', 'lost'].includes(o.stage)).length,
        oppsWon: userOpps.filter(o => o.stage === 'won').length,
        tasksCompleted: userTasks.filter(t => t.completed).length,
        tasksPending: userTasks.filter(t => !t.completed).length,
        meetings: userTasks.filter(t => t.category === 'meeting').length,
        todos: userTasks.filter(t => t.category === 'todo').length,
        approvedRequests: userBookings.filter(b => b.status === 'approved').length,
        bookedRequests: userBookings.filter(b => b.status === 'booked').length,
      }
    }).filter(stat => 
      stat.oppsOpen > 0 || 
      stat.oppsWon > 0 || 
      stat.tasksCompleted > 0 || 
      stat.tasksPending > 0 ||
      stat.approvedRequests > 0 ||
      stat.bookedRequests > 0
    )
    // Sort by booked requests (descending) as default ranking
    .sort((a, b) => b.bookedRequests - a.bookedRequests)

    return {
      success: true,
      data: {
        opportunities: {
          total: opportunities.length,
          byStage: oppsByStage,
        },
        tasks: tasksStats,
        bookings: {
          total: bookingRequests.length,
          byStatus: bookingStats,
        },
        teamPerformance,
        isSalesUser, // Pass this flag to client
      }
    }

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' 
    }
  }
}

// Create cache key based on filters and user
function getCacheKey(userId: string, filters: DashboardFilters): string[] {
  const parts = ['dashboard-stats', `current-user-${userId}`]
  if (filters.userId) parts.push(`filter-user-${filters.userId}`)
  if (filters.startDate) parts.push(`start-${filters.startDate}`)
  if (filters.endDate) parts.push(`end-${filters.endDate}`)
  return parts
}

// Cached version with 30-minute revalidation
export async function getDashboardStats(filters: DashboardFilters = {}) {
  // Auth check must happen outside the cached function
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get user profile OUTSIDE the cache (uses headers/auth which are dynamic)
  const userProfile = await getUserProfile()
  if (!userProfile) {
    return { success: false, error: 'User profile not found' }
  }

  const { userId } = authResult
  const cacheKey = getCacheKey(userId, filters)
  
  // Pass user profile data as static values to the cached function
  const userProfileData: UserProfileData = {
    clerkId: userProfile.clerkId,
    role: userProfile.role,
  }
  
  const getCachedStats = unstable_cache(
    async () => {
      return await fetchDashboardStatsInternal(filters, userProfileData)
    },
    cacheKey,
    {
      tags: ['dashboard', 'opportunities', 'tasks', 'booking-requests'],
      revalidate: CACHE_REVALIDATE_DASHBOARD_SECONDS,
    }
  )

  return await getCachedStats()
}

