/**
 * Cache Module
 * 
 * Centralized cache invalidation utilities.
 * 
 * Usage:
 *   import { invalidateEntity, invalidateEntityById, invalidateDashboard } from '@/lib/cache'
 * 
 * Best Practices:
 *   - Use invalidateEntityById() for single-entity updates (most efficient)
 *   - Use invalidateEntity() for collection-level invalidation
 *   - Use invalidateDashboard() explicitly when aggregate stats change
 *   - Avoid invalidateEntities() with many entities
 */

export {
  CACHE_ENTITIES,
  type CacheEntity,
  invalidateEntity,
  invalidateEntityById,
  invalidateEntities,
  invalidateDashboard,
  invalidateUserCache,
  invalidateCustomFieldCache,
} from './invalidation'

