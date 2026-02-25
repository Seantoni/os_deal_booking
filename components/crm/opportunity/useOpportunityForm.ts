import { useState, useEffect, useCallback, useRef } from 'react'
import { getOpportunityFormData } from '@/app/actions/opportunities'
import { getBusiness } from '@/app/actions/crm'
import {
  getBookingRequestProjectionMap,
  getBusinessProjectionSummaryMap,
  type BookingRequestProjectionValue,
} from '@/app/actions/revenue-projections'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import type { Opportunity, OpportunityStage, Task, Business, BookingRequest, UserData } from '@/types'
import type { Category } from '@prisma/client'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'

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
  const [linkedBusinessProjection, setLinkedBusinessProjection] = useState<ProjectionEntitySummary | null>(null)
  const [linkedBookingRequestProjection, setLinkedBookingRequestProjection] = useState<BookingRequestProjectionValue | null>(null)

  // Loading state
  const [loadingData, setLoadingData] = useState(false)

  // Track what we've loaded to prevent re-fetching
  const loadedForRef = useRef<string | null>(null)
  const opportunityRef = useRef(opportunity)
  const projectionRequestRef = useRef(0)
  opportunityRef.current = opportunity

  const loadLinkedProjections = useCallback(async (
    linkedBusinessData: Business | null,
    linkedRequestData: BookingRequest | null,
  ) => {
    const requestId = ++projectionRequestRef.current

    try {
      const [businessProjectionResult, requestProjectionResult] = await Promise.all([
        linkedBusinessData?.id
          ? getBusinessProjectionSummaryMap([linkedBusinessData.id])
          : Promise.resolve({ success: true as const, data: {} as Record<string, ProjectionEntitySummary> }),
        linkedRequestData?.id
          ? getBookingRequestProjectionMap([linkedRequestData.id])
          : Promise.resolve({ success: true as const, data: {} as Record<string, BookingRequestProjectionValue> }),
      ])

      if (requestId !== projectionRequestRef.current) return

      setLinkedBusinessProjection(
        businessProjectionResult.success && businessProjectionResult.data && linkedBusinessData?.id
          ? businessProjectionResult.data[linkedBusinessData.id] || null
          : null
      )
      setLinkedBookingRequestProjection(
        requestProjectionResult.success && requestProjectionResult.data && linkedRequestData?.id
          ? requestProjectionResult.data[linkedRequestData.id] || null
          : null
      )
    } catch {
      if (requestId !== projectionRequestRef.current) return
      setLinkedBusinessProjection(null)
      setLinkedBookingRequestProjection(null)
    }
  }, [])

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
      setLinkedBusinessProjection(null)
      setLinkedBookingRequestProjection(null)
    }

    // Check if we have all preloaded data for a new opportunity
    const hasAllPreloadedData = 
      (preloadedBusinesses && preloadedBusinesses.length > 0) &&
      (preloadedCategories && preloadedCategories.length > 0) &&
      (preloadedUsers && preloadedUsers.length > 0)
    
    // For new opportunities with all preloaded data and an initial business, use preloaded data
    if (!currentOpportunity && hasAllPreloadedData && initialBusinessId) {
      setBusinesses(preloadedBusinesses!)
      setCategories(preloadedCategories!)
      if (preloadedUsers) setUsers(preloadedUsers)
      
      // Set form defaults for new opportunity (using Panama timezone)
      setBusinessId(initialBusinessId)
      setStage('iniciacion')
      setStartDate(getTodayInPanama())
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
        setLinkedBusinessProjection(null)
        setLinkedBookingRequestProjection(null)
        void loadLinkedProjections(selectedBusiness, null)
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
        setUsers(usersData)
        
        // Set tasks and linked data from response
        setTasks((result.data.tasks as Task[]) || [])
        const linkedBusinessData = result.data.linkedBusiness as Business | null
        const linkedRequestData = result.data.linkedBookingRequest as BookingRequest | null

        setLinkedBusiness(linkedBusinessData)
        setLinkedBookingRequest(linkedRequestData)
        setLinkedBusinessProjection(null)
        setLinkedBookingRequestProjection(null)
        void loadLinkedProjections(linkedBusinessData, linkedRequestData)
        
        // Pre-fill form if editing
        if (currentOpportunity) {
          setBusinessId(currentOpportunity.businessId)
          setStage(currentOpportunity.stage)
          // Use Panama timezone for date display
          setStartDate(formatDateForPanama(new Date(currentOpportunity.startDate)))
          setCloseDate(currentOpportunity.closeDate ? formatDateForPanama(new Date(currentOpportunity.closeDate)) : '')
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
          // Reset form for new opportunity (using Panama timezone)
          setBusinessId(initialBusinessId || '')
          setStage('iniciacion')
          setStartDate(getTodayInPanama())
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
  }, [initialBusinessId, currentUserId, loadLinkedProjections, preloadedBusinesses, preloadedCategories, preloadedUsers])

  // Main load effect
  useEffect(() => {
    if (!isOpen) {
      loadedForRef.current = null
      projectionRequestRef.current += 1
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
        setLinkedBusinessProjection(null)
        setLinkedBookingRequestProjection(null)
        void loadLinkedProjections(selectedBusiness, null)
      } else {
        setLinkedBusinessProjection(null)
      }
    }
  }, [businessId, businesses, loadLinkedProjections, opportunity])

  // Load business when stage changes to WON
  useEffect(() => {
    if (stage === 'won' && businessId && !linkedBusiness) {
      const loadBusiness = async () => {
        try {
          const businessResult = await getBusiness(businessId)
          if (businessResult.success && businessResult.data) {
            setLinkedBusiness(businessResult.data)
            setLinkedBusinessProjection(null)
            setLinkedBookingRequestProjection(null)
            void loadLinkedProjections(businessResult.data, linkedBookingRequest)
          }
        } catch {
          setLinkedBusinessProjection(null)
        }
      }
      loadBusiness()
    }
  }, [stage, businessId, linkedBookingRequest, linkedBusiness, loadLinkedProjections])

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
    linkedBusinessProjection,
    linkedBookingRequestProjection,
    
    // Loading
    loadingData,
    loadFormData,
  }
}
