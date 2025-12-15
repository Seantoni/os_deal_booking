'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { invalidateEntity } from '@/lib/cache'
import { requireAuth, handleServerActionError, requireAdmin } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'

export type FilterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte'
  | 'isNull'
  | 'isNotNull'

export type FilterConjunction = 'AND' | 'OR'

export type FilterRule = {
  id: string
  field: string
  operator: FilterOperator
  value: any
  conjunction: FilterConjunction
}

export type EntityType = 'deals' | 'opportunities' | 'businesses' | 'leads'

export type SavedFilter = {
  id: string
  name: string
  entityType: EntityType
  filters: FilterRule[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Get all saved filters for an entity type
 * All users with access to the entity can view saved filters
 */
export async function getSavedFilters(entityType: EntityType) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const filters = await prisma.savedFilter.findMany({
      where: { entityType },
      orderBy: { createdAt: 'asc' },
    })

    return { 
      success: true, 
      data: filters.map(f => ({
        ...f,
        filters: f.filters as FilterRule[],
      })) as SavedFilter[]
    }
  } catch (error) {
    return handleServerActionError(error, 'getSavedFilters')
  }
}

/**
 * Create a new saved filter
 * Admin only
 */
export async function createSavedFilter(
  name: string,
  entityType: EntityType,
  filters: FilterRule[]
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  // Only admins can create filters
  const role = await getUserRole()
  if (role !== 'admin') {
    return { success: false, error: 'Only admins can create filters' }
  }

  try {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Filter name is required' }
    }

    if (!['deals', 'opportunities', 'businesses', 'leads'].includes(entityType)) {
      return { success: false, error: 'Invalid entity type' }
    }

    if (!filters || filters.length === 0) {
      return { success: false, error: 'At least one filter rule is required' }
    }

    const savedFilter = await prisma.savedFilter.create({
      data: {
        name: name.trim(),
        entityType,
        filters: filters as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    })

    invalidateEntity('filters')

    return { 
      success: true, 
      data: {
        ...savedFilter,
        filters: savedFilter.filters as FilterRule[],
      } as SavedFilter
    }
  } catch (error) {
    return handleServerActionError(error, 'createSavedFilter')
  }
}

/**
 * Update an existing saved filter
 * Admin only
 */
export async function updateSavedFilter(
  filterId: string,
  name: string,
  filters: FilterRule[]
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Only admins can update filters
  const role = await getUserRole()
  if (role !== 'admin') {
    return { success: false, error: 'Only admins can update filters' }
  }

  try {
    // Validate inputs
    if (!name || name.trim().length === 0) {
      return { success: false, error: 'Filter name is required' }
    }

    if (!filters || filters.length === 0) {
      return { success: false, error: 'At least one filter rule is required' }
    }

    const savedFilter = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        name: name.trim(),
        filters: filters as unknown as Prisma.InputJsonValue,
      },
    })

    invalidateEntity('filters')

    return { 
      success: true, 
      data: {
        ...savedFilter,
        filters: savedFilter.filters as FilterRule[],
      } as SavedFilter
    }
  } catch (error) {
    return handleServerActionError(error, 'updateSavedFilter')
  }
}

/**
 * Delete a saved filter
 * Admin only
 */
export async function deleteSavedFilter(filterId: string) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Only admins can delete filters
  const role = await getUserRole()
  if (role !== 'admin') {
    return { success: false, error: 'Only admins can delete filters' }
  }

  try {
    await prisma.savedFilter.delete({
      where: { id: filterId },
    })

    invalidateEntity('filters')

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteSavedFilter')
  }
}

