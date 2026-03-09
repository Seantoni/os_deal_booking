/**
 * Category Utilities
 * Provides standardized category key generation and matching functions
 * 
 * CRITICAL: All category matching uses standardized keys in format "PARENT:SUB1:SUB2:SUB3"
 * This ensures consistent matching regardless of storage format
 */

import type { Event, BookingRequest } from '@/types'

type EventCategoryLike = Pick<
  Event,
  'category' | 'parentCategory' | 'subCategory1' | 'subCategory2' | 'subCategory3' | 'subCategory4'
>

const MAIN_CATEGORY_ALIASES: Record<string, string> = {
  HOTEL: 'HOTELES',
}

function stripAccents(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeCategoryPart(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function canonicalizeMainCategory(mainCategory?: string | null): string | null {
  if (!mainCategory) return null

  const normalized = normalizeCategoryPart(mainCategory)
  if (!normalized) return null

  const aliasKey = stripAccents(normalized).toUpperCase()
  return MAIN_CATEGORY_ALIASES[aliasKey] || normalized
}

export function normalizeCategoryKeyForMatch(value: string | null | undefined): string | null {
  if (!value) return null

  const normalized = stripAccents(value)
    .replace(/\s*[>›]\s*/g, ':')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

  if (!normalized) return null

  const parts = normalized.split(':').filter(Boolean)
  if (parts.length === 0) return null

  parts[0] = MAIN_CATEGORY_ALIASES[parts[0]] || parts[0]
  return parts.join(':')
}

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
    const normalizedParentCategory = canonicalizeMainCategory(parentCategory)
    if (!normalizedParentCategory) return null

    const parts = [normalizedParentCategory]
    if (subCategory1) parts.push(normalizeCategoryPart(subCategory1))
    if (subCategory2) parts.push(normalizeCategoryPart(subCategory2))
    if (subCategory3) parts.push(normalizeCategoryPart(subCategory3))
    if (subCategory4) parts.push(normalizeCategoryPart(subCategory4))
    return parts.join(':')
  }
  
  // Priority 2: Fallback to legacy category if available
  if (legacyCategory) {
    // Normalize legacy format (handle " > " or ":" separators)
    // Also handle formats like "RESTAURANTES:Comida Rápida:Hamburguesas / Pizza"
    const normalized = legacyCategory
      .replace(/\s*[>›]\s*/g, ':')
      .replace(/\s*:\s*/g, ':')
      .trim()

    const parts = normalized.split(':').map(normalizeCategoryPart).filter(Boolean)
    if (parts.length === 0) return null

    parts[0] = canonicalizeMainCategory(parts[0]) || parts[0]
    return parts.join(':')
  }
  
  return null
}

/**
 * Extract category key from an Event object
 */
export function getEventCategoryKey(event: EventCategoryLike): string | null {
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
  
  const normalized1 = normalizeCategoryKeyForMatch(key1)
  const normalized2 = normalizeCategoryKeyForMatch(key2)
  
  return normalized1 !== null && normalized1 === normalized2
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
