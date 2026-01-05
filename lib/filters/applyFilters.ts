import type { FilterRule, FilterOperator } from '@/app/actions/filters'
import { resolveDatePreset, DATE_PRESETS } from './filterConfig'

// Type for values that can be compared in filters
type FilterableValue = string | number | boolean | Date | null | undefined

/**
 * Get nested value from an object using dot notation
 * e.g., getNestedValue({ a: { b: 1 } }, 'a.b') => 1
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => (current as Record<string, unknown>)?.[key], obj as unknown)
}

/**
 * Check if a value is a date preset
 */
function isDatePreset(value: unknown): boolean {
  return typeof value === 'string' && DATE_PRESETS.some(p => p.value === value)
}

/**
 * Normalize value for comparison
 */
function normalizeValue(value: unknown): FilterableValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.toLowerCase().trim()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' || typeof value === 'boolean') return value
  return String(value)
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
  
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Compare two values using an operator
 */
function compareValues(fieldValue: unknown, operator: FilterOperator, filterValue: unknown): boolean {
  // Handle null checks first
  if (operator === 'isNull') {
    return fieldValue === null || fieldValue === undefined || fieldValue === ''
  }
  
  if (operator === 'isNotNull') {
    return fieldValue !== null && fieldValue !== undefined && fieldValue !== ''
  }

  // Normalize values for comparison
  const normalizedFieldValue = normalizeValue(fieldValue)
  let normalizedFilterValue = normalizeValue(filterValue)

  // Handle date comparisons
  if (fieldValue instanceof Date || (typeof fieldValue === 'string' && !isNaN(Date.parse(fieldValue)))) {
    const fieldDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue)
    const filterDate = parseDateValue(filterValue)
    
    if (filterDate) {
      const fieldTime = fieldDate.getTime()
      const filterTime = filterDate.getTime()
      
      switch (operator) {
        case 'equals':
          // Compare dates by day (ignore time)
          return new Date(fieldDate.toDateString()).getTime() === new Date(filterDate.toDateString()).getTime()
        case 'notEquals':
          return new Date(fieldDate.toDateString()).getTime() !== new Date(filterDate.toDateString()).getTime()
        case 'gt':
          return fieldTime > filterTime
        case 'gte':
          return fieldTime >= filterTime
        case 'lt':
          return fieldTime < filterTime
        case 'lte':
          return fieldTime <= filterTime
        default:
          return false
      }
    }
  }

  // Handle boolean comparisons
  if (typeof fieldValue === 'boolean') {
    const boolFilterValue = filterValue === 'true' || filterValue === true
    switch (operator) {
      case 'equals':
        return fieldValue === boolFilterValue
      case 'notEquals':
        return fieldValue !== boolFilterValue
      default:
        return false
    }
  }

  // Handle number comparisons
  if (typeof normalizedFieldValue === 'number' || !isNaN(Number(normalizedFieldValue))) {
    const numFieldValue = Number(normalizedFieldValue)
    const numFilterValue = Number(normalizedFilterValue)
    
    if (!isNaN(numFieldValue) && !isNaN(numFilterValue)) {
      switch (operator) {
        case 'equals':
          return numFieldValue === numFilterValue
        case 'notEquals':
          return numFieldValue !== numFilterValue
        case 'gt':
          return numFieldValue > numFilterValue
        case 'gte':
          return numFieldValue >= numFilterValue
        case 'lt':
          return numFieldValue < numFilterValue
        case 'lte':
          return numFieldValue <= numFilterValue
        default:
          break
      }
    }
  }

  // Handle string comparisons
  const strFieldValue = String(normalizedFieldValue || '')
  const strFilterValue = String(normalizedFilterValue || '')

  switch (operator) {
    case 'equals':
      return strFieldValue === strFilterValue
    case 'notEquals':
      return strFieldValue !== strFilterValue
    case 'contains':
      return strFieldValue.includes(strFilterValue)
    case 'notContains':
      return !strFieldValue.includes(strFilterValue)
    case 'startsWith':
      return strFieldValue.startsWith(strFilterValue)
    case 'endsWith':
      return strFieldValue.endsWith(strFilterValue)
    default:
      return false
  }
}

/**
 * Check if a single item matches a filter rule
 */
function matchesRule(item: Record<string, unknown>, rule: FilterRule): boolean {
  const fieldValue = getNestedValue(item, rule.field)
  return compareValues(fieldValue, rule.operator, rule.value)
}

/**
 * Apply filter rules to a single item
 * Returns true if the item matches all filter rules
 */
export function matchesFilters(item: Record<string, unknown>, rules: FilterRule[]): boolean {
  if (!rules || rules.length === 0) return true

  let result = matchesRule(item, rules[0])

  for (let i = 1; i < rules.length; i++) {
    const rule = rules[i]
    const ruleResult = matchesRule(item, rule)

    if (rule.conjunction === 'AND') {
      result = result && ruleResult
    } else {
      result = result || ruleResult
    }
  }

  return result
}

/**
 * Apply filter rules to an array of items
 * Returns filtered array
 */
export function applyFilters<T>(items: T[], rules: FilterRule[]): T[] {
  if (!rules || rules.length === 0) return items
  return items.filter(item => matchesFilters(item, rules))
}

