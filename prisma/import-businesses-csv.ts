import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

// Create Prisma client with pg adapter (same as lib/prisma.ts)
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// CSV file path - update this to your file location
const CSV_FILE_PATH = '/Users/josep/Downloads/fixed_import.csv'

/**
 * Parse CSV content into array of objects
 * Handles quoted fields with commas and newlines
 */
function parseCSV(content: string): Record<string, string>[] {
  const lines: string[] = []
  let currentLine = ''
  let insideQuotes = false

  // Handle multi-line quoted fields
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '"') {
      insideQuotes = !insideQuotes
    }
    if (char === '\n' && !insideQuotes) {
      lines.push(currentLine)
      currentLine = ''
    } else {
      currentLine += char
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const data: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    data.push(row)
  }

  return data
}

/**
 * Parse a single CSV line into array of values
 * Handles quoted fields correctly
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}

/**
 * Convert string to appropriate type for database
 */
function parseField(value: string, fieldName: string): unknown {
  // Empty string becomes null
  if (value === '' || value === undefined) {
    return null
  }

  // Integer fields
  const intFields = ['tier', 'topSoldQuantity', 'totalDeals360d']
  if (intFields.includes(fieldName)) {
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? null : parsed
  }

  // Decimal fields
  const decimalFields = ['topRevenueAmount']
  if (decimalFields.includes(fieldName)) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }

  // DateTime fields
  const dateFields = [
    'createdAt',
    'updatedAt',
    'focusSetAt',
    'reassignmentRequestedAt',
    'lastLaunchDate',
    'metricsLastSyncedAt',
  ]
  if (dateFields.includes(fieldName)) {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  // JSON fields
  const jsonFields = ['metrics']
  if (jsonFields.includes(fieldName)) {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  // Boolean fields (none in Business model currently, but for future)
  const boolFields: string[] = []
  if (boolFields.includes(fieldName)) {
    return value.toLowerCase() === 'true'
  }

  return value
}

/**
 * Build business data object from CSV row
 */
function buildBusinessData(row: Record<string, string>) {
  // Fields that exist in the Business model (excluding id, relations)
  const businessFields = [
    'name',
    'contactName',
    'contactPhone',
    'contactEmail',
    'categoryId',
    'description',
    'instagram',
    'ownerId',
    'salesTeam',
    'tier',
    'website',
    'leadId',
    'sourceType',
    'metrics',
    'accountManager',
    'accountNumber',
    'accountType',
    'address',
    'bank',
    'beneficiaryName',
    'provinceDistrictCorregimiento',
    'emailPaymentContacts',
    'ere',
    'isAsesor',
    'neighborhood',
    'osAsesor',
    'paymentPlan',
    'razonSocial',
    'ruc',
    'salesType',
    'osAdminVendorId',
    'focusPeriod',
    'focusSetAt',
    'reassignmentStatus',
    'reassignmentType',
    'reassignmentRequestedBy',
    'reassignmentRequestedAt',
    'reassignmentReason',
    'reassignmentPreviousOwner',
    'topSoldQuantity',
    'topSoldDealUrl',
    'topRevenueAmount',
    'topRevenueDealUrl',
    'lastLaunchDate',
    'totalDeals360d',
    'metricsLastSyncedAt',
  ]

  const data: Record<string, unknown> = {}

  for (const field of businessFields) {
    if (row[field] !== undefined) {
      const value = parseField(row[field], field)
      if (value !== null) {
        data[field] = value
      }
    }
  }

  // Required fields - ensure they have values
  if (!data.name) data.name = 'Unknown Business'
  if (!data.contactName) data.contactName = ''
  if (!data.contactPhone) data.contactPhone = ''
  if (!data.contactEmail) data.contactEmail = ''

  return data
}

/**
 * Main import function
 */
async function importBusinessesFromCSV() {
  console.log('📂 Reading CSV file:', CSV_FILE_PATH)

  // Check if file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`File not found: ${CSV_FILE_PATH}`)
  }

  // Read and parse CSV
  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  const rows = parseCSV(content)

  console.log(`📊 Found ${rows.length} rows in CSV\n`)

  let created = 0
  let updated = 0
  let errors = 0

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is header, and arrays are 0-indexed

    try {
      const id = row.id?.trim()
      const businessData = buildBusinessData(row)

      if (id) {
        // Has ID - check if exists and update, or create with specific ID
        const existing = await prisma.business.findUnique({
          where: { id },
        })

        if (existing) {
          // Update existing record
          await prisma.business.update({
            where: { id },
            data: businessData,
          })
          updated++
          console.log(`✏️  [Row ${rowNum}] Updated: ${businessData.name} (${id})`)
        } else {
          // Create with specific ID
          await prisma.business.create({
            data: {
              id,
              ...businessData,
            } as Parameters<typeof prisma.business.create>[0]['data'],
          })
          created++
          console.log(`✅ [Row ${rowNum}] Created: ${businessData.name} (${id})`)
        }
      } else {
        // No ID - create new record with auto-generated ID
        const newBusiness = await prisma.business.create({
          data: businessData as Parameters<typeof prisma.business.create>[0]['data'],
        })
        created++
        console.log(`✅ [Row ${rowNum}] Created: ${businessData.name} (${newBusiness.id})`)
      }
    } catch (error) {
      errors++
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [Row ${rowNum}] Error processing "${row.name}": ${errorMessage}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📈 Import Summary:')
  console.log(`   ✅ Created: ${created}`)
  console.log(`   ✏️  Updated: ${updated}`)
  console.log(`   ❌ Errors:  ${errors}`)
  console.log(`   📊 Total:   ${rows.length}`)
  console.log('='.repeat(50))
}

// Run the import
importBusinessesFromCSV()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
