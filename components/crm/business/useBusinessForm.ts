import { useState, useEffect, useCallback, useRef } from 'react'
import { getBusinessFormData } from '@/app/actions/businesses'
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

  // Load business-specific data using single batched request
  const loadFormData = useCallback(async () => {
    const currentBusiness = businessRef.current

    // Reset reference bar fields
    // For existing businesses: use ownerId if set, otherwise '__unassigned__' to allow clearing
    // For new businesses: default to current user
    const ownerValue = currentBusiness 
      ? (currentBusiness.ownerId || '__unassigned__')
      : (currentUserId || '__unassigned__')
    setOwnerId(ownerValue)
    setSalesTeam(currentBusiness?.salesTeam || '')
    setOpportunities([])
    setRequests([])

    // If we have all preloaded data for a new business, skip the fetch entirely
    const hasAllPreloadedData = (preloadedCategories && preloadedCategories.length > 0) && 
                                 (preloadedUsers && preloadedUsers.length > 0)
    
    if (!currentBusiness && hasAllPreloadedData) {
      // New business with all preloaded data - no need to fetch
      return
    }

    setLoadingData(true)
    try {
      // Single batched request for all form data
      const result = await getBusinessFormData(currentBusiness?.id)
      
      if (result.success && result.data) {
        // Only update categories/users if not preloaded
        if (!preloadedCategories || preloadedCategories.length === 0) {
          setCategories(result.data.categories)
        }
        if (!preloadedUsers || preloadedUsers.length === 0) {
          setUsers(result.data.users)
        }
        
        // Business-specific data (opportunities, requests) always from response
        if (currentBusiness) {
          setOpportunities(result.data.opportunities)
          setRequests(result.data.requests)
        }
      }
    } finally {
      setLoadingData(false)
    }
  }, [currentUserId, preloadedCategories, preloadedUsers])

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
