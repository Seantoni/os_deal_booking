'use client'

import { DEAL_STATUS_LABELS, DEAL_STATUS_COLORS } from './constants'
import CheckIcon from '@mui/icons-material/Check'
import type { Deal } from '@/types'

interface DealPipelineProps {
  deal: Deal
}

export default function DealPipeline({ deal }: DealPipelineProps) {
  const statuses = ['asignado', 'elaboracion', 'imagenes', 'borrador_enviado', 'borrador_aprobado']
  
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Deal Pipeline</h3>
      </div>
      <div className="flex items-center gap-1">
        {statuses.map((s, index) => {
          const isActive = deal.status === s
          const isPast = statuses.indexOf(deal.status) > index
          const isLast = index === statuses.length - 1
          
          const colors = DEAL_STATUS_COLORS[s] || DEAL_STATUS_COLORS.asignado
          let bgClass = colors.bg
          let textClass = colors.text
          let borderClass = colors.border
          
          if (isActive) {
            borderClass = s === 'elaboracion' ? 'border-blue-300' : s === 'imagenes' ? 'border-purple-300' : s === 'borrador_enviado' ? 'border-yellow-300' : s === 'borrador_aprobado' ? 'border-emerald-300' : 'border-gray-300'
          } else if (!isPast) {
            bgClass = 'bg-gray-50'
            textClass = 'text-gray-400'
            borderClass = 'border-gray-100'
          }

          return (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex-1 h-7 flex items-center justify-center border rounded transition-all duration-200 ${bgClass} ${textClass} ${borderClass}`}
              >
                <div className="flex items-center gap-1.5 px-2">
                  {isPast && (
                    <CheckIcon className={isPast ? colors.text : 'text-gray-400'} style={{ fontSize: 12 }} />
                  )}
                  <span className="text-[10px] font-semibold truncate">{DEAL_STATUS_LABELS[s]}</span>
                </div>
              </div>
              {!isLast && (
                <div className="w-1 h-0.5 bg-gray-200 flex-shrink-0"></div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

