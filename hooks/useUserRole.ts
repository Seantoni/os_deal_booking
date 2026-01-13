'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import type { UserRole } from '@/types'
import { CACHE_CLIENT_USER_ROLE_MS, CACHE_CLIENT_USER_ROLE_REVALIDATE_MS } from '@/lib/constants/cache'

const CACHE_KEY = 'user-role-cache'
const CACHE_TIMESTAMP_KEY = 'user-role-cache-timestamp'
const CACHE_USER_ID_KEY = 'user-role-cache-user-id'

function clearCache() {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIMESTAMP_KEY)
    localStorage.removeItem(CACHE_USER_ID_KEY)
  } catch (error) {
    // Silently handle cache errors
  }
}

function getCachedRole(userId: string | null): { role: UserRole | null; isValid: boolean } {
  if (typeof window === 'undefined') {
    return { role: null, isValid: false }
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    const cachedUserId = localStorage.getItem(CACHE_USER_ID_KEY)
    
    // If user ID changed, clear cache (user logged out/in)
    if (userId && cachedUserId && cachedUserId !== userId) {
      clearCache()
      return { role: null, isValid: false }
    }
    
    if (!cached || !timestamp) {
      return { role: null, isValid: false }
    }

    const age = Date.now() - parseInt(timestamp, 10)
    if (age > CACHE_CLIENT_USER_ROLE_MS) {
      // Cache expired
      clearCache()
      return { role: null, isValid: false }
    }

    return { role: cached as UserRole, isValid: true }
  } catch (error) {
    return { role: null, isValid: false }
  }
}

function setCachedRole(role: UserRole | null, userId: string | null) {
  if (typeof window === 'undefined' || !role || !userId) {
    return
  }

  try {
    localStorage.setItem(CACHE_KEY, role as string)
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString())
    localStorage.setItem(CACHE_USER_ID_KEY, userId)
  } catch (error) {
    // Silently handle cache write errors
  }
}

// Track if we've already fetched for this session to avoid re-fetching on navigation
let sessionFetched = false
let sessionUserId: string | null = null

export function useUserRole() {
  const { user, isLoaded: userLoaded } = useUser()
  const userId = user?.id || null
  
  // Initialize from cache synchronously
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return null
    const cached = getCachedRole(userId)
    return cached.role
  })
  
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    const cached = getCachedRole(userId)
    return !cached.isValid
  })
  
  const hasFetchedRef = useRef(false)
  const revalidationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset session tracking when user changes
  useEffect(() => {
    if (userId !== sessionUserId) {
      sessionFetched = false
      sessionUserId = userId
      hasFetchedRef.current = false
      
      if (!userId) {
        // User logged out
        clearCache()
        setRole(null)
        setLoading(false)
      }
    }
  }, [userId])

  // Stable fetch function that only updates state if role actually changed
  const fetchRoleFromServer = useCallback(async () => {
    if (!userId) return
    
    try {
      const response = await fetch('/api/user/role', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.role) {
          const newRole = data.role as UserRole
          
          // Only update state if role actually changed
          setRole(prevRole => {
            if (prevRole !== newRole) {
              setCachedRole(newRole, userId)
              return newRole
            }
            return prevRole
          })
        }
      }
    } catch (error) {
      // Silently handle fetch errors
    }
  }, [userId])

  // Main effect - runs once per user session
  useEffect(() => {
    if (!userLoaded || !userId) {
      return
    }

    // Check if we already have a valid cache for this user
    const cached = getCachedRole(userId)
    
    if (cached.isValid && cached.role) {
      // Use cached role immediately
      setRole(cached.role)
      setLoading(false)
      
      // Mark as fetched for this session
      if (!sessionFetched || sessionUserId !== userId) {
        sessionFetched = true
        sessionUserId = userId
        hasFetchedRef.current = true
      }
      return
    }

    // No valid cache - need to fetch
    if (hasFetchedRef.current && sessionFetched && sessionUserId === userId) {
      // Already fetched this session, don't fetch again
      return
    }

    // Fetch role from server
    setLoading(true)
    
    fetch('/api/user/role', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-store' },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.role) {
          setRole(data.role)
          setCachedRole(data.role, userId)
        }
      })
      .catch(() => {
        // Silently handle fetch errors
      })
      .finally(() => {
        setLoading(false)
        hasFetchedRef.current = true
        sessionFetched = true
        sessionUserId = userId
      })

  }, [userLoaded, userId]) // Removed 'user' from dependencies

  // Set up periodic revalidation (background, doesn't cause re-renders unless role changed)
  useEffect(() => {
    if (!userLoaded || !userId) {
      return
    }

    // Set up periodic revalidation every 5 minutes
    revalidationIntervalRef.current = setInterval(() => {
      fetchRoleFromServer()
    }, CACHE_CLIENT_USER_ROLE_REVALIDATE_MS)

    // Cleanup interval on unmount
    return () => {
      if (revalidationIntervalRef.current) {
        clearInterval(revalidationIntervalRef.current)
      }
    }
  }, [userLoaded, userId, fetchRoleFromServer])
  
  // Expose a function to manually refresh role (for debugging/admin updates)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { refreshUserRole?: () => void }).refreshUserRole = () => {
        clearCache()
        sessionFetched = false
        hasFetchedRef.current = false
        setLoading(true)
        
        fetch('/api/user/role', { cache: 'no-store' })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.role && userId) {
              setRole(data.role)
              setCachedRole(data.role, userId)
            }
          })
          .catch(() => {
            // Silently handle refresh errors
          })
          .finally(() => {
            setLoading(false)
            hasFetchedRef.current = true
            sessionFetched = true
          })
      }
    }
  }, [userId])

  return { 
    role, 
    loading, 
    isAdmin: role === 'admin', 
    isSales: role === 'sales',
    isEditor: role === 'editor' || role === 'ere',
    isMarketing: role === 'marketing',
  }
}
