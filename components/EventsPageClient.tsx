'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CategoriesSidebar from './CategoriesSidebar'
import PendingRequestsSidebar from './PendingRequestsSidebar'
import CalendarView from './CalendarView'
import EventModal from './EventModal'
import DayEventsModal from './DayEventsModal'
import HamburgerMenu from './HamburgerMenu'
import { updateEvent } from '@/app/actions/events'
import { ParsedBookingData } from '@/app/actions/pdf-parse'

type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
  status: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

type BookingRequest = {
  id: string
  name: string
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  merchant: string | null
  businessEmail: string
  startDate: Date
  endDate: Date
  status: string
  eventId: string | null
  userId: string
  processedAt: Date | null
  processedBy: string | null
  rejectionReason: string | null
  createdAt: Date
  updatedAt: Date
}

interface EventsPageClientProps {
  events: Event[]
  bookingRequests: BookingRequest[]
  userRole: 'admin' | 'sales'
}

export default function EventsPageClient({ events, bookingRequests, userRole }: EventsPageClientProps) {
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showPendingBooking, setShowPendingBooking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined)
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null)
  const [dayModalEvents, setDayModalEvents] = useState<Event[]>([])
  const [pdfExtractedData, setPdfExtractedData] = useState<ParsedBookingData | null>(null)
  const [draggingRequest, setDraggingRequest] = useState<BookingRequest | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  
  // Filter booking requests to only show approved ones
  const pendingRequests = bookingRequests.filter(r => r.status === 'approved')
  
  // When category filter is active, filter calendar to show only booked events in that category
  const calendarSelectedCategories = categoryFilter ? [categoryFilter] : selectedCategories

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
    // Only admins can create events directly
    if (userRole !== 'admin') return
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    // Only admins can create events directly
    if (userRole !== 'admin') return
    setSelectedDate(startDate)
    setSelectedEndDate(endDate)
    setIsModalOpen(true)
  }

  const handleEventClick = (event: Event) => {
    // Only admins can edit events
    if (userRole !== 'admin') return
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
      formData.set('parentCategory', event.parentCategory || '')
      formData.set('subCategory1', event.subCategory1 || '')
      formData.set('subCategory2', event.subCategory2 || '')
      formData.set('subCategory3', event.subCategory3 || '')
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
      formData.set('parentCategory', event.parentCategory || '')
      formData.set('subCategory1', event.subCategory1 || '')
      formData.set('subCategory2', event.subCategory2 || '')
      formData.set('subCategory3', event.subCategory3 || '')
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

  const handleRequestClick = (request: BookingRequest) => {
    // Open the request details in the event modal
    setEventToEdit(null)
    setPdfExtractedData({
      name: request.name,
      description: request.description || '',
      merchant: request.merchant || '',
      businessEmail: request.businessEmail,
      suggestedStartDate: formatDateForServer(request.startDate),
      suggestedEndDate: formatDateForServer(request.endDate),
      category: request.category || '',
      parentCategory: request.parentCategory || '',
      subCategory1: request.subCategory1 || '',
      subCategory2: request.subCategory2 || '',
      subCategory3: request.subCategory3 || ''
    })
    setIsModalOpen(true)
  }

  const handleRequestDragStart = (request: BookingRequest) => {
    setDraggingRequest(request)
  }

  const handleRequestDropOnDate = async (request: BookingRequest, date: Date) => {
    // Import category duration check
    const { SEVEN_DAY_CATEGORIES } = await import('@/lib/categories')
    const { parseDateInPanamaTime, parseEndDateInPanamaTime } = await import('@/lib/timezone')
    
    // Determine duration based on category
    const isSevenDayCategory = request.parentCategory && SEVEN_DAY_CATEGORIES.includes(request.parentCategory as any)
    const durationDays = isSevenDayCategory ? 7 : 1
    
    // Calculate new dates
    const startDateStr = formatDateForServer(date)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + durationDays - 1)
    const endDateStr = formatDateForServer(endDate)
    
    // Update the booking request
    const { updateBookingRequest } = await import('@/app/actions/booking-requests')
    const formData = new FormData()
    formData.append('name', request.name)
    formData.append('description', request.description || '')
    formData.append('merchant', request.merchant || '')
    formData.append('businessEmail', request.businessEmail)
    formData.append('startDate', startDateStr)
    formData.append('endDate', endDateStr)
    formData.append('category', request.category || '')
    formData.append('parentCategory', request.parentCategory || '')
    formData.append('subCategory1', request.subCategory1 || '')
    formData.append('subCategory2', request.subCategory2 || '')
    formData.append('subCategory3', request.subCategory3 || '')
    
    await updateBookingRequest(request.id, formData)
    
    setDraggingRequest(null)
    router.refresh()
  }

  // Listen for custom events from header buttons
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true)
    const handlePDFData = (e: unknown) => {
      const customEvent = e as CustomEvent<ParsedBookingData>
      if (customEvent && customEvent.detail) {
        handlePDFDataExtracted(customEvent.detail)
      }
    }
    
    window.addEventListener('openEventModal', handleOpenModal)
    window.addEventListener('pdfDataExtracted', handlePDFData as EventListener)
    
    return () => {
      window.removeEventListener('openEventModal', handleOpenModal)
      window.removeEventListener('pdfDataExtracted', handlePDFData as EventListener)
    }
  }, [])

  return (
    <>
      <div className="h-full flex">
        {/* Hamburger Menu */}
        <HamburgerMenu />
        
        {/* Sidebar - Categories or Pending Requests */}
        {showPendingBooking ? (
          <PendingRequestsSidebar
            requests={pendingRequests}
            filteredCategory={categoryFilter}
            onRequestClick={handleRequestClick}
            onRequestDragStart={handleRequestDragStart}
            onCategoryFilter={setCategoryFilter}
            onBackClick={() => {
              setShowPendingBooking(false)
              setCategoryFilter(null)
            }}
          />
        ) : (
          <CategoriesSidebar
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            showPendingBooking={showPendingBooking}
            onPendingBookingToggle={() => setShowPendingBooking(!showPendingBooking)}
          />
        )}

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Calendar View */}
          <div className="flex-1 overflow-hidden">
            <CalendarView 
              events={events} 
              selectedCategories={calendarSelectedCategories}
              showPendingBooking={showPendingBooking}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              draggingRequest={draggingRequest}
              onSearchChange={setSearchQuery}
              onRequestDropOnDate={handleRequestDropOnDate}
              onDateClick={handleDateClick}
              onDateRangeSelect={handleDateRangeSelect}
              onEventClick={handleEventClick}
              onEventMove={handleEventMove}
              onEventResize={handleEventResize}
              onDayExpand={handleDayExpand}
            />
          </div>
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
        userRole={userRole}
      />

      {/* Day Events Modal */}
      <DayEventsModal
        isOpen={isDayModalOpen}
        onClose={handleDayModalClose}
        date={dayModalDate}
        events={dayModalEvents}
        onEventClick={handleEventClick}
      />
    </>
  )
}

