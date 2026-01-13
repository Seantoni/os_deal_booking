'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import type { OpportunityStage } from '@/types'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'
import { getTodayInPanama } from '@/lib/date/timezone'

/**
 * Get all opportunities (cached, minimal data for lists)
 */
export async function getOpportunities() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `opportunities-${userId}-${role}`

    const getCachedOpportunities = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: Record<string, unknown> = {}
        
        if (role === 'sales') {
          // Sales only see opportunities where they are the responsible person
          whereClause.responsibleId = userId
        } else if (role === 'editor' || role === 'ere') {
          // Editors and ERE don't have access to opportunities
          return []
        }
        // Admin sees all (no where clause)

        const opportunities = await prisma.opportunity.findMany({
          where: whereClause,
          include: {
            business: {
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
              },
            },
            // Don't load tasks for list view - load on demand
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get custom field values for all opportunities
        const opportunityIds = opportunities.map(o => o.id)
        const customFieldValues = opportunityIds.length > 0
          ? await prisma.customFieldValue.findMany({
              where: {
                entityType: 'opportunity',
                entityId: { in: opportunityIds },
              },
              include: {
                customField: {
                  select: {
                    fieldKey: true,
                  },
                },
              },
            })
          : []

        // Group custom field values by opportunity ID
        const customFieldsByOpportunityId = new Map<string, Record<string, string | null>>()
        for (const cfv of customFieldValues) {
          if (!customFieldsByOpportunityId.has(cfv.entityId)) {
            customFieldsByOpportunityId.set(cfv.entityId, {})
          }
          customFieldsByOpportunityId.get(cfv.entityId)![cfv.customField.fieldKey] = cfv.value
        }

        // Add custom fields to each opportunity
        return opportunities.map(opp => ({
          ...opp,
          customFields: customFieldsByOpportunityId.get(opp.id) || {},
        }))
      },
      [cacheKey],
      {
        tags: ['opportunities'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const opportunities = await getCachedOpportunities()
    return { success: true, data: opportunities }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunities')
  }
}

/**
 * Get opportunities with pagination (cacheable, <2MB per page)
 */
export async function getOpportunitiesPaginated(options: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
} = {}) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const { page = 0, pageSize = 50, sortBy = 'createdAt', sortDirection = 'desc' } = options

    // Build where clause based on role
    const whereClause: Record<string, unknown> = {}
    if (role === 'sales') {
      whereClause.responsibleId = userId
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [], total: 0, page, pageSize }
    }

    // Get total count
    const total = await prisma.opportunity.count({ where: whereClause })

    // Build orderBy
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    if (sortBy === 'startDate') {
      orderBy.startDate = sortDirection
    } else if (sortBy === 'closeDate') {
      orderBy.closeDate = sortDirection
    } else {
      orderBy.createdAt = sortDirection
    }

    // Get paginated opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: whereClause,
      include: {
        business: {
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
          },
        },
      },
      orderBy,
      skip: page * pageSize,
      take: pageSize,
    })

    return { 
      success: true, 
      data: opportunities, 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunitiesPaginated')
  }
}

/**
 * Search opportunities across ALL records (server-side search)
 */
export async function searchOpportunities(query: string, options: {
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
      roleFilter.responsibleId = userId
    } else if (role === 'editor' || role === 'ere') {
      return { success: true, data: [] }
    }

    // Search across business name, contact, and notes
    const opportunities = await prisma.opportunity.findMany({
      where: {
        ...roleFilter,
        OR: [
          { business: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { business: { contactName: { contains: searchTerm, mode: 'insensitive' } } },
          { business: { contactEmail: { contains: searchTerm, mode: 'insensitive' } } },
          { notes: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        business: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return { success: true, data: opportunities }
  } catch (error) {
    return handleServerActionError(error, 'searchOpportunities')
  }
}

/**
 * Get opportunities by business ID
 */
export async function getOpportunitiesByBusiness(businessId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const opportunities = await prisma.opportunity.findMany({
      where: { businessId },
      include: {
        business: {
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, data: opportunities }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunitiesByBusiness')
  }
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunity(opportunityId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        business: {
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
            salesReps: true,
          },
        },
        tasks: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    })

    if (!opportunity) {
      return { success: false, error: 'Opportunity not found' }
    }

    return { success: true, data: opportunity }
  } catch (error) {
    return handleServerActionError(error, 'getOpportunity')
  }
}

/**
 * Create a new opportunity
 */
export async function createOpportunity(formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const businessId = formData.get('businessId') as string
    const stage = formData.get('stage') as OpportunityStage
    const startDate = formData.get('startDate') as string
    const closeDate = formData.get('closeDate') as string | null
    const notes = formData.get('notes') as string | null
    const responsibleId = formData.get('responsibleId') as string | null

    if (!businessId || !stage || !startDate) {
      return { success: false, error: 'Missing required fields' }
    }

    const startDateTime = new Date(startDate)
    const closeDateTime = closeDate ? new Date(closeDate) : null

    // Set responsible to current user by default if not provided
    const finalResponsibleId = responsibleId || userId

    const opportunity = await prisma.opportunity.create({
      data: {
        businessId,
        stage,
        startDate: startDateTime,
        closeDate: closeDateTime,
        notes: notes || null,
        userId,
        responsibleId: finalResponsibleId,
      },
      include: {
        business: {
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
          },
        },
        tasks: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    })

    // Log activity
    await logActivity({
      action: 'CREATE',
      entityType: 'Opportunity',
      entityId: opportunity.id,
      entityName: opportunity.business?.name || undefined,
      details: {
        newValues: { stage, businessId },
      },
    })

    invalidateEntity('opportunities')
    return { success: true, data: opportunity }
  } catch (error) {
    return handleServerActionError(error, 'createOpportunity')
  }
}

/**
 * Update an opportunity
 */
export async function updateOpportunity(opportunityId: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const stage = formData.get('stage') as OpportunityStage
    const startDate = formData.get('startDate') as string
    const closeDate = formData.get('closeDate') as string | null
    const notes = formData.get('notes') as string | null
    const lostReason = formData.get('lostReason') as string | null
    const responsibleId = formData.get('responsibleId') as string | null

    if (!stage || !startDate) {
      return { success: false, error: 'Missing required fields' }
    }

    const startDateTime = new Date(startDate)
    const closeDateTime = closeDate ? new Date(closeDate) : null

    // Check if user is admin to allow responsible editing
    const admin = await isAdmin()

    // Get current opportunity for comparison
    const currentOpportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { business: { select: { name: true } } },
    })

    const updateData: Record<string, unknown> = {
      stage,
      startDate: startDateTime,
      closeDate: closeDateTime,
      notes: notes || null,
      lostReason: lostReason || null,
    }

    // Only update responsible if admin
    if (admin && responsibleId) {
      updateData.responsibleId = responsibleId
    }

    const opportunity = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: updateData,
      include: {
        business: {
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
          },
        },
        tasks: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    })

    // Calculate changes for logging
    const previousValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}
    const changedFields: string[] = []

    if (currentOpportunity) {
      // Check stage change specifically for status change type
      const previousStage = currentOpportunity.stage
      if (previousStage !== stage) {
        // We'll log this as part of changes, but action will be STATUS_CHANGE if stage changed
      }

      // Check date fields
      if (currentOpportunity.startDate.getTime() !== startDateTime.getTime()) {
        changedFields.push('startDate')
        previousValues.startDate = currentOpportunity.startDate
        newValues.startDate = startDateTime
      }
      
      const oldCloseDate = currentOpportunity.closeDate?.getTime()
      const newCloseDateVal = closeDateTime?.getTime()
      if (oldCloseDate !== newCloseDateVal) {
        changedFields.push('closeDate')
        previousValues.closeDate = currentOpportunity.closeDate
        newValues.closeDate = closeDateTime
      }

      // Check simple fields
      const fieldsToCheck = ['stage', 'notes', 'lostReason', 'responsibleId']
      
      // Construct effective update values
      const effectiveUpdate = { 
        stage, 
        notes: notes || null, 
        lostReason: lostReason || null,
        responsibleId: (admin && responsibleId) ? responsibleId : currentOpportunity.responsibleId
      }

      fieldsToCheck.forEach(field => {
        const oldValue = currentOpportunity[field as keyof typeof currentOpportunity]
        const newValue = effectiveUpdate[field as keyof typeof effectiveUpdate]
        
        const normalizedOld = oldValue === null ? undefined : oldValue
        const normalizedNew = newValue === null ? undefined : newValue

        if (normalizedOld !== normalizedNew) {
          if (!changedFields.includes(field)) {
            changedFields.push(field)
            previousValues[field] = oldValue
            newValues[field] = newValue
          }
        }
      })
    }

    // Determine action type
    const actionType = (currentOpportunity && currentOpportunity.stage !== stage) 
      ? 'STATUS_CHANGE' 
      : 'UPDATE'

    // Log activity
    await logActivity({
      action: actionType,
      entityType: 'Opportunity',
      entityId: opportunity.id,
      entityName: opportunity.business?.name || undefined,
      details: {
        statusChange: actionType === 'STATUS_CHANGE' 
          ? { from: currentOpportunity?.stage || '', to: stage } 
          : undefined,
        changedFields,
        previousValues,
        newValues
      }
    })

    invalidateEntity('opportunities')
    return { success: true, data: opportunity }
  } catch (error) {
    return handleServerActionError(error, 'updateOpportunity')
  }
}

/**
 * Delete an opportunity
 */
export async function deleteOpportunity(opportunityId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete opportunities
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get opportunity info for logging
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { business: { select: { name: true } } },
    })

    await prisma.opportunity.delete({
      where: { id: opportunityId },
    })

    // Log activity
    await logActivity({
      action: 'DELETE',
      entityType: 'Opportunity',
      entityId: opportunityId,
      entityName: opportunity?.business?.name || undefined,
    })

    invalidateEntity('opportunities')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteOpportunity')
  }
}

/**
 * Get all sales reps (UserProfiles with role 'sales')
 */
export async function getSalesReps() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const salesReps = await prisma.userProfile.findMany({
      where: {
        role: 'sales',
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: salesReps }
  } catch (error) {
    return handleServerActionError(error, 'getSalesReps')
  }
}

/**
 * Get all users (for owner selection - admin only)
 */
export async function getAllUsers() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const admin = await isAdmin()
    if (!admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: users }
  } catch (error) {
    return handleServerActionError(error, 'getAllUsers')
  }
}

/**
 * Get tasks for an opportunity
 */
export async function getTasksByOpportunity(opportunityId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const tasks = await prisma.task.findMany({
      where: { opportunityId },
      orderBy: {
        date: 'asc',
      },
    })

    return { success: true, data: tasks }
  } catch (error) {
    return handleServerActionError(error, 'getTasksByOpportunity')
  }
}

/**
 * Create a new task
 */
export async function createTask(formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const opportunityId = formData.get('opportunityId') as string
    const category = formData.get('category') as string
    const title = formData.get('title') as string
    const date = formData.get('date') as string
    const notes = formData.get('notes') as string | null

    if (!opportunityId || !category || !title || !date) {
      return { success: false, error: 'Missing required fields' }
    }

    if (category !== 'meeting' && category !== 'todo') {
      return { success: false, error: 'Invalid task category' }
    }

    const taskDate = new Date(date)
    
    // Check if task date is in the past - auto-complete if so
    const todayStr = getTodayInPanama() // YYYY-MM-DD in Panama timezone
    const isDateInPast = date < todayStr

    // Create task (auto-complete if date is in the past)
    const task = await prisma.task.create({
      data: {
        opportunityId,
        category,
        title,
        date: taskDate,
        completed: isDateInPast, // Auto-complete past tasks
        notes: notes || null,
      },
    })

    // Update opportunity's nextActivityDate and lastActivityDate
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { tasks: true, business: true },
    })

    // Log activity for task creation on the opportunity
    await logActivity({
      action: 'CREATE',
      entityType: 'Opportunity',
      entityId: opportunityId,
      entityName: opportunity?.business?.name || undefined,
      details: {
        taskAction: 'created',
        taskTitle: title,
        taskCategory: category,
        taskDate: date,
      },
    })

    if (opportunity) {
      const allTasks = await prisma.task.findMany({
        where: { opportunityId },
        orderBy: { date: 'asc' },
      })

      const futureTasks = allTasks.filter((t) => !t.completed && new Date(t.date) >= new Date())
      const pastTasks = allTasks.filter((t) => t.completed || new Date(t.date) < new Date())

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

    invalidateEntity('opportunities')
    return { success: true, data: task }
  } catch (error) {
    return handleServerActionError(error, 'createTask')
  }
}

/**
 * Update a task
 */
export async function updateTask(taskId: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const category = formData.get('category') as string
    const title = formData.get('title') as string
    const date = formData.get('date') as string
    const completed = formData.get('completed') === 'true'
    const notes = formData.get('notes') as string | null

    if (!category || !title || !date) {
      return { success: false, error: 'Missing required fields' }
    }

    if (category !== 'meeting' && category !== 'todo') {
      return { success: false, error: 'Invalid task category' }
    }

    const taskDate = new Date(date)

    // Get opportunity ID before updating
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { opportunity: { include: { business: true } } },
    })

    if (!existingTask) {
      return { success: false, error: 'Task not found' }
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        category,
        title,
        date: taskDate,
        completed,
        notes: notes || null,
      },
    })

    // Log activity for task update on the opportunity
    // Determine what changed
    const completionChanged = existingTask.completed !== completed
    if (completionChanged) {
      await logActivity({
        action: 'UPDATE',
        entityType: 'Opportunity',
        entityId: existingTask.opportunityId,
        entityName: existingTask.opportunity?.business?.name || undefined,
        details: {
          taskAction: completed ? 'completed' : 'reopened',
          taskTitle: title,
          taskCategory: category,
        },
      })
    } else {
      await logActivity({
        action: 'UPDATE',
        entityType: 'Opportunity',
        entityId: existingTask.opportunityId,
        entityName: existingTask.opportunity?.business?.name || undefined,
        details: {
          taskAction: 'updated',
          taskTitle: title,
          taskCategory: category,
        },
      })
    }

    // Update opportunity's nextActivityDate and lastActivityDate
    const allTasks = await prisma.task.findMany({
      where: { opportunityId: existingTask.opportunityId },
      orderBy: { date: 'asc' },
    })

    const futureTasks = allTasks.filter((t) => !t.completed && new Date(t.date) >= new Date())
    const pastTasks = allTasks.filter((t) => t.completed || new Date(t.date) < new Date())

    const nextActivityDate = futureTasks.length > 0 ? new Date(futureTasks[0].date) : null
    const lastActivityDate = pastTasks.length > 0 ? new Date(pastTasks[pastTasks.length - 1].date) : null

    await prisma.opportunity.update({
      where: { id: existingTask.opportunityId },
      data: {
        nextActivityDate,
        lastActivityDate,
      },
    })

    invalidateEntity('opportunities')
    return { success: true, data: task }
  } catch (error) {
    return handleServerActionError(error, 'updateTask')
  }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Only admins can delete tasks
    const role = await getUserRole()
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get opportunity ID before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { opportunity: { include: { business: true } } },
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await prisma.task.delete({
      where: { id: taskId },
    })

    // Log activity for task deletion on the opportunity
    await logActivity({
      action: 'DELETE',
      entityType: 'Opportunity',
      entityId: task.opportunityId,
      entityName: task.opportunity?.business?.name || undefined,
      details: {
        taskAction: 'deleted',
        taskTitle: task.title,
        taskCategory: task.category,
      },
    })

    // Update opportunity's nextActivityDate and lastActivityDate
    const allTasks = await prisma.task.findMany({
      where: { opportunityId: task.opportunityId },
      orderBy: { date: 'asc' },
    })

    const futureTasks = allTasks.filter((t) => !t.completed && new Date(t.date) >= new Date())
    const pastTasks = allTasks.filter((t) => t.completed || new Date(t.date) < new Date())

    const nextActivityDate = futureTasks.length > 0 ? new Date(futureTasks[0].date) : null
    const lastActivityDate = pastTasks.length > 0 ? new Date(pastTasks[pastTasks.length - 1].date) : null

    await prisma.opportunity.update({
      where: { id: task.opportunityId },
      data: {
        nextActivityDate,
        lastActivityDate,
      },
    })

    invalidateEntity('opportunities')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteTask')
  }
}

/**
 * Bulk upsert opportunities from CSV import
 * Admin only
 */
export interface BulkOpportunityRow {
  id?: string
  business?: string // Business name
  stage?: string
  startDate?: string // YYYY-MM-DD
  closeDate?: string // YYYY-MM-DD
  notes?: string
  responsible?: string // User name or email
  lostReason?: string
  hasRequest?: string // "Sí" or "No"
}

export interface BulkOpportunityUpsertResult {
  created: number
  updated: number
  errors: string[]
}

// Stage label to key mapping (reverse of STAGE_LABELS)
const STAGE_KEY_MAP: Record<string, OpportunityStage> = {
  'iniciación': 'iniciacion',
  'iniciacion': 'iniciacion',
  'reunión': 'reunion',
  'reunion': 'reunion',
  'propuesta enviada': 'propuesta_enviada',
  'propuesta aprobada': 'propuesta_aprobada',
  'won': 'won',
  'lost': 'lost',
}

export async function bulkUpsertOpportunities(
  rows: BulkOpportunityRow[]
): Promise<{ success: boolean; data?: BulkOpportunityUpsertResult; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  // Check admin access
  if (!(await isAdmin())) {
    return { success: false, error: 'Admin access required' }
  }

  try {
    let created = 0
    let updated = 0
    const errors: string[] = []

    // Get all users for responsible lookup
    const allUsers = await prisma.userProfile.findMany({
      select: { id: true, clerkId: true, name: true, email: true },
    })
    const userByName = new Map(allUsers.map(u => [(u.name || '').toLowerCase(), u]))
    const userByEmail = new Map(allUsers.map(u => [(u.email || '').toLowerCase(), u]))

    // Get all businesses for lookup
    const allBusinesses = await prisma.business.findMany({
      select: { id: true, name: true },
    })
    const businessByName = new Map(allBusinesses.map(b => [b.name.toLowerCase(), b]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 for 1-indexed and header row

      try {
        // Validate required fields for new records
        if (!row.id && !row.business) {
          errors.push(`Fila ${rowNum}: Negocio es requerido para nuevos registros`)
          continue
        }

        // Find business by name
        let businessId: string | null = null
        if (row.business) {
          const business = businessByName.get(row.business.toLowerCase())
          if (business) {
            businessId = business.id
          } else if (!row.id) {
            errors.push(`Fila ${rowNum}: No se encontró negocio "${row.business}"`)
            continue
          }
        }

        // Find responsible by name or email
        let responsibleId: string | null = null
        if (row.responsible) {
          const responsibleLower = row.responsible.toLowerCase()
          const responsibleUser = userByName.get(responsibleLower) || userByEmail.get(responsibleLower)
          if (responsibleUser) {
            responsibleId = responsibleUser.clerkId
          }
        }

        // Parse stage
        let stage: OpportunityStage = 'iniciacion'
        if (row.stage) {
          const normalizedStage = row.stage.toLowerCase().trim()
          stage = STAGE_KEY_MAP[normalizedStage] || 'iniciacion'
        }

        // Parse dates
        const startDate = row.startDate ? new Date(row.startDate) : new Date()
        const closeDate = row.closeDate ? new Date(row.closeDate) : null

        // Parse hasRequest
        const hasRequest = row.hasRequest?.toLowerCase() === 'sí' || row.hasRequest?.toLowerCase() === 'si'

        // Build data object
        const data = {
          businessId: businessId!,
          stage,
          startDate,
          closeDate,
          notes: row.notes || null,
          responsibleId,
          lostReason: row.lostReason || null,
          hasRequest,
          userId, // Set creator as current user
        }

        if (row.id) {
          // Update existing
          const existing = await prisma.opportunity.findUnique({ where: { id: row.id } })
          if (!existing) {
            errors.push(`Fila ${rowNum}: No se encontró oportunidad con ID ${row.id}`)
            continue
          }

          // Don't overwrite businessId and userId on update
          const { businessId: _bId, userId: _uId, ...updateData } = data
          
          await prisma.opportunity.update({
            where: { id: row.id },
            data: {
              ...updateData,
              // Only update businessId if provided and different
              ...(businessId && businessId !== existing.businessId ? { businessId } : {}),
            },
          })
          updated++
        } else {
          // Create new
          if (!businessId) {
            errors.push(`Fila ${rowNum}: Negocio es requerido`)
            continue
          }

          await prisma.opportunity.create({ data })
          created++
        }
      } catch (err) {
        errors.push(`Fila ${rowNum}: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      }
    }

    // Invalidate cache
    await invalidateEntity('opportunities')

    // Log activity
    await logActivity({
      action: 'IMPORT',
      entityType: 'Opportunity',
      entityId: 'bulk',
      details: { 
        newValues: { created, updated, errorCount: errors.length },
      },
    })

    return { success: true, data: { created, updated, errors } }
  } catch (error) {
    return handleServerActionError(error, 'bulkUpsertOpportunities')
  }
}

