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
 * Account type options
 */
export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'Cuenta de Ahorros', label: 'Cuenta de Ahorros' },
  { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
]

/**
 * Payment plan options
 */
export const PAYMENT_PLAN_OPTIONS = [
  { value: 'QR - Daily', label: 'QR - Daily' },
  { value: 'QR - Weekly', label: 'QR - Weekly' },
  { value: 'QR - Monthly', label: 'QR - Monthly' },
  { value: 'List - Weekly', label: 'List - Weekly' },
  { value: 'List - Monthly', label: 'List - Monthly' },
  { value: '50% en 7 días y 50% en 30 días', label: '50% en 7 días y 50% en 30 días' },
  { value: 'EVENTO', label: 'EVENTO' },
  { value: 'OTRO', label: 'OTRO' },
]

/**
 * Focus period options
 */
export const FOCUS_PERIOD_OPTIONS = [
  { value: '1_week', label: '1 Semana' },
  { value: '2_weeks', label: '2 Semanas' },
  { value: '1_month', label: '1 Mes' },
  { value: '3_months', label: '3 Meses' },
]

/**
 * Sales type options
 */
export const SALES_TYPE_OPTIONS = [
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'existente', label: 'Existente' },
]

/**
 * Is Asesor options
 */
export const IS_ASESOR_OPTIONS = [
  { value: 'si', label: 'Sí' },
  { value: 'no', label: 'No' },
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
  // Opportunity Details
  { key: 'name', label: 'Opportunity Name', type: 'text' },
  { key: 'stage', label: 'Stage', type: 'select', options: OPPORTUNITY_STAGE_OPTIONS },
  { key: 'hasRequest', label: 'Has Request', type: 'boolean' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'lostReason', label: 'Lost Reason', type: 'text' },
  
  // Dates
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'closeDate', label: 'Close Date', type: 'date' },
  { key: 'nextActivityDate', label: 'Next Activity Date', type: 'date' },
  { key: 'lastActivityDate', label: 'Last Activity Date', type: 'date' },
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
  
  // Assignment
  { key: 'responsible.name', label: 'Responsible Name', type: 'text' },
  
  // Linked Business - Basic Info
  { key: 'business.name', label: 'Business Name', type: 'text' },
  { key: 'business.tier', label: 'Business Tier', type: 'select', options: BUSINESS_TIER_OPTIONS },
  { key: 'business.description', label: 'Business Description', type: 'text' },
  { key: 'business.category.parentCategory', label: 'Business Category', type: 'text' },
  
  // Linked Business - Contact
  { key: 'business.contactName', label: 'Contact Name', type: 'text' },
  { key: 'business.contactEmail', label: 'Contact Email', type: 'text' },
  { key: 'business.contactPhone', label: 'Contact Phone', type: 'text' },
  
  // Linked Business - Online Presence
  { key: 'business.website', label: 'Business Website', type: 'text' },
  { key: 'business.instagram', label: 'Business Instagram', type: 'text' },
  
  // Linked Business - Sales & Assignment
  { key: 'business.salesTeam', label: 'Sales Team', type: 'select', options: SALES_TEAM_OPTIONS },
  { key: 'business.salesType', label: 'Sales Type', type: 'select', options: SALES_TYPE_OPTIONS },
  { key: 'business.accountManager', label: 'Account Manager', type: 'text' },
  { key: 'business.ere', label: 'ERE', type: 'text' },
  { key: 'business.owner.name', label: 'Business Owner', type: 'text' },
  { key: 'business.focusPeriod', label: 'Business Focus Period', type: 'select', options: FOCUS_PERIOD_OPTIONS },
  
  // Linked Business - Fiscal / Legal
  { key: 'business.razonSocial', label: 'Razón Social', type: 'text' },
  { key: 'business.ruc', label: 'RUC y DV', type: 'text' },
  
  // Linked Business - Location
  { key: 'business.address', label: 'Business Address', type: 'text' },
  { key: 'business.neighborhood', label: 'Business Neighborhood', type: 'text' },
  { key: 'business.provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento', type: 'text' },
  
  // Linked Business - Banking / Payment
  { key: 'business.bank', label: 'Business Bank', type: 'text' },
  { key: 'business.accountType', label: 'Business Account Type', type: 'select', options: ACCOUNT_TYPE_OPTIONS },
  { key: 'business.paymentPlan', label: 'Business Payment Plan', type: 'select', options: PAYMENT_PLAN_OPTIONS },
  
  // Linked Business - External IDs
  { key: 'business.osAdminVendorId', label: 'OS Admin Vendor ID', type: 'text' },
  
  // Linked Business - Metrics
  { key: 'business.topSoldQuantity', label: 'Business Top Sold Quantity', type: 'number' },
  { key: 'business.topRevenueAmount', label: 'Business Top Revenue', type: 'number' },
  { key: 'business.totalDeals360d', label: 'Business Total Deals (360d)', type: 'number' },
  { key: 'business.lastLaunchDate', label: 'Business Last Launch Date', type: 'date' },
]

/**
 * Field definitions for Businesses
 */
export const BUSINESS_FIELDS: FilterFieldDefinition[] = [
  // Basic Information
  { key: 'name', label: 'Business Name', type: 'text' },
  { key: 'tier', label: 'Tier', type: 'select', options: BUSINESS_TIER_OPTIONS },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'category.parentCategory', label: 'Category', type: 'text' },
  
  // Contact Details
  { key: 'contactName', label: 'Contact Name', type: 'text' },
  { key: 'contactEmail', label: 'Contact Email', type: 'text' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'text' },
  
  // Online Presence
  { key: 'website', label: 'Website', type: 'text' },
  { key: 'instagram', label: 'Instagram', type: 'text' },
  
  // Sales & Assignment
  { key: 'salesTeam', label: 'Sales Team', type: 'select', options: SALES_TEAM_OPTIONS },
  { key: 'salesType', label: 'Sales Type', type: 'select', options: SALES_TYPE_OPTIONS },
  { key: 'isAsesor', label: 'Es Asesor', type: 'select', options: IS_ASESOR_OPTIONS },
  { key: 'osAsesor', label: 'OS Asesor', type: 'text' },
  { key: 'accountManager', label: 'Account Manager', type: 'text' },
  { key: 'ere', label: 'ERE', type: 'text' },
  { key: 'owner.name', label: 'Owner Name', type: 'text' },
  { key: 'focusPeriod', label: 'Focus Period', type: 'select', options: FOCUS_PERIOD_OPTIONS },
  
  // Fiscal / Legal
  { key: 'razonSocial', label: 'Razón Social', type: 'text' },
  { key: 'ruc', label: 'RUC y DV', type: 'text' },
  
  // Location
  { key: 'address', label: 'Dirección', type: 'text' },
  { key: 'neighborhood', label: 'Barrio / Urbanización', type: 'text' },
  { key: 'provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento', type: 'text' },
  
  // Banking / Payment
  { key: 'bank', label: 'Banco', type: 'text' },
  { key: 'beneficiaryName', label: 'Nombre en Cuenta Bancaria', type: 'text' },
  { key: 'accountNumber', label: 'Número de Cuenta', type: 'text' },
  { key: 'accountType', label: 'Tipo de Cuenta', type: 'select', options: ACCOUNT_TYPE_OPTIONS },
  { key: 'paymentPlan', label: 'Plan de Pago', type: 'select', options: PAYMENT_PLAN_OPTIONS },
  { key: 'emailPaymentContacts', label: 'Emails para Pagos', type: 'text' },
  
  // External IDs
  { key: 'osAdminVendorId', label: 'OS Admin Vendor ID', type: 'text' },
  
  // Metrics (denormalized from DealMetrics)
  { key: 'topSoldQuantity', label: 'Top Sold Quantity', type: 'number' },
  { key: 'topRevenueAmount', label: 'Top Revenue Amount', type: 'number' },
  { key: 'totalDeals360d', label: 'Total Deals (360 days)', type: 'number' },
  { key: 'lastLaunchDate', label: 'Last Launch Date', type: 'date' },
  
  // Dates
  { key: 'createdAt', label: 'Created Date', type: 'date' },
  { key: 'updatedAt', label: 'Updated Date', type: 'date' },
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

