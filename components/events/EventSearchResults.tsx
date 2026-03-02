'use client'

import { getCategoryColors } from '@/lib/categories'
import { formatShortDateWithWeekday } from '@/lib/date'
import type { Event } from '@/types'

interface EventSearchResultsProps {
  events: Event[]
  searchQuery: string
  onEventClick?: (event: Event) => void
  onClearSearch: () => void
}

export default function EventSearchResults({ events, searchQuery, onEventClick, onClearSearch }: EventSearchResultsProps) {
  // Filter events based on search query
  const filteredEvents = events.filter(event => {
    const query = searchQuery.toLowerCase()
    return (
      event.name.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.business?.toLowerCase().includes(query) ||
      event.linkedBusinessName?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query) ||
      event.parentCategory?.toLowerCase().includes(query) ||
      event.subCategory1?.toLowerCase().includes(query) ||
      event.subCategory2?.toLowerCase().includes(query)
    )
  })

  const getCategoryDisplay = (event: Event) => {
    if (event.parentCategory) {
      const parts = [event.parentCategory]
      if (event.subCategory1) parts.push(event.subCategory1)
      if (event.subCategory2) parts.push(event.subCategory2)
      return parts.join(' > ')
    }
    return event.category || '-'
  }

  const getStatusClasses = (status: Event['status']) => {
    if (status === 'booked') return 'bg-green-100 text-green-800'
    if (status === 'pre-booked') return 'bg-blue-100 text-blue-800'
    if (status === 'approved') return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Search Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          </div>
          <button
            onClick={onClearSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Back to Calendar
          </button>
        </div>
      </div>

      {/* Results Cards */}
      <div className="flex-1 overflow-auto p-6">
        {filteredEvents.length > 0 ? (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const colors = getCategoryColors(event.parentCategory)

              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${colors.indicator} flex-shrink-0 mt-1`} />
                      <h3 className="text-sm font-semibold text-gray-900 leading-5 line-clamp-2">{event.name}</h3>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-[11px] font-semibold rounded-full ${getStatusClasses(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="mb-3 rounded-md bg-gray-50 border border-gray-100 px-2.5 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Dates</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {formatShortDateWithWeekday(event.startDate)} - {formatShortDateWithWeekday(event.endDate)}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-700">
                    <p>
                      <span className="font-semibold text-gray-900">Merchant:</span> {event.business || '-'}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-900">Category:</span> {getCategoryDisplay(event)}
                    </p>
                    {event.description && (
                      <p className="text-gray-600 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try searching with different keywords
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
