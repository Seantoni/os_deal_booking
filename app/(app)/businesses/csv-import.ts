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
 * Map CSV row to BulkBusinessRow
 */
function mapCsvRowToBusinessRow(row: ParsedCsvRow): BulkBusinessRow {
  return {
    // Core identification
    id: row['ID']?.trim() || undefined,
    name: row['Nombre']?.trim() || '',
    // Contact info
    contactName: row['Contacto']?.trim(),
    contactEmail: row['Email']?.trim(),
    contactPhone: row['Teléfono']?.trim(),
    // Category
    category: row['Categoría']?.trim(),
    // Ownership
    owner: row['Owner']?.trim(),
    salesReps: row['Sales Reps']?.trim(),
    salesTeam: row['Equipo']?.trim(),
    // Business info
    tier: row['Tier']?.trim(),
    accountManager: row['Account Manager']?.trim(),
    ere: row['ERE']?.trim(),
    salesType: row['Tipo de Venta']?.trim(),
    isAsesor: row['Es Asesor']?.trim(),
    osAsesor: row['OS Asesor']?.trim(),
    // Online presence
    website: row['Website']?.trim(),
    instagram: row['Instagram']?.trim(),
    description: row['Descripción']?.trim(),
    // Legal/Tax
    ruc: row['RUC']?.trim(),
    razonSocial: row['Razón Social']?.trim(),
    // Location
    province: row['Provincia']?.trim(),
    district: row['Distrito']?.trim(),
    corregimiento: row['Corregimiento']?.trim(),
    address: row['Dirección']?.trim(),
    neighborhood: row['Barriada']?.trim(),
    // Payment info
    paymentPlan: row['Plan de Pago']?.trim(),
    bank: row['Banco']?.trim(),
    beneficiaryName: row['Nombre Beneficiario']?.trim(),
    accountNumber: row['Número de Cuenta']?.trim(),
    accountType: row['Tipo de Cuenta']?.trim(),
    emailPaymentContacts: row['Emails de Pago']?.trim(),
    // External IDs
    osAdminVendorId: row['OS Admin Vendor ID']?.trim(),
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
