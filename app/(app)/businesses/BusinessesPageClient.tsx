'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { deleteBusiness, getOpportunities } from '@/app/actions/crm'
import { getBusinessesPaginated, searchBusinesses, getBusinessCounts } from '@/app/actions/businesses'
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
import type { ParsedCsvRow } from '@/lib/utils/csv-export'
import CsvUploadModal, { type CsvUploadPreview, type CsvUploadResult } from '@/components/common/CsvUploadModal'
import { exportBusinessesToCsv } from './csv-export'
import { CSV_IMPORT_HEADERS, previewBusinessImport, confirmBusinessImport } from './csv-import'

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
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { sortEntities } from '@/hooks/useEntityPage'
import { logger } from '@/lib/logger'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'

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

interface BusinessesPageClientProps {
  initialBusinesses?: Business[]
  initialOpportunities?: Opportunity[]
  initialRequests?: BookingRequest[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export default function BusinessesPageClient({
  initialBusinesses,
  initialOpportunities,
  initialRequests,
  initialTotal = 0,
  initialCounts,
}: BusinessesPageClientProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  
  // Get shared/cached data for categories and users
  const { categories, users } = useSharedData()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Use the reusable paginated search hook (now with server-side filtering)
  const {
    data: businesses,
    setData: setBusinesses,
    searchResults,
    setSearchResults,
    loading,
    searchLoading,
    searchQuery,
    handleSearchChange,
    isSearching,
    currentPage,
    sortColumn,
    sortDirection,
    handleSort,
    loadPage,
    filters,
    updateFilter,
    counts,
    PaginationControls,
    SearchIndicator,
  } = usePaginatedSearch<Business>({
    fetchPaginated: getBusinessesPaginated,
    searchFn: searchBusinesses,
    fetchCounts: getBusinessCounts,
    initialData: initialBusinesses,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'negocios',
  })

  // Additional state for opportunities and requests (initialized from server)
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities || [])
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>(initialRequests || [])
  
  // Opportunity filter is now managed by the hook
  const opportunityFilter = (filters.opportunityFilter as 'all' | 'with-open' | 'without-open') || 'all'
  const setOpportunityFilter = useCallback((filter: 'all' | 'with-open' | 'without-open') => {
    updateFilter('opportunityFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])
  
  // Modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedBusinessForOpportunity, setSelectedBusinessForOpportunity] = useState<Business | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  
  const confirmDialog = useConfirmDialog()

  // Handle opening business from URL query params or sessionStorage
  useEffect(() => {
    const openBusinessId = sessionStorage.getItem('openBusinessId')
    if (openBusinessId) {
      sessionStorage.removeItem('openBusinessId')
      const allBusinesses = searchResults || businesses
      if (allBusinesses.length > 0) {
        const business = allBusinesses.find(b => b.id === openBusinessId)
        if (business) {
          setSelectedBusiness(business)
          setBusinessModalOpen(true)
          return
        }
      }
    }

    const openFromUrl = searchParams.get('open')
    if (openFromUrl) {
      const allBusinesses = searchResults || businesses
      if (allBusinesses.length > 0) {
        const business = allBusinesses.find(b => b.id === openFromUrl)
        if (business) {
          setSelectedBusiness(business)
          setBusinessModalOpen(true)
        }
      }
    }
  }, [searchParams, businesses, searchResults])

  // Load opportunities and booking requests alongside businesses
  useEffect(() => {
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
        const merchantLower = req.merchant.toLowerCase()
        map.set(merchantLower, (map.get(merchantLower) || 0) + 1)
      }
    })
    return map
  }, [bookingRequests])

  // Helper to check if business has open opportunity
  const businessHasOpenOpportunity = useMemo(() => {
    const map = new Map<string, boolean>()
    businessOpenOpportunityCount.forEach((count, businessId) => {
      if (count > 0) map.set(businessId, true)
    })
    return map
  }, [businessOpenOpportunityCount])

  // Determine which businesses to display
  const displayBusinesses = searchResults !== null ? searchResults : businesses

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    // When searching, use client-side counts
    if (isSearching) {
      const baseBusinesses = displayBusinesses
      return [
        { id: 'all', label: 'All', count: baseBusinesses.length },
        { id: 'with-open', label: 'With Open Opportunity', count: baseBusinesses.filter(b => businessHasOpenOpportunity.get(b.id)).length },
        { id: 'without-open', label: 'Without Open Opportunity', count: baseBusinesses.filter(b => !businessHasOpenOpportunity.get(b.id)).length },
      ]
    }
    
    // Use server-side counts
    return [
      { id: 'all', label: 'All', count: counts.all ?? initialTotal },
      { id: 'with-open', label: 'With Open Opportunity', count: counts['with-open'] ?? 0 },
      { id: 'without-open', label: 'Without Open Opportunity', count: counts['without-open'] ?? 0 },
    ]
  }, [displayBusinesses, businessHasOpenOpportunity, initialTotal, isSearching, counts])

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

  // Filter and sort businesses (client-side for opportunity filter)
  const filteredBusinesses = useMemo(() => {
    let filtered = displayBusinesses

    // Only apply client-side opportunity filter when searching (server doesn't filter search results by opportunity status)
    if (isSearching) {
      if (opportunityFilter === 'with-open') {
        filtered = filtered.filter(b => businessHasOpenOpportunity.get(b.id))
      } else if (opportunityFilter === 'without-open') {
        filtered = filtered.filter(b => !businessHasOpenOpportunity.get(b.id))
      }
    }

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayBusinesses, opportunityFilter, businessHasOpenOpportunity, isSearching, sortColumn, sortDirection, getSortValue])

  // Prefetch form config when hovering over "New Business" button
  const handleNewBusinessHover = useCallback(() => {
    prefetchFormConfig('business')
  }, [prefetchFormConfig])

  function handleCreateBusiness() {
    setSelectedBusiness(null)
    setBusinessModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
  }
  
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('business')
  }, [prefetchFormConfig])

  async function handleDeleteBusiness(businessId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Business',
      message: 'Are you sure you want to delete this business? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setBusinesses(prev => prev.filter(b => b.id !== businessId))
    if (searchResults) {
      setSearchResults(prev => prev?.filter(b => b.id !== businessId) || null)
    }
    
    const result = await deleteBusiness(businessId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete business')
      loadPage(currentPage)
    } else {
      toast.success('Business deleted successfully')
    }
  }

  function handleCreateOpportunity(business: Business) {
    setSelectedBusinessForOpportunity(business)
    setOpportunityModalOpen(true)
  }

  function handleDownloadCsv() {
    const count = exportBusinessesToCsv(filteredBusinesses)
    toast.success(`Exported ${count} businesses`)
  }

  async function handleUploadPreview(rows: ParsedCsvRow[]): Promise<CsvUploadPreview> {
    return previewBusinessImport(rows, businesses)
  }

  async function handleUploadConfirm(rows: ParsedCsvRow[]): Promise<CsvUploadResult> {
    const result = await confirmBusinessImport(rows)
    if (result.created > 0 || result.updated > 0) {
      loadPage(currentPage)
    }
    return result
  }

  function handleCreateRequest(business: Business) {
    const params = new URLSearchParams()
    params.set('fromOpportunity', 'business')
    params.set('businessName', business.name)
    params.set('businessEmail', business.contactEmail)
    params.set('contactName', business.contactName || '')
    params.set('contactPhone', business.contactPhone || '')
    
    if (business.category) {
      params.set('categoryId', business.category.id)
      params.set('parentCategory', business.category.parentCategory)
      if (business.category.subCategory1) params.set('subCategory1', business.category.subCategory1)
      if (business.category.subCategory2) params.set('subCategory2', business.category.subCategory2)
    }
    
    if (business.razonSocial) params.set('legalName', business.razonSocial)
    if (business.ruc) params.set('ruc', business.ruc)
    if (business.province) params.set('province', business.province)
    if (business.district) params.set('district', business.district)
    if (business.corregimiento) params.set('corregimiento', business.corregimiento)
    if (business.address) params.set('address', business.address)
    if (business.neighborhood) params.set('neighborhood', business.neighborhood)
    if (business.bank) params.set('bank', business.bank)
    if (business.beneficiaryName) params.set('bankAccountName', business.beneficiaryName)
    if (business.accountNumber) params.set('accountNumber', business.accountNumber)
    if (business.accountType) params.set('accountType', business.accountType)
    if (business.paymentPlan) params.set('paymentPlan', business.paymentPlan)
    if (business.description) params.set('description', business.description)
    if (business.website) params.set('website', business.website)
    if (business.instagram) params.set('instagram', business.instagram)
    
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
        onMouseEnter={handleNewBusinessHover}
        size="sm"
        leftIcon={<AddIcon style={{ fontSize: 16 }} sx={{}} />}
      >
        Nuevo Negocio
      </Button>
    </div>
  )

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="businesses"
        searchPlaceholder="Buscar en todos los negocios..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={opportunityFilter}
        onFilterChange={(id) => setOpportunityFilter(id as 'all' | 'with-open' | 'without-open')}
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
            {/* Search indicator from hook */}
            <SearchIndicator />
            
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {filteredBusinesses.map((business, index) => (
                <TableRow
                  key={business.id}
                  index={index}
                  onClick={() => handleEditBusiness(business)}
                  onMouseEnter={handleRowHover}
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
            
            {/* Pagination controls from hook */}
            <PaginationControls />
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
            if (searchResults) {
              setSearchResults(prev => prev?.map(b => b.id === selectedBusiness.id ? newBusiness : b) || null)
            }
          } else {
            setBusinesses(prev => [newBusiness, ...prev])
          }
          if (!isSearching) {
            loadPage(currentPage)
          }
        }}
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
          onSuccess={() => {
            toast.success('Opportunity created successfully')
            setOpportunityModalOpen(false)
            setSelectedBusinessForOpportunity(null)
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
        expectedHeaders={CSV_IMPORT_HEADERS}
        idField="ID"
        onPreview={handleUploadPreview}
        onConfirm={handleUploadConfirm}
      />
    </div>
  )
}
