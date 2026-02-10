'use server'

import { cache } from 'react'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@/lib/constants'
import { extractDisplayName, extractUserEmail } from '@/lib/auth/user-display'

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
  let user: Awaited<ReturnType<typeof currentUser>> = null
  try {
    user = await currentUser()
  } catch (error) {
    // Clerk API can fail (network issues, rate limits, cold-start timeouts).
    // Fall back to DB-only lookup so the page still renders.
    console.error('[auth] Clerk currentUser() failed, falling back to DB lookup:', error)
    const existing = await prisma.userProfile.findUnique({ where: { clerkId: userId } })
    if (existing) return existing
    // First-time user AND Clerk is down — return a minimal profile without persisting
    return null
  }

  const userEmail = extractUserEmail(user)

  // Check if user has a pending invitation with role assignment
  let assignedRole: UserRole = 'sales' // Default role
  let invitedName: string | null = null
  
  if (userEmail) {
    try {
      const { processInvitationOnSignup } = await import('@/app/actions/access-control')
      const invitationResult = await processInvitationOnSignup(userId, userEmail)
      if (invitationResult.success && invitationResult.role) {
        assignedRole = invitationResult.role as UserRole
        // Use name from invitation if available
        if ('name' in invitationResult && invitationResult.name) {
          invitedName = invitationResult.name as string
        }
      }
    } catch (error) {
      // If invitation processing fails, use default role
      console.error('[access-control] Error processing invitation on signup:', error)
    }
  }

  // Determine the best name to use: Clerk data > invitation data > null
  const clerkName = extractDisplayName(user)
  const userName = clerkName || invitedName

  const profile = await prisma.userProfile.upsert({
    where: { clerkId: userId },
    update: {
      // Do not override role on existing users; only refresh name/email
      email: userEmail ?? undefined,
      name: userName ?? undefined,
    },
    create: {
      clerkId: userId,
      email: userEmail,
      name: userName,
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
  return profile?.role === 'editor' || profile?.role === 'ere' || profile?.role === 'editor_senior'
}

/**
 * Check if current user is editor or ERE
 */
export async function isEditorOrERE(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'editor' || profile?.role === 'ere' || profile?.role === 'editor_senior'
}

/**
 * Check if current user is editor senior
 */
export async function isEditorSenior(): Promise<boolean> {
  const profile = await getUserProfile()
  return profile?.role === 'editor_senior'
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
