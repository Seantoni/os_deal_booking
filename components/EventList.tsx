'use client'

import { deleteEvent } from '@/app/actions/events'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getCategoryColors } from '@/lib/categories'

type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
  userId: string
  createdAt: Date
  updatedAt: Date
}

export default function EventList({ events }: { events: Event[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    setDeletingId(eventId)
    try {
      await deleteEvent(eventId)
      router.refresh()
    } catch (error) {
      alert('Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  function formatDate(date: Date) {
    // Use UTC methods to avoid timezone shifts for date-only values
    const d = new Date(date)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const day = d.getUTCDate()
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    const localDate = new Date(year, month, day)
    const dayOfWeek = dayNames[localDate.getDay()]
    
    return `${dayOfWeek}, ${monthNames[month]} ${day}, ${year}`
  }

  if (events.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 text-center">
        <p className="text-gray-500">No events yet. Create your first event!</p>
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
              {event.merchant && (
                <p className="text-gray-700 text-sm font-medium mt-1">
                  Aliado: {event.merchant}
                </p>
              )}
              {event.description && (
                <p className="text-gray-600 mt-1 text-sm">{event.description}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Start:</span>
                  <span>{formatDate(event.startDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">End:</span>
                  <span>{formatDate(event.endDate)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDelete(event.id)}
              disabled={deletingId === event.id}
              className="ml-4 text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
            >
              {deletingId === event.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

