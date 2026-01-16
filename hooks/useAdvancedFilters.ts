'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSavedFilters, type SavedFilter, type FilterRule, type EntityType } from '@/app/actions/filters'
import { applyFilters } from '@/lib/filters/applyFilters'

/**
 * Hook for managing advanced filters with saved filters support.
 * 
 * Provides:
 * - Loading and caching of saved filters from the database
 * - State management for active filter and filter rules
 * - Props bundle to spread into EntityPageHeader
 * - Utility function to apply filters to data
 * 
 * @example
 * ```tsx
 * const { headerProps, filterRules, applyFiltersToData } = useAdvancedFilters<Business>('businesses')
 * 
 * const filteredData = useMemo(() => {
 *   let filtered = data
 *   // ...other filters...
 *   return applyFiltersToData(filtered)
 * }, [data, filterRules])
 * 
 * <EntityPageHeader {...otherProps} {...headerProps} />
 * ```
 */
export function useAdvancedFilters<T extends Record<string, unknown>>(entityType: EntityType) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [filterRules, setFilterRules] = useState<FilterRule[]>([])
  const [loading, setLoading] = useState(true)

  // Load saved filters on mount
  useEffect(() => {
    let mounted = true

    async function loadSavedFilters() {
      try {
        const result = await getSavedFilters(entityType)
        if (mounted && result.success && result.data) {
          setSavedFilters(result.data)
        }
      } catch (error) {
        // Silently handle errors - filters are optional functionality
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadSavedFilters()

    return () => {
      mounted = false
    }
  }, [entityType])

  // Reload saved filters (called after create/update/delete)
  const reloadSavedFilters = useCallback(async () => {
    try {
      const result = await getSavedFilters(entityType)
      if (result.success && result.data) {
        setSavedFilters(result.data)
      }
    } catch (error) {
      // Silently handle errors
    }
  }, [entityType])

  // Handle selecting a saved filter
  const handleFilterSelect = useCallback((filter: SavedFilter | null) => {
    if (filter) {
      setActiveFilterId(filter.id)
      setFilterRules(filter.filters)
    } else {
      setActiveFilterId(null)
      setFilterRules([])
    }
  }, [])

  // Handle changes from the advanced filter builder
  const handleAdvancedFiltersChange = useCallback((rules: FilterRule[]) => {
    setFilterRules(rules)
    // Clear saved filter selection when manually changing rules
    setActiveFilterId(null)
  }, [])

  // Utility function to apply filters to data
  const applyFiltersToData = useCallback((data: T[]): T[] => {
    if (filterRules.length === 0) return data
    return applyFilters(data, filterRules)
  }, [filterRules])

  // Get the active filter object (for passing to AdvancedFilterBuilder)
  const activeFilter = useMemo(() => {
    return savedFilters.find(f => f.id === activeFilterId) || null
  }, [savedFilters, activeFilterId])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterRules([])
    setActiveFilterId(null)
  }, [])

  // Props bundle for EntityPageHeader
  const headerProps = useMemo(() => ({
    savedFilters,
    activeFilterId,
    onFilterSelect: handleFilterSelect,
    onAdvancedFiltersChange: handleAdvancedFiltersChange,
    onSavedFiltersChange: reloadSavedFilters,
  }), [savedFilters, activeFilterId, handleFilterSelect, handleAdvancedFiltersChange, reloadSavedFilters])

  return {
    // State
    savedFilters,
    activeFilterId,
    activeFilter,
    filterRules,
    loading,
    
    // Actions
    handleFilterSelect,
    handleAdvancedFiltersChange,
    reloadSavedFilters,
    clearFilters,
    
    // Utility
    applyFiltersToData,
    
    // Props bundle for EntityPageHeader (spread this into the component)
    headerProps,
  }
}
