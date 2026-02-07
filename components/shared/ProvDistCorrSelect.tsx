'use client'

import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui'

export interface ProvDistCorrOption {
  value: string  // The full string e.g. "BOCAS DEL TORO,CHANGUINOLA,LAS TABLAS"
  label: string  // Display label (same as value for now)
}

interface ProvDistCorrSelectProps {
  value?: string | null
  onChange?: (value: string | null) => void
  options?: ProvDistCorrOption[]  // Optional: pass options directly instead of fetching
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: string
  placeholder?: string
  size?: 'sm' | 'md'
}

function ProvDistCorrSelect({
  value,
  onChange,
  options: externalOptions,
  label,
  required = false,
  disabled = false,
  error,
  helpText,
  placeholder = 'Seleccionar ubicación...',
  size = 'md',
}: ProvDistCorrSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [internalOptions, setInternalOptions] = useState<ProvDistCorrOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filteredOptions, setFilteredOptions] = useState<ProvDistCorrOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Use external options if provided, otherwise use internal
  const options: ProvDistCorrOption[] = useMemo(() => {
    if (externalOptions && externalOptions.length > 0) {
      return externalOptions
    }
    return internalOptions
  }, [externalOptions, internalOptions])

  // Fetch from API if not provided externally
  useEffect(() => {
    if (!externalOptions || externalOptions.length === 0) {
      setIsLoading(true)
      fetch('/api/prov-dist-corr')
        .then(res => res.json())
        .then(data => {
          const opts: ProvDistCorrOption[] = data.map((item: { id: string; value: string }) => ({
            value: item.value,
            label: item.value,
          }))
          setInternalOptions(opts)
        })
        .catch(err => {
          console.error('Error fetching prov-dist-corr:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [externalOptions])

  // Filter options based on search
  useEffect(() => {
    const searchLower = search.toLowerCase()
    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(searchLower)
    )
    setFilteredOptions(filtered)
    setSelectedIndex(-1)
  }, [search, options])

  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Update dropdown position when open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Handle click outside
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

  // Get the currently selected option
  const currentSelection = useMemo(() => {
    if (value) {
      return options.find(opt => opt.value === value) || null
    }
    return null
  }, [value, options])

  const handleSelect = useCallback((option: ProvDistCorrOption) => {
    if (onChange) {
      onChange(option.value)
    }
    setIsOpen(false)
    setSearch('')
  }, [onChange])

  const displayValue = currentSelection ? currentSelection.label : placeholder

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
    }
    // Escape to close if open
    else if (e.key === 'Escape' && isOpen) {
      setIsOpen(false)
      setSearch('')
    }
  }, [disabled, isOpen])

  // Size classes
  const sizeClasses = size === 'sm' 
    ? 'px-3 py-1.5 text-xs' 
    : 'px-3 py-2 text-sm'

  // Dropdown content
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
              handleSelect(filteredOptions[selectedIndex])
            } else if (e.key === 'Escape') {
              setIsOpen(false)
              setSelectedIndex(-1)
            }
          }}
          autoFocus
          size="sm"
        />
      </div>
      <div className="overflow-y-auto max-h-48">
        {isLoading ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            Cargando...
          </div>
        ) : filteredOptions.length > 0 ? (
          filteredOptions.map((option, index) => {
            const isSelected = index === selectedIndex
            const isCurrentSelection = currentSelection?.value === option.value
            
            return (
              <button
                key={option.value}
                ref={(el) => {
                  optionRefs.current[index] = el
                }}
                type="button"
                onClick={() => handleSelect(option)}
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
            No se encontraron resultados
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleButtonKeyDown}
          disabled={disabled}
          className={`w-full bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 flex items-center justify-between gap-2 transition-all duration-200 ${sizeClasses} ${
            disabled 
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'border-gray-200 hover:border-gray-300 text-gray-800'
          } ${error ? 'border-red-300' : ''}`}
        >
          <span className={`truncate ${currentSelection ? 'text-gray-900' : 'text-gray-400'}`}>
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
      
      {error && <span className="text-xs text-red-600">{error}</span>}
      {helpText && !error && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  )
}

// Memoize to prevent re-renders when parent form updates unrelated fields
export default memo(ProvDistCorrSelect)
