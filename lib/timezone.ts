/**
 * Timezone utilities for consistent date handling
 * Panama uses EST (UTC-5) year-round (no daylight saving time)
 */

export const PANAMA_TIMEZONE = 'America/Panama' // EST (UTC-5)

/**
 * Convert a date string (YYYY-MM-DD) to a Date object in Panama timezone
 * Always uses midnight (00:00:00) in Panama time
 */
export function parseDateInPanamaTime(dateString: string): Date {
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date at midnight Panama time
  // Panama is UTC-5, so we add 5 hours to get the correct UTC timestamp
  const utcDate = new Date(Date.UTC(year, month - 1, day, 5, 0, 0))
  
  return utcDate
}

/**
 * Convert a date string to end of day in Panama timezone
 * Uses 23:59:59.999 in Panama time
 */
export function parseEndDateInPanamaTime(dateString: string): Date {
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date at 23:59:59.999 Panama time
  // Panama is UTC-5, so Nov 13 23:59:59 Panama = Nov 14 04:59:59 UTC
  // Create UTC date for the next day at 04:59:59 to represent end of previous day in Panama
  const utcDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  // Add 5 hours for Panama offset (UTC-5)
  utcDate.setUTCHours(utcDate.getUTCHours() + 5)
  
  return utcDate
}

/**
 * Format a Date object to display in Panama timezone
 * Returns YYYY-MM-DD string
 */
export function formatDateForPanama(date: Date): string {
  // Use Intl.DateTimeFormat to get the date in Panama timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  
  return formatter.format(date) // Returns YYYY-MM-DD
}

/**
 * Format a Date object to display with time in Panama timezone
 */
export function formatDateTimeForPanama(date: Date): string {
  const formatter = new Intl.DateTimeFormat('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  
  return formatter.format(date)
}

/**
 * Get current date in Panama timezone (YYYY-MM-DD)
 */
export function getTodayInPanama(): string {
  const now = new Date()
  return formatDateForPanama(now)
}

/**
 * Get date components (year, month, day) from a Date object in Panama timezone
 * Useful for calendar calculations
 */
export function getDateComponentsInPanama(date: Date): { year: number; month: number; day: number } {
  const year = parseInt(formatDateForPanama(date).split('-')[0])
  const month = parseInt(formatDateForPanama(date).split('-')[1])
  const day = parseInt(formatDateForPanama(date).split('-')[2])
  return { year, month, day }
}

