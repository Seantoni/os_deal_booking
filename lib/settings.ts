import { type CategoryHierarchy, INITIAL_CATEGORY_HIERARCHY, getInitialFlatCategories } from './initial-categories'
import type { CategoryDurations, BusinessException, BookingSettings } from '@/types/settings'

// Re-export centralized types
export type { CategoryDurations, BusinessException, BookingSettings }

// Categories with 7-day max duration (defined here or in constants to avoid cycle)
const SEVEN_DAY_CATEGORIES = [
  "HOTELES",
  "RESTAURANTES",
  "SHOWS Y EVENTOS"
] as const;

// Initialize default durations for all categories
const getDefaultCategoryDurations = (): CategoryDurations => {
  const durations: CategoryDurations = {}
  const flatCategories = getInitialFlatCategories();
  
  flatCategories.forEach(category => {
    // Simple heuristic: if the category string contains one of the main categories, give it 7 days?
    // Or we just rely on defaults.
    // The original logic was: SEVEN_DAY_CATEGORIES.includes(category) ? 7 : 5
    // Since 'category' here is a leaf or sub, strict equality check against MAIN names usually fails unless they match.
    // But let's keep it simple.
    
    // We can check if any 7-day main category is part of the string or hierarchy logic.
    // For now, default to 5 unless matched.
    
    // Actually, we need to know the parent to decide 7 vs 5.
    // But getInitialFlatCategories returns just strings.
    // Let's approximate or just set 5 for everything initially, user can change in settings.
    
    // Or, we iterate the hierarchy to build it correctly.
    let isSevenDay = false;
    for (const main of SEVEN_DAY_CATEGORIES) {
       // If this flat category belongs to a 7-day main category...
       // This is hard to know from just the flat string if names are not unique or prefixed.
       // But let's try to iterate the INITIAL_CATEGORY_HIERARCHY.
       const subs = INITIAL_CATEGORY_HIERARCHY[main];
       if (subs) {
          // Check if 'category' is a sub or leaf of 'main'
          if (Object.keys(subs).includes(category)) {
             isSevenDay = true;
             break;
          }
          for (const sub in subs) {
             if (subs[sub].includes(category)) {
                isSevenDay = true;
                break;
             }
          }
       }
       if (isSevenDay) break;
    }
    
    durations[category] = isSevenDay ? 7 : 5
  })
  return durations
}

export const DEFAULT_SETTINGS: BookingSettings = {
  minDailyLaunches: 5,
  maxDailyLaunches: 13,
  categoryDurations: getDefaultCategoryDurations(),
  merchantRepeatDays: 30,
  businessExceptions: [],
  customCategories: INITIAL_CATEGORY_HIERARCHY,
}

// Local storage keys
const SETTINGS_KEY = 'os_booking_settings'

export function getSettings(): BookingSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  
  const stored = localStorage.getItem(SETTINGS_KEY)
  if (!stored) return DEFAULT_SETTINGS
  
  try {
    const parsed = JSON.parse(stored)
    // Merge with defaults to ensure all categories are present
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      categoryDurations: {
        ...DEFAULT_SETTINGS.categoryDurations,
        ...parsed.categoryDurations,
      },
      businessExceptions: parsed.businessExceptions || [],
      customCategories: parsed.customCategories || DEFAULT_SETTINGS.customCategories,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
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

export function saveSettings(settings: BookingSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  
  // Dispatch custom event to notify components in the same tab
  // (storage event only fires in other tabs)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('settingsUpdated'))
  }
}

export function resetSettings(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SETTINGS_KEY)
  
  // Dispatch custom event to notify components in the same tab
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('settingsUpdated'))
  }
}
