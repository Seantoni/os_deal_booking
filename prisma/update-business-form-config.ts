import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Load environment variables
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/**
 * Update business form configuration:
 * - Remove old province, district, corregimiento fields
 * - Add new provinceDistrictCorregimiento field
 */
async function updateBusinessFormConfig() {
  console.log('🔧 Updating business form configuration...')

  // Delete old field configs for province, district, corregimiento
  const deleted = await prisma.formFieldConfig.deleteMany({
    where: {
      entityType: 'business',
      fieldKey: { in: ['province', 'district', 'corregimiento'] }
    }
  })
  console.log(`✅ Deleted ${deleted.count} old field configs (province, district, corregimiento)`)

  // Check if provinceDistrictCorregimiento already exists
  const existing = await prisma.formFieldConfig.findFirst({
    where: {
      entityType: 'business',
      fieldKey: 'provinceDistrictCorregimiento'
    }
  })

  if (existing) {
    console.log('ℹ️  provinceDistrictCorregimiento field already exists')
    return
  }

  // Find the Ubicación section
  const ubicacionSection = await prisma.formSection.findFirst({
    where: { entityType: 'business', name: 'Ubicación' }
  })

  if (!ubicacionSection) {
    console.log('⚠️  Ubicación section not found. You may need to initialize the form config first.')
    return
  }

  // Get max order in the section
  const maxOrder = await prisma.formFieldConfig.aggregate({
    where: { sectionId: ubicacionSection.id },
    _max: { displayOrder: true }
  })

  // Add the new field
  await prisma.formFieldConfig.create({
    data: {
      entityType: 'business',
      sectionId: ubicacionSection.id,
      fieldKey: 'provinceDistrictCorregimiento',
      fieldSource: 'builtin',
      displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      isVisible: true,
      isRequired: false,
      isReadonly: false,
      canEditAfterCreation: false,
      width: 'full'
    }
  })
  
  console.log('✅ Added provinceDistrictCorregimiento field to Ubicación section')
  console.log('\n✨ Business form configuration updated successfully!')
}

updateBusinessFormConfig()
  .catch((e) => {
    console.error('❌ Error updating business form config:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
