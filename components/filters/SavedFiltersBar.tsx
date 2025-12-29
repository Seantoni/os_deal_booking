'use client'

import { useState, useRef, useEffect } from 'react'
import FilterListIcon from '@mui/icons-material/FilterList'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import type { SavedFilter } from '@/app/actions/filters'

interface SavedFiltersBarProps {
  savedFilters: SavedFilter[]
  activeFilterId: string | null
  onFilterSelect: (filter: SavedFilter | null) => void
  isAdmin?: boolean
}

export default function SavedFiltersBar({
  savedFilters,
  activeFilterId,
  onFilterSelect,
  isAdmin = false,
}: SavedFiltersBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (savedFilters.length === 0) {
    return null
  }

  const activeFilter = savedFilters.find(f => f.id === activeFilterId)
  
  // Show first 3 filters as quick chips, rest in dropdown
  const quickFilters = savedFilters.slice(0, 3)
  const dropdownFilters = savedFilters.slice(3)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter icon label */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <FilterListIcon className="w-4 h-4" />
        <span className="font-medium">Filtros:</span>
      </div>

      {/* Quick filter chips */}
      {quickFilters.map(filter => (
        <button
          key={filter.id}
          onClick={() => onFilterSelect(activeFilterId === filter.id ? null : filter)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            activeFilterId === filter.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.name}
          {activeFilterId === filter.id && (
            <CheckIcon className="w-3.5 h-3.5 ml-1 inline" />
          )}
        </button>
      ))}

      {/* Dropdown for additional filters */}
      {dropdownFilters.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${
              dropdownFilters.some(f => f.id === activeFilterId)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {dropdownFilters.some(f => f.id === activeFilterId)
              ? activeFilter?.name
              : `+${dropdownFilters.length} más`}
            <ExpandMoreIcon className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
              {dropdownFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => {
                    onFilterSelect(activeFilterId === filter.id ? null : filter)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-gray-50 ${
                    activeFilterId === filter.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {filter.name}
                  {activeFilterId === filter.id && (
                    <CheckIcon className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear filter button */}
      {activeFilterId && (
        <button
          onClick={() => onFilterSelect(null)}
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <CloseIcon className="w-3.5 h-3.5" />
          Limpiar
        </button>
      )}
    </div>
  )
}

