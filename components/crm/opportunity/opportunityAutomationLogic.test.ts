import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAutomationStage,
  shouldRunMeetingAutomation,
  shouldRequireMeetingOutcomeBeforeCompletion,
  shouldAutoCompleteTask,
} from './opportunityAutomationLogic'

test('normalizeAutomationStage normalizes aliases and unknown values', () => {
  assert.equal(normalizeAutomationStage('Iniciación'), 'iniciacion')
  assert.equal(normalizeAutomationStage('propuesta enviada'), 'propuesta_enviada')
  assert.equal(normalizeAutomationStage('  reunion '), 'reunion')
  assert.equal(normalizeAutomationStage('something-else'), 'unknown')
})

test('shouldRunMeetingAutomation returns false when required outcome data is missing', () => {
  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: null,
    currentMeetingData: { reachedAgreement: 'si', nextSteps: '' },
    wasCompletedBefore: false,
    isCompletedNow: false,
  }), false)

  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: null,
    currentMeetingData: { reachedAgreement: '', nextSteps: 'Dar seguimiento' },
    wasCompletedBefore: false,
    isCompletedNow: false,
  }), false)
})

test('shouldRunMeetingAutomation returns true for first recorded outcome', () => {
  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: null,
    currentMeetingData: { reachedAgreement: 'si', nextSteps: 'Enviar propuesta' },
    wasCompletedBefore: false,
    isCompletedNow: false,
  }), true)
})

test('shouldRunMeetingAutomation returns true when agreement changes', () => {
  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: { reachedAgreement: 'no', nextSteps: 'Pendiente' },
    currentMeetingData: { reachedAgreement: 'si', nextSteps: 'Aprobado' },
    wasCompletedBefore: true,
    isCompletedNow: true,
  }), true)
})

test('shouldRunMeetingAutomation returns true when completed during current save', () => {
  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: { reachedAgreement: 'si', nextSteps: 'Enviar contrato' },
    currentMeetingData: { reachedAgreement: 'si', nextSteps: 'Enviar contrato' },
    wasCompletedBefore: false,
    isCompletedNow: true,
  }), true)
})

test('shouldRunMeetingAutomation returns false when nothing meaningful changed', () => {
  assert.equal(shouldRunMeetingAutomation({
    previousMeetingData: { reachedAgreement: 'si', nextSteps: 'Enviar contrato' },
    currentMeetingData: { reachedAgreement: 'si', nextSteps: 'Enviar contrato' },
    wasCompletedBefore: true,
    isCompletedNow: true,
  }), false)
})

test('shouldRequireMeetingOutcomeBeforeCompletion guards only meeting completion without next steps', () => {
  assert.equal(shouldRequireMeetingOutcomeBeforeCompletion({
    category: 'meeting',
    completed: false,
    meetingData: null,
  }), true)

  assert.equal(shouldRequireMeetingOutcomeBeforeCompletion({
    category: 'meeting',
    completed: false,
    meetingData: { reachedAgreement: 'si', nextSteps: ' ' },
  }), true)

  assert.equal(shouldRequireMeetingOutcomeBeforeCompletion({
    category: 'meeting',
    completed: false,
    meetingData: { reachedAgreement: 'si', nextSteps: 'Seguimiento en 2 días' },
  }), false)

  assert.equal(shouldRequireMeetingOutcomeBeforeCompletion({
    category: 'meeting',
    completed: true,
    meetingData: null,
  }), false)

  assert.equal(shouldRequireMeetingOutcomeBeforeCompletion({
    category: 'todo',
    completed: false,
    meetingData: null,
  }), false)
})

test('shouldAutoCompleteTask handles explicit, outcome-based, and completion-flow triggers', () => {
  assert.equal(shouldAutoCompleteTask({
    markCompleted: true,
    completingTaskId: null,
    selectedTaskId: null,
    meetingData: null,
  }), true)

  assert.equal(shouldAutoCompleteTask({
    markCompleted: false,
    completingTaskId: null,
    selectedTaskId: null,
    meetingData: { reachedAgreement: 'no', nextSteps: 'Contactar de nuevo' },
  }), true)

  assert.equal(shouldAutoCompleteTask({
    markCompleted: false,
    completingTaskId: 'task-1',
    selectedTaskId: 'task-1',
    meetingData: null,
  }), true)

  assert.equal(shouldAutoCompleteTask({
    markCompleted: false,
    completingTaskId: 'task-1',
    selectedTaskId: 'task-2',
    meetingData: { reachedAgreement: 'si', nextSteps: ' ' },
  }), false)
})
