'use client'

import { useState } from 'react'
import { getCategoryColors } from '@/lib/categories'
import { formatShortDateNoYear } from '@/lib/date'
import { buildCategoryDisplayString } from '@/types'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import type { BookingRequest } from '@/types'

interface PendingRequestsSidebarProps {
  requests: BookingRequest[]
  filteredCategory: string | null
  onRequestClick?: (request: BookingRequest) => void
  onRequestDragStart?: (request: BookingRequest | null) => void
  onCategoryFilter?: (category: string | null) => void
  onBackClick: () => void
}

export default function PendingRequestsSidebar({ requests, filteredCategory, onRequestClick, onRequestDragStart, onCategoryFilter, onBackClick }: PendingRequestsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Get category display using centralized utility
  const getCategoryDisplay = (request: BookingRequest) => {
    const display = buildCategoryDisplayString(request)
    return display || '-'
  }

  // Filter requests based on search
  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      request.name.toLowerCase().includes(query) ||
      request.merchant?.toLowerCase().includes(query) ||
      request.businessEmail.toLowerCase().includes(query) ||
      getCategoryDisplay(request).toLowerCase().includes(query)
    )
  })

return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Pending Requests</h2>
          <button
            onClick={onBackClick}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Back to categories"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        
        <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-2">
          <p className="font-medium text-blue-900 flex items-center gap-1.5">
            <LightbulbIcon style={{ fontSize: 16 }} />
            Drag & Drop
          </p>
          <p className="mt-1">Drag requests to calendar to set launch date</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredRequests.length > 0 ? (
          <div className="space-y-2">
            {filteredRequests.map((request) => {
              const colors = getCategoryColors(request.parentCategory)
              const isFiltered = filteredCategory === request.parentCategory
              
              return (
                <div
                  key={request.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', request.id)
                    e.dataTransfer.setData('application/json', JSON.stringify(request))
                    // Set a drag image for better UX
                    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
                    dragImage.style.opacity = '0.5'
                    document.body.appendChild(dragImage)
                    e.dataTransfer.setDragImage(dragImage, 0, 0)
                    setTimeout(() => document.body.removeChild(dragImage), 0)
                    onRequestDragStart?.(request)
                  }}
                  onDragEnd={() => {
                    // Clear drag state when drag ends (if drag was cancelled)
                    onRequestDragStart?.(null)
                  }}
                  className={`bg-white border rounded-lg p-3 hover:shadow-md transition-all group cursor-move ${
                    isFiltered 
                      ? 'border-blue-500 shadow-md ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Request Header */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${colors.indicator} flex-shrink-0 mt-0.5`}></div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onRequestClick?.(request)}
                    >
                      <h3 className="font-semibold text-sm text-gray-900 truncate" title={request.name}>
                        {request.name}
                      </h3>
                      {request.merchant && (
                        <p className="text-xs text-gray-600 truncate">{request.merchant}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isFiltered) {
                          onCategoryFilter?.(null)
                        } else {
                          onCategoryFilter?.(request.parentCategory || null)
                        }
                      }}
                      className={`p-1 rounded transition-colors flex-shrink-0 ${
                        isFiltered
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                      }`}
                      title={isFiltered ? 'Clear category filter' : 'Filter calendar by this category'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </button>
                  </div>

                  {/* Source Type Badge - Top of details */}
                  <div className={`mb-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold ${
                    request.sourceType === 'public_link' 
                      ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                  }`}>
                    {request.sourceType === 'public_link' ? (
                      <PublicIcon className="w-3 h-3" />
                    ) : (
                      <LockIcon className="w-3 h-3" />
                    )}
                    <span>{request.sourceType === 'public_link' ? 'PUBLIC LINK' : 'INTERNAL'}</span>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="truncate">{getCategoryDisplay(request)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatShortDateNoYear(request.startDate)} - {formatShortDateNoYear(request.endDate)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{request.businessEmail}</span>
                    </div>
                  </div>

                  {/* Drag Indicator */}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5 text-[10px] text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span>Drag to calendar</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-3 py-8 text-sm text-gray-500 text-center">
            {searchQuery ? 'No requests found' : 'No pending requests'}
          </div>
        )}
      </div>
    </div>
  )
}

