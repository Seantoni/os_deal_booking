import { ONE_DAY_MS } from '@/lib/constants/time'
import { formatDateForPanama, getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'

export type DateRangePreset = 'all' | 'today' | 'this-week' | 'this-month' | 'custom'

export interface DateRangeFilterValue {
  preset: DateRangePreset
  startDate?: string
  endDate?: string
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function formatWithLeadingZero(value: number): string {
  return String(value).padStart(2, '0')
}

function normalizeDateInput(dateValue?: string | null): string | null {
  if (!dateValue) return null
  if (ISO_DATE_REGEX.test(dateValue)) return dateValue

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return null
  return formatDateForPanama(parsed)
}

export function resolveDateRange(
  filter: DateRangeFilterValue,
  todayDate: string = getTodayInPanama(),
): { startDate?: string; endDate?: string } {
  switch (filter.preset) {
    case 'today':
      return { startDate: todayDate, endDate: todayDate }
    case 'this-week': {
      const today = parseDateInPanamaTime(todayDate)
      const panamaDayIndex = today.getUTCDay() // 0=Sunday, 1=Monday...
      const daysSinceMonday = (panamaDayIndex + 6) % 7
      const weekStart = new Date(today.getTime() - daysSinceMonday * ONE_DAY_MS)
      const weekEnd = new Date(weekStart.getTime() + 6 * ONE_DAY_MS)
      return {
        startDate: formatDateForPanama(weekStart),
        endDate: formatDateForPanama(weekEnd),
      }
    }
    case 'this-month': {
      const [year, month] = todayDate.split('-').map(Number)
      const startDate = `${year}-${formatWithLeadingZero(month)}-01`
      const monthEnd = new Date(Date.UTC(year, month, 0, 5, 0, 0))
      return {
        startDate,
        endDate: formatDateForPanama(monthEnd),
      }
    }
    case 'custom': {
      const customStart = normalizeDateInput(filter.startDate)
      const customEnd = normalizeDateInput(filter.endDate)
      if (customStart && customEnd && customStart > customEnd) {
        return { startDate: customEnd, endDate: customStart }
      }
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      }
    }
    case 'all':
    default:
      return {}
  }
}

export function isDateInRange(dateValue: string | Date, filter: DateRangeFilterValue): boolean {
  const normalizedDate =
    typeof dateValue === 'string'
      ? normalizeDateInput(dateValue)
      : formatDateForPanama(dateValue)

  if (!normalizedDate) return false

  const { startDate, endDate } = resolveDateRange(filter)
  if (startDate && normalizedDate < startDate) return false
  if (endDate && normalizedDate > endDate) return false
  return true
}

export function hasActiveDateRangeFilter(filter: DateRangeFilterValue): boolean {
  if (filter.preset !== 'all') return true
  return Boolean(filter.startDate || filter.endDate)
}
