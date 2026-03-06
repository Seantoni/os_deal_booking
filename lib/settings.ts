import { type CategoryHierarchy, INITIAL_CATEGORY_HIERARCHY } from './initial-categories'
import type { CategoryDurations, BusinessException, BookingSettings, CategoryNode } from '@/types'
import { getDefaultRequestFormFieldsConfig } from './config/request-form-fields'

// Re-export centralized types
export type { CategoryDurations, BusinessException, BookingSettings }

// Categories with 7-day max duration (defined here or in constants to avoid cycle)
const SEVEN_DAY_CATEGORIES = [
  "HOTELES",
  "RESTAURANTES",
  "SHOWS Y EVENTOS"
] as const;

// Helper to check if a node is a leaf array
function isLeafArray(node: CategoryNode): node is string[] {
  return Array.isArray(node)
}

function collectLeafCategoriesFromNode(node: CategoryNode, results: string[]): void {
  if (isLeafArray(node)) {
    results.push(...node)
    return
  }

  for (const [key, childNode] of Object.entries(node)) {
    if (isLeafArray(childNode) && childNode.length === 0) {
      results.push(key)
      continue
    }

    collectLeafCategoriesFromNode(childNode, results)
  }
}

function isValidDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getFallbackDurationForMainCategory(mainCategory: string): number {
  return (SEVEN_DAY_CATEGORIES as readonly string[]).includes(mainCategory) ? 7 : 5
}

// Initialize default durations for main categories.
export const getDefaultCategoryDurations = (
  hierarchy: CategoryHierarchy = INITIAL_CATEGORY_HIERARCHY
): CategoryDurations => {
  const durations: CategoryDurations = {}

  for (const mainCategory of Object.keys(hierarchy)) {
    durations[mainCategory] = getFallbackDurationForMainCategory(mainCategory)
  }

  return durations
}

// Normalize legacy leaf-based settings into the current parent-category model.
export function normalizeCategoryDurations(
  categoryDurations: unknown,
  hierarchy: CategoryHierarchy = INITIAL_CATEGORY_HIERARCHY
): CategoryDurations {
  const normalized = getDefaultCategoryDurations(hierarchy)

  if (!categoryDurations || typeof categoryDurations !== 'object' || Array.isArray(categoryDurations)) {
    return normalized
  }

  const rawDurations = categoryDurations as Record<string, unknown>

  for (const [mainCategory, node] of Object.entries(hierarchy)) {
    const directValue = rawDurations[mainCategory]
    if (isValidDuration(directValue)) {
      normalized[mainCategory] = Math.floor(directValue)
      continue
    }

    const descendantLeaves: string[] = []
    collectLeafCategoriesFromNode(node, descendantLeaves)

    const legacyValues = descendantLeaves
      .map((leaf) => rawDurations[leaf])
      .filter(isValidDuration)
      .map((value) => Math.floor(value))

    if (legacyValues.length > 0) {
      normalized[mainCategory] = Math.max(...legacyValues)
    }
  }

  return normalized
}

// Default external API section mappings
const DEFAULT_SECTION_MAPPINGS: Record<string, string> = {
  // Direct matches
  'HOTELES': 'Hoteles',
  'RESTAURANTES': 'Restaurantes',
  'SHOWS Y EVENTOS': 'Shows y Eventos',
  'SERVICIOS': 'Servicios',
  'BIENESTAR Y BELLEZA': 'Bienestar y Belleza',
  'ACTIVIDADES': 'Actividades',
  'CURSOS': 'Cursos',
  'PRODUCTOS': 'Productos',
  // Mapped categories
  'SPA & DAY SPA': 'Bienestar y Belleza',
  'GIMNASIOS & FITNESS': 'Servicios',
  'MÉDICO ESTÉTICO': 'Bienestar y Belleza',
  'DENTAL & ESTÉTICA DENTAL': 'Bienestar y Belleza',
  'LABORATORIOS Y SALUD CLÍNICA': 'Servicios',
  'TURISMO & TOURS': 'Actividades',
  // MASCOTAS subcategory mappings
  'MASCOTAS:Veterinaria': 'Servicios',
  'MASCOTAS:Grooming': 'Servicios',
  'MASCOTAS:Productos': 'Productos',
}

export const DEFAULT_SETTINGS: BookingSettings = {
  minDailyLaunches: 5,
  maxDailyLaunches: 13,
  categoryDurations: getDefaultCategoryDurations(),
  merchantRepeatDays: 30,
  vendorReactivationCooldownDays: 30,
  businessExceptions: [],
  customCategories: INITIAL_CATEGORY_HIERARCHY,
  hiddenCategoryPaths: {},
  additionalInfoMappings: {},
  requestFormFields: getDefaultRequestFormFieldsConfig(),
  externalApiSectionMappings: DEFAULT_SECTION_MAPPINGS,
}

// Local storage keys (deprecated - now using database)
const SETTINGS_KEY = 'os_booking_settings'

/**
 * Get settings - tries database first, falls back to localStorage for migration, then defaults
 * @deprecated Use getSettingsFromDB() server action instead for new code
 */
export function getSettings(): BookingSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  
  // Try localStorage first (for migration period)
  const stored = localStorage.getItem(SETTINGS_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      const customCategories = parsed.customCategories || DEFAULT_SETTINGS.customCategories
      // Merge with defaults to ensure all fields are present
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        categoryDurations: normalizeCategoryDurations(parsed.categoryDurations, customCategories),
        vendorReactivationCooldownDays:
          typeof parsed.vendorReactivationCooldownDays === 'number'
            ? parsed.vendorReactivationCooldownDays
            : DEFAULT_SETTINGS.vendorReactivationCooldownDays,
        businessExceptions: parsed.businessExceptions || [],
        customCategories,
        additionalInfoMappings: parsed.additionalInfoMappings || {},
        hiddenCategoryPaths: parsed.hiddenCategoryPaths || {},
        requestFormFields: {
          ...DEFAULT_SETTINGS.requestFormFields,
          ...parsed.requestFormFields,
        },
      }
    } catch {
      // If parsing fails, continue to defaults
    }
  }
  
  return DEFAULT_SETTINGS
}

// Helper to get business exception value
export function getBusinessException(
  businessName: string,
  exceptionType: BusinessException['exceptionType'],
  exceptions: BusinessException[]
): number | null {
  const exception = exceptions.find(
    ex => ex.businessName.toLowerCase() === businessName.toLowerCase() &&
          ex.exceptionType === exceptionType
  )
  return exception ? exception.exceptionValue : null
}

/**
 * Save settings - saves to both localStorage (for backward compatibility) and database
 * @deprecated Use saveSettingsToDB() server action instead for new code
 */
export function saveSettings(settings: BookingSettings): void {
  if (typeof window === 'undefined') return
  
  // Keep localStorage for backward compatibility during migration
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  
  // Dispatch custom event to notify components in the same tab
  // (storage event only fires in other tabs)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('settingsUpdated'))
  }
}

/**
 * Reset settings - clears localStorage
 * @deprecated Use resetSettingsToDefaults() server action instead for new code
 */
export function resetSettings(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SETTINGS_KEY)
  
  // Dispatch custom event to notify components in the same tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('settingsUpdated'))
  }
}
