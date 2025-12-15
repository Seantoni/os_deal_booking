'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getLeads, deleteLead } from '@/app/actions/leads'
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS } from '@/lib/constants'
import type { Lead } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import BusinessIcon from '@mui/icons-material/Business'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useEntityPage, sortEntities } from '@/hooks/useEntityPage'
import { logger } from '@/lib/logger'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { RowActionsMenu, EntityTable, CellStack, StatusPill } from '@/components/shared/table'

// Lazy load the modal
const LeadFormModal = dynamic(() => import('@/components/crm/lead/LeadFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Business Name', sortable: true },
  { key: 'contact', label: 'Contact', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'responsible', label: 'Responsible', sortable: true },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'source', label: 'Source', sortable: true },
  { key: 'actions', label: '', width: 'w-10' },
]

// Search fields for leads
const SEARCH_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone', 'source']

export default function LeadsPageClient() {
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Use shared hook for common functionality
  const {
    data: leads,
    setData: setLeads,
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
  } = useEntityPage<Lead>({
    entityType: 'leads',
    fetchFn: async () => {
      const result = await getLeads()
      if (result.success && result.data) {
        return { success: true, data: result.data as Lead[] }
      }
      return result as { success: boolean; data?: Lead[]; error?: string }
    },
    searchFields: SEARCH_FIELDS,
    defaultSortDirection: 'desc',
  })

  // Stage filter state
  const [stageFilter, setStageFilter] = useState<string>('all')
  
  // Modal state
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)
  
  const confirmDialog = useConfirmDialog()

  // Get unique responsible users for filtering
  const responsibleUsers = useMemo(() => {
    const users = new Map<string, { clerkId: string; name: string | null; email: string | null }>()
    leads.forEach(lead => {
      if (lead.responsible) {
        users.set(lead.responsible.clerkId, {
          clerkId: lead.responsible.clerkId,
          name: lead.responsible.name,
          email: lead.responsible.email,
        })
      }
    })
    return Array.from(users.values())
  }, [leads])

  // Static filter tabs (shown immediately)
  const staticFilterTabs: FilterTab[] = useMemo(() => [
    { id: 'all', label: 'All' },
    ...Object.entries(LEAD_STAGE_LABELS).map(([key, label]) => ({
      id: key,
      label,
    }))
  ], [])
  
  // Stage filter tabs with counts (dynamic after load)
  const filterTabs: FilterTab[] = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length }
    Object.keys(LEAD_STAGE_LABELS).forEach(stage => {
      counts[stage] = leads.filter(l => l.stage === stage).length
    })
    
    return [
      { id: 'all', label: 'All', count: counts.all },
      ...Object.entries(LEAD_STAGE_LABELS).map(([key, label]) => ({
        id: key,
        label,
        count: counts[key] || 0
      }))
    ]
  }, [leads, staticFilterTabs])

  // Get sort value for a lead
  const getSortValue = useCallback((lead: Lead, column: string): string | number | null => {
    switch (column) {
      case 'name':
        return lead.name.toLowerCase()
      case 'contact':
        return (lead.contactName || '').toLowerCase()
      case 'email':
        return lead.contactEmail.toLowerCase()
      case 'category':
        return (lead.category?.parentCategory || '').toLowerCase()
      case 'responsible':
        return (lead.responsible?.name || lead.responsible?.email || '').toLowerCase()
      case 'stage':
        const stageOrder = ['por_asignar', 'asignado', 'convertido']
        return stageOrder.indexOf(lead.stage)
      case 'source':
        return (lead.source || '').toLowerCase()
      default:
        return null
    }
  }, [])

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let filtered = leads

    // Stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(l => l.stage === stageFilter)
    }

    // Apply search filter
    filtered = applySearchFilter(filtered)

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered)

    // Sort
    return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
  }, [leads, stageFilter, applySearchFilter, applyAdvancedFilters, sortColumn, sortDirection, getSortValue])

  const visibleLeads = useMemo(() => filteredLeads.slice(0, visibleCount), [filteredLeads, visibleCount])

  function handleCreateLead() {
    setSelectedLead(null)
    setLeadModalOpen(true)
  }

  function handleEditLead(lead: Lead) {
    setSelectedLead(lead)
    setLeadModalOpen(true)
    setMenuOpen(null)
  }

  async function handleDeleteLead(leadId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update
    setLeads(prev => prev.filter(l => l.id !== leadId))
    setMenuOpen(null)
    
    const result = await deleteLead(leadId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete lead')
      loadData()
    } else {
      toast.success('Lead deleted successfully')
    }
  }

  // Right side content for header
  const headerRightContent = (
    <Button
      onClick={handleCreateLead}
      variant="primary"
      size="sm"
      leftIcon={<AddIcon style={{ fontSize: 16 }} />}
      className="bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500 disabled:bg-orange-300"
    >
      New Lead
    </Button>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="leads"
        searchPlaceholder="Search leads..."
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
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Loading...</div>
        ) : filteredLeads.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No leads found"
            description={
              searchQuery || stageFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating a new lead'
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
              {visibleLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleEditLead(lead)}
                  className="group hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-[5px]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditLead(lead)
                        }}
                        className="font-medium text-gray-900 text-[13px] hover:text-blue-600 transition-colors text-left"
                      >
                        {lead.name}
                      </button>
                      {lead.businessId && (
                        <BusinessIcon fontSize="small" className="text-green-600" titleAccess="Converted to Business" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[13px] text-gray-600">
                    {lead.contactName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-[5px]">
                    <span className="text-[13px] text-gray-500 break-all">{lead.contactEmail || <span className="text-gray-400">-</span>}</span>
                  </td>
                  <td className="px-4 py-[5px]">
                    <span className="text-[13px] text-gray-500 whitespace-nowrap">{lead.contactPhone || <span className="text-gray-400">-</span>}</span>
                  </td>
                  <td className="px-4 py-[5px]">
                    {lead.category ? (
                      <span className="text-xs text-gray-600">
                        {lead.category.parentCategory}
                        {lead.category.subCategory1 && ` › ${lead.category.subCategory1}`}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[13px] text-gray-600">
                    {lead.responsible?.name || lead.responsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-[5px]">
                    <StatusPill
                      label={LEAD_STAGE_LABELS[lead.stage] || lead.stage}
                      tone={
                        lead.stage === 'convertido'
                          ? 'success'
                          : lead.stage === 'por_asignar'
                            ? 'warning'
                            : 'info'
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-[13px] text-gray-600">
                    {lead.source || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      isOpen={menuOpen === lead.id}
                      onOpenChange={(open) => setMenuOpen(open ? lead.id : null)}
                      items={[
                        {
                          label: 'Edit',
                          onClick: () => handleEditLead(lead),
                        },
                        isAdmin && !lead.businessId
                          ? {
                              label: 'Delete',
                              tone: 'danger',
                              onClick: () => handleDeleteLead(lead.id),
                            }
                          : null,
                      ].filter(Boolean) as any}
                    />
                  </td>
                </tr>
              ))}
            </EntityTable>
            {visibleCount < filteredLeads.length && (
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
      <LeadFormModal
        isOpen={leadModalOpen}
        onClose={() => {
          setLeadModalOpen(false)
          setSelectedLead(null)
        }}
        lead={selectedLead}
        onSuccess={(newLead) => {
          if (selectedLead) {
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? newLead : l))
          } else {
            setLeads(prev => [newLead, ...prev])
          }
          loadData()
        }}
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
