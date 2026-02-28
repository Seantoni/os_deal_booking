'use client'

import { useState, useMemo } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { getDailyLimitStatus } from '@/lib/event-validation'
import { getSettings } from '@/lib/settings'

interface MiniCalendarProps {
  onDateSelect?: (date: Date, mode: 'day') => void
  onRangeSelect?: (startDate: Date, endDate: Date) => void
  onMonthSelect?: (year: number, month: number) => void
  onClearSelection?: () => void
  onMonthChange?: (year: number, month: number) => void
  selectedDate?: Date | null
  selectedRange?: { start: Date; end: Date } | null
  dayCounts?: Record<string, number>
  isLoadingCounts?: boolean
}

export default function MiniCalendar({
  onDateSelect,
  onRangeSelect,
  onMonthSelect,
  onClearSelection,
  onMonthChange,
  selectedDate,
  selectedRange,
  dayCounts = {},
  isLoadingCounts = false,
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dragStartDay, setDragStartDay] = useState<number | null>(null)
  const [dragEndDay, setDragEndDay] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const userSettings = getSettings()

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const getDayStatus = (day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dailyCount = dayCounts[key] || 0
    return getDailyLimitStatus(
      dailyCount,
      userSettings.minDailyLaunches,
      userSettings.maxDailyLaunches
    )
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const calendarData = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const daysInMonth = lastDayOfMonth.getDate()
    const startingDayOfWeek = firstDayOfMonth.getDay()

    const days: (number | null)[] = []
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }

    return { days, daysInMonth }
  }, [year, month])

  const navigatePrevious = () => {
    const newDate = new Date(year, month - 1, 1)
    setCurrentDate(newDate)
    const newMonth = newDate.getMonth()
    const newYear = newDate.getFullYear()
    onMonthChange?.(newYear, newMonth + 1)
  }

  const navigateNext = () => {
    const newDate = new Date(year, month + 1, 1)
    setCurrentDate(newDate)
    const newMonth = newDate.getMonth()
    const newYear = newDate.getFullYear()
    onMonthChange?.(newYear, newMonth + 1)
  }

  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    )
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    )
  }

  const isInSelectedRange = (day: number) => {
    if (!selectedRange) return false
    const date = new Date(year, month, day)
    return date >= selectedRange.start && date <= selectedRange.end
  }

  const isRangeStart = (day: number) => {
    if (!selectedRange) return false
    return (
      selectedRange.start.getDate() === day &&
      selectedRange.start.getMonth() === month &&
      selectedRange.start.getFullYear() === year
    )
  }

  const isRangeEnd = (day: number) => {
    if (!selectedRange) return false
    return (
      selectedRange.end.getDate() === day &&
      selectedRange.end.getMonth() === month &&
      selectedRange.end.getFullYear() === year
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
      
      const startDate = new Date(year, month, startDay, 12, 0, 0)
      const endDate = new Date(year, month, endDay, 12, 0, 0)
      
      if (startDay === endDay) {
        const isAlreadySelected = selectedDate && 
          selectedDate.getDate() === day &&
          selectedDate.getMonth() === month &&
          selectedDate.getFullYear() === year
        
        if (isAlreadySelected) {
          onClearSelection?.()
        } else {
          onDateSelect?.(startDate, 'day')
        }
      } else {
        onRangeSelect?.(startDate, endDate)
      }
      
      setDragStartDay(null)
      setDragEndDay(null)
    }
  }

  const handleMonthClick = () => {
    onMonthSelect?.(year, month)
  }

  return (
    <div className="p-2 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200/80 shadow-sm relative">
      {/* Loading overlay */}
      {isLoadingCounts && (
        <div className="absolute inset-0 z-10 bg-white/60 rounded-lg flex items-center justify-center backdrop-blur-[0.5px]">
          <span className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={navigatePrevious}
          className="w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
        >
          <ChevronLeftIcon style={{ fontSize: 16 }} />
        </button>
        
        <button
          onClick={handleMonthClick}
          className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all"
          title="View entire month"
        >
          {monthNames[month]} {year}
        </button>
        
        <button
          onClick={navigateNext}
          className="w-6 h-6 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
        >
          <ChevronRightIcon style={{ fontSize: 16 }} />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {dayNames.map((dayName, idx) => (
          <div
            key={idx}
            className="text-center text-[9px] font-semibold text-slate-400 py-0.5"
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div 
        className="grid grid-cols-7 gap-px"
        onMouseLeave={() => {
          if (isDragging) {
            setIsDragging(false)
            setDragStartDay(null)
            setDragEndDay(null)
          }
        }}
      >
        {calendarData.days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-6" />
          }

          const today = isToday(day)
          const selected = isSelected(day)
          const inSelectedRange = isInSelectedRange(day)
          const rangeStart = isRangeStart(day)
          const rangeEnd = isRangeEnd(day)
          const inDrag = isInDragRange(day)
          const dayStatus = isLoadingCounts ? null : getDayStatus(day)
          
          const showStatusColor = dayStatus && !selected && !inSelectedRange && !rangeStart && !rangeEnd && !inDrag && !today
          
          const getStatusBg = () => {
            if (!showStatusColor) return ''
            if (dayStatus === 'under') return 'bg-red-50 text-red-700 ring-1 ring-red-200'
            if (dayStatus === 'over') return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
            return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          }

          return (
            <button
              key={day}
              onMouseDown={() => handleMouseDown(day)}
              onMouseEnter={() => handleMouseEnter(day)}
              onMouseUp={() => handleMouseUp(day)}
              className={`
                h-6 w-full text-[10px] font-medium rounded transition-all select-none
                ${today && !selected && !inSelectedRange && !inDrag
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                  : ''
                }
                ${selected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : ''
                }
                ${inSelectedRange && !rangeStart && !rangeEnd
                  ? 'bg-blue-100 text-blue-800'
                  : ''
                }
                ${rangeStart || rangeEnd
                  ? 'bg-blue-600 text-white shadow-sm'
                  : ''
                }
                ${inDrag && !selected
                  ? 'bg-blue-200 text-blue-900'
                  : ''
                }
                ${showStatusColor
                  ? getStatusBg()
                  : (!today && !selected && !inSelectedRange && !inDrag ? 'text-slate-700 hover:bg-slate-100' : '')
                }
              `}
              title={showStatusColor ? `${dayStatus === 'under' ? 'Under minimum' : dayStatus === 'over' ? 'Over maximum' : 'Within range'}` : undefined}
            >
              {day}
            </button>
          )
        })}
      </div>

    </div>
  )
}
