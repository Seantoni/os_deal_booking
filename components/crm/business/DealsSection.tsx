'use client'

import { useState, useEffect } from 'react'
import ListAltIcon from '@mui/icons-material/ListAlt'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { Deal } from '@/types'
import { PANAMA_TIMEZONE, getDateComponentsInPanama } from '@/lib/date/timezone'

interface DealsSectionProps {
  deals: Deal[]
  onOpenDeal: (deal: Deal) => void
  businessName?: string
}

const ITEMS_PER_PAGE = 5

type FilterType = 'all' | 'in_progress' | 'approved'

export default function DealsSection({
  deals,
  onOpenDeal,
  businessName,
}: DealsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState<FilterType>('all')

  const statusColors: Record<string, string> = {
    pendiente_por_asignar: 'bg-gray-100 text-gray-800',
    asignado: 'bg-blue-100 text-blue-800',
    elaboracion: 'bg-amber-100 text-amber-800',
    borrador_enviado: 'bg-indigo-100 text-indigo-800',
    borrador_aprobado: 'bg-emerald-100 text-emerald-800',
  }

  const statusLabels: Record<string, string> = {
    pendiente_por_asignar: 'Pendiente',
    asignado: 'Asignado',
    elaboracion: 'Elaboración',
    borrador_enviado: 'Borrador Enviado',
    borrador_aprobado: 'Borrador Aprobado',
  }

  const getDealName = (deal: Deal): string => {
    const name = deal.bookingRequest?.name
    if (name && name.trim()) {
      return name.length > 50 ? `${name.substring(0, 47)}...` : name
    }

    const dateSource = deal.bookingRequest?.startDate || deal.createdAt
    const date = new Date(dateSource)
    const month = date.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short' })
    const { day, year } = getDateComponentsInPanama(date)
    return businessName ? `${businessName} - ${month}-${day}-${year}` : `Oferta ${month}-${day}-${year}`
  }

  const filteredDeals = deals.filter((deal) => {
    if (filter === 'all') return true
    if (filter === 'approved') return deal.status === 'borrador_aprobado'
    if (filter === 'in_progress') return deal.status !== 'borrador_aprobado'
    return true
  })

  const totalPages = Math.ceil(filteredDeals.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedDeals = filteredDeals.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredDeals.length, currentPage, totalPages])

  const approvedCount = deals.filter(d => d.status === 'borrador_aprobado').length
  const inProgressCount = deals.length - approvedCount

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <ListAltIcon className="text-emerald-600" style={{ fontSize: 16 }} />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Ofertas</h3>
            {filteredDeals.length > 0 && (
              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-semibold rounded">
                {filteredDeals.length}
              </span>
            )}
          </div>
        </div>

        {deals.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Todos ({deals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('in_progress')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'in_progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              En proceso ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('approved')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              Aprobadas ({approvedCount})
            </button>
          </div>
        )}
      </div>

      <div className="p-2">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-4">
            <ListAltIcon className="text-gray-400 mx-auto mb-1.5" style={{ fontSize: 32 }} />
            <p className="text-xs text-gray-500 mb-2">
              {deals.length === 0
                ? 'Aún no hay ofertas'
                : filter === 'approved'
                  ? 'No hay ofertas aprobadas'
                  : filter === 'in_progress'
                    ? 'No hay ofertas en proceso'
                    : 'No hay ofertas'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              {paginatedDeals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => onOpenDeal(deal)}
                  className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${statusColors[deal.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[deal.status] || deal.status}
                      </span>
                      <p className="text-xs font-medium text-gray-800 truncate min-w-0">
                        {getDealName(deal)}
                      </p>
                      {deal.bookingRequest?.startDate && deal.bookingRequest?.endDate && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-shrink-0">
                          <CalendarTodayIcon style={{ fontSize: 11 }} />
                          <span className="whitespace-nowrap">
                            {new Date(deal.bookingRequest.startDate).toLocaleDateString('en-US', {
                              timeZone: PANAMA_TIMEZONE,
                              month: 'short',
                              day: 'numeric',
                            })} — {new Date(deal.bookingRequest.endDate).toLocaleDateString('en-US', {
                              timeZone: PANAMA_TIMEZONE,
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowForwardIcon className="text-gray-400 group-hover:text-emerald-600 flex-shrink-0 transition-colors" style={{ fontSize: 12 }} />
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
                  Anterior
                </button>
                <span className="text-[10px] text-gray-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
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
