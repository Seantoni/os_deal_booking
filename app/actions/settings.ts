import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError, ServerActionResponse } from '@/lib/utils/server-actions'
import type { BookingSettings, RequestFormFieldsConfig } from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import { logger } from '@/lib/logger'
import { getDefaultRequestFormFieldsConfig } from '@/lib/config/request-form-fields'

/**
 * Get settings from database (or return defaults if not found)
 */
export async function getSettingsFromDB(): Promise<ServerActionResponse<BookingSettings>> {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      // Return defaults if no settings exist
      return { success: true, data: DEFAULT_SETTINGS }
    }

    // Parse JSON fields
    // Merge requestFormFields with defaults to ensure all fields have a value
    const dbRequestFormFields = (settings as any).requestFormFields as RequestFormFieldsConfig | null
    const defaultRequestFormFields = getDefaultRequestFormFieldsConfig()
    const mergedRequestFormFields: RequestFormFieldsConfig = {
      ...defaultRequestFormFields,
      ...dbRequestFormFields,
    }

    const bookingSettings: BookingSettings = {
      minDailyLaunches: settings.minDailyLaunches,
      maxDailyLaunches: settings.maxDailyLaunches,
      merchantRepeatDays: settings.merchantRepeatDays,
      categoryDurations: settings.categoryDurations as BookingSettings['categoryDurations'],
      businessExceptions: settings.businessExceptions as BookingSettings['businessExceptions'],
      customCategories: settings.customCategories as BookingSettings['customCategories'],
      additionalInfoMappings: (settings as any).additionalInfoMappings || {},
      hiddenCategoryPaths: (settings as any).hiddenCategoryPaths || {},
      requestFormFields: mergedRequestFormFields,
    }

    return { success: true, data: bookingSettings }
  } catch (error) {
    return handleServerActionError(error, 'getSettingsFromDB')
  }
}

/**
 * Save settings to database
 */
export async function saveSettingsToDB(
  settings: BookingSettings,
  userId?: string
): Promise<ServerActionResponse<void>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Verify prisma.settings exists
    if (!prisma.settings) {
      logger.error('prisma.settings is undefined. Prisma client may need regeneration.')
      return { success: false, error: 'Database client not initialized. Please restart the server.' }
    }

    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        minDailyLaunches: settings.minDailyLaunches,
        maxDailyLaunches: settings.maxDailyLaunches,
        merchantRepeatDays: settings.merchantRepeatDays,
        categoryDurations: settings.categoryDurations,
        businessExceptions: settings.businessExceptions,
        customCategories: settings.customCategories,
        additionalInfoMappings: settings.additionalInfoMappings || {},
        hiddenCategoryPaths: settings.hiddenCategoryPaths || {},
        requestFormFields: settings.requestFormFields || null,
        updatedBy: userId || authResult.userId,
        updatedAt: new Date(),
      } as any,
      create: {
        id: 'default',
        minDailyLaunches: settings.minDailyLaunches,
        maxDailyLaunches: settings.maxDailyLaunches,
        merchantRepeatDays: settings.merchantRepeatDays,
        categoryDurations: settings.categoryDurations,
        businessExceptions: settings.businessExceptions,
        customCategories: settings.customCategories,
        additionalInfoMappings: settings.additionalInfoMappings || {},
        hiddenCategoryPaths: settings.hiddenCategoryPaths || {},
        requestFormFields: settings.requestFormFields || null,
        updatedBy: userId || authResult.userId,
      } as any,
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'saveSettingsToDB')
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettingsToDefaults(): Promise<ServerActionResponse<void>> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Verify prisma.settings exists
    if (!prisma.settings) {
      logger.error('prisma.settings is undefined. Prisma client may need regeneration.')
      return { success: false, error: 'Database client not initialized. Please restart the server.' }
    }

    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        minDailyLaunches: DEFAULT_SETTINGS.minDailyLaunches,
        maxDailyLaunches: DEFAULT_SETTINGS.maxDailyLaunches,
        merchantRepeatDays: DEFAULT_SETTINGS.merchantRepeatDays,
        categoryDurations: DEFAULT_SETTINGS.categoryDurations,
        businessExceptions: DEFAULT_SETTINGS.businessExceptions,
        customCategories: DEFAULT_SETTINGS.customCategories,
        additionalInfoMappings: DEFAULT_SETTINGS.additionalInfoMappings,
        hiddenCategoryPaths: DEFAULT_SETTINGS.hiddenCategoryPaths,
        requestFormFields: DEFAULT_SETTINGS.requestFormFields || null,
        updatedBy: authResult.userId,
        updatedAt: new Date(),
      } as any,
      create: {
        id: 'default',
        minDailyLaunches: DEFAULT_SETTINGS.minDailyLaunches,
        maxDailyLaunches: DEFAULT_SETTINGS.maxDailyLaunches,
        merchantRepeatDays: DEFAULT_SETTINGS.merchantRepeatDays,
        categoryDurations: DEFAULT_SETTINGS.categoryDurations,
        businessExceptions: DEFAULT_SETTINGS.businessExceptions,
        customCategories: DEFAULT_SETTINGS.customCategories,
        additionalInfoMappings: DEFAULT_SETTINGS.additionalInfoMappings,
        hiddenCategoryPaths: DEFAULT_SETTINGS.hiddenCategoryPaths,
        requestFormFields: DEFAULT_SETTINGS.requestFormFields || null,
        updatedBy: authResult.userId,
      } as any,
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'resetSettingsToDefaults')
  }
}

