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
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Canal de Estado de Oferta</h3>
        {saving && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Guardando...</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 ring-2 ring-blue-500'
                      : isCompleted
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-gray-50 text-gray-500 border border-gray-200'
                  } ${
                    isClickable && !saving
                      ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-700'
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  {isCompleted && <CheckCircleIcon fontSize="small" />}
                  <span>{statusItem.label}</span>
                </button>
                {index < DEAL_STATUSES.length - 1 && (
                  <div className={`h-px w-4 ${
                    currentIndex > index ? 'bg-green-300' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

