'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import CategoriesSidebar from '@/components/calendar/CategoriesSidebar'
import PendingRequestsSidebar from '@/components/booking/PendingRequestsSidebar'
import CalendarView from '@/components/calendar/CalendarView'
import DayEventsModal from '@/components/calendar/DayEventsModal'
import { updateEvent, refreshCalendarData } from '@/app/actions/events'
import type { Event, BookingRequest, UserRole } from '@/types'

// Lazy load heavy modal component
const EventModal = dynamic(() => import('@/components/events/EventModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

interface EventsPageClientProps {
  events: Event[]
  bookingRequests: BookingRequest[]
  userRole: UserRole
}

export default function EventsPageClient({ events: initialEvents, bookingRequests: initialBookingRequests, userRole }: EventsPageClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>(initialBookingRequests)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showPendingBooking, setShowPendingBooking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined)
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null)
  const [bookingRequestId, setBookingRequestId] = useState<string | undefined>(undefined)
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null)
  const [dayModalEvents, setDayModalEvents] = useState<Event[]>([])
  const [draggingRequest, setDraggingRequest] = useState<BookingRequest | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [shouldLoadModal, setShouldLoadModal] = useState(false)

  const openEventModal = () => {
    setShouldLoadModal(true)
    setIsModalOpen(true)
  }

  // Refresh calendar data - fetches only events/bookings, NOT user data
  // This avoids Clerk API calls on calendar changes
  const refreshData = useCallback(async () => {
    const result = await refreshCalendarData()
    if (result.success) {
      if (result.events) setEvents(result.events)
      if (result.bookingRequests) setBookingRequests(result.bookingRequests as BookingRequest[])
    }
  }, [])

  // Update local state when props change
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    setBookingRequests(initialBookingRequests)
  }, [initialBookingRequests])
  
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
    openEventModal()
  }

  const handleDateRangeSelect = (startDate: Date, endDate: Date) => {
    // Only admins can create events directly
    if (userRole !== 'admin') return
    setSelectedDate(startDate)
    setSelectedEndDate(endDate)
    openEventModal()
  }

  const handleEventClick = (event: Event) => {
    // All users can view events, but only admins can edit
    setEventToEdit(event)
    setSelectedDate(undefined)
    setSelectedEndDate(undefined)
    openEventModal()
  }

  const formatDateForServer = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleEventMove = async (event: Event, newStartDate: Date, newEndDate: Date) => {
    // Only admins can move events
    if (userRole !== 'admin') return
    
    // Optimistic update: update event in UI immediately
    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      endDate: newEndDate,
    }
    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
    
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
      // Refresh data in background (fetches only events/bookings, NOT user data)
      refreshData()
    } catch (error) {
      // Rollback on error
      setEvents(prev => prev.map(e => e.id === event.id ? event : e))
      console.error('Failed to move event:', error)
    }
  }

  const handleEventResize = async (event: Event, newEndDate: Date) => {
    // Only admins can resize events
    if (userRole !== 'admin') return
    
    // Optimistic update: update event in UI immediately
    const updatedEvent = {
      ...event,
      endDate: newEndDate,
    }
    setEvents(prev => prev.map(e => e.id === event.id ? updatedEvent : e))
    
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
      // Refresh data in background (fetches only events/bookings, NOT user data)
      refreshData()
    } catch (error) {
      // Rollback on error
      setEvents(prev => prev.map(e => e.id === event.id ? event : e))
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
    setBookingRequestId(undefined)
  }

  const handleEventSuccess = (event: Event, action: 'create' | 'update' | 'delete' | 'book' | 'reject') => {
    if (action === 'create') {
      // Add new event to the top
      setEvents(prev => [event, ...prev])
    } else if (action === 'update') {
      // Update existing event
      setEvents(prev => prev.map(e => e.id === event.id ? event : e))
    } else if (action === 'delete') {
      // Remove event
      setEvents(prev => prev.filter(e => e.id !== event.id))
    } else if (action === 'book' || action === 'reject') {
      // Update event status
      setEvents(prev => prev.map(e => e.id === event.id ? event : e))
      
      // Also update the linked booking request status to remove it from PendingRequestsSidebar
      if (event.bookingRequestId) {
        setBookingRequests(prev => prev.map(r => 
          r.id === event.bookingRequestId 
            ? { ...r, status: action === 'book' ? 'booked' : 'rejected' } 
            : r
        ))
      }
    }
    // Refresh data in background (fetches only events/bookings, NOT user data)
    refreshData()
  }

  const handleDayModalClose = () => {
    setIsDayModalOpen(false)
    setDayModalDate(null)
    setDayModalEvents([])
  }

  const handleRequestClick = (request: BookingRequest) => {
    // If the request has a linked event, open that event for editing (with Approve/Reject buttons)
    if (request.eventId) {
      const linkedEvent = events.find(e => e.id === request.eventId)
      if (linkedEvent) {
        setEventToEdit(linkedEvent)
        setBookingRequestId(undefined)
        setSelectedDate(undefined)
        setSelectedEndDate(undefined)
        openEventModal()
        return
      }
    }
    
    // Fallback: Open the request details in the event modal (create mode)
    setEventToEdit(null)
    setBookingRequestId(request.id)
    openEventModal()
  }

  const handleRequestDragStart = (request: BookingRequest | null) => {
    setDraggingRequest(request)
  }

  const handleRequestDropOnDate = async (request: BookingRequest, date: Date) => {
    // Import category duration check
    const { getMaxDuration } = await import('@/lib/categories')
    
    // Determine duration based on category (7 days for hotels/restaurants/shows, 5 days for others)
    const durationDays = getMaxDuration(request.parentCategory || null)
    
    // Calculate new dates
    const startDateStr = formatDateForServer(date)
    const newEndDate = new Date(date)
    newEndDate.setDate(newEndDate.getDate() + durationDays - 1)
    const endDateStr = formatDateForServer(newEndDate)
    
    // Calculate dates in local timezone for immediate UI update
    const newStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
    const newEndDateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate() + durationDays - 1, 12, 0, 0)
    
    // Update the booking request (which also updates the linked event)
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
    
    const result = await updateBookingRequest(request.id, formData)
    
    setDraggingRequest(null)
    
    if (result.success) {
      // Optimistically update local booking requests state
      setBookingRequests(prev => prev.map(r => 
        r.id === request.id 
          ? { ...r, startDate: newStartDate, endDate: newEndDateLocal }
          : r
      ))
      
      // Optimistically update local events state (find the linked event by bookingRequestId)
      setEvents(prev => prev.map(e => 
        e.bookingRequestId === request.id
          ? { ...e, startDate: newStartDate, endDate: newEndDateLocal }
          : e
      ))
      
      // Refresh data in background (fetches only events/bookings, NOT user data)
      refreshData()
    } else {
      console.error('Failed to update booking request:', result.error)
    }
  }

  // Listen for custom events from header buttons
  useEffect(() => {
    const handleOpenModal = () => openEventModal()
    
    window.addEventListener('openEventModal', handleOpenModal)
    
    return () => {
      window.removeEventListener('openEventModal', handleOpenModal)
    }
  }, [])

  // Sales users should never see pending requests - admin only feature
  const canSeePendingRequests = userRole === 'admin'
  const effectiveShowPendingBooking = canSeePendingRequests && showPendingBooking

  return (
    <>
      <div className="h-full flex">
        {/* Sidebar - Categories or Pending Requests (admin only) */}
        {effectiveShowPendingBooking ? (
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
            showPendingBooking={effectiveShowPendingBooking}
            onPendingBookingToggle={canSeePendingRequests ? () => setShowPendingBooking(!showPendingBooking) : undefined}
            userRole={userRole}
          />
        )}

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Calendar View */}
          <div className="flex-1 overflow-hidden">
            <CalendarView 
              events={events} 
              selectedCategories={calendarSelectedCategories}
              showPendingBooking={effectiveShowPendingBooking}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              draggingRequest={draggingRequest}
              bookingRequests={bookingRequests}
              onSearchChange={setSearchQuery}
              onRequestDropOnDate={userRole === 'admin' ? handleRequestDropOnDate : undefined}
              onDateClick={userRole === 'admin' ? handleDateClick : undefined}
              onDateRangeSelect={userRole === 'admin' ? handleDateRangeSelect : undefined}
              onEventClick={handleEventClick}
              onEventMove={userRole === 'admin' ? handleEventMove : undefined}
              onEventResize={userRole === 'admin' ? handleEventResize : undefined}
              onDayExpand={handleDayExpand}
              readOnly={userRole !== 'admin'}
            />
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {shouldLoadModal && (
        <EventModal 
          isOpen={isModalOpen} 
          onClose={handleModalClose}
          selectedDate={selectedDate}
          selectedEndDate={selectedEndDate}
          eventToEdit={eventToEdit}
          bookingRequestId={bookingRequestId}
          allEvents={events}
          userRole={userRole}
          readOnly={userRole === 'sales' && !!eventToEdit}
          onSuccess={handleEventSuccess}
        />
      )}

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
