/**
 * User and role type definitions
 */

import type { UserRole as BaseUserRole } from '@/lib/constants'

export type UserRole = BaseUserRole | null

export type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string // 'admin' | 'sales' | 'editor' | 'ere'
  createdAt: Date
  updatedAt: Date
}

