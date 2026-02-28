'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import CategoriesSidebar from '@/components/calendar/CategoriesSidebar'
import PendingRequestsSidebar from '@/components/booking/PendingRequestsSidebar'
import CalendarView from '@/components/calendar/CalendarView'
import DayEventsModal from '@/components/calendar/DayEventsModal'
import NewRequestModal from '@/components/booking/NewRequestModal'
import {
  updateEvent,
  refreshCalendarData,
  getCalendarPendingRequests,
} from '@/app/actions/events'
import FilterListIcon from '@mui/icons-material/FilterList'
import CloseIcon from '@mui/icons-material/Close'
import type { Event, BookingRequest, UserRole } from '@/types'

// Lazy load heavy modal component
const EventModal = dynamic(() => import('@/components/events/EventModal'), {
  loading: () => null, // Don't show loading overlay - modal handles its own loading state
  ssr: false,
})

type CalendarViewMode = 'day' | 'week' | 'month'

type CalendarRange = {
  startDate: string
  endDate: string
  view: CalendarViewMode
}

interface EventsPageClientProps {
  events: Event[]
  initialRange: CalendarRange
  initialPendingCount: number
  userRole: UserRole
}

function formatDateForServer(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function applyRangeBuffer(start: Date, end: Date, view: CalendarViewMode): CalendarRange {
  const bufferDays = view === 'month' ? 7 : view === 'week' ? 3 : 1

  const bufferedStart = new Date(start)
  bufferedStart.setDate(bufferedStart.getDate() - bufferDays)

  const bufferedEnd = new Date(end)
  bufferedEnd.setDate(bufferedEnd.getDate() + bufferDays)

  return {
    startDate: formatDateForServer(bufferedStart),
    endDate: formatDateForServer(bufferedEnd),
    view,
  }
}

function rangesEqual(a: CalendarRange, b: CalendarRange): boolean {
  return a.startDate === b.startDate && a.endDate === b.endDate && a.view === b.view
}

export default function EventsPageClient({
  events: initialEvents,
  initialRange,
  initialPendingCount,
  userRole,
}: EventsPageClientProps) {
  const searchParams = useSearchParams()

  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([])
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [hasLoadedPendingRequests, setHasLoadedPendingRequests] = useState(false)

  const [calendarRange, setCalendarRange] = useState<CalendarRange>(initialRange)
  const calendarRangeRef = useRef(initialRange)
  const hasSkippedInitialRangeFetch = useRef(false)

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
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Mini calendar navigation state
  const [externalCalendarDate, setExternalCalendarDate] = useState<Date | null>(null)
  const [externalCalendarView, setExternalCalendarView] = useState<CalendarViewMode | null>(null)
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date | null>(null)
  const [selectedMiniRange, setSelectedMiniRange] = useState<{ start: Date; end: Date } | null>(null)

  // New Request Modal state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)

  const openEventModal = () => {
    setShouldLoadModal(true)
    setIsModalOpen(true)
  }

  useEffect(() => {
    calendarRangeRef.current = calendarRange
  }, [calendarRange])

  // Update local state when server props change
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  useEffect(() => {
    setPendingCount(initialPendingCount)
  }, [initialPendingCount])

  const refreshEvents = useCallback(async () => {
    const range = calendarRangeRef.current
    const result = await refreshCalendarData({
      startDate: range.startDate,
      endDate: range.endDate,
    })

    if (result.success && result.events) {
      setEvents(result.events)
    }
  }, [])

  const loadPendingRequests = useCallback(async () => {
    const result = await getCalendarPendingRequests()
    if (result.success && result.data) {
      const requests = result.data as BookingRequest[]
      setPendingRequests(requests)
      setPendingCount(requests.length)
      setHasLoadedPendingRequests(true)
    }
  }, [])

  // Load events when visible calendar range changes
  useEffect(() => {
    if (!hasSkippedInitialRangeFetch.current && rangesEqual(calendarRange, initialRange)) {
      hasSkippedInitialRangeFetch.current = true
      return
    }
    hasSkippedInitialRangeFetch.current = true
    refreshEvents()
  }, [calendarRange, initialRange, refreshEvents])

  // Handle opening event from URL query params (e.g., from search)
  useEffect(() => {
    const openFromUrl = searchParams.get('open')
    if (openFromUrl && events.length > 0) {
      const event = events.find((e) => e.id === openFromUrl)
      if (event) {
        setEventToEdit(event)
        setSelectedDate(undefined)
        openEventModal()
      }
    }
  }, [searchParams, events])

  // When category filter is active, filter calendar to show only booked events in that category
  const calendarSelectedCategories = categoryFilter ? [categoryFilter] : selectedCategories

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category)
      }
      return [...prev, category]
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

  const handleEventMove = async (event: Event, newStartDate: Date, newEndDate: Date) => {
    // Only admins can move events
    if (userRole !== 'admin') return

    // Optimistic update: update event in UI immediately
    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      endDate: newEndDate,
    }
    setEvents((prev) => prev.map((e) => (e.id === event.id ? updatedEvent : e)))

    try {
      const formData = new FormData()
      formData.set('name', event.name)
      formData.set('description', event.description || '')
      formData.set('category', event.category || '')
      formData.set('parentCategory', event.parentCategory || '')
      formData.set('subCategory1', event.subCategory1 || '')
      formData.set('subCategory2', event.subCategory2 || '')
      formData.set('subCategory3', event.subCategory3 || '')
      formData.set('business', event.business || '')
      formData.set('businessId', event.businessId || '')
      formData.set('startDate', formatDateForServer(newStartDate))
      formData.set('endDate', formatDateForServer(newEndDate))

      await updateEvent(event.id, formData)
      // Refresh data in background (fetches only current event range)
      refreshEvents()
    } catch (error) {
      // Rollback on error
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
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
    setEvents((prev) => prev.map((e) => (e.id === event.id ? updatedEvent : e)))

    try {
      const formData = new FormData()
      formData.set('name', event.name)
      formData.set('description', event.description || '')
      formData.set('category', event.category || '')
      formData.set('parentCategory', event.parentCategory || '')
      formData.set('subCategory1', event.subCategory1 || '')
      formData.set('subCategory2', event.subCategory2 || '')
      formData.set('subCategory3', event.subCategory3 || '')
      formData.set('business', event.business || '')
      formData.set('businessId', event.businessId || '')

      // Keep original start date, only update end date
      const originalStart = new Date(event.startDate)
      const startYear = originalStart.getUTCFullYear()
      const startMonth = originalStart.getUTCMonth()
      const startDay = originalStart.getUTCDate()
      const startDateLocal = new Date(startYear, startMonth, startDay, 12, 0, 0)

      formData.set('startDate', formatDateForServer(startDateLocal))
      formData.set('endDate', formatDateForServer(newEndDate))

      await updateEvent(event.id, formData)
      // Refresh data in background (fetches only current event range)
      refreshEvents()
    } catch (error) {
      // Rollback on error
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
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
      setEvents((prev) => [event, ...prev])
    } else if (action === 'update') {
      // Update existing event
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
    } else if (action === 'delete') {
      // Remove event
      setEvents((prev) => prev.filter((e) => e.id !== event.id))
    } else if (action === 'book') {
      // Update event status for booked events
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))

      if (event.bookingRequestId) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== event.bookingRequestId))
        setPendingCount((prev) => Math.max(0, prev - 1))
      }
    } else if (action === 'reject') {
      // Remove event from calendar when rejected
      setEvents((prev) => prev.filter((e) => e.id !== event.id))

      if (event.bookingRequestId) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== event.bookingRequestId))
        setPendingCount((prev) => Math.max(0, prev - 1))
      }
    }

    // Refresh data in background (fetches only current event range)
    refreshEvents()
  }

  const handleDayModalClose = () => {
    setIsDayModalOpen(false)
    setDayModalDate(null)
    setDayModalEvents([])
  }

  const handleRequestClick = (request: BookingRequest) => {
    // If the request has a linked event, open that event for editing (with Approve/Reject buttons)
    if (request.eventId) {
      const linkedEvent = events.find((e) => e.id === request.eventId)
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

  // Mini calendar handlers
  const handleMiniCalendarDateSelect = (date: Date) => {
    setSelectedMiniDate(date)
    setSelectedMiniRange(null)
    setExternalCalendarDate(date)
    setExternalCalendarView('day')
  }

  const handleMiniCalendarRangeSelect = (startDate: Date, endDate: Date) => {
    setSelectedMiniDate(null)
    setSelectedMiniRange({ start: startDate, end: endDate })
    setExternalCalendarDate(startDate)
    // For range selection, show week view if range is 7 days or less, otherwise month
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    setExternalCalendarView(daysDiff <= 7 ? 'week' : 'month')
  }

  const handleMiniCalendarMonthSelect = (year: number, month: number) => {
    setSelectedMiniDate(null)
    setSelectedMiniRange(null)
    setExternalCalendarDate(new Date(year, month, 1))
    setExternalCalendarView('month')
  }

  const handleMiniCalendarClearSelection = () => {
    setSelectedMiniDate(null)
    setSelectedMiniRange(null)
    // Keep the current date but switch to month view
    setExternalCalendarView('month')
  }

  const handleCalendarViewChange = (view: CalendarViewMode) => {
    // When user clicks Day/Week/Month buttons, clear mini calendar selection
    // and show the standard calendar view
    setSelectedMiniDate(null)
    setSelectedMiniRange(null)
    setExternalCalendarView(view)
  }

  const handleCalendarDateChange = (date: Date) => {
    // When date changes in main calendar, update the selected mini date
    // only if we're in day view
    if (externalCalendarView === 'day') {
      setSelectedMiniDate(date)
    }
  }

  const handleCalendarVisibleRangeChange = useCallback((start: Date, end: Date, view: CalendarViewMode) => {
    const nextRange = applyRangeBuffer(start, end, view)
    setCalendarRange((prev) => (rangesEqual(prev, nextRange) ? prev : nextRange))
  }, [])

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
      // Optimistically update local pending requests state
      setPendingRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, startDate: newStartDate, endDate: newEndDateLocal } : r))
      )

      // Optimistically update local events state (find the linked event by bookingRequestId)
      setEvents((prev) =>
        prev.map((e) =>
          e.bookingRequestId === request.id ? { ...e, startDate: newStartDate, endDate: newEndDateLocal } : e
        )
      )

      // Refresh data in background (fetches only current event range)
      refreshEvents()
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

  const handlePendingBookingToggle = useCallback(async () => {
    const nextShowPending = !showPendingBooking

    if (nextShowPending && !hasLoadedPendingRequests) {
      await loadPendingRequests()
    }

    setShowPendingBooking(nextShowPending)
  }, [showPendingBooking, hasLoadedPendingRequests, loadPendingRequests])

  // Sales users should never see pending requests - admin only feature
  const canSeePendingRequests = userRole === 'admin'
  const effectiveShowPendingBooking = canSeePendingRequests && showPendingBooking

  return (
    <>
      <div className="h-full flex relative">
        {/* Mobile Filter Toggle Overlay */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileFilters(false)} />
        )}

        {/* Sidebar - Categories or Pending Requests (admin only) */}
        <div
          className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white transform transition-transform duration-300 shadow-xl md:shadow-none md:relative md:translate-x-0 md:w-auto md:block h-full
          ${showMobileFilters ? 'translate-x-0' : '-translate-x-full'}
        `}
        >
          <div className="h-full flex flex-col">
            {/* Mobile Sidebar Header */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-semibold text-gray-800">Filtros y Categorías</span>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-full"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {effectiveShowPendingBooking ? (
                <PendingRequestsSidebar
                  requests={pendingRequests}
                  filteredCategory={categoryFilter}
                  onRequestClick={handleRequestClick}
                  onRequestDragStart={handleRequestDragStart}
                  onCategoryFilter={setCategoryFilter}
                  onNavigateToDate={(date) => {
                    setSelectedMiniDate(null)
                    setSelectedMiniRange(null)
                    setExternalCalendarDate(date)
                    setExternalCalendarView('month')
                  }}
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
                  onPendingBookingToggle={canSeePendingRequests ? handlePendingBookingToggle : undefined}
                  userRole={userRole}
                  onMiniCalendarDateSelect={handleMiniCalendarDateSelect}
                  onMiniCalendarRangeSelect={handleMiniCalendarRangeSelect}
                  onMiniCalendarMonthSelect={handleMiniCalendarMonthSelect}
                  onMiniCalendarClearSelection={handleMiniCalendarClearSelection}
                  selectedMiniDate={selectedMiniDate}
                  selectedMiniRange={selectedMiniRange}
                  events={events}
                  pendingCount={pendingCount}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile Filter Trigger */}
          <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-medium text-gray-600">Vista Calendario</span>
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium border border-gray-200 transition-colors"
            >
              <FilterListIcon style={{ fontSize: 16 }} />
              Filtros
            </button>
          </div>

          {/* Calendar View */}
          <div className="flex-1 overflow-hidden relative z-0">
            <CalendarView
              events={events}
              selectedCategories={calendarSelectedCategories}
              showPendingBooking={effectiveShowPendingBooking}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              draggingRequest={draggingRequest}
              bookingRequests={pendingRequests}
              onSearchChange={setSearchQuery}
              onRequestDropOnDate={userRole === 'admin' ? handleRequestDropOnDate : undefined}
              onDateClick={userRole === 'admin' ? handleDateClick : undefined}
              onDateRangeSelect={userRole === 'admin' ? handleDateRangeSelect : undefined}
              onEventClick={handleEventClick}
              onEventMove={userRole === 'admin' ? handleEventMove : undefined}
              onEventResize={userRole === 'admin' ? handleEventResize : undefined}
              onDayExpand={handleDayExpand}
              readOnly={userRole !== 'admin'}
              externalDate={externalCalendarDate}
              externalView={externalCalendarView}
              externalRange={selectedMiniRange}
              onViewChange={handleCalendarViewChange}
              onCurrentDateChange={handleCalendarDateChange}
              onVisibleRangeChange={handleCalendarVisibleRangeChange}
              onNewRequestClick={() => setShowNewRequestModal(true)}
              onCreateEventClick={openEventModal}
              userRole={userRole}
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

      {/* New Request Modal */}
      <NewRequestModal isOpen={showNewRequestModal} onClose={() => setShowNewRequestModal(false)} />
    </>
  )
}
