'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'

interface UseDebouncedSearchOptions<T> {
  /** Items to search through */
  items: T[]
  /** Fields to search in (supports dot notation for nested fields) */
  searchFields: string[]
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** Initial search query */
  initialQuery?: string
  /** Case sensitive search (default: false) */
  caseSensitive?: boolean
}

interface UseDebouncedSearchReturn<T> {
  /** Current search input value (updates immediately) */
  searchQuery: string
  /** Debounced search query (updates after delay) */
  debouncedQuery: string
  /** Set the search query */
  setSearchQuery: (query: string) => void
  /** Clear the search query */
  clearSearch: () => void
  /** Filtered items based on debounced search */
  filteredItems: T[]
  /** Whether search is active (debounced query is non-empty) */
  isSearching: boolean
  /** Whether debounce is pending (input changed but filter not yet applied) */
  isPending: boolean
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
 * Hook for debounced search with automatic filtering
 * 
 * @example
 * ```tsx
 * const {
 *   searchQuery,
 *   setSearchQuery,
 *   filteredItems,
 *   isSearching,
 * } = useDebouncedSearch({
 *   items: businesses,
 *   searchFields: ['name', 'contactName', 'contactEmail'],
 *   debounceMs: 300,
 * })
 * 
 * return (
 *   <Input
 *     value={searchQuery}
 *     onChange={(e) => setSearchQuery(e.target.value)}
 *     placeholder="Search..."
 *   />
 * )
 * ```
 */
export function useDebouncedSearch<T>({
  items,
  searchFields,
  debounceMs = 300,
  initialQuery = '',
  caseSensitive = false,
}: UseDebouncedSearchOptions<T>): UseDebouncedSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce the search query
  useEffect(() => {
    if (searchQuery !== debouncedQuery) {
      setIsPending(true)
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setIsPending(false)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [searchQuery, debounceMs, debouncedQuery])

  // Filter items based on debounced query
  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return items

    const query = caseSensitive ? debouncedQuery.trim() : debouncedQuery.trim().toLowerCase()

    return items.filter((item) => {
      return searchFields.some((field) => {
        const value = getNestedValue(item, field)
        if (typeof value === 'string') {
          const compareValue = caseSensitive ? value : value.toLowerCase()
          return compareValue.includes(query)
        }
        if (typeof value === 'number') {
          return String(value).includes(query)
        }
        return false
      })
    })
  }, [items, debouncedQuery, searchFields, caseSensitive])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setIsPending(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const isSearching = debouncedQuery.trim().length > 0

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    clearSearch,
    filteredItems,
    isSearching,
    isPending,
  }
}

/**
 * Simple debounced value hook (for any value, not just search)
 * 
 * @example
 * ```tsx
 * const [value, setValue] = useState('')
 * const debouncedValue = useDebouncedValue(value, 500)
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook that returns a debounced callback function
 * 
 * @example
 * ```tsx
 * const debouncedSave = useDebouncedCallback(
 *   (data) => saveToServer(data),
 *   500
 * )
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

