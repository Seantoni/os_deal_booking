'use client'

import { useState, useEffect } from 'react'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import type { BookingRequest } from '@/types'
import type { BookingRequestProjectionValue } from '@/app/actions/revenue-projections'
import { PANAMA_TIMEZONE, getDateComponentsInPanama } from '@/lib/date/timezone'

interface RequestsSectionProps {
  requests: BookingRequest[]
  projectionMap?: Record<string, BookingRequestProjectionValue>
  onViewRequest: (request: BookingRequest) => void
  onCreateRequest?: () => void
  businessName?: string
  canEdit?: boolean
}

const ITEMS_PER_PAGE = 5

type FilterType = 'all' | 'active' | 'booked' | 'rejected'

export default function RequestsSection({
  requests,
  projectionMap = {},
  onViewRequest,
  onCreateRequest,
  businessName,
  canEdit = true,
}: RequestsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')
  
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    booked: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    pending: 'Pendiente',
    approved: 'Aprobado',
    booked: 'Reservado',
    rejected: 'Rechazado',
  }

  // Get request display name
  const getRequestName = (req: BookingRequest): string => {
    if (req.name && req.name.trim()) {
      return req.name.length > 50 ? req.name.substring(0, 47) + '...' : req.name
    }
    
    // Fallback to date-based name
    const date = new Date(req.createdAt)
    const month = date.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short' })
    const { day, year } = getDateComponentsInPanama(date)
    return businessName ? `${businessName} - ${month}-${day}-${year}` : `Solicitud ${month}-${day}-${year}`
  }

  const getProjectionSourceLabel = (source: BookingRequestProjectionValue['projectionSource']) => {
    switch (source) {
      case 'actual_deal':
        return 'Actual'
      case 'business_history':
        return 'Histórico'
      case 'category_benchmark':
        return 'Categoría'
      default:
        return 'Sin datos'
    }
  }

  // Filter requests based on selected filter
  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true
    if (filter === 'active') return req.status !== 'booked' && req.status !== 'rejected'
    if (filter === 'booked') return req.status === 'booked'
    if (filter === 'rejected') return req.status === 'rejected'
    return true
  })

  // Calculate pagination based on filtered requests
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex)

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  // Ensure current page is valid when data changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredRequests.length, currentPage, totalPages])

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <DescriptionIcon className="text-purple-600" style={{ fontSize: 16 }} />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Solicitudes</h3>
            {filteredRequests.length > 0 && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded">
                {filteredRequests.length}
              </span>
            )}
          </div>
          {onCreateRequest && canEdit && (
            <button
              type="button"
              onClick={onCreateRequest}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-purple-600 hover:bg-purple-700 rounded transition-colors"
            >
              <AddIcon style={{ fontSize: 14 }} />
              <span>Nueva Solicitud</span>
            </button>
          )}
        </div>
        
        {/* Quick Filters */}
        {requests.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Todos ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Activas ({requests.filter(r => r.status !== 'booked' && r.status !== 'rejected').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('booked')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'booked'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Reservadas ({requests.filter(r => r.status === 'booked').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('rejected')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Rechazadas ({requests.filter(r => r.status === 'rejected').length})
            </button>
          </div>
        )}
      </div>
      
      <div className="p-2">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-4">
            <DescriptionIcon className="text-gray-400 mx-auto mb-1.5" style={{ fontSize: 32 }} />
            <p className="text-xs text-gray-500 mb-2">
              {requests.length === 0 
                ? 'Aún no hay solicitudes'
                : `No hay solicitudes ${filter === 'all' ? '' : filter === 'active' ? 'activas' : filter === 'booked' ? 'reservadas' : 'rechazadas'}`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {paginatedRequests.map((req) => {
                const projection = projectionMap[req.id]
                return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => onViewRequest(req)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${statusColors[req.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[req.status] || req.status}
                      </span>
                      <p className="text-xs font-medium text-gray-800 truncate min-w-0">
                        {getRequestName(req)}
                      </p>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                        <CalendarTodayIcon style={{ fontSize: 11 }} />
                        <span className="whitespace-nowrap">
                          {new Date(req.startDate).toLocaleDateString('en-US', {
                            timeZone: PANAMA_TIMEZONE,
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {projection?.projectedRevenue !== null && projection?.projectedRevenue !== undefined && (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium whitespace-nowrap">
                          ${Math.round(projection.projectedRevenue).toLocaleString('en-US')} · {getProjectionSourceLabel(projection.projectionSource)}
                        </span>
                      )}
                    </div>
                    <ArrowForwardIcon className="text-gray-400 group-hover:text-purple-600 flex-shrink-0 transition-colors" style={{ fontSize: 12 }} />
                  </div>
                </button>
                )
              })}
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
                  <span>Anterior</span>
                </button>
                <span className="text-[10px] text-gray-500 font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Siguiente</span>
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
