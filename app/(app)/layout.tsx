import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import AppClientProviders from '@/components/common/AppClientProviders'
import GlobalHeader from '@/components/common/GlobalHeader'
import HamburgerMenu from '@/components/common/HamburgerMenu'
import MobileBottomNav from '@/components/common/MobileBottomNav'
import { CACHE_REVALIDATE_CATEGORIES_SECONDS, CACHE_REVALIDATE_SECONDS } from '@/lib/constants'
import type { UserRole } from '@/types'
import { getUserRole } from '@/lib/auth/roles'

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
        team: true,
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
    userId ? getUserRole().catch(() => null) : Promise.resolve(null),
  ])

  return (
    <AppClientProviders
      initialCategories={categories}
      initialUsers={users}
      initialRole={role}
    >
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Global Header - persistent across all pages */}
        <GlobalHeader />
        
        {/* Main area: Sidebar + Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          <HamburgerMenu />
          
          {/* Page content area */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileBottomNav />
      </div>
    </AppClientProviders>
  )
}
