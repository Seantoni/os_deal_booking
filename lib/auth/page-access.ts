import { redirect } from 'next/navigation'
import { getUserRole } from './roles'
import type { UserRole } from '@/lib/constants'

/**
 * Define which roles can access which pages
 * IMPORTANT: This uses default-deny - pages NOT listed here will be blocked
 */
export const PAGE_ACCESS: Record<string, UserRole[]> = {
  '/events': ['admin', 'sales', 'editor_senior'],
  '/dashboard': ['admin', 'sales', 'editor_senior'],
  '/pipeline': ['admin', 'sales', 'editor_senior'],
  '/tasks': ['admin', 'sales'],
  '/leads': ['admin'],
  '/businesses': ['admin', 'sales'],
  '/opportunities': ['admin', 'sales'],
  '/booking-requests': ['admin', 'sales', 'editor_senior'],
  '/booking-requests/new': ['admin', 'sales', 'editor_senior'],
  '/booking-requests/edit': ['admin', 'sales', 'editor_senior'], // Matches /booking-requests/edit/[id]
  '/reservations': ['admin', 'sales'],
  '/deals': ['admin', 'sales', 'editor', 'editor_senior'],
  '/marketing': ['admin', 'marketing', 'sales'],
  '/market-intelligence': ['admin'],
  '/leads-negocios': ['admin'],
  '/settings': ['admin'],
  '/activity-log': ['admin'],
  // Additional pages that were missing
  '/assignments': ['admin'],
  '/campaigns': ['admin', 'marketing', 'sales'],
}

/**
 * Get the default redirect page for a role
 * Note: This is async to comply with 'use server' requirements
 */
export async function getDefaultPageForRole(role: UserRole): Promise<string> {
  switch (role) {
    case 'admin':
      return '/dashboard'
    case 'sales':
      return '/events'
    case 'editor':
    case 'editor_senior':
      return '/deals'
    case 'marketing':
      return '/marketing'
    default:
      return '/events'
  }
}

/**
 * Check if a user role can access a specific page
 */
export async function canAccessPage(pathname: string): Promise<boolean> {
  const role = await getUserRole()
  
  // Check exact match first
  let allowedRoles = PAGE_ACCESS[pathname]
  
  // If no exact match, check for dynamic routes (e.g., /booking-requests/edit/[id])
  if (!allowedRoles) {
    // Check if pathname starts with any key in PAGE_ACCESS
    for (const [key, roles] of Object.entries(PAGE_ACCESS)) {
      if (pathname.startsWith(key)) {
        allowedRoles = roles
        break
      }
    }
  }
  
  if (!allowedRoles) {
    // Default-deny: if page is not in the list, deny access
    // This prevents accidental exposure of new pages
    console.warn(`[Page Access] Denied access to unlisted page: ${pathname}`)
    return false
  }
  
  return allowedRoles.includes(role)
}

/**
 * Require page access - redirects if user doesn't have access
 */
export async function requirePageAccess(pathname: string) {
  const hasAccess = await canAccessPage(pathname)
  
  if (!hasAccess) {
    const role = await getUserRole()
    const defaultPage = await getDefaultPageForRole(role)
    redirect(defaultPage)
  }
}
