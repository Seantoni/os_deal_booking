'use client'

import { useCallback } from 'react'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import type { Opportunity } from '@/types'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

// Stage configuration
const STAGE_LABELS: Record<string, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Prop. Aprobada',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_STYLES: Record<string, string> = {
  iniciacion: 'bg-gray-100 text-gray-700',
  reunion: 'bg-blue-50 text-blue-700',
  propuesta_enviada: 'bg-amber-50 text-amber-700',
  propuesta_aprobada: 'bg-indigo-50 text-indigo-700',
  won: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-600',
}

interface OpportunityMobileCardProps {
  opportunity: Opportunity
  projectionSummary?: ProjectionEntitySummary
  onCardTap: (opportunity: Opportunity) => void
  onRowHover: () => void
}

function getProjectionSourceLabel(source: ProjectionEntitySummary['projectionSource']): string {
  switch (source) {
    case 'actual_deal':
      return 'Actual'
    case 'business_history':
      return 'Histórico'
    case 'category_benchmark':
      return 'Categoría'
    default:
      return 'Sin datos'
  }
}

export function OpportunityMobileCard({
  opportunity,
  projectionSummary,
  onCardTap,
  onRowHover,
}: OpportunityMobileCardProps) {
  const handleTap = useCallback(() => {
    onCardTap(opportunity)
  }, [opportunity, onCardTap])

  const businessName = opportunity.business?.name || 'Negocio desconocido'
  const stageLabel = STAGE_LABELS[opportunity.stage] || opportunity.stage
  const stageStyle = STAGE_STYLES[opportunity.stage] || 'bg-gray-100 text-gray-600'

  const startDate = new Date(opportunity.startDate).toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
  })

  const closeDate = opportunity.closeDate
    ? new Date(opportunity.closeDate).toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        month: 'short',
        day: 'numeric',
      })
    : null
  const projectedRevenue = projectionSummary?.totalProjectedRevenue ?? 0
  const projectedRequests = projectionSummary?.projectedRequests ?? 0
  const totalRequests = projectionSummary?.totalRequests ?? 0
  const projectionSource = projectionSummary?.projectionSource ?? 'none'
  const projectionSourceLabel = getProjectionSourceLabel(projectionSource)
  const projectionText = projectedRevenue > 0
    ? `Proy. $${Math.round(projectedRevenue).toLocaleString('en-US')} · ${projectionSourceLabel}${projectedRequests > 0 ? ` · ${projectedRequests}/${totalRequests}` : ' · Guía'}`
    : 'Proy. Sin datos'

  return (
    <div
      onClick={handleTap}
      onMouseEnter={onRowHover}
      className="px-4 py-3.5 border-b border-gray-100 bg-white active:bg-gray-50 transition-colors"
    >
      {/* Top row: Business name + Stage pill */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-gray-900 leading-tight truncate flex-1">
          {businessName}
        </h3>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${stageStyle}`}>
          {stageLabel}
        </span>
      </div>

      {/* Date row */}
      <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-gray-500">
        <CalendarTodayIcon style={{ fontSize: 13 }} className="text-gray-400" />
        <span>{startDate}</span>
        {closeDate && (
          <>
            <ArrowForwardIcon style={{ fontSize: 11 }} className="text-gray-300" />
            <span>{closeDate}</span>
          </>
        )}
        {opportunity.responsible && (
          <>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="text-gray-400 truncate">
              {opportunity.responsible.name || opportunity.responsible.email}
            </span>
          </>
        )}
      </div>

      {/* Notes preview */}
      {opportunity.notes && (
        <p className="mt-1.5 text-[12px] text-gray-400 line-clamp-1">
          {opportunity.notes}
        </p>
      )}

      <div className="mt-1.5">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            projectedRevenue > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {projectionText}
        </span>
      </div>
    </div>
  )
}
