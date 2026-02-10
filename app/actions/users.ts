'use server'

import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateUserCache, invalidateEntity } from '@/lib/cache'
import { isAdmin, isEditorSenior } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/constants'
import { logger } from '@/lib/logger'

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
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { isActive: 'desc' }, // Active users first
        { name: 'asc' },
      ],
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

/**
 * Update editor max active deals capacity (admin/editor senior only)
 */
export async function updateUserMaxActiveDeals(clerkId: string, maxActiveDeals: number | null) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const [admin, editorSenior] = await Promise.all([isAdmin(), isEditorSenior()])
    if (!admin && !editorSenior) {
      return { success: false, error: 'Unauthorized: Admin or Editor Senior access required' }
    }

    const target = await prisma.userProfile.findUnique({
      where: { clerkId },
      select: { role: true },
    })

    if (!target) {
      return { success: false, error: 'User not found' }
    }

    if (target.role !== 'editor') {
      return { success: false, error: 'Solo se puede configurar para usuarios Editor' }
    }

    const sanitized = maxActiveDeals === null ? null : Math.max(0, Math.floor(maxActiveDeals))

    const updated = await prisma.userProfile.update({
      where: { clerkId },
      data: { maxActiveDeals: sanitized },
      select: {
        clerkId: true,
        maxActiveDeals: true,
      },
    })

    invalidateUserCache(clerkId)

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateUserMaxActiveDeals')
  }
}

/**
 * Delete user profile (admin only)
 * This removes the user from the local database but does NOT delete them from Clerk
 * Also clears ownerId from businesses owned by this user
 */
export async function deleteUserProfile(clerkId: string) {
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

    // Prevent admin from deleting themselves
    if (clerkId === authResult.userId) {
      return { success: false, error: 'You cannot delete your own account' }
    }

    // Get user info before deleting for logging
    const user = await prisma.userProfile.findUnique({
      where: { clerkId },
      select: { email: true, name: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Clear ownerId on businesses where this user is the owner
      const clearedBusinesses = await tx.business.updateMany({
        where: { ownerId: clerkId },
        data: { ownerId: null },
      })

      if (clearedBusinesses.count > 0) {
        logger.info(`Cleared ownerId from ${clearedBusinesses.count} businesses for user ${clerkId}`)
      }

      // Delete user profile
      await tx.userProfile.delete({
        where: { clerkId },
      })
    })

    // Invalidate cache
    invalidateUserCache(clerkId)
    invalidateEntity('businesses')

    logger.info(`User profile deleted: ${user.email} (${clerkId})`)

    return { success: true, data: { email: user.email, name: user.name } }
  } catch (error) {
    return handleServerActionError(error, 'deleteUserProfile')
  }
}

/**
 * Sync preview result type
 */
export type SyncPreview = {
  toCreate: Array<{ clerkId: string; email: string | null; name: string | null }>
  toUpdate: Array<{ clerkId: string; email: string | null; name: string | null; changes: string[] }>
  toDeactivate: Array<{ clerkId: string; email: string | null; name: string | null }>
  toReactivate: Array<{ clerkId: string; email: string | null; name: string | null }>
}

/**
 * Get Clerk client instance
 */
async function getClerkClient() {
  return await clerkClient()
}

/**
 * Normalize email for comparison (lowercase, trimmed)
 */
function normalizeEmail(email: string | null | undefined): string | null {
  return email ? email.toLowerCase().trim() : null
}

/**
 * Preview sync changes between Clerk and database (admin only)
 * Uses EMAIL as primary identifier to handle re-created Clerk users
 * This doesn't make any changes, just shows what would change
 */
export async function previewUserSync(): Promise<{ success: boolean; data?: SyncPreview; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const admin = await isAdmin()
    if (!admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Fetch all users from Clerk
    const client = await getClerkClient()
    const clerkUsers = await client.users.getUserList({ limit: 500 })
    
    // Fetch all user profiles from database
    const dbProfiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        isActive: true,
      },
    })

    // Create maps for quick lookup - use EMAIL as primary key (normalized)
    const dbProfileByEmail = new Map<string, typeof dbProfiles[0]>()
    const dbProfileByClerkId = new Map<string, typeof dbProfiles[0]>()
    
    for (const p of dbProfiles) {
      const normalizedEmail = normalizeEmail(p.email)
      if (normalizedEmail) {
        dbProfileByEmail.set(normalizedEmail, p)
      }
      dbProfileByClerkId.set(p.clerkId, p)
    }

    // Create set of Clerk emails for deactivation check
    const clerkEmailSet = new Set<string>()
    for (const u of clerkUsers.data) {
      const email = normalizeEmail(u.emailAddresses[0]?.emailAddress)
      if (email) {
        clerkEmailSet.add(email)
      }
    }

    const preview: SyncPreview = {
      toCreate: [],
      toUpdate: [],
      toDeactivate: [],
      toReactivate: [],
    }

    // Track which DB profiles we've matched (to avoid duplicate processing)
    const matchedDbProfileIds = new Set<string>()

    // Check each Clerk user - match by EMAIL first, then by clerkId
    for (const clerkUser of clerkUsers.data) {
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null
      const normalizedClerkEmail = normalizeEmail(clerkEmail)
      const clerkName = clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
        : clerkUser.firstName || clerkUser.lastName || null

      // Try to find existing profile by email first (handles re-created users)
      let dbProfile = normalizedClerkEmail ? dbProfileByEmail.get(normalizedClerkEmail) : undefined
      
      // If not found by email, try by clerkId (handles email changes)
      if (!dbProfile) {
        dbProfile = dbProfileByClerkId.get(clerkUser.id)
      }

      if (!dbProfile) {
        // Truly new user - needs to be created
        preview.toCreate.push({
          clerkId: clerkUser.id,
          email: clerkEmail,
          name: clerkName,
        })
      } else {
        matchedDbProfileIds.add(dbProfile.id)
        
        // Existing user - check for updates
        const changes: string[] = []
        
        // Check if clerkId needs to be updated (user was re-created in Clerk)
        if (dbProfile.clerkId !== clerkUser.id) {
          changes.push(`clerkId: ${dbProfile.clerkId.slice(0, 8)}... → ${clerkUser.id.slice(0, 8)}...`)
        }
        if (normalizeEmail(dbProfile.email) !== normalizedClerkEmail) {
          changes.push(`email: ${dbProfile.email || '(none)'} → ${clerkEmail || '(none)'}`)
        }
        if (dbProfile.name !== clerkName) {
          changes.push(`name: ${dbProfile.name || '(none)'} → ${clerkName || '(none)'}`)
        }
        
        if (changes.length > 0) {
          preview.toUpdate.push({
            clerkId: clerkUser.id,
            email: clerkEmail,
            name: clerkName,
            changes,
          })
        }

        // Check if user was deactivated but exists in Clerk (needs reactivation)
        if (!dbProfile.isActive) {
          preview.toReactivate.push({
            clerkId: clerkUser.id,
            email: clerkEmail,
            name: clerkName,
          })
        }
      }
    }

    // Check for DB profiles whose EMAIL is not in Clerk (should be deactivated)
    for (const dbProfile of dbProfiles) {
      const normalizedDbEmail = normalizeEmail(dbProfile.email)
      
      // Only deactivate if:
      // 1. Profile is currently active
      // 2. Profile wasn't matched to a Clerk user
      // 3. Profile's email is not in Clerk (or has no email)
      if (
        dbProfile.isActive && 
        !matchedDbProfileIds.has(dbProfile.id) &&
        (!normalizedDbEmail || !clerkEmailSet.has(normalizedDbEmail))
      ) {
        preview.toDeactivate.push({
          clerkId: dbProfile.clerkId,
          email: dbProfile.email,
          name: dbProfile.name,
        })
      }
    }

    return { success: true, data: preview }
  } catch (error) {
    logger.error('[users] Error previewing sync:', error)
    return handleServerActionError(error, 'previewUserSync')
  }
}

/**
 * Apply sync changes between Clerk and database (admin only)
 * Uses EMAIL as primary identifier to handle re-created Clerk users
 */
export async function applyUserSync(): Promise<{
  success: boolean
  data?: { created: number; updated: number; deactivated: number; reactivated: number }
  error?: string
}> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    const admin = await isAdmin()
    if (!admin) {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Fetch all users from Clerk
    const client = await getClerkClient()
    const clerkUsers = await client.users.getUserList({ limit: 500 })
    
    // Fetch all user profiles from database
    const dbProfiles = await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
      },
    })

    // Create maps for quick lookup - use EMAIL as primary key (normalized)
    const dbProfileByEmail = new Map<string, typeof dbProfiles[0]>()
    const dbProfileByClerkId = new Map<string, typeof dbProfiles[0]>()
    
    for (const p of dbProfiles) {
      const normalizedEmail = normalizeEmail(p.email)
      if (normalizedEmail) {
        dbProfileByEmail.set(normalizedEmail, p)
      }
      dbProfileByClerkId.set(p.clerkId, p)
    }

    // Create set of Clerk emails for deactivation check
    const clerkEmailSet = new Set<string>()
    for (const u of clerkUsers.data) {
      const email = normalizeEmail(u.emailAddresses[0]?.emailAddress)
      if (email) {
        clerkEmailSet.add(email)
      }
    }

    let created = 0
    let updated = 0
    let deactivated = 0
    let reactivated = 0

    // Track which DB profiles we've matched
    const matchedDbProfileIds = new Set<string>()

    // Process Clerk users - match by EMAIL first, then by clerkId
    for (const clerkUser of clerkUsers.data) {
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null
      const normalizedClerkEmail = normalizeEmail(clerkEmail)
      const clerkName = clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}`.trim()
        : clerkUser.firstName || clerkUser.lastName || null

      // Try to find existing profile by email first (handles re-created users)
      let dbProfile = normalizedClerkEmail ? dbProfileByEmail.get(normalizedClerkEmail) : undefined
      
      // If not found by email, try by clerkId (handles email changes)
      if (!dbProfile) {
        dbProfile = dbProfileByClerkId.get(clerkUser.id)
      }

      if (!dbProfile) {
        // Create new user profile
        await prisma.userProfile.create({
          data: {
            clerkId: clerkUser.id,
            email: clerkEmail,
            name: clerkName,
            role: 'sales', // Default role for new users
            isActive: true,
          },
        })
        created++
        logger.info(`[users] Created profile for ${clerkEmail || clerkUser.id}`)
      } else {
        matchedDbProfileIds.add(dbProfile.id)
        
        // Check if update needed (including clerkId update for re-created users)
        const needsUpdate = 
          dbProfile.clerkId !== clerkUser.id ||
          normalizeEmail(dbProfile.email) !== normalizedClerkEmail || 
          dbProfile.name !== clerkName || 
          !dbProfile.isActive

        if (needsUpdate) {
          const oldClerkId = dbProfile.clerkId
          
          await prisma.userProfile.update({
            where: { id: dbProfile.id }, // Use id instead of clerkId in case clerkId changed
            data: {
              clerkId: clerkUser.id, // Update to new clerkId if user was re-created
              email: clerkEmail,
              name: clerkName,
              isActive: true, // Reactivate if was deactivated
            },
          })
          
          if (!dbProfile.isActive) {
            reactivated++
            logger.info(`[users] Reactivated profile for ${clerkEmail || clerkUser.id}`)
          } else {
            updated++
            if (oldClerkId !== clerkUser.id) {
              logger.info(`[users] Updated profile for ${clerkEmail} - clerkId changed from ${oldClerkId} to ${clerkUser.id}`)
            } else {
              logger.info(`[users] Updated profile for ${clerkEmail || clerkUser.id}`)
            }
          }
          
          // Invalidate cache for both old and new clerkId
          invalidateUserCache(clerkUser.id)
          if (oldClerkId !== clerkUser.id) {
            invalidateUserCache(oldClerkId)
          }
        }
      }
    }

    // Deactivate profiles whose EMAIL is not in Clerk
    for (const dbProfile of dbProfiles) {
      const normalizedDbEmail = normalizeEmail(dbProfile.email)
      
      if (
        dbProfile.isActive && 
        !matchedDbProfileIds.has(dbProfile.id) &&
        (!normalizedDbEmail || !clerkEmailSet.has(normalizedDbEmail))
      ) {
        await prisma.userProfile.update({
          where: { id: dbProfile.id },
          data: { isActive: false },
        })
        deactivated++
        logger.info(`[users] Deactivated profile for ${dbProfile.email || dbProfile.clerkId}`)
        invalidateUserCache(dbProfile.clerkId)
      }
    }

    // Invalidate general user cache
    invalidateEntity('users')

    return { 
      success: true, 
      data: { created, updated, deactivated, reactivated } 
    }
  } catch (error) {
    logger.error('[users] Error applying sync:', error)
    return handleServerActionError(error, 'applyUserSync')
  }
}
