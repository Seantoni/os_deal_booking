/**
 * Date formatting utilities for display
 * Centralized date formatting functions for consistent display across the app
 */

import { PANAMA_TIMEZONE } from './timezone'
import { ONE_DAY_MS } from '@/lib/constants'

/**
 * Format date for display in Spanish (Panama timezone)
 * Returns: "25 de noviembre de 2025"
 */
export function formatDateForDisplay(date: Date | string, locale: string = 'es-PA'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (locale === 'es-PA' || locale === 'es-ES') {
    const day = d.getDate()
    const month = d.toLocaleString('es-ES', { 
      timeZone: PANAMA_TIMEZONE,
      month: 'long' 
    })
    const year = d.getFullYear()
    return `${day} de ${month} de ${year}`
  }
  
  // Default to Panama timezone formatting
  return d.toLocaleDateString(locale, {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format date for display in short format (Panama timezone)
 * Returns: "Nov 25, 2025"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Calculate days difference between two dates
 * Returns positive number of days (inclusive of both dates)
 */
export function calculateDaysDifference(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate + 'T00:00:00') : startDate
  const end = typeof endDate === 'string' ? new Date(endDate + 'T00:00:00') : endDate
  
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.ceil(diffTime / ONE_DAY_MS) + 1 // +1 to include both start and end dates
  return diffDays
}

/**
 * Calculate days until a future date from today
 * Returns number of days (can be negative if date is in the past)
 */
export function calculateDaysUntil(date: Date | string): number {
  const targetDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / ONE_DAY_MS)
}

