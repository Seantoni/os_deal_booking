/**
 * Time Constants
 * Centralized time-related constants for calculations
 */

/**
 * Milliseconds in one second
 */
export const ONE_SECOND_MS = 1000

/**
 * Milliseconds in one minute
 */
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS

/**
 * Milliseconds in one hour
 */
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS

/**
 * Milliseconds in one day (24 hours)
 */
export const ONE_DAY_MS = 24 * ONE_HOUR_MS

/**
 * Milliseconds in one week (7 days)
 */
export const ONE_WEEK_MS = 7 * ONE_DAY_MS

/**
 * Milliseconds in one year (365 days)
 */
export const ONE_YEAR_MS = 365 * ONE_DAY_MS

/**
 * Token expiration time in milliseconds (1 year)
 * Used for approval tokens and public link tokens
 */
export const TOKEN_EXPIRY_MS = ONE_YEAR_MS

