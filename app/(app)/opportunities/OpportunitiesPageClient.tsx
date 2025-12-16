'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getOpportunities, deleteOpportunity } from '@/app/actions/crm'
import type { Opportunity } from '@/types'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import TableChartIcon from '@mui/icons-material/TableChart'
import FilterListIcon from '@mui/icons-material/FilterList'
import OpportunityKanban from '@/components/crm/OpportunityKanban'
import NewRequestModal from '@/components/booking/NewRequestModal'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useEntityPage, sortEntities } from '@/hooks/useEntityPage'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { EntityTable, StatusPill } from '@/components/shared/table'
import { Button } from '@/components/ui'

// Lazy load heavy modal components
const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})


// Stage configuration
const STAGE_LABELS: Record<string, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Propuesta Aprobada',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_COLORS: Record<string, string> = {
  iniciacion: 'bg-gray-100 text-gray-800',
  reunion: 'bg-blue-100 text-blue-800',
  propuesta_enviada: 'bg-yellow-100 text-yellow-800',
  propuesta_aprobada: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'business', label: 'Business', sortable: true },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'startDate', label: 'Start', sortable: true },
  { key: 'closeDate', label: 'Close', sortable: true },
  { key: 'notes', label: 'Notes', sortable: true },
  { key: 'actions', label: '', align: 'right', width: 'w-28' },
]

// Search fields for opportunities
const SEARCH_FIELDS = ['business.name', 'notes', 'business.contactName', 'business.contactEmail']

export default function OpportunitiesPageClient() {
  const searchParams = useSearchParams()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Get shared/cached data for categories and users
  const { categories, users } = useSharedData()
  
  // Use shared hook for common functionality
  const {
    data: opportunities,
    setData: setOpportunities,
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
  } = useEntityPage<Opportunity>({
    entityType: 'opportunities',
    fetchFn: getOpportunities,
    searchFields: SEARCH_FIELDS,
  })

  // View mode state - persist in localStorage
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
  const [viewModeLoaded, setViewModeLoaded] = useState(false)
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(50)
  
  // Load persisted view mode on mount (client-side only)
  useEffect(() => {
    const saved = localStorage.getItem('opportunities-view-mode') as 'table' | 'kanban' | null
    if (saved && (saved === 'table' || saved === 'kanban')) {
      setViewMode(saved)
    }
    setViewModeLoaded(true)
  }, [])
  
  // Persist view mode preference when it changes (after initial load)
  useEffect(() => {
    if (viewModeLoaded) {
      localStorage.setItem('opportunities-view-mode', viewMode)
    }
  }, [viewMode, viewModeLoaded])
  
  // Modal state
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  
  // New request modal state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestQueryParams, setNewRequestQueryParams] = useState<Record<string, string>>({})
  
  const confirmDialog = useConfirmDialog()

  // Handle opening opportunity from URL query params or session storage
  useEffect(() => {
    if (opportunities.length > 0) {
      // First check URL query params (e.g., ?open=opportunityId from Tasks page)
      const openFromUrl = searchParams.get('open')
      if (openFromUrl) {
        const opp = opportunities.find(o => o.id === openFromUrl)
        if (opp) {
          setSelectedOpportunity(opp)
          setOpportunityModalOpen(true)
        }
        return // Don't check sessionStorage if URL param was present
      }

      // Fallback to sessionStorage (e.g., from search)
      const openOpportunityId = sessionStorage.getItem('openOpportunityId')
      if (openOpportunityId) {
        sessionStorage.removeItem('openOpportunityId')
        const opp = opportunities.find(o => o.id === openOpportunityId)
        if (opp) {
          setSelectedOpportunity(opp)
          setOpportunityModalOpen(true)
        }
      }
    }
  }, [opportunities, searchParams])

  // Extract businesses from opportunities for preloading
  const businessesFromOpportunities = useMemo(() => {
    const businessMap = new Map<string, any>()
    opportunities.forEach(opp => {
      if (opp.business && !businessMap.has(opp.business.id)) {
        businessMap.set(opp.business.id, opp.business)
      }
    })
    return Array.from(businessMap.values())
  }, [opportunities])

  // Static filter tabs (shown immediately, no loading flash)
  const staticFilterTabs: FilterTab[] = useMemo(() => [
    { id: 'all', label: 'All' },
    ...Object.entries(STAGE_LABELS).map(([key, label]) => ({
      id: key,
      label,
    }))
  ], [])
  
  // Dynamic filter tabs with counts (shown after data loads)
  const filterTabs: FilterTab[] = useMemo(() => {
    return [
      { id: 'all', label: 'All', count: opportunities.length },
      ...Object.entries(STAGE_LABELS).map(([key, label]) => ({
        id: key,
        label,
        count: opportunities.filter(o => o.stage === key).length
    }))
    ]
  }, [opportunities, staticFilterTabs])

  // Get sort value for an opportunity
  const getSortValue = useCallback((opportunity: Opportunity, column: string): string | number | Date | null => {
    switch (column) {
      case 'business':
        return (opportunity.business?.name || '').toLowerCase()
      case 'stage':
        return opportunity.stage
      case 'startDate':
        return new Date(opportunity.startDate).getTime()
      case 'closeDate':
        return opportunity.closeDate ? new Date(opportunity.closeDate).getTime() : 0
      case 'notes':
        return (opportunity.notes || '').toLowerCase()
      default:
        return null
    }
  }, [])

  // Filter and sort opportunities
  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(o => o.stage === stageFilter)
    }

    // Apply search filter
    filtered = applySearchFilter(filtered)

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered)

    // Sort
    return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
  }, [opportunities, stageFilter, applySearchFilter, applyAdvancedFilters, sortColumn, sortDirection, getSortValue])

  const visibleOpportunities = useMemo(
    () => filteredOpportunities.slice(0, visibleCount),
    [filteredOpportunities, visibleCount]
  )

  function handleEditOpportunity(opportunity: Opportunity) {
    setSelectedOpportunity(opportunity)
    setOpportunityModalOpen(true)
  }


  async function handleDeleteOpportunity(opportunityId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Opportunity',
      message: 'Are you sure you want to delete this opportunity? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update
    setOpportunities(prev => prev.filter(o => o.id !== opportunityId))
    
    const result = await deleteOpportunity(opportunityId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete opportunity')
      loadData()
    } else {
      toast.success('Opportunity deleted successfully')
    }
  }

  function handleCreateRequest(opportunity: Opportunity) {
    const business = opportunity.business
    if (!business) return

    const params: Record<string, string> = {
      fromOpportunity: opportunity.id,
      businessName: business.name,
      businessEmail: business.contactEmail,
      contactName: business.contactName,
      contactPhone: business.contactPhone,
    }
    
    if (business.category) {
      params.categoryId = business.category.id
      params.parentCategory = business.category.parentCategory
      if (business.category.subCategory1) {
        params.subCategory1 = business.category.subCategory1
      }
      if (business.category.subCategory2) {
        params.subCategory2 = business.category.subCategory2
      }
    }

    if (business.razonSocial) params.legalName = business.razonSocial
    if (business.ruc) params.ruc = business.ruc
    if (business.province) params.province = business.province
    if (business.district) params.district = business.district
    if (business.corregimiento) params.corregimiento = business.corregimiento
    if (business.bank) params.bank = business.bank
    if (business.beneficiaryName) params.bankAccountName = business.beneficiaryName
    if (business.accountNumber) params.accountNumber = business.accountNumber
    if (business.accountType) params.accountType = business.accountType
    if (business.paymentPlan) params.paymentPlan = business.paymentPlan
    if (business.address) params.address = business.address
    if (business.neighborhood) params.neighborhood = business.neighborhood
    if (business.description) params.description = business.description
    if (business.website) params.website = business.website
    if (business.instagram) params.instagram = business.instagram
    if (business.emailPaymentContacts) {
      const paymentEmails = business.emailPaymentContacts.split(/[;,\\s]+/).filter(Boolean)
      if (paymentEmails.length > 0) {
        params.paymentEmails = JSON.stringify(paymentEmails)
      }
    }

    setNewRequestQueryParams(params)
    setShowNewRequestModal(true)
  }

  // View toggle component
  const viewToggle = (
    <div className="flex p-0.5 bg-gray-100 rounded-md border border-gray-200 flex-shrink-0">
      <button
        onClick={() => setViewMode('kanban')}
        className={`p-1 rounded transition-all ${
          viewMode === 'kanban'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Kanban View"
      >
        <ViewKanbanIcon style={{ fontSize: 16 }} />
      </button>
      <button
        onClick={() => setViewMode('table')}
        className={`p-1 rounded transition-all ${
          viewMode === 'table'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Table View"
      >
        <TableChartIcon style={{ fontSize: 16 }} />
      </button>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="opportunities"
        searchPlaceholder="Search opportunities..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={stageFilter}
        onFilterChange={setStageFilter}
        savedFilters={savedFilters}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onAdvancedFiltersChange={handleAdvancedFiltersChange}
        onSavedFiltersChange={loadSavedFilters}
        isAdmin={isAdmin}
        beforeFilters={viewToggle}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Loading...</div>
        ) : filteredOpportunities.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No opportunities found"
            description={
              searchQuery || stageFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating a new opportunity'
            }
          />
        ) : viewMode === 'kanban' ? (
          <div className="h-full overflow-x-auto pb-2">
            <OpportunityKanban
              opportunities={filteredOpportunities}
              onUpdate={loadData}
              onCreateRequest={handleCreateRequest}
              onCardClick={handleEditOpportunity}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {visibleOpportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  onClick={() => handleEditOpportunity(opportunity)}
                  className="group hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-[5px]">
                    <span className="font-medium text-gray-900 text-[13px]">
                      {opportunity.business?.name || 'Unknown Business'}
                    </span>
                  </td>
                  <td className="px-4 py-[5px]">
                    <StatusPill
                      label={STAGE_LABELS[opportunity.stage] || opportunity.stage}
                      tone={
                        opportunity.stage === 'won'
                          ? 'success'
                          : opportunity.stage === 'lost'
                            ? 'danger'
                            : 'info'
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-[13px] text-gray-600">
                    {new Date(opportunity.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2 text-[13px] text-gray-600">
                    {opportunity.closeDate ? (
                      new Date(opportunity.closeDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-[5px]">
                    {opportunity.notes ? (
                      <div className="text-[13px] text-gray-500 max-w-[240px] truncate" title={opportunity.notes}>
                        {opportunity.notes}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[13px]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    {/* Actions removed - row click opens edit modal */}
                  </td>
                </tr>
              ))}
            </EntityTable>
            {visibleCount < filteredOpportunities.length && (
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

      {/* Opportunity Modal */}
      <OpportunityFormModal
        isOpen={opportunityModalOpen}
        onClose={() => {
          setOpportunityModalOpen(false)
          setSelectedOpportunity(null)
        }}
        opportunity={selectedOpportunity}
        onSuccess={(newOpportunity) => {
          if (selectedOpportunity) {
            setOpportunities(prev => prev.map(o => o.id === selectedOpportunity.id ? newOpportunity : o))
          } else {
            setOpportunities(prev => [newOpportunity, ...prev])
          }
          loadData()
        }}
        // Pass preloaded data to skip fetching
        preloadedBusinesses={businessesFromOpportunities}
        preloadedCategories={categories}
        preloadedUsers={users}
      />


      {/* New Request Modal */}
      <NewRequestModal
        isOpen={showNewRequestModal}
        onClose={() => {
          setShowNewRequestModal(false)
          setNewRequestQueryParams({})
        }}
        queryParams={newRequestQueryParams}
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
