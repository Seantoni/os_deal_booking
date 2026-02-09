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

      {/* Results Table */}
      <div className="flex-1 overflow-auto p-6">
        {filteredEvents.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
              <tr>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Event Name
                </th>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Run At
                </th>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  End At
                </th>
                  <th className="px-4 py-[5px] text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => {
                const colors = getCategoryColors(event.parentCategory)
                const isBooked = event.status === 'booked'
                const isPreBooked = event.status === 'pre-booked'
                const isApproved = event.status === 'approved'
                
                return (
                  <tr
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                      <td className="px-4 py-[5px] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${colors.indicator} flex-shrink-0`}></div>
                        <span className="text-sm font-medium text-gray-900">{event.name}</span>
                      </div>
                    </td>
                      <td className="px-4 py-[5px] whitespace-nowrap">
                      <span className="text-sm text-gray-700">{event.business || '-'}</span>
                    </td>
                      <td className="px-4 py-[5px]">
                        <span className="text-sm text-gray-600">{getCategoryDisplay(event)}</span>
                      </td>
                      <td className="px-4 py-[5px] whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-medium">{formatShortDateWithWeekday(event.startDate)}</span>
                    </td>
                      <td className="px-4 py-[5px] whitespace-nowrap">
                        <span className="text-sm text-gray-900">{formatShortDateWithWeekday(event.endDate)}</span>
                    </td>
                      <td className="px-4 py-[5px] whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isBooked
                          ? 'bg-green-100 text-green-800'
                          : isPreBooked
                          ? 'bg-blue-100 text-blue-800'
                          : isApproved
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
