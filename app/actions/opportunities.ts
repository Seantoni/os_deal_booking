'use server'

import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { getUserRole, isAdmin } from '@/lib/auth/roles'
import type { OpportunityStage } from '@/types'
import { CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import { logActivity } from '@/lib/activity-log'

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
 * Get pipeline data: all opportunities with their linked booking requests
 * Returns unified data for the pipeline view
 */
export async function getPipelineData() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  try {
    const role = await getUserRole()
    const cacheKey = `pipeline-data-${userId}-${role}`

    const getCachedPipelineData = unstable_cache(
      async () => {
        // Build where clause based on role
        const whereClause: Record<string, unknown> = {}
        
        if (role === 'sales') {
          // Sales only see opportunities where they are the responsible person
          whereClause.responsibleId = userId
        } else if (role === 'editor' || role === 'ere') {
          // Editors and ERE don't have access to pipeline
          return []
        }
        // Admin sees all (no where clause)

        // Get all opportunities with business data
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
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Get all booking requests that are linked to opportunities
        const opportunityIdsWithRequests = opportunities
          .filter(opp => opp.bookingRequestId)
          .map(opp => opp.bookingRequestId!)
        
        const linkedRequests = opportunityIdsWithRequests.length > 0
          ? await prisma.bookingRequest.findMany({
              where: {
                id: {
                  in: opportunityIdsWithRequests,
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            })
          : []

        // Get standalone booking requests (not linked to any opportunity)
        const standaloneWhere: Record<string, unknown> = {
          opportunityId: null,
        }
        if (role === 'sales') {
          standaloneWhere.userId = userId
        }

        const standaloneRequests = await prisma.bookingRequest.findMany({
          where: standaloneWhere,
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Combine all requests
        const allRequests = [...linkedRequests, ...standaloneRequests]

        // Create a map of bookingRequestId -> bookingRequest
        const requestMap = new Map<string, typeof allRequests[0]>()
        allRequests.forEach(req => {
          requestMap.set(req.id, req)
        })

        // Combine opportunities with their requests
        const opportunityItems = opportunities.map(opp => ({
          opportunity: opp,
          bookingRequest: opp.bookingRequestId ? requestMap.get(opp.bookingRequestId) || null : null,
        }))

        // Create pipeline items for standalone requests
        const standaloneItems = standaloneRequests.map(req => ({
          opportunity: null,
          bookingRequest: req,
        }))

        // Merge and sort pipeline data
        const pipelineData = [...opportunityItems, ...standaloneItems].sort((a, b) => {
          const dateA = a.opportunity?.createdAt || a.bookingRequest?.createdAt || new Date(0)
          const dateB = b.opportunity?.createdAt || b.bookingRequest?.createdAt || new Date(0)
          return dateB.getTime() - dateA.getTime()
        })

        // Get all deals (only for booked requests)
        const bookedRequestIds = allRequests
          .filter(req => req.status === 'booked')
          .map(req => req.id)
        
        const deals = bookedRequestIds.length > 0
          ? await prisma.deal.findMany({
              where: {
                bookingRequestId: {
                  in: bookedRequestIds,
                },
              },
              include: {
                bookingRequest: {
                  select: {
                    id: true,
                    name: true,
                    businessEmail: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    parentCategory: true,
                    subCategory1: true,
                    subCategory2: true,
                    processedAt: true,
                    description: true,
                    opportunityId: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            })
          : []

        // Get opportunities for deals to find responsibleId
        const dealOpportunityIds = deals
          .map(d => d.bookingRequest.opportunityId)
          .filter((id): id is string => id !== null)
        
        const dealOpportunities = dealOpportunityIds.length > 0
          ? await prisma.opportunity.findMany({
              where: { id: { in: dealOpportunityIds } },
              select: {
                id: true,
                responsibleId: true,
                businessId: true,
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
            })
          : []

        const dealOpportunityMap = new Map(dealOpportunities.map(o => [o.id, o]))

        // Add deals to pipeline data
        const dealsWithOpportunity = deals.map(deal => {
          const opportunity = deal.bookingRequest.opportunityId
            ? dealOpportunityMap.get(deal.bookingRequest.opportunityId)
            : null
          
          return {
            deal,
            opportunity,
            bookingRequest: deal.bookingRequest,
          }
        })

        // Get pre-booked events (events with status 'pre-booked' that don't have booking requests)
        // These are events created directly by admin on the calendar
        const preBookedEventsWhere: Record<string, unknown> = {
          status: 'pre-booked',
          bookingRequestId: null,
        }
        if (role === 'sales') {
          preBookedEventsWhere.userId = userId
        }

        const preBookedEvents = await prisma.event.findMany({
          where: preBookedEventsWhere,
          orderBy: {
            createdAt: 'desc',
          },
        })

        // Format pre-booked events to match the expected structure
        const formattedPreBookedEvents = preBookedEvents.map(event => ({
          event: {
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
            status: event.status,
            merchant: event.merchant,
            parentCategory: event.parentCategory,
            subCategory1: event.subCategory1,
            subCategory2: event.subCategory2,
            createdAt: event.createdAt,
          },
        }))

        return {
          opportunities: pipelineData,
          deals: dealsWithOpportunity,
          preBookedEvents: formattedPreBookedEvents,
        }
      },
      [cacheKey],
      {
        tags: ['opportunities', 'booking-requests', 'deals', 'events'],
        revalidate: CACHE_REVALIDATE_SECONDS,
      }
    )

    const data = await getCachedPipelineData()
    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getPipelineData')
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

    // Create task
    const task = await prisma.task.create({
      data: {
        opportunityId,
        category,
        title,
        date: taskDate,
        notes: notes || null,
      },
    })

    // Update opportunity's nextActivityDate and lastActivityDate
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { tasks: true },
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
    })

    if (!task) {
      return { success: false, error: 'Task not found' }
    }

    await prisma.task.delete({
      where: { id: taskId },
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

