/**
 * Validation utilities
 * Centralized validation functions used across the application
 */

/**
 * Email validation regex - centralized constant
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_CALENDAR_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
export const BOOKING_START_DATE_EVENT_DAY_ERROR =
  'Start date must be on or before all event dates'
export const BOOKING_START_DATE_EVENT_DAY_ERROR_ES =
  'La fecha de lanzamiento debe ser igual o anterior al primer día del evento'

/**
 * Validate email format
 * Uses centralized regex for consistency
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Validate date range
 * Checks if dates are valid and end date is after start date
 */
export function validateDateRange(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string } {
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  if (endDate < startDate) {
    return { valid: false, error: 'End date must be after start date' }
  }

  return { valid: true }
}

export function normalizeIsoCalendarDates(
  values: readonly string[] | null | undefined
): string[] {
  if (!Array.isArray(values)) return []

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && isValidIsoCalendarDate(value))
    )
  ).sort()
}

export function validateStartDateAgainstEventDays(
  startDate: string | null | undefined,
  eventDays: readonly string[] | null | undefined
): {
  valid: boolean
  error?: string
  earliestEventDay: string | null
  normalizedEventDays: string[]
} {
  const normalizedEventDays = normalizeIsoCalendarDates(eventDays)
  const earliestEventDay = normalizedEventDays[0] ?? null

  if (!startDate || !isValidIsoCalendarDate(startDate) || !earliestEventDay) {
    return {
      valid: true,
      earliestEventDay,
      normalizedEventDays,
    }
  }

  if (earliestEventDay < startDate) {
    return {
      valid: false,
      error: BOOKING_START_DATE_EVENT_DAY_ERROR,
      earliestEventDay,
      normalizedEventDays,
    }
  }

  return {
    valid: true,
    earliestEventDay,
    normalizedEventDays,
  }
}

/**
 * Validate strict calendar date format (YYYY-MM-DD).
 * Rejects impossible dates like 2026-02-31.
 */
export function isValidIsoCalendarDate(value: string): boolean {
  const match = ISO_CALENDAR_DATE_REGEX.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCFullYear(year, month - 1, day)

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * Validate required fields
 * Returns array of missing field names
 */
export function validateRequiredFields(
  fields: Record<string, unknown>,
  required: string[]
): string[] {
  const missing: string[] = []
  for (const field of required) {
    if (!fields[field] || (typeof fields[field] === 'string' && fields[field].trim() === '')) {
      missing.push(field)
    }
  }
  return missing
}
