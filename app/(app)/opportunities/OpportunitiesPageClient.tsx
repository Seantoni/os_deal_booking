'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { getOpportunitiesPaginated, searchOpportunities, getOpportunityCounts } from '@/app/actions/opportunities'
import { deleteOpportunity } from '@/app/actions/crm'
import type { Opportunity } from '@/types'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import TableChartIcon from '@mui/icons-material/TableChart'
import FilterListIcon from '@mui/icons-material/FilterList'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { generateCsv, downloadCsv, formatDateForCsv, generateFilename, type ParsedCsvRow } from '@/lib/utils/csv-export'
import CsvUploadModal, { type CsvUploadPreview, type CsvUploadResult } from '@/components/common/CsvUploadModal'
import { bulkUpsertOpportunities, type BulkOpportunityRow } from '@/app/actions/opportunities'
import OpportunityKanban from '@/components/crm/OpportunityKanban'
import NewRequestModal from '@/components/booking/NewRequestModal'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
import { sortEntities } from '@/hooks/useEntityPage'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'
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

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'business', label: 'Negocio', sortable: true },
  { key: 'stage', label: 'Etapa', sortable: true },
  { key: 'startDate', label: 'Inicio', sortable: true },
  { key: 'closeDate', label: 'Cierre', sortable: true },
  { key: 'notes', label: 'Notas', sortable: true },
  { key: 'actions', label: '', align: 'right', width: 'w-28' },
]

interface OpportunitiesPageClientProps {
  initialOpportunities?: Opportunity[]
  initialBusinesses?: any[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export default function OpportunitiesPageClient({
  initialOpportunities,
  initialBusinesses,
  initialTotal = 0,
  initialCounts,
}: OpportunitiesPageClientProps = {}) {
  const searchParams = useSearchParams()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Get shared/cached data for categories and users
  const { categories, users } = useSharedData()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Advanced filters hook
  const { headerProps: advancedFilterProps, filterRules, applyFiltersToData } = useAdvancedFilters<Opportunity>('opportunities')
  
  // Use the reusable paginated search hook (now with server-side filtering)
  const {
    data: opportunities,
    setData: setOpportunities,
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
    countsLoading,
    refreshCounts,
    PaginationControls,
    SearchIndicator,
  } = usePaginatedSearch<Opportunity>({
    fetchPaginated: getOpportunitiesPaginated,
    searchFn: searchOpportunities,
    fetchCounts: getOpportunityCounts,
    initialData: initialOpportunities,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'oportunidades',
  })

  // View mode state - persist in localStorage
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')
  const [viewModeLoaded, setViewModeLoaded] = useState(false)
  
  // Stage filter is now managed by the hook
  const stageFilter = (filters.stage as string) || 'all'
  const setStageFilter = useCallback((stage: string) => {
    updateFilter('stage', stage === 'all' ? undefined : stage)
  }, [updateFilter])
  
  // Modal state
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [initialBusinessId, setInitialBusinessId] = useState<string | undefined>(undefined)
  
  // New request modal state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestQueryParams, setNewRequestQueryParams] = useState<Record<string, string>>({})
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  
  const confirmDialog = useConfirmDialog()
  const [initialModalTab, setInitialModalTab] = useState<'details' | 'activity' | 'chat'>('details')

  // Load persisted view mode on mount
  useEffect(() => {
    const saved = localStorage.getItem('opportunities-view-mode') as 'table' | 'kanban' | null
    if (saved && (saved === 'table' || saved === 'kanban')) {
      setViewMode(saved)
    }
    setViewModeLoaded(true)
  }, [])
  
  // Persist view mode preference
  useEffect(() => {
    if (viewModeLoaded) {
      localStorage.setItem('opportunities-view-mode', viewMode)
    }
  }, [viewMode, viewModeLoaded])

  // Handle opening opportunity from URL query params or session storage
  useEffect(() => {
    const displayOpps = searchResults || opportunities
    
    const createForBusinessId = sessionStorage.getItem('createOpportunityForBusinessId')
    if (createForBusinessId) {
      sessionStorage.removeItem('createOpportunityForBusinessId')
      setInitialBusinessId(createForBusinessId)
      setSelectedOpportunity(null)
      setInitialModalTab('details')
      setOpportunityModalOpen(true)
      return
    }

    if (displayOpps.length > 0) {
      const openFromUrl = searchParams.get('open')
      const tabFromUrl = searchParams.get('tab')
      
      if (openFromUrl) {
        const opp = displayOpps.find(o => o.id === openFromUrl)
        if (opp) {
          setSelectedOpportunity(opp)
          if (tabFromUrl === 'chat' || tabFromUrl === 'activity' || tabFromUrl === 'details') {
            setInitialModalTab(tabFromUrl)
          } else {
            setInitialModalTab('details')
          }
          setOpportunityModalOpen(true)
        }
        return
      }

      const openOpportunityId = sessionStorage.getItem('openOpportunityId')
      if (openOpportunityId) {
        sessionStorage.removeItem('openOpportunityId')
        const opp = displayOpps.find(o => o.id === openOpportunityId)
        if (opp) {
          setSelectedOpportunity(opp)
          setInitialModalTab('details')
          setOpportunityModalOpen(true)
        }
      }
    }
  }, [opportunities, searchResults, searchParams])

  // Extract businesses from opportunities for preloading
  const businessesFromOpportunities = useMemo(() => {
    const displayOpps = searchResults || opportunities
    const businessMap = new Map<string, any>()
    displayOpps.forEach(opp => {
      if (opp.business && !businessMap.has(opp.business.id)) {
        businessMap.set(opp.business.id, opp.business)
      }
    })
    return Array.from(businessMap.values())
  }, [opportunities, searchResults])

  // Determine which opportunities to display
  const displayOpportunities = searchResults !== null ? searchResults : opportunities

  // Filter tabs with server-side counts
  const filterTabs: FilterTab[] = useMemo(() => {
    // When searching, show counts from search results (client-side)
    if (isSearching) {
      const baseOpps = displayOpportunities
      return [
        { id: 'all', label: 'All', count: baseOpps.length },
    ...Object.entries(STAGE_LABELS).map(([key, label]) => ({
      id: key,
      label,
          count: baseOpps.filter(o => o.stage === key).length
    }))
      ]
    }
  
    // Otherwise, use server-side counts
    return [
      { id: 'all', label: 'All', count: counts.all ?? totalCount },
      ...Object.entries(STAGE_LABELS).map(([key, label]) => ({
        id: key,
        label,
        count: counts[key] ?? 0
    }))
    ]
  }, [displayOpportunities, totalCount, isSearching, counts])

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
  // Server-side filtering is used for paginated data
  // Client-side filtering only needed for search results
  const filteredOpportunities = useMemo(() => {
    let filtered = displayOpportunities

    // Only apply client-side stage filter when searching (server doesn't filter search results by stage)
    if (isSearching && stageFilter !== 'all') {
      filtered = filtered.filter(o => o.stage === stageFilter)
    }

    // Apply advanced filters (always, both for paginated and search results)
    filtered = applyFiltersToData(filtered)

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayOpportunities, stageFilter, isSearching, sortColumn, sortDirection, getSortValue, applyFiltersToData])

  // Prefetch form config when hovering over a row
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('opportunity')
  }, [prefetchFormConfig])

  function handleEditOpportunity(opportunity: Opportunity) {
    setSelectedOpportunity(opportunity)
    setOpportunityModalOpen(true)
  }

  async function handleDeleteOpportunity(opportunityId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Oportunidad',
      message: '¿Está seguro de que desea eliminar esta oportunidad? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setOpportunities(prev => prev.filter(o => o.id !== opportunityId))
    if (searchResults) {
      setSearchResults(prev => prev?.filter(o => o.id !== opportunityId) || null)
    }
    
    const result = await deleteOpportunity(opportunityId)
    if (!result.success) {
      toast.error(result.error || 'Error al eliminar la oportunidad')
      loadPage(currentPage)
    } else {
      toast.success('Oportunidad eliminada exitosamente')
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
      if (business.category.subCategory1) params.subCategory1 = business.category.subCategory1
      if (business.category.subCategory2) params.subCategory2 = business.category.subCategory2
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

  function handleDownloadCsv() {
    const csvColumns = [
      { key: 'id', label: 'ID', getValue: (o: Opportunity) => o.id },
      { key: 'business', label: 'Negocio', getValue: (o: Opportunity) => o.business?.name || '' },
      { key: 'stage', label: 'Etapa', getValue: (o: Opportunity) => STAGE_LABELS[o.stage] || o.stage },
      { key: 'startDate', label: 'Fecha Inicio', getValue: (o: Opportunity) => formatDateForCsv(o.startDate) },
      { key: 'closeDate', label: 'Fecha Cierre', getValue: (o: Opportunity) => formatDateForCsv(o.closeDate) },
      { key: 'notes', label: 'Notas', getValue: (o: Opportunity) => o.notes || '' },
      { key: 'responsible', label: 'Responsable', getValue: (o: Opportunity) => o.responsible?.name || '' },
      { key: 'lostReason', label: 'Motivo de Pérdida', getValue: (o: Opportunity) => o.lostReason || '' },
      { key: 'hasRequest', label: 'Tiene Solicitud', getValue: (o: Opportunity) => o.hasRequest ? 'Sí' : 'No' },
      { key: 'createdAt', label: 'Fecha Creación', getValue: (o: Opportunity) => formatDateForCsv(o.createdAt) },
    ]
    
    const csvContent = generateCsv(filteredOpportunities, csvColumns)
    downloadCsv(csvContent, generateFilename('opportunities'))
    toast.success(`Exported ${filteredOpportunities.length} opportunities`)
  }

  const csvUploadHeaders = ['ID', 'Negocio', 'Etapa', 'Fecha Inicio', 'Fecha Cierre', 'Notas', 'Responsable', 'Motivo de Pérdida', 'Tiene Solicitud', 'Fecha Creación']

  async function handleUploadPreview(rows: ParsedCsvRow[]): Promise<CsvUploadPreview> {
    let toCreate = 0
    let toUpdate = 0
    let skipped = 0
    const errors: string[] = []

    const existingIds = new Set(opportunities.map(o => o.id))
    const businessNames = new Set(businessesFromOpportunities.map(b => b.name.toLowerCase()))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      const id = row['ID']?.trim()
      const businessName = row['Negocio']?.trim()

      if (id) {
        if (existingIds.has(id)) {
          toUpdate++
        } else {
          errors.push(`Fila ${rowNum}: ID "${id}" no encontrado`)
          skipped++
        }
      } else if (businessName) {
        if (!businessNames.has(businessName.toLowerCase())) {
          errors.push(`Fila ${rowNum}: Negocio "${businessName}" no encontrado`)
          skipped++
        } else {
          toCreate++
        }
      } else {
        errors.push(`Fila ${rowNum}: Se requiere ID o Negocio`)
        skipped++
      }
    }

    return { toCreate, toUpdate, skipped, errors, rows }
  }

  async function handleUploadConfirm(rows: ParsedCsvRow[]): Promise<CsvUploadResult> {
    const opportunityRows: BulkOpportunityRow[] = rows.map(row => ({
      id: row['ID']?.trim() || undefined,
      business: row['Negocio']?.trim(),
      stage: row['Etapa']?.trim(),
      startDate: row['Fecha Inicio']?.trim(),
      closeDate: row['Fecha Cierre']?.trim(),
      notes: row['Notas']?.trim(),
      responsible: row['Responsable']?.trim(),
      lostReason: row['Motivo de Pérdida']?.trim(),
      hasRequest: row['Tiene Solicitud']?.trim(),
    }))

    const result = await bulkUpsertOpportunities(opportunityRows)
    
    if (result.success && result.data) {
      loadPage(currentPage)
      return result.data
    }
    
    return { created: 0, updated: 0, errors: [result.error || 'Error al importar'] }
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

  // Right side content for header
  const headerRightContent = isAdmin ? (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setUploadModalOpen(true)}
        variant="secondary"
        size="sm"
        leftIcon={<UploadIcon style={{ fontSize: 16 }} />}
        title="Importar CSV"
      >
        Importar
      </Button>
      <Button
        onClick={handleDownloadCsv}
        variant="secondary"
        size="sm"
        leftIcon={<DownloadIcon style={{ fontSize: 16 }} />}
        title="Descargar CSV"
      >
        CSV
      </Button>
    </div>
  ) : null

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="opportunities"
        searchPlaceholder="Buscar en todas las oportunidades..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={stageFilter}
        onFilterChange={setStageFilter}
        isAdmin={isAdmin}
        beforeFilters={viewToggle}
        rightContent={headerRightContent}
        {...advancedFilterProps}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron oportunidades"
            description={
              searchQuery || stageFilter !== 'all' || filterRules.length > 0
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Comience creando una nueva oportunidad'
            }
          />
        ) : viewMode === 'kanban' ? (
          <div className="h-full overflow-x-auto pb-2">
            <OpportunityKanban
              opportunities={filteredOpportunities}
              onUpdate={() => loadPage(currentPage)}
              onCreateRequest={handleCreateRequest}
              onCardClick={handleEditOpportunity}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <SearchIndicator />

            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {filteredOpportunities.map((opportunity, index) => (
                <TableRow
                  key={opportunity.id}
                  index={index}
                  onClick={() => handleEditOpportunity(opportunity)}
                  onMouseEnter={handleRowHover}
                >
                  <TableCell>
                    <span className="font-medium text-gray-900 text-[13px]">
                      {opportunity.business?.name || 'Unknown Business'}
                    </span>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {new Date(opportunity.startDate).toLocaleDateString('en-US', {
                      timeZone: PANAMA_TIMEZONE,
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {opportunity.closeDate ? (
                      new Date(opportunity.closeDate).toLocaleDateString('en-US', {
                        timeZone: PANAMA_TIMEZONE,
                        month: 'short',
                        day: 'numeric',
                      })
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {opportunity.notes ? (
                      <div className="text-[13px] text-gray-500 max-w-[240px] truncate" title={opportunity.notes}>
                        {opportunity.notes}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[13px]">-</span>
                    )}
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

      {/* Opportunity Modal */}
      <OpportunityFormModal
        isOpen={opportunityModalOpen}
        onClose={() => {
          setOpportunityModalOpen(false)
          setSelectedOpportunity(null)
          setInitialBusinessId(undefined)
          setInitialModalTab('details')
        }}
        opportunity={selectedOpportunity}
        onSuccess={(newOpportunity) => {
          if (selectedOpportunity) {
            setOpportunities(prev => prev.map(o => o.id === selectedOpportunity.id ? newOpportunity : o))
            if (searchResults) {
              setSearchResults(prev => prev?.map(o => o.id === selectedOpportunity.id ? newOpportunity : o) || null)
            }
          } else {
            setOpportunities(prev => [newOpportunity, ...prev])
          }
          if (!isSearching) {
            loadPage(currentPage)
          }
        }}
        initialTab={initialModalTab}
        initialBusinessId={initialBusinessId}
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

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        entityName="Oportunidades"
        expectedHeaders={csvUploadHeaders}
        idField="ID"
        onPreview={handleUploadPreview}
        onConfirm={handleUploadConfirm}
      />
    </div>
  )
}
