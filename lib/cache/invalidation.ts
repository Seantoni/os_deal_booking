/**
 * Centralized Cache Invalidation
 * 
 * Provides a single source of truth for cache invalidation across the application.
 * Uses tags as the primary invalidation mechanism. Path revalidation is opt-in
 * for critical immediate UI updates only.
 * 
 * IMPORTANT: Cache Invalidation Discipline
 * - Always use the most specific entity tag possible
 * - Use granular invalidation (invalidateEntityById) for single-entity updates
 * - Only use cascadeInvalidates for truly dependent data (not for UI convenience)
 * - Avoid invalidateEntities with many entities - prefer explicit single invalidations
 * 
 * Usage:
 *   import { invalidateEntity, invalidateEntityById } from '@/lib/cache'
 *   
 *   // After updating a deal:
 *   invalidateEntity('deals')
 *   
 *   // After updating a specific business (more efficient):
 *   invalidateEntityById('businesses', businessId)
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
 * - paths: Paths to revalidate for immediate UI updates (opt-in, use sparingly)
 * - cascadeInvalidates: Other entities that should be invalidated when this one changes
 *   NOTE: Use sparingly! Only for truly dependent data. Dashboard/Pipeline should be
 *   invalidated explicitly when their aggregated data actually changes.
 */
export const CACHE_ENTITIES = {
  deals: {
    tags: ['deals'],
    paths: ['/deals'],
    // Cascade to pipeline since it displays deals
    cascadeInvalidates: ['pipeline'],
  },
  opportunities: {
    tags: ['opportunities'],
    paths: ['/opportunities'],
    // Cascade to pipeline since it displays opportunities
    cascadeInvalidates: ['pipeline'],
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
    // Cascade to pipeline since it displays booking requests
    cascadeInvalidates: ['pipeline'],
  },
  events: {
    tags: ['events'],
    paths: ['/events'],
    // Cascade to pipeline for pre-booked events
    cascadeInvalidates: ['pipeline'],
  },
  pipeline: {
    tags: ['pipeline'],
    paths: ['/pipeline'],
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
    // Tasks don't cascade to opportunities - they're independent
    // If opportunity data needs refreshing, invalidate it explicitly
    cascadeInvalidates: [],
  },
  'marketing-campaigns': {
    tags: ['marketing-campaigns'],
    paths: ['/marketing'],
    cascadeInvalidates: [],
  },
  assignments: {
    tags: ['assignments', 'businesses'],
    paths: ['/assignments'],
    cascadeInvalidates: ['businesses'],
  },
} as const

export type CacheEntity = keyof typeof CACHE_ENTITIES

// ============================================================================
// Invalidation Functions
// ============================================================================

/**
 * Invalidate cache for a specific entity (collection-level)
 * 
 * @param entity - The entity type to invalidate
 * @param options - Optional configuration
 * @param options.cascade - Whether to cascade invalidation to dependent entities (default: true)
 * @param options.includePaths - Whether to include path revalidation (default: false for efficiency)
 * @param options.additionalPaths - Additional paths to revalidate (e.g., specific entity pages)
 * 
 * @example
 * // Basic usage (tag-only, most efficient)
 * invalidateEntity('deals')
 * 
 * // With path revalidation for immediate UI update
 * invalidateEntity('deals', { includePaths: true })
 * 
 * // With additional path for specific entity page
 * invalidateEntity('deals', { additionalPaths: [`/deals/${dealId}/draft`] })
 * 
 * // Without cascade (to prevent infinite loops or when you know cascade isn't needed)
 * invalidateEntity('dashboard', { cascade: false })
 */
export function invalidateEntity(
  entity: CacheEntity,
  options: {
    cascade?: boolean
    includePaths?: boolean
    additionalPaths?: string[]
  } = {}
): void {
  // Default: tag-only invalidation (most efficient)
  // Path revalidation is opt-in for critical immediate UI updates
  const { cascade = true, includePaths = false, additionalPaths = [] } = options
  const config = CACHE_ENTITIES[entity]

  // 1. Invalidate tags (primary mechanism)
  for (const tag of config.tags) {
    safeRevalidateTag(tag)
  }

  // 2. Revalidate paths only if explicitly requested (opt-in)
  if (includePaths) {
    for (const path of config.paths) {
      safeRevalidatePath(path)
    }
  }
  
  // Always revalidate additional paths if provided
  for (const path of additionalPaths) {
    safeRevalidatePath(path)
  }

  // 3. Cascade to dependent entities (without further cascading to prevent loops)
  if (cascade && config.cascadeInvalidates.length > 0) {
    for (const dependentEntity of config.cascadeInvalidates) {
      invalidateEntity(dependentEntity as CacheEntity, { cascade: false, includePaths: false })
    }
  }
}

/**
 * Invalidate cache for a specific entity instance (granular invalidation)
 * 
 * This invalidates both the entity-specific tag and the collection tag.
 * Use this for single-entity updates to minimize cache invalidation scope.
 * 
 * @param entity - The entity type
 * @param id - The specific entity ID
 * @param options - Optional configuration
 * 
 * @example
 * // After updating a specific business
 * invalidateEntityById('businesses', businessId)
 * 
 * // With collection invalidation (when list views also need refresh)
 * invalidateEntityById('opportunities', oppId, { includeCollection: true })
 */
export function invalidateEntityById(
  entity: CacheEntity,
  id: string,
  options: {
    includeCollection?: boolean
    cascade?: boolean
    includePaths?: boolean
    additionalPaths?: string[]
  } = {}
): void {
  const { includeCollection = true, cascade = true, includePaths = false, additionalPaths = [] } = options
  
  // 1. Invalidate entity-specific tag
  safeRevalidateTag(`${entity}-${id}`)
  
  // 2. Optionally invalidate the collection tag
  if (includeCollection) {
    invalidateEntity(entity, { cascade, includePaths, additionalPaths })
  }
}

/**
 * Invalidate multiple entities at once
 * 
 * CAUTION: Use sparingly! Prefer explicit single invalidations when possible.
 * Only use when you truly need to invalidate multiple unrelated entities.
 * 
 * @param entities - Array of entities to invalidate
 * @param options - Optional configuration (applied to all entities)
 * 
 * @example
 * // Only when truly needed (e.g., bulk import affecting multiple entity types)
 * invalidateEntities(['deals', 'opportunities'])
 */
export function invalidateEntities(
  entities: CacheEntity[],
  options: {
    cascade?: boolean
    includePaths?: boolean
  } = {}
): void {
  for (const entity of entities) {
    invalidateEntity(entity, options)
  }
}

/**
 * Invalidate dashboard cache
 * 
 * Call this explicitly when aggregated stats change:
 * - Opportunity stage changes (won/lost)
 * - Task completions
 * - Booking request status changes
 * 
 * @example
 * // After marking opportunity as won
 * invalidateEntity('opportunities')
 * invalidateDashboard()
 */
export function invalidateDashboard(): void {
  safeRevalidateTag('dashboard')
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
