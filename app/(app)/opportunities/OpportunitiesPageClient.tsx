'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { getOpportunities, deleteOpportunity } from '@/app/actions/crm'
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
import { useEntityPage, sortEntities } from '@/hooks/useEntityPage'
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
  { key: 'business', label: 'Negocio', sortable: true },
  { key: 'stage', label: 'Etapa', sortable: true },
  { key: 'startDate', label: 'Inicio', sortable: true },
  { key: 'closeDate', label: 'Cierre', sortable: true },
  { key: 'notes', label: 'Notas', sortable: true },
  { key: 'actions', label: '', align: 'right', width: 'w-28' },
]

// Search fields for opportunities
const SEARCH_FIELDS = ['business.name', 'notes', 'business.contactName', 'business.contactEmail']

interface OpportunitiesPageClientProps {
  initialOpportunities?: Opportunity[]
  initialBusinesses?: any[]
}

export default function OpportunitiesPageClient({
  initialOpportunities,
  initialBusinesses,
}: OpportunitiesPageClientProps = {}) {
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
    initialData: initialOpportunities, // Server-prefetched data
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
  const [initialBusinessId, setInitialBusinessId] = useState<string | undefined>(undefined)
  
  // New request modal state
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestQueryParams, setNewRequestQueryParams] = useState<Record<string, string>>({})
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  
  const confirmDialog = useConfirmDialog()

  // Initial tab for opportunity modal (from URL params like ?tab=chat)
  const [initialModalTab, setInitialModalTab] = useState<'details' | 'activity' | 'chat'>('details')

  // Handle opening opportunity from URL query params or session storage
  useEffect(() => {
    // Check for creating a new opportunity for a specific business
    const createForBusinessId = sessionStorage.getItem('createOpportunityForBusinessId')
    if (createForBusinessId) {
      sessionStorage.removeItem('createOpportunityForBusinessId')
      setInitialBusinessId(createForBusinessId)
      setSelectedOpportunity(null)
      setInitialModalTab('details')
      setOpportunityModalOpen(true)
      return
    }

    if (opportunities.length > 0) {
      // First check URL query params (e.g., ?open=opportunityId from Tasks page or Inbox)
      const openFromUrl = searchParams.get('open')
      const tabFromUrl = searchParams.get('tab')
      
      if (openFromUrl) {
        const opp = opportunities.find(o => o.id === openFromUrl)
        if (opp) {
          setSelectedOpportunity(opp)
          // Set initial tab if provided (e.g., 'chat' from inbox)
          if (tabFromUrl === 'chat' || tabFromUrl === 'activity' || tabFromUrl === 'details') {
            setInitialModalTab(tabFromUrl)
          } else {
            setInitialModalTab('details')
          }
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
          setInitialModalTab('details') // Default to details from sessionStorage
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
      title: 'Eliminar Oportunidad',
      message: '¿Está seguro de que desea eliminar esta oportunidad? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update
    setOpportunities(prev => prev.filter(o => o.id !== opportunityId))
    
    const result = await deleteOpportunity(opportunityId)
    if (!result.success) {
      toast.error(result.error || 'Error al eliminar la oportunidad')
      loadData()
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

  // CSV Upload expected headers (matching download format)
  const csvUploadHeaders = ['ID', 'Negocio', 'Etapa', 'Fecha Inicio', 'Fecha Cierre', 'Notas', 'Responsable', 'Motivo de Pérdida', 'Tiene Solicitud', 'Fecha Creación']

  // CSV Upload preview handler
  async function handleUploadPreview(rows: ParsedCsvRow[]): Promise<CsvUploadPreview> {
    let toCreate = 0
    let toUpdate = 0
    let skipped = 0
    const errors: string[] = []

    // Get existing opportunity IDs for validation
    const existingIds = new Set(opportunities.map(o => o.id))
    
    // Get business names for validation
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
        // Check if business exists
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

  // CSV Upload confirm handler
  async function handleUploadConfirm(rows: ParsedCsvRow[]): Promise<CsvUploadResult> {
    // Map CSV rows to BulkOpportunityRow
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
      // Reload data after successful import
      loadData()
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

  // Right side content for header (admin only CSV download/upload)
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="opportunities"
        searchPlaceholder="Buscar oportunidades..."
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
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Cargando...</div>
        ) : filteredOpportunities.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron oportunidades"
            description={
              searchQuery || stageFilter !== 'all' 
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Comience creando una nueva oportunidad'
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
              {visibleOpportunities.map((opportunity, index) => (
                <TableRow
                  key={opportunity.id}
                  index={index}
                  onClick={() => handleEditOpportunity(opportunity)}
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
          setInitialBusinessId(undefined)
          setInitialModalTab('details') // Reset to default when closing
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
        initialTab={initialModalTab}
        initialBusinessId={initialBusinessId}
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
