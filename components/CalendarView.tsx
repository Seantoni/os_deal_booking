'use client'

import { useState, useMemo } from 'react'

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

interface CalendarViewProps {
  events: Event[]
  selectedCategories: string[]
}

export default function CalendarView({ events, selectedCategories }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filter events by selected categories
  const filteredEvents = useMemo(() => {
    if (selectedCategories.length === 0) return events
    return events.filter(event => 
      event.category && selectedCategories.includes(event.category)
    )
  }, [events, selectedCategories])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {}
    
    filteredEvents.forEach(event => {
      const eventDate = new Date(event.startDate)
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    
    return grouped
  }, [filteredEvents])

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

  // Generate calendar grid
  const calendarDays = []
  
  // Empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(
      <div key={`empty-${i}`} className="bg-gray-50 border border-gray-200 min-h-32"></div>
    )
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day)
    const today = isToday(day)

    calendarDays.push(
      <div
        key={day}
        className={`border border-gray-200 min-h-32 p-2 ${
          today ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
        } transition-colors`}
      >
        <div className={`text-sm font-medium mb-1 ${
          today ? 'text-blue-600' : 'text-gray-900'
        }`}>
          {day}
        </div>
        
        <div className="space-y-1">
          {dayEvents.slice(0, 3).map(event => (
            <div
              key={event.id}
              className="text-xs p-1 bg-blue-100 text-blue-900 rounded truncate hover:bg-blue-200 cursor-pointer transition-colors"
              title={`${event.name}${event.category ? ` - ${event.category}` : ''}`}
            >
              {event.name}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-xs text-gray-500 font-medium">
              +{dayEvents.length - 3} more
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
            {monthNames[month]} {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Today
            </button>
            <button
              onClick={previousMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {dayNames.map(day => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-gray-700 py-2 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
        {calendarDays}
      </div>
    </div>
  )
}

