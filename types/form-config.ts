/**
 * Form Configuration Types
 * Defines the structure for entity field management
 */

import { DEAL_STATUS_OPTIONS, LEAD_STAGE_OPTIONS } from '@/lib/constants'

export type FormEntityType = 'business' | 'opportunity' | 'deal' | 'lead'

export type FieldWidth = 'full' | 'half'

export type FieldSource = 'builtin' | 'custom'

// Built-in field definition (static definition of what fields exist)
export interface BuiltinFieldDefinition {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'email' | 'phone' | 'url' | 'category' | 'user-select' | 'business-select' | 'stage-select' | 'location'
  defaultRequired: boolean // Whether field is required by default
  canHide: boolean // Whether field can be hidden (some fields like 'name' might be always required)
  canSetRequired: boolean // Whether admin can change required status
  placeholder?: string
  helpText?: string
  options?: { value: string; label: string }[] // For select fields
}

// Form section from database (base, without fields relation)
export interface FormSectionBase {
  id: string
  entityType: FormEntityType
  name: string
  displayOrder: number
  isCollapsed: boolean
  isActive: boolean
}

// Form section with basic fields (from Prisma include)
export interface FormSection extends FormSectionBase {
  fields: FormFieldConfig[]
}

// Form section with enriched fields (with definitions)
export interface FormSectionWithDefinitions extends FormSectionBase {
  fields: FormFieldWithDefinition[]
}

// Form field configuration from database
export interface FormFieldConfig {
  id: string
  entityType: FormEntityType
  sectionId: string
  fieldKey: string
  fieldSource: FieldSource
  displayOrder: number
  isVisible: boolean
  isRequired: boolean
  isReadonly: boolean
  canEditAfterCreation: boolean // If true, only admin can edit after field has been filled and saved (with unlock)
  width: FieldWidth
}

// Combined field info for UI (merges built-in definition with config)
export interface FormFieldWithDefinition extends FormFieldConfig {
  definition: BuiltinFieldDefinition | null // null for custom fields
  customFieldLabel?: string // Label from CustomField if it's a custom field
  customFieldType?: string // Type from CustomField if it's a custom field
  customFieldOptions?: { value: string; label: string }[] // Options from CustomField if it's a custom field
  customFieldPlaceholder?: string // Placeholder from CustomField
  customFieldHelpText?: string // Help text from CustomField
}

// ============================================================================
// BUILT-IN FIELD DEFINITIONS BY ENTITY TYPE
// ============================================================================

export const BUSINESS_BUILTIN_FIELDS: BuiltinFieldDefinition[] = [
  { key: 'name', label: 'Business Name', type: 'text', defaultRequired: true, canHide: false, canSetRequired: false },
  { key: 'contactName', label: 'Contact Name', type: 'text', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'contactPhone', label: 'Contact Phone', type: 'phone', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'contactEmail', label: 'Contact Email', type: 'email', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'categoryId', label: 'Category', type: 'category', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'salesTeam', label: 'Sales Team', type: 'select', defaultRequired: false, canHide: true, canSetRequired: true, options: [
    { value: 'inside', label: 'Inside Sales' },
    { value: 'outside', label: 'Outside Sales' },
  ]},
  { key: 'website', label: 'Website', type: 'url', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'instagram', label: 'Instagram', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'description', label: 'Description', type: 'textarea', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'tier', label: 'Tier', type: 'select', defaultRequired: false, canHide: true, canSetRequired: true, options: [
    { value: '1', label: 'Tier 1' },
    { value: '2', label: 'Tier 2' },
    { value: '3', label: 'Tier 3' },
  ]},
  // Fiscal / Legal fields
  { key: 'razonSocial', label: 'Razón Social', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'ruc', label: 'RUC y DV', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  // Location fields
  { key: 'address', label: 'Dirección', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'neighborhood', label: 'Barrio / Urbanización', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento', type: 'location', defaultRequired: false, canHide: true, canSetRequired: true },
  // Banking fields
  { key: 'bank', label: 'Banco', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'beneficiaryName', label: 'Nombre en Cuenta Bancaria', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'accountNumber', label: 'Número de Cuenta', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'accountType', label: 'Tipo de Cuenta', type: 'select', defaultRequired: false, canHide: true, canSetRequired: true, options: [
    { value: 'Cuenta de Ahorros', label: 'Cuenta de Ahorros' },
    { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
  ]},
  { key: 'paymentPlan', label: 'Plan de Pago', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'emailPaymentContacts', label: 'Emails para Pagos', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Separar múltiples emails con comas' },
]

export const OPPORTUNITY_BUILTIN_FIELDS: BuiltinFieldDefinition[] = [
  { key: 'businessId', label: 'Business', type: 'business-select', defaultRequired: true, canHide: false, canSetRequired: false },
  { key: 'categoryId', label: 'Category', type: 'category', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Auto-filled from selected business' },
  { key: 'tier', label: 'Tier', type: 'select', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Auto-filled from selected business', options: [
    { value: '1', label: 'Tier 1' },
    { value: '2', label: 'Tier 2' },
    { value: '3', label: 'Tier 3' },

  ] },
  { key: 'stage', label: 'Stage', type: 'stage-select', defaultRequired: true, canHide: true, canSetRequired: false },
  { key: 'startDate', label: 'Start Date', type: 'date', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'closeDate', label: 'Close Date', type: 'date', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'responsibleId', label: 'Responsible', type: 'user-select', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'nextActivityDate', label: 'Next Activity Date', type: 'date', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'contactName', label: 'Contact Name', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Auto-filled from selected business' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'phone', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Auto-filled from selected business' },
  { key: 'contactEmail', label: 'Contact Email', type: 'email', defaultRequired: false, canHide: true, canSetRequired: true, helpText: 'Auto-filled from selected business' },
  { key: 'notes', label: 'Notes', type: 'textarea', defaultRequired: false, canHide: true, canSetRequired: true },
]

export const DEAL_BUILTIN_FIELDS: BuiltinFieldDefinition[] = [
  { key: 'bookingRequestId', label: 'Booking Request', type: 'text', defaultRequired: true, canHide: false, canSetRequired: false, helpText: 'Auto-linked from booked request' },
  { key: 'status', label: 'Status', type: 'select', defaultRequired: true, canHide: false, canSetRequired: false, options: DEAL_STATUS_OPTIONS },
  { key: 'deliveryDate', label: 'Fecha de entrega', type: 'date', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'responsibleId', label: 'Editor Responsible', type: 'user-select', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'ereResponsibleId', label: 'ERE Responsible', type: 'user-select', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'opportunityId', label: 'Opportunity', type: 'text', defaultRequired: false, canHide: true, canSetRequired: false, helpText: 'Auto-linked from opportunity' },
]

export const LEAD_BUILTIN_FIELDS: BuiltinFieldDefinition[] = [
  { key: 'name', label: 'Business Name', type: 'text', defaultRequired: true, canHide: false, canSetRequired: false },
  { key: 'contactName', label: 'Contact Name', type: 'text', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'contactPhone', label: 'Contact Phone', type: 'phone', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'contactEmail', label: 'Contact Email', type: 'email', defaultRequired: true, canHide: true, canSetRequired: true },
  { key: 'categoryId', label: 'Category', type: 'category', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'stage', label: 'Stage', type: 'select', defaultRequired: true, canHide: false, canSetRequired: false, options: LEAD_STAGE_OPTIONS },
  { key: 'responsibleId', label: 'Responsible', type: 'user-select', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'source', label: 'Source', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'website', label: 'Website', type: 'url', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'instagram', label: 'Instagram', type: 'text', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'description', label: 'Description', type: 'textarea', defaultRequired: false, canHide: true, canSetRequired: true },
  { key: 'notes', label: 'Notes', type: 'textarea', defaultRequired: false, canHide: true, canSetRequired: true },
]

// Helper to get built-in fields by entity type
export function getBuiltinFieldsForEntity(entityType: FormEntityType): BuiltinFieldDefinition[] {
  switch (entityType) {
    case 'business':
      return BUSINESS_BUILTIN_FIELDS
    case 'opportunity':
      return OPPORTUNITY_BUILTIN_FIELDS
    case 'deal':
      return DEAL_BUILTIN_FIELDS
    case 'lead':
      return LEAD_BUILTIN_FIELDS
    default:
      return []
  }
}

// Helper to get a specific built-in field definition
export function getBuiltinFieldDefinition(entityType: FormEntityType, fieldKey: string): BuiltinFieldDefinition | null {
  const fields = getBuiltinFieldsForEntity(entityType)
  return fields.find(f => f.key === fieldKey) || null
}

// Default sections for each entity type (used when initializing)
export const DEFAULT_SECTIONS: Record<FormEntityType, { name: string; fields: string[] }[]> = {
  business: [
    { name: 'Basic Information', fields: ['name', 'categoryId', 'tier', 'description'] },
    { name: 'Contact Details', fields: ['contactName', 'contactPhone', 'contactEmail'] },
    { name: 'Online Presence', fields: ['website', 'instagram', 'salesTeam'] },
    { name: 'Datos Fiscales', fields: ['razonSocial', 'ruc'] },
    { name: 'Ubicación', fields: ['address', 'neighborhood', 'provinceDistrictCorregimiento'] },
    { name: 'Datos Bancarios', fields: ['bank', 'beneficiaryName', 'accountNumber', 'accountType', 'paymentPlan', 'emailPaymentContacts'] },
  ],
  opportunity: [
    { name: 'Opportunity Details', fields: ['businessId', 'categoryId', 'tier', 'stage', 'responsibleId'] },
    { name: 'Contact Details', fields: ['contactName', 'contactPhone', 'contactEmail'] },
    { name: 'Dates', fields: ['startDate', 'closeDate', 'nextActivityDate'] },
    { name: 'Additional Info', fields: ['notes'] },
  ],
  deal: [
    { name: 'Deal Information', fields: ['bookingRequestId', 'status', 'deliveryDate', 'opportunityId'] },
    { name: 'Assignment', fields: ['responsibleId', 'ereResponsibleId'] },
  ],
  lead: [
    { name: 'Basic Information', fields: ['name', 'categoryId', 'stage', 'source'] },
    { name: 'Contact Details', fields: ['contactName', 'contactPhone', 'contactEmail'] },
    { name: 'Additional Info', fields: ['website', 'instagram', 'description', 'notes'] },
    { name: 'Assignment', fields: ['responsibleId'] },
  ],
}
