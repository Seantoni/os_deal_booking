'use client'

import { useCallback } from 'react'
import { createTask } from '@/app/actions/crm'
import { addBusinessDaysInPanama, getTodayInPanama } from '@/lib/date/timezone'
import type { Opportunity, OpportunityStage, Task } from '@/types'
import type { MeetingData } from './TaskModal'
import { normalizeAutomationStage, shouldRunMeetingAutomation } from './opportunityAutomationLogic'

type AgreementPipelineDecision = 'keep_reunion' | 'propuesta_enviada' | 'won'

interface ConfirmDialogLike {
  confirm: (options: {
    title?: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'danger' | 'primary' | 'success'
  }) => Promise<boolean>
  handleCancel: () => void
}

interface UseOpportunityMeetingAutomationOptions {
  opportunity?: Opportunity | null
  confirmDialog: ConfirmDialogLike
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setError: (message: string) => void
  handleStageChange: (newStage: OpportunityStage) => Promise<void>
  onCreateRequest: () => void
}

const MEETING_AUTOMATION_LOG_PREFIX = '[OppMeetingAutomation]'

export function useOpportunityMeetingAutomation({
  opportunity,
  confirmDialog,
  setTasks,
  setError,
  handleStageChange,
  onCreateRequest,
}: UseOpportunityMeetingAutomationOptions) {
  const logMeetingAutomation = useCallback((event: string, payload?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    if (payload) {
      let serialized = ''
      try {
        serialized = JSON.stringify(payload)
      } catch {
        serialized = '[unserializable-payload]'
      }
      console.info(`${MEETING_AUTOMATION_LOG_PREFIX} ${timestamp} ${event} ${serialized}`)
      return
    }
    console.info(`${MEETING_AUTOMATION_LOG_PREFIX} ${timestamp} ${event}`)
  }, [])

  const createProposalFollowUpTask = useCallback(async () => {
    if (!opportunity) return

    const followUpDate = addBusinessDaysInPanama(getTodayInPanama(), 2)
    logMeetingAutomation('createProposalFollowUpTask:start', {
      opportunityId: opportunity.id,
      followUpDate,
    })

    const formData = new FormData()
    formData.append('opportunityId', opportunity.id)
    formData.append('category', 'todo')
    formData.append('title', 'Dar seguimiento a propuesta enviada')
    formData.append('date', followUpDate)
    formData.append('notes', 'Tarea creada automáticamente tras marcar la oportunidad en "Propuesta enviada".')

    const result = await createTask(formData)
    if (result.success && result.data) {
      logMeetingAutomation('createProposalFollowUpTask:success', {
        taskId: result.data.id,
        taskDate: String(result.data.date),
      })
      setTasks((prev) => [...prev, result.data].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ))
    } else {
      logMeetingAutomation('createProposalFollowUpTask:failed', {
        error: result.error || 'unknown',
      })
      setError(result.error || 'No se pudo crear la tarea automática de seguimiento')
    }
  }, [logMeetingAutomation, opportunity, setError, setTasks])

  const askStageDecision = useCallback((opts: {
    title: string
    description: string
    options: Array<{ value: string; label: string; className: string }>
    cancelLabel: string
  }): Promise<string | null> => {
    return new Promise((resolve) => {
      let settled = false
      const settle = (value: string | null) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      const buttons = (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">{opts.description}</p>
          <div className="flex flex-col gap-2">
            {opts.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors ${opt.className}`}
                onClick={() => {
                  settle(opt.value)
                  confirmDialog.handleCancel()
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )

      confirmDialog.confirm({
        title: opts.title,
        message: buttons,
        confirmText: '',
        cancelText: opts.cancelLabel,
        confirmVariant: 'primary',
      }).then(() => {
        settle(null)
      }).catch(() => {
        settle(null)
      })
    })
  }, [confirmDialog])

  const askIniciacionAgreementDecision = useCallback(async (): Promise<'reunion' | 'propuesta_enviada' | 'won' | 'keep'> => {
    logMeetingAutomation('askIniciacionAgreementDecision:start')

    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'reunion', label: 'Reunión', className: 'bg-blue-600 text-white hover:bg-blue-700' },
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Iniciación',
    })

    const result = (decision as 'reunion' | 'propuesta_enviada' | 'won') || 'keep'
    logMeetingAutomation('askIniciacionAgreementDecision:result', { result })
    return result
  }, [askStageDecision, logMeetingAutomation])

  const askAgreementPipelineDecision = useCallback(async (): Promise<AgreementPipelineDecision> => {
    logMeetingAutomation('askAgreementPipelineDecision:start')

    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Reunión',
    })

    const result = (decision as 'propuesta_enviada' | 'won') || 'keep_reunion'
    logMeetingAutomation('askAgreementPipelineDecision:result', { result })
    return result
  }, [askStageDecision, logMeetingAutomation])

  const handleWonPostActions = useCallback(async () => {
    logMeetingAutomation('handleWonPostActions:start')

    const createRequestNow = await confirmDialog.confirm({
      title: 'Oportunidad ganada',
      message: '¿Desea crear la solicitud/contrato ahora?',
      confirmText: 'Sí, crear solicitud',
      cancelText: 'No, después',
      confirmVariant: 'primary',
    })

    logMeetingAutomation('handleWonPostActions:result', {
      createRequestNow,
    })

    if (createRequestNow) {
      onCreateRequest()
    }
  }, [confirmDialog, logMeetingAutomation, onCreateRequest])

  const handleMeetingCompletionPipelineAutomation = useCallback(async (meetingData: MeetingData | null, capturedStage: string) => {
    const normalizedStage = normalizeAutomationStage(capturedStage)

    logMeetingAutomation('handleMeetingCompletionPipelineAutomation:start', {
      capturedStage,
      normalizedStage,
      reachedAgreement: meetingData?.reachedAgreement || null,
      hasNextSteps: !!meetingData?.nextSteps?.trim(),
    })

    if (!meetingData?.nextSteps?.trim()) {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_no_next_steps')
      return
    }

    if (normalizedStage !== 'iniciacion' && normalizedStage !== 'reunion') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_wrong_stage', {
        capturedStage,
        normalizedStage,
      })
      return
    }

    if (normalizedStage === 'iniciacion') {
      if (meetingData.reachedAgreement === 'no') {
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_no_agreement_auto_reunion')
        await handleStageChange('reunion')
        return
      }

      if (meetingData.reachedAgreement === 'si') {
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_agreement_prompt')
        const decision = await askIniciacionAgreementDecision()
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_decision', { decision })

        if (decision === 'reunion') {
          await handleStageChange('reunion')
        } else if (decision === 'propuesta_enviada') {
          await handleStageChange('propuesta_enviada')
          await createProposalFollowUpTask()
        } else if (decision === 'won') {
          await handleStageChange('won')
          await handleWonPostActions()
        }
        return
      }

      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_invalid_agreement', {
        reachedAgreement: meetingData.reachedAgreement,
      })
      return
    }

    if (meetingData.reachedAgreement === 'no') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:reunion_no_agreement')
      return
    }

    if (meetingData.reachedAgreement !== 'si') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_invalid_agreement', {
        reachedAgreement: meetingData.reachedAgreement,
      })
      return
    }

    const pipelineDecision = await askAgreementPipelineDecision()
    logMeetingAutomation('handleMeetingCompletionPipelineAutomation:reunion_decision', { pipelineDecision })

    if (pipelineDecision === 'propuesta_enviada') {
      await handleStageChange('propuesta_enviada')
      await createProposalFollowUpTask()
      return
    }

    if (pipelineDecision === 'won') {
      await handleStageChange('won')
      await handleWonPostActions()
    }
  }, [
    askAgreementPipelineDecision,
    askIniciacionAgreementDecision,
    createProposalFollowUpTask,
    handleStageChange,
    handleWonPostActions,
    logMeetingAutomation,
  ])

  const evaluateShouldRunMeetingAutomation = useCallback((params: {
    previousMeetingData: MeetingData | null
    currentMeetingData: MeetingData | null
    wasCompletedBefore: boolean
    isCompletedNow: boolean
  }): boolean => {
    const shouldRun = shouldRunMeetingAutomation(params)
    logMeetingAutomation('shouldRunMeetingAutomation:evaluated', {
      shouldRun,
      wasCompletedBefore: params.wasCompletedBefore,
      isCompletedNow: params.isCompletedNow,
      previousAgreement: params.previousMeetingData?.reachedAgreement || null,
      currentAgreement: params.currentMeetingData?.reachedAgreement || null,
      previousHasNextSteps: !!params.previousMeetingData?.nextSteps?.trim(),
      currentHasNextSteps: !!params.currentMeetingData?.nextSteps?.trim(),
    })
    return shouldRun
  }, [logMeetingAutomation])

  const queueMeetingCompletionPipelineAutomation = useCallback((meetingData: MeetingData | null, capturedStage: string) => {
    if (!meetingData) {
      logMeetingAutomation('queueMeetingCompletionPipelineAutomation:skip_null_meeting_data')
      return
    }
    logMeetingAutomation('queueMeetingCompletionPipelineAutomation:queued', {
      capturedStage,
      reachedAgreement: meetingData.reachedAgreement,
      hasNextSteps: !!meetingData.nextSteps?.trim(),
    })
    void Promise.resolve().then(async () => {
      logMeetingAutomation('queueMeetingCompletionPipelineAutomation:executing')
      await handleMeetingCompletionPipelineAutomation(meetingData, capturedStage)
    })
  }, [handleMeetingCompletionPipelineAutomation, logMeetingAutomation])

  return {
    logMeetingAutomation,
    evaluateShouldRunMeetingAutomation,
    queueMeetingCompletionPipelineAutomation,
  }
}
