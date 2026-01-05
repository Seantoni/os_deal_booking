'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getBusinesses, deleteBusiness, getOpportunities } from '@/app/actions/crm'
import { getBookingRequests } from '@/app/actions/booking-requests'
import type { BookingRequest } from '@/types'
import type { Business, Opportunity } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import { generateCsv, downloadCsv, formatDateForCsv, generateFilename, type ParsedCsvRow } from '@/lib/utils/csv-export'
import CsvUploadModal, { type CsvUploadPreview, type CsvUploadResult } from '@/components/common/CsvUploadModal'
import { bulkUpsertBusinesses, type BulkBusinessRow } from '@/app/actions/businesses'

// Lazy load heavy modal components
const BusinessFormModal = dynamic(() => import('@/components/crm/business/BusinessFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => null,
  ssr: false,
})
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
import { EntityTable, CellStack, TableRow, TableCell } from '@/components/shared/table'

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre del Negocio', sortable: true },
  { key: 'contact', label: 'Contacto', sortable: true },
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'category', label: 'Categoría', sortable: true },
  { key: 'netRev360', label: 'Ing. Neto (360d)', sortable: true, align: 'right' },
  { key: 'reps', label: 'Reps' },
  { key: 'openOpps', label: 'Opps Abiertas', sortable: true, align: 'center', width: 'w-20' },
  { key: 'pendingReqs', label: 'Solic. Pendientes', sortable: true, align: 'center', width: 'w-24' },
  { key: 'actions', label: '', width: 'w-20' },
]

// Search fields for businesses
const SEARCH_FIELDS = ['name', 'contactName', 'contactEmail', 'contactPhone']

interface BusinessesPageClientProps {
  initialBusinesses?: Business[]
  initialOpportunities?: Opportunity[]
  initialRequests?: BookingRequest[]
}

export default function BusinessesPageClient({
  initialBusinesses,
  initialOpportunities,
  initialRequests,
}: BusinessesPageClientProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    initialData: initialBusinesses, // Server-prefetched data
  })

  // Additional state for opportunities and requests (initialized from server)
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities || [])
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>(initialRequests || [])
  const [opportunityFilter, setOpportunityFilter] = useState<'all' | 'with-open' | 'without-open'>('all')
  const [visibleCount, setVisibleCount] = useState(50)
  
  // Modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedBusinessForOpportunity, setSelectedBusinessForOpportunity] = useState<Business | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  
  const confirmDialog = useConfirmDialog()

  // Handle opening business from URL query params (e.g., from search)
  useEffect(() => {
    const openFromUrl = searchParams.get('open')
    if (openFromUrl && businesses.length > 0) {
      const business = businesses.find(b => b.id === openFromUrl)
      if (business) {
        setSelectedBusiness(business)
        setBusinessModalOpen(true)
      }
    }
  }, [searchParams, businesses])

  // Load opportunities and booking requests alongside businesses
  // Skip if we have server-prefetched data
  useEffect(() => {
    // If we have initial data from server, no need to fetch
    if (initialOpportunities?.length || initialRequests?.length) {
      return
    }
    
    async function loadOpportunitiesAndRequests() {
      try {
        const [oppsResult, reqsResult] = await Promise.all([
          getOpportunities(),
          getBookingRequests(),
        ])
        if (oppsResult.success && oppsResult.data) {
          setOpportunities(oppsResult.data)
        }
        if (reqsResult.success && reqsResult.data) {
          setBookingRequests(reqsResult.data)
        }
      } catch (error) {
        logger.error('Failed to load opportunities/requests:', error)
      }
    }
    loadOpportunitiesAndRequests()
  }, [initialOpportunities, initialRequests])

  // Map of business IDs to count of open opportunities
  const businessOpenOpportunityCount = useMemo(() => {
    const map = new Map<string, number>()
    opportunities.forEach(opp => {
      const isOpen = opp.stage !== 'won' && opp.stage !== 'lost'
      if (opp.businessId && isOpen) {
        map.set(opp.businessId, (map.get(opp.businessId) || 0) + 1)
      }
    })
    return map
  }, [opportunities])

  // Map of business names to count of pending requests
  const businessPendingRequestCount = useMemo(() => {
    const map = new Map<string, number>()
    bookingRequests.forEach(req => {
      if (req.status === 'pending' && req.merchant) {
        // Match by merchant name (case-insensitive)
        const merchantLower = req.merchant.toLowerCase()
        map.set(merchantLower, (map.get(merchantLower) || 0) + 1)
      }
    })
    return map
  }, [bookingRequests])

  // Helper to check if business has open opportunity (for filter tabs)
  const businessHasOpenOpportunity = useMemo(() => {
    const map = new Map<string, boolean>()
    businessOpenOpportunityCount.forEach((count, businessId) => {
      if (count > 0) map.set(businessId, true)
    })
    return map
  }, [businessOpenOpportunityCount])

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
        return (business as any)?.metrics?.net_rev_360_days ?? null
      case 'openOpps':
        return businessOpenOpportunityCount.get(business.id) || 0
      case 'pendingReqs':
        return businessPendingRequestCount.get(business.name.toLowerCase()) || 0
      default:
        return null
    }
  }, [businessOpenOpportunityCount, businessPendingRequestCount])

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
  }, [businesses, opportunityFilter, businessHasOpenOpportunity, applySearchFilter, applyAdvancedFilters, sortColumn, sortDirection, getSortValue])

  const visibleBusinesses = useMemo(() => filteredBusinesses.slice(0, visibleCount), [filteredBusinesses, visibleCount])

  function handleCreateBusiness() {
    setSelectedBusiness(null)
    setBusinessModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
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
    
    const result = await deleteBusiness(businessId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete business')
      loadData()
    } else {
      toast.success('Business deleted successfully')
    }
  }

  function handleCreateOpportunity(business: Business) {
    setSelectedBusinessForOpportunity(business)
    setOpportunityModalOpen(true)
  }

  function handleDownloadCsv() {
    const csvColumns = [
      { key: 'id', label: 'ID', getValue: (b: Business) => b.id },
      { key: 'name', label: 'Nombre', getValue: (b: Business) => b.name },
      { key: 'contactName', label: 'Contacto', getValue: (b: Business) => b.contactName || '' },
      { key: 'contactEmail', label: 'Email', getValue: (b: Business) => b.contactEmail || '' },
      { key: 'contactPhone', label: 'Teléfono', getValue: (b: Business) => b.contactPhone || '' },
      { key: 'category', label: 'Categoría', getValue: (b: Business) => {
        if (!b.category) return ''
        let cat = b.category.parentCategory
        if (b.category.subCategory1) cat += ` > ${b.category.subCategory1}`
        if (b.category.subCategory2) cat += ` > ${b.category.subCategory2}`
        return cat
      }},
      { key: 'owner', label: 'Owner', getValue: (b: Business) => b.owner?.name || '' },
      { key: 'salesReps', label: 'Sales Reps', getValue: (b: Business) => 
        b.salesReps?.map(r => r.salesRep?.name || '').filter(Boolean).join(', ') || ''
      },
      { key: 'province', label: 'Provincia', getValue: (b: Business) => b.province || '' },
      { key: 'district', label: 'Distrito', getValue: (b: Business) => b.district || '' },
      { key: 'ruc', label: 'RUC', getValue: (b: Business) => b.ruc || '' },
      { key: 'razonSocial', label: 'Razón Social', getValue: (b: Business) => b.razonSocial || '' },
      { key: 'createdAt', label: 'Fecha Creación', getValue: (b: Business) => formatDateForCsv(b.createdAt) },
    ]
    
    const csvContent = generateCsv(filteredBusinesses, csvColumns)
    downloadCsv(csvContent, generateFilename('businesses'))
    toast.success(`Exported ${filteredBusinesses.length} businesses`)
  }

  // CSV Upload expected headers (matching download format)
  const csvUploadHeaders = ['ID', 'Nombre', 'Contacto', 'Email', 'Teléfono', 'Categoría', 'Owner', 'Sales Reps', 'Provincia', 'Distrito', 'RUC', 'Razón Social', 'Fecha Creación']

  // CSV Upload preview handler
  async function handleUploadPreview(rows: ParsedCsvRow[]): Promise<CsvUploadPreview> {
    let toCreate = 0
    let toUpdate = 0
    let skipped = 0
    const errors: string[] = []

    // Get existing business IDs for validation
    const existingIds = new Set(businesses.map(b => b.id))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      const id = row['ID']?.trim()
      const name = row['Nombre']?.trim()

      if (id) {
        if (existingIds.has(id)) {
          toUpdate++
        } else {
          errors.push(`Fila ${rowNum}: ID "${id}" no encontrado`)
          skipped++
        }
      } else if (name) {
        // Check for duplicate name
        const existingName = businesses.find(b => b.name.toLowerCase() === name.toLowerCase())
        if (existingName) {
          errors.push(`Fila ${rowNum}: Ya existe negocio con nombre "${name}"`)
          skipped++
        } else {
          toCreate++
        }
      } else {
        errors.push(`Fila ${rowNum}: Se requiere ID o Nombre`)
        skipped++
      }
    }

    return { toCreate, toUpdate, skipped, errors, rows }
  }

  // CSV Upload confirm handler
  async function handleUploadConfirm(rows: ParsedCsvRow[]): Promise<CsvUploadResult> {
    // Map CSV rows to BulkBusinessRow
    const businessRows: BulkBusinessRow[] = rows.map(row => ({
      id: row['ID']?.trim() || undefined,
      name: row['Nombre']?.trim() || '',
      contactName: row['Contacto']?.trim(),
      contactEmail: row['Email']?.trim(),
      contactPhone: row['Teléfono']?.trim(),
      category: row['Categoría']?.trim(),
      owner: row['Owner']?.trim(),
      salesReps: row['Sales Reps']?.trim(),
      province: row['Provincia']?.trim(),
      district: row['Distrito']?.trim(),
      ruc: row['RUC']?.trim(),
      razonSocial: row['Razón Social']?.trim(),
    }))

    const result = await bulkUpsertBusinesses(businessRows)
    
    if (result.success && result.data) {
      // Reload data after successful import
      loadData()
      return result.data
    }
    
    return { created: 0, updated: 0, errors: [result.error || 'Error al importar'] }
  }

  function handleCreateRequest(business: Business) {
    // Build query parameters with business data (matching OpportunityFormModal behavior)
    const params = new URLSearchParams()
    
    // Flag to trigger pre-fill logic in EnhancedBookingForm
    params.set('fromOpportunity', 'business')
    
    // Basic business info
    params.set('businessName', business.name)
    params.set('businessEmail', business.contactEmail)
    params.set('contactName', business.contactName || '')
    params.set('contactPhone', business.contactPhone || '')
    
    // Category info
    if (business.category) {
      params.set('categoryId', business.category.id)
      params.set('parentCategory', business.category.parentCategory)
      if (business.category.subCategory1) params.set('subCategory1', business.category.subCategory1)
      if (business.category.subCategory2) params.set('subCategory2', business.category.subCategory2)
    }
    
    // Legal/Tax info
    if (business.razonSocial) params.set('legalName', business.razonSocial)
    if (business.ruc) params.set('ruc', business.ruc)
    
    // Location info
    if (business.province) params.set('province', business.province)
    if (business.district) params.set('district', business.district)
    if (business.corregimiento) params.set('corregimiento', business.corregimiento)
    if (business.address) params.set('address', business.address)
    if (business.neighborhood) params.set('neighborhood', business.neighborhood)
    
    // Bank/Payment info
    if (business.bank) params.set('bank', business.bank)
    if (business.beneficiaryName) params.set('bankAccountName', business.beneficiaryName)
    if (business.accountNumber) params.set('accountNumber', business.accountNumber)
    if (business.accountType) params.set('accountType', business.accountType)
    if (business.paymentPlan) params.set('paymentPlan', business.paymentPlan)
    
    // Additional info
    if (business.description) params.set('description', business.description)
    if (business.website) params.set('website', business.website)
    if (business.instagram) params.set('instagram', business.instagram)
    
    // Payment contact emails
    if (business.emailPaymentContacts) {
      const paymentEmails = business.emailPaymentContacts.split(/[;,\s]+/).filter(Boolean)
      if (paymentEmails.length > 0) {
        params.set('paymentEmails', JSON.stringify(paymentEmails))
      }
    }
    
    router.push(`/booking-requests/new?${params.toString()}`)
  }

  // Right side content for header
  const headerRightContent = (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <>
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
        </>
      )}
      <Button
        onClick={handleCreateBusiness}
        size="sm"
        leftIcon={<AddIcon style={{ fontSize: 16 }} sx={{}} />}
      >
        Nuevo Negocio
      </Button>
    </div>
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
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Cargando...</div>
        ) : filteredBusinesses.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron negocios"
            description={
              searchQuery || opportunityFilter !== 'all' 
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Comience creando un nuevo negocio'
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
              {visibleBusinesses.map((business, index) => (
                <TableRow
                  key={business.id}
                  index={index}
                  onClick={() => handleEditBusiness(business)}
                >
                  <TableCell>
                    <span className="font-medium text-gray-900 text-[13px]">
                      {business.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {business.contactName || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500 break-all">
                    {business.contactEmail || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500 whitespace-nowrap">
                    {business.contactPhone || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    {business.category ? (
                      <span className="text-xs text-gray-600">
                        {business.category.parentCategory}
                        {business.category.subCategory1 && ` › ${business.category.subCategory1}`}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {business.sourceType === 'api' && (business as any)?.metrics?.net_rev_360_days !== undefined ? (
                      <span className="text-xs font-semibold text-gray-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                          (business as any)?.metrics?.net_rev_360_days ?? 0
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {business.salesReps && business.salesReps.length > 0 ? (
                      <span className="text-xs text-gray-600">
                        {business.salesReps.map(rep => rep.salesRep?.name?.split(' ')[0] || '?').join(', ')}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const count = businessOpenOpportunityCount.get(business.id) || 0
                      return count > 0 ? (
                        <span className="inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {count}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )
                    })()}
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const count = businessPendingRequestCount.get(business.name.toLowerCase()) || 0
                      return count > 0 ? (
                        <span className="inline-flex px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                          {count}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )
                    })()}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCreateOpportunity(business)}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Create Opportunity"
                      >
                        <HandshakeIcon style={{ fontSize: 18 }} />
                      </button>
                      <button
                        onClick={() => handleCreateRequest(business)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="Create Request"
                      >
                        <DescriptionIcon style={{ fontSize: 18 }} />
                      </button>
                      <button
                        onClick={() => router.push(`/businesses/${business.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Open full page"
                      >
                        <OpenInNewIcon style={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
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

      {/* Opportunity Modal */}
      {opportunityModalOpen && selectedBusinessForOpportunity && (
        <OpportunityFormModal
          isOpen={opportunityModalOpen}
          onClose={() => {
            setOpportunityModalOpen(false)
            setSelectedBusinessForOpportunity(null)
          }}
          opportunity={null}
          initialBusinessId={selectedBusinessForOpportunity.id}
          onSuccess={(newOpportunity) => {
            toast.success('Opportunity created successfully')
            setOpportunityModalOpen(false)
            setSelectedBusinessForOpportunity(null)
            // Reload opportunities to update the "Open" badge
            getOpportunities().then(result => {
              if (result.success && result.data) {
                setOpportunities(result.data)
              }
            })
          }}
          preloadedBusinesses={businesses}
          preloadedCategories={categories}
          preloadedUsers={users}
        />
      )}

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
        entityName="Negocios"
        expectedHeaders={csvUploadHeaders}
        idField="ID"
        onPreview={handleUploadPreview}
        onConfirm={handleUploadConfirm}
      />
    </div>
  )
}
