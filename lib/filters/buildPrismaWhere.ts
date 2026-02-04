/**
 * Build Prisma where clauses from filter rules
 * 
 * Converts the advanced filter rules to Prisma-compatible where conditions.
 * Supports nested fields (e.g., 'owner.name', 'category.parentCategory')
 */

import type { FilterRule, FilterOperator } from '@/app/actions/filters'
import { resolveDatePreset, DATE_PRESETS } from './filterConfig'

// Prisma where condition types
type PrismaCondition = Record<string, unknown>

/**
 * Check if a value is a date preset
 */
function isDatePreset(value: unknown): value is string {
  return typeof value === 'string' && DATE_PRESETS.some(p => p.value === value)
}

/**
 * Check if a string looks like a date (ISO format or common date formats)
 * This prevents treating simple numbers like "1" or "2" as dates
 */
function looksLikeDateString(value: string): boolean {
  // Must contain date separators (-, /) or T for ISO format
  // ISO: 2024-01-15, 2024-01-15T10:30:00
  // Common: 01/15/2024, 15-01-2024
  if (!/[-\/T]/.test(value)) {
    return false
  }
  
  // Must be at least 8 characters (like 2024-1-1)
  if (value.length < 8) {
    return false
  }
  
  // Try parsing and check if it's a reasonable date (year > 1900)
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) {
    return false
  }
  
  const year = parsed.getFullYear()
  return year >= 1900 && year <= 2100
}

/**
 * Parse a date value (could be a preset, ISO string, or Date object)
 */
function parseDateValue(value: unknown): Date | null {
  if (!value) return null
  
  if (isDatePreset(value)) {
    return resolveDatePreset(value)
  }
  
  if (value instanceof Date) {
    return value
  }
  
  if (typeof value === 'string' && looksLikeDateString(value)) {
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  
  return null
}

/**
 * Convert a single filter rule to a Prisma condition
 */
function ruleToCondition(rule: FilterRule): PrismaCondition | null {
  const { field, operator, value } = rule
  
  // Skip if no field specified
  if (!field) return null
  
  // Check if this is a nested relation field (e.g., 'owner.name', 'category.parentCategory')
  const fieldParts = field.split('.')
  const isNestedField = fieldParts.length > 1
  
  // For isNull/isNotNull on nested relation fields like 'owner.name',
  // we want to check if the relation itself is null/not null
  // e.g., 'owner.name isNull' should match businesses with no owner
  if (isNestedField && (operator === 'isNull' || operator === 'isNotNull')) {
    // Get the relation name (e.g., 'owner' from 'owner.name')
    const relationName = fieldParts[0]
    
    if (operator === 'isNull') {
      // Check if relation is null OR nested field is null
      // e.g., { OR: [{ owner: null }, { owner: { name: null } }] }
      const relationNull: PrismaCondition = { [relationName]: null }
      
      // Build the nested field null check
      let nestedNull: PrismaCondition = {}
      let current = nestedNull
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = {}
        current = current[fieldParts[i]] as PrismaCondition
      }
      current[fieldParts[fieldParts.length - 1]] = null
      
      return { OR: [relationNull, nestedNull] }
    } else {
      // isNotNull: relation exists AND nested field is not null
      // e.g., { owner: { isNot: null, name: { not: null } } }
      let result: PrismaCondition = {}
      let current = result
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = { isNot: null }
        current = current[fieldParts[i]] as PrismaCondition
      }
      current[fieldParts[fieldParts.length - 1]] = { not: null }
      return result
    }
  }
  
  // Build the condition based on operator
  let condition: unknown
  
  // Determine if this looks like a date value
  const isDateValue = isDatePreset(value) || (typeof value === 'string' && looksLikeDateString(value))
  // Determine if this looks like a numeric value (but not a date string)
  const isNumericValue = !isDateValue && (typeof value === 'number' || (typeof value === 'string' && value !== '' && !isNaN(Number(value))))
  
  switch (operator) {
    case 'isNull':
      condition = null
      break
    case 'isNotNull':
      condition = { not: null }
      break
    case 'equals':
      if (isDateValue) {
        // Handle date fields - match entire day
        const date = parseDateValue(value)
        if (date) {
          const startOfDay = new Date(date)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(date)
          endOfDay.setHours(23, 59, 59, 999)
          condition = { gte: startOfDay, lte: endOfDay }
        } else {
          condition = value
        }
      } else if (isNumericValue) {
        // Handle numeric fields - convert string to number
        condition = typeof value === 'string' ? Number(value) : value
      } else {
        // String or other value - use as-is
        condition = value
      }
      break
    case 'notEquals':
      if (isNumericValue) {
        condition = { not: typeof value === 'string' ? Number(value) : value }
      } else {
        condition = { not: value }
      }
      break
    case 'contains':
      condition = { contains: value, mode: 'insensitive' }
      break
    case 'notContains':
      condition = { not: { contains: value, mode: 'insensitive' } }
      break
    case 'startsWith':
      condition = { startsWith: value, mode: 'insensitive' }
      break
    case 'endsWith':
      condition = { endsWith: value, mode: 'insensitive' }
      break
    case 'gt': {
      if (isDateValue) {
        const dateVal = parseDateValue(value)
        condition = dateVal ? { gt: dateVal } : { gt: value }
      } else {
        condition = { gt: Number(value) }
      }
      break
    }
    case 'gte': {
      if (isDateValue) {
        const dateVal = parseDateValue(value)
        condition = dateVal ? { gte: dateVal } : { gte: value }
      } else {
        condition = { gte: Number(value) }
      }
      break
    }
    case 'lt': {
      if (isDateValue) {
        const dateVal = parseDateValue(value)
        condition = dateVal ? { lt: dateVal } : { lt: value }
      } else {
        condition = { lt: Number(value) }
      }
      break
    }
    case 'lte': {
      if (isDateValue) {
        const dateVal = parseDateValue(value)
        condition = dateVal ? { lte: dateVal } : { lte: value }
      } else {
        condition = { lte: Number(value) }
      }
      break
    }
    default:
      return null
  }
  
  // Handle nested fields (e.g., 'owner.name' -> { owner: { name: condition } })
  // fieldParts is already defined at the top of the function
  
  // Build nested object from right to left
  let result: PrismaCondition = {}
  let current = result
  
  for (let i = 0; i < fieldParts.length - 1; i++) {
    current[fieldParts[i]] = {}
    current = current[fieldParts[i]] as PrismaCondition
  }
  
  current[fieldParts[fieldParts.length - 1]] = condition
  
  return result
}

/**
 * Build Prisma where clause from filter rules
 * 
 * @param rules - Array of filter rules
 * @returns Prisma where clause object
 */
export function buildPrismaWhere(rules: FilterRule[]): PrismaCondition {
  if (!rules || rules.length === 0) {
    return {}
  }
  
  // Convert rules to conditions
  const conditions: PrismaCondition[] = []
  
  for (const rule of rules) {
    const condition = ruleToCondition(rule)
    if (condition) {
      conditions.push(condition)
    }
  }
  
  if (conditions.length === 0) {
    return {}
  }
  
  if (conditions.length === 1) {
    return conditions[0]
  }
  
  // Check if all rules use AND conjunction
  const allAnd = rules.slice(1).every(r => r.conjunction === 'AND')
  
  if (allAnd) {
    // Merge all conditions with AND
    return { AND: conditions }
  }
  
  // Handle mixed AND/OR - build expression tree
  // For simplicity, we'll treat mixed conjunctions as: first AND second OR third AND fourth...
  // A more complex implementation would need proper parenthesization
  let result: PrismaCondition[] = [conditions[0]]
  
  for (let i = 1; i < conditions.length; i++) {
    const rule = rules[i]
    if (rule.conjunction === 'OR') {
      // OR with previous result
      result = [{ OR: [...result, conditions[i]] }]
    } else {
      // AND with current group
      result.push(conditions[i])
    }
  }
  
  return result.length === 1 ? result[0] : { AND: result }
}

/**
 * Parse advanced filters from JSON string (for URL params/server actions)
 */
export function parseAdvancedFilters(filtersJson: string | undefined): FilterRule[] {
  if (!filtersJson) return []
  
  try {
    const parsed = JSON.parse(filtersJson)
    if (Array.isArray(parsed)) {
      return parsed as FilterRule[]
    }
    return []
  } catch {
    return []
  }
}
