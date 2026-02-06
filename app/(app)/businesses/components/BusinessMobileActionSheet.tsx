'use client'

import { useEffect, useRef } from 'react'
import type { Business } from '@/types'
import type { FocusPeriod } from '@/lib/utils/focus-period'
import { FOCUS_PERIOD_LABELS } from '@/lib/utils/focus-period'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import CampaignIcon from '@mui/icons-material/Campaign'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LaunchIcon from '@mui/icons-material/Launch'
import CloseIcon from '@mui/icons-material/Close'

interface BusinessMobileActionSheetProps {
  business: Business
  activeFocus: FocusPeriod | undefined
  activeDealUrl: string | undefined
  campaignCount: number
  isAdmin: boolean
  canEdit: boolean
  onClose: () => void
  onSetFocus: (business: Business) => void
  onCreateOpportunity: (business: Business) => void
  onCreateRequest: (business: Business) => void
  onOpenCampaignModal: (business: Business) => void
  onOpenReassignmentModal: (business: Business) => void
  onOpenFullPage: (business: Business) => void
}

interface ActionItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  color?: string
  subtitle?: string
}

export function BusinessMobileActionSheet({
  business,
  activeFocus,
  activeDealUrl,
  campaignCount,
  isAdmin,
  canEdit,
  onClose,
  onSetFocus,
  onCreateOpportunity,
  onCreateRequest,
  onOpenCampaignModal,
  onOpenReassignmentModal,
  onOpenFullPage,
}: BusinessMobileActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const actions: ActionItem[] = []

  // Active deal link
  if (activeDealUrl) {
    actions.push({
      label: 'Ver Deal Activo',
      icon: <LaunchIcon style={{ fontSize: 20 }} />,
      onClick: () => {
        window.open(activeDealUrl, '_blank')
        onClose()
      },
      color: 'text-emerald-600',
    })
  }

  // Focus
  actions.push({
    label: activeFocus ? `Foco: ${FOCUS_PERIOD_LABELS[activeFocus]}` : 'Establecer Foco',
    icon: <CenterFocusStrongIcon style={{ fontSize: 20 }} />,
    onClick: () => { onSetFocus(business); onClose() },
    disabled: !canEdit,
    color: activeFocus ? 'text-amber-600' : undefined,
  })

  // Campaign (admin only)
  if (isAdmin) {
    actions.push({
      label: campaignCount > 0 ? `Campañas (${campaignCount})` : 'Añadir a Campaña',
      icon: <CampaignIcon style={{ fontSize: 20 }} />,
      onClick: () => { onOpenCampaignModal(business); onClose() },
      disabled: !canEdit,
      color: campaignCount > 0 ? 'text-blue-600' : undefined,
    })
  }

  // Reassignment
  actions.push({
    label: 'Reasignar / Acción',
    icon: <SwapHorizIcon style={{ fontSize: 20 }} />,
    onClick: () => { onOpenReassignmentModal(business); onClose() },
    disabled: !canEdit,
  })

  // Create opportunity
  actions.push({
    label: 'Crear Oportunidad',
    icon: <HandshakeIcon style={{ fontSize: 20 }} />,
    onClick: () => { onCreateOpportunity(business); onClose() },
    disabled: !canEdit,
    color: 'text-blue-600',
  })

  // Create request
  actions.push({
    label: 'Crear Solicitud',
    icon: <DescriptionIcon style={{ fontSize: 20 }} />,
    onClick: () => { onCreateRequest(business); onClose() },
    disabled: !canEdit,
    color: 'text-green-600',
  })

  // Open full page
  actions.push({
    label: 'Abrir Página Completa',
    icon: <OpenInNewIcon style={{ fontSize: 20 }} />,
    onClick: () => { onOpenFullPage(business); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] animate-[slideUp_200ms_ease-out] pb-safe"
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Business name header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-gray-900 truncate">{business.name}</h3>
            {business.owner && (
              <p className="text-xs text-gray-500 mt-0.5">{business.owner.name || business.owner.email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 ml-3 flex-shrink-0"
            aria-label="Cerrar"
          >
            <CloseIcon style={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Actions list */}
        <div className="py-2 max-h-[60vh] overflow-y-auto">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors active:bg-gray-50 ${
                action.disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className={`flex-shrink-0 ${action.color || 'text-gray-500'}`}>
                {action.icon}
              </span>
              <span className={`text-[14px] font-medium ${action.disabled ? 'text-gray-400' : 'text-gray-800'}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 text-[14px] font-semibold text-gray-600 active:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
