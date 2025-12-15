import { PrismaClient } from '@prisma/client'
import { DEFAULT_SETTINGS } from '../lib/settings'
import type { BookingSettings } from '../types/settings'

const prisma = new PrismaClient()

/**
 * Migration script to move settings from localStorage to database
 * This should be run once to migrate existing settings
 */
async function migrateSettingsToDB() {
  console.log('🔄 Starting settings migration to database...')

  try {
    // Check if settings already exist
    const existing = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (existing) {
      console.log('✅ Settings already exist in database. Skipping migration.')
      return
    }

    // Create default settings in database
    await prisma.settings.create({
      data: {
        id: 'default',
        minDailyLaunches: DEFAULT_SETTINGS.minDailyLaunches,
        maxDailyLaunches: DEFAULT_SETTINGS.maxDailyLaunches,
        merchantRepeatDays: DEFAULT_SETTINGS.merchantRepeatDays,
        categoryDurations: DEFAULT_SETTINGS.categoryDurations,
        businessExceptions: DEFAULT_SETTINGS.businessExceptions,
        customCategories: DEFAULT_SETTINGS.customCategories,
        updatedBy: 'migration',
      },
    })

    console.log('✅ Default settings created in database')
    console.log('📝 Note: Users with localStorage settings will need to save them again to sync to DB')
  } catch (error) {
    console.error('❌ Error migrating settings:', error)
    throw error
  }
}

migrateSettingsToDB()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

