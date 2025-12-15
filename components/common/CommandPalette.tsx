'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import SearchIcon from '@mui/icons-material/Search'
import BusinessIcon from '@mui/icons-material/Business'
import EventIcon from '@mui/icons-material/Event'
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import DescriptionIcon from '@mui/icons-material/Description'
import CloseIcon from '@mui/icons-material/Close'
import { globalSearch, type SearchResult } from '@/app/actions/search'
import toast from 'react-hot-toast'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Search logic with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
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
          setResults([])
          if (response.error) {
            toast.error(response.error)
          }
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
        toast.error('Failed to search')
      } finally {
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, (results?.length || 1) - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results?.[selectedIndex]) {
        e.preventDefault()
        const result = results[selectedIndex]
        if (result.type === 'opportunity') {
          sessionStorage.setItem('openOpportunityId', result.id)
        }
        
        // Add search query to URL for pages that support it
        let finalUrl = result.url
        if (result.type === 'business' || result.type === 'opportunity' || result.type === 'booking-request') {
          try {
            const url = new URL(result.url, window.location.origin)
            url.searchParams.set('search', result.title)
            finalUrl = url.pathname + url.search
          } catch (e) {
            // If URL parsing fails, append search param manually
            const separator = result.url.includes('?') ? '&' : '?'
            finalUrl = `${result.url}${separator}search=${encodeURIComponent(result.title)}`
          }
        }
        
        console.log('Navigating to:', finalUrl, 'from result.url:', result.url)
        router.push(finalUrl)
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, router, onClose])

  // Reset when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setResults([])
    }
  }, [isOpen])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  if (!isOpen) return null

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'business':
        return <BusinessIcon className="w-5 h-5" />
      case 'opportunity':
        return <TrendingUpIcon className="w-5 h-5" />
      case 'booking-request':
        return <RequestQuoteIcon className="w-5 h-5" />
      case 'deal':
        return <DescriptionIcon className="w-5 h-5" />
      case 'event':
        return <EventIcon className="w-5 h-5" />
    }
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
          <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4">
            <SearchIcon className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search businesses, opportunities, requests, deals, events..."
              className="flex-1 border-none outline-none text-base text-gray-900 placeholder:text-gray-400 bg-transparent"
              autoFocus
            />
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
              title="Close (Esc)"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto bg-white">
            {isSearching ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm">Searching...</p>
                </div>
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="text-sm">No results found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : !query.trim() ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <p className="text-sm">Start typing to search...</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    <BusinessIcon className="w-3 h-3" />
                    Businesses
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    <TrendingUpIcon className="w-3 h-3" />
                    Opportunities
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    <RequestQuoteIcon className="w-3 h-3" />
                    Booking Requests
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    <DescriptionIcon className="w-3 h-3" />
                    Deals
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                    <EventIcon className="w-3 h-3" />
                    Events
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      if (result.type === 'opportunity') {
                        sessionStorage.setItem('openOpportunityId', result.id)
                      }
                      
                      // Add search query to URL for pages that support it
                      let finalUrl = result.url
                      if (result.type === 'business' || result.type === 'opportunity' || result.type === 'booking-request') {
                        try {
                          const url = new URL(result.url, window.location.origin)
                          url.searchParams.set('search', result.title)
                          finalUrl = url.pathname + url.search
                        } catch (e) {
                          // If URL parsing fails, append search param manually
                          const separator = result.url.includes('?') ? '&' : '?'
                          finalUrl = `${result.url}${separator}search=${encodeURIComponent(result.title)}`
                        }
                      }
                      
                      console.log('Navigating to:', finalUrl, 'from result.url:', result.url)
                      router.push(finalUrl)
                      onClose()
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      index === selectedIndex ? 'bg-gray-50' : ''
                    }`}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-shrink-0 text-gray-400">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400 uppercase">
                      {result.type.replace('-', ' ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded font-mono">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

