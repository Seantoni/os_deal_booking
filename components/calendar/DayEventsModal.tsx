'use client'

import { getCategoryColors } from '@/lib/categories'
import { formatFullDateWithWeekday } from '@/lib/date'
import { useModalEscape } from '@/hooks/useModalEscape'
import type { Event } from '@/types'

interface DayEventsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  events: Event[]
  onEventClick: (event: Event) => void
}

export default function DayEventsModal({ isOpen, onClose, date, events, onEventClick }: DayEventsModalProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  if (!isOpen || !date) return null

return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center md:p-3 pointer-events-none">
        {/* Modal Panel - Mobile: full screen, Desktop: centered */}
        <div className="w-full max-w-md bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-auto md:max-h-[85vh] pointer-events-auto transform transition-all duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {formatFullDateWithWeekday(date)}
            </h2>
            <p className="text-[11px] text-slate-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
          </div>
            <button
              onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Events List */}
        <div className="overflow-y-auto max-h-[50vh]">
            {events.length > 0 ? (
            <div className="divide-y divide-slate-100">
                {events.map((event) => {
                  const colors = getCategoryColors(event.parentCategory)
                const isPending = event.status === 'pending'
                const isBooked = event.status === 'booked' || event.status === 'pre-booked'
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        onEventClick(event)
                        onClose()
                      }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    {/* Color indicator */}
                    <div className={`w-1 h-8 rounded-full ${colors.indicator} flex-shrink-0`} />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-slate-800 truncate">{event.name}</h3>
                        {isPending && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded">
                            PENDING
                            </span>
                          )}
                        {!isBooked && !isPending && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-100 text-yellow-700 rounded">
                            NOT BOOKED
                          </span>
                          )}
                        </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.business && (
                          <span className="text-[11px] text-slate-500 truncate">{event.business}</span>
                        )}
                        {event.business && event.parentCategory && (
                          <span className="text-slate-300">•</span>
                        )}
                        {event.parentCategory && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}>
                            {event.parentCategory}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No events scheduled
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
