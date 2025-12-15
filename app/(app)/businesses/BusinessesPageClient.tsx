'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBusinesses, deleteBusiness, getOpportunities } from '@/app/actions/crm'
import { syncBusinessesFromApi } from '@/app/actions/crm/sync-business-metrics'
import type { Business, Opportunity } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BusinessFormModal from '@/components/crm/business/BusinessFormModal'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useEntityPage, sortEntities } from '@/hooks/useEntityPage'
import { logger } from '@/lib/logger'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { RowActionsMenu, EntityTable, CellStack } from '@/components/shared/table'

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Business Name', sortable: true },
  { key: 'contact', label: 'Contact', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'netRev360', label: 'Net Rev (360d)', sortable: true, align: 'right' },
  { key: 'reps', label: 'Reps' },
  { key: 'opportunity', label: 'Opp.', align: 'center' },
  { key: 'actions', label: '', width: 'w-20' },
]

// Search fields for businesses
const SEARCH_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone']

export default function BusinessesPageClient() {
  const router = useRouter()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Get shared/cached data for categories and users
  const { categories, users } = useSharedData()
  
  // Use shared hook for common functionality
  const {
    data: businesses,
    setData: setBusinesses,
    loading,
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    handleSort,
    savedFilters,
    activeFilterId,
    handleFilterSelect,
    handleAdvancedFiltersChange,
    loadData,
    loadSavedFilters,
    applySearchFilter,
    applyAdvancedFilters,
  } = useEntityPage<Business>({
    entityType: 'businesses',
    fetchFn: getBusinesses,
    searchFields: SEARCH_FIELDS,
    defaultSortDirection: 'asc',
  })

  // Additional state for opportunities (to determine which businesses have open opportunities)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [opportunityFilter, setOpportunityFilter] = useState<'all' | 'with-open' | 'without-open'>('all')
  const [revenueMap, setRevenueMap] = useState<Record<string, number>>({})
  const [syncingRevenue, setSyncingRevenue] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  
  // Modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  
  const confirmDialog = useConfirmDialog()

  // Load opportunities alongside businesses
  useEffect(() => {
    async function loadOpportunities() {
      try {
        const result = await getOpportunities()
        if (result.success && result.data) {
          setOpportunities(result.data)
        }
      } catch (error) {
        logger.error('Failed to load opportunities:', error)
      }
    }
    loadOpportunities()
  }, [])

  // ---- Daily revenue sync (Panama time, once per day after 8am) ----
  const hasSyncedRevenue = useRef(false)

  const getPanamaNow = useCallback(() => {
    // Convert to Panama timezone using Intl
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Panama' }))
  }, [])

  const shouldSyncRevenueToday = useCallback(() => {
    const now = getPanamaNow()
    const lastSyncRaw = typeof window !== 'undefined' ? localStorage.getItem('businesses_revenue_last_sync') : null
    const lastSync = lastSyncRaw ? new Date(lastSyncRaw) : null

    const todayStr = now.toISOString().slice(0, 10)
    const lastSyncDay = lastSync ? lastSync.toISOString().slice(0, 10) : null

    const isPast8amPanama = now.getHours() >= 8
    const notSyncedToday = todayStr !== lastSyncDay

    return isPast8amPanama && notSyncedToday
  }, [getPanamaNow])

  useEffect(() => {
    let cancelled = false

    async function syncRevenue() {
      if (cancelled || hasSyncedRevenue.current || syncingRevenue) return
      if (!shouldSyncRevenueToday()) return

      hasSyncedRevenue.current = true
      setSyncingRevenue(true)
      try {
        const result = await syncBusinessesFromApi()
        if (result.success && result.data) {
          const revMap = Object.fromEntries(
            Object.entries(result.data).map(([id, payload]) => [id, payload.net_rev_360_days ?? 0])
          )
          setRevenueMap(revMap)
          await loadData()
          if (typeof window !== 'undefined') {
            localStorage.setItem('businesses_revenue_last_sync', getPanamaNow().toISOString())
          }
        } else {
          toast.error(result.error || 'Failed to sync revenue')
          hasSyncedRevenue.current = false // allow retry on failure
        }
      } catch (error) {
        toast.error('Failed to sync revenue')
        logger.error('Failed to sync revenue:', error)
        hasSyncedRevenue.current = false // allow retry on failure
      } finally {
        if (!cancelled) {
          setSyncingRevenue(false)
        }
      }
    }

    // Run immediately on mount and then every 5 minutes to catch 8am boundary
    syncRevenue()
    const interval = setInterval(syncRevenue, 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [getPanamaNow, loadData, shouldSyncRevenueToday, syncingRevenue])

  // Map of business IDs to whether they have open opportunities
  const businessHasOpenOpportunity = useMemo(() => {
    const map = new Map<string, boolean>()
    opportunities.forEach(opp => {
      const isOpen = opp.stage !== 'won' && opp.stage !== 'lost'
      if (opp.businessId && isOpen) {
        map.set(opp.businessId, true)
      }
    })
    return map
  }, [opportunities])

  // Static filter tabs (shown immediately)
  const staticFilterTabs: FilterTab[] = useMemo(() => [
    { id: 'all', label: 'All' },
    { id: 'with-open', label: 'With Open Opportunity' },
    { id: 'without-open', label: 'Without Open Opportunity' },
  ], [])
  
  // Filter tabs with counts (dynamic after load)
  const filterTabs: FilterTab[] = useMemo(() => {
    if (businesses.length === 0) return staticFilterTabs
    
    return [
    { id: 'all', label: 'All', count: businesses.length },
    { id: 'with-open', label: 'With Open Opportunity', count: businesses.filter(b => businessHasOpenOpportunity.get(b.id)).length },
    { id: 'without-open', label: 'Without Open Opportunity', count: businesses.filter(b => !businessHasOpenOpportunity.get(b.id)).length },
    ]
  }, [businesses, businessHasOpenOpportunity, staticFilterTabs])

  // Get sort value for a business
  const getSortValue = useCallback((business: Business, column: string): string | number | null => {
    switch (column) {
      case 'name':
        return business.name.toLowerCase()
      case 'contact':
        return (business.contactName || '').toLowerCase()
      case 'email':
        return business.contactEmail.toLowerCase()
      case 'phone':
        return business.contactPhone.toLowerCase()
      case 'category':
        return (business.category?.parentCategory || '').toLowerCase()
      case 'netRev360':
        if (business.sourceType !== 'api') return null
        const metricRev = (business as any)?.metrics?.net_rev_360_days as number | undefined
        return revenueMap[business.id] ?? metricRev ?? null
      default:
        return null
    }
  }, [revenueMap])

  // Filter and sort businesses
  const filteredBusinesses = useMemo(() => {
    let filtered = businesses

    // Opportunity filter
    if (opportunityFilter === 'with-open') {
      filtered = filtered.filter(b => businessHasOpenOpportunity.get(b.id))
    } else if (opportunityFilter === 'without-open') {
      filtered = filtered.filter(b => !businessHasOpenOpportunity.get(b.id))
    }

    // Apply search filter
    filtered = applySearchFilter(filtered)

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered)

    // Sort
    return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
  }, [businesses, opportunityFilter, businessHasOpenOpportunity, revenueMap, applySearchFilter, applyAdvancedFilters, sortColumn, sortDirection, getSortValue])

  const visibleBusinesses = useMemo(() => filteredBusinesses.slice(0, visibleCount), [filteredBusinesses, visibleCount])

  function handleCreateBusiness() {
    setSelectedBusiness(null)
    setBusinessModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
    setMenuOpen(null)
  }

  async function handleDeleteBusiness(businessId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Business',
      message: 'Are you sure you want to delete this business? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update
    setBusinesses(prev => prev.filter(b => b.id !== businessId))
    setMenuOpen(null)
    
    const result = await deleteBusiness(businessId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete business')
      loadData()
    } else {
      toast.success('Business deleted successfully')
    }
  }

  // Right side content for header
  const headerRightContent = (
    <Button
      onClick={handleCreateBusiness}
      size="sm"
      leftIcon={<AddIcon style={{ fontSize: 16 }} sx={{}} />}
    >
      New Business
    </Button>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="businesses"
        searchPlaceholder="Search businesses..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={opportunityFilter}
        onFilterChange={(id) => setOpportunityFilter(id as 'all' | 'with-open' | 'without-open')}
        savedFilters={savedFilters}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onAdvancedFiltersChange={handleAdvancedFiltersChange}
        onSavedFiltersChange={loadSavedFilters}
        isAdmin={isAdmin}
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Loading...</div>
        ) : filteredBusinesses.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No businesses found"
            description={
              searchQuery || opportunityFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating a new business'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {visibleBusinesses.map((business) => (
                <tr
                  key={business.id}
                  onClick={() => handleEditBusiness(business)}
                  className="group hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-[5px]">
                    <span className="font-medium text-gray-900 text-[13px]">
                      {business.name}
                    </span>
                  </td>
                  <td className="px-4 py-[5px] text-[13px] text-gray-600">
                    {business.contactName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-[5px]">
                    <span className="text-[13px] text-gray-500 break-all">{business.contactEmail || <span className="text-gray-400">-</span>}</span>
                  </td>
                  <td className="px-4 py-[5px]">
                    <span className="text-[13px] text-gray-500 whitespace-nowrap">{business.contactPhone || <span className="text-gray-400">-</span>}</span>
                  </td>
                  <td className="px-4 py-[5px]">
                    {business.category ? (
                      <span className="text-xs text-gray-600">
                        {business.category.parentCategory}
                        {business.category.subCategory1 && ` › ${business.category.subCategory1}`}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-[5px] text-right">
                    {business.sourceType === 'api' && (revenueMap[business.id] !== undefined || (business as any)?.metrics?.net_rev_360_days !== undefined) ? (
                      <span className="text-xs font-semibold text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                          revenueMap[business.id] ?? (business as any)?.metrics?.net_rev_360_days ?? 0
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-[5px]">
                    {business.salesReps && business.salesReps.length > 0 ? (
                      <span className="text-xs text-gray-600">
                        {business.salesReps.map(rep => rep.salesRep?.name?.split(' ')[0] || '?').join(', ')}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-[5px] text-center">
                    {businessHasOpenOpportunity.get(business.id) ? (
                      <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        Open
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-[5px] text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/businesses/${business.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Open full page"
                      >
                        <OpenInNewIcon style={{ fontSize: 18 }} />
                      </button>
                      <RowActionsMenu
                        isOpen={menuOpen === business.id}
                        onOpenChange={(open) => setMenuOpen(open ? business.id : null)}
                        items={[
                          {
                            label: isAdmin ? 'Edit' : 'View',
                            onClick: () => handleEditBusiness(business),
                          },
                          isAdmin
                            ? {
                                label: 'Delete',
                                tone: 'danger',
                                onClick: () => handleDeleteBusiness(business.id),
                              }
                            : null,
                        ].filter(Boolean) as any}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </EntityTable>
            {visibleCount < filteredBusinesses.length && (
              <div className="p-4 border-t border-gray-100 text-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + 50)}
                >
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <BusinessFormModal
        isOpen={businessModalOpen}
        onClose={() => {
          setBusinessModalOpen(false)
          setSelectedBusiness(null)
        }}
        business={selectedBusiness}
        onSuccess={(newBusiness) => {
          if (selectedBusiness) {
            setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? newBusiness : b))
          } else {
            setBusinesses(prev => [newBusiness, ...prev])
          }
          loadData()
        }}
        // Pass preloaded data to skip fetching
        preloadedCategories={categories}
        preloadedUsers={users}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}
