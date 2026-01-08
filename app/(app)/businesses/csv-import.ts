/**
 * Business CSV Import Configuration
 * Contains all fields from BusinessFormModal for complete data import
 */

import type { Business } from '@/types'
import type { ParsedCsvRow } from '@/lib/utils/csv-export'
import type { CsvUploadPreview, CsvUploadResult } from '@/components/common/CsvUploadModal'
import { bulkUpsertBusinesses, type BulkBusinessRow } from '@/app/actions/businesses'

// Expected CSV headers (matching export format)
export const CSV_IMPORT_HEADERS = [
  'ID', 'Nombre', 'Contacto', 'Email', 'Teléfono', 'Categoría', 
  'Owner', 'Sales Reps', 'Equipo', 
  'Tier', 'Account Manager', 'ERE', 'Tipo de Venta', 'Es Asesor', 'OS Asesor',
  'Website', 'Instagram', 'Descripción',
  'RUC', 'Razón Social', 
  'Provincia', 'Distrito', 'Corregimiento', 'Dirección', 'Barriada',
  'Plan de Pago', 'Banco', 'Nombre Beneficiario', 'Número de Cuenta', 'Tipo de Cuenta', 'Emails de Pago',
  'OS Admin Vendor ID',
  'Fecha Creación'
]

/**
 * Preview CSV import - validate rows before importing
 */
export async function previewBusinessImport(
  rows: ParsedCsvRow[],
  existingBusinesses: Business[]
): Promise<CsvUploadPreview> {
  let toCreate = 0
  let toUpdate = 0
  let skipped = 0
  const errors: string[] = []

  // Get existing business IDs for validation
  const existingIds = new Set(existingBusinesses.map(b => b.id))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const id = row['ID']?.trim()
    const name = row['Nombre']?.trim()

    if (id) {
      if (existingIds.has(id)) {
        toUpdate++
      } else {
        errors.push(`Fila ${rowNum}: ID "${id}" no encontrado`)
        skipped++
      }
    } else if (name) {
      // Check for duplicate name
      const existingName = existingBusinesses.find(b => b.name.toLowerCase() === name.toLowerCase())
      if (existingName) {
        errors.push(`Fila ${rowNum}: Ya existe negocio con nombre "${name}"`)
        skipped++
      } else {
        toCreate++
      }
    } else {
      errors.push(`Fila ${rowNum}: Se requiere ID o Nombre`)
      skipped++
    }
  }

  return { toCreate, toUpdate, skipped, errors, rows }
}

/**
 * Helper to convert blank strings to undefined (becomes null in DB)
 */
function blankToUndefined(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Map CSV row to BulkBusinessRow
 * Blank values are converted to undefined (null in DB)
 */
function mapCsvRowToBusinessRow(row: ParsedCsvRow): BulkBusinessRow {
  return {
    // Core identification
    id: blankToUndefined(row['ID']),
    name: row['Nombre']?.trim() || '', // Name is required, keep empty string
    // Contact info
    contactName: blankToUndefined(row['Contacto']),
    contactEmail: blankToUndefined(row['Email']),
    contactPhone: blankToUndefined(row['Teléfono']),
    // Category
    category: blankToUndefined(row['Categoría']),
    // Ownership
    owner: blankToUndefined(row['Owner']),
    salesReps: blankToUndefined(row['Sales Reps']),
    salesTeam: blankToUndefined(row['Equipo']),
    // Business info
    tier: blankToUndefined(row['Tier']),
    accountManager: blankToUndefined(row['Account Manager']),
    ere: blankToUndefined(row['ERE']),
    salesType: blankToUndefined(row['Tipo de Venta']),
    isAsesor: blankToUndefined(row['Es Asesor']),
    osAsesor: blankToUndefined(row['OS Asesor']),
    // Online presence
    website: blankToUndefined(row['Website']),
    instagram: blankToUndefined(row['Instagram']),
    description: blankToUndefined(row['Descripción']),
    // Legal/Tax
    ruc: blankToUndefined(row['RUC']),
    razonSocial: blankToUndefined(row['Razón Social']),
    // Location
    province: blankToUndefined(row['Provincia']),
    district: blankToUndefined(row['Distrito']),
    corregimiento: blankToUndefined(row['Corregimiento']),
    address: blankToUndefined(row['Dirección']),
    neighborhood: blankToUndefined(row['Barriada']),
    // Payment info
    paymentPlan: blankToUndefined(row['Plan de Pago']),
    bank: blankToUndefined(row['Banco']),
    beneficiaryName: blankToUndefined(row['Nombre Beneficiario']),
    accountNumber: blankToUndefined(row['Número de Cuenta']),
    accountType: blankToUndefined(row['Tipo de Cuenta']),
    emailPaymentContacts: blankToUndefined(row['Emails de Pago']),
    // External IDs
    osAdminVendorId: blankToUndefined(row['OS Admin Vendor ID']),
  }
}

/**
 * Confirm and execute CSV import
 */
export async function confirmBusinessImport(rows: ParsedCsvRow[]): Promise<CsvUploadResult> {
  const businessRows = rows.map(mapCsvRowToBusinessRow)
  const result = await bulkUpsertBusinesses(businessRows)
  
  if (result.success && result.data) {
    return result.data
  }
  
  return { created: 0, updated: 0, errors: [result.error || 'Error al importar'] }
}
