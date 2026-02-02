/**
 * Auth utilities index
 * Central export for all auth-related functions
 */

// Role management
export {
  getUserProfile,
  isAdmin,
  isSales,
  isEditor,
  getUserRole,
  requireAdmin,
} from './roles'

// Re-export UserRole type from constants
export type { UserRole } from '@/lib/constants'

// Page access control
export {
  PAGE_ACCESS,
  getDefaultPageForRole,
  canAccessPage,
  requirePageAccess,
} from './page-access'

// Email validation
export {
  normalizeEmail,
  validateAndNormalizeEmail,
} from './email-validation'

// Middleware check
export {
  checkEmailAccessMiddleware,
} from './middleware-check'

// Entity-level access control
export {
  canAccessEntity,
  getAccessibleIds,
  buildAccessFilter,
} from './entity-access'
export type { EntityType, AccessLevel } from './entity-access'
