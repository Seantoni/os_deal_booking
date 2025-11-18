'use client'

import { useState, useMemo } from 'react'
import { getDaysDifference, getCategoryColors } from '@/lib/categories'
import { getEventsOnDate, getDailyLimitStatus, MIN_DAILY_LAUNCHES, MAX_DAILY_LAUNCHES } from '@/lib/validation'

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

type ViewMode = 'launch' | 'live'
type CalendarViewMode = 'month' | 'week' | 'day'

interface CalendarViewProps {
  events: Event[]
  selectedCategories: string[]
  onDateClick?: (date: Date) => void
  onDateRangeSelect?: (startDate: Date, endDate: Date) => void
  onEventClick?: (event: Event) => void
  onEventMove?: (event: Event, newStartDate: Date, newEndDate: Date) => void
  onEventResize?: (event: Event, newEndDate: Date) => void
  onDayExpand?: (date: Date, events: Event[]) => void
}

export default function CalendarView({ events, selectedCategories, onDateClick, onDateRangeSelect, onEventClick, onEventMove, onEventResize, onDayExpand }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dragStartDay, setDragStartDay] = useState<number | null>(null)
  const [dragEndDay, setDragEndDay] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('live')
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month')
  const [draggingEvent, setDraggingEvent] = useState<Event | null>(null)
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null)
  const [resizingEvent, setResizingEvent] = useState<Event | null>(null)
  const [resizeStartDay, setResizeStartDay] = useState<number | null>(null)

  // Filter events by selected categories
  const filteredEvents = useMemo(() => {
    if (selectedCategories.length === 0) return events
    return events.filter(event => 
      event.category && selectedCategories.includes(event.category)
    )
  }, [events, selectedCategories])

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
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    } else if (calendarView === 'week') {
      const weekStart = new Date(year, month, day - new Date(year, month, day).getDay())
      const weekEnd = new Date(year, month, day + (6 - new Date(year, month, day).getDay()))
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
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
        
        // Use UTC methods to avoid timezone shift
        const eventStartYear = startDate.getUTCFullYear()
        const eventStartMonth = startDate.getUTCMonth()
        const eventStartDate = startDate.getUTCDate()
        
        const eventEndYear = endDate.getUTCFullYear()
        const eventEndMonth = endDate.getUTCMonth()
        const eventEndDate = endDate.getUTCDate()
        
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
    e.stopPropagation()
    setDraggingEvent(event)
  }

  const handleEventDragEnd = () => {
    setDraggingEvent(null)
    setDropTargetDay(null)
  }

  const handleDayDragOver = (day: number, e: React.DragEvent) => {
    if (draggingEvent || resizingEvent) {
      e.preventDefault()
      setDropTargetDay(day)
    }
  }

  const handleDayDrop = (day: number, e: React.DragEvent) => {
    e.preventDefault()
    
    if (resizingEvent && onEventResize) {
      // Resizing - update end date only
      const newEndDate = new Date(year, month, day, 12, 0, 0)
      onEventResize(resizingEvent, newEndDate)
      setResizingEvent(null)
      setResizeStartDay(null)
    } else if (draggingEvent && onEventMove) {
      // Moving - calculate the duration of the original event using UTC
      const originalStart = new Date(draggingEvent.startDate)
      const originalEnd = new Date(draggingEvent.endDate)
      
      // Extract UTC dates to calculate correct duration
      const startYear = originalStart.getUTCFullYear()
      const startMonth = originalStart.getUTCMonth()
      const startDay = originalStart.getUTCDate()
      
      const endYear = originalEnd.getUTCFullYear()
      const endMonth = originalEnd.getUTCMonth()
      const endDay = originalEnd.getUTCDate()
      
      const startLocal = new Date(startYear, startMonth, startDay)
      const endLocal = new Date(endYear, endMonth, endDay)
      const duration = getDaysDifference(startLocal, endLocal)
      
      // Create dates at noon to avoid timezone issues
      const newStartDate = new Date(year, month, day, 12, 0, 0)
      const newEndDate = new Date(year, month, day + duration - 1, 12, 0, 0)
      
      onEventMove(draggingEvent, newStartDate, newEndDate)
    }
    
    setDraggingEvent(null)
    setDropTargetDay(null)
  }

  const handleResizeStart = (event: Event, e: React.DragEvent) => {
    e.stopPropagation()
    setResizingEvent(event)
    const startDate = new Date(event.startDate)
    setResizeStartDay(startDate.getUTCDate())
  }

  const handleResizeEnd = () => {
    setResizingEvent(null)
    setResizeStartDay(null)
    setDropTargetDay(null)
  }

  // Generate calendar grid
  const calendarDays = []
  
  // Empty cells for days before range starts (only in month view)
  if (calendarView === 'month') {
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="bg-gray-50 border border-gray-200 min-h-32"></div>
      )
    }
  }

  // Days in the current view
  for (let dayNum = startDay; dayNum <= endDay; dayNum++) {
    const dayEvents = getEventsForDay(dayNum)
    const today = isToday(dayNum)
    const inDragRange = isInDragRange(dayNum)
    
    // Calculate daily event count and status
    const dateToCheck = new Date(year, month, dayNum)
    const eventsOnThisDay = getEventsOnDate(events, dateToCheck)
    const dailyCount = eventsOnThisDay.length
    const dailyStatus = getDailyLimitStatus(dailyCount)

    calendarDays.push(
      <div
        key={dayNum}
        onMouseDown={() => handleMouseDown(dayNum)}
        onMouseEnter={() => handleMouseEnter(dayNum)}
        onMouseUp={() => handleMouseUp(dayNum)}
        onDragOver={(e) => handleDayDragOver(dayNum, e)}
        onDrop={(e) => handleDayDrop(dayNum, e)}
        className={`border border-gray-200 ${calendarView === 'month' ? 'min-h-32' : 'min-h-48'} p-2 cursor-pointer select-none ${
          dropTargetDay === dayNum && draggingEvent
            ? 'bg-purple-100 border-purple-400'
            : inDragRange
            ? 'bg-blue-200 border-blue-400'
            : today
            ? 'bg-blue-50'
            : 'bg-white hover:bg-gray-50'
        } transition-colors`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className={`text-sm font-medium ${
              inDragRange ? 'text-blue-900' : today ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {dayNum}
            </div>
            {/* Daily count indicator */}
            {dailyCount > 0 && (
              <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                dailyStatus === 'under' 
                  ? 'bg-red-100 text-red-700' 
                  : dailyStatus === 'over'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`} title={`${dailyCount} events (Min: ${MIN_DAILY_LAUNCHES}, Max: ${MAX_DAILY_LAUNCHES})`}>
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
              className="p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="View all events"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="space-y-1">
          {/* Launch mode only: show event blocks */}
          {viewMode === 'launch' && (calendarView === 'month' ? dayEvents.slice(0, 5) : dayEvents).map(event => {
            const colors = getCategoryColors(event.category)
            return (
              <div
                key={event.id}
                draggable
                onDragStart={(e) => handleEventDragStart(event, e)}
                onDragEnd={handleEventDragEnd}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventClick?.(event)
                }}
                className={`text-xs p-1 ${colors.bg} ${colors.text} rounded truncate hover:opacity-80 cursor-move transition-all`}
                title={`${event.name}${event.category ? ` - ${event.category}` : ''}`}
              >
                {event.name}
              </div>
            )
          })}
          {/* Show "+X more" in month view if over 5 events */}
          {viewMode === 'launch' && calendarView === 'month' && dayEvents.length > 5 && (
            <div className="text-xs text-gray-500 font-medium">
              +{dayEvents.length - 5} more
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {getHeaderTitle()}
          </h2>
          
          <div className="flex items-center gap-4">
            {/* Calendar View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setCalendarView('day')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  calendarView === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setCalendarView('week')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  calendarView === 'week'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarView('month')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  calendarView === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('launch')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'launch'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Launch Date
              </button>
              <button
                onClick={() => setViewMode('live')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'live'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Live Dates
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Today
              </button>
              <button
                onClick={navigatePrevious}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={navigateNext}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'} bg-gray-50 border-b border-gray-200`}>
        {calendarView === 'day' ? (
          <div className="text-center text-sm font-semibold text-gray-700 py-2">
            {dayNames[new Date(year, month, day).getDay()]}
          </div>
        ) : (
          dayNames.map(dayName => (
            <div
              key={dayName}
              className="text-center text-sm font-semibold text-gray-700 py-2 border-r border-gray-200 last:border-r-0"
            >
              {dayName}
            </div>
          ))
        )}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 relative overflow-auto">
        <div className={`grid ${calendarView === 'day' ? 'grid-cols-1' : 'grid-cols-7'} auto-rows-fr min-h-full`}>
          {calendarDays}
        </div>
        
        {/* Spanning Events Overlay (Live mode only) - works for Day, Week, Month */}
        {viewMode === 'live' && spanningEvents.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
            {spanningEvents.map((event, idx) => {
              const colors = getCategoryColors(event.category)
              
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
                      left: '4px',
                      right: '4px',
                      top,
                      zIndex: 10,
                      height: '20px',
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      onDragEnd={handleEventDragEnd}
                      onClick={() => onEventClick?.(event)}
                      className={`h-full px-2 py-0.5 ${colors.indicator} text-white text-xs rounded cursor-move hover:opacity-80 transition-all truncate flex items-center font-medium`}
                      title={`${event.name}${event.category ? ` - ${event.category}` : ''}\nStart: ${new Date(event.startDate).toLocaleDateString()}\nEnd: ${new Date(event.endDate).toLocaleDateString()}`}
                    >
                      {event.name}
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
                      marginLeft: '4px',
                      height: '20px',
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => handleEventDragStart(event, e)}
                      onDragEnd={handleEventDragEnd}
                      onClick={() => onEventClick?.(event)}
                      className={`relative h-full px-2 py-0.5 ${colors.indicator} text-white text-xs rounded cursor-move hover:opacity-80 transition-all truncate flex items-center font-medium`}
                      title={`${event.name}${event.category ? ` - ${event.category}` : ''}`}
                    >
                      {segment.isFirst && event.name}
                      
                      {/* Resize Handle - only on last segment */}
                      {segment.isLast && (
                        <div
                          draggable
                          onDragStart={(e) => handleResizeStart(event, e)}
                          onDragEnd={handleResizeEnd}
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Drag to resize"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="w-0.5 h-3 bg-white rounded"></div>
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
    </div>
  )
}

