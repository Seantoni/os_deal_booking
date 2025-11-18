import { getDaysDifference } from './categories'

type Event = {
  id?: string
  name: string
  category: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
}

// Daily limits
export const MIN_DAILY_LAUNCHES = 5
export const MAX_DAILY_LAUNCHES = 13

// Get count of events on a specific date
export function getEventsOnDate(events: Event[], date: Date): Event[] {
  const targetYear = date.getFullYear()
  const targetMonth = date.getMonth()
  const targetDay = date.getDate()
  
  return events.filter(event => {
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)
    
    const startYear = startDate.getUTCFullYear()
    const startMonth = startDate.getUTCMonth()
    const startDay = startDate.getUTCDate()
    
    const endYear = endDate.getUTCFullYear()
    const endMonth = endDate.getUTCMonth()
    const endDay = endDate.getUTCDate()
    
    // Check if this date falls within the event's date range
    const eventStart = new Date(startYear, startMonth, startDay)
    const eventEnd = new Date(endYear, endMonth, endDay)
    const checkDate = new Date(targetYear, targetMonth, targetDay)
    
    return checkDate >= eventStart && checkDate <= eventEnd
  })
}

// Check if daily limit is violated
export function getDailyLimitStatus(count: number): 'under' | 'ok' | 'over' {
  if (count < MIN_DAILY_LAUNCHES) return 'under'
  if (count > MAX_DAILY_LAUNCHES) return 'over'
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

// Check 30-day merchant rule
export function check30DayMerchantRule(
  events: Event[],
  merchant: string | null,
  newStartDate: Date,
  excludeEventId?: string
): { violated: boolean; lastEvent?: Event; daysUntilAllowed?: number } {
  if (!merchant) return { violated: false }
  
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
    
    if (daysSince < 30) {
      return {
        violated: true,
        lastEvent: event,
        daysUntilAllowed: 30 - daysSince
      }
    }
  }
  
  return { violated: false }
}

