/**
 * Centralized Cache Invalidation
 * 
 * Provides a single source of truth for cache invalidation across the application.
 * Uses tags as the primary invalidation mechanism with optional path revalidation
 * for immediate UI updates.
 * 
 * Usage:
 *   import { invalidateEntity } from '@/lib/cache'
 *   
 *   // After updating a deal:
 *   invalidateEntity('deals')
 *   
 *   // After updating something that affects multiple entities:
 *   invalidateEntity('deals')
 *   invalidateEntity('opportunities')
 */

import { revalidatePath, revalidateTag } from 'next/cache'

// Type-safe wrappers for Next.js cache functions
// Workaround for TypeScript definition issues in Next.js
const safeRevalidateTag = revalidateTag as (tag: string) => void
const safeRevalidatePath = revalidatePath as (path: string) => void

// ============================================================================
// Entity Configuration
// ============================================================================

/**
 * Cache entity configuration
 * - tags: Cache tags to invalidate (primary mechanism)
 * - paths: Paths to revalidate for immediate UI updates (use sparingly)
 * - cascadeInvalidates: Other entities that should be invalidated when this one changes
 */
export const CACHE_ENTITIES = {
  deals: {
    tags: ['deals'],
    paths: ['/deals', '/pipeline'],
    cascadeInvalidates: ['dashboard'],
  },
  opportunities: {
    tags: ['opportunities'],
    paths: ['/opportunities', '/pipeline'],
    cascadeInvalidates: ['dashboard'],
  },
  businesses: {
    tags: ['businesses'],
    paths: ['/businesses'],
    cascadeInvalidates: [],
  },
  leads: {
    tags: ['leads'],
    paths: ['/leads'],
    cascadeInvalidates: [],
  },
  'booking-requests': {
    tags: ['booking-requests'],
    paths: ['/booking-requests'],
    cascadeInvalidates: ['events', 'dashboard'],
  },
  events: {
    tags: ['events'],
    paths: ['/events'],
    cascadeInvalidates: [],
  },
  categories: {
    tags: ['categories'],
    paths: [], // Categories are cached globally, no path revalidation needed
    cascadeInvalidates: [],
  },
  dashboard: {
    tags: ['dashboard'],
    paths: ['/dashboard'],
    cascadeInvalidates: [],
  },
  users: {
    tags: ['users'],
    paths: ['/settings'],
    cascadeInvalidates: [],
  },
  'custom-fields': {
    tags: ['custom-fields'],
    paths: ['/settings'],
    cascadeInvalidates: [],
  },
  filters: {
    tags: ['filters'],
    paths: [], // Filter changes don't need path revalidation
    cascadeInvalidates: [],
  },
  'form-config': {
    tags: ['form-config'],
    paths: ['/settings'],
    cascadeInvalidates: [],
  },
  'public-request-links': {
    tags: ['public-request-links'],
    paths: [],
    cascadeInvalidates: [],
  },
  'access-control': {
    tags: ['access-control'],
    paths: ['/access-management'],
    cascadeInvalidates: [],
  },
  tasks: {
    tags: ['tasks'],
    paths: ['/tasks'],
    cascadeInvalidates: ['opportunities'],
  },
} as const

export type CacheEntity = keyof typeof CACHE_ENTITIES

// ============================================================================
// Invalidation Functions
// ============================================================================

/**
 * Invalidate cache for a specific entity
 * 
 * @param entity - The entity type to invalidate
 * @param options - Optional configuration
 * @param options.cascade - Whether to cascade invalidation to dependent entities (default: true)
 * @param options.skipPaths - Skip path revalidation (useful when calling from other invalidations)
 * @param options.additionalPaths - Additional paths to revalidate (e.g., specific entity pages)
 * 
 * @example
 * // Basic usage
 * invalidateEntity('deals')
 * 
 * // With additional path for specific entity
 * invalidateEntity('deals', { additionalPaths: [`/deals/${dealId}/draft`] })
 * 
 * // Without cascade (to prevent infinite loops in cascade chains)
 * invalidateEntity('dashboard', { cascade: false })
 */
export function invalidateEntity(
  entity: CacheEntity,
  options: {
    cascade?: boolean
    skipPaths?: boolean
    additionalPaths?: string[]
  } = {}
): void {
  const { cascade = true, skipPaths = false, additionalPaths = [] } = options
  const config = CACHE_ENTITIES[entity]

  // 1. Invalidate tags (primary mechanism)
  for (const tag of config.tags) {
    safeRevalidateTag(tag)
  }

  // 2. Revalidate paths for immediate UI updates (if not skipped)
  if (!skipPaths) {
    for (const path of config.paths) {
      safeRevalidatePath(path)
    }
    for (const path of additionalPaths) {
      safeRevalidatePath(path)
    }
  }

  // 3. Cascade to dependent entities (without further cascading to prevent loops)
  if (cascade && config.cascadeInvalidates.length > 0) {
    for (const dependentEntity of config.cascadeInvalidates) {
      invalidateEntity(dependentEntity as CacheEntity, { cascade: false, skipPaths: true })
    }
  }
}

/**
 * Invalidate multiple entities at once
 * 
 * @param entities - Array of entities to invalidate
 * @param options - Optional configuration (applied to all entities)
 * 
 * @example
 * invalidateEntities(['deals', 'opportunities', 'dashboard'])
 */
export function invalidateEntities(
  entities: CacheEntity[],
  options: {
    cascade?: boolean
    skipPaths?: boolean
  } = {}
): void {
  for (const entity of entities) {
    invalidateEntity(entity, options)
  }
}

/**
 * Invalidate user-specific cache (e.g., after role change)
 * This is a special case that invalidates user-related tags and multiple entity paths
 * 
 * @param clerkId - The Clerk user ID
 */
export function invalidateUserCache(clerkId: string): void {
  // Invalidate user-specific tag
  safeRevalidateTag(`user-role-${clerkId}`)
  safeRevalidateTag('users')
  
  // User role changes affect visibility of many entities
  // Revalidate key paths that depend on role-based filtering
  const roleSensitivePaths = [
    '/settings',
    '/deals',
    '/opportunities',
    '/businesses',
    '/leads',
    '/booking-requests',
    '/events',
    '/pipeline',
    '/dashboard',
    '/tasks',
  ]
  
  for (const path of roleSensitivePaths) {
    safeRevalidatePath(path)
  }
}

/**
 * Invalidate custom field cache for a specific entity type
 * 
 * @param entityType - The entity type ('business', 'opportunity', 'deal', 'lead')
 */
export function invalidateCustomFieldCache(entityType: string): void {
  safeRevalidateTag(`custom-fields-${entityType}`)
  safeRevalidateTag('custom-fields')
}

