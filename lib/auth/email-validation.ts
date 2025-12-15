/**
 * Access control utilities
 * Helper functions for email normalization and validation
 */

import { isValidEmail } from '@/lib/utils/validation'

/**
 * Normalize email: lowercase and trim spaces
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/**
 * Validate and normalize email
 */
export function validateAndNormalizeEmail(email: string): string {
  const normalized = normalizeEmail(email)
  
  if (!isValidEmail(normalized)) {
    throw new Error('Invalid email format')
  }
  
  return normalized
}

