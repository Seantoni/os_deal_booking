/**
 * Category Utilities
 * Provides standardized category key generation and matching functions
 * 
 * CRITICAL: All category matching uses standardized keys in format "PARENT:SUB1:SUB2:SUB3"
 * This ensures consistent matching regardless of storage format
 */

import type { Event, BookingRequest } from '@/types'

/**
 * Build a standardized category key from hierarchical category fields
 * Format: "PARENT:SUB1:SUB2:SUB3:SUB4" (omitting empty parts)
 * This ensures consistent matching regardless of how categories are stored
 * 
 * @param parentCategory - Main category (e.g., "RESTAURANTES")
 * @param subCategory1 - First subcategory (e.g., "Comida Rápida")
 * @param subCategory2 - Second subcategory (e.g., "Hamburguesas / Pizza")
 * @param subCategory3 - Third subcategory (optional)
 * @param subCategory4 - Fourth subcategory (optional)
 * @param legacyCategory - Legacy category string (e.g., "RESTAURANTES:Comida Rápida:Hamburguesas / Pizza")
 * @returns Standardized category key or null if no category provided
 */
export function buildCategoryKey(
  parentCategory?: string | null,
  subCategory1?: string | null,
  subCategory2?: string | null,
  subCategory3?: string | null,
  subCategory4?: string | null,
  legacyCategory?: string | null
): string | null {
  // Priority 1: If we have hierarchical fields, build from them (most reliable)
  if (parentCategory) {
    const parts = [parentCategory.trim()]
    if (subCategory1) parts.push(subCategory1.trim())
    if (subCategory2) parts.push(subCategory2.trim())
    if (subCategory3) parts.push(subCategory3.trim())
    if (subCategory4) parts.push(subCategory4.trim())
    return parts.join(':')
  }
  
  // Priority 2: Fallback to legacy category if available
  if (legacyCategory) {
    // Normalize legacy format (handle " > " or ":" separators)
    // Also handle formats like "RESTAURANTES:Comida Rápida:Hamburguesas / Pizza"
    const normalized = legacyCategory.replace(/\s*>\s*/g, ':').trim()
    // Remove any extra whitespace around colons
    return normalized.replace(/:\s+/g, ':').replace(/\s+:/g, ':')
  }
  
  return null
}

/**
 * Extract category key from an Event object
 */
export function getEventCategoryKey(event: Event): string | null {
  return buildCategoryKey(
    event.parentCategory,
    event.subCategory1,
    event.subCategory2,
    event.subCategory3,
    event.subCategory4,
    event.category
  )
}

/**
 * Extract category key from a BookingRequest object
 */
export function getBookingRequestCategoryKey(request: BookingRequest): string | null {
  return buildCategoryKey(
    request.parentCategory,
    request.subCategory1,
    request.subCategory2,
    request.subCategory3,
    request.subCategory4,
    request.category
  )
}

/**
 * Check if two category keys match
 * Handles normalization and comparison
 */
export function categoryKeysMatch(key1: string | null, key2: string | null): boolean {
  if (!key1 || !key2) return false
  
  // Normalize both keys (trim, handle case sensitivity)
  const normalized1 = key1.trim().toUpperCase()
  const normalized2 = key2.trim().toUpperCase()
  
  return normalized1 === normalized2
}

/**
 * Build category key from CategoryOption
 */
export function buildCategoryKeyFromOption(option: {
  parent: string
  sub1?: string | null
  sub2?: string | null
  sub3?: string | null
  sub4?: string | null
  value?: string
}): string | null {
  return buildCategoryKey(
    option.parent,
    option.sub1 || undefined,
    option.sub2 || undefined,
    option.sub3 || undefined,
    option.sub4 || undefined,
    option.value || undefined
  )
}

