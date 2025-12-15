/**
 * Date Utilities Facade
 * 
 * This file serves as a convenience re-export layer for date-related utilities.
 * All core date functions are organized in the `lib/date/` folder:
 * 
 * - `lib/date/timezone.ts` - Panama timezone handling (UTC-5)
 * - `lib/date/formatting.ts` - Date display formatting utilities
 * - `lib/date/index.ts` - Central exports from lib/date/
 * 
 * USAGE:
 * - For new code, prefer importing directly from `@/lib/date` for better tree-shaking
 * - This file exists for backwards compatibility and convenience
 * 
 * All dates are stored in UTC but displayed in Panama timezone (EST, UTC-5)
 */

import { formatDateForPanama, formatDateTimeForPanama, PANAMA_TIMEZONE } from './date/timezone'
import { formatDateForDisplay, formatDateShort, calculateDaysDifference, calculateDaysUntil } from './date/formatting'

// Re-export from lib/date/ for backwards compatibility
export { formatDateForDisplay, formatDateShort, calculateDaysDifference, calculateDaysUntil }

/**
 * Format a date for display in the UI (Panama timezone)
 * Returns: "Mon, Nov 17, 2025"
 */
export function formatEventDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PANAMA_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a date for the date input (YYYY-MM-DD) in Panama timezone
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDateForPanama(d)
}

/**
 * Format a date with time for display (Panama timezone)
 * Returns: "17 de noviembre de 2025, 10:30 AM"
 */
export function formatDateTimeForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDateTimeForPanama(d)
}

/**
 * Get just the date part from a Date object in Panama timezone
 * Returns: "Nov 17"
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Check if two dates are the same day in Panama timezone
 */
export function isSameDayInPanama(date1: Date, date2: Date): boolean {
  const d1Str = formatDateForPanama(date1)
  const d2Str = formatDateForPanama(date2)
  return d1Str === d2Str
}

