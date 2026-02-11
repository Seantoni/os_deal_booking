'use client'

import { useState, useMemo, useEffect } from 'react'
import { getDaysDifference, getCategoryColors } from '@/lib/categories'
import { getEventsOnDate, getDailyLimitStatus } from '@/lib/event-validation'
import { getSettings } from '@/lib/settings'
import { formatDateForPanama, PANAMA_TIMEZONE, getDateComponentsInPanama } from '@/lib/date/timezone'
import EventSearchResults from '@/components/events/EventSearchResults'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import type { Event, BookingRequest, UserRole } from '@/types'
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
  // External navigation control
  externalDate?: Date | null
  externalView?: CalendarViewMode | null
  externalRange?: { start: Date; end: Date } | null
  onViewChange?: (view: CalendarViewMode) => void
  onCurrentDateChange?: (date: Date) => void
  // Action buttons
  onNewRequestClick?: () => void
  onCreateEventClick?: () => void
  userRole?: UserRole
}

export default function CalendarView({ events, selectedCategories, showPendingBooking, categoryFilter, searchQuery = '', draggingRequest, bookingRequests = [], onSearchChange, onRequestDropOnDate, onDateClick, onDateRangeSelect, onEventClick, onEventMove, onEventResize, onDayExpand, readOnly = false, externalDate, externalView, externalRange, onViewChange, onCurrentDateChange, onNewRequestClick, onCreateEventClick, userRole }: CalendarViewProps) {
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

  // Handle external navigation control
  useEffect(() => {
    if (externalDate) {
      setCurrentDate(externalDate)
    }
  }, [externalDate])

  useEffect(() => {
    if (externalView) {
      setCalendarView(externalView)
    }
  }, [externalView])

  // Filter events by categories and booking status
  const filteredEvents = useMemo(() => {
    let filtered = events
    
    // When NOT in pending booking view (categories sidebar visible), only show booked and approved events
    // When IN pending booking view (pending requests sidebar visible), show all events
    if (!showPendingBooking) {
      filtered = filtered.filter(event => event.status === 'booked' || event.status === 'approved')
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

  // Calculate range based on calendar view mode or external range selection
  const getViewRange = () => {
    // If external range is provided, show ONLY those selected days
    if (externalRange) {
      const rangeStartYear = externalRange.start.getFullYear()
      const rangeStartMonth = externalRange.start.getMonth()
      const rangeStartDay = externalRange.start.getDate()
      const rangeEndYear = externalRange.end.getFullYear()
      const rangeEndMonth = externalRange.end.getMonth()
      const rangeEndDay = externalRange.end.getDate()
      
      // Check if range is within current month view
      if (rangeStartYear === year && rangeStartMonth === month &&
          rangeEndYear === year && rangeEndMonth === month) {
        const daysInRange = rangeEndDay - rangeStartDay + 1
        return {
          startDay: rangeStartDay,
          endDay: rangeEndDay,
          startingDayOfWeek: new Date(year, month, rangeStartDay).getDay(),
          daysToShow: daysInRange,
          isCustomRange: true
        }
      }
    }
    
    // Single day selection (Day view)
    if (calendarView === 'day') {
      return {
        startDay: day,
        endDay: day,
        startingDayOfWeek: new Date(year, month, day).getDay(),
        daysToShow: 1,
        isCustomRange: false
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
        daysToShow: 7,
        isCustomRange: false
      }
    } else {
      // Month view - show full month
      const firstDayOfMonth = new Date(year, month, 1)
      const lastDayOfMonth = new Date(year, month + 1, 0)
      return {
        startDay: 1,
        endDay: lastDayOfMonth.getDate(),
        startingDayOfWeek: firstDayOfMonth.getDay(),
        daysToShow: lastDayOfMonth.getDate(),
        isCustomRange: false
      }
    }
  }

  const viewRange = getViewRange()
  const { startDay, endDay, startingDayOfWeek, daysToShow, isCustomRange } = viewRange
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Determine grid columns based on view mode
  const getGridCols = () => {
    if (isCustomRange) {
      // For custom range, use appropriate columns based on days count
      if (daysToShow === 1) return 1
      if (daysToShow <= 3) return daysToShow
      if (daysToShow <= 7) return Math.min(daysToShow, 7)
      return 7 // For larger ranges, use 7-column grid
    }
    return calendarView === 'day' ? 1 : 7
  }
  const gridCols = getGridCols()

  const navigatePrevious = () => {
    let newDate: Date
    if (calendarView === 'day') {
      newDate = new Date(year, month, day - 1)
    } else if (calendarView === 'week') {
      newDate = new Date(year, month, day - 7)
    } else {
      newDate = new Date(year, month - 1, 1)
    }
    setCurrentDate(newDate)
    onCurrentDateChange?.(newDate)
  }

  const navigateNext = () => {
    let newDate: Date
    if (calendarView === 'day') {
      newDate = new Date(year, month, day + 1)
    } else if (calendarView === 'week') {
      newDate = new Date(year, month, day + 7)
    } else {
      newDate = new Date(year, month + 1, 1)
    }
    setCurrentDate(newDate)
    onCurrentDateChange?.(newDate)
  }

  const goToToday = () => {
    const newDate = new Date()
    setCurrentDate(newDate)
    onCurrentDateChange?.(newDate)
  }
  
  const handleViewChange = (view: CalendarViewMode) => {
    setCalendarView(view)
    onViewChange?.(view)
  }

  const getHeaderTitle = () => {
    // For custom range selection from mini calendar
    if (isCustomRange && externalRange) {
      const rangeStart = externalRange.start
      const rangeEnd = externalRange.end
      if (rangeStart.getDate() === rangeEnd.getDate() && 
          rangeStart.getMonth() === rangeEnd.getMonth() &&
          rangeStart.getFullYear() === rangeEnd.getFullYear()) {
        // Single day
        return rangeStart.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      }
      // Range of days
      return `${rangeStart.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric' })} - ${rangeEnd.toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    
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
  const { eventsByDate, spanningEvents, overflowPerDay } = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {}
    const spanning: Array<Event & { startDay: number; endDay: number; spanDays: number }> = []
    
    if (viewMode === 'launch') {
      // Launch date mode: ONLY show on start date as blocks (ALL VIEWS)
      filteredEvents.forEach(event => {
        const startDate = new Date(event.startDate)
        // Use Panama timezone for consistent date display
        const eventPanama = getDateComponentsInPanama(startDate)
        const eventYear = eventPanama.year
        const eventMonth = eventPanama.month - 1 // Convert to 0-indexed
        const eventDay = eventPanama.day
        
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
      // Live dates mode: Show as continuous spanning bars
      filteredEvents.forEach(event => {
        const startDate = new Date(event.startDate)
        const endDate = new Date(event.endDate)
        
        // Use Panama timezone to get correct dates
        const startDateStr = formatDateForPanama(startDate)
        const endDateStr = formatDateForPanama(endDate)
        
        const [eventStartYear, eventStartMonthRaw, eventStartDate] = startDateStr.split('-').map(Number)
        const [eventEndYear, eventEndMonthRaw, eventEndDate] = endDateStr.split('-').map(Number)
        const eventStartMonth = eventStartMonthRaw - 1
        const eventEndMonth = eventEndMonthRaw - 1
        
        // Calculate event's visible range in current view
        const eventStartDay = eventStartMonth === month && eventStartYear === year 
          ? Math.max(eventStartDate, startDay)
          : (new Date(eventStartYear, eventStartMonth, eventStartDate) < new Date(year, month, startDay) ? startDay : null)
        
        const eventEndDay = eventEndMonth === month && eventEndYear === year
          ? Math.min(eventEndDate, endDay)
          : (new Date(eventEndYear, eventEndMonth, eventEndDate) > new Date(year, month, endDay) ? endDay : null)
        
        if (eventStartDay !== null && eventEndDay !== null && eventStartDay <= endDay && eventEndDay >= startDay) {
          const spanDays = eventEndDay - eventStartDay + 1
          
          spanning.push({
            ...event,
            startDay: eventStartDay,
            endDay: eventEndDay,
            spanDays
          })
        }
      })
    }
    
    // Allocate lanes to spanning events to prevent overlaps
    const sortedSpanning = [...spanning].sort((a, b) => {
      if (a.startDay !== b.startDay) return a.startDay - b.startDay
      return b.spanDays - a.spanDays // Longer events first
    })
    
    const eventLanes: Map<string, number> = new Map()
    const dayLanes: Map<number, Set<number>> = new Map()
    
    sortedSpanning.forEach(event => {
      let lane = 0
      let foundLane = false
      
      while (!foundLane) {
        let laneAvailable = true
        for (let d = event.startDay; d <= event.endDay; d++) {
          const usedLanes = dayLanes.get(d) || new Set()
          if (usedLanes.has(lane)) {
            laneAvailable = false
            break
          }
        }
        
        if (laneAvailable) {
          foundLane = true
          for (let d = event.startDay; d <= event.endDay; d++) {
            if (!dayLanes.has(d)) {
              dayLanes.set(d, new Set())
            }
            dayLanes.get(d)!.add(lane)
          }
          eventLanes.set(event.id, lane)
        } else {
          lane++
        }
      }
    })
    
    const spanningWithLanes = sortedSpanning.map(event => ({
      ...event,
      lane: eventLanes.get(event.id) || 0
    }))
    
    // Limit visible lanes based on view - Month: 5, Week: 8, Day: unlimited
    const MAX_VISIBLE_LANES = calendarView === 'month' ? 5 : calendarView === 'week' ? 8 : 100
    const overflowPerDay: Map<number, number> = new Map()
    
    spanningWithLanes.forEach(event => {
      if (event.lane >= MAX_VISIBLE_LANES) {
        for (let d = event.startDay; d <= event.endDay; d++) {
          overflowPerDay.set(d, (overflowPerDay.get(d) || 0) + 1)
        }
      }
    })
    
    const visibleSpanningEvents = spanningWithLanes.filter(e => e.lane < MAX_VISIBLE_LANES)
    
    return { 
      eventsByDate: grouped, 
      spanningEvents: visibleSpanningEvents,
      overflowPerDay
    }
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
    // Don't start dragging the event if we're resizing
    if (resizingEvent) {
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
        // Use Panama timezone for end date
        const endPanama = getDateComponentsInPanama(new Date(resizingEvent.endDate))
        const endDateLocal = new Date(endPanama.year, endPanama.month - 1, endPanama.day, 12, 0, 0)
        
        // Make sure new start is before end
        if (newStartDate < endDateLocal) {
          onEventMove(resizingEvent, newStartDate, endDateLocal)
        }
      }
      setResizingEvent(null)
      setResizeMode(null)
      setResizeStartDay(null)
    } else if (draggingEvent && onEventMove) {
      // Moving - calculate the duration of the original event using Panama timezone
      const startPanama = getDateComponentsInPanama(new Date(draggingEvent.startDate))
      const endPanama = getDateComponentsInPanama(new Date(draggingEvent.endDate))
      
      // Create normalized dates at midnight for accurate day calculation
      const startNormalized = new Date(startPanama.year, startPanama.month - 1, startPanama.day)
      const endNormalized = new Date(endPanama.year, endPanama.month - 1, endPanama.day)
      
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
    // Clear any dragging state to ensure resize takes priority
    setDraggingEvent(null)
    setResizingEvent(event)
    setResizeMode(mode)
    // Use Panama timezone for start day
    const startPanama = getDateComponentsInPanama(new Date(event.startDate))
    setResizeStartDay(startPanama.day)
  }

  const handleResizeEnd = () => {
    setResizingEvent(null)
    setResizeStartDay(null)
    setResizeMode(null)
    setDropTargetDay(null)
  }

  // Generate calendar grid
  const calendarDays = []
  
  // Empty cells for days before range starts
  // - Month view: always add empty cells to align with day-of-week headers
  // - Custom range > 7 days: add empty cells to align with day-of-week headers
  // - Custom range <= 7 days or Day view: no empty cells (headers match days directly)
  const needsEmptyCells = calendarView === 'month' || (isCustomRange && daysToShow > 7)
  if (needsEmptyCells) {
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
    // Count events with 'booked' or 'approved' status (both count for restrictions)
    const bookedEvents = events.filter(event => event.status === 'booked' || event.status === 'approved')
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
        className={`border-r border-b border-gray-200 calendar-day ${calendarView === 'month' ? 'min-h-20 sm:min-h-24' : 'min-h-32 sm:min-h-40'} p-1.5 sm:p-2 cursor-pointer select-none ${
          dropTargetDay === dayNum && (draggingEvent || draggingRequest)
            ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 shadow-md'
            : dropTargetDay === dayNum && resizingEvent
            ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-300 shadow-md ring-2 ring-green-400'
            : inDragRange
            ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 shadow-sm'
            : today
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm today'
            : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-white'
        } transition-all relative group`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className={`text-[10px] font-semibold ${
              dropTargetDay === dayNum && draggingEvent
                ? 'text-purple-900'
                : dropTargetDay === dayNum && resizingEvent
                ? 'text-green-900'
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
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold daily-count-badge ${
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
          {(() => {
            // Calculate events for this day based on view mode
            const liveEventsOnDay = viewMode === 'live' ? filteredEvents.filter(event => {
              const startDateStr = formatDateForPanama(new Date(event.startDate))
              const endDateStr = formatDateForPanama(new Date(event.endDate))
              const [sy, smr, sd] = startDateStr.split('-').map(Number)
              const [ey, emr, ed] = endDateStr.split('-').map(Number)
              const eventStart = new Date(sy, smr - 1, sd)
              const eventEnd = new Date(ey, emr - 1, ed)
              const dayDate = new Date(year, month, dayNum)
              return eventStart <= dayDate && eventEnd >= dayDate
            }) : []
            const eventsToShow = viewMode === 'launch' ? dayEvents : liveEventsOnDay
            const eventCount = eventsToShow.length
            
            return eventCount > 0 ? (
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                  e.preventDefault()
                  onDayExpand?.(new Date(year, month, dayNum), eventsToShow)
              }}
              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all opacity-0 group-hover:opacity-100"
                title={`View all ${eventCount} events`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            ) : null
          })()}
        </div>
        
        <div className="space-y-[3px]" style={{ maxHeight: calendarView === 'month' ? '85px' : undefined }}>
          {/* Show event blocks - ONLY for launch mode (start date only) */}
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
                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-[15px] ${colors.indicator} text-white rounded cursor-move transition-all flex items-center gap-0.5 event-card shadow-sm hover:shadow-md leading-tight font-semibold truncate ${
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
          {/* Show "+X more" for launch mode in month view */}
          {viewMode === 'launch' && calendarView === 'month' && dayEvents.length > 4 && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onDayExpand?.(new Date(year, month, dayNum), dayEvents)
              }}
              className="w-full text-[8px] text-blue-700 font-semibold bg-blue-100/90 hover:bg-blue-200 rounded py-0.5 px-1 transition-all border border-blue-300"
            >
              +{dayEvents.length - 4} more
            </button>
          )}
        </div>
        {/* Show "+X more" for live mode overflow - positioned at bottom of cell */}
        {viewMode === 'live' && (overflowPerDay.get(dayNum) || 0) > 0 && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              // Get all events active on this day
              const allEventsOnDay = filteredEvents.filter(event => {
                const startDateStr = formatDateForPanama(new Date(event.startDate))
                const endDateStr = formatDateForPanama(new Date(event.endDate))
                const [sy, smr, sd] = startDateStr.split('-').map(Number)
                const [ey, emr, ed] = endDateStr.split('-').map(Number)
                const sm = smr - 1
                const em = emr - 1
                const eventStart = new Date(sy, sm, sd)
                const eventEnd = new Date(ey, em, ed)
                const dayDate = new Date(year, month, dayNum)
                return eventStart <= dayDate && eventEnd >= dayDate
              })
              onDayExpand?.(new Date(year, month, dayNum), allEventsOnDay)
            }}
            className="absolute bottom-0.5 left-0.5 right-0.5 text-[8px] text-blue-700 font-semibold bg-blue-100/90 hover:bg-blue-200 rounded py-0.5 px-1 transition-all border border-blue-300 z-20 backdrop-blur-sm"
          >
            +{overflowPerDay.get(dayNum)} more
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white">
      {/* Calendar Header - Compact */}
      <div className="bg-white border-b border-gray-200 px-2 py-2 md:px-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Title, Count & Navigation */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {getHeaderTitle()}
            </h2>
            <div className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
              {filteredEvents.length}
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            {/* Navigation */}
            <div className="flex items-center bg-white rounded border border-gray-200 flex-shrink-0">
              <button
                onClick={goToToday}
                className="px-2 py-1 text-[10px] font-semibold text-white bg-indigo-600 rounded-l hover:bg-indigo-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={navigatePrevious}
                className="p-1 text-gray-500 hover:bg-gray-100 transition-colors border-l border-gray-200"
                title="Previous"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={navigateNext}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded-r transition-colors border-l border-gray-200"
                title="Next"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
          </div>
            <div className="h-4 w-px bg-gray-300"></div>
              {/* Calendar View Toggle */}
            <div className="flex items-center bg-gray-100 rounded p-0.5 flex-shrink-0">
                <button
                onClick={() => handleViewChange('day')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-all ${
                    calendarView === 'day'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                  }`}
                >
                D
                </button>
                <button
                onClick={() => handleViewChange('week')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-all ${
                    calendarView === 'week'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                  }`}
                >
                W
                </button>
                <button
                onClick={() => handleViewChange('month')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-all ${
                    calendarView === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                  }`}
                >
                M
                </button>
              </div>
            <div className="h-4 w-px bg-gray-300"></div>
              {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded p-0.5 flex-shrink-0">
                <button
                  onClick={() => setViewMode('launch')}
                className={`px-2 py-1 text-[10px] font-semibold rounded transition-all flex items-center gap-1 ${
                    viewMode === 'launch'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                  }`}
                title="Launch view"
                >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Launch</span>
                </button>
                <button
                  onClick={() => setViewMode('live')}
                className={`px-2 py-1 text-[10px] font-semibold rounded transition-all flex items-center gap-1 ${
                    viewMode === 'live'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white'
                  }`}
                title="Live view"
                >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                <span>Live</span>
                </button>
              </div>
            <div className="h-4 w-px bg-gray-300"></div>
            {/* Search Bar */}
            <div className="relative flex-shrink-0">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-28 md:w-36 pl-7 pr-7 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {userRole === 'admin' && onCreateEventClick && (
              <>
                <div className="h-4 w-px bg-gray-300"></div>
                {/* Action Buttons */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={onCreateEventClick}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Crear Evento"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </>
            )}
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
          <div 
            className={`grid bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200 day-header`}
            style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
          >
        {(isCustomRange && daysToShow <= 7) || calendarView === 'day' ? (
          // For custom range (7 days or less) or day view, show headers for the specific days selected
          Array.from({ length: endDay - startDay + 1 }, (_, i) => {
            const dayNum = startDay + i
            const dayOfWeek = new Date(year, month, dayNum).getDay()
            return (
              <div 
                key={dayNum}
                className="text-center text-[10px] font-bold text-gray-700 py-1 border-r border-gray-200 last:border-r-0 uppercase tracking-wide bg-gradient-to-r from-blue-50 to-indigo-50"
              >
                <span className="block">{dayNames[dayOfWeek]}</span>
                <span className="block text-[9px] text-gray-500 font-medium">{dayNum}</span>
          </div>
            )
          })
        ) : (
          // For month view or custom ranges > 7 days, show standard day-of-week headers
          dayNames.map(dayName => (
            <div
              key={dayName}
              className="text-center text-[10px] font-bold text-gray-700 py-1 border-r border-gray-200 last:border-r-0 uppercase tracking-wide"
            >
              {dayName}
            </div>
          ))
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 relative overflow-auto calendar-container">
        <div 
          className="grid auto-rows-fr min-h-full"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {calendarDays}
        </div>
        
        {/* Spanning Events Overlay (Live mode only) */}
        {viewMode === 'live' && spanningEvents.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
            {spanningEvents.map((event) => {
              const colors = getCategoryColors(event.parentCategory)
              const isPending = event.status === 'pending'
              const isBooked = event.status === 'booked' || event.status === 'pre-booked'
              const isNotBooked = !isBooked
              const isPreBooked = event.status === 'pre-booked'
              const sourceType = event.bookingRequestId ? (sourceTypeMap.get(event.bookingRequestId) || 'internal') : 'internal'
              const isPublicLink = sourceType === 'public_link'
              const showSourceBadge = isPublicLink && (isPending || event.status === 'approved')
              
              // Calculate spanning segments (one per row)
              const segments: Array<{ row: number; colStart: number; colSpan: number; isFirst: boolean; isLast: boolean }> = []
              let currentDay = event.startDay
              let remainingDays = event.spanDays
              
              while (remainingDays > 0) {
                const needsOffsetForHeaders = calendarView === 'month' || (isCustomRange && daysToShow > 7)
                const adjustedDay = currentDay - startDay
                const totalCellsBefore = needsOffsetForHeaders
                  ? startingDayOfWeek + adjustedDay
                  : adjustedDay
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
                const width = `${segment.colSpan * cellWidth}%`
                const needsOffsetForHeaders = calendarView === 'month' || (isCustomRange && daysToShow > 7)
                const totalRows = Math.ceil(
                  needsOffsetForHeaders
                    ? (startingDayOfWeek + daysToShow) / gridCols 
                    : daysToShow / gridCols
                )
                const top = `calc(${segment.row * (100 / totalRows)}% + ${event.lane * 18 + 32}px)`
                
                return (
                  <div
                    key={`${event.id}-segment-${segIdx}`}
                    className="absolute pointer-events-auto group"
                    style={{
                      left,
                      width,
                      top,
                      zIndex: 10,
                      height: '15px',
                    }}
                  >
                    {/* Left Resize Handle - outside the draggable bar */}
                    {!readOnly && segment.isFirst && (
                      <div
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleResizeStart(event, 'start', e)
                        }}
                        onDragEnd={handleResizeEnd}
                        className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center resize-handle rounded-l-md z-30"
                        title="Drag left to extend start, right to shorten"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                  >
                        <div className="w-1 h-full bg-blue-600 rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Event Bar - draggable for moving */}
                    <div
                      draggable={!readOnly && !resizingEvent}
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      onDragEnd={handleEventDragEnd}
                      onClick={() => onEventClick?.(event)}
                      className={`relative h-full px-1 sm:px-1.5 py-0 ${colors.indicator} text-white text-[9px] sm:text-[10px] rounded ${readOnly ? 'cursor-pointer' : 'cursor-move'} transition-all truncate flex items-center gap-0.5 font-semibold shadow-sm hover:shadow-md event-spanning ${
                        isNotBooked ? 'ring-2 ring-yellow-400 pending opacity-70' : ''
                      }`}
                      title={`${event.name}${event.category ? ` - ${event.category}` : ''}${isPending ? ' [PENDING]' : event.status === 'approved' ? ' [APPROVED]' : isPreBooked ? ' [PRE-BOOKED]' : ''}`}
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
                        </div>
                      
                    {/* Right Resize Handle - outside the draggable bar */}
                      {!readOnly && segment.isLast && (
                        <div
                          draggable
                        onDragStart={(e) => {
                          e.stopPropagation()
                          handleResizeStart(event, 'end', e)
                        }}
                          onDragEnd={handleResizeEnd}
                        className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center resize-handle rounded-r-md z-30"
                        title="Drag right to extend end, left to shorten"
                          onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        >
                        <div className="w-1 h-full bg-blue-600 rounded-full"></div>
                        </div>
                      )}
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
