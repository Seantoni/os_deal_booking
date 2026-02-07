'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity, invalidateDashboard } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import { getTodayInPanama, formatDateForPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import type { Task } from '@/types'

export interface TaskWithOpportunity extends Task {
  opportunity: {
    id: string
    stage: string
    name: string | null
    business: {
      id: string
      name: string
      contactName: string
      contactPhone: string
      contactEmail: string
    }
    responsible: {
      id: string
      clerkId: string
      name: string | null
      email: string | null
    } | null
  }
}

/**
 * Get all tasks for the current user, ordered by due date
 * - Admin sees all tasks
 * - Sales sees tasks from opportunities where they are responsible
 */
export async function getUserTasks(filters?: { responsibleId?: string }): Promise<{
  success: boolean
  data?: TaskWithOpportunity[]
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()

    // Build where clause based on role
    const whereClause: Record<string, unknown> = {}

    if (role === 'sales') {
      // Sales only see tasks from opportunities where they are responsible
      whereClause.opportunity = {
        responsibleId: userId,
      }
    } else if (role === 'editor' || role === 'ere') {
      // Editors and ERE don't have access to tasks
      return { success: true, data: [] }
    }
    // Admin sees all (no where clause)
    
    // Apply responsible filter (admin quick filter)
    if (filters?.responsibleId && role === 'admin') {
      whereClause.opportunity = {
        responsibleId: filters.responsibleId,
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        opportunity: {
          select: {
            id: true,
            stage: true,
            name: true,
            responsibleId: true,
            business: {
              select: {
                id: true,
                name: true,
                contactName: true,
                contactPhone: true,
                contactEmail: true,
              },
            },
          },
        },
      },
      orderBy: [
        { completed: 'asc' }, // Incomplete tasks first
        { date: 'asc' }, // Then by due date
      ],
    })

    // Get all unique responsibleIds and fetch user info
    const responsibleIds = [...new Set(tasks.map(t => t.opportunity.responsibleId).filter((id): id is string => id !== null))]
    const users = responsibleIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: responsibleIds } },
          select: { id: true, clerkId: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.clerkId, u]))

    // Map tasks with responsible user info
    const typedTasks = tasks.map((task) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
      opportunity: {
        ...task.opportunity,
        responsible: task.opportunity.responsibleId ? userMap.get(task.opportunity.responsibleId) || null : null,
      },
    }))

    return { success: true, data: typedTasks as TaskWithOpportunity[] }
  } catch (error) {
    return handleServerActionError(error, 'getUserTasks')
  }
}

/**
 * Get tasks with pagination
 */
export async function getTasksPaginated(options: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  filter?: 'all' | 'pending' | 'completed' | 'overdue'
  responsibleId?: string // Filter by responsible (admin quick filter)
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { page = 0, pageSize = 50, sortBy = 'date', sortDirection = 'asc', filter = 'all', responsibleId } = options

    // Build where clause based on role
    const whereClause: Record<string, unknown> = {}
    if (role === 'sales') {
      whereClause.opportunity = { responsibleId: userId }
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [], total: 0, page, pageSize }
    }
    
    // Apply responsible filter (admin quick filter)
    if (responsibleId && role === 'admin') {
      whereClause.opportunity = { responsibleId }
    }

    // Add filter (using Panama timezone)
    const todayStr = getTodayInPanama()
    const todayPanama = parseDateInPanamaTime(todayStr)
    if (filter === 'pending') {
      whereClause.completed = false
    } else if (filter === 'completed') {
      whereClause.completed = true
    } else if (filter === 'overdue') {
      whereClause.completed = false
      whereClause.date = { lt: todayPanama }
    }

    // Get total count
    const total = await prisma.task.count({ where: whereClause })

    // Get paginated tasks
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        opportunity: {
          select: {
            id: true,
            stage: true,
            name: true,
            responsibleId: true,
            business: {
              select: {
                id: true,
                name: true,
                contactName: true,
                contactPhone: true,
                contactEmail: true,
              },
            },
          },
        },
      },
      orderBy: [
        { completed: 'asc' },
        { date: sortDirection },
      ],
      skip: page * pageSize,
      take: pageSize,
    })

    // Get all unique responsibleIds and fetch user info
    const responsibleIds = [...new Set(tasks.map(t => t.opportunity.responsibleId).filter((id): id is string => id !== null))]
    const users = responsibleIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: responsibleIds } },
          select: { id: true, clerkId: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.clerkId, u]))

    // Map tasks with responsible user info
    const typedTasks = tasks.map((task) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
      opportunity: {
        ...task.opportunity,
        responsible: task.opportunity.responsibleId ? userMap.get(task.opportunity.responsibleId) || null : null,
      },
    }))

    return { 
      success: true, 
      data: typedTasks as TaskWithOpportunity[], 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getTasksPaginated')
  }
}

/**
 * Search tasks across ALL records (server-side search)
 */
export async function searchTasks(query: string, options: {
  limit?: number
  responsibleId?: string // Filter by responsible (admin quick filter)
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { limit = 100, responsibleId } = options

    if (!query || query.trim().length < 2) {
      return { success: true, data: [] }
    }

    const searchTerm = query.trim()

    // Build where clause based on role
    const roleFilter: Record<string, unknown> = {}
    if (role === 'sales') {
      roleFilter.opportunity = { responsibleId: userId }
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [] }
    }
    
    // Apply responsible filter (admin quick filter)
    if (responsibleId && role === 'admin') {
      roleFilter.opportunity = { responsibleId }
    }

    // Search across task title, notes, and business name
    const tasks = await prisma.task.findMany({
      where: {
        ...roleFilter,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
          { opportunity: { business: { name: { contains: searchTerm, mode: 'insensitive' } } } },
        ],
      },
      include: {
        opportunity: {
          select: {
            id: true,
            stage: true,
            name: true,
            responsibleId: true,
            business: {
              select: {
                id: true,
                name: true,
                contactName: true,
                contactPhone: true,
                contactEmail: true,
              },
            },
          },
        },
      },
      orderBy: [
        { completed: 'asc' },
        { date: 'asc' },
      ],
      take: limit,
    })

    // Get all unique responsibleIds and fetch user info
    const responsibleIds = [...new Set(tasks.map(t => t.opportunity.responsibleId).filter((id): id is string => id !== null))]
    const users = responsibleIds.length > 0
      ? await prisma.userProfile.findMany({
          where: { clerkId: { in: responsibleIds } },
          select: { id: true, clerkId: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map(u => [u.clerkId, u]))

    // Map tasks with responsible user info
    const typedTasks = tasks.map((task) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
      opportunity: {
        ...task.opportunity,
        responsible: task.opportunity.responsibleId ? userMap.get(task.opportunity.responsibleId) || null : null,
      },
    }))

    return { success: true, data: typedTasks as TaskWithOpportunity[] }
  } catch (error) {
    return handleServerActionError(error, 'searchTasks')
  }
}

/**
 * Toggle task completion status
 */
export async function toggleTaskComplete(taskId: string): Promise<{
  success: boolean
  data?: Task
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Get current task
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask) {
      return { success: false, error: 'Task not found' }
    }

    // Toggle completed status
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        completed: !existingTask.completed,
      },
    })

    // Update opportunity's activity dates
    await updateOpportunityActivityDates(existingTask.opportunityId)

    invalidateEntity('opportunities')
    invalidateEntity('tasks')
    // Task completion affects dashboard stats
    invalidateDashboard()
    return { success: true, data: { ...task, category: task.category as 'meeting' | 'todo' } }
  } catch (error) {
    return handleServerActionError(error, 'toggleTaskComplete')
  }
}

/**
 * Update opportunity's nextActivityDate and lastActivityDate based on tasks
 */
async function updateOpportunityActivityDates(opportunityId: string) {
  const allTasks = await prisma.task.findMany({
    where: { opportunityId },
    orderBy: { date: 'asc' },
  })

  // Use Panama timezone for date comparisons
  const todayStrActivity = getTodayInPanama()
  const futureTasks = allTasks.filter((t) => !t.completed && formatDateForPanama(new Date(t.date)) >= todayStrActivity)
  const pastTasks = allTasks.filter((t) => t.completed || formatDateForPanama(new Date(t.date)) < todayStrActivity)

  const nextActivityDate = futureTasks.length > 0 ? new Date(futureTasks[0].date) : null
  const lastActivityDate = pastTasks.length > 0 ? new Date(pastTasks[pastTasks.length - 1].date) : null

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      nextActivityDate,
      lastActivityDate,
    },
  })
}

/**
 * Get task counts by status (for filter tabs)
 */
export async function getTaskCounts(filters?: { responsibleId?: string }) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    
    // Build base where clause based on role
    const baseWhere: Record<string, unknown> = {}
    if (role === 'sales') {
      baseWhere.opportunity = { responsibleId: userId }
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: { all: 0, pending: 0, completed: 0, overdue: 0, meetings: 0, todos: 0 } }
    }
    
    // Apply responsible filter (admin quick filter)
    if (filters?.responsibleId && role === 'admin') {
      baseWhere.opportunity = { responsibleId: filters.responsibleId }
    }

    // Use Panama timezone for overdue calculation
    const todayStrCounts = getTodayInPanama()
    const todayPanamaCounts = parseDateInPanamaTime(todayStrCounts)

    // Get counts in parallel
    const [all, pending, completed, overdue, meetings, todos] = await Promise.all([
      prisma.task.count({ where: baseWhere }),
      prisma.task.count({ where: { ...baseWhere, completed: false } }),
      prisma.task.count({ where: { ...baseWhere, completed: true } }),
      prisma.task.count({ where: { ...baseWhere, completed: false, date: { lt: todayPanamaCounts } } }),
      prisma.task.count({ where: { ...baseWhere, category: 'meeting' } }),
      prisma.task.count({ where: { ...baseWhere, category: 'todo' } }),
    ])

    return { 
      success: true, 
      data: { all, pending, completed, overdue, meetings, todos }
    }
  } catch (error) {
    return handleServerActionError(error, 'getTaskCounts')
  }
}
