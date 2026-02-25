'use client'

import { forwardRef, useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { SelectHTMLAttributes, ReactNode } from 'react'
import { Input } from './Input'

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
  sm: 'px-3 py-1.5 text-sm',
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
  const [search, setSearch] = useState('')
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

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search) return options
    return options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  // Reset selectedIndex when search changes
  useEffect(() => {
    setSelectedIndex(-1)
  }, [search])

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Use viewport coordinates for fixed positioning (no scroll offset needed)
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
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
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = useCallback((optionValue: string) => {
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
    setSearch('')
  }, [onChange])

  // Handle keyboard input on the button to open dropdown and start searching
  const handleButtonKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return

    // If it's a printable character (letter, number, symbol), open dropdown and search
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      setSearch(e.key)
      setIsOpen(true)
    }
    // Arrow down/up or Enter/Space to open dropdown
    else if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key) && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
      if (e.key === 'ArrowDown') {
        setSelectedIndex(0)
      }
    }
    // Handle navigation when already open
    else if (isOpen && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        handleSelect(filteredOptions[selectedIndex].value)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        setSearch('')
      }
    }
    // Escape to close if open
    else if (e.key === 'Escape' && isOpen) {
      setIsOpen(false)
      setSearch('')
    }
  }, [disabled, isOpen, filteredOptions, selectedIndex, handleSelect])

  const displayValue = currentOption ? currentOption.label : (placeholder || 'Seleccionar una opción')

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
      <div className="p-2 border-b border-gray-200">
        <Input
          type="text"
          placeholder="Escriba para buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (filteredOptions.length === 0) return
            
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelectedIndex(prev => 
                prev < filteredOptions.length - 1 ? prev + 1 : 0
              )
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelectedIndex(prev => 
                prev > 0 ? prev - 1 : filteredOptions.length - 1
              )
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
              e.preventDefault()
              handleSelect(filteredOptions[selectedIndex].value)
            } else if (e.key === 'Escape') {
              setIsOpen(false)
              setSelectedIndex(-1)
              setSearch('')
            }
          }}
          autoFocus
          size="sm"
        />
      </div>
      <div className="overflow-y-auto max-h-48">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
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
            {search ? 'No se encontraron resultados' : 'No hay opciones disponibles'}
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  const base =
    'w-full bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-300'

  return (
    <div className={cn('flex flex-col gap-0.5', fullWidth && 'w-full')}>
      {label && (
        <label className="block text-sm font-medium text-slate-600">
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
          onKeyDown={handleButtonKeyDown}
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
        <span className="text-sm text-red-600">{error}</span>
      ) : helperText ? (
        <span className="text-sm text-gray-500">{helperText}</span>
      ) : null}
    </div>
  )
})

export default Select
