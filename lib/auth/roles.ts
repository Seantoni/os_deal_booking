'use server'

import { cache } from 'react'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/constants'

// Re-export for backward compatibility
export type { UserRole }

/**
 * Internal function to get or create user profile
 * This is wrapped with React's cache() to memoize per request
 */
async function _getUserProfileInternal() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  // Upsert to avoid duplicate insert races on clerkId
  const user = await currentUser()
  const userEmail = user?.emailAddresses[0]?.emailAddress || null

  // Check if user has a pending invitation with role assignment
  let assignedRole: UserRole = 'sales' // Default role
  if (userEmail) {
    try {
      const { processInvitationOnSignup } = await import('@/app/actions/access-control')
      const invitationResult = await processInvitationOnSignup(userId, userEmail)
      if (invitationResult.success && invitationResult.role) {
        assignedRole = invitationResult.role as UserRole
      }
    } catch (error) {
      // If invitation processing fails, use default role
      console.error('Error processing invitation on signup:', error)
    }
  }

  const profile = await prisma.userProfile.upsert({
    where: { clerkId: userId },
    update: {
      // Do not override role on existing users; only refresh name/email
      email: userEmail ?? undefined,
      name: (user?.fullName || user?.firstName) ?? undefined,
    },
    create: {
      clerkId: userId,
      email: userEmail,
      name: user?.fullName || user?.firstName || null,
      role: assignedRole,
    },
  })

  return profile
}

/**
 * Get or create user profile with role
 * Memoized per request using React's cache() to prevent redundant Clerk API calls
 * Multiple calls within the same request will return the same cached result
 */
export const getUserProfile = cache(_getUserProfileInternal)

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'admin'
}

/**
 * Check if current user is sales
 */
export async function isSales(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'sales'
}

/**
 * Check if current user is editor
 */
export async function isEditor(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'editor' || profile?.role === 'ere'
}

/**
 * Check if current user is editor or ERE
 */
export async function isEditorOrERE(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'editor' || profile?.role === 'ere'
}

/**
 * Get user role
 */
export async function getUserRole(): Promise<UserRole> {
  const profile = await getUserProfile()
  return (profile?.role as UserRole) || 'sales'
}

/**
 * Require admin role (throws error if not admin)
 */
export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
}

