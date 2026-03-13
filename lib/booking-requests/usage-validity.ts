import { ONE_DAY_MS } from '@/lib/constants/time'
import { formatDateForPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import {
  isValidIsoCalendarDate,
  normalizeIsoCalendarDates,
} from '@/lib/utils/validation'

export type UsageValidityInput = {
  startDate?: string | null
  endDate?: string | null
  redemptionMode?: string | null
  campaignDuration?: string | null
  campaignDurationUnit?: string | null
  eventDays?: readonly string[] | null
}

export type UsageValidityRange = {
  firstUsageDate: string | null
  lastUsageDate: string | null
  durationValue: number | null
  durationUnit: 'days' | 'months'
  usesEventDays: boolean
}

function normalizeDurationUnit(rawUnit: string | null | undefined): 'days' | 'months' {
  return String(rawUnit || '').toLowerCase() === 'days' ? 'days' : 'months'
}

function parsePositiveDuration(rawDuration: string | null | undefined): number | null {
  const normalized = typeof rawDuration === 'string' ? rawDuration.trim() : ''
  if (!normalized) return null

  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function addPanamaDays(dateString: string, days: number): string {
  const date = parseDateInPanamaTime(dateString)
  return formatDateForPanama(new Date(date.getTime() + days * ONE_DAY_MS))
}

function addPanamaMonths(dateString: string, months: number): string {
  const date = parseDateInPanamaTime(dateString)
  date.setUTCMonth(date.getUTCMonth() + months)
  return formatDateForPanama(date)
}

export function calculateUsageValidityRange(input: UsageValidityInput): UsageValidityRange {
  const durationUnit = normalizeDurationUnit(input.campaignDurationUnit)
  const durationValue = parsePositiveDuration(input.campaignDuration)
  const normalizedEventDays = normalizeIsoCalendarDates(input.eventDays)

  if (normalizedEventDays.length > 0) {
    return {
      firstUsageDate: normalizedEventDays[0],
      lastUsageDate: normalizedEventDays[normalizedEventDays.length - 1],
      durationValue,
      durationUnit,
      usesEventDays: true,
    }
  }

  const startDate =
    typeof input.startDate === 'string' && isValidIsoCalendarDate(input.startDate)
      ? input.startDate
      : null
  const endDate =
    typeof input.endDate === 'string' && isValidIsoCalendarDate(input.endDate)
      ? input.endDate
      : null
  const normalizedRedemptionMode = String(input.redemptionMode || '').trim().toLowerCase()

  const firstUsageDate =
    normalizedRedemptionMode === 'canje diferido'
      ? endDate
        ? addPanamaDays(endDate, 1)
        : startDate
      : startDate

  if (!firstUsageDate || durationValue == null) {
    return {
      firstUsageDate,
      lastUsageDate: null,
      durationValue,
      durationUnit,
      usesEventDays: false,
    }
  }

  return {
    firstUsageDate,
    lastUsageDate:
      durationUnit === 'days'
        ? addPanamaDays(firstUsageDate, durationValue)
        : addPanamaMonths(firstUsageDate, durationValue),
    durationValue,
    durationUnit,
    usesEventDays: false,
  }
}

export function calculateUsageValidityDays(
  range: Pick<UsageValidityRange, 'firstUsageDate' | 'lastUsageDate'>
): number | null {
  if (!range.firstUsageDate || !range.lastUsageDate) return null

  const start = parseDateInPanamaTime(range.firstUsageDate)
  const end = parseDateInPanamaTime(range.lastUsageDate)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return null
  }

  return Math.round((end.getTime() - start.getTime()) / ONE_DAY_MS) + 1
}
