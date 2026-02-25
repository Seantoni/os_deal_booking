import type { OpportunityStage } from '@/types'

export type NormalizedAutomationStage = OpportunityStage | 'unknown'

interface MeetingAutomationData {
  reachedAgreement?: string | null
  nextSteps?: string | null
}

interface ShouldRunMeetingAutomationParams {
  previousMeetingData: MeetingAutomationData | null
  currentMeetingData: MeetingAutomationData | null
  wasCompletedBefore: boolean
  isCompletedNow: boolean
}

interface ShouldAutoCompleteTaskParams {
  markCompleted?: boolean
  completingTaskId: string | null
  selectedTaskId: string | null
  meetingData: MeetingAutomationData | null
}

export function normalizeAutomationStage(rawStage: string | null | undefined): NormalizedAutomationStage {
  const stageValue = (rawStage || '').trim().toLowerCase()
  switch (stageValue) {
    case 'iniciacion':
    case 'iniciación':
      return 'iniciacion'
    case 'reunion':
    case 'reunión':
      return 'reunion'
    case 'propuesta_enviada':
    case 'propuesta enviada':
      return 'propuesta_enviada'
    case 'propuesta_aprobada':
    case 'propuesta aprobada':
      return 'propuesta_aprobada'
    case 'won':
      return 'won'
    case 'lost':
      return 'lost'
    default:
      return 'unknown'
  }
}

export function shouldRunMeetingAutomation({
  previousMeetingData,
  currentMeetingData,
  wasCompletedBefore,
  isCompletedNow,
}: ShouldRunMeetingAutomationParams): boolean {
  if (!currentMeetingData?.nextSteps?.trim()) return false
  if (!currentMeetingData.reachedAgreement) return false

  const previousOutcomeRecorded = !!previousMeetingData?.nextSteps?.trim()
  const agreementChanged = previousMeetingData?.reachedAgreement !== currentMeetingData.reachedAgreement
  const completedDuringThisSave = !wasCompletedBefore && isCompletedNow
  return !previousOutcomeRecorded || agreementChanged || completedDuringThisSave
}

export function shouldRequireMeetingOutcomeBeforeCompletion(params: {
  category: 'meeting' | 'todo'
  completed: boolean
  meetingData: MeetingAutomationData | null
}): boolean {
  if (params.category !== 'meeting') return false
  if (params.completed) return false
  return !params.meetingData?.nextSteps?.trim()
}

export function shouldAutoCompleteTask({
  markCompleted,
  completingTaskId,
  selectedTaskId,
  meetingData,
}: ShouldAutoCompleteTaskParams): boolean {
  let shouldAutoComplete = !!markCompleted

  if (meetingData?.nextSteps?.trim()) {
    shouldAutoComplete = true
  }

  if (completingTaskId && selectedTaskId === completingTaskId) {
    shouldAutoComplete = true
  }

  return shouldAutoComplete
}
