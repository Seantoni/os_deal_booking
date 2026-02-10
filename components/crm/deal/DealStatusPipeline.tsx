'use client'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { DEAL_STATUSES } from './constants'

interface DealStatusPipelineProps {
  status: string
  onStatusChange: (status: string) => void
  isAdmin: boolean
  saving?: boolean
}

export default function DealStatusPipeline({ status, onStatusChange, isAdmin, saving = false }: DealStatusPipelineProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {DEAL_STATUSES.map((statusItem, index) => {
          const isActive = status === statusItem.id
          const currentIndex = DEAL_STATUSES.findIndex(s => s.id === status)
          const isCompleted = currentIndex > index
          const isClickable = isAdmin && (index === 0 || currentIndex >= index - 1)

          return (
            <div key={statusItem.id} className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (isClickable) {
                    onStatusChange(statusItem.id)
                  }
                }}
                disabled={!isClickable || saving}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                } ${
                  isClickable && !saving
                    ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                    : 'cursor-not-allowed opacity-60'
                }`}
              >
                {isCompleted && <CheckCircleIcon style={{ fontSize: 14 }} />}
                <span>{statusItem.label}</span>
              </button>
              {index < DEAL_STATUSES.length - 1 && (
                <div className={`h-px w-3 ${
                  currentIndex > index ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      {saving && (
        <div className="flex items-center gap-1 text-[10px] text-blue-600 flex-shrink-0">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Guardando...</span>
        </div>
      )}
    </div>
  )
}
