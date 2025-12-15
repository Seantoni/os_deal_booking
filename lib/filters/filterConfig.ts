import type { FilterOperator, EntityType } from '@/app/actions/filters'
import { DEAL_STATUS_OPTIONS, OPPORTUNITY_STAGE_OPTIONS, LEAD_STAGE_OPTIONS } from '@/lib/constants'

/**
 * Field type determines which operators and value inputs are available
 */
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

/**
 * Field definition for a filterable field
 */
export type FilterFieldDefinition = {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[] // For select fields
}

/**
 * Operator definitions with labels
 */
export const FILTER_OPERATORS: Record<FilterOperator, { label: string; types: FieldType[] }> = {
  equals: { label: 'equal to', types: ['text', 'number', 'date', 'select', 'boolean'] },
  notEquals: { label: 'not equal to', types: ['text', 'number', 'date', 'select', 'boolean'] },
  contains: { label: 'contains', types: ['text'] },
  notContains: { label: 'does not contain', types: ['text'] },
  startsWith: { label: 'starts with', types: ['text'] },
  endsWith: { label: 'ends with', types: ['text'] },
  gt: { label: 'greater than', types: ['number', 'date'] },
  gte: { label: 'greater or equal', types: ['number', 'date'] },
  lt: { label: 'less than', types: ['number', 'date'] },
  lte: { label: 'less or equal', types: ['number', 'date'] },
  isNull: { label: 'is empty', types: ['text', 'number', 'date', 'select'] },
  isNotNull: { label: 'is not empty', types: ['text', 'number', 'date', 'select'] },
}

/**
 * Get operators available for a field type
 */
export function getOperatorsForFieldType(fieldType: FieldType): { value: FilterOperator; label: string }[] {
  return Object.entries(FILTER_OPERATORS)
    .filter(([_, def]) => def.types.includes(fieldType))
    .map(([key, def]) => ({ value: key as FilterOperator, label: def.label }))
}

/**
 * Date presets for date fields
 */
export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'next_week', label: 'Next week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'next_month', label: 'Next month' },
] as const

/**
 * Resolve date preset to actual date
 */
export function resolveDatePreset(preset: string): Date {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (preset) {
    case 'today':
      return today
    case 'tomorrow':
      return new Date(today.getTime() + 24 * 60 * 60 * 1000)
    case 'yesterday':
      return new Date(today.getTime() - 24 * 60 * 60 * 1000)
    case 'this_week': {
      const dayOfWeek = today.getDay()
      const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      return startOfWeek
    }
    case 'last_week': {
      const dayOfWeek = today.getDay()
      const startOfLastWeek = new Date(today.getTime() - (dayOfWeek + 7) * 24 * 60 * 60 * 1000)
      return startOfLastWeek
    }
    case 'next_week': {
      const dayOfWeek = today.getDay()
      const startOfNextWeek = new Date(today.getTime() + (7 - dayOfWeek) * 24 * 60 * 60 * 1000)
      return startOfNextWeek
    }
    case 'this_month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'last_month':
      return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    case 'next_month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1)
    default:
      return new Date(preset) // Assume it's a date string
  }
}

/**
 * Deal status options
 * Re-exported from centralized constants
 */
export { DEAL_STATUS_OPTIONS }

/**
 * Opportunity stage options
 * Re-exported from centralized constants
 */
export { OPPORTUNITY_STAGE_OPTIONS }

/**
 * Business tier options
 */
export const BUSINESS_TIER_OPTIONS = [
  { value: '1', label: 'Tier 1' },
  { value: '2', label: 'Tier 2' },
  { value: '3', label: 'Tier 3' },
]

/**
 * Lead stage options
 * Re-exported from centralized constants
 */
export { LEAD_STAGE_OPTIONS }

/**
 * Sales team options
 */
export const SALES_TEAM_OPTIONS = [
  { value: 'Inside Sales', label: 'Inside Sales' },
  { value: 'Outside Sales', label: 'Outside Sales' },
]

/**
 * Field definitions for Deals
 */
export const DEAL_FIELDS: FilterFieldDefinition[] = [
  { key: 'status', label: 'Status', type: 'select', options: DEAL_STATUS_OPTIONS },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
  // Fields from linked BookingRequest
  { key: 'bookingRequest.name', label: 'Name', type: 'text' },
  { key: 'bookingRequest.businessEmail', label: 'Business Email', type: 'text' },
  { key: 'bookingRequest.parentCategory', label: 'Category', type: 'text' },
  { key: 'bookingRequest.merchant', label: 'Merchant', type: 'text' },
  { key: 'bookingRequest.startDate', label: 'Start Date', type: 'date' },
  { key: 'bookingRequest.endDate', label: 'End Date', type: 'date' },
]

/**
 * Field definitions for Opportunities
 */
export const OPPORTUNITY_FIELDS: FilterFieldDefinition[] = [
  { key: 'stage', label: 'Stage', type: 'select', options: OPPORTUNITY_STAGE_OPTIONS },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'closeDate', label: 'Close Date', type: 'date' },
  { key: 'nextActivityDate', label: 'Next Activity Date', type: 'date' },
  { key: 'lastActivityDate', label: 'Last Activity Date', type: 'date' },
  { key: 'hasRequest', label: 'Has Request', type: 'boolean' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'lostReason', label: 'Lost Reason', type: 'text' },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
  // Fields from linked Business
  { key: 'business.name', label: 'Business Name', type: 'text' },
  { key: 'business.contactEmail', label: 'Contact Email', type: 'text' },
  { key: 'business.tier', label: 'Business Tier', type: 'select', options: BUSINESS_TIER_OPTIONS },
  { key: 'business.salesTeam', label: 'Sales Team', type: 'select', options: SALES_TEAM_OPTIONS },
]

/**
 * Field definitions for Businesses
 */
export const BUSINESS_FIELDS: FilterFieldDefinition[] = [
  { key: 'name', label: 'Business Name', type: 'text' },
  { key: 'contactName', label: 'Contact Name', type: 'text' },
  { key: 'contactEmail', label: 'Contact Email', type: 'text' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'tier', label: 'Tier', type: 'select', options: BUSINESS_TIER_OPTIONS },
  { key: 'salesTeam', label: 'Sales Team', type: 'select', options: SALES_TEAM_OPTIONS },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
  // Fields from linked Category
  { key: 'category.parentCategory', label: 'Category', type: 'text' },
]

/**
 * Field definitions for Leads
 */
export const LEAD_FIELDS: FilterFieldDefinition[] = [
  { key: 'name', label: 'Business Name', type: 'text' },
  { key: 'contactName', label: 'Contact Name', type: 'text' },
  { key: 'contactEmail', label: 'Contact Email', type: 'text' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'text' },
  { key: 'stage', label: 'Stage', type: 'select', options: LEAD_STAGE_OPTIONS },
  { key: 'source', label: 'Source', type: 'text' },
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
  { key: 'convertedAt', label: 'Converted Date', type: 'date' },
  // Fields from linked Category
  { key: 'category.parentCategory', label: 'Category', type: 'text' },
]

/**
 * Get static field definitions for an entity type
 */
export function getFieldsForEntity(entityType: EntityType): FilterFieldDefinition[] {
  switch (entityType) {
    case 'deals':
      return DEAL_FIELDS
    case 'opportunities':
      return OPPORTUNITY_FIELDS
    case 'businesses':
      return BUSINESS_FIELDS
    case 'leads':
      return LEAD_FIELDS
    default:
      return []
  }
}

/**
 * Get a field definition by key from a list of fields
 */
export function getFieldDefinition(entityType: EntityType, fieldKey: string, allFields?: FilterFieldDefinition[]): FilterFieldDefinition | undefined {
  const fields = allFields || getFieldsForEntity(entityType)
  return fields.find(f => f.key === fieldKey)
}

/**
 * Map custom field type to filter field type
 */
export function mapCustomFieldTypeToFilterType(customFieldType: string): FieldType {
  switch (customFieldType) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
      return 'text'
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'select':
      return 'select'
    case 'checkbox':
      return 'boolean'
    default:
      return 'text'
  }
}

/**
 * Map entity type from custom fields to filter entity type
 */
export function mapCustomFieldEntityType(customFieldEntityType: string): EntityType | null {
  switch (customFieldEntityType) {
    case 'deal':
      return 'deals'
    case 'opportunity':
      return 'opportunities'
    case 'business':
      return 'businesses'
    case 'lead':
      return 'leads'
    default:
      return null
  }
}

