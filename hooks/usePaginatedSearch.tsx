'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

// Generic result types that work with server actions
// Note: We use loose typing here because server actions may return
// data with additional fields beyond what T specifies
interface PaginatedResult {
  success: boolean
  data?: unknown[]
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  error?: string
}

interface SearchResult {
  success: boolean
  data?: unknown[]
  error?: string
}

// Generic filter type - key-value pairs
export type FilterParams = Record<string, string | number | boolean | undefined>

interface UsePaginatedSearchOptions<T> {
  /** Function to fetch paginated data */
  fetchPaginated: (options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  } & FilterParams) => Promise<PaginatedResult>
  
  /** Function to search data (server-side) */
  searchFn: (query: string, options?: { limit?: number } & FilterParams) => Promise<SearchResult>
  
  /** Function to fetch counts for filter tabs (optional) */
  fetchCounts?: (filters?: FilterParams) => Promise<{ success: boolean; data?: Record<string, number>; error?: string }>
  
  /** Initial data from server-side rendering */
  initialData?: T[]
  
  /** Initial total count from server */
  initialTotal?: number
  
  /** Initial counts for filter tabs */
  initialCounts?: Record<string, number>
  
  /** Items per page */
  pageSize?: number
  
  /** Debounce delay for search in ms */
  searchDebounceMs?: number
  
  /** Default sort column */
  defaultSortBy?: string
  
  /** Default sort direction */
  defaultSortDirection?: 'asc' | 'desc'
  
  /** Entity name for error messages (e.g., "negocios", "oportunidades") */
  entityName?: string
}

interface UsePaginatedSearchReturn<T> {
  /** Current data (either paginated or search results) */
  data: T[]
  
  /** Set data directly (for optimistic updates) */
  setData: React.Dispatch<React.SetStateAction<T[]>>
  
  /** Search results (null if not searching) */
  searchResults: T[] | null
  
  /** Set search results directly */
  setSearchResults: React.Dispatch<React.SetStateAction<T[] | null>>
  
  /** Loading state for initial/page load */
  loading: boolean
  
  /** Loading state for search */
  searchLoading: boolean
  
  /** Current search query */
  searchQuery: string
  
  /** Handle search input change (debounced) */
  handleSearchChange: (query: string) => void
  
  /** Clear search and return to paginated view */
  clearSearch: () => void
  
  /** Whether currently in search mode */
  isSearching: boolean
  
  /** Current page (0-indexed) */
  currentPage: number
  
  /** Total number of items */
  totalCount: number
  
  /** Total number of pages */
  totalPages: number
  
  /** Load a specific page */
  loadPage: (page: number) => Promise<void>
  
  /** Reload current page */
  reload: () => Promise<void>
  
  /** Can go to previous page */
  canGoPrevious: boolean
  
  /** Can go to next page */
  canGoNext: boolean
  
  /** Current sort column */
  sortColumn: string | null
  
  /** Current sort direction */
  sortDirection: 'asc' | 'desc'
  
  /** Handle sort column click */
  handleSort: (column: string) => void
  
  /** Current filters */
  filters: FilterParams
  
  /** Set filters (will trigger refetch) */
  setFilters: (filters: FilterParams) => void
  
  /** Update a single filter (will trigger refetch) */
  updateFilter: (key: string, value: string | number | boolean | undefined) => void
  
  /** Counts for filter tabs (from server) */
  counts: Record<string, number>
  
  /** Refresh counts from server */
  refreshCounts: () => Promise<void>
  
  /** Loading state for counts */
  countsLoading: boolean
  
  /** Pagination controls component */
  PaginationControls: React.FC
  
  /** Search indicator component (shows when searching) */
  SearchIndicator: React.FC
}

/**
 * Hook for handling paginated data with server-side search
 * 
 * Features:
 * - Server-side pagination
 * - Debounced server-side search
 * - Loading states
 * - Sort state management
 * - Reusable pagination controls
 */
export function usePaginatedSearch<T>({
  fetchPaginated,
  searchFn,
  fetchCounts,
  initialData,
  initialTotal = 0,
  initialCounts,
  pageSize = 50,
  searchDebounceMs = 300,
  defaultSortBy = 'createdAt',
  defaultSortDirection = 'desc',
  entityName = 'registros',
}: UsePaginatedSearchOptions<T>): UsePaginatedSearchReturn<T> {
  // Data state
  const [data, setData] = useState<T[]>(initialData || [])
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(!initialData)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<T[] | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<string | null>(defaultSortBy)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection)
  
  // Filter state
  const [filters, setFiltersState] = useState<FilterParams>({})
  
  // Counts state
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts || {})
  const [countsLoading, setCountsLoading] = useState(!initialCounts && !!fetchCounts)

  // Derived state
  const isSearching = searchQuery.trim().length >= 2
  const totalPages = Math.ceil(totalCount / pageSize)
  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  // Load counts from server
  const refreshCounts = useCallback(async () => {
    if (!fetchCounts) return
    
    setCountsLoading(true)
    try {
      const result = await fetchCounts(filters)
      if (result.success && result.data) {
        setCounts(result.data)
      }
    } catch (error) {
      logger.error(`Failed to load counts for ${entityName}:`, error)
    } finally {
      setCountsLoading(false)
    }
  }, [fetchCounts, filters, entityName])

  // Load paginated data
  const loadPage = useCallback(async (page: number = 0) => {
    setLoading(true)
    try {
      const result = await fetchPaginated({
        page,
        pageSize,
        sortBy: sortColumn || defaultSortBy,
        sortDirection,
        ...filters, // Pass filters to server
      })
      if (result.success && result.data) {
        setData(result.data as T[])
        setTotalCount(result.total || 0)
        setCurrentPage(page)
      }
    } catch (error) {
      logger.error(`Failed to load ${entityName}:`, error)
      toast.error(`Error al cargar ${entityName}`)
    } finally {
      setLoading(false)
    }
  }, [fetchPaginated, pageSize, sortColumn, sortDirection, defaultSortBy, entityName, filters])

  // Reload current page
  const reload = useCallback(async () => {
    await loadPage(currentPage)
  }, [loadPage, currentPage])

  // Server-side search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    try {
      const result = await searchFn(query, { limit: 100, ...filters })
      if (result.success && result.data) {
        setSearchResults(result.data as T[])
      }
    } catch (error) {
      logger.error('Search failed:', error)
      toast.error('Error en la búsqueda')
    } finally {
      setSearchLoading(false)
    }
  }, [searchFn, filters])

  // Handle search input change with debounce
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query || query.trim().length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, searchDebounceMs)
  }, [performSearch, searchDebounceMs])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchLoading(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Handle sort - just update state, effect will trigger reload
  const handleSort = useCallback((column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(column)
    setSortDirection(newDirection)
    // Don't call loadPage here - the effect below will handle it
    // This ensures the state is updated before the fetch
  }, [sortColumn, sortDirection])
  
  // Effect to reload when sort changes (skips initial render)
  const sortMountedRef = useRef(false)
  useEffect(() => {
    if (!sortMountedRef.current) {
      sortMountedRef.current = true
      return
    }
    // Only reload if not searching (search results are sorted client-side)
    if (!isSearching) {
      loadPage(0)
    }
  }, [sortColumn, sortDirection]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set filters (will trigger refetch)
  const setFilters = useCallback((newFilters: FilterParams) => {
    setFiltersState(newFilters)
    setCurrentPage(0) // Reset to first page when filters change
  }, [])
  
  // Update single filter
  const updateFilter = useCallback((key: string, value: string | number | boolean | undefined) => {
    setFiltersState(prev => {
      const newFilters = { ...prev }
      if (value === undefined || value === '' || value === 'all') {
        delete newFilters[key]
      } else {
        newFilters[key] = value
      }
      return newFilters
    })
    setCurrentPage(0) // Reset to first page when filters change
  }, [])

  // Initial load if no initial data
  useEffect(() => {
    if (!initialData) {
      loadPage(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Load counts on mount
  useEffect(() => {
    if (fetchCounts && !initialCounts) {
      refreshCounts()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Refetch when filters change (after initial mount)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    loadPage(0)
    // Also refresh counts when filters change
    if (fetchCounts) {
      refreshCounts()
    }
    // Re-run search if in search mode
    if (isSearching && searchQuery) {
      performSearch(searchQuery)
    }
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination Controls Component
  const PaginationControls: React.FC = useCallback(() => {
    if (isSearching || totalPages <= 1) return null
    
    return (
      <div className="p-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Mostrando {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} de {totalCount} {entityName}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadPage(currentPage - 1)}
            disabled={!canGoPrevious || loading}
          >
            ← Anterior
          </Button>
          <span className="text-sm text-gray-600 px-2">
            Página {currentPage + 1} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadPage(currentPage + 1)}
            disabled={!canGoNext || loading}
          >
            Siguiente →
          </Button>
        </div>
      </div>
    )
  }, [isSearching, totalPages, currentPage, pageSize, totalCount, entityName, canGoPrevious, canGoNext, loading, loadPage])

  // Search Indicator Component
  const SearchIndicator: React.FC = useCallback(() => {
    const displayData = searchResults || data
    
    if (!isSearching) return null
    
    return (
      <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Mostrando {displayData.length} resultado{displayData.length !== 1 ? 's' : ''} para &quot;{searchQuery}&quot;
        <button 
          onClick={clearSearch}
          className="ml-auto text-blue-600 hover:text-blue-800 underline text-xs"
        >
          Limpiar búsqueda
        </button>
      </div>
    )
  }, [isSearching, searchResults, data, searchQuery, clearSearch])

  return {
    data: searchResults !== null ? searchResults : data,
    setData,
    searchResults,
    setSearchResults,
    loading,
    searchLoading,
    searchQuery,
    handleSearchChange,
    clearSearch,
    isSearching,
    currentPage,
    totalCount,
    totalPages,
    loadPage,
    reload,
    canGoPrevious,
    canGoNext,
    sortColumn,
    sortDirection,
    handleSort,
    filters,
    setFilters,
    updateFilter,
    counts,
    refreshCounts,
    countsLoading,
    PaginationControls,
    SearchIndicator,
  }
}

export default usePaginatedSearch
