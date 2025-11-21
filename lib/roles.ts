'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from './prisma'

export type UserRole = 'admin' | 'sales'

/**
 * Get or create user profile with role
 */
export async function getUserProfile() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  // Try to get existing profile
  let profile = await prisma.userProfile.findUnique({
    where: { clerkId: userId },
  })

  // If profile doesn't exist, create it
  if (!profile) {
    const user = await currentUser()
    
    profile = await prisma.userProfile.create({
      data: {
        clerkId: userId,
        email: user?.emailAddresses[0]?.emailAddress || null,
        name: user?.fullName || user?.firstName || null,
        role: 'sales', // Default role
      },
    })
  }

  return profile
}

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

