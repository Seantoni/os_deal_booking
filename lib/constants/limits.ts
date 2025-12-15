/**
 * Limit Constants
 * Centralized limit and configuration constants
 */

/**
 * Maximum number of days to search ahead when finding available dates
 * Used in date calculation functions to prevent infinite loops
 */
export const MAX_DATE_SEARCH_DAYS = 90

// ============================================================================
// Cache Revalidation Times (in seconds)
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
// Pagination
// ============================================================================

/**
 * Default page size for pagination
 * Used when fetching lists of items (deals, opportunities, etc.)
 */
export const DEFAULT_PAGE_SIZE = 50

