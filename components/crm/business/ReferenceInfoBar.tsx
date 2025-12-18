'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import type { Business } from '@/types'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

interface ReferenceInfoBarProps {
  business?: Business | null
  ownerId: string
  onOwnerChange: (id: string) => void
  salesTeam: string
  onSalesTeamChange: (team: string) => void
  users: any[]
  isAdmin: boolean
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
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
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

export default function ReferenceInfoBar({
  business,
  ownerId,
  onOwnerChange,
  salesTeam,
  onSalesTeamChange,
  users,
  isAdmin,
}: ReferenceInfoBarProps) {
  const userOptions = users.map(u => ({
    value: u.clerkId,
    label: u.name || u.email || u.clerkId,
  }))

  const teamOptions = [
    { value: 'Inside Sales', label: 'Inside Sales' },
    { value: 'Outside Sales', label: 'Outside Sales' },
  ]

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
      <div className="flex items-center gap-6 text-xs text-gray-600">
        {/* Created At */}
        {business ? (
          <div className="flex items-center gap-1.5">
            <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />
            <span className="font-medium text-gray-500">Created:</span>
            <span>{new Date(business.createdAt).toLocaleDateString('en-US', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 14 }} />
            <span className="font-medium text-gray-500">Created:</span>
            <span className="text-gray-400">New</span>
          </div>
        )}
        
        {/* Owner - Editable */}
        <div className="flex items-center gap-1.5">
          <PersonOutlineIcon className="text-gray-400" style={{ fontSize: 14 }} />
          <span className="font-medium text-gray-500">Owner:</span>
          {isAdmin ? (
            <InlineSelect
              value={ownerId}
              onChange={onOwnerChange}
              options={userOptions}
              placeholder="Select owner..."
            />
          ) : (
            <span>
              {ownerId && users.length > 0
                ? (users.find(u => u.clerkId === ownerId)?.name || users.find(u => u.clerkId === ownerId)?.email || 'N/A')
                : 'N/A'}
            </span>
          )}
        </div>
        
        {/* Sales Team - Editable */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-500">Team:</span>
          <InlineSelect
            value={salesTeam}
            onChange={onSalesTeamChange}
            options={teamOptions}
            placeholder="Select team..."
          />
        </div>
      </div>
    </div>
  )
}

