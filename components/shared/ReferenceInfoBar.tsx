'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import EventIcon from '@mui/icons-material/Event'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FlagIcon from '@mui/icons-material/Flag'
import HistoryIcon from '@mui/icons-material/History'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupsIcon from '@mui/icons-material/Groups'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import UserSelect from './UserSelect'

// Compact date formatter - always shows "4 ene" format for brevity
function formatCompactDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleDateString('es-ES', { 
    timeZone: PANAMA_TIMEZONE, 
    month: 'short', 
    day: 'numeric' 
  })
}

// Mini portal-based select for compact inline use
function InlineSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 150),
      })
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const dropdown = isOpen && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left, width: position.width, zIndex: 99999 }}
    >
      <button
        type="button"
        onClick={() => { onChange(''); setIsOpen(false) }}
        className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50"
      >
        {placeholder}
      </button>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { onChange(opt.value); setIsOpen(false) }}
          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 ${value === opt.value ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs border border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded px-2 py-0.5 bg-white shadow-sm flex items-center gap-1 hover:border-gray-400"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{selectedLabel}</span>
        <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {dropdown}
    </>
  )
}

// Generic item component (kept for backwards compatibility)
function Item({ 
  icon, 
  label, 
  children 
}: { 
  icon?: React.ReactNode
  label: string
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="font-medium text-gray-500">{label}:</span>
      {children}
    </div>
  )
}

// Date item component (kept for backwards compatibility)
function DateItem({ 
  icon, 
  label, 
  date, 
  formatFn 
}: { 
  icon?: React.ReactNode
  label: string
  date: string | Date | null | undefined
  formatFn?: (date: string | Date | null | undefined) => string
}) {
  const formattedDate = formatFn 
    ? formatFn(date) 
    : formatCompactDate(date)
  
  // Don't render if no date
  if (!date) return null
  
  return (
    <Item 
      icon={icon || <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label={label}
    >
      <span>{formattedDate}</span>
    </Item>
  )
}

// Created date item (with "Nuevo" fallback)
function CreatedDateItem({ 
  entity, 
  createdAt 
}: { 
  entity?: { createdAt?: string | Date } | null
  createdAt?: string | Date | null
}) {
  const date = createdAt || entity?.createdAt
  
  return (
    <Item 
      icon={<CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label="Creado"
    >
      {date ? (
        <span>{formatCompactDate(date)}</span>
      ) : (
        <span className="text-gray-400">Nuevo</span>
      )}
    </Item>
  )
}

// User selector item
function UserSelectItem({
  label,
  userId,
  users,
  isAdmin,
  onChange,
  placeholder,
}: {
  label: string
  userId: string | null
  users: Array<{ clerkId: string; name?: string | null; email?: string | null }>
  isAdmin: boolean
  onChange: (id: string) => void
  placeholder: string
}) {
  const userOptions = users.map(u => ({
    clerkId: u.clerkId,
    name: u.name || null,
    email: u.email || null,
  }))

  const handleChange = (newUserId: string | null) => {
    onChange(newUserId || '')
  }

  return (
    <Item 
      icon={<PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label={label}
    >
      <UserSelect
        value={userId}
        onChange={handleChange}
        users={userOptions}
        canEdit={isAdmin}
        placeholder={placeholder}
        showIcon={false}
        showLabel={false}
        size="sm"
        variant="inline"
      />
    </Item>
  )
}

// Team selector item
function TeamSelectItem({
  label,
  team,
  onChange,
  placeholder,
}: {
  label: string
  team: string
  onChange: (team: string) => void
  placeholder: string
}) {
  const teamOptions = [
    { value: 'Inside Sales', label: 'Inside Sales' },
    { value: 'Outside Sales', label: 'Outside Sales' },
  ]

  return (
    <Item label={label}>
      <InlineSelect
        value={team}
        onChange={onChange}
        options={teamOptions}
        placeholder={placeholder}
      />
    </Item>
  )
}

// Read-only user display item
function UserDisplayItem({
  label,
  user,
}: {
  label: string
  user?: { name?: string | null; email?: string | null } | null
}) {
  if (!user) return null

  return (
    <Item 
      icon={<PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label={label}
    >
      <span>{user.name || user.email || 'N/A'}</span>
    </Item>
  )
}

// Text input item for editable text fields
function TextItem({
  label,
  value,
  onChange,
  placeholder,
  icon,
  readOnly = false,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  icon?: React.ReactNode
  readOnly?: boolean
}) {
  return (
    <Item 
      icon={icon}
      label={label}
    >
      {readOnly ? (
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder || '-'}
        </span>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-0.5 bg-white shadow-sm w-24"
        />
      )}
    </Item>
  )
}

// NEW: Activity Pair - shows Next/Last for a category in compact format
function ActivityPair({
  icon,
  label,
  nextDate,
  lastDate,
}: {
  icon: React.ReactNode
  label: string
  nextDate?: string | Date | null
  lastDate?: string | Date | null
}) {
  // Don't render if no dates
  if (!nextDate && !lastDate) return null

  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] font-medium text-gray-500 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        {nextDate && (
          <span className="text-xs font-semibold text-gray-900">
            Próx: {formatCompactDate(nextDate)}
          </span>
        )}
        {lastDate && (
          <span className="text-[10px] text-gray-400">
            Últ: {formatCompactDate(lastDate)}
          </span>
        )}
      </div>
    </div>
  )
}

// NEW: Compact Date - for timeline dates with minimal label
function CompactDate({
  label,
  date,
  muted = false,
}: {
  label: string
  date?: string | Date | null
  muted?: boolean
}) {
  // Don't render if no date
  if (!date) return null

  return (
    <span className={`text-xs ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
      <span className="text-gray-400">{label}:</span> {formatCompactDate(date)}
    </span>
  )
}

// NEW: Compact User - for owner display
function CompactUser({
  user,
  users,
  isAdmin,
  onChange,
  placeholder,
}: {
  user: string | null
  users: Array<{ clerkId: string; name?: string | null; email?: string | null }>
  isAdmin: boolean
  onChange: (id: string) => void
  placeholder: string
}) {
  const userOptions = users.map(u => ({
    clerkId: u.clerkId,
    name: u.name || null,
    email: u.email || null,
  }))

  const handleChange = (newUserId: string | null) => {
    onChange(newUserId || '')
  }

  const selectedUser = users.find(u => u.clerkId === user)
  const displayName = selectedUser?.name?.split(' ')[0] || selectedUser?.email?.split('@')[0] || placeholder

  return (
    <div className="flex items-center gap-1.5">
      <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />
      {isAdmin ? (
        <UserSelect
          value={user}
          onChange={handleChange}
          users={userOptions}
          canEdit={isAdmin}
          placeholder={placeholder}
          showIcon={false}
          showLabel={false}
          size="sm"
          variant="inline"
        />
      ) : (
        <span className="text-xs font-medium text-gray-700">{displayName}</span>
      )}
    </div>
  )
}

// Section component with background pill styling
const Section = ({ children, label }: { children: React.ReactNode; label?: string }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg">
      {label && (
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      )}
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  )
}

// Main container component - now with 2-line layout option
interface ReferenceInfoBarProps {
  children: React.ReactNode
  variant?: 'default' | 'border-bottom' | 'compact'
}

const ReferenceInfoBarComponent = ({ 
  children, 
  variant = 'default' 
}: ReferenceInfoBarProps) => {
  const containerClass = variant === 'border-bottom'
    ? 'bg-gray-50 border-b border-gray-200 px-4 py-2'
    : variant === 'compact'
    ? 'bg-gray-50/50 px-4 py-1.5'
    : 'bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5'

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        {children}
      </div>
    </div>
  )
}

// Icons for custom use
const Icons = {
  Calendar: CalendarTodayIcon,
  Person: PersonOutlineIcon,
  Event: EventIcon,
  PlayArrow: PlayArrowIcon,
  Flag: FlagIcon,
  History: HistoryIcon,
  Task: AssignmentIcon,
  Meeting: GroupsIcon,
  Schedule: ScheduleIcon,
}

// Create compound component
const ReferenceInfoBar = Object.assign(ReferenceInfoBarComponent, {
  Item,
  DateItem,
  CreatedDateItem,
  UserSelectItem,
  TeamSelectItem,
  UserDisplayItem,
  TextItem,
  Section,
  ActivityPair,
  CompactDate,
  CompactUser,
  Icons,
})

export default ReferenceInfoBar
