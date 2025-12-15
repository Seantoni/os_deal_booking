'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import MoreVertIcon from '@mui/icons-material/MoreVert'

type ActionItem = {
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'danger' | 'default'
  icon?: ReactNode
}

interface RowActionsMenuProps {
  items: ActionItem[]
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  buttonClassName?: string
  menuClassName?: string
}

export default function RowActionsMenu({
  items,
  isOpen: controlledOpen,
  onOpenChange,
  buttonClassName = '',
  menuClassName = '',
}: RowActionsMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isOpen = controlledOpen ?? internalOpen

  const setOpen = (next: boolean) => {
    if (onOpenChange) {
      onOpenChange(next)
    } else {
      setInternalOpen(next)
    }
  }

  const close = () => setOpen(false)
  const toggle = () => setOpen(!isOpen)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const visibleItems = useMemo(() => items.filter(Boolean), [items])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        className={`p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors ${buttonClassName}`}
        aria-label="Row actions"
      >
        <MoreVertIcon style={{ fontSize: 20 }} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 ${menuClassName}`}
          onClick={(e) => e.stopPropagation()}
        >
          {visibleItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
                close()
              }}
              disabled={item.disabled}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                item.tone === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${item.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {item.icon && <span className="text-gray-400">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
