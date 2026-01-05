/**
 * User and role type definitions
 */

import type { UserRole as BaseUserRole } from '@/lib/constants'

export type UserRole = BaseUserRole | null

/**
 * Full user profile from database
 */
export type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string // 'admin' | 'sales' | 'editor' | 'ere'
  createdAt: Date
  updatedAt: Date
}

/**
 * Minimal user data for dropdowns and assignments
 * This is the subset fetched in the layout for shared context
 */
export type UserData = Pick<UserProfile, 'id' | 'clerkId' | 'name' | 'email' | 'role'>

