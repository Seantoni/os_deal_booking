import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateUsageValidityDays,
  calculateUsageValidityRange,
} from './usage-validity'

test('calculateUsageValidityRange uses launch date for Canje Simple', () => {
  const result = calculateUsageValidityRange({
    startDate: '2026-03-12',
    endDate: '2026-03-16',
    redemptionMode: 'Canje Simple',
    campaignDuration: '3',
    campaignDurationUnit: 'months',
  })

  assert.equal(result.firstUsageDate, '2026-03-12')
  assert.equal(result.lastUsageDate, '2026-06-12')
  assert.equal(result.usesEventDays, false)
})

test('calculateUsageValidityRange starts Canje Diferido the day after publication ends', () => {
  const result = calculateUsageValidityRange({
    startDate: '2026-03-12',
    endDate: '2026-03-16',
    redemptionMode: 'Canje Diferido',
    campaignDuration: '3',
    campaignDurationUnit: 'months',
  })

  assert.equal(result.firstUsageDate, '2026-03-17')
  assert.equal(result.lastUsageDate, '2026-06-17')
})

test('calculateUsageValidityRange supports day-based durations from the first usage date', () => {
  const result = calculateUsageValidityRange({
    startDate: '2026-03-12',
    endDate: '2026-03-16',
    redemptionMode: 'Canje Diferido',
    campaignDuration: '10',
    campaignDurationUnit: 'days',
  })

  assert.equal(result.firstUsageDate, '2026-03-17')
  assert.equal(result.lastUsageDate, '2026-03-27')
})

test('calculateUsageValidityRange uses event days when present', () => {
  const result = calculateUsageValidityRange({
    startDate: '2026-03-01',
    endDate: '2026-03-15',
    redemptionMode: 'Evento',
    campaignDuration: '3',
    campaignDurationUnit: 'months',
    eventDays: ['2026-03-22', '2026-03-20', '2026-03-22'],
  })

  assert.equal(result.firstUsageDate, '2026-03-20')
  assert.equal(result.lastUsageDate, '2026-03-22')
  assert.equal(result.usesEventDays, true)
})

test('calculateUsageValidityDays returns inclusive days across the derived range', () => {
  const range = calculateUsageValidityRange({
    startDate: '2026-03-12',
    endDate: '2026-03-16',
    redemptionMode: 'Canje Diferido',
    campaignDuration: '3',
    campaignDurationUnit: 'months',
  })

  assert.equal(calculateUsageValidityDays(range), 93)
})
