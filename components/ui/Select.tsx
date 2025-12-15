'use client'

import { forwardRef, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { SelectHTMLAttributes, ReactNode } from 'react'

type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'children'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  size?: SelectSize
  fullWidth?: boolean
  options: readonly { value: string; label: string }[]
  placeholder?: string
}

const sizeClasses: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'text-base px-4 py-2.5',
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    helperText,
    leftIcon,
    size = 'md',
    fullWidth = true,
    className,
    disabled,
    options,
    placeholder,
    value,
    onChange,
    ...props
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Find current selection
  const currentValue = typeof value === 'string' ? value : ''
  const currentOption = useMemo(() => {
    return options.find(opt => opt.value === currentValue) || null
  }, [options, currentValue])

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      // Create a synthetic event to match native select behavior
      const syntheticEvent = {
        target: { value: optionValue },
        currentTarget: { value: optionValue },
      } as React.ChangeEvent<HTMLSelectElement>
      onChange(syntheticEvent)
    }
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const displayValue = currentOption ? currentOption.label : (placeholder || 'Select an option')

  // Dropdown content rendered via portal
  const dropdownContent = isOpen && typeof window !== 'undefined' ? createPortal(
    <div 
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999,
      }}
    >
      {placeholder && (
        <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-200 bg-gray-50">
          {placeholder}
        </div>
      )}
      <div className="overflow-y-auto max-h-48">
        {options.length > 0 ? (
          options.map((option, index) => {
            const isSelected = index === selectedIndex
            const isCurrentSelection = currentValue === option.value
            
            return (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el
                }}
                type="button"
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : isCurrentSelection
                    ? 'bg-blue-50/50 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            )
          })
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No options available
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  const base =
    'w-full bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-300'

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {leftIcon}
          </span>
        )}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            base,
            sizeClasses[size],
            leftIcon ? 'pl-9' : '',
            'flex items-center justify-between gap-2',
            error ? 'border-red-300' : 'border-gray-200',
            disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'text-gray-800',
            className
          )}
          onKeyDown={(e) => {
            if (disabled) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(!isOpen)
            } else if (e.key === 'ArrowDown' && !isOpen) {
              e.preventDefault()
              setIsOpen(true)
              setSelectedIndex(0)
            } else if (isOpen && options.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => 
                  prev < options.length - 1 ? prev + 1 : 0
                )
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => 
                  prev > 0 ? prev - 1 : options.length - 1
                )
              } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault()
                handleSelect(options[selectedIndex].value)
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setIsOpen(false)
                setSelectedIndex(-1)
              }
            }
          }}
        >
          <span className={cn('truncate', currentOption ? 'text-gray-900' : 'text-gray-400')}>
            {displayValue}
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
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

        {dropdownContent}
      </div>
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-gray-500">{helperText}</span>
      ) : null}
    </div>
  )
})

export default Select
