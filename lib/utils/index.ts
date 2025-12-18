/**
 * Utility Functions
 * Barrel export for all utility functions
 * 
 * Import from here: import { requireAuth, parseFormDataJsonField } from '@/lib/utils'
 */

export * from './server-actions'
export * from './form-data'
export * from './category-display'
export * from './validation'
export * from './debounce'
// Note: Date functions are now in @/lib/date - import from there: import { formatShortDate, ... } from '@/lib/date'
// Note: request-naming uses prisma, import directly: import { generateRequestName, countBusinessRequests } from '@/lib/utils/request-naming'

