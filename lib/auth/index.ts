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
  type UserRole,
} from './roles'

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

