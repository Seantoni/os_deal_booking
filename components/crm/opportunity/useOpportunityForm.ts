import { useState, useEffect, useCallback, useRef } from 'react'
import { getOpportunityFormData } from '@/app/actions/opportunities'
import { getBusiness } from '@/app/actions/crm'
import type { Opportunity, OpportunityStage, Task, Business, BookingRequest, UserData } from '@/types'
import type { Category } from '@prisma/client'

interface UseOpportunityFormProps {
  isOpen: boolean
  opportunity?: Opportunity | null
  initialBusinessId?: string
  isAdmin: boolean
  currentUserId?: string | null // Current logged-in user ID
  // Pre-loaded data to skip fetching
  preloadedBusinesses?: Business[]
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
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
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [linkedBusiness, setLinkedBusiness] = useState<Business | null>(null)
  const [linkedBookingRequest, setLinkedBookingRequest] = useState<BookingRequest | null>(null)

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const opportunityRef = useRef(opportunity)
  opportunityRef.current = opportunity

  // Reusable load function using single batched request
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

    // Check if we have all preloaded data for a new opportunity
    const hasAllPreloadedData = 
      (preloadedBusinesses && preloadedBusinesses.length > 0) &&
      (preloadedCategories && preloadedCategories.length > 0) &&
      (!isAdmin || (preloadedUsers && preloadedUsers.length > 0))
    
    // For new opportunities with all preloaded data and an initial business, use preloaded data
    if (!currentOpportunity && hasAllPreloadedData && initialBusinessId) {
      setBusinesses(preloadedBusinesses!)
      setCategories(preloadedCategories!)
      if (isAdmin && preloadedUsers) setUsers(preloadedUsers)
      
      // Set form defaults for new opportunity
      setBusinessId(initialBusinessId)
      setStage('iniciacion')
      setStartDate(new Date().toISOString().split('T')[0])
      setCloseDate('')
      setNotes('')
      setResponsibleId(currentUserId || '')
      setTasks([])
      
      // Find business in preloaded data
      const selectedBusiness = preloadedBusinesses!.find((b) => b.id === initialBusinessId)
      if (selectedBusiness) {
        setCategoryId(selectedBusiness.categoryId || '')
        setTier(selectedBusiness.tier?.toString() || '')
        setContactName(selectedBusiness.contactName || '')
        setContactPhone(selectedBusiness.contactPhone || '')
        setContactEmail(selectedBusiness.contactEmail || '')
        setLinkedBusiness(selectedBusiness)
      }
      return
    }

    setLoadingData(true)
    try {
      // Single batched request for all form data
      const result = await getOpportunityFormData(
        currentOpportunity?.id,
        !currentOpportunity ? initialBusinessId : undefined
      )
      
      if (result.success && result.data) {
        // Use preloaded data if available, otherwise use fetched data
        const businessesData = (preloadedBusinesses && preloadedBusinesses.length > 0) 
          ? preloadedBusinesses 
          : (result.data.businesses as Business[])
        const categoriesData = (preloadedCategories && preloadedCategories.length > 0) 
          ? preloadedCategories 
          : (result.data.categories as Category[])
        const usersData = (preloadedUsers && preloadedUsers.length > 0) 
          ? preloadedUsers 
          : (result.data.users as UserData[])
        
        setBusinesses(businessesData)
        setCategories(categoriesData)
        if (isAdmin) setUsers(usersData)
        
        // Set tasks and linked data from response
        setTasks((result.data.tasks as Task[]) || [])
        setLinkedBusiness(result.data.linkedBusiness as Business | null)
        setLinkedBookingRequest(result.data.linkedBookingRequest as BookingRequest | null)
        
        // Pre-fill form if editing
        if (currentOpportunity) {
          setBusinessId(currentOpportunity.businessId)
          setStage(currentOpportunity.stage)
          setStartDate(new Date(currentOpportunity.startDate).toISOString().split('T')[0])
          setCloseDate(currentOpportunity.closeDate ? new Date(currentOpportunity.closeDate).toISOString().split('T')[0] : '')
          setNotes(currentOpportunity.notes || '')
          setResponsibleId(currentOpportunity.responsibleId || '')
          
          // Load category/tier from linked business
          const linkedBiz = result.data.linkedBusiness as Business | null
          if (linkedBiz) {
            setCategoryId(linkedBiz.categoryId || '')
            setTier(linkedBiz.tier?.toString() || '')
            setContactName(linkedBiz.contactName || '')
            setContactPhone(linkedBiz.contactPhone || '')
            setContactEmail(linkedBiz.contactEmail || '')
          }
        } else {
          // Reset form for new opportunity
          setBusinessId(initialBusinessId || '')
          setStage('iniciacion')
          setStartDate(new Date().toISOString().split('T')[0])
          setCloseDate('')
          setNotes('')
          setResponsibleId(currentUserId || '')
          
          // If initialBusinessId is provided, load business data from linked business
          const linkedBiz = result.data.linkedBusiness as Business | null
          if (linkedBiz) {
            setCategoryId(linkedBiz.categoryId || '')
            setTier(linkedBiz.tier?.toString() || '')
            setContactName(linkedBiz.contactName || '')
            setContactPhone(linkedBiz.contactPhone || '')
            setContactEmail(linkedBiz.contactEmail || '')
          } else if (initialBusinessId && businessesData) {
            // Fallback: find in businesses list
            const selectedBusiness = businessesData.find((b) => b.id === initialBusinessId)
            if (selectedBusiness) {
              setCategoryId(selectedBusiness.categoryId || '')
              setTier(selectedBusiness.tier?.toString() || '')
              setContactName(selectedBusiness.contactName || '')
              setContactPhone(selectedBusiness.contactPhone || '')
              setContactEmail(selectedBusiness.contactEmail || '')
              setLinkedBusiness(selectedBusiness)
            }
          }
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
        // Also set linkedBusiness when business selection changes
        setLinkedBusiness(selectedBusiness)
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

