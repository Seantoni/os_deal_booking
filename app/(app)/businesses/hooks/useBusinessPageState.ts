/**
 * Hook for managing business page modal and UI state
 * 
 * Consolidates modal states, expanded rows, deals cache, and action menus.
 */

import { useState, useCallback } from 'react'
import type { Business } from '@/types'
import { getDealsByVendorId, type SimplifiedDeal } from '@/app/actions/deal-metrics'
import toast from 'react-hot-toast'

// Cache for fetched deals per business
interface BusinessDealsCache {
  deals: SimplifiedDeal[]
  totalCount: number
  loading: boolean
}

interface ModalState {
  // Business form modal
  businessModalOpen: boolean
  selectedBusiness: Business | null
  
  // Opportunity modal
  opportunityModalOpen: boolean
  selectedBusinessForOpportunity: Business | null
  
  // Focus period modal
  focusModalOpen: boolean
  selectedBusinessForFocus: Business | null
  
  // Reassignment modal
  reassignmentModalOpen: boolean
  selectedBusinessForReassignment: Business | null
  
  // Campaign modal
  campaignModalOpen: boolean
  selectedBusinessForCampaign: Business | null
  
  // CSV upload modal
  uploadModalOpen: boolean
}

export function useBusinessPageState() {
  // Modal states
  const [modalState, setModalState] = useState<ModalState>({
    businessModalOpen: false,
    selectedBusiness: null,
    opportunityModalOpen: false,
    selectedBusinessForOpportunity: null,
    focusModalOpen: false,
    selectedBusinessForFocus: null,
    reassignmentModalOpen: false,
    selectedBusinessForReassignment: null,
    campaignModalOpen: false,
    selectedBusinessForCampaign: null,
    uploadModalOpen: false,
  })
  
  // Expanded businesses state (for showing deals)
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<string>>(new Set())
  const [businessDealsCache, setBusinessDealsCache] = useState<Map<string, BusinessDealsCache>>(new Map())

  // Business modal handlers
  const openBusinessModal = useCallback((business: Business | null = null) => {
    setModalState(prev => ({
      ...prev,
      businessModalOpen: true,
      selectedBusiness: business,
    }))
  }, [])

  const closeBusinessModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      businessModalOpen: false,
      selectedBusiness: null,
    }))
  }, [])

  // Opportunity modal handlers
  const openOpportunityModal = useCallback((business: Business) => {
    setModalState(prev => ({
      ...prev,
      opportunityModalOpen: true,
      selectedBusinessForOpportunity: business,
    }))
  }, [])

  const closeOpportunityModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      opportunityModalOpen: false,
      selectedBusinessForOpportunity: null,
    }))
  }, [])

  // Focus modal handlers
  const openFocusModal = useCallback((business: Business) => {
    setModalState(prev => ({
      ...prev,
      focusModalOpen: true,
      selectedBusinessForFocus: business,
    }))
  }, [])

  const closeFocusModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      focusModalOpen: false,
      selectedBusinessForFocus: null,
    }))
  }, [])

  // Reassignment modal handlers
  const openReassignmentModal = useCallback((business: Business) => {
    setModalState(prev => ({
      ...prev,
      reassignmentModalOpen: true,
      selectedBusinessForReassignment: business,
    }))
  }, [])

  const closeReassignmentModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      reassignmentModalOpen: false,
      selectedBusinessForReassignment: null,
    }))
  }, [])

  // Campaign modal handlers
  const openCampaignModal = useCallback((business: Business) => {
    setModalState(prev => ({
      ...prev,
      campaignModalOpen: true,
      selectedBusinessForCampaign: business,
    }))
  }, [])

  const closeCampaignModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      campaignModalOpen: false,
      selectedBusinessForCampaign: null,
    }))
  }, [])

  // Upload modal handlers
  const openUploadModal = useCallback(() => {
    setModalState(prev => ({ ...prev, uploadModalOpen: true }))
  }, [])

  const closeUploadModal = useCallback(() => {
    setModalState(prev => ({ ...prev, uploadModalOpen: false }))
  }, [])

  // Toggle expand/collapse for a business to show its deals
  const toggleExpandBusiness = useCallback(async (business: Business) => {
    const businessId = business.id
    const newExpanded = new Set(expandedBusinesses)
    
    if (newExpanded.has(businessId)) {
      // Collapse
      newExpanded.delete(businessId)
      setExpandedBusinesses(newExpanded)
    } else {
      // Expand - fetch deals if not cached
      newExpanded.add(businessId)
      setExpandedBusinesses(newExpanded)
      
      // Check if already cached
      if (!businessDealsCache.has(businessId) && business.osAdminVendorId) {
        // Set loading state
        setBusinessDealsCache(prev => new Map(prev).set(businessId, { deals: [], totalCount: 0, loading: true }))
        
        // Fetch deals using vendor ID
        const result = await getDealsByVendorId(business.osAdminVendorId, 10)
        
        if (result.success && result.data) {
          setBusinessDealsCache(prev => new Map(prev).set(businessId, {
            deals: result.data!,
            totalCount: result.totalCount ?? 0,
            loading: false,
          }))
        } else {
          setBusinessDealsCache(prev => new Map(prev).set(businessId, { deals: [], totalCount: 0, loading: false }))
          toast.error('Error al cargar deals')
        }
      }
    }
  }, [expandedBusinesses, businessDealsCache])

  // Get cached deals for a business
  const getBusinessDeals = useCallback((businessId: string) => {
    return businessDealsCache.get(businessId) ?? null
  }, [businessDealsCache])

  // Check if a business is expanded
  const isBusinessExpanded = useCallback((businessId: string) => {
    return expandedBusinesses.has(businessId)
  }, [expandedBusinesses])

  return {
    // Modal state
    ...modalState,
    
    // Modal handlers
    openBusinessModal,
    closeBusinessModal,
    openOpportunityModal,
    closeOpportunityModal,
    openFocusModal,
    closeFocusModal,
    openReassignmentModal,
    closeReassignmentModal,
    openCampaignModal,
    closeCampaignModal,
    openUploadModal,
    closeUploadModal,
    
    // Expansion state
    expandedBusinesses,
    toggleExpandBusiness,
    getBusinessDeals,
    isBusinessExpanded,
  }
}
