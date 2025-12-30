'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

export interface UserOption {
  clerkId: string
  name: string | null
  email: string | null
}

interface UserSelectProps {
  value: string | null
  onChange: (userId: string | null, user: UserOption | null) => void
  users: UserOption[]
  placeholder?: string
  disabled?: boolean
  canEdit?: boolean
  showIcon?: boolean
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md'
  variant?: 'default' | 'inline' | 'compact'
}

export default function UserSelect({
  value,
  onChange,
  users,
  placeholder = 'Sin asignar',
  disabled = false,
  canEdit = true,
  showIcon = true,
  showLabel = false,
  label = 'Responsable',
  size = 'sm',
  variant = 'default',
}: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedUser = value ? users.find(u => u.clerkId === value) : null
  const displayName = selectedUser
    ? (selectedUser.name || selectedUser.email || 'Usuario')
    : placeholder

  // Get initials for avatar
  const getInitials = (user: UserOption | null) => {
    if (!user) return '?'
    const name = user.name || user.email || ''
    return name.charAt(0).toUpperCase()
  }

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 180),
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

  const handleSelect = (userId: string | null) => {
    const user = userId ? users.find(u => u.clerkId === userId) || null : null
    onChange(userId, user)
    setIsOpen(false)
  }

  // Render dropdown via portal
  const dropdown = isOpen && typeof window !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-64 overflow-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: position.width,
      }}
    >
      {/* Unassigned option */}
      <button
        type="button"
        onClick={() => handleSelect(null)}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
          !value ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
          ?
        </div>
        <span>{placeholder}</span>
      </button>
      
      {/* User options */}
      {users.map(user => (
        <button
          key={user.clerkId}
          type="button"
          onClick={() => handleSelect(user.clerkId)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors ${
            value === user.clerkId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
            value === user.clerkId ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            {getInitials(user)}
          </div>
          <span className="truncate">{user.name || user.email || user.clerkId}</span>
        </button>
      ))}
    </div>,
    document.body
  ) : null

  // Read-only display
  if (!canEdit || disabled) {
    return (
      <div className={`flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
        {showIcon && (
          <PersonOutlineIcon 
            className="text-gray-400" 
            style={{ fontSize: size === 'sm' ? 14 : 16 }} 
          />
        )}
        {showLabel && (
          <span className="text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        )}
        {selectedUser ? (
          <div className="flex items-center gap-1.5">
            <div className={`rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-medium ${
              size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
            }`}>
              {getInitials(selectedUser)}
            </div>
            <span className="text-gray-700">{displayName}</span>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>
    )
  }

  // Editable select
  return (
    <div className={`flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {showIcon && variant !== 'compact' && (
        <PersonOutlineIcon 
          className="text-gray-400" 
          style={{ fontSize: size === 'sm' ? 14 : 16 }} 
        />
      )}
      {showLabel && (
        <span className="text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setIsOpen(!isOpen)
        }}
        className={`flex items-center gap-1.5 transition-colors rounded ${
          variant === 'compact'
            ? 'px-2 py-1 border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            : variant === 'inline'
            ? 'hover:bg-gray-100 px-1.5 py-0.5 -mx-1'
            : 'px-2 py-1 border border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        {selectedUser ? (
          <>
            <div className={`rounded-full flex items-center justify-center text-xs font-medium ${
              size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
            } bg-blue-600 text-white`}>
              {getInitials(selectedUser)}
            </div>
            <span className="text-gray-700 truncate max-w-[100px]">{displayName}</span>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <KeyboardArrowDownIcon 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          style={{ fontSize: size === 'sm' ? 14 : 16 }} 
        />
      </button>
      {dropdown}
    </div>
  )
}

