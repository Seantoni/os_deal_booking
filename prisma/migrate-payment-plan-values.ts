import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Create Prisma client with pg adapter
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Payment plan value mappings: old format → new format
 */
const PAYMENT_PLAN_MAPPINGS: Record<string, string> = {
  // Spanish → English format
  'QR Diario': 'QR - Daily',
  'QR Semanal': 'QR - Weekly',
  'QR Mensual': 'QR - Monthly',
  'LISTA Semanal': 'List - Weekly',
  'LISTA Mensual': 'List - Monthly',
  // Handle variations with trailing spaces
  'QR Diario ': 'QR - Daily',
  'QR Semanal ': 'QR - Weekly',
  'QR Mensual ': 'QR - Monthly',
  'LISTA Semanal ': 'List - Weekly',
  'LISTA Mensual ': 'List - Monthly',
  // Handle lowercase variations
  'qr diario': 'QR - Daily',
  'qr semanal': 'QR - Weekly',
  'qr mensual': 'QR - Monthly',
  'lista semanal': 'List - Weekly',
  'lista mensual': 'List - Monthly',
}

/**
 * Migrate payment plan values from old format to new format
 */
async function migratePaymentPlanValues() {
  console.log('🔄 Starting payment plan migration...\n')

  // Get all businesses with non-null paymentPlan
  const businesses = await prisma.business.findMany({
    where: {
      paymentPlan: { not: null },
    },
    select: {
      id: true,
      name: true,
      paymentPlan: true,
    },
  })

  console.log(`📊 Found ${businesses.length} businesses with paymentPlan values\n`)

  let updated = 0
  let skipped = 0
  let alreadyCorrect = 0

  for (const business of businesses) {
    const oldValue = business.paymentPlan?.trim() || ''
    
    // Check if this value needs migration
    const newValue = PAYMENT_PLAN_MAPPINGS[oldValue] || PAYMENT_PLAN_MAPPINGS[oldValue.toLowerCase()]
    
    if (newValue) {
      // Update to new format
      await prisma.business.update({
        where: { id: business.id },
        data: { paymentPlan: newValue },
      })
      updated++
      console.log(`✏️  Updated: "${business.name}" - "${oldValue}" → "${newValue}"`)
    } else if (isAlreadyNewFormat(oldValue)) {
      // Already in new format
      alreadyCorrect++
    } else {
      // Unknown format, skip
      skipped++
      if (oldValue && !['50% en 7 días y 50% en 30 días', 'EVENTO', 'OTRO'].includes(oldValue)) {
        console.log(`⏭️  Skipped: "${business.name}" - "${oldValue}" (unknown format)`)
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📈 Migration Summary:')
  console.log(`   ✏️  Updated:         ${updated}`)
  console.log(`   ✅ Already correct:  ${alreadyCorrect}`)
  console.log(`   ⏭️  Skipped:         ${skipped}`)
  console.log(`   📊 Total processed:  ${businesses.length}`)
  console.log('='.repeat(50))
}

/**
 * Check if value is already in the new format
 */
function isAlreadyNewFormat(value: string): boolean {
  const newFormatValues = [
    'QR - Daily',
    'QR - Weekly',
    'QR - Monthly',
    'List - Weekly',
    'List - Monthly',
  ]
  return newFormatValues.includes(value)
}

// Run the migration
migratePaymentPlanValues()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
