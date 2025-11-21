'use client'

import { getCategoryColors } from '@/lib/categories'
import type { Event } from '@/types'

interface DayEventsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  events: Event[]
  onEventClick: (event: Event) => void
}

export default function DayEventsModal({ isOpen, onClose, date, events, onEventClick }: DayEventsModalProps) {
  if (!isOpen || !date) return null

  const formatDate = (date: Date) => {
    // Use local date methods directly (date is already local from calendar)
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayOfWeek = dayNames[date.getDay()]
    
    return `${dayOfWeek}, ${monthNames[month]} ${day}, ${year}`
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-all"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {formatDate(date)}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Events List */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => {
                  // Use parent category for color
                  const colors = getCategoryColors(event.parentCategory)
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        onEventClick(event)
                        onClose()
                      }}
                      className={`p-4 rounded-lg border-l-4 ${colors.border} bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.name}</h3>
                          {event.category && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                              {event.category}
                            </span>
                          )}
                          {event.merchant && (
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Aliado:</strong> {event.merchant}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No events scheduled for this day
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
