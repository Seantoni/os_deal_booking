/**
 * Field mapping configuration for backfilling Business fields from BookingRequest
 * 
 * Maps fields from the booking request form to their corresponding Business fields.
 * Only fields that make sense to back-populate are included here.
 */

export interface FieldMapping {
  /** Field name in BookingRequest */
  requestField: string
  /** Field name in Business */
  businessField: string
  /** Spanish label for UI display */
  label: string
  /** API field key for vendor PATCH (if applicable) */
  vendorApiField?: string
}

/**
 * Mapping of BookingRequest fields → Business fields
 * 
 * Note: Composite fields (addressAndHours, socialMedia) are intentionally excluded
 * as they would require complex parsing.
 */
export const REQUEST_TO_BUSINESS_FIELD_MAP: FieldMapping[] = [
  // Legal/Tax Info
  { 
    requestField: 'legalName', 
    businessField: 'razonSocial', 
    label: 'Razón Social',
    vendorApiField: 'razonSocial',
  },
  { 
    requestField: 'rucDv', 
    businessField: 'ruc', 
    label: 'RUC',
    vendorApiField: 'ruc',
  },
  
  // Location
  { 
    requestField: 'provinceDistrictCorregimiento', 
    businessField: 'provinceDistrictCorregimiento', 
    label: 'Ubicación (Provincia/Distrito/Corregimiento)',
    // No vendor API mapping - external API uses neighborhoodId which requires mapping table
  },
  
  // Banking Info
  { 
    requestField: 'bank', 
    businessField: 'bank', 
    label: 'Banco',
    // No vendor API mapping - external API uses bankId which requires mapping table
  },
  { 
    requestField: 'bankAccountName', 
    businessField: 'beneficiaryName', 
    label: 'Nombre Beneficiario',
    vendorApiField: 'beneficiaryName',
  },
  { 
    requestField: 'accountNumber', 
    businessField: 'accountNumber', 
    label: 'Número de Cuenta',
    vendorApiField: 'account',
  },
  { 
    requestField: 'accountType', 
    businessField: 'accountType', 
    label: 'Tipo de Cuenta',
    vendorApiField: 'accountType',
  },
  { 
    requestField: 'paymentType', 
    businessField: 'paymentPlan', 
    label: 'Plan de Pago',
    vendorApiField: 'paymentPlan',
  },
  
  // Contact Info
  { 
    requestField: 'redemptionContactName', 
    businessField: 'contactName', 
    label: 'Nombre de Contacto',
    vendorApiField: 'managerName',
  },
  { 
    requestField: 'redemptionContactPhone', 
    businessField: 'contactPhone', 
    label: 'Teléfono de Contacto',
    vendorApiField: 'phoneNumber',
  },
  { 
    requestField: 'redemptionContactEmail', 
    businessField: 'contactEmail', 
    label: 'Correo de Contacto',
    vendorApiField: 'email',
  },
]

/**
 * Get the Spanish label for a business field
 */
export function getBusinessFieldLabel(businessField: string): string {
  const mapping = REQUEST_TO_BUSINESS_FIELD_MAP.find(m => m.businessField === businessField)
  return mapping?.label || businessField
}

/**
 * Get the vendor API field key for a business field
 */
export function getVendorApiField(businessField: string): string | undefined {
  const mapping = REQUEST_TO_BUSINESS_FIELD_MAP.find(m => m.businessField === businessField)
  return mapping?.vendorApiField
}
