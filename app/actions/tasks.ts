'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
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
  }
}

/**
 * Get all tasks for the current user, ordered by due date
 * - Admin sees all tasks
 * - Sales sees tasks from opportunities where they are responsible
 */
export async function getUserTasks(): Promise<{
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

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        opportunity: {
          select: {
            id: true,
            stage: true,
            name: true,
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

    // Cast category to the expected union type
    const typedTasks = tasks.map((task) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
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
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { page = 0, pageSize = 50, sortBy = 'date', sortDirection = 'asc', filter = 'all' } = options

    // Build where clause based on role
    const whereClause: Record<string, unknown> = {}
    if (role === 'sales') {
      whereClause.opportunity = { responsibleId: userId }
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [], total: 0, page, pageSize }
    }

    // Add filter
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    if (filter === 'pending') {
      whereClause.completed = false
    } else if (filter === 'completed') {
      whereClause.completed = true
    } else if (filter === 'overdue') {
      whereClause.completed = false
      whereClause.date = { lt: now }
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

    const typedTasks = tasks.map((task: { category: string }) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
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
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { limit = 100 } = options

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

    const typedTasks = tasks.map((task: { category: string }) => ({
      ...task,
      category: task.category as 'meeting' | 'todo',
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

  const now = new Date()
  const futureTasks = allTasks.filter((t) => !t.completed && new Date(t.date) >= now)
  const pastTasks = allTasks.filter((t) => t.completed || new Date(t.date) < now)

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

