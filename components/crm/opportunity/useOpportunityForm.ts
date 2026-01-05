import { useState, useEffect, useCallback, useRef } from 'react'
import { getBusinesses, getAllUsers, getTasksByOpportunity, getBusiness } from '@/app/actions/crm'
import { getCategories } from '@/app/actions/categories'
import { getBookingRequest } from '@/app/actions/booking'
import type { Opportunity, OpportunityStage, Task, Business, BookingRequest, UserProfile } from '@/types'
import type { CategoryOption } from '@/types/category'

interface UseOpportunityFormProps {
  isOpen: boolean
  opportunity?: Opportunity | null
  initialBusinessId?: string
  isAdmin: boolean
  currentUserId?: string | null // Current logged-in user ID
  // Pre-loaded data to skip fetching
  preloadedBusinesses?: Business[]
  preloadedCategories?: CategoryOption[]
  preloadedUsers?: UserProfile[]
}

export function useOpportunityForm({
  isOpen,
  opportunity,
  initialBusinessId,
  isAdmin,
  currentUserId,
  preloadedBusinesses,
  preloadedCategories,
  preloadedUsers,
}: UseOpportunityFormProps) {
  // Form state
  const [businessId, setBusinessId] = useState('')
  const [stage, setStage] = useState<OpportunityStage>('iniciacion')
  const [startDate, setStartDate] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [tier, setTier] = useState<string>('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  // Data state
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [linkedBusiness, setLinkedBusiness] = useState<Business | null>(null)
  const [linkedBookingRequest, setLinkedBookingRequest] = useState<BookingRequest | null>(null)

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const opportunityRef = useRef(opportunity)
  opportunityRef.current = opportunity

  // Reusable load function
  const loadFormData = useCallback(async (skipClear = false) => {
    const currentOpportunity = opportunityRef.current
    
    if (!skipClear) {
      // Clear form immediately to prevent showing stale data
      setBusinessId('')
      setStage('iniciacion')
      setStartDate('')
      setCloseDate('')
      setNotes('')
      setResponsibleId('')
      setCategoryId('')
      setTier('')
      setContactName('')
      setContactPhone('')
      setContactEmail('')
      setTasks([])
      setLinkedBusiness(null)
      setLinkedBookingRequest(null)
    }

    setLoadingData(true)
    try {
      // Use preloaded data if available, otherwise fetch
      let businessesData = preloadedBusinesses
      let categoriesData = preloadedCategories
      let usersData = preloadedUsers

      // Only fetch what we don't have
      const fetchPromises: Promise<{ success: boolean; data?: unknown; error?: string }>[] = []
      const fetchKeys: string[] = []

      if (!businessesData) {
        fetchPromises.push(getBusinesses())
        fetchKeys.push('businesses')
      }
      if (!categoriesData) {
        fetchPromises.push(getCategories())
        fetchKeys.push('categories')
      }
      if (!usersData && isAdmin) {
        fetchPromises.push(getAllUsers())
        fetchKeys.push('users')
      }

      // Parallel fetch only missing data
      if (fetchPromises.length > 0) {
        const results = await Promise.all(fetchPromises)
        fetchKeys.forEach((key, index) => {
          const result = results[index]
          if (result.success && result.data) {
            if (key === 'businesses') businessesData = result.data
            else if (key === 'categories') categoriesData = result.data
            else if (key === 'users') usersData = result.data
          }
        })
      }

      // Update state with data
      if (businessesData) setBusinesses(businessesData)
      if (categoriesData) setCategories(categoriesData)
      if (usersData && isAdmin) setUsers(usersData)

      // Pre-fill form if editing
      if (currentOpportunity) {
        setBusinessId(currentOpportunity.businessId)
        setStage(currentOpportunity.stage)
        setStartDate(new Date(currentOpportunity.startDate).toISOString().split('T')[0])
        setCloseDate(currentOpportunity.closeDate ? new Date(currentOpportunity.closeDate).toISOString().split('T')[0] : '')
        setNotes(currentOpportunity.notes || '')
        setResponsibleId(currentOpportunity.responsibleId || '')
        
        // Load from business (use already fetched data)
        const selectedBusiness = businessesData?.find((b) => b.id === currentOpportunity.businessId)
        if (selectedBusiness) {
          setCategoryId(selectedBusiness.categoryId || '')
          setTier(selectedBusiness.tier?.toString() || '')
          setContactName(selectedBusiness.contactName || '')
          setContactPhone(selectedBusiness.contactPhone || '')
          setContactEmail(selectedBusiness.contactEmail || '')
        }

        // Parallel fetch: Load opportunity-specific data
        const [tasksResult, businessResult, requestResult] = await Promise.all([
          getTasksByOpportunity(currentOpportunity.id),
          currentOpportunity.businessId ? getBusiness(currentOpportunity.businessId) : Promise.resolve({ success: false, data: null }),
          currentOpportunity.hasRequest && currentOpportunity.bookingRequestId 
            ? getBookingRequest(currentOpportunity.bookingRequestId) 
            : Promise.resolve({ success: false, data: null }),
        ])

        if (tasksResult.success && tasksResult.data) {
          setTasks(tasksResult.data)
        }
          if (businessResult.success && businessResult.data) {
            setLinkedBusiness(businessResult.data)
        }
          if (requestResult.success && requestResult.data) {
            setLinkedBookingRequest(requestResult.data)
        }
      } else {
        // Reset form for new opportunity
        setBusinessId(initialBusinessId || '')
        setStage('iniciacion')
        setStartDate(new Date().toISOString().split('T')[0])
        setCloseDate('')
        setNotes('')
        // Default responsible to current user for new opportunities
        setResponsibleId(currentUserId || '')
        setTasks([])
        
        // If initialBusinessId is provided, load business data
        if (initialBusinessId && businessesData) {
          const selectedBusiness = businessesData.find((b) => b.id === initialBusinessId)
          if (selectedBusiness) {
            setCategoryId(selectedBusiness.categoryId || '')
            setTier(selectedBusiness.tier?.toString() || '')
            setContactName(selectedBusiness.contactName || '')
            setContactPhone(selectedBusiness.contactPhone || '')
            setContactEmail(selectedBusiness.contactEmail || '')
          } else {
            // Business not found in list, clear fields
            setCategoryId('')
            setTier('')
            setContactName('')
            setContactPhone('')
            setContactEmail('')
          }
        } else {
          // No initial business, clear fields
          setCategoryId('')
          setTier('')
          setContactName('')
          setContactPhone('')
          setContactEmail('')
        }
      }
    } finally {
      setLoadingData(false)
    }
  }, [isAdmin, initialBusinessId, currentUserId, preloadedBusinesses, preloadedCategories, preloadedUsers])

  // Main load effect
  useEffect(() => {
    if (!isOpen) {
      loadedForRef.current = null
      return
    }

    const currentKey = opportunity?.id || 'new'
    
    if (loadedForRef.current === currentKey) {
      return
    }

    loadedForRef.current = currentKey
    loadFormData()
  }, [isOpen, opportunity?.id, loadFormData])

  // Load business data when businessId changes
  useEffect(() => {
    if (businessId && !opportunity) {
      const selectedBusiness = businesses.find((b) => b.id === businessId)
      if (selectedBusiness) {
        setCategoryId(selectedBusiness.categoryId || '')
        setTier(selectedBusiness.tier?.toString() || '')
        setContactName(selectedBusiness.contactName || '')
        setContactPhone(selectedBusiness.contactPhone || '')
        setContactEmail(selectedBusiness.contactEmail || '')
      }
    }
  }, [businessId, businesses, opportunity])

  // Load business when stage changes to WON
  useEffect(() => {
    if (stage === 'won' && businessId && !linkedBusiness) {
      const loadBusiness = async () => {
        const businessResult = await getBusiness(businessId)
        if (businessResult.success && businessResult.data) {
          setLinkedBusiness(businessResult.data)
        }
      }
      loadBusiness()
    }
  }, [stage, businessId, linkedBusiness])

  return {
    // Form state
    businessId,
    setBusinessId,
    stage,
    setStage,
    startDate,
    setStartDate,
    closeDate,
    setCloseDate,
    notes,
    setNotes,
    responsibleId,
    setResponsibleId,
    categoryId,
    setCategoryId,
    tier,
    setTier,
    contactName,
    setContactName,
    contactPhone,
    setContactPhone,
    contactEmail,
    setContactEmail,
    
    // Data
    businesses,
    categories,
    users,
    tasks,
    setTasks,
    linkedBusiness,
    setLinkedBusiness,
    linkedBookingRequest,
    
    // Loading
    loadingData,
    loadFormData,
  }
}

