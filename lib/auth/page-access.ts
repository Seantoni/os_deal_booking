import { redirect } from 'next/navigation'
import { getUserRole, type UserRole } from './roles'

/**
 * Define which roles can access which pages
 */
export const PAGE_ACCESS: Record<string, UserRole[]> = {
  '/events': ['admin', 'sales'],
  '/dashboard': ['admin', 'sales'],
  '/pipeline': ['admin', 'sales'],
  '/tasks': ['admin', 'sales'],
  '/leads': ['admin'],
  '/businesses': ['admin', 'sales'],
  '/opportunities': ['admin', 'sales'],
  '/booking-requests': ['admin', 'sales'],
  '/booking-requests/new': ['admin', 'sales'],
  '/booking-requests/edit': ['admin', 'sales'], // Matches /booking-requests/edit/[id]
  '/reservations': ['admin', 'sales'],
  '/deals': ['admin', 'sales', 'editor'],
  '/marketing': ['admin', 'marketing'],
  '/settings': ['admin'],
  '/activity-log': ['admin'],
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
    // If page is not in the list, allow access (for backward compatibility)
    return true
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

