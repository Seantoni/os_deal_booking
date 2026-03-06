import assert from 'node:assert/strict'
import test from 'node:test'

import { withRequiredVendorUpdateFields } from './mapper'
import type { ExternalOfertaVendorUpdateRequest } from './types'

test('withRequiredVendorUpdateFields adds the current business email for non-email PATCH updates', () => {
  const payload: ExternalOfertaVendorUpdateRequest = {
    phoneNumber: '555-9999',
  }

  const result = withRequiredVendorUpdateFields(
    { contactEmail: 'ana@example.com' },
    payload
  )

  assert.deepEqual(result, {
    phoneNumber: '555-9999',
    email: 'ana@example.com',
    emailContact: 'ana@example.com',
  })
})

test('withRequiredVendorUpdateFields prefers and sanitizes the PATCH email value', () => {
  const payload: ExternalOfertaVendorUpdateRequest = {
    email: ' new@example.com. ',
    website: 'https://example.com',
  }

  const result = withRequiredVendorUpdateFields(
    { contactEmail: 'old@example.com' },
    payload
  )

  assert.deepEqual(result, {
    email: 'new@example.com',
    website: 'https://example.com',
    emailContact: 'new@example.com',
  })
})

test('withRequiredVendorUpdateFields does not mask an explicitly cleared email', () => {
  const payload: ExternalOfertaVendorUpdateRequest = {
    email: '',
    managerName: 'Ana',
  }

  const result = withRequiredVendorUpdateFields(
    { contactEmail: 'old@example.com' },
    payload
  )

  assert.deepEqual(result, {
    email: '',
    managerName: 'Ana',
  })
})
