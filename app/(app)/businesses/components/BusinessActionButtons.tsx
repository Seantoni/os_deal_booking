/**
 * Action buttons for a business row
 * 
 * Includes: Active deal link, Focus, Opportunity, Request, Full page, Campaign, More menu
 */

'use client'

import { useRouter } from 'next/navigation'
import type { Business } from '@/types'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import LaunchIcon from '@mui/icons-material/Launch'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CampaignIcon from '@mui/icons-material/Campaign'
import { FOCUS_PERIOD_LABELS, type FocusPeriod } from '@/lib/utils/focus-period'

interface BusinessActionButtonsProps {
  business: Business
  activeFocus: FocusPeriod | undefined
  activeDealUrl: string | undefined
  campaignCount: number
  isAdmin: boolean
  onSetFocus: (business: Business) => void
  onCreateOpportunity: (business: Business) => void
  onCreateRequest: (business: Business) => void
  onOpenCampaignModal: (business: Business) => void
  onOpenReassignmentModal: (business: Business) => void
}

export function BusinessActionButtons({
  business,
  activeFocus,
  activeDealUrl,
  campaignCount,
  isAdmin,
  onSetFocus,
  onCreateOpportunity,
  onCreateRequest,
  onOpenCampaignModal,
  onOpenReassignmentModal,
}: BusinessActionButtonsProps) {
  const router = useRouter()

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Active Deal Link - only show if business has active deal */}
      {activeDealUrl && (
        <a
          href={activeDealUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
          title="Ver Deal Activo"
          onClick={(e) => e.stopPropagation()}
        >
          <LaunchIcon style={{ fontSize: 18 }} />
        </a>
      )}
      
      {/* Focus Button */}
      <button
        onClick={() => onSetFocus(business)}
        className={`p-1.5 rounded transition-colors ${
          activeFocus 
            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
            : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
        }`}
        title={activeFocus ? `Foco: ${FOCUS_PERIOD_LABELS[activeFocus]}` : 'Establecer Foco'}
      >
        <CenterFocusStrongIcon style={{ fontSize: 18 }} />
      </button>
      
      {/* Campaign Button (Admin only) */}
      {isAdmin && (
        <button
          onClick={() => onOpenCampaignModal(business)}
          className={`p-1.5 rounded transition-colors ${
            campaignCount > 0
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'hover:bg-blue-50 text-gray-400 hover:text-blue-600'
          }`}
          title="Añadir a Campaña"
        >
          <CampaignIcon style={{ fontSize: 18 }} />
        </button>
      )}
      
      {/* Reassignment Action Button */}
      <button
        onClick={() => onOpenReassignmentModal(business)}
        className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
        title="Acción (Reasignar/Sacar/Recurrente)"
      >
        <SwapHorizIcon style={{ fontSize: 18 }} />
      </button>

      {/* Vertical Divider */}
      <div className="h-5 w-px bg-gray-300 mx-1" />

      {/* Create Opportunity */}
      <button
        onClick={() => onCreateOpportunity(business)}
        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
        title="Create Opportunity"
      >
        <HandshakeIcon style={{ fontSize: 18 }} />
      </button>
      
      {/* Create Request */}
      <button
        onClick={() => onCreateRequest(business)}
        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
        title="Create Request"
      >
        <DescriptionIcon style={{ fontSize: 18 }} />
      </button>

      {/* Vertical Divider */}
      <div className="h-5 w-px bg-gray-300 mx-1" />
      
      {/* Open Full Page */}
      <button
        onClick={() => router.push(`/businesses/${business.id}`)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
        title="Open full page"
      >
        <OpenInNewIcon style={{ fontSize: 18 }} />
      </button>
    </div>
  )
}
