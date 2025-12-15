'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateUserCache } from '@/lib/cache'
import { isAdmin } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/auth/roles'

/**
 * Get all user profiles (admin only)
 */
export async function getAllUserProfiles() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Check if user is admin
    const admin = await isAdmin()
    if (!admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    const users = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: users }
  } catch (error) {
    return handleServerActionError(error, 'getAllUserProfiles')
  }
}

/**
 * Update user profile role (admin only)
 */
export async function updateUserRole(clerkId: string, role: UserRole) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Check if user is admin
    const admin = await isAdmin()
    if (!admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Validate role
    const { USER_ROLE_VALUES } = await import('@/lib/constants')
    if (!USER_ROLE_VALUES.includes(role)) {
      return { success: false, error: 'Invalid role. Must be admin, sales, editor, or ere' }
    }

    // Prevent admin from changing their own role
    if (clerkId === authResult.userId) {
      return { success: false, error: 'You cannot change your own role' }
    }

    // Update user role
    const updated = await prisma.userProfile.update({
      where: { clerkId },
      data: { role },
    })

    // Revalidate cache - invalidate both user-specific and general caches
    invalidateUserCache(clerkId)

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateUserRole')
  }
}

