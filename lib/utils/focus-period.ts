/**
 * Focus Period Utilities
 * 
 * Handles business focus state expiration logic.
 * Focus periods:
 * - 'month': expires at the end of the month it was set
 * - 'quarter': expires at the end of the quarter it was set
 * - 'year': expires at the end of the year it was set
 */

export type FocusPeriod = 'month' | 'quarter' | 'year'

export const FOCUS_PERIOD_LABELS: Record<FocusPeriod, string> = {
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año',
}

export const FOCUS_PERIOD_OPTIONS: { value: FocusPeriod; label: string }[] = [
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Año' },
]

/**
 * Get the quarter (1-4) for a given date
 */
function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

/**
 * Get the expiration date for a focus period
 * Returns the last moment of the period (end of last day)
 */
export function getFocusExpirationDate(
  focusPeriod: FocusPeriod,
  focusSetAt: Date
): Date {
  const setDate = new Date(focusSetAt)
  
  switch (focusPeriod) {
    case 'month': {
      // End of the month when focus was set
      const year = setDate.getFullYear()
      const month = setDate.getMonth()
      // Last day of month at 23:59:59.999
      return new Date(year, month + 1, 0, 23, 59, 59, 999)
    }
    
    case 'quarter': {
      // End of the quarter when focus was set
      const year = setDate.getFullYear()
      const quarter = getQuarter(setDate)
      // Last day of last month of quarter at 23:59:59.999
      const lastMonthOfQuarter = quarter * 3 // 3, 6, 9, or 12
      return new Date(year, lastMonthOfQuarter, 0, 23, 59, 59, 999)
    }
    
    case 'year': {
      // End of the year when focus was set
      const year = setDate.getFullYear()
      // December 31st at 23:59:59.999
      return new Date(year, 11, 31, 23, 59, 59, 999)
    }
    
    default:
      // Fallback: end of current month
      const year = setDate.getFullYear()
      const month = setDate.getMonth()
      return new Date(year, month + 1, 0, 23, 59, 59, 999)
  }
}

/**
 * Check if a focus period has expired
 */
export function isFocusExpired(
  focusPeriod: string | null | undefined,
  focusSetAt: Date | string | null | undefined
): boolean {
  if (!focusPeriod || !focusSetAt) {
    return true // No focus set = considered expired
  }
  
  const setDate = typeof focusSetAt === 'string' ? new Date(focusSetAt) : focusSetAt
  const expirationDate = getFocusExpirationDate(focusPeriod as FocusPeriod, setDate)
  const now = new Date()
  
  return now > expirationDate
}

/**
 * Get active focus for a business (returns null if expired or not set)
 */
export function getActiveFocus(business: {
  focusPeriod?: string | null
  focusSetAt?: Date | string | null
}): FocusPeriod | null {
  if (!business.focusPeriod || !business.focusSetAt) {
    return null
  }
  
  if (isFocusExpired(business.focusPeriod, business.focusSetAt)) {
    return null
  }
  
  return business.focusPeriod as FocusPeriod
}

/**
 * Get focus info with expiration details
 */
export function getFocusInfo(business: {
  focusPeriod?: string | null
  focusSetAt?: Date | string | null
}): {
  isActive: boolean
  period: FocusPeriod | null
  label: string | null
  expiresAt: Date | null
  daysRemaining: number | null
} {
  const activeFocus = getActiveFocus(business)
  
  if (!activeFocus || !business.focusSetAt) {
    return {
      isActive: false,
      period: null,
      label: null,
      expiresAt: null,
      daysRemaining: null,
    }
  }
  
  const setDate = typeof business.focusSetAt === 'string' 
    ? new Date(business.focusSetAt) 
    : business.focusSetAt
  const expiresAt = getFocusExpirationDate(activeFocus, setDate)
  const now = new Date()
  const msRemaining = expiresAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))
  
  return {
    isActive: true,
    period: activeFocus,
    label: FOCUS_PERIOD_LABELS[activeFocus],
    expiresAt,
    daysRemaining,
  }
}

/**
 * Format expiration date for display
 */
export function formatExpirationDate(date: Date): string {
  return date.toLocaleDateString('es-PA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
