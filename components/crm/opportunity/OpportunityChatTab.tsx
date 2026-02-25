'use client'

import type { Opportunity } from '@/types'
import OpportunityChatThread from './OpportunityChatThread'

interface OpportunityChatTabProps {
  opportunity?: Opportunity | null
  canEdit: boolean
}

export default function OpportunityChatTab({ opportunity, canEdit }: OpportunityChatTabProps) {
  return (
    <div className="p-3 md:p-6 bg-white h-full">
      {!opportunity ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <span className="text-4xl mb-3 block">💬</span>
          <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para usar el chat</p>
          <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para chatear</p>
        </div>
      ) : (
        <OpportunityChatThread
          opportunityId={opportunity.id}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
