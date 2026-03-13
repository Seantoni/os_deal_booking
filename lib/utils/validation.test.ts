import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BOOKING_START_DATE_EVENT_DAY_ERROR,
  normalizeIsoCalendarDates,
  validateStartDateAgainstEventDays,
} from './validation'

test('normalizeIsoCalendarDates trims, deduplicates, sorts, and drops invalid values', () => {
  assert.deepEqual(
    normalizeIsoCalendarDates([
      '2026-07-04',
      ' 2026-07-02 ',
      '2026-07-04',
      'not-a-date',
      '2026-02-31',
      '',
    ]),
    ['2026-07-02', '2026-07-04']
  )
})

test('validateStartDateAgainstEventDays allows same-day or later event days', () => {
  const result = validateStartDateAgainstEventDays('2026-07-02', [
    '2026-07-02',
    '2026-07-04',
  ])

  assert.equal(result.valid, true)
  assert.equal(result.earliestEventDay, '2026-07-02')
  assert.deepEqual(result.normalizedEventDays, ['2026-07-02', '2026-07-04'])
})

test('validateStartDateAgainstEventDays rejects event days before the launch date', () => {
  const result = validateStartDateAgainstEventDays('2026-07-03', [
    '2026-07-04',
    '2026-07-02',
  ])

  assert.equal(result.valid, false)
  assert.equal(result.error, BOOKING_START_DATE_EVENT_DAY_ERROR)
  assert.equal(result.earliestEventDay, '2026-07-02')
})

test('validateStartDateAgainstEventDays ignores comparison when start date is missing', () => {
  const result = validateStartDateAgainstEventDays(null, ['2026-07-02'])

  assert.equal(result.valid, true)
  assert.equal(result.earliestEventDay, '2026-07-02')
})
