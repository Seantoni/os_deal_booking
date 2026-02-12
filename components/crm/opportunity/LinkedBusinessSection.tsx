'use client'

import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { Business } from '@/types'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'

interface LinkedBusinessSectionProps {
  business: Business
  projectionSummary?: ProjectionEntitySummary | null
  onEdit: (business: Business) => void
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

export default function LinkedBusinessSection({ business, projectionSummary, onEdit }: LinkedBusinessSectionProps) {
  const projectedRevenue = projectionSummary?.totalProjectedRevenue ?? 0
  const projectedRequests = projectionSummary?.projectedRequests ?? 0
  const totalRequests = projectionSummary?.totalRequests ?? 0
  const projectionSource = projectionSummary?.projectionSource ?? 'none'
  const projectionSourceLabel = getProjectionSourceLabel(projectionSource)
  const projectionText = projectedRevenue > 0
    ? `Proy. $${Math.round(projectedRevenue).toLocaleString('en-US')} · ${projectionSourceLabel}${projectedRequests > 0 ? ` · ${projectedRequests}/${totalRequests}` : ' · Guía'}`
    : 'Proy. Sin datos'

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BusinessIcon className="text-blue-600" style={{ fontSize: 16 }} />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Negocio Vinculado</h3>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        <button
          type="button"
          onClick={() => onEdit(business)}
          className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
              <h4 className="font-medium text-gray-900 truncate">
                {business.name}
              </h4>
              {business.tier && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-medium whitespace-nowrap flex-shrink-0">
                  Nivel {business.tier}
                </span>
              )}
              {business.contactName && (
                <>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <PersonIcon style={{ fontSize: 12 }} className="flex-shrink-0" />
                    <span className="truncate text-gray-500">{business.contactName}</span>
                  </div>
                </>
              )}
              {business.contactPhone && (
                <>
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  <div className="flex items-center gap-1 min-w-0">
                    <PhoneIcon style={{ fontSize: 12 }} className="flex-shrink-0" />
                    <span className="truncate text-gray-500">{business.contactPhone}</span>
                  </div>
                </>
              )}
              <>
                <span className="text-gray-400 flex-shrink-0">•</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                    projectedRevenue > 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {projectionText}
                </span>
              </>
            </div>
            <ArrowForwardIcon className="text-gray-400 group-hover:text-blue-600 flex-shrink-0 transition-colors" style={{ fontSize: 12 }} />
          </div>
        </button>
      </div>
    </div>
  )
}
