'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import HamburgerMenu from './HamburgerMenu'
import { deleteEvent } from '@/app/actions/events'
import { getCategoryColors } from '@/lib/categories'
import type { Event } from '@/types'

interface ReservationsClientProps {
  events: Event[]
}

export default function ReservationsClient({ events }: ReservationsClientProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter events based on search
  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.merchant?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort by start date (newest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  )

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedEvents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedEvents.map(e => e.id)))
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return

    const count = selectedIds.size
    const confirmed = confirm(`¿Estás seguro de que quieres eliminar ${count} reservación(es)?`)
    
    if (!confirmed) return

    setDeleting(true)
    
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteEvent(id))
      )
      setSelectedIds(new Set())
      router.refresh()
    } catch (error) {
      alert('Error deleting reservations')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const day = d.getUTCDate()
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    return `${monthNames[month]} ${day}, ${year}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HamburgerMenu />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="ml-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reservations List</h1>
              <p className="text-gray-600 mt-1">{events.length} total reservations</p>
            </div>

            {selectedIds.size > 0 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete ({selectedIds.size})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by name, category, or merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={sortedEvents.length > 0 && selectedIds.size === sortedEvents.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Merchant</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">End Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        {searchTerm ? 'No reservations found matching your search' : 'No reservations yet'}
                      </td>
                    </tr>
                  ) : (
                    sortedEvents.map((event) => {
                      const colors = getCategoryColors(event.category)
                      const start = new Date(event.startDate)
                      const end = new Date(event.endDate)
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      
                      return (
                        <tr 
                          key={event.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            selectedIds.has(event.id) ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(event.id)}
                              onChange={() => toggleSelect(event.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{event.name}</div>
                            {event.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{event.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {event.category ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                {event.category}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {event.merchant || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(start)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDate(end)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {days} {days === 1 ? 'day' : 'days'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

