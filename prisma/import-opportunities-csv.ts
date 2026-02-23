import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const CSV_FILE_PATH = '/Users/josep/Downloads/Opp Migration Feb 23 - Sheet1 (6).csv'

// Fallback userId for Won/Lost rows that have no user assigned.
// Set to empty string to skip those rows instead.
const DEFAULT_USER_ID = 'user_38J3Yv989jVwEUtbVk9VWJUVSxs'

// Column indices for the "create" CSV format (name at index 2)
const COL_CREATE = {
  BUSINESS_ID: 1,
  NAME: 2,
  STAGE: 3,
  USER_ID: 7,
  RESPONSIBLE_ID: 12,
} as const

// Column indices for the "update" CSV format (id present, name at last col)
const COL_UPDATE = {
  ID: 0,
  BUSINESS_ID: 1,
  STAGE: 2,
  USER_ID: 6,
  RESPONSIBLE_ID: 11,
  NAME: 16,
} as const

// Map CSV display labels → DB stage values
const STAGE_MAP: Record<string, string> = {
  'Iniciación': 'iniciacion',
  'Reunión': 'reunion',
  'Propuesta Enviada': 'propuesta_enviada',
  'Propuesta Aprobada': 'propuesta_aprobada',
  'Won': 'won',
  'Lost': 'lost',
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
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

function parseCSVRows(content: string): string[][] {
  const lines: string[] = []
  let currentLine = ''
  let insideQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '"') insideQuotes = !insideQuotes
    if (char === '\n' && !insideQuotes) {
      lines.push(currentLine)
      currentLine = ''
    } else {
      currentLine += char
    }
  }
  if (currentLine.trim()) lines.push(currentLine)

  // Skip header row, parse data
  return lines.slice(1).filter(l => l.trim()).map(parseCSVLine)
}

interface ParsedRow {
  businessId: string
  name: string
  stage: string
  userId: string
  responsibleId: string
}

async function importOpportunities() {
  console.log('📂 Reading CSV:', CSV_FILE_PATH)
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`File not found: ${CSV_FILE_PATH}`)
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  const rawRows = parseCSVRows(content)
  console.log(`📊 Parsed ${rawRows.length} rows from CSV`)

  // --- Parse all rows, appending a suffix (-2, -3, …) when the same
  //     businessId+name appears more than once ---
  const nameCounts = new Map<string, number>()
  const allRows: ParsedRow[] = []

  for (const row of rawRows) {
    const businessId = row[COL_CREATE.BUSINESS_ID]?.trim()
    const baseName = row[COL_CREATE.NAME]?.trim()
    const stageRaw = row[COL_CREATE.STAGE]?.trim()
    let userId = row[COL_CREATE.USER_ID]?.trim()
    const responsibleId = row[COL_CREATE.RESPONSIBLE_ID]?.trim()

    if (!businessId || !baseName) continue

    // Make name unique per business: first occurrence keeps the original,
    // subsequent ones get -2, -3, etc.
    const key = `${businessId}|${baseName}`
    const count = (nameCounts.get(key) ?? 0) + 1
    nameCounts.set(key, count)
    const name = count === 1 ? baseName : `${baseName}-${count}`

    // Map stage label to DB value
    let stage = STAGE_MAP[stageRaw] ?? ''
    if (!stage) {
      stage = 'iniciacion'
    }

    // Fallback for missing userId
    if (!userId) {
      if (DEFAULT_USER_ID) {
        userId = DEFAULT_USER_ID
      } else {
        continue
      }
    }

    allRows.push({ businessId, name, stage, userId, responsibleId: responsibleId || userId })
  }

  const renamed = [...nameCounts.values()].reduce((sum, c) => sum + Math.max(0, c - 1), 0)
  console.log(`🔍 ${allRows.length} rows to import (${renamed} renamed with suffix to avoid duplicates)\n`)

  // --- Summary ---
  const stageCounts: Record<string, number> = {}
  for (const r of allRows) {
    stageCounts[r.stage] = (stageCounts[r.stage] || 0) + 1
  }
  console.log('Stage breakdown:')
  for (const [s, c] of Object.entries(stageCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`)
  }
  console.log()

  // --- Import ---
  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  const skipReasons: Record<string, number> = {}

  for (let i = 0; i < allRows.length; i++) {
    const { businessId, name, stage, userId, responsibleId } = allRows[i]

    try {
      // Verify business exists
      const biz = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      })
      if (!biz) {
        skipped++
        skipReasons['business not found'] = (skipReasons['business not found'] || 0) + 1
        console.warn(`⚠️  Business not found: ${businessId} — "${name}"`)
        continue
      }

      const existing = await prisma.opportunity.findFirst({
        where: { businessId, name },
      })
      if (existing) {
        // Update stage, userId, responsibleId if they changed
        const needsUpdate =
          existing.stage !== stage ||
          existing.userId !== userId ||
          existing.responsibleId !== responsibleId
        if (needsUpdate) {
          await prisma.opportunity.update({
            where: { id: existing.id },
            data: { stage, userId, responsibleId },
          })
          updated++
          if (updated % 50 === 0) {
            console.log(`  🔄 ${updated} updated...`)
          }
        } else {
          skipped++
          skipReasons['no changes'] = (skipReasons['no changes'] || 0) + 1
        }
        continue
      }

      await prisma.opportunity.create({
        data: {
          businessId,
          name,
          stage,
          userId,
          responsibleId,
          hasRequest: false,
          startDate: new Date(),
        },
      })
      created++

      if (created % 50 === 0) {
        console.log(`  ✅ ${created} created...`)
      }
    } catch (error) {
      errors++
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Error: "${name}" — ${msg}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📈 Import Summary:')
  console.log(`   ✅ Created:  ${created}`)
  console.log(`   🔄 Updated:  ${updated}`)
  console.log(`   ⏭️  Skipped:  ${skipped}`)
  for (const [reason, count] of Object.entries(skipReasons)) {
    console.log(`      - ${reason}: ${count}`)
  }
  console.log(`   🔄 Renamed:  ${renamed}`)
  console.log(`   ❌ Errors:   ${errors}`)
  console.log(`   📊 CSV rows: ${rawRows.length}`)
  console.log('='.repeat(60))
}

async function updateOpportunities() {
  console.log('🔄 UPDATE MODE — updating existing opportunities by ID')
  console.log('📂 Reading CSV:', CSV_FILE_PATH)
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`File not found: ${CSV_FILE_PATH}`)
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  const rawRows = parseCSVRows(content)
  console.log(`📊 Parsed ${rawRows.length} rows from CSV\n`)

  let updated = 0
  let skipped = 0
  let notFound = 0
  let errors = 0

  for (const row of rawRows) {
    const id = row[COL_UPDATE.ID]?.trim()
    const name = row[COL_UPDATE.NAME]?.trim()
    const stageRaw = row[COL_UPDATE.STAGE]?.trim()
    let userId = row[COL_UPDATE.USER_ID]?.trim()
    const responsibleId = row[COL_UPDATE.RESPONSIBLE_ID]?.trim()

    if (!id || !name) continue

    const stage = STAGE_MAP[stageRaw] ?? stageRaw ?? 'iniciacion'

    if (!userId) {
      userId = DEFAULT_USER_ID || ''
      if (!userId) continue
    }

    try {
      const existing = await prisma.opportunity.findUnique({
        where: { id },
      })
      if (!existing) {
        notFound++
        console.warn(`⚠️  Not found: ${id} — "${name}"`)
        continue
      }

      const needsUpdate =
        existing.name !== name ||
        existing.stage !== stage ||
        existing.userId !== userId ||
        existing.responsibleId !== (responsibleId || userId)

      if (needsUpdate) {
        await prisma.opportunity.update({
          where: { id },
          data: {
            name,
            stage,
            userId,
            responsibleId: responsibleId || userId,
          },
        })
        updated++
        if (updated % 50 === 0) console.log(`  🔄 ${updated} updated...`)
      } else {
        skipped++
      }
    } catch (error) {
      errors++
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Error updating "${name}": ${msg}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🔄 Update Summary:')
  console.log(`   🔄 Updated:    ${updated}`)
  console.log(`   ⏭️  No changes: ${skipped}`)
  console.log(`   ⚠️  Not found:  ${notFound}`)
  console.log(`   ❌ Errors:     ${errors}`)
  console.log(`   📊 CSV rows:   ${rawRows.length}`)
  console.log('='.repeat(60))
}

async function revertImport() {
  console.log('🗑️  REVERT MODE — deleting opportunities from CSV')
  console.log('📂 Reading CSV:', CSV_FILE_PATH)
  if (!fs.existsSync(CSV_FILE_PATH)) {
    throw new Error(`File not found: ${CSV_FILE_PATH}`)
  }

  const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8')
  const rawRows = parseCSVRows(content)
  console.log(`📊 Parsed ${rawRows.length} rows from CSV`)

  const nameCounts = new Map<string, number>()
  const allRows: { businessId: string; name: string }[] = []

  for (const row of rawRows) {
    const businessId = row[COL_CREATE.BUSINESS_ID]?.trim()
    const baseName = row[COL_CREATE.NAME]?.trim()
    if (!businessId || !baseName) continue

    const key = `${businessId}|${baseName}`
    const count = (nameCounts.get(key) ?? 0) + 1
    nameCounts.set(key, count)
    const name = count === 1 ? baseName : `${baseName}-${count}`
    allRows.push({ businessId, name })
  }

  console.log(`🔍 ${allRows.length} rows to delete\n`)

  let deleted = 0
  let notFound = 0
  let errors = 0

  for (const { businessId, name } of allRows) {
    try {
      const existing = await prisma.opportunity.findFirst({
        where: { businessId, name },
        select: { id: true },
      })
      if (!existing) {
        notFound++
        continue
      }
      await prisma.opportunity.delete({ where: { id: existing.id } })
      deleted++
      if (deleted % 50 === 0) console.log(`  🗑️  ${deleted} deleted...`)
    } catch (error) {
      errors++
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Error deleting "${name}": ${msg}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🗑️  Revert Summary:')
  console.log(`   🗑️  Deleted:    ${deleted}`)
  console.log(`   ⚠️  Not found:  ${notFound}`)
  console.log(`   ❌ Errors:     ${errors}`)
  console.log('='.repeat(60))
}

const MODE = process.argv[2]

const run = MODE === '--revert'
  ? revertImport()
  : MODE === '--update'
    ? updateOpportunities()
    : importOpportunities()

;run
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
