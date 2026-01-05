'use client'

import { useState, useMemo } from 'react'
import { getDaysDifference, getCategoryColors } from '@/lib/categories'
import { getEventsOnDate, getDailyLimitStatus } from '@/lib/event-validation'
import { getSettings } from '@/lib/settings'
import { formatDateForPanama, PANAMA_TIMEZONE } from '@/lib/date/timezone'
import EventSearchResults from '@/components/events/EventSearchResults'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import type { Event, BookingRequest } from '@/types'
import './CalendarView.css'

type ViewMode = 'launch' | 'live'
type CalendarViewMode = 'month' | 'week' | 'day'

interface CalendarViewProps {
  events: Event[]
  selectedCategories: string[]
  showPendingBooking: boolean
  categoryFilter?: string | null
  searchQuery?: string
  draggingRequest?: BookingRequest | null
  bookingRequests?: BookingRequest[]
  onSearchChange?: (query: string) => void
  onRequestDropOnDate?: (request: BookingRequest, date: Date) => void
  onDateClick?: (date: Date) => void
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void
  onEventClick?: (event: Event) => void
  onEventMove?: (event: Event, newStartDate: Date, newEndDate: Date) => void
  onEventResize?: (event: Event, newEndDate: Date) => void
  onDayExpand?: (date: Date, events: Event[]) => void
  readOnly?: boolean
}

export default function CalendarView({ events, selectedCategories, showPendingBooking, categoryFilter, searchQuery = '', draggingRequest, bookingRequests = [], onSearchChange, onRequestDropOnDate, onDateClick, onDateRangeSelect, onEventClick, onEventMove, onEventResize, onDayExpand, readOnly = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dragStartDay, setDragStartDay] = useState<number | null>(null)
  const [dragEndDay, setDragEndDay] = useState<number | null>(null)

  // Create lookup map for source type by bookingRequestId
  const sourceTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    bookingRequests.forEach(req => {
      if (req.id) {
        map.set(req.id, req.sourceType || 'internal')
      }
    })
    return map
  }, [bookingRequests])
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('live')
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month')
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null)
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null)
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null)
  const [resizeStartDay, setResizeStartDay] = useState<number | null>(null)
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null)
  const userSettings = getSettings()

  // Filter events by categories and booking status
  const filteredEvents = useMemo(() => {
    let filtered = events
    
    // When NOT in pending booking view (categories sidebar visible), only show booked and pre-booked events
    // When IN pending booking view (pending requests sidebar visible), show all events
    if (!showPendingBooking) {
      filtered = filtered.filter(event => event.status === 'booked' || event.status === 'pre-booked')
    }
    
    // Filter by categories
    if (selectedCategories.length === 0) return filtered
    
    return filtered.filter(event => {
       // Check if any of the event's hierarchy matches the selected categories
       // selectedCategories can contain composite keys like "Main", "Main:Sub", "Main:Sub:Leaf".
       
       const parent = event.parentCategory;
       // Ensure we handle potential nulls
       const sub1 = parent && event.subCategory1 ? `${parent}:${event.subCategory1}` : null;
       const sub2 = sub1 && event.subCategory2 ? `${sub1}:${event.subCategory2}` : null;

       // Direct legacy match or composite key match
       if (parent && selectedCategories.includes(parent)) {
         return true;
       }
       if (sub1 && selectedCategories.includes(sub1)) {
         return true;
       }
       if (sub2 && selectedCategories.includes(sub2)) {
         return true;
       }
       
       // Fallback for legacy category field
       if (event.category && selectedCategories.includes(event.category)) {
         return true;
       }

       return false;
    })
  }, [events, selectedCategories, showPendingBooking, categoryFilter])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const day = currentDate.getDate()

  // Calculate range based on calendar view mode
  const getViewRange = () => {
    if (calendarView === 'day') {
      // Show just the selected day
      return {
        startDay: day,
        endDay: day,
        startingDayOfWeek: new Date(year, month, day).getDay(),
        daysToShow: 1
      }
    } else if (calendarView === 'week') {
      // Show the week containing the current date
      const dayOfWeek = new Date(year, month, day).getDay()
      const startOfWeek = day - dayOfWeek
      const endOfWeek = startOfWeek + 6
      return {
        startDay: Math.max(1, startOfWeek),
        endDay: Math.min(new Date(year, month + 1, 0).getDate(), endOfWeek),
        startingDayOfWeek: 0,
        daysToShow: 7
      }
    } else {
      // Month view - show full month
      const firstDayOfMonth = new Date(year, month, 1)
      const lastDayOfMonth = new Date(year, month + 1, 0)
      return {
        startDay: 1,
        endDay: lastDayOfMonth.getDate(),
        startingDayOfWeek: firstDayOfMonth.getDay(),
        daysToShow: lastDayOfMonth.getDate()
      }
    }
  }

  const viewRange = getViewRange()
  const { startDay, endDay, startingDayOfWeek, daysToShow } = viewRange
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const navigatePrevious = () => {
    if (calendarView === 'day') {
      setCurrentDate(new Date(year, month, day - 1))
    } else if (calendarView === 'week') {
      setCurrentDate(new Date(year, month, day - 7))
    } else {
      setCurrentDate(new Date(year, month - 1, 1))
    }
  }

  const navigateNext = () => {
    if (calendarView === 'day') {
      setCurrentDate(new Date(year, month, day + 1))
    } else if (calendarView === 'week') {
      setCurrentDate(new Date(year, month, day + 7))
    } else {
      setCurrentDate(new Date(year, month + 1, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getHeaderTitle = () => {
    if (calendarView === 'day') {
      return currentDate.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    } else if (calendarView === 'week') {
      const weekStart = new Date(year, month, day - new Date(year, month, day).getDay())
      const weekEnd = new Date(year, month, day + (6 - new Date(year, month, day).getDay()))
      return `${weekStart.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return `${monthNames[month]} ${year}`
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Process events for display - mutually exclusive views
  const { eventsByDate, spanningEvents } = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {}
    const spanning: Array<Event & { startDay: number; endDay: number; spanDays: number }> = []
    
    if (viewMode === 'launch') {
      // Launch date mode: ONLY show on start date as blocks (ALL VIEWS)
      filteredEvents.forEach(event => {
        const startDate = new Date(event.startDate)
        // Use UTC methods to avoid timezone shift
        const eventYear = startDate.getUTCFullYear()
        const eventMonth = startDate.getUTCMonth()
        const eventDay = startDate.getUTCDate()
        
        // Check if start date is within current view range
        if (eventMonth === month && eventYear === year && 
            eventDay >= startDay && eventDay <= endDay) {
          const dateKey = `${year}-${month}-${eventDay}`
          if (!grouped[dateKey]) {
            grouped[dateKey] = []
          }
          grouped[dateKey].push(event)
        }
      })
    } else {
      // Live dates mode: ONLY show as spanning bars (ALL VIEWS - Month, Week, Day)
      filteredEvents.forEach(event => {
        const startDate = new Date(event.startDate)
        const endDate = new Date(event.endDate)
        
        // Use Panama timezone to get correct dates (stored dates are in UTC but represent Panama time)
        const startDateStr = formatDateForPanama(startDate)
        const endDateStr = formatDateForPanama(endDate)
        
        // formatDateForPanama returns YYYY-MM-DD (month is 1-indexed), convert to 0-indexed for JS Date
        const [eventStartYear, eventStartMonthRaw, eventStartDate] = startDateStr.split('-').map(Number)
        const [eventEndYear, eventEndMonthRaw, eventEndDate] = endDateStr.split('-').map(Number)
        const eventStartMonth = eventStartMonthRaw - 1 // Convert to 0-indexed
        const eventEndMonth = eventEndMonthRaw - 1 // Convert to 0-indexed
        
        // Calculate event's visible range in current view
        const eventStartDay = eventStartMonth === month && eventStartYear === year 
          ? Math.max(eventStartDate, startDay)
          : (new Date(eventStartYear, eventStartMonth, eventStartDate) < new Date(year, month, startDay) ? startDay : null)
        
        const eventEndDay = eventEndMonth === month && eventEndYear === year
          ? Math.min(eventEndDate, endDay)
          : (new Date(eventEndYear, eventEndMonth, eventEndDate) > new Date(year, month, endDay) ? endDay : null)
        
        if (eventStartDay !== null && eventEndDay !== null && eventStartDay <= endDay && eventEndDay >= startDay) {
          const spanDays = eventEndDay - eventStartDay + 1
          
          // ALL events go to spanning (including single-day)
          spanning.push({
            ...event,
            startDay: eventStartDay,
            endDay: eventEndDay,
            spanDays
          })
        }
      })
    }
    
    return { eventsByDate: grouped, spanningEvents: spanning }
  }, [filteredEvents, viewMode, year, month, calendarView, startDay, endDay])

  const getEventsForDay = (day: number) => {
    const dateKey = `${year}-${month}-${day}`
    return eventsByDate[dateKey] || []
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const isInDragRange = (day: number) => {
    if (!isDragging || dragStartDay === null || dragEndDay === null) return false
    const min = Math.min(dragStartDay, dragEndDay)
    const max = Math.max(dragStartDay, dragEndDay)
    return day >= min && day <= max
  }

  const handleMouseDown = (day: number) => {
    setDragStartDay(day)
    setDragEndDay(day)
    setIsDragging(true)
  }

  const handleMouseEnter = (day: number) => {
    if (isDragging) {
      setDragEndDay(day)
    }
  }

  const handleMouseUp = (day: number) => {
    if (isDragging && dragStartDay !== null) {
      setIsDragging(false)
      
      const startDay = Math.min(dragStartDay, day)
      const endDay = Math.max(dragStartDay, day)
      
      // Create dates at noon to avoid timezone issues
      const startDate = new Date(year, month, startDay, 12, 0, 0)
      const endDate = new Date(year, month, endDay, 12, 0, 0)
      
      if (startDay === endDay) {
        // Single day click
        onDateClick?.(startDate)
      } else {
        // Date range drag
        onDateRangeSelect?.(startDate, endDate)
      }
      
      setDragStartDay(null)
      setDragEndDay(null)
    }
  }

  const handleEventDragStart = (event: Event, e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    setDraggingEvent(event)
  }

  const handleEventDragEnd = () => {
    setDraggingEvent(null)
    setDropTargetDay(null)
  }

  const handleDayDragOver = (day: number, e: React.DragEvent) => {
    // Always prevent default to allow drop
    e.preventDefault()
    e.stopPropagation()
    
    if (draggingEvent || resizingEvent || draggingRequest) {
      setDropTargetDay(day)
    }
  }

  const handleDayDrop = (day: number, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Handle dropping a booking request
    // Check both draggingRequest prop and dataTransfer
    let requestToDrop = draggingRequest
    if (!requestToDrop && e.dataTransfer.types.includes('application/json')) {
      try {
        const data = e.dataTransfer.getData('application/json')
        requestToDrop = JSON.parse(data)
      } catch (err) {
        console.error('Failed to parse drag data:', err)
      }
    }
    
    if (requestToDrop && onRequestDropOnDate) {
      const dropDate = new Date(year, month, day, 12, 0, 0)
      onRequestDropOnDate(requestToDrop, dropDate)
      setDropTargetDay(null)
      return
    }
    
    if (resizingEvent && resizeMode) {
      // Resizing - update start or end date
      if (resizeMode === 'end' && onEventResize) {
        // Resizing from the end - update end date only
      const newEndDate = new Date(year, month, day, 12, 0, 0)
      onEventResize(resizingEvent, newEndDate)
      } else if (resizeMode === 'start' && onEventMove) {
        // Resizing from the start - update start date, keep end date
        const newStartDate = new Date(year, month, day, 12, 0, 0)
        const originalEnd = new Date(resizingEvent.endDate)
        const endYear = originalEnd.getUTCFullYear()
        const endMonth = originalEnd.getUTCMonth()
        const endDay = originalEnd.getUTCDate()
        const endDateLocal = new Date(endYear, endMonth, endDay, 12, 0, 0)
        
        // Make sure new start is before end
        if (newStartDate < endDateLocal) {
          onEventMove(resizingEvent, newStartDate, endDateLocal)
        }
      }
      setResizingEvent(null)
      setResizeMode(null)
      setResizeStartDay(null)
    } else if (draggingEvent && onEventMove) {
      // Moving - calculate the duration of the original event
      const originalStart = new Date(draggingEvent.startDate)
      const originalEnd = new Date(draggingEvent.endDate)
      
      // Normalize both dates to midnight for accurate day calculation
      const startNormalized = new Date(originalStart)
      startNormalized.setHours(0, 0, 0, 0)
      
      const endNormalized = new Date(originalEnd)
      endNormalized.setHours(0, 0, 0, 0)
      
      // Calculate duration in days (inclusive of both start and end)
      const duration = getDaysDifference(startNormalized, endNormalized)
      
      // Create new start date at noon to avoid timezone issues
      const newStartDate = new Date(year, month, day, 12, 0, 0)
      
      // Calculate new end date: start + (duration - 1) days
      // Duration already includes both start and end, so we subtract 1
      // Example: 3-day event (Day 1, 2, 3) moved to Day 5 → ends on Day 7 (Day 5, 6, 7)
      const newEndDate = new Date(newStartDate)
      newEndDate.setDate(newEndDate.getDate() + duration - 1)
      newEndDate.setHours(12, 0, 0, 0)
      
      onEventMove(draggingEvent, newStartDate, newEndDate)
    }
    
    setDraggingEvent(null)
    setDropTargetDay(null)
  }

  const handleResizeStart = (event: Event, mode: 'start' | 'end', e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    setResizingEvent(event)
    setResizeMode(mode)
    const startDate = new Date(event.startDate)
    setResizeStartDay(startDate.getUTCDate())
  }

  const handleResizeEnd = () => {
    setResizingEvent(null)
    setResizeStartDay(null)
    setResizeMode(null)
    setDropTargetDay(null)
  }

  // Generate calendar grid
  const calendarDays = []
  
  // Empty cells for days before range starts (only in month view)
  if (calendarView === 'month') {
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="bg-gray-50 border-r border-b border-gray-200 min-h-24 empty-day opacity-50"></div>
      )
    }
  }

  // Days in the current view
  for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
    const dayEvents = getEventsForDay(dayNum)
    const today = isToday(dayNum)
    const inDragRange = isInDragRange(dayNum)
    
    // Calculate daily event count and status
    // Count events with 'booked' or 'pre-booked' status (both count for restrictions)
    const bookedEvents = events.filter(event => event.status === 'booked' || event.status === 'pre-booked')
    const dateToCheck = new Date(year, month, dayNum)
    const eventsOnThisDay = getEventsOnDate(bookedEvents, dateToCheck)
    const dailyCount = eventsOnThisDay.length
    const dailyStatus = getDailyLimitStatus(
      dailyCount, 
      userSettings.minDailyLaunches, 
      userSettings.maxDailyLaunches
    )

    calendarDays.push(
      <div
        key={dayNum}
        onMouseDown={() => handleMouseDown(dayNum)}
        onMouseEnter={() => handleMouseEnter(dayNum)}
        onMouseUp={() => handleMouseUp(dayNum)}
        onDragOver={(e) => handleDayDragOver(dayNum, e)}
        onDrop={(e) => handleDayDrop(dayNum, e)}
        className={`border-r border-b border-gray-200 calendar-day ${calendarView === 'month' ? (viewMode === 'launch' ? 'min-h-16 sm:min-h-20' : 'min-h-20 sm:min-h-24') : 'min-h-32 sm:min-h-40'} ${viewMode === 'launch' ? 'p-0.5 sm:p-1' : 'p-1.5 sm:p-2'} cursor-pointer select-none ${
          dropTargetDay === dayNum && (draggingEvent || draggingRequest)
            ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 shadow-md'
            : inDragRange
            ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm'
            : today
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm today'
            : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-white'
        } transition-all relative group`}
      >
        <div className={`flex items-center justify-between ${viewMode === 'launch' ? 'mb-0.5' : 'mb-1'}`}>
          <div className="flex items-center gap-1.5">
            <div className={`text-sm font-bold ${
              dropTargetDay === dayNum && draggingEvent
                ? 'text-purple-900'
                : inDragRange
                ? 'text-blue-900'
                : today
                ? 'text-blue-700'
                : 'text-gray-900'
            }`}>
              {dayNum}
            </div>
            {/* Daily count indicator */}
            {dailyCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold daily-count-badge ${
                dailyStatus === 'under' 
                  ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300' 
                  : dailyStatus === 'over'
                  ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border border-orange-300'
                  : 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300'
              }`} title={`${dailyCount} events (Min: ${userSettings.minDailyLaunches}, Max: ${userSettings.maxDailyLaunches})`}>
                {dailyCount}
              </span>
            )}
          </div>
          {dayEvents.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDayExpand?.(new Date(year, month, dayNum), dayEvents)
              }}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
              title={`View all ${dayEvents.length} events`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="space-y-0.5">
          {/* Launch mode only: show event blocks */}
          {viewMode === 'launch' && (calendarView === 'month' ? dayEvents.slice(0, 4) : dayEvents).map(event => {
            // Use parentCategory for colors
            const colors = getCategoryColors(event.parentCategory)
            const isPending = event.status === 'pending'
            const isBooked = event.status === 'booked' || event.status === 'pre-booked'
            const isNotBooked = !isBooked
            const isPreBooked = event.status === 'pre-booked'
            const sourceType = event.bookingRequestId ? (sourceTypeMap.get(event.bookingRequestId) || 'internal') : 'internal'
            const isPublicLink = sourceType === 'public_link'
            // Show source badge for both pending and approved events from public links
            const showSourceBadge = isPublicLink && (isPending || event.status === 'approved')
            
            return (
              <div
                key={event.id}
                draggable={!readOnly}
                onDragStart={(e) => handleEventDragStart(event, e)}
                onDragEnd={handleEventDragEnd}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
                className={`text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 ${colors.indicator} text-white rounded-md cursor-move transition-all flex items-center gap-0.5 sm:gap-1 event-card shadow-sm hover:shadow-md leading-tight font-semibold truncate ${
                  isNotBooked ? 'ring-2 ring-yellow-400 pending opacity-70' : ''
                }`}
                title={`${event.name}${event.category ? ` - ${event.category}` : ''}${isPending ? ' [PENDING]' : event.status === 'approved' ? ' [APPROVED - Ready to Book]' : isPreBooked ? ' [PRE-BOOKED]' : ''}${showSourceBadge ? ` [${isPublicLink ? 'PUBLIC LINK' : 'INTERNAL'}]` : ''}`}
              >
                {isPending && (
                  <svg className="w-3 h-3 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="truncate flex-1 leading-tight">{event.name}</span>
                {showSourceBadge && (
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold flex-shrink-0 border flex items-center ${
                    isPublicLink ? 'bg-purple-600/90 text-white border-purple-400' : 'bg-gray-600/90 text-white border-gray-400'
                  }`}>
                    {isPublicLink ? <PublicIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                  </span>
                )}
              </div>
            )
          })}
          {/* Show "+X more" in month view if over 4 events */}
          {viewMode === 'launch' && calendarView === 'month' && dayEvents.length > 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDayExpand?.(new Date(year, month, dayNum), dayEvents)
              }}
              className="w-full text-[8px] text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 rounded py-0.5 px-1 transition-all border border-blue-200 hover:border-blue-300"
            >
              +{dayEvents.length - 4} more
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-3 py-3 md:px-4 md:pl-5 md:pt-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-3">
            <h2 className="text-lg font-semibold text-gray-900 truncate tracking-tight">
              {getHeaderTitle()}
            </h2>
            {/* Event Count Badge */}
            <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
            {/* Controls Row */}
            <div className="flex items-center justify-between md:justify-end gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {/* Calendar View Toggle */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 toggle-group flex-shrink-0">
                <button
                  onClick={() => setCalendarView('day')}
                  className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all toggle-button ${
                    calendarView === 'day'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md active'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all toggle-button ${
                    calendarView === 'week'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md active'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all toggle-button ${
                    calendarView === 'month'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md active'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Month
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5 toggle-group flex-shrink-0">
                <button
                  onClick={() => setViewMode('launch')}
                  className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all toggle-button ${
                    viewMode === 'launch'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md active'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Launch
                </button>
                <button
                  onClick={() => setViewMode('live')}
                  className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold rounded transition-all toggle-button ${
                    viewMode === 'live'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-md active'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  Live
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-1 bg-white rounded-md p-0.5 border border-gray-200 shadow-sm flex-shrink-0">
                <button
                  onClick={goToToday}
                  className="px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-md hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm hover:shadow-md nav-button"
                >
                  Today
                </button>
                <div className="h-4 w-px bg-gray-300"></div>
                <button
                  onClick={navigatePrevious}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-all nav-button"
                  title="Previous"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={navigateNext}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-all nav-button"
                  title="Next"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar - Full width on mobile */}
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full md:w-64 pl-9 pr-9 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Show Search Results or Calendar */}
      {searchQuery.trim() ? (
        <EventSearchResults
          events={events}
          searchQuery={searchQuery}
          onEventClick={onEventClick}
          onClearSearch={() => onSearchChange?.('')}
        />
      ) : (
        <>
      {/* Day Names */}
          <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'} bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 day-header`}>
        {calendarView === 'day' ? (
          <div className="text-center text-sm font-bold text-gray-800 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
            {dayNames[new Date(year, month, day).getDay()]}
          </div>
        ) : (
          dayNames.map(dayName => (
            <div
              key={dayName}
              className="text-center text-xs font-bold text-gray-700 py-2 border-r border-gray-200 last:border-r-0 uppercase tracking-wide"
            >
              {dayName}
            </div>
          ))
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 relative overflow-auto calendar-container">
        <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'} auto-rows-fr min-h-full`}>
          {calendarDays}
        </div>
        
        {/* Spanning Events Overlay (Live mode only) - works for Day, Week, Month */}
        {viewMode === 'live' && spanningEvents.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
            {spanningEvents.map((event, idx) => {
              // Use parentCategory for colors
              const colors = getCategoryColors(event.parentCategory)
              const isPending = event.status === 'pending'
              const isBooked = event.status === 'booked' || event.status === 'pre-booked'
              const isNotBooked = !isBooked
              const isPreBooked = event.status === 'pre-booked'
              const sourceType = event.bookingRequestId ? (sourceTypeMap.get(event.bookingRequestId) || 'internal') : 'internal'
              const isPublicLink = sourceType === 'public_link'
              const showSourceBadge = isPublicLink && (isPending || event.status === 'approved')
              
              // Calculate grid columns based on view mode
              const gridCols = calendarView === 'day' ? 1 : 7
              
              // For Day view: simple single column
              if (calendarView === 'day') {
                const top = `${(idx % 5) * 24 + 36}px`
                
                return (
                  <div
                    key={event.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: '2px',
                      right: '2px',
                      top,
                      zIndex: 10,
                      height: '18px',
                    }}
                  >
                    <div
                      draggable={!readOnly}
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      onDragEnd={handleEventDragEnd}
                      onClick={() => onEventClick?.(event)}
                      className={`h-full px-1.5 sm:px-2 py-0.5 ${colors.indicator} text-white text-[10px] sm:text-[11px] rounded-md ${readOnly ? 'cursor-pointer' : 'cursor-move'} transition-all truncate flex items-center gap-0.5 sm:gap-1 font-semibold shadow-sm hover:shadow-md event-spanning ${
                        isNotBooked ? 'ring-2 ring-yellow-400 pending opacity-70' : ''
                      }`}
                      title={`${event.name}${event.category ? ` - ${event.category}` : ''}${isPending ? ' [PENDING]' : event.status === 'approved' ? ' [APPROVED - Ready to Book]' : isPreBooked ? ' [PRE-BOOKED]' : ''}${showSourceBadge ? ` [${isPublicLink ? 'PUBLIC LINK' : 'INTERNAL'}]` : ''}\nStart: ${new Date(event.startDate).toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE })}\nEnd: ${new Date(event.endDate).toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE })}`}
                    >
                      {isPending && (
                        <svg className="w-3 h-3 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="truncate flex-1 leading-tight">{event.name}</span>
                      {showSourceBadge && (
                        <span className={`px-1 py-0.5 rounded text-[9px] font-bold flex-shrink-0 border flex items-center ${
                          isPublicLink ? 'bg-purple-600/90 text-white border-purple-400' : 'bg-gray-600/90 text-white border-gray-400'
                        }`}>
                          {isPublicLink ? <PublicIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
              
              // For Week and Month views: calculate spanning segments
              const segments = []
              let currentDay = event.startDay
              let remainingDays = event.spanDays
              
              while (remainingDays > 0) {
                // Calculate position in grid
                // For month view: account for empty cells at start (startingDayOfWeek)
                // For week view: days are 0-indexed from startDay
                const adjustedDay = calendarView === 'month' ? currentDay : (currentDay - startDay)
                const totalCellsBefore = (calendarView === 'month' ? startingDayOfWeek + currentDay - 1 : adjustedDay)
                const row = Math.floor(totalCellsBefore / gridCols)
                const colStart = totalCellsBefore % gridCols
                const daysLeftInRow = gridCols - colStart
                const daysInThisSegment = Math.min(remainingDays, daysLeftInRow)
                
                segments.push({
                  row,
                  colStart,
                  colSpan: daysInThisSegment,
                  isFirst: currentDay === event.startDay,
                  isLast: remainingDays === daysInThisSegment
                })
                
                currentDay += daysInThisSegment
                remainingDays -= daysInThisSegment
              }
              
              return segments.map((segment, segIdx) => {
                const cellWidth = 100 / gridCols
                const left = `${segment.colStart * cellWidth}%`
                const width = `calc(${segment.colSpan * cellWidth}% - 8px)`
                const totalRows = Math.ceil((calendarView === 'month' ? startingDayOfWeek + daysInMonth : daysToShow) / gridCols)
                const top = `calc(${segment.row * (100 / totalRows)}% + ${(idx % 3) * 24 + 36}px)`
                
                return (
                  <div
                    key={`${event.id}-segment-${segIdx}`}
                    className="absolute pointer-events-auto group"
                    style={{
                      left,
                      width,
                      top,
                      zIndex: 10,
                      marginLeft: '2px',
                      height: '18px',
                    }}
                  >
                    <div
                      draggable={!readOnly}
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      onDragEnd={handleEventDragEnd}
                      onClick={() => onEventClick?.(event)}
                      className={`relative h-full px-1.5 sm:px-2 py-0.5 ${colors.indicator} text-white text-[10px] sm:text-[11px] rounded-md ${readOnly ? 'cursor-pointer' : 'cursor-move'} transition-all truncate flex items-center gap-0.5 sm:gap-1 font-semibold shadow-sm hover:shadow-md event-spanning ${
                        isNotBooked ? 'ring-2 ring-yellow-400 pending opacity-70' : ''
                      }`}
                      title={`${event.name}${event.category ? ` - ${event.category}` : ''}${isPending ? ' [PENDING]' : event.status === 'approved' ? ' [APPROVED - Ready to Book]' : isPreBooked ? ' [PRE-BOOKED]' : ''}${showSourceBadge ? ` [${isPublicLink ? 'PUBLIC LINK' : 'INTERNAL'}]` : ''}`}
                    >
                      {segment.isFirst && (
                        <>
                          {isPending && (
                            <svg className="w-3 h-3 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="truncate flex-1 leading-tight">{event.name}</span>
                          {showSourceBadge && (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold flex-shrink-0 border flex items-center ${
                              isPublicLink ? 'bg-purple-600/90 text-white border-purple-400' : 'bg-gray-600/90 text-white border-gray-400'
                            }`}>
                              {isPublicLink ? <PublicIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                            </span>
                          )}
                        </>
                      )}
                      
                      {/* Left Resize Handle - only on first segment, hidden in readOnly mode */}
                      {!readOnly && segment.isFirst && (
                        <div
                          draggable
                          onDragStart={(e) => handleResizeStart(event, 'start', e)}
                          onDragEnd={handleResizeEnd}
                          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center resize-handle rounded-l-md"
                          title="Drag to resize start"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-0.5 h-3 bg-white rounded-full"></div>
                        </div>
                      )}
                      
                      {/* Right Resize Handle - only on last segment, hidden in readOnly mode */}
                      {!readOnly && segment.isLast && (
                        <div
                          draggable
                          onDragStart={(e) => handleResizeStart(event, 'end', e)}
                          onDragEnd={handleResizeEnd}
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center resize-handle rounded-r-md"
                          title="Drag to resize end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-0.5 h-3 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            })}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
