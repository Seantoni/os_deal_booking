'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSavedFilters, type SavedFilter, type FilterRule } from '@/app/actions/filters'
import { applyFilters } from '@/lib/filters/applyFilters'
import { logger } from '@/lib/logger'

export type SortDirection = 'asc' | 'desc'

export interface EntityPageConfig<T> {
  /** Entity type for saved filters (e.g., 'deals', 'opportunities', 'businesses', 'leads') */
  entityType: 'deals' | 'opportunities' | 'businesses' | 'leads'
  /** Function to fetch data from the server */
  fetchFn: () => Promise<{ success: boolean; data?: T[]; error?: string }>
  /** Fields to search in (dot notation supported, e.g., 'business.name') */
  searchFields: string[]
  /** Default sort direction */
  defaultSortDirection?: SortDirection
  /** Read search query from URL params */
  useUrlSearch?: boolean
  /** 
   * If true, only shows loading skeleton on first load (stale-while-revalidate).
   * Subsequent fetches show data while refreshing in background.
   * Default: true
   */
  staleWhileRevalidate?: boolean
  /**
   * Initial data prefetched from the server.
   * If provided, skips the initial client-side fetch.
   */
  initialData?: T[]
}

export interface EntityPageReturn<T> {
  // Data
  data: T[]
  setData: React.Dispatch<React.SetStateAction<T[]>>
  /** True only on initial load (when no data exists yet) */
  loading: boolean
  /** True when fetching data (including background refreshes) */
  isRefreshing: boolean
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Sorting
  sortColumn: string | null
  sortDirection: SortDirection
  handleSort: (column: string) => void
  
  // Advanced Filters
  savedFilters: SavedFilter[]
  activeFilterId: string | null
  activeFilterRules: FilterRule[]
  handleFilterSelect: (filter: SavedFilter | null) => void
  handleAdvancedFiltersChange: (rules: FilterRule[]) => void
  
  // Actions
  loadData: () => Promise<void>
  loadSavedFilters: () => Promise<void>
  
  // Filtering helpers
  applySearchFilter: <D>(items: D[]) => D[]
  applyAdvancedFilters: <D>(items: D[]) => D[]
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let value: unknown = obj
  for (const key of keys) {
    if (value === null || value === undefined) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

/**
 * A reusable hook for entity page clients (Deals, Opportunities, Businesses).
 * 
 * Handles common logic:
 * - Data fetching and loading state
 * - Search filtering
 * - Column sorting
 * - Saved filters and advanced filtering
 * - URL search param reading
 * 
 * @example
 * ```tsx
 * const {
 *   data: businesses,
 *   loading,
 *   searchQuery,
 *   setSearchQuery,
 *   handleSort,
 *   // ... etc
 * } = useEntityPage({
 *   entityType: 'businesses',
 *   fetchFn: getBusinesses,
 *   searchFields: ['name', 'contactName', 'contactEmail'],
 * })
 * ```
 */
export function useEntityPage<T>({
  entityType,
  fetchFn,
  searchFields,
  defaultSortDirection = 'desc',
  useUrlSearch = true,
  staleWhileRevalidate = true,
  initialData,
}: EntityPageConfig<T>): EntityPageReturn<T> {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Core state - initialize with server-prefetched data if available
  const [data, setData] = useState<T[]>(initialData || [])
  // Skip first load if we have initial data
  const [isFirstLoad, setIsFirstLoad] = useState(!initialData || initialData.length === 0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Loading is only true on first load when no data exists
  // After first load, we use stale-while-revalidate (show old data while fetching)
  const loading = staleWhileRevalidate 
    ? (isFirstLoad && data.length === 0) 
    : isRefreshing
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection)
  
  // Advanced filters state
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [activeFilterRules, setActiveFilterRules] = useState<FilterRule[]>([])

  // Read search query from URL params on mount
  useEffect(() => {
    if (!useUrlSearch) return
    
    const searchParam = searchParams.get('search') || new URLSearchParams(window.location.search).get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
      // Clean up URL after reading
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('search')
      const newUrl = currentParams.toString() 
        ? `${window.location.pathname}?${currentParams.toString()}`
        : window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Load data function
  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const result = await fetchFn()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        logger.error(`Failed to load ${entityType}:`, result.error)
        // Only clear data on first load failure, keep stale data on refresh failures
        if (isFirstLoad) setData([])
      }
    } catch (error) {
      logger.error(`Failed to load ${entityType}:`, error)
      if (isFirstLoad) setData([])
    } finally {
      setIsRefreshing(false)
      setIsFirstLoad(false)
    }
  }, [fetchFn, entityType, isFirstLoad])

  // Load saved filters function
  const loadSavedFilters = useCallback(async () => {
    try {
      const result = await getSavedFilters(entityType)
      if (result.success && result.data) {
        setSavedFilters(result.data)
      }
    } catch (error) {
      logger.error('Failed to load saved filters:', error)
    }
  }, [entityType])

  // Initial data load
  useEffect(() => {
    loadData()
    loadSavedFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter select handler
  const handleFilterSelect = useCallback((filter: SavedFilter | null) => {
    if (filter) {
      setActiveFilterId(filter.id)
      setActiveFilterRules(filter.filters)
    } else {
      setActiveFilterId(null)
      setActiveFilterRules([])
    }
  }, [])

  // Advanced filters change handler
  const handleAdvancedFiltersChange = useCallback((rules: FilterRule[]) => {
    setActiveFilterRules(rules)
    setActiveFilterId(null) // Clear saved filter selection when manually applying
  }, [])

  // Sort handler
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(defaultSortDirection)
    }
  }, [sortColumn, defaultSortDirection])

  // Search filter helper
  const applySearchFilter = useCallback(<D,>(items: D[]): D[] => {
    if (!searchQuery.trim()) return items
    
    const query = searchQuery.toLowerCase()
    return items.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field)
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query)
        }
        return false
      })
    })
  }, [searchQuery, searchFields])

  // Advanced filters helper
  const applyAdvancedFilters = useCallback(<D,>(items: D[]): D[] => {
    if (activeFilterRules.length === 0) return items
    return applyFilters(items, activeFilterRules)
  }, [activeFilterRules])

  return {
    // Data
    data,
    setData,
    loading,
    isRefreshing,
    
    // Search
    searchQuery,
    setSearchQuery,
    
    // Sorting
    sortColumn,
    sortDirection,
    handleSort,
    
    // Advanced Filters
    savedFilters,
    activeFilterId,
    activeFilterRules,
    handleFilterSelect,
    handleAdvancedFiltersChange,
    
    // Actions
    loadData,
    loadSavedFilters,
    
    // Filtering helpers
    applySearchFilter,
    applyAdvancedFilters,
  }
}

/**
 * Generic sort function for entity lists
 */
export function sortEntities<T>(
  items: T[],
  sortColumn: string | null,
  sortDirection: SortDirection,
  getSortValue: (item: T, column: string) => string | number | Date | null
): T[] {
  if (!sortColumn) return items
  
  return [...items].sort((a, b) => {
    const aValue = getSortValue(a, sortColumn)
    const bValue = getSortValue(b, sortColumn)
    
    // Handle nulls
    if (aValue === null && bValue === null) return 0
    if (aValue === null) return sortDirection === 'asc' ? 1 : -1
    if (bValue === null) return sortDirection === 'asc' ? -1 : 1
    
    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })
}

