/**
 * Limit Constants
 * Centralized limit and configuration constants (non-cache related)
 * 
 * For cache-related constants, see cache.ts
 */

/**
 * Maximum number of days to search ahead when finding available dates
 * Used in date calculation functions to prevent infinite loops
 */
export const MAX_DATE_SEARCH_DAYS = 90

// ============================================================================
// Pagination
// ============================================================================

/**
 * Default page size for pagination
 * Used when fetching lists of items (deals, opportunities, etc.)
 */
export const DEFAULT_PAGE_SIZE = 50
