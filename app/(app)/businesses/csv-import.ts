/**
 * Business CSV Import Configuration
 * Contains all fields from BusinessFormModal for complete data import
 */

import type { Business } from '@/types'
import type { ParsedCsvRow } from '@/lib/utils/csv-export'
import type { CsvUploadPreview, CsvUploadResult, CsvPreviewSample } from '@/components/common/CsvUploadModal'
import { bulkUpsertBusinesses, type BulkBusinessRow } from '@/app/actions/business-bulk'

// All importable fields for preview (shows which fields have values in CSV)
const PREVIEW_FIELDS: { csvHeader: string; label: string }[] = [
  // Contact
  { csvHeader: 'Contacto', label: 'Contacto' },
  { csvHeader: 'Email', label: 'Email' },
  { csvHeader: 'Teléfono', label: 'Teléfono' },
  // Classification
  { csvHeader: 'Categoría', label: 'Categoría' },
  { csvHeader: 'Owner', label: 'Owner' },
  { csvHeader: 'Equipo', label: 'Equipo' },
  { csvHeader: 'Tier', label: 'Tier' },
  // Business info
  { csvHeader: 'Account Manager', label: 'Account Manager' },
  { csvHeader: 'ERE', label: 'ERE' },
  { csvHeader: 'Tipo de Venta', label: 'Tipo Venta' },
  { csvHeader: 'Es Asesor', label: 'Es Asesor' },
  { csvHeader: 'OS Asesor', label: 'OS Asesor' },
  // Online
  { csvHeader: 'Website', label: 'Website' },
  { csvHeader: 'Instagram', label: 'Instagram' },
  { csvHeader: 'Descripción', label: 'Descripción' },
  // Legal
  { csvHeader: 'RUC', label: 'RUC' },
  { csvHeader: 'Razón Social', label: 'Razón Social' },
  // Location
  { csvHeader: 'Prov,Dist,Corr', label: 'Ubicación' },
  { csvHeader: 'Dirección', label: 'Dirección' },
  { csvHeader: 'Barriada', label: 'Barriada' },
  // Payment
  { csvHeader: 'Plan de Pago', label: 'Plan Pago' },
  { csvHeader: 'Banco', label: 'Banco' },
  { csvHeader: 'Nombre Beneficiario', label: 'Beneficiario' },
  { csvHeader: 'Número de Cuenta', label: 'Cuenta' },
  { csvHeader: 'Tipo de Cuenta', label: 'Tipo Cuenta' },
  { csvHeader: 'Emails de Pago', label: 'Emails Pago' },
  // External
  { csvHeader: 'OS Admin Vendor ID', label: 'Vendor ID' },
]

// Expected CSV headers (matching export format)
export const CSV_IMPORT_HEADERS = [
  'ID', 'Nombre', 'Contacto', 'Email', 'Teléfono', 'Categoría', 
  'Owner', 'Equipo', 
  'Tier', 'Account Manager', 'ERE', 'Tipo de Venta', 'Es Asesor', 'OS Asesor',
  'Website', 'Instagram', 'Descripción',
  'RUC', 'Razón Social', 
  'Prov,Dist,Corr', 'Dirección', 'Barriada',
  'Plan de Pago', 'Banco', 'Nombre Beneficiario', 'Número de Cuenta', 'Tipo de Cuenta', 'Emails de Pago',
  'OS Admin Vendor ID',
  'Fecha Creación'
]

/**
 * Get fields with non-empty values from a CSV row for preview
 */
function getChangedFields(row: ParsedCsvRow): string[] {
  const changes: string[] = []
  for (const field of PREVIEW_FIELDS) {
    const value = row[field.csvHeader]?.trim()
    if (value) {
      changes.push(field.label)
    }
  }
  // Show up to 6 fields, then indicate more
  if (changes.length > 6) {
    return [...changes.slice(0, 5), `+${changes.length - 5} más`]
  }
  return changes
}

/**
 * Preview CSV import - validate rows before importing
 * Note: ID validation is done server-side since client only has paginated data
 */
export async function previewBusinessImport(
  rows: ParsedCsvRow[],
  existingBusinesses: Business[]
): Promise<CsvUploadPreview> {
  let toCreate = 0
  let toUpdate = 0
  let skipped = 0
  const errors: string[] = []
  const samples: CsvPreviewSample[] = []

  // Build map of existing businesses by name (case-insensitive) for duplicate detection
  const existingByName = new Map(existingBusinesses.map(b => [b.name.toLowerCase(), b]))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    const id = row['ID']?.trim()
    const name = row['Nombre']?.trim()

    if (id) {
      // Has ID - assume it's an update (server will validate if ID exists)
      toUpdate++
      
      // Add to samples (max 5)
      if (samples.length < 5) {
        samples.push({
          name: name || `ID: ${id.slice(0, 8)}...`,
          action: 'update',
          changes: getChangedFields(row)
        })
      }
    } else if (name) {
      // No ID - check for duplicate name (best effort with loaded data)
      // Server will do final validation
      const existingName = existingByName.get(name.toLowerCase())
      if (existingName) {
        errors.push(`Fila ${rowNum}: Ya existe negocio con nombre "${name}"`)
        skipped++
      } else {
        toCreate++
        
        // Add to samples (max 5)
        if (samples.length < 5) {
          samples.push({
            name,
            action: 'create',
            changes: getChangedFields(row)
          })
        }
      }
    } else {
      errors.push(`Fila ${rowNum}: Se requiere ID o Nombre`)
      skipped++
    }
  }

  return { toCreate, toUpdate, skipped, errors, rows, samples }
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
    provinceDistrictCorregimiento: blankToUndefined(row['Prov,Dist,Corr']),
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
