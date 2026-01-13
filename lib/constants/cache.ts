/**
 * Cache Constants
 * Centralized cache timing configuration for the entire application
 * 
 * All cache durations should be defined here to maintain consistency
 * and make tuning easier across the application.
 */

// ============================================================================
// Server-Side Cache (Next.js unstable_cache / revalidate)
// Used for server actions and API routes
// ============================================================================

/**
 * Default cache revalidation time in seconds (30 seconds)
 * Used for frequently-changing entity data (deals, opportunities, businesses, etc.)
 */
export const CACHE_REVALIDATE_SECONDS = 30

/**
 * Cache revalidation time for categories (5 minutes = 300 seconds)
 * Categories change infrequently, so longer cache is appropriate
 */
export const CACHE_REVALIDATE_CATEGORIES_SECONDS = 300

/**
 * Cache revalidation time for dashboard stats (30 minutes = 1800 seconds)
 * Dashboard aggregations are expensive and don't need real-time updates
 */
export const CACHE_REVALIDATE_DASHBOARD_SECONDS = 1800

// ============================================================================
// Client-Side Cache (localStorage / React hooks)
// Used for client-side caching in hooks and components
// Values in milliseconds for direct use with Date.now()
// ============================================================================

/**
 * Client-side cache duration for form configurations (5 minutes)
 * Used in useFormConfigCache hook
 */
export const CACHE_CLIENT_FORM_CONFIG_MS = 5 * 60 * 1000

/**
 * Client-side cache duration for user role data (5 minutes)
 * Used in useUserRole hook
 */
export const CACHE_CLIENT_USER_ROLE_MS = 5 * 60 * 1000

/**
 * Client-side revalidation interval for user role (5 minutes)
 * How often to check for role updates in the background
 */
export const CACHE_CLIENT_USER_ROLE_REVALIDATE_MS = 5 * 60 * 1000

// ============================================================================
// Middleware Cache
// Used for access check caching in middleware
// ============================================================================

/**
 * Access check cache duration in seconds (5 minutes)
 * Used in middleware to cache user access verification
 */
export const CACHE_ACCESS_CHECK_SECONDS = 300
