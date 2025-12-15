'use client'

import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { Opportunity } from '@/types'

interface OpportunitiesSectionProps {
  opportunities: Opportunity[]
  onEditOpportunity: (opportunity: Opportunity) => void
  onCreateNew: () => void
}

export default function OpportunitiesSection({
  opportunities,
  onEditOpportunity,
  onCreateNew,
}: OpportunitiesSectionProps) {
  const stageColors: Record<string, string> = {
    iniciacion: 'bg-gray-100 text-gray-800',
    reunion: 'bg-blue-100 text-blue-800',
    propuesta_enviada: 'bg-yellow-100 text-yellow-800',
    propuesta_aprobada: 'bg-purple-100 text-purple-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  }

  const stageLabels: Record<string, string> = {
    iniciacion: 'Iniciación',
    reunion: 'Reunión',
    propuesta_enviada: 'Propuesta Enviada',
    propuesta_aprobada: 'Propuesta Aprobada',
    won: 'Won',
    lost: 'Lost',
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="text-orange-600" fontSize="small" />
          <h3 className="text-sm font-bold text-gray-700">Opportunities</h3>
          {opportunities.length > 0 && (
            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
              {opportunities.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors shadow-sm"
        >
          <AddIcon fontSize="small" />
          New Opportunity
        </button>
      </div>
      
      <div className="p-4">
        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUpIcon className="text-gray-300 mx-auto mb-2" style={{ fontSize: 40 }} />
            <p className="text-sm text-gray-500 mb-3">No opportunities yet</p>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
            >
              <AddIcon fontSize="small" />
              Create First Opportunity
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => onEditOpportunity(opp)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${stageColors[opp.stage] || 'bg-gray-100 text-gray-800'}`}>
                        {stageLabels[opp.stage] || opp.stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarTodayIcon fontSize="small" />
                        <span>
                          {new Date(opp.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {opp.closeDate && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>
                            Close: {new Date(opp.closeDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    {opp.notes && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{opp.notes}</p>
                    )}
                  </div>
                  <ArrowForwardIcon className="text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" fontSize="small" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

