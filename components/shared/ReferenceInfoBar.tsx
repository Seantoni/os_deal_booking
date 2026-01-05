'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import EventIcon from '@mui/icons-material/Event'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FlagIcon from '@mui/icons-material/Flag'
import HistoryIcon from '@mui/icons-material/History'
import { formatShortDate } from '@/lib/date'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import UserSelect from './UserSelect'

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
      // Use viewport coordinates for fixed positioning (no scroll offset needed)
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

// Generic item component
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

// Date item component
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
    : (date ? formatShortDate(date instanceof Date ? date.toISOString() : date) : '')
  return (
    <Item 
      icon={icon || <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label={label}
    >
      <span className={date ? '' : 'text-gray-400'}>{formattedDate || 'N/A'}</span>
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
  const formatDate = (d: string | Date | null | undefined) => {
    if (!d) return ''
    if (typeof d === 'string') {
      return new Date(d).toLocaleDateString('en-US', { 
        timeZone: PANAMA_TIMEZONE, 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
    return d.toLocaleDateString('en-US', { 
      timeZone: PANAMA_TIMEZONE, 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <Item 
      icon={<CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />}
      label="Creado"
    >
      {date ? (
        <span>{formatDate(date)}</span>
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
  // Convert users to the format expected by UserSelect
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
    { value: 'Inside Sales', label: 'Ventas Internas' },
    { value: 'Outside Sales', label: 'Ventas Externas' },
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

// Section component for grouping related items
function Section({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 pr-3 border-r border-gray-300 last:border-r-0 last:pr-0">
      {label && <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>}
      <div className="flex items-center gap-3">
        {children}
      </div>
    </div>
  )
}

// Main container component
interface ReferenceInfoBarProps {
  children: React.ReactNode
  variant?: 'default' | 'border-bottom'
}

function ReferenceInfoBar({ 
  children, 
  variant = 'default' 
}: ReferenceInfoBarProps) {
  const containerClass = variant === 'border-bottom'
    ? 'bg-gray-50 border-b border-gray-200 px-4 py-2.5'
    : 'bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5'

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
        {children}
      </div>
    </div>
  )
}

// Export sub-components
ReferenceInfoBar.Item = Item
ReferenceInfoBar.DateItem = DateItem
ReferenceInfoBar.CreatedDateItem = CreatedDateItem
ReferenceInfoBar.UserSelectItem = UserSelectItem
ReferenceInfoBar.TeamSelectItem = TeamSelectItem
ReferenceInfoBar.UserDisplayItem = UserDisplayItem
ReferenceInfoBar.Section = Section

// Export icons for custom use
ReferenceInfoBar.Icons = {
  Calendar: CalendarTodayIcon,
  Person: PersonOutlineIcon,
  Event: EventIcon,
  PlayArrow: PlayArrowIcon,
  Flag: FlagIcon,
  History: HistoryIcon,
}

export default ReferenceInfoBar

