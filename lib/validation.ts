import { getDaysDifference } from './categories'
import { getBusinessException, type BusinessException } from './settings'
import { getDateComponentsInPanama } from './timezone'
import type { Event } from '@/types'

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
  newEvent: { category: string | null; startDate: Date; endDate: Date },
  excludeEventId?: string
): { violated: boolean; conflictingEvent?: Event } {
  if (!newEvent.category) return { violated: false }
  
  const conflicts = events.filter(event => {
    if (excludeEventId && event.id === excludeEventId) return false
    if (event.category !== newEvent.category) return false
    
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
  businessExceptions?: BusinessException[]
): { violated: boolean; lastEvent?: Event; daysUntilAllowed?: number } {
  if (!merchant) return { violated: false }
  
  // Check for business exception
  const exceptionDays = businessExceptions 
    ? getBusinessException(merchant, 'repeatDays', businessExceptions)
    : null
  
  const requiredDays = exceptionDays !== null ? exceptionDays : (merchantRepeatDays ?? 30)
  
  const merchantEvents = events.filter(event => {
    if (excludeEventId && event.id === excludeEventId) return false
    return event.merchant === merchant
  })
  
  for (const event of merchantEvents) {
    const eventEnd = new Date(event.endDate)
    const endYear = eventEnd.getUTCFullYear()
    const endMonth = eventEnd.getUTCMonth()
    const endDay = eventEnd.getUTCDate()
    const eventEndLocal = new Date(endYear, endMonth, endDay)
    
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

