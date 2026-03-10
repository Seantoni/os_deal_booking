'use client'

import { useState, useCallback } from 'react'
import { ensureOpenOpportunityForBusiness } from '@/app/actions/opportunities'
import type { Opportunity } from '@/types'

export type AutoCreateResult = {
  success: boolean
  opportunity?: Opportunity
  created?: boolean
  error?: string
}

/**
 * Reusable hook for auto-creating (or finding existing) an opportunity
 * for a business in the background.
 *
 * Used by BusinessFormModal and DailyAgendaModal.
 */
export function useAutoCreateOpportunity() {
  const [creatingForBusinessId, setCreatingForBusinessId] = useState<string | null>(null)

  const autoCreate = useCallback(
    async (businessId: string, source?: string): Promise<AutoCreateResult> => {
      if (!businessId || creatingForBusinessId) {
        return { success: false, error: 'Operación en curso' }
      }

      setCreatingForBusinessId(businessId)
      try {
        const result = await ensureOpenOpportunityForBusiness(businessId, {
          source: source || 'quick_create',
        })

        if (!result.success || !result.data) {
          return { success: false, error: result.error || 'Error al crear la oportunidad' }
        }

        return {
          success: true,
          opportunity: result.data.opportunity as unknown as Opportunity,
          created: result.data.created,
        }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        }
      } finally {
        setCreatingForBusinessId(null)
      }
    },
    [creatingForBusinessId]
  )

  return {
    autoCreate,
    isCreating: creatingForBusinessId !== null,
    creatingForBusinessId,
  }
}
