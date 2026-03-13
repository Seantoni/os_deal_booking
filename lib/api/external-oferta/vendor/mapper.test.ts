import assert from 'node:assert/strict'
import test from 'node:test'

import { getChangedVendorFields } from './mapper'
import type { Business } from '@/types/business'

test('getChangedVendorFields excludes email from PATCH diffs', () => {
  const business = {
    name: 'Acme Corp',
    contactEmail: 'old@example.com',
  } as Business

  const newValues: Record<string, string> = {
    contactEmail: 'new@example.com',
    contactPhone: '555-1234',
  }

  const { changes, apiPayload } = getChangedVendorFields(business, newValues)

  assert.ok(!changes.some(c => c.apiKey === 'email'), 'email should not appear in changes')
  assert.equal(apiPayload.email, undefined, 'email should not be in apiPayload')
  assert.equal((apiPayload as Record<string, unknown>).phoneNumber, '555-1234')
})
