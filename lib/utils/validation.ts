/**
 * Validation utilities
 * Centralized validation functions used across the application
 */

/**
 * Email validation regex - centralized constant
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

/**
 * Validate required fields
 * Returns array of missing field names
 */
export function validateRequiredFields(
  fields: Record<string, any>,
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

