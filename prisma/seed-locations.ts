import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
import 'dotenv/config'

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Seed the database with locations from CSV file
 * CSV format: "PROVINCIA,DISTRITO,CORREGIMIENTO"
 * Skips header row and inserts all entries
 */
async function seedLocations() {
  console.log('🌱 Starting location seeding...')

  // Read CSV file
  const csvPath = path.join(__dirname, '../data/provDistCorr.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`)
    console.log('Please place the provDistCorr.csv file in the data/ folder')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())

  // Skip header row (line 0)
  const dataLines = lines.slice(1)

  console.log(`📄 Found ${dataLines.length} location entries to seed`)

  let insertedCount = 0
  let skippedCount = 0

  for (const line of dataLines) {
    // Remove surrounding quotes and trim
    const value = line.replace(/^"|"$/g, '').trim()
    
    if (!value) {
      skippedCount++
      continue
    }

    try {
      await prisma.provDistCorr.upsert({
        where: { value },
        update: {}, // No updates needed, value is unique
        create: { value },
      })
      insertedCount++
      
      if (insertedCount % 100 === 0) {
        console.log(`✅ Inserted ${insertedCount} locations...`)
      }
    } catch (error) {
      console.error(`❌ Error inserting: ${value}`, error)
      skippedCount++
    }
  }

  console.log(`\n✨ Seeding complete!`)
  console.log(`   Inserted/Updated: ${insertedCount} locations`)
  console.log(`   Skipped: ${skippedCount} entries`)
}

seedLocations()
  .catch((e) => {
    console.error('❌ Error seeding locations:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
