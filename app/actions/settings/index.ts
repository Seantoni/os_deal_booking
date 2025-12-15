/**
 * Settings Actions - Domain Barrel
 *
 * Groups all settings-related server actions:
 * - System settings (min/max launches, merchant repeat days, etc.)
 * - Categories (sync and management)
 * - Form configuration and custom fields
 * - Saved filters (for entity pages)
 *
 * Prefer importing from here for new code:
 *   import { getSettingsFromDB } from '@/app/actions/settings'
 *   import { getFormConfiguration } from '@/app/actions/settings'
 */

export * from '../settings'
export * from '../categories'
export * from '../form-config'
// Re-export custom fields - keep EntityType scoped to this module
export {
  getCustomFields,
  getCustomFieldsWithValues,
  saveCustomFieldValues,
  type CustomField,
  type EntityType as CustomFieldEntityType,
} from '../custom-fields'

// Re-export filters - keep EntityType scoped to this module
export {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  type FilterOperator,
  type FilterRule,
  type SavedFilter,
  type EntityType as FilterEntityType,
} from '../filters'


