import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllUsers, getOpportunitiesByBusiness } from '@/app/actions/crm'
import { getCategories } from '@/app/actions/categories'
import type { Business, Opportunity } from '@/types'

interface UseBusinessFormProps {
  isOpen: boolean
  business?: Business | null
  isAdmin: boolean
  currentUserId?: string | null // Current logged-in user ID
  // Pre-loaded data to skip fetching
  preloadedCategories?: any[]
  preloadedUsers?: any[]
}

export function useBusinessForm({
  isOpen,
  business,
  isAdmin,
  currentUserId,
  preloadedCategories,
  preloadedUsers,
}: UseBusinessFormProps) {
  // Form state
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [ownerId, setOwnerId] = useState<string>('')
  const [salesTeam, setSalesTeam] = useState<string>('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [description, setDescription] = useState('')
  const [tier, setTier] = useState<string>('')

  // Data state
  const [categories, setCategories] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const businessRef = useRef(business)
  businessRef.current = business

  // Reusable load function
  const loadFormData = useCallback(async () => {
    const currentBusiness = businessRef.current

    // Clear form immediately to prevent showing stale data
    setName('')
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setCategoryId('')
    // Default owner to current user for new businesses
    setOwnerId(currentBusiness ? '' : (currentUserId || ''))
    setSalesTeam('')
    setWebsite('')
    setInstagram('')
    setDescription('')
    setTier('')
    setOpportunities([])

    setLoadingData(true)
    try {
      // Use preloaded data if available, otherwise fetch
      let categoriesData = preloadedCategories
      let usersData = preloadedUsers

      // Build fetch promises for missing data
      const fetchPromises: Promise<any>[] = []
      const fetchKeys: string[] = []

      if (!categoriesData) {
        fetchPromises.push(getCategories())
        fetchKeys.push('categories')
      }
      if (!usersData && isAdmin) {
        fetchPromises.push(getAllUsers())
        fetchKeys.push('users')
      }
      // Always fetch opportunities for the business if editing
      if (currentBusiness) {
        fetchPromises.push(getOpportunitiesByBusiness(currentBusiness.id))
        fetchKeys.push('opportunities')
      }

      // Parallel fetch only missing data
      let opportunitiesData: any[] = []
      if (fetchPromises.length > 0) {
        const results = await Promise.all(fetchPromises)
        fetchKeys.forEach((key, index) => {
          const result = results[index]
          if (result.success && result.data) {
            if (key === 'categories') categoriesData = result.data
            else if (key === 'users') usersData = result.data
            else if (key === 'opportunities') opportunitiesData = result.data
        }
        })
      }

      // Update state with data
      if (categoriesData) setCategories(categoriesData)
      if (usersData && isAdmin) setUsers(usersData)

      if (currentBusiness) {
        setName(currentBusiness.name)
        setContactName(currentBusiness.contactName)
        setContactPhone(currentBusiness.contactPhone)
        setContactEmail(currentBusiness.contactEmail)
        setCategoryId(currentBusiness.categoryId || '')
        // Use business owner if exists, otherwise default to current user
        setOwnerId(currentBusiness.ownerId || currentUserId || '')
        setSalesTeam(currentBusiness.salesTeam || '')
        setWebsite(currentBusiness.website || '')
        setInstagram(currentBusiness.instagram || '')
        setDescription(currentBusiness.description || '')
        setTier(currentBusiness.tier?.toString() || '')

        setOpportunities(opportunitiesData)
      } else {
        // New business - default owner to current user
        setOwnerId(currentUserId || '')
      }
    } finally {
      setLoadingData(false)
    }
  }, [isAdmin, currentUserId, preloadedCategories, preloadedUsers])

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
    // Form state
    name,
    setName,
    contactName,
    setContactName,
    contactPhone,
    setContactPhone,
    contactEmail,
    setContactEmail,
    categoryId,
    setCategoryId,
    ownerId,
    setOwnerId,
    salesTeam,
    setSalesTeam,
    website,
    setWebsite,
    instagram,
    setInstagram,
    description,
    setDescription,
    tier,
    setTier,
    
    // Data
    categories,
    users,
    opportunities,
    setOpportunities,
    
    // Loading
    loadingData,
    loadFormData,
  }
}

