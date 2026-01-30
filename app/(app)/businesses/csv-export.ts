/**
 * Business CSV Export Configuration
 * Contains all fields from BusinessFormModal for complete data export
 */

import type { Business } from '@/types'
import { generateCsv, downloadCsv, formatDateForCsv, generateFilename } from '@/lib/utils/csv-export'

// CSV column configuration for export
export const CSV_EXPORT_COLUMNS = [
  // Core identification
  { key: 'id', label: 'ID', getValue: (b: Business) => b.id },
  { key: 'name', label: 'Nombre', getValue: (b: Business) => b.name },
  // Contact info
  { key: 'contactName', label: 'Contacto', getValue: (b: Business) => b.contactName || '' },
  { key: 'contactEmail', label: 'Email', getValue: (b: Business) => b.contactEmail || '' },
  { key: 'contactPhone', label: 'Teléfono', getValue: (b: Business) => b.contactPhone || '' },
  // Category
  { key: 'category', label: 'Categoría', getValue: (b: Business) => {
    if (!b.category) return ''
    let cat = b.category.parentCategory
    if (b.category.subCategory1) cat += ` > ${b.category.subCategory1}`
    if (b.category.subCategory2) cat += ` > ${b.category.subCategory2}`
    return cat
  }},
  // Ownership
  { key: 'owner', label: 'Owner', getValue: (b: Business) => b.owner?.name || '' },
  { key: 'salesReps', label: 'Sales Reps', getValue: (b: Business) => 
    b.salesReps?.map(r => r.salesRep?.name || '').filter(Boolean).join(', ') || ''
  },
  { key: 'salesTeam', label: 'Equipo', getValue: (b: Business) => b.salesTeam || '' },
  // Business info
  { key: 'tier', label: 'Tier', getValue: (b: Business) => b.tier?.toString() || '' },
  { key: 'accountManager', label: 'Account Manager', getValue: (b: Business) => b.accountManager || '' },
  { key: 'ere', label: 'ERE', getValue: (b: Business) => b.ere || '' },
  { key: 'salesType', label: 'Tipo de Venta', getValue: (b: Business) => b.salesType || '' },
  { key: 'isAsesor', label: 'Es Asesor', getValue: (b: Business) => b.isAsesor || '' },
  { key: 'osAsesor', label: 'OS Asesor', getValue: (b: Business) => b.osAsesor || '' },
  // Online presence
  { key: 'website', label: 'Website', getValue: (b: Business) => b.website || '' },
  { key: 'instagram', label: 'Instagram', getValue: (b: Business) => b.instagram || '' },
  { key: 'description', label: 'Descripción', getValue: (b: Business) => b.description || '' },
  // Legal/Tax
  { key: 'ruc', label: 'RUC', getValue: (b: Business) => b.ruc || '' },
  { key: 'razonSocial', label: 'Razón Social', getValue: (b: Business) => b.razonSocial || '' },
  // Location
  { key: 'provinceDistrictCorregimiento', label: 'Prov,Dist,Corr', getValue: (b: Business) => b.provinceDistrictCorregimiento || '' },
  { key: 'address', label: 'Dirección', getValue: (b: Business) => b.address || '' },
  { key: 'neighborhood', label: 'Barriada', getValue: (b: Business) => b.neighborhood || '' },
  // Payment info
  { key: 'paymentPlan', label: 'Plan de Pago', getValue: (b: Business) => b.paymentPlan || '' },
  { key: 'bank', label: 'Banco', getValue: (b: Business) => b.bank || '' },
  { key: 'beneficiaryName', label: 'Nombre Beneficiario', getValue: (b: Business) => b.beneficiaryName || '' },
  { key: 'accountNumber', label: 'Número de Cuenta', getValue: (b: Business) => b.accountNumber || '' },
  { key: 'accountType', label: 'Tipo de Cuenta', getValue: (b: Business) => b.accountType || '' },
  { key: 'emailPaymentContacts', label: 'Emails de Pago', getValue: (b: Business) => b.emailPaymentContacts || '' },
  // External IDs
  { key: 'osAdminVendorId', label: 'OS Admin Vendor ID', getValue: (b: Business) => b.osAdminVendorId || '' },
  // Metadata
  { key: 'createdAt', label: 'Fecha Creación', getValue: (b: Business) => formatDateForCsv(b.createdAt) },
]

/**
 * Export businesses to CSV file
 */
export function exportBusinessesToCsv(businesses: Business[]): number {
  const csvContent = generateCsv(businesses, CSV_EXPORT_COLUMNS)
  downloadCsv(csvContent, generateFilename('businesses'))
  return businesses.length
}
