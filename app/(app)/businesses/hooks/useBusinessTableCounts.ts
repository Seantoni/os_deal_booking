/**
 * Hook for lazy-loading business table counts
 * 
 * Loads opportunity counts, request counts, active deal URLs, and campaign counts
 * separately from the main business data for better performance.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getBusinessTableCounts, getBusinessActiveDealUrls } from '@/app/actions/businesses'
import { getBusinessCampaignCounts } from '@/app/actions/campaigns'
import { logger } from '@/lib/logger'

interface TableCounts {
  openOpportunityCounts: Record<string, number>
  pendingRequestCounts: Record<string, number>
}

interface UseBusinessTableCountsOptions {
  isAdmin: boolean
}

export function useBusinessTableCounts({ isAdmin }: UseBusinessTableCountsOptions) {
  // Lazy-loaded table counts (opportunity counts per business, request counts per business name)
  const [tableCounts, setTableCounts] = useState<TableCounts | null>(null)
  const [tableCountsLoading, setTableCountsLoading] = useState(true)
  
  // Lazy-loaded active deal URLs (businessId -> dealUrl)
  const [activeDealUrls, setActiveDealUrls] = useState<Record<string, string>>({})
  const [activeDealUrlsLoading, setActiveDealUrlsLoading] = useState(true)
  
  // Campaign counts (how many active/upcoming campaigns each business is in)
  const [businessCampaignCounts, setBusinessCampaignCounts] = useState<Record<string, number>>({})

  // Load table counts on mount
  useEffect(() => {
    async function loadTableCounts() {
      try {
        const result = await getBusinessTableCounts()
        if (result.success && result.data) {
          setTableCounts(result.data)
        }
      } catch (error) {
        logger.error('Failed to load table counts:', error)
      } finally {
        setTableCountsLoading(false)
      }
    }
    loadTableCounts()
  }, [])

  // Load active deal URLs on mount
  useEffect(() => {
    async function loadActiveDealUrls() {
      try {
        const result = await getBusinessActiveDealUrls()
        if (result.success && result.data) {
          setActiveDealUrls(result.data)
        }
      } catch (error) {
        logger.error('Failed to load active deal URLs:', error)
      } finally {
        setActiveDealUrlsLoading(false)
      }
    }
    loadActiveDealUrls()
  }, [])

  // Load campaign counts (admin only)
  const loadCampaignCounts = useCallback(async () => {
    try {
      const result = await getBusinessCampaignCounts()
      if (result.success && result.data) {
        setBusinessCampaignCounts(result.data)
      }
    } catch (error) {
      logger.error('Failed to load campaign counts:', error)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadCampaignCounts()
    }
  }, [isAdmin, loadCampaignCounts])

  // Map of business IDs to count of open opportunities
  const businessOpenOpportunityCount = useMemo(() => {
    const map = new Map<string, number>()
    if (tableCounts?.openOpportunityCounts) {
      Object.entries(tableCounts.openOpportunityCounts).forEach(([businessId, count]) => {
        map.set(businessId, count)
      })
    }
    return map
  }, [tableCounts])

  // Map of business names (lowercase) to count of pending requests
  const businessPendingRequestCount = useMemo(() => {
    const map = new Map<string, number>()
    if (tableCounts?.pendingRequestCounts) {
      Object.entries(tableCounts.pendingRequestCounts).forEach(([merchantLower, count]) => {
        map.set(merchantLower, count)
      })
    }
    return map
  }, [tableCounts])

  // Helper map: business ID -> has open opportunity
  const businessHasOpenOpportunity = useMemo(() => {
    const map = new Map<string, boolean>()
    businessOpenOpportunityCount.forEach((count, businessId) => {
      if (count > 0) map.set(businessId, true)
    })
    return map
  }, [businessOpenOpportunityCount])

  // Refresh table counts (e.g., after creating an opportunity)
  const refreshTableCounts = useCallback(async () => {
    const result = await getBusinessTableCounts()
    if (result.success && result.data) {
      setTableCounts(result.data)
    }
  }, [])

  return {
    // Counts
    businessOpenOpportunityCount,
    businessPendingRequestCount,
    businessHasOpenOpportunity,
    businessCampaignCounts,
    activeDealUrls,
    
    // Loading states
    tableCountsLoading,
    activeDealUrlsLoading,
    
    // Refresh functions
    refreshTableCounts,
    refreshCampaignCounts: loadCampaignCounts,
  }
}
