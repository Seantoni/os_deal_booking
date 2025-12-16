'use client'

import { useState, useEffect } from 'react'
import HandshakeIcon from '@mui/icons-material/Handshake'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { Opportunity } from '@/types'

interface OpportunitiesSectionProps {
  opportunities: Opportunity[]
  onEditOpportunity: (opportunity: Opportunity) => void
  onCreateNew: () => void
  businessName?: string
}

const ITEMS_PER_PAGE = 5

type FilterType = 'all' | 'open' | 'won' | 'lost'

export default function OpportunitiesSection({
  opportunities,
  onEditOpportunity,
  onCreateNew,
  businessName,
}: OpportunitiesSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')
  
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

  // Get opportunity name/title
  const getOpportunityName = (opp: Opportunity): string => {
    // If name exists in database, use it
    if (opp.name && opp.name.trim()) {
      return opp.name
    }
    
    // Fallback: Generate default format: Business Name - Date of creation (Jan-1-2025 format)
    const date = new Date(opp.createdAt)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const year = date.getFullYear()
    const creationDate = `${month}-${day}-${year}` // Format: Jan-1-2025
    const defaultName = businessName ? `${businessName} - ${creationDate}` : creationDate
    
    // If notes exist and name doesn't, consider using notes
    if (opp.notes && opp.notes.trim()) {
      const firstLine = opp.notes.split('\n')[0].trim()
      // Use notes if substantial, otherwise use default format
      if (firstLine.length > 10) {
        return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine
      }
    }
    
    // Default: Business Name - Date
    return defaultName
  }

  // Filter opportunities based on selected filter
  const filteredOpportunities = opportunities.filter((opp) => {
    if (filter === 'all') return true
    if (filter === 'open') return opp.stage !== 'won' && opp.stage !== 'lost'
    if (filter === 'won') return opp.stage === 'won'
    if (filter === 'lost') return opp.stage === 'lost'
    return true
  })

  // Calculate pagination based on filtered opportunities
  const totalPages = Math.ceil(filteredOpportunities.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOpportunities = filteredOpportunities.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes or if current page is out of bounds
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredOpportunities.length, currentPage, totalPages])

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <HandshakeIcon className="text-orange-600" style={{ fontSize: 16 }} />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Opportunities</h3>
            {filteredOpportunities.length > 0 && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded">
                {filteredOpportunities.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-orange-600 rounded hover:bg-orange-700 transition-colors"
          >
            <AddIcon style={{ fontSize: 14 }} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
        
        {/* Quick Filters */}
        {opportunities.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              All ({opportunities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('open')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'open'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Open ({opportunities.filter(o => o.stage !== 'won' && o.stage !== 'lost').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('won')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'won'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Won ({opportunities.filter(o => o.stage === 'won').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('lost')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'lost'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Lost ({opportunities.filter(o => o.stage === 'lost').length})
            </button>
          </div>
        )}
      </div>
      
      <div className="p-2">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-4">
            <HandshakeIcon className="text-gray-400 mx-auto mb-1.5" style={{ fontSize: 32 }} />
            <p className="text-xs text-gray-500 mb-2">
              {opportunities.length === 0 
                ? 'No opportunities yet'
                : `No ${filter === 'all' ? '' : filter} opportunities`}
            </p>
            {opportunities.length === 0 && (
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 transition-colors"
              >
                <AddIcon style={{ fontSize: 14 }} />
                Create First
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {paginatedOpportunities.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => onEditOpportunity(opp)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${stageColors[opp.stage] || 'bg-gray-100 text-gray-800'}`}>
                        {stageLabels[opp.stage] || opp.stage}
                      </span>
                      <p className="text-xs font-medium text-gray-800 truncate min-w-0">
                        {getOpportunityName(opp)}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                        <CalendarTodayIcon style={{ fontSize: 11 }} />
                        <span className="whitespace-nowrap">
                          {new Date(opp.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <ArrowForwardIcon className="text-gray-400 group-hover:text-orange-600 flex-shrink-0 transition-colors" style={{ fontSize: 12 }} />
                  </div>
                </button>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon style={{ fontSize: 14 }} />
                  <span>Prev</span>
                </button>
                <span className="text-[10px] text-gray-500 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRightIcon style={{ fontSize: 14 }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

