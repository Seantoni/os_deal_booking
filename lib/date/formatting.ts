/**
 * Date formatting utilities for display
 * Centralized date formatting functions for consistent display across the app
 * All dates use Panama timezone (America/Panama, UTC-5)
 */

import { 
  PANAMA_TIMEZONE, 
  formatDateForPanama, 
  getTodayInPanama,
  parseDateInPanamaTime,
  getDateComponentsInPanama 
} from './timezone'
import { ONE_DAY_MS } from '@/lib/constants'

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Format date for request names: "Dec-15-2025"
 * Uses Panama timezone
 */
export function formatRequestNameDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('en-US', {
      timeZone: PANAMA_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .replace(',', '')
    .split(' ')
    .join('-')
}

/**
 * Format date as short display: "Dec 15, 2025"
 * Uses Panama timezone
 */
export function formatShortDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * @deprecated Use formatShortDate instead
 * Alias for backwards compatibility
 */
export const formatDateShort = formatShortDate

/**
 * Format date as full: "December 15, 2025"
 * Uses Panama timezone
 */
export function formatFullDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    timeZone: PANAMA_TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date as ISO: "2025-12-15"
 * Uses Panama timezone (not UTC)
 */
export function formatISODate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  return formatDateForPanama(d)
}

/**
 * Format date with time: "Dec 15, 2025 at 3:30 PM"
 * Uses Panama timezone
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' at')
}

/**
 * Format date for display in Spanish (Panama timezone)
 * Returns: "25 de noviembre de 2025"
 */
export function formatDateForDisplay(date: Date | string, locale: string = 'es-PA'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (locale === 'es-PA' || locale === 'es-ES') {
    const { day, year } = getDateComponentsInPanama(d)
    const month = d.toLocaleString('es-ES', { 
      timeZone: PANAMA_TIMEZONE,
      month: 'long' 
    })
    return `${day} de ${month} de ${year}`
  }
  
  return d.toLocaleDateString(locale, {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format a date range: "Dec 15 - Dec 20, 2025" or "Dec 15, 2025 - Jan 5, 2026"
 * Uses Panama timezone
 */
export function formatDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null
): string {
  if (!startDate && !endDate) return '—'
  if (!startDate) return `Until ${formatShortDate(endDate)}`
  if (!endDate) return `From ${formatShortDate(startDate)}`
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—'
  
  const startStr = formatDateForPanama(start)
  const endStr = formatDateForPanama(end)
  const [startYear, startMonth, startDay] = startStr.split('-').map(Number)
  const [endYear, endMonth, endDay] = endStr.split('-').map(Number)
  
  const sameYear = startYear === endYear
  const sameMonth = sameYear && startMonth === endMonth
  
  const formatDatePart = (d: Date) => d.toLocaleDateString('en-US', { 
    timeZone: PANAMA_TIMEZONE,
    month: 'short', 
    day: 'numeric' 
  })
  
  if (sameMonth) {
    return `${formatDatePart(start)} - ${endDay}, ${endYear}`
  }
  
  if (sameYear) {
    return `${formatDatePart(start)} - ${formatDatePart(end)}, ${endYear}`
  }
  
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

// ============================================================================
// Relative Time
// ============================================================================

/**
 * Format as relative time: "2 days ago", "in 3 hours", etc.
 * Uses Panama timezone for calculations
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  const isFuture = diffMs < 0
  const absDiffMins = Math.abs(diffMins)
  const absDiffHours = Math.abs(diffHours)
  const absDiffDays = Math.abs(diffDays)
  
  if (Math.abs(diffSecs) < 60) {
    return 'just now'
  }
  
  if (absDiffMins < 60) {
    const unit = absDiffMins === 1 ? 'minute' : 'minutes'
    return isFuture ? `in ${absDiffMins} ${unit}` : `${absDiffMins} ${unit} ago`
  }
  
  if (absDiffHours < 24) {
    const unit = absDiffHours === 1 ? 'hour' : 'hours'
    return isFuture ? `in ${absDiffHours} ${unit}` : `${absDiffHours} ${unit} ago`
  }
  
  if (absDiffDays < 7) {
    const unit = absDiffDays === 1 ? 'day' : 'days'
    return isFuture ? `in ${absDiffDays} ${unit}` : `${absDiffDays} ${unit} ago`
  }
  
  if (absDiffDays < 30) {
    const weeks = Math.floor(absDiffDays / 7)
    const unit = weeks === 1 ? 'week' : 'weeks'
    return isFuture ? `in ${weeks} ${unit}` : `${weeks} ${unit} ago`
  }
  
  return formatShortDate(d)
}

// ============================================================================
// Date Calculations
// ============================================================================

/**
 * Calculate days since a date
 * Uses Panama timezone for "today" calculation
 */
export function daysSince(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  
  const todayStr = getTodayInPanama()
  const today = parseDateInPanamaTime(todayStr)
  
  const dateStr = formatDateForPanama(d)
  const targetDate = parseDateInPanamaTime(dateStr)
  
  const diffTime = today.getTime() - targetDate.getTime()
  return Math.floor(diffTime / ONE_DAY_MS)
}

/**
 * Calculate days until a date
 * Uses Panama timezone for "today" calculation
 */
export function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  
  const todayStr = getTodayInPanama()
  const today = parseDateInPanamaTime(todayStr)
  
  const dateStr = formatDateForPanama(d)
  const targetDate = parseDateInPanamaTime(dateStr)
  
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.floor(diffTime / ONE_DAY_MS)
}

/**
 * @deprecated Use daysUntil instead
 * Alias for backwards compatibility
 */
export const calculateDaysUntil = daysUntil

/**
 * Calculate days difference between two dates
 * Returns positive number of days (inclusive of both dates)
 */
export function calculateDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate + 'T00:00:00') : startDate
  const end = typeof endDate === 'string' ? new Date(endDate + 'T00:00:00') : endDate
  
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / ONE_DAY_MS) + 1
  return diffDays
}
