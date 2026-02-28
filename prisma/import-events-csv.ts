import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const DEFAULT_CSV_PATH = '/Users/josepaez/Downloads/calendarmigrationv1.csv'

interface ImportArgs {
  csvPath: string
  dryRun: boolean
}

interface CsvRow {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  userId: string
  createdAt: string
  updatedAt: string
  category: string
  merchant: string
  parentCategory: string
  subCategory1: string
  subCategory2: string
  subCategory3: string
  bookingRequestId: string
  status: string
  subCategory4: string
  businessId: string
}

interface PreparedEvent {
  id: string | null
  name: string
  description: string | null
  startDate: Date
  endDate: Date
  userId: string
  createdAt: Date | null
  updatedAt: Date | null
  category: string | null
  business: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  bookingRequestId: string | null
  status: string
  subCategory4: string | null
  businessId: string | null
  key: string
}

function parseArgs(argv: string[]): ImportArgs {
  let csvPath: string | null = null
  let dryRun = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }

    if (arg === '--file' || arg === '-f') {
      csvPath = argv[i + 1] ?? null
      i += 1
      continue
    }

    if (!arg.startsWith('-') && !csvPath) {
      csvPath = arg
    }
  }

  return {
    csvPath: csvPath || DEFAULT_CSV_PATH,
    dryRun,
  }
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === ',' && !insideQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function splitCsvRows(content: string): string[] {
  const rows: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (char === '"') {
      if (insideQuotes && content[i + 1] === '"') {
        current += '""'
        i += 1
        continue
      }
      insideQuotes = !insideQuotes
    }

    if (char === '\n' && !insideQuotes) {
      rows.push(current.replace(/\r$/, ''))
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    rows.push(current.replace(/\r$/, ''))
  }

  return rows
}

function parseCSV(content: string): CsvRow[] {
  const rows = splitCsvRows(content).filter((line) => line.trim().length > 0)
  if (rows.length === 0) return []

  const headers = parseCSVLine(rows[0]).map((header) => header.replace(/^\uFEFF/, ''))

  const data: CsvRow[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const values = parseCSVLine(rows[i])
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as CsvRow
    data.push(row)
  }

  return data
}

function parseUtcDateTime(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime()) && /[TZz]|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return direct
  }

  const localPattern = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  const match = trimmed.match(localPattern)
  if (!match) {
    const fallback = new Date(trimmed)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  const [, y, m, d, hh, mm, ss] = match
  const utcDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)))
  return Number.isNaN(utcDate.getTime()) ? null : utcDate
}

function normalizeText(value: string): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function buildCategoryKey(
  parentCategory: string | null,
  subCategory1: string | null,
  subCategory2: string | null,
  subCategory3: string | null,
  subCategory4: string | null,
  legacyCategory: string | null
): string | null {
  if (parentCategory) {
    const parts = [parentCategory]
    if (subCategory1) parts.push(subCategory1)
    if (subCategory2) parts.push(subCategory2)
    if (subCategory3) parts.push(subCategory3)
    if (subCategory4) parts.push(subCategory4)
    return parts.join(':')
  }

  if (legacyCategory) {
    return legacyCategory.replace(/\s*>\s*/g, ':').replace(/:\s+/g, ':').replace(/\s+:/g, ':').trim()
  }

  return null
}

function buildEventKey(event: Omit<PreparedEvent, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'key'>): string {
  return [
    event.name,
    event.description ?? '',
    event.startDate.toISOString(),
    event.endDate.toISOString(),
    event.category ?? '',
    event.business ?? '',
    event.parentCategory ?? '',
    event.subCategory1 ?? '',
    event.subCategory2 ?? '',
    event.subCategory3 ?? '',
    event.subCategory4 ?? '',
    event.bookingRequestId ?? '',
    event.status ?? '',
    event.businessId ?? '',
  ].join('|')
}

async function resolveFallbackUserId(prisma: PrismaClient): Promise<string> {
  const admin = await prisma.userProfile.findFirst({
    where: {
      isActive: true,
      role: 'admin',
    },
    select: {
      clerkId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (admin?.clerkId) {
    return admin.clerkId
  }

  const activeUser = await prisma.userProfile.findFirst({
    where: { isActive: true },
    select: { clerkId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!activeUser?.clerkId) {
    throw new Error('No active users found to use as fallback userId')
  }

  return activeUser.clerkId
}

async function runImport() {
  const { csvPath, dryRun } = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`)
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    console.log(`Reading CSV: ${csvPath}`)
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const rows = parseCSV(csvContent)
    console.log(`CSV rows: ${rows.length}`)

    const fallbackUserId = await resolveFallbackUserId(prisma)
    console.log(`Fallback userId: ${fallbackUserId}`)

    const skippedReasons: Record<string, number> = {}
    const prepared: PreparedEvent[] = []
    const seenCsvKeys = new Set<string>()
    let duplicateRowsInCsv = 0

    for (const row of rows) {
      const name = normalizeText(row.name)
      const startDate = parseUtcDateTime(row.startDate || '')
      const endDate = parseUtcDateTime(row.endDate || '')
      const business = normalizeText(row.merchant || '')
      const description = normalizeText(row.description || '')
      const parentCategory = normalizeText(row.parentCategory || '')
      const subCategory1 = normalizeText(row.subCategory1 || '')
      const subCategory2 = normalizeText(row.subCategory2 || '')
      const subCategory3 = normalizeText(row.subCategory3 || '')
      const subCategory4 = normalizeText(row.subCategory4 || '')
      const legacyCategory = normalizeText(row.category || '')
      const bookingRequestId = normalizeText(row.bookingRequestId || '')
      const status = normalizeText(row.status || '') || 'booked'
      const businessId = normalizeText(row.businessId || '')
      const userId = normalizeText(row.userId || '') || fallbackUserId
      const createdAt = parseUtcDateTime(row.createdAt || '')
      const updatedAt = parseUtcDateTime(row.updatedAt || '')
      const category = buildCategoryKey(
        parentCategory,
        subCategory1,
        subCategory2,
        subCategory3,
        subCategory4,
        legacyCategory
      )

      if (!name) {
        skippedReasons['missing name'] = (skippedReasons['missing name'] || 0) + 1
        continue
      }

      if (!startDate || !endDate) {
        skippedReasons['invalid start/end date'] = (skippedReasons['invalid start/end date'] || 0) + 1
        continue
      }

      if (endDate.getTime() < startDate.getTime()) {
        skippedReasons['end before start'] = (skippedReasons['end before start'] || 0) + 1
        continue
      }

      const normalizedForKey = {
        name,
        description,
        startDate,
        endDate,
        category,
        business,
        parentCategory,
        subCategory1,
        subCategory2,
        subCategory3,
        subCategory4,
        bookingRequestId,
        status,
        businessId,
      }

      const key = buildEventKey(normalizedForKey)
      if (seenCsvKeys.has(key)) {
        duplicateRowsInCsv += 1
        continue
      }

      seenCsvKeys.add(key)
      prepared.push({
        id: normalizeText(row.id || ''),
        name,
        description,
        startDate,
        endDate,
        userId,
        createdAt,
        updatedAt,
        category,
        business,
        parentCategory,
        subCategory1,
        subCategory2,
        subCategory3,
        bookingRequestId,
        status,
        subCategory4,
        businessId,
        key,
      })
    }

    // If business IDs were provided, keep only those that exist.
    const uniqueBusinessIds = [...new Set(prepared.map((event) => event.businessId).filter(Boolean))] as string[]
    let invalidBusinessIds = 0
    if (uniqueBusinessIds.length > 0) {
      const businesses = await prisma.business.findMany({
        where: {
          id: { in: uniqueBusinessIds },
        },
        select: { id: true },
      })
      const validBusinessIds = new Set(businesses.map((business) => business.id))
      for (const event of prepared) {
        if (event.businessId && !validBusinessIds.has(event.businessId)) {
          event.businessId = null
          invalidBusinessIds += 1
        }
      }
    }

    // Protect against importing duplicates already in DB.
    const names = [...new Set(prepared.map((event) => event.name))]
    const minStart = prepared.length > 0
      ? new Date(Math.min(...prepared.map((event) => event.startDate.getTime())))
      : null
    const maxStart = prepared.length > 0
      ? new Date(Math.max(...prepared.map((event) => event.startDate.getTime())))
      : null

    const existingKeys = new Set<string>()
    if (names.length > 0 && minStart && maxStart) {
      const existingCandidates = await prisma.event.findMany({
        where: {
          name: { in: names },
          startDate: {
            gte: minStart,
            lte: maxStart,
          },
        },
        select: {
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          category: true,
          business: true,
          parentCategory: true,
          subCategory1: true,
          subCategory2: true,
          subCategory3: true,
          subCategory4: true,
          bookingRequestId: true,
          status: true,
          businessId: true,
        },
      })

      for (const existing of existingCandidates) {
        const key = buildEventKey({
          name: existing.name,
          description: existing.description,
          startDate: existing.startDate,
          endDate: existing.endDate,
          category: existing.category,
          business: existing.business,
          parentCategory: existing.parentCategory,
          subCategory1: existing.subCategory1,
          subCategory2: existing.subCategory2,
          subCategory3: existing.subCategory3,
          subCategory4: existing.subCategory4,
          bookingRequestId: existing.bookingRequestId,
          status: existing.status,
          businessId: existing.businessId,
        })
        existingKeys.add(key)
      }
    }

    const toCreate = prepared.filter((event) => !existingKeys.has(event.key))
    const alreadyExisting = prepared.length - toCreate.length

    console.log('--- Dry Summary ---')
    console.log(`Parsed rows: ${rows.length}`)
    console.log(`Prepared rows: ${prepared.length}`)
    console.log(`Duplicate rows in CSV (exact): ${duplicateRowsInCsv}`)
    console.log(`Rows already in DB: ${alreadyExisting}`)
    console.log(`Rows with invalid businessId (cleared): ${invalidBusinessIds}`)
    console.log(`Rows to create: ${toCreate.length}`)
    if (Object.keys(skippedReasons).length > 0) {
      console.log('Skipped while parsing:')
      for (const [reason, count] of Object.entries(skippedReasons)) {
        console.log(`  - ${reason}: ${count}`)
      }
    }

    if (dryRun) {
      console.log('Dry run complete. No rows inserted.')
      return
    }

    let created = 0
    let errors = 0
    for (const event of toCreate) {
      try {
        await prisma.event.create({
          data: {
            ...(event.id ? { id: event.id } : {}),
            name: event.name,
            description: event.description,
            startDate: event.startDate,
            endDate: event.endDate,
            userId: event.userId,
            ...(event.createdAt ? { createdAt: event.createdAt } : {}),
            ...(event.updatedAt ? { updatedAt: event.updatedAt } : {}),
            category: event.category,
            business: event.business,
            businessId: event.businessId,
            parentCategory: event.parentCategory,
            subCategory1: event.subCategory1,
            subCategory2: event.subCategory2,
            subCategory3: event.subCategory3,
            subCategory4: event.subCategory4,
            bookingRequestId: event.bookingRequestId,
            status: event.status,
          },
        })
        created += 1
      } catch (error) {
        errors += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Create failed for "${event.name}" (${event.startDate.toISOString()}): ${message}`)
      }
    }

    console.log('--- Import Summary ---')
    console.log(`Created: ${created}`)
    console.log(`Already existing: ${alreadyExisting}`)
    console.log(`Skipped parse-invalid: ${Object.values(skippedReasons).reduce((a, b) => a + b, 0)}`)
    console.log(`Errors: ${errors}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

runImport().catch((error) => {
  console.error(error)
  process.exit(1)
})
