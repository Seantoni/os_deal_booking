/**
 * Field Types Configuration
 * 
 * Defines the types and interfaces for dynamic form field generation.
 */

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'select'
  | 'number'
  | 'date'
  | 'time'
  | 'checkbox'
  | 'radio'
  | 'email'
  | 'phone'
  | 'currency'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldConfig {
  /** Unique field name - must match a key in BookingFormData */
  name: string
  
  /** Field type for rendering */
  type: FieldType
  
  /** Display label */
  label: string
  
  /** Placeholder text */
  placeholder?: string
  
  /** Options for select/radio fields */
  options?: readonly SelectOption[]
  
  /** Whether field is required */
  required?: boolean
  
  /** Spans full width (2 columns on desktop) */
  fullWidth?: boolean
  
  /** Number of rows for textarea */
  rows?: number
  
  /** Help text shown below field */
  helpText?: string
  
  /** Conditional visibility - field name to check */
  showWhen?: {
    field: string
    value: string | string[]
  }
  
  /** Only show for specific subcategories (subCategory1) */
  showForSubCategories?: string[]
  
  /** Default value */
  defaultValue?: string
  
  /** Minimum value for number fields */
  min?: number
  
  /** Maximum value for number fields */
  max?: number
}

export interface CategoryFieldsConfig {
  /** Parent category key (e.g., 'HOTELES', 'RESTAURANTES') */
  [categoryKey: string]: {
    /** Display name for the category */
    displayName: string
    
    /** Fields for this category */
    fields: FieldConfig[]
    
    /** Optional info note shown at the bottom */
    infoNote?: string
  }
}

// Common select options that are reused across categories
export const COMMON_OPTIONS = {
  YES_NO: [
    { value: 'Sí', label: 'Sí' },
    { value: 'No', label: 'No' },
  ],
  YES_NO_EMPTY: [
    { value: '', label: 'Seleccione...' },
    { value: 'Sí', label: 'Sí' },
    { value: 'No', label: 'No' },
  ],
  YES_NO_NA: [
    { value: '', label: 'Seleccione...' },
    { value: 'Sí', label: 'Sí' },
    { value: 'No', label: 'No' },
    { value: 'No aplica', label: 'No aplica' },
  ],
} as const
