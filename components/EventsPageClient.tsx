'use client'

import { useState } from 'react'
import CategoriesSidebar from './CategoriesSidebar'
import CalendarView from './CalendarView'
import EventModal from './EventModal'

type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  startDate: Date
  endDate: Date
  userId: string
  createdAt: Date
  updatedAt: Date
}

interface EventsPageClientProps {
  events: Event[]
}

export default function EventsPageClient({ events }: EventsPageClientProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  return (
    <div className="h-full flex">
      {/* Categories Sidebar */}
      <CategoriesSidebar
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
      />

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Create Button Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-hidden">
          <CalendarView events={events} selectedCategories={selectedCategories} />
        </div>
      </div>

      {/* Event Modal */}
      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

