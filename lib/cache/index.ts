/**
 * Cache Module
 * 
 * Centralized cache invalidation utilities.
 * 
 * Usage:
 *   import { invalidateEntity, invalidateEntities } from '@/lib/cache'
 */

export {
  CACHE_ENTITIES,
  type CacheEntity,
  invalidateEntity,
  invalidateEntities,
  invalidateUserCache,
  invalidateCustomFieldCache,
} from './invalidation'

