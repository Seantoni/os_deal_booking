'use client'

import { STAGES, STAGE_LABELS } from './constants'
import type { OpportunityStage } from '@/types'
import CheckIcon from '@mui/icons-material/Check'

// Short labels for mobile view
const STAGE_LABELS_SHORT: Record<OpportunityStage, string> = {
  iniciacion: 'Inicio',
  reunion: 'Reunión',
  propuesta_enviada: 'Enviada',
  propuesta_aprobada: 'Aprobada',
  won: 'Won',
  lost: 'Lost',
}

interface OpportunityPipelineProps {
  stage: OpportunityStage
  onStageChange: (stage: OpportunityStage) => void
  saving?: boolean
}

export default function OpportunityPipeline({ stage, onStageChange, saving = false }: OpportunityPipelineProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Mobile: horizontally scrollable, Desktop: flex */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STAGES.map((s, index) => {
          const isActive = stage === s
          const isPast = STAGES.indexOf(stage) > index
          const isFuture = STAGES.indexOf(stage) < index
          const isLast = index === STAGES.length - 1

          return (
            <div key={s} className="flex items-center flex-shrink-0">
              <button
                type="button"
                onClick={() => onStageChange(s)}
                disabled={saving}
                className={`group relative flex items-center justify-center focus:outline-none border rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isPast
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                } ${
                  !saving
                    ? 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                    : 'opacity-75 cursor-wait'
                }`}
              >
                <div className="flex items-center gap-1 px-1.5 md:px-2">
                  {isPast && (
                    <CheckIcon className="text-emerald-600" style={{ fontSize: 12 }} />
                  )}
                  {/* Mobile: short label, Desktop: full label */}
                  <span className="text-[10px] md:text-xs font-semibold whitespace-nowrap md:truncate">
                    <span className="md:hidden">{STAGE_LABELS_SHORT[s]}</span>
                    <span className="hidden md:inline">{STAGE_LABELS[s]}</span>
                  </span>
                </div>
              </button>
              {!isLast && (
                <div className={`h-px w-4 ${
                  isPast ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      {saving && (
        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 flex-shrink-0">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Guardando...</span>
        </div>
      )}
    </div>
  )
}
