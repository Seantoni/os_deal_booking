import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import AppClientProviders from '@/components/common/AppClientProviders'
import HamburgerMenu from '@/components/common/HamburgerMenu'
import MobileBottomNav from '@/components/common/MobileBottomNav'
import { CACHE_REVALIDATE_CATEGORIES_SECONDS, CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import type { UserRole } from '@/types'

/**
 * Server-side data fetching for app layout
 * This runs on the server and provides initial data to avoid client waterfalls
 */

// Cached categories fetch (shared across all users)
const getCachedCategories = unstable_cache(
  async () => {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [
        { parentCategory: 'asc' },
        { displayOrder: 'asc' },
        { subCategory1: 'asc' },
      ],
    })
  },
  ['layout-categories'],
  {
    tags: ['categories'],
    revalidate: CACHE_REVALIDATE_CATEGORIES_SECONDS,
  }
)

// Cached users fetch (for admin sidebar/forms)
const getCachedUsers = unstable_cache(
  async () => {
    return await prisma.userProfile.findMany({
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    })
  },
  ['layout-users'],
  {
    tags: ['users'],
    revalidate: CACHE_REVALIDATE_SECONDS,
  }
)

// Get user role (per-user cache)
async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const getCachedRole = unstable_cache(
    async () => {
      const profile = await prisma.userProfile.findUnique({
        where: { clerkId: userId },
        select: { role: true },
      })
      return profile?.role as UserRole | null
    },
    [`user-role-${userId}`],
    {
      tags: [`user-role-${userId}`, 'users'],
      revalidate: CACHE_REVALIDATE_SECONDS,
    }
  )
  return getCachedRole()
}

/**
 * Server Component Layout for authenticated pages
 * Fetches shared data on server and passes to client providers
 */
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()
  
  // Parallel data fetching on server
  const [categories, users, role] = await Promise.all([
    getCachedCategories().catch(() => []),
    userId ? getCachedUsers().catch(() => []) : Promise.resolve([]),
    userId ? getUserRoleFromDb(userId).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <AppClientProviders
      initialCategories={categories}
      initialUsers={users}
      initialRole={role}
    >
      <div className="h-screen flex flex-col bg-white">
        <HamburgerMenu />
        {children}
        <MobileBottomNav />
      </div>
    </AppClientProviders>
  )
}
