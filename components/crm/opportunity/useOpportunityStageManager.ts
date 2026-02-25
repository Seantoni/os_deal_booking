'use client'

import { useCallback, useState, useTransition } from 'react'
import { updateOpportunity } from '@/app/actions/crm'
import type { Opportunity, OpportunityStage } from '@/types'
import type { OpportunityFormValues } from './opportunityFormPayload'
import { buildOpportunityFormData } from './opportunityFormPayload'
import type { OpportunityModalSuccessMeta } from './opportunityModalTypes'

interface UseOpportunityStageManagerOptions {
  opportunity?: Opportunity | null
  stage: OpportunityStage
  setStage: (stage: OpportunityStage) => void
  businessId: string
  responsibleId: string
  getFormValues: () => OpportunityFormValues
  onSuccess: (opportunity: Opportunity, meta?: OpportunityModalSuccessMeta) => void
  setError: (message: string) => void
}

export function useOpportunityStageManager({
  opportunity,
  stage,
  setStage,
  businessId,
  responsibleId,
  getFormValues,
  onSuccess,
  setError,
}: UseOpportunityStageManagerOptions) {
  const [isStagePending, startStageTransition] = useTransition()
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false)
  const [pendingLostStage, setPendingLostStage] = useState<OpportunityStage | null>(null)

  const saveStageChange = useCallback((newStage: OpportunityStage, lostReason?: string) => {
    if (!opportunity || isStagePending) {
      return Promise.resolve()
    }

    const previousStage = stage
    setStage(newStage)
    setError('')

    return new Promise<void>((resolve) => {
      startStageTransition(async () => {
        try {
          const formData = buildOpportunityFormData({
            values: getFormValues(),
            fallbackBusinessId: businessId,
            stage: newStage,
            responsibleId,
            responsibleMode: 'if_present',
            lostReason,
          })

          const result = await updateOpportunity(opportunity.id, formData)
          if (result.success && result.data) {
            onSuccess(result.data, { source: 'stage' })
          } else {
            setError(result.error || 'Error al actualizar la etapa')
            setStage(previousStage)
          }
        } catch {
          setError('Ocurrió un error al actualizar la etapa')
          setStage(previousStage)
        } finally {
          resolve()
        }
      })
    })
  }, [
    businessId,
    getFormValues,
    isStagePending,
    onSuccess,
    opportunity,
    responsibleId,
    setError,
    setStage,
    stage,
  ])

  const handleStageChange = useCallback(async (newStage: OpportunityStage) => {
    if (!opportunity) {
      setStage(newStage)
      return
    }

    if (isStagePending) return

    if (newStage === 'lost') {
      setPendingLostStage(newStage)
      setLostReasonModalOpen(true)
      return
    }

    await saveStageChange(newStage)
  }, [isStagePending, opportunity, saveStageChange, setStage])

  const handleLostReasonConfirm = useCallback(async (reason: string) => {
    if (!pendingLostStage) return

    setLostReasonModalOpen(false)
    await saveStageChange(pendingLostStage, reason)
    setPendingLostStage(null)
  }, [pendingLostStage, saveStageChange])

  const handleLostReasonCancel = useCallback(() => {
    setLostReasonModalOpen(false)
    setPendingLostStage(null)
  }, [])

  const openLostReasonEditor = useCallback(() => {
    setPendingLostStage('lost')
    setLostReasonModalOpen(true)
  }, [])

  return {
    savingStage: isStagePending,
    lostReasonModalOpen,
    handleStageChange,
    handleLostReasonConfirm,
    handleLostReasonCancel,
    openLostReasonEditor,
  }
}
