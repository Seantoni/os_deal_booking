'use client'

import { getCategoryOptions, CategoryOption } from '@/lib/categories'
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui'

// Category data structure from DynamicFormField
interface CategoryData {
  id: string
  categoryKey?: string
  parentCategory: string
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

interface CategorySelectProps {
  // Legacy interface (for EventModal, ConfiguracionStep, etc.)
  selectedOption?: CategoryOption | null
  onChange?: (option: CategoryOption) => void
  
  // New value-based interface (for DynamicFormField)
  value?: string | null
  onValueChange?: (id: string | null) => void
  categories?: CategoryData[] // Optional: pass categories directly instead of fetching
  
  // Common props
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: string
  placeholder?: string
  size?: 'sm' | 'md'
}

export default function CategorySelect({
  // Legacy props
  selectedOption,
  onChange,
  // New props
  value,
  onValueChange,
  categories: externalCategories,
  // Common props
  label,
  required = false,
  disabled = false,
  error,
  helpText,
  placeholder = 'Select a category...',
  size = 'md',
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [internalOptions, setInternalOptions] = useState<CategoryOption[]>([])
  const [filteredOptions, setFilteredOptions] = useState<CategoryOption[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Determine if we're using the legacy or new interface
  const isLegacyMode = selectedOption !== undefined || (onChange !== undefined && onValueChange === undefined)

  // Convert external categories to CategoryOption format
  const options: CategoryOption[] = useMemo(() => {
    if (externalCategories && externalCategories.length > 0) {
      return externalCategories.map(cat => ({
        value: cat.id,
        label: `${cat.parentCategory}${cat.subCategory1 ? ` > ${cat.subCategory1}` : ''}${cat.subCategory2 ? ` > ${cat.subCategory2}` : ''}${cat.subCategory3 ? ` > ${cat.subCategory3}` : ''}${cat.subCategory4 ? ` > ${cat.subCategory4}` : ''}`,
        parent: cat.parentCategory,
        sub1: cat.subCategory1,
        sub2: cat.subCategory2,
        sub3: cat.subCategory3,
        sub4: cat.subCategory4,
      }))
    }
    return internalOptions
  }, [externalCategories, internalOptions])

  // Fetch categories only if not provided externally
  useEffect(() => {
    if (!externalCategories || externalCategories.length === 0) {
      const opts = getCategoryOptions()
      setInternalOptions(opts)
    }
  }, [externalCategories])

  // Filter options based on search
  useEffect(() => {
    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
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
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
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
    if (isLegacyMode) {
      return selectedOption
    }
    if (value) {
      return options.find(opt => opt.value === value) || null
    }
    return null
  }, [isLegacyMode, selectedOption, value, options])

  const handleSelect = (option: CategoryOption) => {
    // Call legacy onChange if provided
    if (onChange) {
      onChange(option)
    }
    // Call new onValueChange if provided
    if (onValueChange) {
      onValueChange(option.value)
    }
    setIsOpen(false)
    setSearch('')
  }

  const displayValue = currentSelection ? currentSelection.label : placeholder

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
          placeholder="Type to search..."
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
        {filteredOptions.length > 0 ? (
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
            No categories found
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
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
