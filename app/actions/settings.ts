import { prisma } from '@/lib/prisma'
import { requireAdmin, handleServerActionError, ServerActionResponse } from '@/lib/utils/server-actions'
import type { BookingSettings, RequestFormFieldsConfig } from '@/types'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import { logger } from '@/lib/logger'
import { getDefaultRequestFormFieldsConfig } from '@/lib/config/request-form-fields'
import type { Prisma, Setting } from '@prisma/client'

// Extended Setting type that includes all JSON fields
type SettingsWithJsonFields = Setting & {
  additionalInfoMappings?: Record<string, string> | null
  hiddenCategoryPaths?: Record<string, boolean> | null
  requestFormFields?: RequestFormFieldsConfig | null
  externalApiSectionMappings?: Record<string, string> | null
}

/**
 * Get settings from database (or return defaults if not found)
 */
export async function getSettingsFromDB(): Promise<ServerActionResponse<BookingSettings>> {
  try {
    const settings = await prisma.setting.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      // Return defaults if no settings exist
      return { success: true, data: DEFAULT_SETTINGS }
    }

    // Cast to extended type for better type safety
    const settingsData = settings as SettingsWithJsonFields

    // Parse JSON fields
    // Merge requestFormFields with defaults to ensure all fields have a value
    const dbRequestFormFields = settingsData.requestFormFields
    const defaultRequestFormFields = getDefaultRequestFormFieldsConfig()
    const mergedRequestFormFields: RequestFormFieldsConfig = {
      ...defaultRequestFormFields,
      ...(dbRequestFormFields && typeof dbRequestFormFields === 'object' && !Array.isArray(dbRequestFormFields)
        ? (dbRequestFormFields as RequestFormFieldsConfig)
        : {}),
    }

    const bookingSettings: BookingSettings = {
      minDailyLaunches: settingsData.minDailyLaunches,
      maxDailyLaunches: settingsData.maxDailyLaunches,
      merchantRepeatDays: settingsData.merchantRepeatDays,
      categoryDurations: settingsData.categoryDurations as BookingSettings['categoryDurations'],
      businessExceptions: settingsData.businessExceptions as BookingSettings['businessExceptions'],
      customCategories: settingsData.customCategories as BookingSettings['customCategories'],
      additionalInfoMappings: settingsData.additionalInfoMappings || {},
      hiddenCategoryPaths: settingsData.hiddenCategoryPaths || {},
      requestFormFields: mergedRequestFormFields,
      externalApiSectionMappings: settingsData.externalApiSectionMappings || {},
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
  // Require admin role - global settings should not be editable by regular users
  const authResult = await requireAdmin()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Verify prisma.setting exists
    if (!prisma.setting) {
      logger.error('prisma.setting is undefined. Prisma client may need regeneration.')
      return { success: false, error: 'Database client not initialized. Please restart the server.' }
    }

    // Build the data object with proper typing for Prisma JSON fields
    const settingsUpdateData = {
      minDailyLaunches: settings.minDailyLaunches,
      maxDailyLaunches: settings.maxDailyLaunches,
      merchantRepeatDays: settings.merchantRepeatDays,
      categoryDurations: settings.categoryDurations as Prisma.InputJsonValue,
      businessExceptions: settings.businessExceptions as Prisma.InputJsonValue,
      customCategories: settings.customCategories as Prisma.InputJsonValue,
      additionalInfoMappings: (settings.additionalInfoMappings || {}) as Prisma.InputJsonValue,
      hiddenCategoryPaths: (settings.hiddenCategoryPaths || {}) as Prisma.InputJsonValue,
      requestFormFields: (settings.requestFormFields || null) as Prisma.InputJsonValue,
      externalApiSectionMappings: (settings.externalApiSectionMappings || {}) as Prisma.InputJsonValue,
      updatedBy: userId || authResult.userId,
      updatedAt: new Date(),
    }

    await prisma.setting.upsert({
      where: { id: 'default' },
      update: settingsUpdateData,
      create: {
        id: 'default',
        ...settingsUpdateData,
      },
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
  // Require admin role - global settings should not be reset by regular users
  const authResult = await requireAdmin()
  if (!('userId' in authResult)) {
    return authResult
  }

  try {
    // Verify prisma.setting exists
    if (!prisma.setting) {
      logger.error('prisma.setting is undefined. Prisma client may need regeneration.')
      return { success: false, error: 'Database client not initialized. Please restart the server.' }
    }

    // Build the default settings data object with proper typing for Prisma JSON fields
    const defaultSettingsData = {
      minDailyLaunches: DEFAULT_SETTINGS.minDailyLaunches,
      maxDailyLaunches: DEFAULT_SETTINGS.maxDailyLaunches,
      merchantRepeatDays: DEFAULT_SETTINGS.merchantRepeatDays,
      categoryDurations: DEFAULT_SETTINGS.categoryDurations as Prisma.InputJsonValue,
      businessExceptions: DEFAULT_SETTINGS.businessExceptions as Prisma.InputJsonValue,
      customCategories: DEFAULT_SETTINGS.customCategories as Prisma.InputJsonValue,
      additionalInfoMappings: (DEFAULT_SETTINGS.additionalInfoMappings || {}) as Prisma.InputJsonValue,
      hiddenCategoryPaths: (DEFAULT_SETTINGS.hiddenCategoryPaths || {}) as Prisma.InputJsonValue,
      requestFormFields: (DEFAULT_SETTINGS.requestFormFields || null) as Prisma.InputJsonValue,
      externalApiSectionMappings: (DEFAULT_SETTINGS.externalApiSectionMappings || {}) as Prisma.InputJsonValue,
      updatedBy: authResult.userId,
      updatedAt: new Date(),
    }

    await prisma.setting.upsert({
      where: { id: 'default' },
      update: defaultSettingsData,
      create: {
        id: 'default',
        ...defaultSettingsData,
      },
    })

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'resetSettingsToDefaults')
  }
}

