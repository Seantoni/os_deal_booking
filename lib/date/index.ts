/**
 * Date utilities index
 * Central export for all date-related functions
 */

// Timezone functions
export {
  PANAMA_TIMEZONE,
  parseDateInPanamaTime,
  parseEndDateInPanamaTime,
  formatDateForPanama,
  formatDateTimeForPanama,
  getTodayInPanama,
  getDateComponentsInPanama,
} from './timezone'

// Formatting functions
export {
  // Display formatting
  formatRequestNameDate,
  formatShortDate,
  formatDateShort,      // @deprecated - use formatShortDate
  formatFullDate,
  formatISODate,
  formatDateTime,
  formatDateForDisplay,
  formatDateRange,
  // Relative time
  formatRelativeTime,
  // Date calculations
  daysSince,
  daysUntil,
  calculateDaysUntil,   // @deprecated - use daysUntil
  calculateDaysDifference,
} from './formatting'
