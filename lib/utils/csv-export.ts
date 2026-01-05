/**
 * CSV Export & Import Utilities
 * Handles CSV format with proper escaping and parsing
 */

type CsvValue = string | number | boolean | null | undefined | Date

interface CsvColumn<T> {
  key: string
  label: string
  getValue: (item: T) => CsvValue
}

export interface ParsedCsvRow {
  [key: string]: string
}

export interface CsvParseResult {
  headers: string[]
  rows: ParsedCsvRow[]
  errors: string[]
}

/**
 * Escapes a value for CSV format
 */
function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  if (value instanceof Date) {
    return value.toISOString()
  }
  
  const stringValue = String(value)
  
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  
  return stringValue
}

/**
 * Generates CSV content from data array
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  // Header row
  const headerRow = columns.map(col => escapeCsvValue(col.label)).join(',')
  
  // Data rows
  const dataRows = data.map(item => 
    columns.map(col => escapeCsvValue(col.getValue(item))).join(',')
  )
  
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Triggers a CSV file download in the browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Format date for CSV export (YYYY-MM-DD)
 */
export function formatDateForCsv(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * Generate filename with date
 */
export function generateFilename(entityName: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `${entityName}_${date}.csv`
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true
      } else if (char === ',') {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  
  // Don't forget the last field
  result.push(current.trim())
  
  return result
}

/**
 * Parse CSV content into rows with headers as keys
 */
export function parseCsv(content: string): CsvParseResult {
  const errors: string[] = []
  
  // Remove BOM if present and normalize line endings
  const normalizedContent = content
    .replace(/^\ufeff/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  
  const lines = normalizedContent.split('\n').filter(line => line.trim() !== '')
  
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ['El archivo CSV está vacío'] }
  }
  
  // Parse header row
  const headers = parseCsvLine(lines[0])
  
  if (headers.length === 0) {
    return { headers: [], rows: [], errors: ['No se encontraron encabezados en el CSV'] }
  }
  
  // Parse data rows
  const rows: ParsedCsvRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    
    const values = parseCsvLine(line)
    
    if (values.length !== headers.length) {
      errors.push(`Fila ${i + 1}: número incorrecto de columnas (esperado: ${headers.length}, encontrado: ${values.length})`)
      continue
    }
    
    const row: ParsedCsvRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    
    rows.push(row)
  }
  
  return { headers, rows, errors }
}

/**
 * Validate that required headers exist in CSV
 */
export function validateCsvHeaders(
  csvHeaders: string[], 
  requiredHeaders: string[]
): { valid: boolean; missing: string[] } {
  const normalizedCsvHeaders = csvHeaders.map(h => h.toLowerCase().trim())
  const missing = requiredHeaders.filter(
    required => !normalizedCsvHeaders.includes(required.toLowerCase().trim())
  )
  
  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Create a header label to field key mapping
 */
export function createHeaderMapping(
  columns: { key: string; label: string }[]
): Record<string, string> {
  const mapping: Record<string, string> = {}
  columns.forEach(col => {
    mapping[col.label] = col.key
    // Also add lowercase version for case-insensitive matching
    mapping[col.label.toLowerCase()] = col.key
  })
  return mapping
}

/**
 * Map CSV row to entity fields using header mapping
 */
export function mapCsvRowToEntity<T extends Record<string, unknown>>(
  row: ParsedCsvRow,
  headerMapping: Record<string, string>
): Partial<T> {
  const entity: Record<string, unknown> = {}
  
  Object.entries(row).forEach(([header, value]) => {
    const fieldKey = headerMapping[header] || headerMapping[header.toLowerCase()]
    if (fieldKey && value !== '') {
      entity[fieldKey] = value
    }
  })
  
  return entity as Partial<T>
}

