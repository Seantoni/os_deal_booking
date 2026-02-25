import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOpportunityFormData } from './opportunityFormPayload'

test('buildOpportunityFormData includes required base fields and optional values', () => {
  const formData = buildOpportunityFormData({
    values: {
      businessId: 'biz-1',
      startDate: '2026-02-25',
      closeDate: '2026-03-01',
      notes: 'Note',
      categoryId: 'cat-parent',
      tier: '2',
      contactName: 'Ana',
      contactPhone: '6000-0000',
      contactEmail: 'ana@example.com',
    },
    fallbackBusinessId: 'biz-fallback',
    stage: 'reunion',
    responsibleId: 'user-1',
    responsibleMode: 'always',
    lostReason: 'Sin presupuesto',
  })

  assert.equal(formData.get('businessId'), 'biz-1')
  assert.equal(formData.get('stage'), 'reunion')
  assert.equal(formData.get('startDate'), '2026-02-25')
  assert.equal(formData.get('closeDate'), '2026-03-01')
  assert.equal(formData.get('notes'), 'Note')
  assert.equal(formData.get('responsibleId'), 'user-1')
  assert.equal(formData.get('categoryId'), 'cat-parent')
  assert.equal(formData.get('tier'), '2')
  assert.equal(formData.get('contactName'), 'Ana')
  assert.equal(formData.get('contactPhone'), '6000-0000')
  assert.equal(formData.get('contactEmail'), 'ana@example.com')
  assert.equal(formData.get('lostReason'), 'Sin presupuesto')
})

test('buildOpportunityFormData uses fallback business and skips conditional fields when empty', () => {
  const formData = buildOpportunityFormData({
    values: {
      businessId: null,
      startDate: '2026-02-25',
      closeDate: null,
      notes: null,
      categoryId: null,
      tier: null,
      contactName: null,
      contactPhone: null,
      contactEmail: null,
    },
    fallbackBusinessId: 'biz-fallback',
    stage: 'iniciacion',
    responsibleId: null,
    responsibleMode: 'if_present',
  })

  assert.equal(formData.get('businessId'), 'biz-fallback')
  assert.equal(formData.get('stage'), 'iniciacion')
  assert.equal(formData.get('startDate'), '2026-02-25')
  assert.equal(formData.get('closeDate'), null)
  assert.equal(formData.get('notes'), null)
  assert.equal(formData.get('responsibleId'), null)
  assert.equal(formData.get('categoryId'), '')
  assert.equal(formData.get('tier'), '')
  assert.equal(formData.get('contactName'), '')
  assert.equal(formData.get('contactPhone'), '')
  assert.equal(formData.get('contactEmail'), '')
  assert.equal(formData.get('lostReason'), null)
})
