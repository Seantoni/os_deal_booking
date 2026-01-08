import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllUsers, getOpportunitiesByBusiness } from '@/app/actions/crm'
import { getCategories } from '@/app/actions/categories'
import { getRequestsByBusiness } from '@/app/actions/booking-requests'
import type { Business, Opportunity, BookingRequest, UserData } from '@/types'
import type { Category } from '@prisma/client'

interface UseBusinessFormProps {
  isOpen: boolean
  business?: Business | null
  isAdmin: boolean
  currentUserId?: string | null // Current logged-in user ID
  // Pre-loaded data from parent (passed from SharedData context or server)
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
}

export function useBusinessForm({
  isOpen,
  business,
  isAdmin,
  currentUserId,
  preloadedCategories,
  preloadedUsers,
}: UseBusinessFormProps) {
  // Reference bar state (not handled by dynamic form)
  const [ownerId, setOwnerId] = useState<string>('')
  const [salesTeam, setSalesTeam] = useState<string>('')

  // Data state - use preloaded if available
  const [categories, setCategories] = useState<Category[]>(preloadedCategories || [])
  const [users, setUsers] = useState<UserData[]>(preloadedUsers || [])
  
  // Business-specific data (opportunities, requests)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [requests, setRequests] = useState<BookingRequest[]>([])

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const businessRef = useRef(business)
  businessRef.current = business

  // Load business-specific data (opportunities, requests)
  const loadFormData = useCallback(async () => {
    const currentBusiness = businessRef.current

    // Reset reference bar fields
    setOwnerId(currentBusiness?.ownerId || currentUserId || '')
    setSalesTeam(currentBusiness?.salesTeam || '')
    setOpportunities([])
    setRequests([])

    setLoadingData(true)
    try {
      // Build fetch promises - only fetch what's not preloaded
      const fetchPromises: Promise<{ success: boolean; data?: unknown; error?: string }>[] = []
      const fetchKeys: string[] = []

      // Categories (skip if preloaded)
      if (!preloadedCategories || preloadedCategories.length === 0) {
        fetchPromises.push(getCategories())
        fetchKeys.push('categories')
      }

      // Users (skip if preloaded, only fetch for admin)
      if (isAdmin && (!preloadedUsers || preloadedUsers.length === 0)) {
        fetchPromises.push(getAllUsers())
        fetchKeys.push('users')
      }

      // Business-specific data (always fetch if editing)
      if (currentBusiness) {
        fetchPromises.push(getOpportunitiesByBusiness(currentBusiness.id))
        fetchKeys.push('opportunities')
        fetchPromises.push(getRequestsByBusiness(currentBusiness.id))
        fetchKeys.push('requests')
      }

      // Parallel fetch
      if (fetchPromises.length > 0) {
        const results = await Promise.all(fetchPromises)
        fetchKeys.forEach((key, index) => {
          const result = results[index]
          if (result.success && result.data) {
            if (key === 'categories') setCategories(result.data as Category[])
            else if (key === 'users') setUsers(result.data as UserData[])
            else if (key === 'opportunities') setOpportunities(result.data as Opportunity[])
            else if (key === 'requests') setRequests(result.data as BookingRequest[])
          }
        })
      }
    } finally {
      setLoadingData(false)
    }
  }, [currentUserId, preloadedCategories, preloadedUsers, isAdmin])

  // Main load effect
  useEffect(() => {
    if (!isOpen) {
      loadedForRef.current = null
      return
    }

    const currentKey = business?.id || 'new'
    
    if (loadedForRef.current === currentKey) {
      return
    }

    loadedForRef.current = currentKey
    loadFormData()
  }, [isOpen, business?.id, loadFormData])

  return {
    // Reference bar state (owner, salesTeam)
    ownerId,
    setOwnerId,
    salesTeam,
    setSalesTeam,
    
    // Supporting data
    categories,
    users,
    
    // Business-specific data
    opportunities,
    setOpportunities,
    requests,
    setRequests,
    
    // Loading
    loadingData,
    loadFormData,
  }
}
