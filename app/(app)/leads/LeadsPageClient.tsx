'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getLeadsPaginated, searchLeads, deleteLead, getLeadsCounts } from '@/app/actions/leads'
import { LEAD_STAGE_LABELS } from '@/lib/constants'
import type { Lead } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import BusinessIcon from '@mui/icons-material/Business'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { sortEntities } from '@/hooks/useEntityPage'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'

// Lazy load the modal
const LeadFormModal = dynamic(() => import('@/components/crm/lead/LeadFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre del Negocio', sortable: true },
  { key: 'contact', label: 'Contacto', sortable: true },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'category', label: 'Categoría', sortable: true },
  { key: 'responsible', label: 'Responsable', sortable: true },
  { key: 'stage', label: 'Etapa', sortable: true },
  { key: 'source', label: 'Origen', sortable: true },
  { key: 'actions', label: '', width: 'w-10' },
]

interface LeadsPageClientProps {
  initialLeads?: Lead[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export default function LeadsPageClient({
  initialLeads,
  initialTotal = 0,
  initialCounts,
}: LeadsPageClientProps = {}) {
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Use the reusable paginated search hook (now with server-side filtering)
  const {
    data: leads,
    setData: setLeads,
    searchResults,
    setSearchResults,
    loading,
    searchLoading,
    searchQuery,
    handleSearchChange,
    isSearching,
    currentPage,
    totalCount,
    sortColumn,
    sortDirection,
    handleSort,
    loadPage,
    filters,
    updateFilter,
    counts,
    PaginationControls,
    SearchIndicator,
  } = usePaginatedSearch<Lead>({
    fetchPaginated: getLeadsPaginated,
    searchFn: searchLeads,
    fetchCounts: getLeadsCounts,
    initialData: initialLeads,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'leads',
  })

  // Stage filter is now managed by the hook
  const stageFilter = (filters.stage as string) || 'all'
  const setStageFilter = useCallback((stage: string) => {
    updateFilter('stage', stage === 'all' ? undefined : stage)
  }, [updateFilter])
  
  // Modal state
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  
  const confirmDialog = useConfirmDialog()

  // Determine which leads to display
  const displayLeads = searchResults !== null ? searchResults : leads

  // Stage filter tabs with server-side counts
  const filterTabs: FilterTab[] = useMemo(() => {
    // When searching, show counts from search results (client-side)
    if (isSearching) {
      const baseLeads = displayLeads
      return [
        { id: 'all', label: 'All', count: baseLeads.length },
        ...Object.entries(LEAD_STAGE_LABELS).map(([key, label]) => ({
          id: key,
          label,
          count: baseLeads.filter(l => l.stage === key).length
        }))
      ]
    }
    
    // Otherwise, use server-side counts
    return [
      { id: 'all', label: 'All', count: counts.all ?? totalCount },
      ...Object.entries(LEAD_STAGE_LABELS).map(([key, label]) => ({
        id: key,
        label,
        count: counts[key] ?? 0
      }))
    ]
  }, [displayLeads, totalCount, isSearching, counts])

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
  // Server-side filtering is used for paginated data
  // Client-side filtering only needed for search results
  const filteredLeads = useMemo(() => {
    let filtered = displayLeads

    // Only apply client-side stage filter when searching (server doesn't filter search results by stage)
    if (isSearching && stageFilter !== 'all') {
      filtered = filtered.filter(l => l.stage === stageFilter)
    }

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayLeads, stageFilter, isSearching, sortColumn, sortDirection, getSortValue])

  // Prefetch form config when hovering over a row
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('lead')
  }, [prefetchFormConfig])

  function handleCreateLead() {
    setSelectedLead(null)
    setLeadModalOpen(true)
  }

  function handleEditLead(lead: Lead) {
    setSelectedLead(lead)
    setLeadModalOpen(true)
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
    if (searchResults) {
      setSearchResults(prev => prev?.filter(l => l.id !== leadId) || null)
    }
    
    const result = await deleteLead(leadId)
    if (!result.success) {
      toast.error(result.error || 'Error al eliminar el lead')
      loadPage(currentPage)
    } else {
      toast.success('Lead eliminado exitosamente')
    }
  }

  // Right side content for header
  const headerRightContent = (
    <Button
      onClick={handleCreateLead}
      onMouseEnter={handleRowHover}
      variant="primary"
      size="sm"
      leftIcon={<AddIcon style={{ fontSize: 16 }} />}
      className="bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500 disabled:bg-orange-300"
    >
      Nuevo Lead
    </Button>
  )

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="leads"
        searchPlaceholder="Buscar en todos los leads..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={stageFilter}
        onFilterChange={setStageFilter}
        isAdmin={isAdmin}
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron leads"
            description={
              searchQuery || stageFilter !== 'all' 
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Comience creando un nuevo lead'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <SearchIndicator />
            
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {filteredLeads.map((lead, index) => (
                <TableRow
                  key={lead.id}
                  index={index}
                  onClick={() => handleEditLead(lead)}
                  onMouseEnter={handleRowHover}
                >
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {lead.contactName || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500 break-all">
                    {lead.contactEmail || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500 whitespace-nowrap">
                    {lead.contactPhone || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    {lead.category ? (
                      <span className="text-xs text-gray-600">
                        {lead.category.parentCategory}
                        {lead.category.subCategory1 && ` › ${lead.category.subCategory1}`}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {lead.responsible?.name || lead.responsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {lead.source || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {/* Actions removed - row click opens edit modal */}
                  </TableCell>
                </TableRow>
              ))}
            </EntityTable>
            
            <PaginationControls />
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
            if (searchResults) {
              setSearchResults(prev => prev?.map(l => l.id === selectedLead.id ? newLead : l) || null)
            }
          } else {
            setLeads(prev => [newLead, ...prev])
          }
          if (!isSearching) {
            loadPage(currentPage)
          }
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
