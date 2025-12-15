'use client'

import { STAGES, STAGE_LABELS, STAGE_COLORS } from './constants'
import type { OpportunityStage } from '@/types'
import CheckIcon from '@mui/icons-material/Check'

interface OpportunityPipelineProps {
  stage: OpportunityStage
  onStageChange: (stage: OpportunityStage) => void
  saving?: boolean
}

export default function OpportunityPipeline({ stage, onStageChange, saving = false }: OpportunityPipelineProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      {saving && (
        <div className="flex items-center justify-end mb-2 px-1">
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-1">
        {STAGES.map((s, index) => {
          const isActive = stage === s
          const isPast = STAGES.indexOf(stage) > index
          const isFuture = STAGES.indexOf(stage) < index
          const isLast = index === STAGES.length - 1
          
          const colors = STAGE_COLORS[s]
          let bgClass = colors.bg
          let textClass = colors.text
          let borderClass = colors.border
          let hoverClass = colors.hover
          let checkColor = colors.check
          
          if (isActive) {
            borderClass = s === 'reunion' ? 'border-blue-300' : s === 'propuesta_enviada' ? 'border-amber-300' : s === 'propuesta_aprobada' ? 'border-indigo-300' : s === 'won' ? 'border-emerald-300' : s === 'lost' ? 'border-red-300' : 'border-gray-300'
          } else if (isFuture) {
            bgClass = 'bg-gray-50'
            textClass = 'text-gray-400'
            borderClass = 'border-gray-100'
            hoverClass = 'hover:bg-gray-100'
            checkColor = 'text-gray-400'
          }

          return (
            <div key={s} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => onStageChange(s)}
                disabled={saving}
                className={`group relative flex-1 h-8 flex items-center justify-center focus:outline-none border rounded transition-all duration-200 ${bgClass} ${textClass} ${borderClass} ${hoverClass} ${
                  isActive ? `ring-2 ${s === 'reunion' ? 'ring-blue-300' : s === 'propuesta_enviada' ? 'ring-amber-300' : s === 'propuesta_aprobada' ? 'ring-indigo-300' : s === 'won' ? 'ring-emerald-300' : s === 'lost' ? 'ring-red-300' : 'ring-gray-300'} ring-offset-1` : ''
                } ${saving ? 'opacity-75 cursor-wait' : ''}`}
              >
                <div className="flex items-center gap-1.5 px-2">
                  {isPast && (
                    <CheckIcon className={checkColor} style={{ fontSize: 14 }} />
                  )}
                  <span className="text-xs font-semibold truncate">{STAGE_LABELS[s]}</span>
                </div>
              </button>
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

