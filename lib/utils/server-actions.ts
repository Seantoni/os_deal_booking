/**
 * Server action utilities
 * Common patterns and helpers for server actions
 */

import { auth } from '@clerk/nextjs/server'
import { getUserRole as _getUserRole } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/constants'

// Re-export getUserRole for use in other actions
export const getUserRole = _getUserRole

/**
 * Standard server action response type
 */
export type ServerActionResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Require authentication - returns userId or throws error response
 */
export async function requireAuth(): Promise<{ userId: string } | ServerActionResponse> {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }
  
  return { userId }
}

/**
 * Require admin role - returns userId or throws error response
 */
export async function requireAdmin(): Promise<{ userId: string } | ServerActionResponse> {
  const { userId } = await auth()
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }

  const role = await getUserRole()
  if (role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin access required' }
  }
  
  return { userId }
}

/**
 * Require authentication and throw when unauthorized.
 * Useful for actions whose return type cannot represent auth failures cleanly.
 */
export async function requireAuthOrThrow(): Promise<{ userId: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    throw new Error(authResult.error || 'Unauthorized')
  }
  return authResult
}

/**
 * Require admin role and throw when unauthorized.
 * Useful for actions whose return type cannot represent auth failures cleanly.
 */
export async function requireAdminOrThrow(): Promise<{ userId: string }> {
  const adminResult = await requireAdmin()
  if (!('userId' in adminResult)) {
    throw new Error(adminResult.error || 'Unauthorized: Admin access required')
  }
  return adminResult
}

/**
 * Handle server action errors consistently
 * Wraps error handling with consistent logging and response format
 */
import { logger } from '@/lib/logger'

export function handleServerActionError(
  error: unknown,
  context: string
): ServerActionResponse {
  logger.error(`Error in ${context}:`, error)
  
  return {
    success: false,
    error: error instanceof Error ? error.message : `Failed: ${context}`
  }
}

/**
 * Execute server action with error handling
 * Wraps async function with try/catch and consistent error handling
 */
export async function executeServerAction<T>(
  action: () => Promise<T>,
  context: string
): Promise<ServerActionResponse<T>> {
  try {
    const result = await action()
    return { success: true, data: result }
  } catch (error) {
    return handleServerActionError(error, context)
  }
}

/**
 * Entity types for role-based access control
 */
export type RoleBasedEntity = 'business' | 'opportunity' | 'booking-request' | 'deal' | 'event'

/**
 * Build role-based where clause for database queries
 * Centralizes the common pattern of filtering data based on user role
 * 
 * @param role - User's role (admin, sales, editor)
 * @param userId - Clerk user ID
 * @param entity - The entity type being queried
 * @returns Object with whereClause and hasAccess flag
 */
export function buildRoleBasedWhereClause(
  role: UserRole,
  userId: string,
  entity: RoleBasedEntity
): { whereClause: Record<string, any>; hasAccess: boolean } {
  // Admin sees everything
  if (role === 'admin') {
    return { whereClause: {}, hasAccess: true }
  }

  // Editor Senior access rules
  if (role === 'editor_senior') {
    switch (entity) {
      case 'deal':
        // Editor Senior sees all deals
        return { whereClause: {}, hasAccess: true }
      default:
        // No access to other entities
        return { whereClause: {}, hasAccess: false }
    }
  }

  // Editor access rules
  if (role === 'editor' || role === 'ere') {
    switch (entity) {
      case 'deal':
        // Editors and ERE only see deals assigned to them
        return { whereClause: { responsibleId: userId }, hasAccess: true }
      default:
        // Editors don't have access to other entities
        return { whereClause: {}, hasAccess: false }
    }
  }

  // Sales access rules
  if (role === 'sales') {
    switch (entity) {
      case 'business':
        // Sales only see businesses where they are the owner
        return { whereClause: { ownerId: userId }, hasAccess: true }
      case 'opportunity':
        // Sales only see opportunities where they are responsible
        return { whereClause: { responsibleId: userId }, hasAccess: true }
      case 'booking-request':
        // Sales only see their own requests
        return { whereClause: { userId: userId }, hasAccess: true }
      case 'deal':
        // Sales see deals (filtering by opportunity.responsibleId done separately)
        return { whereClause: {}, hasAccess: true }
      case 'event':
        // Sales see all events (events are shared)
        return { whereClause: {}, hasAccess: true }
      default:
        return { whereClause: {}, hasAccess: true }
    }
  }

  // Default: no access
  return { whereClause: {}, hasAccess: false }
}

/**
 * Get user role with auth check
 * Combines auth and role fetching in one call
 */
export async function getAuthenticatedUserRole(): Promise<{
  userId: string
  role: UserRole
} | ServerActionResponse> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  
  const role = await getUserRole()
  return { userId: authResult.userId, role }
}
