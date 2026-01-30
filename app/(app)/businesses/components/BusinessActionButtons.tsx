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
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CampaignIcon from '@mui/icons-material/Campaign'
import { FOCUS_PERIOD_LABELS, type FocusPeriod } from '@/lib/utils/focus-period'

interface BusinessActionButtonsProps {
  business: Business
  activeFocus: FocusPeriod | undefined
  activeDealUrl: string | undefined
  campaignCount: number
  isAdmin: boolean
  actionMenuOpen: string | null
  onSetActionMenuOpen: (id: string | null) => void
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
  actionMenuOpen,
  onSetActionMenuOpen,
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
      
      {/* Open Full Page */}
      <button
        onClick={() => router.push(`/businesses/${business.id}`)}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
        title="Open full page"
      >
        <OpenInNewIcon style={{ fontSize: 18 }} />
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
      
      {/* Action Menu (More options) */}
      <div className="relative">
        <button
          onClick={() => onSetActionMenuOpen(actionMenuOpen === business.id ? null : business.id)}
          className="p-1.5 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
          title="Acción"
        >
          <MoreVertIcon style={{ fontSize: 18 }} />
        </button>
        {actionMenuOpen === business.id && (
          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            <button
              onClick={() => {
                onOpenReassignmentModal(business)
                onSetActionMenuOpen(null)
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
            >
              Reasignar / Sacar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
