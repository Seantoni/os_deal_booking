'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getSavedFilters, type SavedFilter, type FilterRule, type EntityType } from '@/app/actions/filters'
import { applyFilters } from '@/lib/filters/applyFilters'

/**
 * Combine filter rules from multiple saved filters with AND logic
 */
function combineFilterRules(activeFilterIds: string[], savedFilters: SavedFilter[]): FilterRule[] {
  if (activeFilterIds.length === 0) {
    return []
  }

  const combinedRules: FilterRule[] = []
  
  activeFilterIds.forEach((filterId, filterIndex) => {
    const filter = savedFilters.find(f => f.id === filterId)
    if (filter && filter.filters.length > 0) {
      filter.filters.forEach((rule, ruleIndex) => {
        // All rules are combined with AND
        // Only the very first rule of the very first filter keeps its original conjunction
        const useAnd = filterIndex > 0 || ruleIndex > 0
        combinedRules.push({
          ...rule,
          id: `${filterId}_${rule.id}`, // Ensure unique IDs
          conjunction: useAnd ? 'AND' : rule.conjunction,
        })
      })
    }
  })
  
  return combinedRules
}

/**
 * Hook for managing advanced filters with saved filters support.
 * 
 * Provides:
 * - Loading and caching of saved filters from the database
 * - State management for active filters (supports multiple with AND)
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
  // Support multiple active filters (combined with AND)
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([])
  // Manual filter rules (from AdvancedFilterBuilder)
  const [manualFilterRules, setManualFilterRules] = useState<FilterRule[]>([])
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

  // Compute filter rules from active saved filters (synchronous - no effect delay)
  const savedFilterRules = useMemo(() => {
    return combineFilterRules(activeFilterIds, savedFilters)
  }, [activeFilterIds, savedFilters])

  // Final filter rules: either from saved filters or from manual builder
  const filterRules = manualFilterRules.length > 0 ? manualFilterRules : savedFilterRules

  // Handle toggling a saved filter (multi-select with AND)
  const handleFilterToggle = useCallback((filter: SavedFilter) => {
    // Clear manual rules when toggling saved filters
    setManualFilterRules([])
    setActiveFilterIds(prev => {
      const isActive = prev.includes(filter.id)
      if (isActive) {
        // Remove filter
        return prev.filter(id => id !== filter.id)
      } else {
        // Add filter
        return [...prev, filter.id]
      }
    })
  }, [])

  // Legacy single-select handler (for backward compatibility)
  const handleFilterSelect = useCallback((filter: SavedFilter | null) => {
    setManualFilterRules([])
    if (filter) {
      setActiveFilterIds([filter.id])
    } else {
      setActiveFilterIds([])
    }
  }, [])

  // Handle changes from the advanced filter builder
  const handleAdvancedFiltersChange = useCallback((rules: FilterRule[]) => {
    setManualFilterRules(rules)
    // Clear saved filter selection when manually changing rules
    setActiveFilterIds([])
  }, [])

  // Utility function to apply filters to data
  const applyFiltersToData = useCallback((data: T[]): T[] => {
    if (filterRules.length === 0) return data
    return applyFilters(data, filterRules)
  }, [filterRules])

  // Get the active filter objects
  const activeFilters = useMemo(() => {
    return savedFilters.filter(f => activeFilterIds.includes(f.id))
  }, [savedFilters, activeFilterIds])

  // Legacy: get first active filter (for backward compatibility)
  const activeFilterId = activeFilterIds.length > 0 ? activeFilterIds[0] : null
  const activeFilter = activeFilters.length > 0 ? activeFilters[0] : null

  // Clear all filters
  const clearFilters = useCallback(() => {
    setManualFilterRules([])
    setActiveFilterIds([])
  }, [])

  // Props bundle for EntityPageHeader
  const headerProps = useMemo(() => ({
    savedFilters,
    activeFilterIds,
    activeFilterId, // Legacy support
    onFilterToggle: handleFilterToggle,
    onFilterSelect: handleFilterSelect, // Legacy support
    onAdvancedFiltersChange: handleAdvancedFiltersChange,
    onSavedFiltersChange: reloadSavedFilters,
  }), [savedFilters, activeFilterIds, activeFilterId, handleFilterToggle, handleFilterSelect, handleAdvancedFiltersChange, reloadSavedFilters])

  return {
    // State
    savedFilters,
    activeFilterIds,
    activeFilterId, // Legacy support
    activeFilters,
    activeFilter, // Legacy support
    filterRules,
    loading,
    
    // Actions
    handleFilterToggle,
    handleFilterSelect, // Legacy support
    handleAdvancedFiltersChange,
    reloadSavedFilters,
    clearFilters,
    
    // Utility
    applyFiltersToData,
    
    // Props bundle for EntityPageHeader (spread this into the component)
    headerProps,
  }
}
