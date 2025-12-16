'use client'

import { useState } from 'react'
import { updateOpportunity } from '@/app/actions/crm'
import type { Opportunity, OpportunityStage } from '@/types'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import NotesIcon from '@mui/icons-material/Notes'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import GroupsIcon from '@mui/icons-material/Groups'
import SendIcon from '@mui/icons-material/Send'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import AssignmentIcon from '@mui/icons-material/Assignment'

interface OpportunityKanbanProps {
  opportunities: Opportunity[]
  onUpdate: () => void
  onCreateRequest: (opportunity: Opportunity) => void
  onCardClick?: (opportunity: Opportunity) => void
}

const STAGES: OpportunityStage[] = [
  'iniciacion',
  'reunion',
  'propuesta_enviada',
  'propuesta_aprobada',
  'won',
  'lost',
]

const STAGE_LABELS: Record<OpportunityStage, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Propuesta Aprobada',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_COLORS: Record<OpportunityStage, { bg: string; border: string; text: string; headerBg: string; accent: string }> = {
  iniciacion: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-gray-500',
  },
  reunion: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-blue-500',
  },
  propuesta_enviada: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-amber-500',
  },
  propuesta_aprobada: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-indigo-500',
  },
  won: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-emerald-500',
  },
  lost: {
    bg: 'bg-gray-50/50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    headerBg: 'bg-gray-50',
    accent: 'text-red-400',
  },
}

const STAGE_ICONS: Record<OpportunityStage, React.ElementType> = {
  iniciacion: PlayCircleOutlineIcon,
  reunion: GroupsIcon,
  propuesta_enviada: SendIcon,
  propuesta_aprobada: ThumbUpIcon,
  won: EmojiEventsIcon,
  lost: ThumbDownIcon,
}

export default function OpportunityKanban({ opportunities, onUpdate, onCreateRequest, onCardClick }: OpportunityKanbanProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [draggedOverStage, setDraggedOverStage] = useState<OpportunityStage | null>(null)

  function handleDragStart(e: React.DragEvent, opportunityId: string) {
    setDraggedItem(opportunityId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', opportunityId)
  }

  function handleDragOver(e: React.DragEvent, stage: OpportunityStage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOverStage(stage)
  }

  function handleDragLeave() {
    setDraggedOverStage(null)
  }

  async function handleDrop(e: React.DragEvent, targetStage: OpportunityStage) {
    e.preventDefault()
    setDraggedOverStage(null)
    
    if (!draggedItem) return

    const opportunity = opportunities.find(o => o.id === draggedItem)
    if (!opportunity || opportunity.stage === targetStage) {
      setDraggedItem(null)
      return
    }

    const formData = new FormData()
    formData.append('stage', targetStage)
    formData.append('startDate', new Date(opportunity.startDate).toISOString().split('T')[0])
    if (opportunity.closeDate) {
      formData.append('closeDate', new Date(opportunity.closeDate).toISOString().split('T')[0])
    }
    if (opportunity.notes) {
      formData.append('notes', opportunity.notes)
    }

    const result = await updateOpportunity(opportunity.id, formData)
    if (result.success) {
      onUpdate()
    }
    setDraggedItem(null)
  }

  function getOpportunitiesByStage(stage: OpportunityStage) {
    return opportunities.filter(o => o.stage === stage)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {STAGES.map((stage) => {
            const stageOpportunities = getOpportunitiesByStage(stage)
            const colors = STAGE_COLORS[stage]
            const isDraggedOver = draggedOverStage === stage
            const Icon = STAGE_ICONS[stage]

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-60 flex flex-col ${colors.bg} ${colors.border} border rounded-lg transition-all ${
                  isDraggedOver ? 'ring-2 ring-blue-300 ring-offset-1' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Column Header */}
                <div className={`${colors.headerBg} px-3 py-2 rounded-t-lg border-b ${colors.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={colors.accent} style={{ fontSize: 16 }} />
                      <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">
                        {STAGE_LABELS[stage]}
                      </h3>
                    </div>
                    <span className="px-1.5 py-0.5 bg-white text-gray-600 rounded-full text-[10px] font-semibold min-w-[20px] text-center border border-gray-200">
                      {stageOpportunities.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px]">
                  {stageOpportunities.map((opportunity) => {
                    const isDragging = draggedItem === opportunity.id
                    return (
                      <div
                        key={opportunity.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, opportunity.id)}
                        onClick={(e) => {
                          // Only open modal if not dragging and not clicking on button
                          if (!isDragging && onCardClick && !(e.target as HTMLElement).closest('button')) {
                            onCardClick(opportunity)
                          }
                        }}
                        className={`group bg-white rounded border border-gray-200 p-2.5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all ${
                          isDragging ? 'opacity-40' : ''
                        }`}
                      >
                        {/* Business Name */}
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                            <BusinessIcon className="text-gray-400 mt-0.5 flex-shrink-0" style={{ fontSize: 16 }} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 truncate leading-tight">
                                {opportunity.business?.name || 'Unknown Business'}
                              </h4>
                            </div>
                          </div>
                          <DragIndicatorIcon className="text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 16 }} />
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-500">
                          <CalendarTodayIcon style={{ fontSize: 14 }} />
                          <span>
                            {new Date(opportunity.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {opportunity.closeDate && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>
                                {new Date(opportunity.closeDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Notes */}
                        {opportunity.notes && (
                          <div className="flex items-start gap-1.5 mb-1.5 text-xs text-gray-600 bg-gray-50 rounded p-1.5">
                            <NotesIcon className="text-gray-400 mt-0.5 flex-shrink-0" style={{ fontSize: 14 }} />
                            <p className="line-clamp-2 flex-1 leading-relaxed">{opportunity.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {opportunity.stage === 'won' && !opportunity.hasRequest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCreateRequest(opportunity)
                            }}
                            className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1 bg-emerald-500 text-white text-xs font-medium rounded hover:bg-emerald-600 transition-colors"
                          >
                            <CheckCircleIcon style={{ fontSize: 14 }} />
                            Create Request
                          </button>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Empty State */}
                  {stageOpportunities.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <AssignmentIcon style={{ fontSize: 32, opacity: 0.3 }} />
                      <p className="text-[10px] font-medium mt-1.5">Drop opportunities here</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
