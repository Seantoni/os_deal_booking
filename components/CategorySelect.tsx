'use client'

import { getCategoryOptions, CategoryOption } from '@/lib/categories'
import { useState, useRef, useEffect } from 'react'

interface CategorySelectProps {
  selectedOption: CategoryOption | null
  onChange: (option: CategoryOption) => void
}

export default function CategorySelect({ selectedOption, onChange }: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<CategoryOption[]>([])
  const [filteredOptions, setFilteredOptions] = useState<CategoryOption[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opts = getCategoryOptions()
    setOptions(opts)
    setFilteredOptions(opts)
  }, [])

  useEffect(() => {
    const filtered = options.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredOptions(filtered)
  }, [search, options])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (option: CategoryOption) => {
    onChange(option)
    setIsOpen(false)
    setSearch('')
  }

  const displayValue = selectedOption ? selectedOption.label : 'Select a category...'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <span className={`block truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {displayValue}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                  <button
                  key={option.value}
                    type="button"
                  onClick={() => handleSelect(option)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                    selectedOption?.value === option.value ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                  {option.label}
                  </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-500">
                No categories found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
