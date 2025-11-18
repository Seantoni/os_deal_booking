'use client'

import { CATEGORIES } from '@/lib/categories'
import { useState, useRef, useEffect } from 'react'

interface CategorySelectProps {
  value: string
  onChange: (value: string) => void
}

export default function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filteredCategories, setFilteredCategories] = useState<string[]>([...CATEGORIES])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const filtered = CATEGORIES.filter(cat =>
      cat.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredCategories([...filtered])
  }, [search])

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

  const handleSelect = (category: string) => {
    onChange(category)
    setIsOpen(false)
    setSearch('')
  }

  const displayValue = value || 'Select a category...'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {displayValue}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Type to search (e.g., Ma)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredCategories.length > 0 ? (
              <>
                {value && (
                  <button
                    type="button"
                    onClick={() => handleSelect('')}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-gray-500 italic"
                  >
                    Clear selection
                  </button>
                )}
                {filteredCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelect(category)}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${
                      value === category ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </>
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

