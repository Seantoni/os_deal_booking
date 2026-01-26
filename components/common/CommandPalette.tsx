'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import EventIcon from '@mui/icons-material/Event'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import TaskIcon from '@mui/icons-material/Task'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import CloseIcon from '@mui/icons-material/Close'
import { globalSearch, type SearchResult, type GroupedSearchResults } from '@/app/actions/search'
import toast from 'react-hot-toast'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

const ENTITY_CONFIG = {
  business: { icon: BusinessIcon, label: 'Negocios', color: 'text-blue-600 bg-blue-50' },
  opportunity: { icon: HandshakeIcon, label: 'Oportunidades', color: 'text-purple-600 bg-purple-50' },
  'booking-request': { icon: RequestQuoteIcon, label: 'Solicitudes', color: 'text-amber-600 bg-amber-50' },
  deal: { icon: DescriptionIcon, label: 'Ofertas', color: 'text-emerald-600 bg-emerald-50' },
  event: { icon: EventIcon, label: 'Eventos', color: 'text-rose-600 bg-rose-50' },
  task: { icon: TaskIcon, label: 'Tareas', color: 'text-cyan-600 bg-cyan-50' },
  lead: { icon: PersonSearchIcon, label: 'Leads', color: 'text-orange-600 bg-orange-50' },
} as const

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  // Opportunity stages
  'iniciacion': 'bg-blue-100 text-blue-700',
  'contacto': 'bg-purple-100 text-purple-700',
  'propuesta': 'bg-amber-100 text-amber-700',
  'negociacion': 'bg-orange-100 text-orange-700',
  'won': 'bg-green-100 text-green-700',
  'lost': 'bg-red-100 text-red-700',
  // Booking request status
  'draft': 'bg-gray-100 text-gray-700',
  'pending': 'bg-yellow-100 text-yellow-700',
  'approved': 'bg-green-100 text-green-700',
  'rejected': 'bg-red-100 text-red-700',
  'sent': 'bg-blue-100 text-blue-700',
  // Deal status
  'borrador': 'bg-gray-100 text-gray-700',
  'en_edicion': 'bg-blue-100 text-blue-700',
  'publicada': 'bg-green-100 text-green-700',
  // Task status
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'Completado': 'bg-green-100 text-green-700',
  // Default
  'default': 'bg-gray-100 text-gray-600',
}

function getStatusColor(status?: string): string {
  if (!status) return STATUS_COLORS.default
  return STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS[status] || STATUS_COLORS.default
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<GroupedSearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Flatten results for keyboard navigation
  const flatResults: SearchResult[] = results
    ? [
        ...results.businesses,
        ...results.opportunities,
        ...results.bookingRequests,
        ...results.deals,
        ...results.events,
        ...results.tasks,
        ...results.leads,
      ]
    : []

  const totalResults = flatResults.length

  // Search logic with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      setIsSearching(false)
      return
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true)
      try {
        const response = await globalSearch(query)
        if (response.success && response.data) {
          setResults(response.data)
        } else {
          setResults(null)
          if (response.error) {
            toast.error(response.error)
          }
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults(null)
        toast.error('Error al buscar')
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle result selection (navigate and close)
  const handleSelectResult = (result: SearchResult) => {
    router.push(result.url)
    onClose()
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault()
        handleSelectResult(flatResults[selectedIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, flatResults, selectedIndex, totalResults, router, onClose])

  // Reset when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setResults(null)
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  if (!isOpen) return null

  // Helper to get flat index for a result
  const getFlatIndex = (type: SearchResult['type'], localIndex: number): number => {
    if (!results) return 0
    let offset = 0
    const order: (keyof GroupedSearchResults)[] = ['businesses', 'opportunities', 'bookingRequests', 'deals', 'events', 'tasks', 'leads']
    const typeToKey: Record<SearchResult['type'], keyof GroupedSearchResults> = {
      'business': 'businesses',
      'opportunity': 'opportunities',
      'booking-request': 'bookingRequests',
      'deal': 'deals',
      'event': 'events',
      'task': 'tasks',
      'lead': 'leads',
    }
    
    for (const key of order) {
      if (key === typeToKey[type]) {
        return offset + localIndex
      }
      offset += results[key].length
    }
    return offset + localIndex
  }

  const renderResultGroup = (
    items: SearchResult[],
    type: SearchResult['type'],
  ) => {
    if (items.length === 0) return null
    
    const config = ENTITY_CONFIG[type]
    const Icon = config.icon

    return (
      <div key={type}>
        {/* Section Header */}
        <div className="px-3 py-1 flex items-center gap-1.5 sticky top-0 bg-gray-50/95 backdrop-blur-sm">
          <Icon className={`w-3.5 h-3.5 ${config.color.split(' ')[0]}`} />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            {config.label}
          </span>
          <span className="text-[10px] text-gray-400">({items.length})</span>
        </div>
        
        {/* Results */}
        {items.map((result, localIndex) => {
          const flatIndex = getFlatIndex(type, localIndex)
          const isSelected = flatIndex === selectedIndex
          
          return (
            <button
              key={result.id}
              onClick={() => handleSelectResult(result)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onMouseEnter={() => setSelectedIndex(flatIndex)}
            >
              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span 
                  className="text-sm text-gray-900 truncate"
                  title={result.title}
                >
                  {result.title}
                </span>
                {result.status && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                )}
              </div>
              {result.subtitle && (
                <span 
                  className="text-xs text-gray-400 truncate flex-shrink-0 max-w-[180px]"
                  title={result.subtitle}
                >
                  {result.subtitle}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Backdrop - lighter gray instead of black */}
      <div
        className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative flex min-h-full items-start justify-center pt-[15vh] px-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200 transition-all">
          {/* Search Input */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-3">
            <SearchIcon className="text-gray-400 flex-shrink-0" style={{ fontSize: 20 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent"
              autoFocus
            />
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Cerrar (Esc)"
            >
              <CloseIcon style={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto bg-white">
            {isSearching ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-xs">Buscando...</p>
                </div>
              </div>
            ) : query.trim() && totalResults === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-xs">No se encontraron resultados</p>
              </div>
            ) : !query.trim() ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">Comience a escribir para buscar...</p>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {Object.entries(ENTITY_CONFIG).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <span key={type} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${config.color}`}>
                        <Icon style={{ fontSize: 12 }} />
                        {config.label}
                      </span>
                    )
                  })}
                </div>
                <p className="text-[10px] mt-3 text-gray-400">
                  Busca por nombre, email, estado o ID
                </p>
              </div>
            ) : results ? (
              <div>
                {renderResultGroup(results.businesses, 'business')}
                {renderResultGroup(results.opportunities, 'opportunity')}
                {renderResultGroup(results.bookingRequests, 'booking-request')}
                {renderResultGroup(results.deals, 'deal')}
                {renderResultGroup(results.events, 'event')}
                {renderResultGroup(results.tasks, 'task')}
                {renderResultGroup(results.leads, 'lead')}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-0.5">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-[9px]">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-[9px]">⏎</kbd>
                abrir
              </span>
              <span className="flex items-center gap-0.5">
                <kbd className="px-1 py-0.5 bg-gray-100 rounded font-mono text-[9px]">esc</kbd>
                cerrar
              </span>
            </div>
            {totalResults > 0 && (
              <span>{totalResults} resultados</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
