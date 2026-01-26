/**
 * Vendor Mapper: Business → ExternalOfertaVendorRequest
 * 
 * Transforms internal Business data to external Vendor API format
 */

import type { Business } from '@/types/business'
import type { ExternalOfertaVendorRequest, ExternalOfertaVendorUpdateRequest, VendorFieldChange } from './types'
import { VENDOR_SALES_TYPE } from './types'

// ============================================
// Field Mapping Configuration
// Maps internal field keys → API keys → Spanish labels
// ============================================

/**
 * Field mapping configuration for vendor sync
 * Each entry defines how a business field maps to the external API
 */
export const VENDOR_FIELD_MAPPING: {
  fieldKey: string       // Internal business/form field key
  apiKey: string         // External API field key
  label: string          // Spanish display label
}[] = [
  { fieldKey: 'name', apiKey: 'name', label: 'Nombre' },
  { fieldKey: 'contactEmail', apiKey: 'email', label: 'Correo electrónico' },
  { fieldKey: 'contactPhone', apiKey: 'phoneNumber', label: 'Teléfono' },
  { fieldKey: 'contactName', apiKey: 'managerName', label: 'Nombre de contacto' },
  { fieldKey: 'address', apiKey: 'address', label: 'Dirección' },
  { fieldKey: 'website', apiKey: 'website', label: 'Sitio web' },
  { fieldKey: 'razonSocial', apiKey: 'razonSocial', label: 'Razón social' },
  { fieldKey: 'ruc', apiKey: 'ruc', label: 'RUC' },
  { fieldKey: 'beneficiaryName', apiKey: 'beneficiaryName', label: 'Nombre del beneficiario' },
  { fieldKey: 'accountNumber', apiKey: 'account', label: 'Número de cuenta' },
  { fieldKey: 'accountType', apiKey: 'accountType', label: 'Tipo de cuenta' },
  { fieldKey: 'paymentPlan', apiKey: 'paymentPlan', label: 'Plan de pago' },
]

/**
 * Get the Spanish label for a field key
 */
export function getFieldLabel(fieldKey: string): string {
  const mapping = VENDOR_FIELD_MAPPING.find(m => m.fieldKey === fieldKey)
  return mapping?.label || fieldKey
}

/**
 * Map internal Business to External Vendor API request
 * 
 * @param business - Internal business data
 * @param options - Additional mapping options
 * @returns External API request payload
 * 
 * @example
 * ```typescript
 * const vendorPayload = mapBusinessToVendor(business)
 * // Send to API...
 * ```
 */
export function mapBusinessToVendor(
  business: Business,
  options: {
    /** Override default sales type (defaults to 0=Regular) */
    salesType?: number
  } = {}
): ExternalOfertaVendorRequest {
  return {
    // ===== REQUIRED FIELDS =====
    name: business.name,
    email: business.contactEmail,
    // Default to Regular (0) - TODO: Map from business.salesType string when mapping is available
    salesType: options.salesType ?? VENDOR_SALES_TYPE.REGULAR,

    // ===== DIRECT MAPPINGS =====
    address: business.address || null,
    phoneNumber: business.contactPhone || null,
    website: business.website || null,
    managerName: business.contactName || null,
    emailContact: business.contactEmail || null, // Same as main email
    razonSocial: business.razonSocial || null,
    ruc: business.ruc || null,
    beneficiaryName: business.beneficiaryName || null,
    account: business.accountNumber || null,
    accountType: business.accountType || null,
    paymentPlan: business.paymentPlan || null,

    // ===== FUTURE MAPPINGS (null for now) =====
    // TODO: Add bank name → ID mapping table
    bankId: null, // business.bank is string, API expects integer ID
    // TODO: Add neighborhood name → ID mapping table
    neighborhoodId: null, // business.neighborhood is string, API expects integer ID
    // TODO: Map from UserProfile when external IDs are added to model
    osSalesId: null,
    osAccountId: null,
    osMerchantId: null,
    osInsideSalesId: null,
  }
}

/**
 * Validate vendor request has required fields
 * 
 * @param request - Vendor request payload
 * @returns Validation result with errors if any
 */
export function validateVendorRequest(request: ExternalOfertaVendorRequest): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Required fields
  if (!request.name || request.name.trim() === '') {
    errors.push('name is required')
  }
  if (!request.email || request.email.trim() === '') {
    errors.push('email is required')
  }
  if (typeof request.salesType !== 'number') {
    errors.push('salesType is required and must be a number (0-3)')
  } else if (request.salesType < 0 || request.salesType > 3) {
    errors.push('salesType must be 0 (Regular), 1 (Inside), 2 (Recurring), or 3 (OSP)')
  }

  // Email format validation
  if (request.email && !isValidEmail(request.email)) {
    errors.push('email must be a valid email address')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Future helper: Map salesType string to integer
 * TODO: Implement when we know the exact string values stored
 * 
 * @param salesTypeString - String value from business.salesType
 * @returns Integer value for API (0-3)
 */
export function mapSalesTypeToInteger(salesTypeString: string | null | undefined): number {
  if (!salesTypeString) return VENDOR_SALES_TYPE.REGULAR

  const lower = salesTypeString.toLowerCase()
  
  if (lower.includes('inside')) return VENDOR_SALES_TYPE.INSIDE
  if (lower.includes('recurring') || lower.includes('recurrente')) return VENDOR_SALES_TYPE.RECURRING
  if (lower.includes('osp')) return VENDOR_SALES_TYPE.OSP
  
  // Default to Regular
  return VENDOR_SALES_TYPE.REGULAR
}

// ============================================
// Field Diff Functions (for PATCH updates)
// ============================================

/**
 * Compare business data with form values and return changed fields
 * Only includes fields that are different and mapped to the API
 * 
 * @param currentBusiness - Current business data from database
 * @param newValues - New values from form (Record<fieldKey, value>)
 * @returns Object with changes for display and API payload
 */
export function getChangedVendorFields(
  currentBusiness: Business,
  newValues: Record<string, string | null | undefined>
): {
  /** List of field changes for display in confirmation dialog */
  changes: VendorFieldChange[]
  /** API payload with only changed fields */
  apiPayload: ExternalOfertaVendorUpdateRequest
} {
  const changes: VendorFieldChange[] = []
  const apiPayload: ExternalOfertaVendorUpdateRequest = {}

  for (const mapping of VENDOR_FIELD_MAPPING) {
    const { fieldKey, apiKey, label } = mapping

    // Get current value from business
    const currentValue = getBusinessFieldValue(currentBusiness, fieldKey)
    // Get new value from form
    const newValue = normalizeValue(newValues[fieldKey])

    // Check if value changed
    if (currentValue !== newValue) {
      changes.push({
        fieldKey,
        apiKey,
        label,
        oldValue: currentValue,
        newValue,
        isNew: !currentValue && !!newValue,
      })

      // Add to API payload
      ;(apiPayload as Record<string, string | null>)[apiKey] = newValue
    }
  }

  return { changes, apiPayload }
}

/**
 * Get a field value from business object by field key
 */
function getBusinessFieldValue(business: Business, fieldKey: string): string | null {
  const value = (business as Record<string, unknown>)[fieldKey]
  return normalizeValue(value as string | null | undefined)
}

/**
 * Normalize a value for comparison (empty strings → null)
 */
function normalizeValue(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return value.trim()
}

/**
 * Format a value for display (null → "(vacío)")
 */
export function formatValueForDisplay(value: string | null): string {
  if (value === null || value === '') {
    return '(vacío)'
  }
  // Truncate long values
  if (value.length > 50) {
    return value.substring(0, 47) + '...'
  }
  return value
}
