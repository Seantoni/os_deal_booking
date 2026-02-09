'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { formatShortDate } from '@/lib/date'
import { deleteEvent, refreshCalendarData } from '@/app/actions/events'
import { getCategoryColors } from '@/lib/categories'
import type { Event } from '@/types'
import SearchIcon from '@mui/icons-material/Search'
import DeleteIcon from '@mui/icons-material/Delete'
import FilterListIcon from '@mui/icons-material/FilterList'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { Input, Button } from '@/components/ui'

interface ReservationsClientProps {
  events: Event[]
  usersMap?: Record<string, { name: string | null; email: string | null }>
}

export default function ReservationsClient({ events: initialEvents, usersMap = {} }: ReservationsClientProps) {
  const { role: userRole } = useUserRole()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleCount, setVisibleCount] = useState(50)
  const confirmDialog = useConfirmDialog()
  
  const isAdmin = userRole === 'admin'

  // Update local state when props change
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  // Refresh events data without full page refresh
  // This avoids Clerk API calls on event updates
  const refreshData = useCallback(async () => {
    const result = await refreshCalendarData()
    if (result.success && result.events) {
      setEvents(result.events)
    }
  }, [])

  // Clear selection when user is not admin
  useEffect(() => {
    if (!isAdmin) {
      setSelectedIds(new Set())
    }
  }, [isAdmin])

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    return events.filter(event => 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.business?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [events, searchTerm])

  // Sort by start date (newest first)
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )
  }, [filteredEvents])

  // Paginated events for display
  const visibleEvents = useMemo(() => {
    return sortedEvents.slice(0, visibleCount)
  }, [sortedEvents, visibleCount])

  const toggleSelect = (id: string) => {
    if (!isAdmin) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (!isAdmin) return
    if (selectedIds.size === sortedEvents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedEvents.map(e => e.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Reservaciones',
      message: `¿Está seguro de que desea eliminar ${count} reservación${count > 1 ? 'es' : ''}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })
    
    if (!confirmed) return

    setDeleting(true)
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteEvent(id))
      )
      setSelectedIds(new Set())
      toast.success(`Se eliminaron exitosamente ${count} reservación${count > 1 ? 'es' : ''}`)
      // Refresh data in background (fetches only events, NOT user data)
      refreshData()
    } catch (error) {
      toast.error('Error al eliminar las reservaciones')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-[300px]">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar reservaciones..."
                size="sm"
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'reservación' : 'reservaciones'}
            </div>
          </div>

          {isAdmin && selectedIds.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              {deleting ? (
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <DeleteIcon className="w-4 h-4" />
              )}
              <span>Eliminar ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-[13px] text-left">
            <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-500">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-[5px] w-10">
                    <input
                      type="checkbox"
                      checked={sortedEvents.length > 0 && selectedIds.size === sortedEvents.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                  </th>
                )}
                <th className="px-4 py-[5px]">Nombre</th>
                <th className="px-4 py-[5px]">Categoría</th>
                <th className="px-4 py-[5px]">Merchant</th>
                <th className="px-4 py-[5px]">Creado Por</th>
                <th className="px-4 py-[5px]">Fecha de Inicio</th>
                <th className="px-4 py-[5px]">Fecha de Fin</th>
                <th className="px-4 py-[5px] text-right">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEvents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FilterListIcon className="w-8 h-8 text-gray-400" />
                      <p>{searchTerm ? 'No se encontraron reservaciones que coincidan con su búsqueda' : 'Aún no hay reservaciones'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleEvents.map((event) => {
                  // Use parentCategory for colors if available, fallback to category
                  const categoryForColor = event.parentCategory || event.category
                  const colors = getCategoryColors(categoryForColor)
                  const start = new Date(event.startDate)
                  const end = new Date(event.endDate)
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                  
                  return (
                    <tr 
                      key={event.id}
                      className={`group transition-colors hover:bg-gray-50 ${
                        selectedIds.has(event.id) ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="px-4 py-[5px]">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(event.id)}
                            onChange={() => toggleSelect(event.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        </td>
                      )}
                      <td className="px-4 py-[5px] font-medium text-gray-900">
                        <div className="truncate max-w-[200px]" title={event.name}>
                          {event.name}
                        </div>
                        {event.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]" title={event.description}>
                            {event.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-[5px]">
                        {(event.parentCategory || event.category) ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${colors.bg} ${colors.text}`}>
                              {event.parentCategory || event.category}
                            </span>
                            {(event.subCategory1 || event.subCategory2) && (
                              <span className="text-[10px] text-gray-500 ml-1 truncate max-w-[150px]">
                                {[event.subCategory1, event.subCategory2].filter(Boolean).join(' › ')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-[5px] text-gray-600">
                        {event.business || '-'}
                      </td>
                      <td className="px-4 py-[5px] text-gray-600">
                        {usersMap[event.userId]?.name || usersMap[event.userId]?.email || '-'}
                      </td>
                      <td className="px-4 py-[5px] text-gray-600 whitespace-nowrap">
                        {formatShortDate(start)}
                      </td>
                      <td className="px-4 py-[5px] text-gray-600 whitespace-nowrap">
                        {formatShortDate(end)}
                      </td>
                      <td className="px-4 py-[5px] text-right text-gray-600">
                        {days} {days === 1 ? 'día' : 'días'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {visibleCount < sortedEvents.length && (
          <div className="p-4 border-t border-gray-100 text-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setVisibleCount((c) => c + 50)}
            >
              Cargar Más
            </Button>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}

