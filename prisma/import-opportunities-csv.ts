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

const CSV_FILE_PATH = './Opp Migration Feb 23 - Sheet1 (5).csv'

// Fallback userId for Won/Lost rows that have no user assigned.
// Set to empty string to skip those rows instead.
const DEFAULT_USER_ID = 'user_38J3Yv989jVwEUtbVk9VWJUVSxs'

// Column indices (header has duplicate "name" at 2 and 17 — we use index 2)
const COL = {
  BUSINESS_ID: 1,
  NAME: 2,
  STAGE: 3,
  USER_ID: 7,
  RESPONSIBLE_ID: 12,
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
    const businessId = row[COL.BUSINESS_ID]?.trim()
    const baseName = row[COL.NAME]?.trim()
    const stageRaw = row[COL.STAGE]?.trim()
    let userId = row[COL.USER_ID]?.trim()
    const responsibleId = row[COL.RESPONSIBLE_ID]?.trim()

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

importOpportunities()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
