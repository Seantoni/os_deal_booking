'use client'

import type { Opportunity } from '@/types'
import OpportunityHistory from './OpportunityHistory'

interface OpportunityHistoryTabProps {
  opportunity?: Opportunity | null
}

export default function OpportunityHistoryTab({ opportunity }: OpportunityHistoryTabProps) {
  return (
    <div className="bg-white h-full">
      {!opportunity ? (
        <div className="p-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <span className="text-4xl mb-3 block">📋</span>
            <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para ver el historial</p>
            <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para ver las actividades</p>
          </div>
        </div>
      ) : (
        <OpportunityHistory opportunityId={opportunity.id} />
      )}
    </div>
  )
}
