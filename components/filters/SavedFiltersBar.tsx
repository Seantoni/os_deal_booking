'use client'

import { useState, useRef, useEffect } from 'react'
import FilterListIcon from '@mui/icons-material/FilterList'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import type { SavedFilter } from '@/app/actions/filters'

interface SavedFiltersBarProps {
  savedFilters: SavedFilter[]
  activeFilterIds?: string[] // Multi-select support
  activeFilterId?: string | null // Legacy single-select support
  onFilterToggle?: (filter: SavedFilter) => void // Multi-select handler
  onFilterSelect?: (filter: SavedFilter | null) => void // Legacy single-select handler
  isAdmin?: boolean
}

export default function SavedFiltersBar({
  savedFilters,
  activeFilterIds = [],
  activeFilterId,
  onFilterToggle,
  onFilterSelect,
  isAdmin = false,
}: SavedFiltersBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine active filter IDs (support both new and legacy props)
  const effectiveActiveIds = activeFilterIds.length > 0 
    ? activeFilterIds 
    : (activeFilterId ? [activeFilterId] : [])

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

  const isFilterActive = (filterId: string) => effectiveActiveIds.includes(filterId)
  const activeCount = effectiveActiveIds.length
  
  // Show first 5 filters as quick chips, rest in dropdown
  const quickFilters = savedFilters.slice(0, 5)
  const dropdownFilters = savedFilters.slice(5)
  const hasActiveInDropdown = dropdownFilters.some(f => isFilterActive(f.id))

  // Handle filter click - supports both multi-select and legacy single-select
  const handleFilterClick = (filter: SavedFilter) => {
    if (onFilterToggle) {
      // Multi-select mode
      onFilterToggle(filter)
    } else if (onFilterSelect) {
      // Legacy single-select mode
      onFilterSelect(isFilterActive(filter.id) ? null : filter)
    }
  }

  // Handle clear all filters
  const handleClearAll = () => {
    if (onFilterToggle) {
      // Clear by toggling each active filter off
      savedFilters
        .filter(f => isFilterActive(f.id))
        .forEach(f => onFilterToggle(f))
    } else if (onFilterSelect) {
      onFilterSelect(null)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Filter icon label */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <FilterListIcon className="w-4 h-4" />
        <span className="font-medium">Filtros:</span>
        {activeCount > 1 && (
          <span className="text-[10px] text-blue-600 font-medium">(AND)</span>
        )}
      </div>

      {/* Quick filter chips */}
      {quickFilters.map(filter => (
        <button
          key={filter.id}
          onClick={() => handleFilterClick(filter)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            isFilterActive(filter.id)
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {filter.name}
          {isFilterActive(filter.id) && (
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
              hasActiveInDropdown
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {hasActiveInDropdown
              ? `${dropdownFilters.filter(f => isFilterActive(f.id)).length} seleccionados`
              : `+${dropdownFilters.length} más`}
            <ExpandMoreIcon className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1">
              {dropdownFilters.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => handleFilterClick(filter)}
                  className={`w-full px-3 py-2 text-xs text-left flex items-center justify-between hover:bg-gray-50 ${
                    isFilterActive(filter.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {filter.name}
                  {isFilterActive(filter.id) && (
                    <CheckIcon className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clear all filters button */}
      {activeCount > 0 && (
        <button
          onClick={handleClearAll}
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <CloseIcon className="w-3.5 h-3.5" />
          Limpiar{activeCount > 1 ? ` (${activeCount})` : ''}
        </button>
      )}
    </div>
  )
}

