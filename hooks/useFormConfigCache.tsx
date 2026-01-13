'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import { getFormConfiguration } from '@/app/actions/form-config'
import type { FormEntityType, FormSectionWithDefinitions } from '@/types'
import { CACHE_CLIENT_FORM_CONFIG_MS } from '@/lib/constants/cache'

interface FormConfigCacheEntry {
  sections: FormSectionWithDefinitions[]
  initialized: boolean
  fetchedAt: number
}

interface FormConfigCacheContextValue {
  getConfig: (entityType: FormEntityType) => FormConfigCacheEntry | null
  fetchConfig: (entityType: FormEntityType) => Promise<FormConfigCacheEntry>
  prefetch: (entityType: FormEntityType) => void
  invalidate: (entityType: FormEntityType) => void
  invalidateAll: () => void
}

const FormConfigCacheContext = createContext<FormConfigCacheContextValue | null>(null)

interface FormConfigCacheProviderProps {
  children: ReactNode
}

export function FormConfigCacheProvider({ children }: FormConfigCacheProviderProps) {
  const [cache, setCache] = useState<Map<FormEntityType, FormConfigCacheEntry>>(new Map())
  // Track in-flight requests to prevent duplicate fetches
  const inFlightRef = useRef<Map<FormEntityType, Promise<FormConfigCacheEntry>>>(new Map())

  const getConfig = useCallback((entityType: FormEntityType): FormConfigCacheEntry | null => {
    const entry = cache.get(entityType)
    if (!entry) return null
    
    // Check if cache is still valid
    const age = Date.now() - entry.fetchedAt
    if (age > CACHE_CLIENT_FORM_CONFIG_MS) {
      return null
    }
    
    return entry
  }, [cache])

  const fetchConfig = useCallback(async (entityType: FormEntityType): Promise<FormConfigCacheEntry> => {
    // Check if already in cache
    const cached = getConfig(entityType)
    if (cached) return cached

    // Check if there's an in-flight request
    const inFlight = inFlightRef.current.get(entityType)
    if (inFlight) return inFlight

    // Start new fetch
    const fetchPromise = (async () => {
      try {
        const result = await getFormConfiguration(entityType)
        const entry: FormConfigCacheEntry = {
          sections: result.success && result.data ? result.data.sections : [],
          initialized: result.success && result.data ? result.data.initialized : false,
          fetchedAt: Date.now(),
        }
        
        setCache(prev => {
          const next = new Map(prev)
          next.set(entityType, entry)
          return next
        })
        
        return entry
      } finally {
        inFlightRef.current.delete(entityType)
      }
    })()

    inFlightRef.current.set(entityType, fetchPromise)
    return fetchPromise
  }, [getConfig])

  const prefetch = useCallback((entityType: FormEntityType) => {
    // Fire and forget - prefetch in background
    fetchConfig(entityType).catch(() => {
      // Silently ignore prefetch errors
    })
  }, [fetchConfig])

  const invalidate = useCallback((entityType: FormEntityType) => {
    setCache(prev => {
      const next = new Map(prev)
      next.delete(entityType)
      return next
    })
  }, [])

  const invalidateAll = useCallback(() => {
    setCache(new Map())
  }, [])

  return (
    <FormConfigCacheContext.Provider value={{ getConfig, fetchConfig, prefetch, invalidate, invalidateAll }}>
      {children}
    </FormConfigCacheContext.Provider>
  )
}

export function useFormConfigCache() {
  const context = useContext(FormConfigCacheContext)
  if (!context) {
    throw new Error('useFormConfigCache must be used within FormConfigCacheProvider')
  }
  return context
}

// Hook that provides cached form config for a specific entity type
export function useCachedFormConfig(entityType: FormEntityType) {
  const { getConfig, fetchConfig } = useFormConfigCache()
  const [config, setConfig] = useState<FormConfigCacheEntry | null>(() => getConfig(entityType))
  const [loading, setLoading] = useState(!config)

  // Load config if not cached
  const loadConfig = useCallback(async () => {
    const cached = getConfig(entityType)
    if (cached) {
      setConfig(cached)
      setLoading(false)
      return cached
    }

    setLoading(true)
    try {
      const result = await fetchConfig(entityType)
      setConfig(result)
      return result
    } finally {
      setLoading(false)
    }
  }, [entityType, getConfig, fetchConfig])

  return {
    sections: config?.sections ?? [],
    initialized: config?.initialized ?? false,
    loading,
    loadConfig,
  }
}
