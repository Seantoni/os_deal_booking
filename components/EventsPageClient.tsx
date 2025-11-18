'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CategoriesSidebar from './CategoriesSidebar'
import CalendarView from './CalendarView'
import EventModal from './EventModal'
import DayEventsModal from './DayEventsModal'
import PDFUpload from './PDFUpload'
import { updateEvent } from '@/app/actions/events'
import { ParsedBookingData } from '@/app/actions/pdf-parse'

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

interface EventsPageClientProps {
  events: Event[]
}

export default function EventsPageClient({ events }: EventsPageClientProps) {
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined)
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null)
  const [dayModalEvents, setDayModalEvents] = useState<Event[]>([])
  const [pdfExtractedData, setPdfExtractedData] = useState<ParsedBookingData | null>(null)

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category)
      } else {
        return [...prev, category]
      }
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    setSelectedDate(startDate)
    setSelectedEndDate(endDate)
    setIsModalOpen(true)
  }

  const handleEventClick = (event: Event) => {
    setEventToEdit(event)
    setSelectedDate(undefined)
    setSelectedEndDate(undefined)
    setIsModalOpen(true)
  }

  const formatDateForServer = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleEventMove = async (event: Event, newStartDate: Date, newEndDate: Date) => {
    try {
      const formData = new FormData()
      formData.set('name', event.name)
      formData.set('description', event.description || '')
      formData.set('category', event.category || '')
      formData.set('merchant', event.merchant || '')
      formData.set('startDate', formatDateForServer(newStartDate))
      formData.set('endDate', formatDateForServer(newEndDate))
      
      await updateEvent(event.id, formData)
      router.refresh()
    } catch (error) {
      console.error('Failed to move event:', error)
    }
  }

  const handleEventResize = async (event: Event, newEndDate: Date) => {
    try {
      const formData = new FormData()
      formData.set('name', event.name)
      formData.set('description', event.description || '')
      formData.set('category', event.category || '')
      formData.set('merchant', event.merchant || '')
      
      // Keep original start date, only update end date
      const originalStart = new Date(event.startDate)
      const startYear = originalStart.getUTCFullYear()
      const startMonth = originalStart.getUTCMonth()
      const startDay = originalStart.getUTCDate()
      const startDateLocal = new Date(startYear, startMonth, startDay, 12, 0, 0)
      
      formData.set('startDate', formatDateForServer(startDateLocal))
      formData.set('endDate', formatDateForServer(newEndDate))
      
      await updateEvent(event.id, formData)
      router.refresh()
    } catch (error) {
      console.error('Failed to resize event:', error)
    }
  }

  const handleDayExpand = (date: Date, dayEvents: Event[]) => {
    setDayModalDate(date)
    setDayModalEvents(dayEvents)
    setIsDayModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedDate(undefined)
    setSelectedEndDate(undefined)
    setEventToEdit(null)
    setPdfExtractedData(null)
  }

  const handlePDFDataExtracted = (data: ParsedBookingData) => {
    setPdfExtractedData(data)
    setIsModalOpen(true)
  }

  const handleDayModalClose = () => {
    setIsDayModalOpen(false)
    setDayModalDate(null)
    setDayModalEvents([])
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
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </button>
          <PDFUpload onDataExtracted={handlePDFDataExtracted} />
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-hidden">
          <CalendarView 
            events={events} 
            selectedCategories={selectedCategories}
            onDateClick={handleDateClick}
            onDateRangeSelect={handleDateRangeSelect}
            onEventClick={handleEventClick}
            onEventMove={handleEventMove}
            onEventResize={handleEventResize}
            onDayExpand={handleDayExpand}
          />
        </div>
      </div>

      {/* Event Modal */}
      <EventModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        eventToEdit={eventToEdit}
        allEvents={events}
        pdfExtractedData={pdfExtractedData}
      />

      {/* Day Events Modal */}
      <DayEventsModal
        isOpen={isDayModalOpen}
        onClose={handleDayModalClose}
        date={dayModalDate}
        events={dayModalEvents}
        onEventClick={handleEventClick}
      />
    </div>
  )
}

