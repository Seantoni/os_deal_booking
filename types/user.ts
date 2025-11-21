/**
 * User and role type definitions
 */

export type UserRole = 'admin' | 'sales' | null

export type UserProfile = {
  id: string
  clerkId: string
  email: string | null
  name: string | null
  role: string // 'admin' | 'sales'
  createdAt: Date
  updatedAt: Date
}

