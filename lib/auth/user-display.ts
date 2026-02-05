import { prisma } from '@/lib/prisma'

/**
 * Type for Clerk user object (subset of fields we use)
 */
export interface ClerkUserLike {
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  username?: string | null
  emailAddresses?: Array<{ emailAddress: string }>
}

/**
 * Extract display name from a Clerk user object.
 * Single source of truth for name resolution priority.
 * 
 * Priority:
 * 1. fullName (if available)
 * 2. firstName + lastName (combined)
 * 3. firstName only
 * 4. username
 * 5. null
 * 
 * @param user - Clerk user object or similar structure
 * @returns Display name or null
 */
export function extractDisplayName(user: ClerkUserLike | null | undefined): string | null {
  if (!user) return null
  
  // Priority 1: fullName (Clerk provides this as a computed field)
  if (user.fullName?.trim()) {
    return user.fullName.trim()
  }
  
  // Priority 2: firstName + lastName combined
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim()
  }
  
  // Priority 3: firstName only
  if (user.firstName?.trim()) {
    return user.firstName.trim()
  }
  
  // Priority 4: username
  if (user.username?.trim()) {
    return user.username.trim()
  }
  
  return null
}

/**
 * Extract email from a Clerk user object.
 * 
 * @param user - Clerk user object or similar structure
 * @returns Primary email or first email, or null
 */
export function extractUserEmail(user: ClerkUserLike | null | undefined): string | null {
  if (!user) return null
  return user.emailAddresses?.[0]?.emailAddress || null
}

/**
 * Get display name and email from UserProfile by clerkId.
 * Uses the database as source of truth (synced from Clerk).
 * 
 * @param clerkId - Clerk user ID
 * @returns Object with name and email, or null if not found
 */
export async function getUserDisplayInfo(clerkId: string): Promise<{
  name: string | null
  email: string | null
} | null> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { clerkId },
      select: { name: true, email: true },
    })
    
    if (!profile) return null
    
    return {
      name: profile.name,
      email: profile.email,
    }
  } catch (error) {
    console.error('[getUserDisplayInfo] Failed to fetch user profile:', error)
    return null
  }
}

/**
 * Get display name from UserProfile, with fallback to email prefix.
 * 
 * @param clerkId - Clerk user ID
 * @returns Display name, email prefix, or 'Unknown'
 */
export async function getDisplayNameByClerkId(clerkId: string): Promise<string> {
  const info = await getUserDisplayInfo(clerkId)
  
  if (info?.name) return info.name
  if (info?.email) return info.email.split('@')[0]
  
  return 'Unknown'
}

/**
 * Batch fetch display info for multiple users.
 * More efficient than individual lookups.
 * 
 * @param clerkIds - Array of Clerk user IDs
 * @returns Map of clerkId to display info
 */
export async function getBatchUserDisplayInfo(clerkIds: string[]): Promise<Map<string, {
  name: string | null
  email: string | null
}>> {
  const result = new Map<string, { name: string | null; email: string | null }>()
  
  if (clerkIds.length === 0) return result
  
  try {
    const profiles = await prisma.userProfile.findMany({
      where: { clerkId: { in: clerkIds } },
      select: { clerkId: true, name: true, email: true },
    })
    
    for (const profile of profiles) {
      result.set(profile.clerkId, {
        name: profile.name,
        email: profile.email,
      })
    }
  } catch (error) {
    console.error('[getBatchUserDisplayInfo] Failed to fetch user profiles:', error)
  }
  
  return result
}
