'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type DropdownItem = {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface DropdownProps {
  items: DropdownItem[]
  onSelect: (value: string) => void
  placeholder?: string
  selectedLabel?: string
  fullWidth?: boolean
  className?: string
  buttonClassName?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function Dropdown({
  items,
  onSelect,
  placeholder = 'Select...',
  selectedLabel,
  fullWidth = false,
  className,
  buttonClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div ref={ref} className={cn('relative inline-block text-left', fullWidth && 'w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex items-center justify-between gap-2',
          buttonClassName
        )}
      >
        <span className={cn('truncate', !selectedLabel && 'text-gray-400')}>{selectedLabel || placeholder}</span>
        <svg
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-[9999] mt-1 w-full min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          <ul className="max-h-60 overflow-auto py-1">
            {items.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return
                    onSelect(item.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-start gap-2',
                    'hover:bg-blue-50 focus:bg-blue-50 focus:outline-none',
                    item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800'
                  )}
                >
                  {item.icon && <span className="mt-0.5 text-gray-500">{item.icon}</span>}
                  <span className="flex-1">
                    <span className="block font-medium">{item.label}</span>
                    {item.description && (
                      <span className="block text-[11px] text-gray-500 leading-tight">{item.description}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No options</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Dropdown

