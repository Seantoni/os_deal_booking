import { getDaysDifference, getMaxDuration } from './categories'
import { getBusinessException, type BusinessException } from './settings'
import { getDateComponentsInPanama, getTodayInPanama, parseDateInPanamaTime } from './date/timezone'
import { buildCategoryKey, getEventCategoryKey, categoryKeysMatch } from './category-utils'
import type { Event } from '@/types'
import { logger } from './logger'

// Daily limits (can be overridden by settings)
export const MIN_DAILY_LAUNCHES = 5
export const MAX_DAILY_LAUNCHES = 13

// Get count of events that START (launch/run) on a specific date
// This counts events based on their launch date (startDate), not if they span that day
export function getEventsOnDate(events: Event[], date: Date): Event[] {
  // Use Panama timezone for consistent date comparison
  // Extract target date components in Panama timezone
  // getDateComponentsInPanama returns month as 1-12 (1-indexed)
  const targetPanama = getDateComponentsInPanama(date)
  const targetYear = targetPanama.year
  const targetMonth = targetPanama.month // 1-indexed (1-12)
  const targetDay = targetPanama.day
  
  return events.filter(event => {
    const startDate = new Date(event.startDate)
    
    // Extract event start date components in Panama timezone
    const eventPanama = getDateComponentsInPanama(startDate)
    const eventYear = eventPanama.year
    const eventMonth = eventPanama.month // 1-indexed (1-12)
    const eventDay = eventPanama.day
    
    // Only count events that START on this exact date
    return eventYear === targetYear && 
           eventMonth === targetMonth && 
           eventDay === targetDay
  })
}

// Check if daily limit is violated
export function getDailyLimitStatus(
  count: number, 
  minDaily?: number, 
  maxDaily?: number
): 'under' | 'ok' | 'over' {
  const min = minDaily ?? MIN_DAILY_LAUNCHES
  const max = maxDaily ?? MAX_DAILY_LAUNCHES
  
  if (count < min) return 'under'
  if (count > max) return 'over'
  return 'ok'
}

// Validate uniqueness rule - check for similar active offers
export function checkUniquenesViolation(
  events: Event[],
  newEvent: { 
    category?: string | null
    parentCategory?: string | null
    subCategory1?: string | null
    subCategory2?: string | null
    subCategory3?: string | null
    startDate: Date
    endDate: Date
  },
  excludeEventId?: string
): { violated: boolean; conflictingEvent?: Event } {
  // Build standardized category key for the new event
  const newCategoryKey = buildCategoryKey(
    newEvent.parentCategory,
    newEvent.subCategory1,
    newEvent.subCategory2,
    newEvent.subCategory3,
    newEvent.category
  )
  
  if (!newCategoryKey) return { violated: false }
  
  const conflicts = events.filter(event => {
    if (excludeEventId && event.id === excludeEventId) return false
    
    // Get standardized category key for existing event
    const eventCategoryKey = getEventCategoryKey(event)
    
    // Check if categories match using standardized keys
    if (!categoryKeysMatch(eventCategoryKey, newCategoryKey)) return false
    
    // Check if date ranges overlap
    const eventStart = new Date(event.startDate)
    const eventEnd = new Date(event.endDate)
    const newStart = newEvent.startDate
    const newEnd = newEvent.endDate
    
    return (newStart <= eventEnd && newEnd >= eventStart)
  })
  
  if (conflicts.length > 0) {
    return { violated: true, conflictingEvent: conflicts[0] }
  }
  
  return { violated: false }
}

// Check 30-day merchant rule (with business exceptions support)
export function check30DayMerchantRule(
  events: Event[],
  merchant: string | null,
  newStartDate: Date,
  excludeEventId?: string,
  merchantRepeatDays?: number,
  businessExceptions?: BusinessException[],
  businessId?: string | null
): { violated: boolean; lastEvent?: Event; daysUntilAllowed?: number } {
  if (!merchant && !businessId) return { violated: false }
  
  // Check for business exception
  const exceptionDays = merchant && businessExceptions 
    ? getBusinessException(merchant, 'repeatDays', businessExceptions)
    : null
  
  const requiredDays = exceptionDays !== null ? exceptionDays : (merchantRepeatDays ?? 30)
  
  const merchantEvents = events.filter(event => {
    if (excludeEventId && event.id === excludeEventId) return false
    if (businessId) {
      if (event.businessId) return event.businessId === businessId
      return merchant ? event.business === merchant : false
    }
    return merchant ? event.business === merchant : false
  })
  
  for (const event of merchantEvents) {
    // Use Panama timezone for event end date
    const eventEndPanama = getDateComponentsInPanama(new Date(event.endDate))
    const eventEndLocal = new Date(eventEndPanama.year, eventEndPanama.month - 1, eventEndPanama.day)
    
    // Calculate days between event end and new start
    const daysSince = Math.floor((newStartDate.getTime() - eventEndLocal.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSince < requiredDays) {
      return {
        violated: true,
        lastEvent: event,
        daysUntilAllowed: requiredDays - daysSince
      }
    }
  }
  
  return { violated: false }
}

/**
 * Universal function to calculate the next available launch date
 * Checks all validation rules: uniqueness, merchant rules, and daily limits
 * 
 * @param events - Array of existing events to check against
 * @param category - Category string for uniqueness check
 * @param parentCategory - Parent category for duration calculation
 * @param merchant - Merchant name for 30-day rule check
 * @param duration - Duration in days (defaults to category max if not provided)
 * @param startFromDate - Date to start searching from (defaults to today)
 * @param excludeEventId - Event ID to exclude from checks (for updates)
 * @param settings - Booking settings (minDailyLaunches, maxDailyLaunches, merchantRepeatDays, businessExceptions)
 * @param maxAttempts - Maximum days to search ahead (default: MAX_DATE_SEARCH_DAYS)
 * @returns Object with success status, available date, days until launch, and any errors
 */
import { MAX_DATE_SEARCH_DAYS } from '@/lib/constants'

export function calculateNextAvailableDate(
  events: Event[],
  category: string | null,
  parentCategory: string | null,
  merchant: string | null,
  duration?: number,
  startFromDate?: Date,
  excludeEventId?: string,
  settings?: {
    minDailyLaunches?: number
    maxDailyLaunches?: number
    merchantRepeatDays?: number
    businessExceptions?: BusinessException[]
  },
  maxAttempts: number = MAX_DATE_SEARCH_DAYS
): {
  success: boolean
  date?: Date
  daysUntilLaunch?: number
  error?: string
} {
  try {
    // Determine duration
    let eventDuration = duration
    if (!eventDuration) {
      eventDuration = parentCategory ? getMaxDuration(parentCategory) : 5
      
      // Check for business exception duration
      if (merchant && settings?.businessExceptions) {
        const exceptionDuration = getBusinessException(
          merchant,
          'duration',
          settings.businessExceptions
        )
        if (exceptionDuration !== null) {
          eventDuration = exceptionDuration
        }
      }
    }
    
    // Start from provided date or today (using Panama timezone)
    const todayStr = getTodayInPanama()
    const today = parseDateInPanamaTime(todayStr)
    let testDate = startFromDate ? new Date(startFromDate) : new Date(today)
    
    // Ensure we start from today or later
    if (testDate < today) {
      testDate = new Date(today)
    }
    
    let attempts = 0
    
    while (attempts < maxAttempts) {
      // Calculate end date
      const testEndDate = new Date(testDate)
      testEndDate.setDate(testEndDate.getDate() + (eventDuration - 1))
      
      // Check uniqueness violation
      // Note: category parameter can be a full path string or just parent
      // We need to extract the hierarchical parts if it's a full path
      if (category || parentCategory) {
        // Parse category string if it's in format "PARENT:SUB1:SUB2"
        let catParent = parentCategory
        let catSub1: string | null = null
        let catSub2: string | null = null
        
        if (category && category.includes(':')) {
          const parts = category.split(':')
          catParent = parts[0] || parentCategory
          catSub1 = parts[1] || null
          catSub2 = parts[2] || null
        } else if (category && !parentCategory) {
          // If category is provided but not hierarchical, use it as parent
          catParent = category
        }
        
        const uniqueCheck = checkUniquenesViolation(
          events,
          { 
            category: category || null,
            parentCategory: catParent,
            subCategory1: catSub1,
            subCategory2: catSub2,
            startDate: testDate, 
            endDate: testEndDate 
          },
          excludeEventId
        )
        
        if (uniqueCheck.violated) {
          // Move to next day
          testDate.setDate(testDate.getDate() + 1)
          attempts++
          continue
        }
      }
      
      // Check 30-day merchant rule
      if (merchant) {
        const merchantCheck = check30DayMerchantRule(
          events,
          merchant,
          testDate,
          excludeEventId,
          settings?.merchantRepeatDays,
          settings?.businessExceptions
        )
        
        if (merchantCheck.violated && merchantCheck.daysUntilAllowed) {
          // Move forward by the required days
          testDate.setDate(testDate.getDate() + merchantCheck.daysUntilAllowed)
          attempts++
          continue
        }
      }
      
      // Check daily launch limits
      const eventsOnDate = getEventsOnDate(events, testDate)
      const limitStatus = getDailyLimitStatus(
        eventsOnDate.length,
        settings?.minDailyLaunches,
        settings?.maxDailyLaunches
      )
      
      if (limitStatus === 'over') {
        // Move to next day if over limit
        testDate.setDate(testDate.getDate() + 1)
        attempts++
        continue
      }
      
      // Found a valid date!
      const daysUntilLaunch = Math.ceil((testDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        success: true,
        date: new Date(testDate),
        daysUntilLaunch
      }
    }
    
    return {
      success: false,
      error: `No available date found within ${maxAttempts} days`
    }
  } catch (error) {
    logger.error('Error calculating next available date:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate next available date'
    }
  }
}
