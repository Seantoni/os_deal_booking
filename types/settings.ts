/**
 * Settings and configuration type definitions
 */

import type { CategoryHierarchy } from './category'

export type CategoryDurations = {
  [category: string]: number
}

export type BusinessException = {
  id: string
  businessName: string
  exceptionType: 'duration' | 'repeatDays' | 'dailyLimitExempt'
  exceptionValue: number
  notes?: string
}

/**
 * Configuration for a single request form field
 */
export type RequestFieldConfig = {
  required: boolean
}

/**
 * Configuration for all request form fields organized by step
 * Key is the field name (e.g., 'businessName', 'partnerEmail')
 */
export type RequestFormFieldsConfig = {
  [fieldName: string]: RequestFieldConfig
}

export type BookingSettings = {
  minDailyLaunches: number
  maxDailyLaunches: number
  categoryDurations: CategoryDurations
  merchantRepeatDays: number
  businessExceptions: BusinessException[]
  customCategories: CategoryHierarchy
  /**
   * Optional visibility controls for categories.
   * Key format: "MAIN", "MAIN:Sub", or "MAIN:Sub:Leaf".
   * Value: true means hidden.
   */
  hiddenCategoryPaths?: Record<string, boolean>
  /**
   * Optional overrides to map category paths to additional-info templates.
   * Key format: "MAIN", "MAIN:Sub", or "MAIN:Sub:Leaf".
   * Value: template key from FIELD_TEMPLATES.
   */
  additionalInfoMappings?: Record<string, string>
  /**
   * Request form field configurations (required/optional)
   * Single source of truth for field requirements
   */
  requestFormFields?: RequestFormFieldsConfig
}

