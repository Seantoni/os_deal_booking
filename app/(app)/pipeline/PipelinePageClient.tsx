'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Opportunity, BookingRequest } from '@/types'
import SearchIcon from '@mui/icons-material/Search'
import { Input, Button } from '@/components/ui'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import UnifiedPipelineTable from './UnifiedPipelineTable'
import { getPipelineDataPaginated, searchPipelineData } from '@/app/actions/pipeline'

type PipelineItem = {
  opportunity: Opportunity | null
  bookingRequest: BookingRequest | null
}

type DealItem = {
  deal: {
    id: string
    status: string
    responsibleId: string | null
    bookingRequestId: string
    bookingRequest: BookingRequest
  }
  opportunity: Opportunity | null
  bookingRequest: BookingRequest
}

type PreBookedEventItem = {
  event: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    status: string
    merchant: string | null
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    createdAt: Date
  }
}

type PipelineData = {
  opportunities: PipelineItem[]
  deals: DealItem[]
  preBookedEvents: PreBookedEventItem[]
}

interface PipelinePageClientProps {
  initialData?: PipelineData
  initialTotal?: number
}

export default function PipelinePageClient({ 
  initialData = { opportunities: [], deals: [], preBookedEvents: [] },
  initialTotal = 0,
}: PipelinePageClientProps) {
  // Check if we have any initial data
  const hasAnyInitialData = initialData.opportunities.length > 0 || 
                            initialData.deals.length > 0 || 
                            initialData.preBookedEvents.length > 0

  // Data state
  const [data, setData] = useState<PipelineData>(initialData)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(!hasAnyInitialData)
  const [searchLoading, setSearchLoading] = useState(false)
  const pageSize = 50

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PipelineData | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Derived state
  const isSearching = searchQuery.trim().length >= 2
  const totalPages = Math.ceil(totalCount / pageSize)
  const canGoPrevious = currentPage > 0
  const canGoNext = currentPage < totalPages - 1

  // Load paginated data
  const loadPage = useCallback(async (page: number = 0) => {
    setLoading(true)
    try {
      const result = await getPipelineDataPaginated({ page, pageSize })
      if (result.success && result.data) {
        setData(result.data as PipelineData)
        setTotalCount((result as any).total || 0)
        setCurrentPage(page)
      }
    } catch (error) {
      logger.error('Failed to load pipeline data:', error)
      toast.error('Error al cargar el pipeline')
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // Initial load if no initial data
  useEffect(() => {
    if (!hasAnyInitialData) {
      loadPage(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Server-side search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults(null)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    try {
      const result = await searchPipelineData(query, { limit: 100 })
      if (result.success && result.data) {
        setSearchResults(result.data as PipelineData)
      }
    } catch (error) {
      logger.error('Search failed:', error)
      toast.error('Error en la búsqueda')
    } finally {
      setSearchLoading(false)
    }
  }, [])

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
    }, 300)
  }, [performSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults(null)
    setSearchLoading(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  // Display data
  const displayData = searchResults || data
  const displayCount = searchResults 
    ? displayData.opportunities.length + displayData.deals.length + displayData.preBookedEvents.length
    : totalCount

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-md w-full">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar en todo el pipeline..."
            size="sm"
            leftIcon={<SearchIcon className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Content - Unified View */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : (
          <>
            {/* Search indicator */}
            {isSearching && (
              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Mostrando {displayCount} resultado{displayCount !== 1 ? 's' : ''} para &quot;{searchQuery}&quot;
                <button 
                  onClick={clearSearch}
                  className="ml-auto text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            <UnifiedPipelineTable 
              opportunities={displayData.opportunities} 
              deals={displayData.deals}
              preBookedEvents={displayData.preBookedEvents}
              searchQuery="" // Search is handled server-side now
            />
            
            {/* Pagination controls */}
            {!isSearching && totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-lg mt-0">
                <span className="text-sm text-gray-500">
                  Mostrando {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalCount)} de {totalCount} items
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
