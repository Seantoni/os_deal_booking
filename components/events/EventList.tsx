'use client'

import { deleteEvent, refreshCalendarData } from '@/app/actions/events'
import { useState, useCallback, useEffect } from 'react'
import { getCategoryColors } from '@/lib/categories'
import { formatDateUTC } from '@/lib/date'
import type { Event } from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'

interface EventListProps {
  events: Event[]
}

export default function EventList({ events: initialEvents }: EventListProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const confirmDialog = useConfirmDialog()

  // Update local state when props change
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  // Refresh events data without full page refresh
  const refreshData = useCallback(async () => {
    const result = await refreshCalendarData()
    if (result.success && result.events) {
      setEvents(result.events)
    }
  }, [])

  async function handleDelete(eventId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Evento',
      message: '¿Está seguro de que desea eliminar este evento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setDeletingId(eventId)
    // Optimistic update
    setEvents(prev => prev.filter(e => e.id !== eventId))
    try {
      await deleteEvent(eventId)
      toast.success('Evento eliminado exitosamente')
      // Refresh data in background (fetches only events, NOT user data)
      refreshData()
    } catch (error) {
      // Rollback on error - refresh to restore correct state
      refreshData()
      toast.error('Error al eliminar el evento')
    } finally {
      setDeletingId(null)
    }
  }

if (events.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
        <p className="text-gray-500">Aún no hay eventos. ¡Cree su primer evento!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div
          key={event.id}
          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-lg">{event.name}</h3>
                {event.category && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColors(event.category).bg} ${getCategoryColors(event.category).text}`}>
                    {event.category}
                  </span>
                )}
              </div>
              {event.business && (
                <p className="text-gray-700 text-sm font-medium mt-1">
                  Aliado: {event.business}
                </p>
              )}
              {event.description && (
                <p className="text-gray-600 mt-1 text-sm">{event.description}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Inicio:</span>
                  <span>{formatDateUTC(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Fin:</span>
                  <span>{formatDateUTC(event.endDate)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(event.id)}
              disabled={deletingId === event.id}
              className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
            >
              {deletingId === event.id ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      ))}
      
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

