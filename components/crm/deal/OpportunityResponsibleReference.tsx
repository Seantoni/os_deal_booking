'use client'

import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import type { Deal } from '@/types'

interface OpportunityResponsibleReferenceProps {
  deal: Deal
}

export default function OpportunityResponsibleReference({ deal }: OpportunityResponsibleReferenceProps) {
  if (!deal?.opportunityResponsible) return null

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />
        <span className="font-medium text-gray-500">Sales Rep:</span>
        <span>
          {deal.opportunityResponsible.name || deal.opportunityResponsible.email || 'N/A'}
        </span>
      </div>
    </div>
  )
}

