'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { getCategories } from '@/app/actions/categories'
import { getAllUsers } from '@/app/actions/crm'

interface SharedDataContextType {
  categories: any[]
  users: any[]
  loading: boolean
  loadCategories: () => Promise<void>
  loadUsers: () => Promise<void>
}

const SharedDataContext = createContext<SharedDataContextType | null>(null)

// Cache for shared data (persists across component unmounts)
let cachedCategories: any[] | null = null
let cachedUsers: any[] | null = null
let categoriesLoadPromise: Promise<void> | null = null
let usersLoadPromise: Promise<void> | null = null

interface SharedDataProviderProps {
  children: ReactNode
}

export function SharedDataProvider({ children }: SharedDataProviderProps) {
  const [categories, setCategories] = useState<any[]>(cachedCategories || [])
  const [users, setUsers] = useState<any[]>(cachedUsers || [])
  const [loading, setLoading] = useState(false)

  const loadCategories = useCallback(async () => {
    // Return existing promise if loading
    if (categoriesLoadPromise) {
      await categoriesLoadPromise
      return
    }
    
    // Use cache if available
    if (cachedCategories) {
      setCategories(cachedCategories)
      return
    }

    setLoading(true)
    categoriesLoadPromise = (async () => {
      try {
        const result = await getCategories()
        if (result.success && result.data) {
          cachedCategories = result.data
          setCategories(result.data)
        }
      } finally {
        categoriesLoadPromise = null
        setLoading(false)
      }
    })()
    
    await categoriesLoadPromise
  }, [])

  const loadUsers = useCallback(async () => {
    // Return existing promise if loading
    if (usersLoadPromise) {
      await usersLoadPromise
      return
    }
    
    // Use cache if available
    if (cachedUsers) {
      setUsers(cachedUsers)
      return
    }

    setLoading(true)
    usersLoadPromise = (async () => {
      try {
        const result = await getAllUsers()
        if (result.success && result.data) {
          cachedUsers = result.data
          setUsers(result.data)
        }
      } finally {
        usersLoadPromise = null
        setLoading(false)
      }
    })()
    
    await usersLoadPromise
  }, [])

  // Pre-load on mount
  useEffect(() => {
    loadCategories()
    loadUsers()
  }, [loadCategories, loadUsers])

  const value = { categories, users, loading, loadCategories, loadUsers }

  return (
    <SharedDataContext.Provider value={value}>
      {children}
    </SharedDataContext.Provider>
  )
}

export function useSharedData() {
  const context = useContext(SharedDataContext)
  if (!context) {
    // Return empty data if not in provider (backward compatible)
    return {
      categories: [] as any[],
      users: [] as any[],
      loading: false,
      loadCategories: async () => {},
      loadUsers: async () => {},
    }
  }
  return context
}

// Utility to clear cache (e.g., after settings change)
export function clearSharedDataCache() {
  cachedCategories = null
  cachedUsers = null
}
