'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { deleteBusiness } from '@/app/actions/crm'
import { getBusinessesPaginated, searchBusinesses, getBusinessCounts, getBusinessTableCounts, fetchEditableBusinessIds } from '@/app/actions/businesses'
import type { Business } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import StorefrontIcon from '@mui/icons-material/Storefront'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import type { ParsedCsvRow } from '@/lib/utils/csv-export'
import CsvUploadModal, { type CsvUploadPreview, type CsvUploadResult } from '@/components/common/CsvUploadModal'
import { exportBusinessesToCsv } from './csv-export'
import { CSV_IMPORT_HEADERS, previewBusinessImport, confirmBusinessImport } from './csv-import'
import toast from 'react-hot-toast'
import { getActiveFocus, type FocusPeriod } from '@/lib/utils/focus-period'
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
  UserFilterDropdown,
  SortableTableHeader,
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'

// Local hooks and components
import { useBusinessTableCounts, useBusinessPageState } from './hooks'
import { BusinessTableRow, DealsTab } from './components'

// Tab type
type PageTab = 'businesses' | 'deals'

// Lazy load heavy modal components
const BusinessFormModal = dynamic(() => import('@/components/crm/business/BusinessFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => null,
  ssr: false,
})

const FocusPeriodModal = dynamic(() => import('@/components/crm/business/FocusPeriodModal'), {
  loading: () => null,
  ssr: false,
})

const ReassignmentModal = dynamic(() => import('@/components/crm/business/ReassignmentModal'), {
  loading: () => null,
  ssr: false,
})

const AssignCampaignModal = dynamic(() => import('@/components/crm/business/AssignCampaignModal'), {
  loading: () => null,
  ssr: false,
})

// Actions column header with grouped labels - matches button layout
// Button sizes: 30px each (18px icon + 12px padding), gap-1 = 4px, divider mx-1 = 8px
const ActionsColumnHeader = () => (
  <div className="flex items-center justify-end text-[10px] font-medium normal-case tracking-normal">
    {/* Admin group: Focus, Campaign, Reassignment - 3 buttons + 2 gaps = 98px */}
    <div className="flex items-center justify-center text-amber-600" style={{ width: '98px' }}>
      <span>Admin</span>
    </div>
    {/* Divider space */}
    <div style={{ width: '10px' }} />
    {/* Crear group: Opportunity, Request - 2 buttons + 1 gap = 64px */}
    <div className="flex items-center justify-center text-blue-600" style={{ width: '64px' }}>
      <span>Crear</span>
    </div>
    {/* Divider space */}
    <div style={{ width: '10px' }} />
    {/* Ver group: Open Full Page - 1 button = 30px */}
    <div className="flex items-center justify-center text-slate-600" style={{ width: '30px' }}>
      <span>Ver</span>
    </div>
  </div>
)

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'expand', label: '', width: 'w-4' },
  { key: 'name', label: 'Nombre del Negocio', sortable: true },
  { key: 'category', label: 'Categoría', sortable: true },
  { key: 'topSold', label: 'Top #', sortable: true, align: 'right' },
  { key: 'topRevenue', label: 'Top $', sortable: true, align: 'right' },
  { key: 'lastLaunch', label: 'Lanz.', sortable: true, align: 'center' },
  { key: 'deals360d', label: '#Deals', sortable: true, align: 'center' },
  { key: 'openOpps', label: 'Opps', sortable: true, align: 'center', width: 'w-14' },
  { key: 'pendingReqs', label: 'Solic.', sortable: true, align: 'center', width: 'w-14' },
  { key: 'actions', label: <ActionsColumnHeader />, align: 'right' },
]

interface BusinessesPageClientProps {
  initialBusinesses?: Business[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export default function BusinessesPageClient({
  initialBusinesses,
  initialTotal = 0,
  initialCounts,
}: BusinessesPageClientProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'
  const confirmDialog = useConfirmDialog()
  
  // Track which businesses the current user can edit
  // null = can edit all (admin/editor), string[] = specific IDs
  const [editableBusinessIds, setEditableBusinessIds] = useState<string[] | null>(null)
  const editableIdsLoadedRef = useRef(false)
  
  // Fetch editable business IDs on mount
  useEffect(() => {
    if (editableIdsLoadedRef.current) return
    editableIdsLoadedRef.current = true
    
    fetchEditableBusinessIds().then(result => {
      if (result.success) {
        setEditableBusinessIds(result.data ?? null)
      }
    })
  }, [])
  
  // Helper to check if user can edit a specific business
  const canEditBusiness = useCallback((businessId: string): boolean => {
    // null means can edit all (admin/editor)
    if (editableBusinessIds === null) return true
    return editableBusinessIds.includes(businessId)
  }, [editableBusinessIds])
  
  // Shared data for categories and users
  const { categories, users } = useSharedData()
  
  // Form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Advanced filters
  const { headerProps: advancedFilterProps, filterRules, applyFiltersToData } = useAdvancedFilters<Business>('businesses')
  
  // Table counts (lazy-loaded opportunity/request counts, deal URLs, campaign counts)
  const {
    businessOpenOpportunityCount,
    businessPendingRequestCount,
    businessHasOpenOpportunity,
    businessCampaignCounts,
    activeDealUrls,
    refreshTableCounts,
    refreshCampaignCounts,
  } = useBusinessTableCounts({ isAdmin })
  
  // Page state (modals, expanded rows, action menus)
  const pageState = useBusinessPageState()
  
  // Paginated search hook
  const {
    data: businesses,
    setData: setBusinesses,
    searchResults,
    setSearchResults,
    loading,
    searchLoading,
    error: loadError,
    searchQuery,
    handleSearchChange,
    isSearching,
    currentPage,
    sortColumn,
    sortDirection,
    handleSort,
    loadPage,
    reload,
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

  // Filter state (managed by paginated search hook)
  const opportunityFilter = (filters.opportunityFilter as 'all' | 'with-open' | 'without-open') || 'all'
  const setOpportunityFilter = useCallback((filter: 'all' | 'with-open' | 'without-open') => {
    updateFilter('opportunityFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])
  
  const focusFilter = (filters.focusFilter as 'all' | 'with-focus') || 'all'
  const setFocusFilter = useCallback((filter: 'all' | 'with-focus') => {
    updateFilter('focusFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])
  
  const ownerFilter = (filters.ownerId as string) || null
  const setOwnerFilter = useCallback((userId: string | null) => {
    updateFilter('ownerId', userId || undefined)
  }, [updateFilter])
  
  const activeDealFilter = (filters.activeDealFilter as boolean) || false
  const setActiveDealFilter = useCallback((enabled: boolean) => {
    if (enabled) {
      updateFilter('activeDealFilter', true)
      updateFilter('opportunityFilter', undefined)
      updateFilter('focusFilter', undefined)
    } else {
      updateFilter('activeDealFilter', undefined)
    }
  }, [updateFilter])
  
  // "My Businesses Only" filter - for sales users to filter to their assigned businesses
  // Server defaults to TRUE for sales users, so undefined means "my businesses"
  // Only when explicitly set to false will it show all businesses
  const isSalesUser = userRole === 'sales'
  const myBusinessesOnly = isSalesUser 
    ? (filters.myBusinessesOnly !== false) // Default true for sales, false only when explicitly set
    : false
  const setMyBusinessesOnly = useCallback((enabled: boolean) => {
    // For sales users: true = show my businesses (default), false = show all
    updateFilter('myBusinessesOnly', enabled ? undefined : false)
  }, [updateFilter])

  // Handle opening business from URL query params or sessionStorage
  useEffect(() => {
    const openBusinessId = sessionStorage.getItem('openBusinessId')
    if (openBusinessId) {
      sessionStorage.removeItem('openBusinessId')
      const allBusinesses = searchResults || businesses
      if (allBusinesses.length > 0) {
        const business = allBusinesses.find(b => b.id === openBusinessId)
        if (business) {
          pageState.openBusinessModal(business)
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
          pageState.openBusinessModal(business)
        }
      }
    }
  }, [searchParams, businesses, searchResults, pageState])

  // Determine which businesses to display
  const displayBusinesses = searchResults !== null ? searchResults : businesses

  // Helper to check if business has active focus
  const businessActiveFocus = useMemo(() => {
    const map = new Map<string, FocusPeriod>()
    displayBusinesses.forEach(business => {
      const activeFocus = getActiveFocus(business)
      if (activeFocus) {
        map.set(business.id, activeFocus)
      }
    })
    return map
  }, [displayBusinesses])

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    if (isSearching) {
      const baseBusinesses = displayBusinesses
      return [
        { id: 'all', label: 'All', count: baseBusinesses.length },
        { id: 'with-focus', label: 'Con Foco', count: baseBusinesses.filter(b => businessActiveFocus.has(b.id)).length },
        { id: 'with-open', label: 'With Open Opportunity', count: baseBusinesses.filter(b => businessHasOpenOpportunity.get(b.id)).length },
        { id: 'without-open', label: 'Without Open Opportunity', count: baseBusinesses.filter(b => !businessHasOpenOpportunity.get(b.id)).length },
      ]
    }
    
    return [
      { id: 'all', label: 'All', count: counts.all ?? initialTotal },
      { id: 'with-focus', label: 'Con Foco', count: counts['with-focus'] ?? 0 },
      { id: 'with-open', label: 'With Open Opportunity', count: counts['with-open'] ?? 0 },
      { id: 'without-open', label: 'Without Open Opportunity', count: counts['without-open'] ?? 0 },
    ]
  }, [displayBusinesses, businessHasOpenOpportunity, businessActiveFocus, initialTotal, isSearching, counts])

  // Get sort value for a business
  const getSortValue = useCallback((business: Business, column: string): string | number | null => {
    switch (column) {
      case 'name':
        return business.name.toLowerCase()
      case 'category':
        return (business.category?.parentCategory || '').toLowerCase()
      case 'topSold':
        return business.topSoldQuantity ?? 0
      case 'topRevenue':
        return business.topRevenueAmount ? Number(business.topRevenueAmount) : 0
      case 'lastLaunch':
        return business.lastLaunchDate ? new Date(business.lastLaunchDate).getTime() : 0
      case 'deals360d':
        return business.totalDeals360d ?? 0
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
    let filtered = displayBusinesses

    if (isSearching) {
      if (opportunityFilter === 'with-open') {
        filtered = filtered.filter(b => businessHasOpenOpportunity.get(b.id))
      } else if (opportunityFilter === 'without-open') {
        filtered = filtered.filter(b => !businessHasOpenOpportunity.get(b.id))
      }
      
      if (focusFilter === 'with-focus') {
        filtered = filtered.filter(b => businessActiveFocus.has(b.id))
      }
    }

    filtered = applyFiltersToData(filtered)

    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayBusinesses, opportunityFilter, focusFilter, businessHasOpenOpportunity, businessActiveFocus, isSearching, sortColumn, sortDirection, getSortValue, applyFiltersToData])

  // Prefetch handlers
  const handleNewBusinessHover = useCallback(() => {
    prefetchFormConfig('business')
  }, [prefetchFormConfig])

  const handleRowHover = useCallback(() => {
    prefetchFormConfig('business')
  }, [prefetchFormConfig])

  // Business CRUD handlers
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

  // Create request (navigates to booking request form)
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
    if (business.provinceDistrictCorregimiento) params.set('provinceDistrictCorregimiento', business.provinceDistrictCorregimiento)
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

  // CSV handlers
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

  // User filter dropdown options
  const userFilterOptions = useMemo(() => {
    return users.map(user => ({
      id: user.clerkId,
      name: user.name || user.email || user.clerkId,
      email: user.email,
    }))
  }, [users])

  // User filter dropdown (admin only)
  const userFilter = isAdmin ? (
    <UserFilterDropdown
      users={userFilterOptions}
      value={ownerFilter}
      onChange={setOwnerFilter}
      label="Owner"
      placeholder="Todos"
    />
  ) : undefined

  // "My Businesses Only" toggle button (for sales users)
  const myBusinessesToggle = isSalesUser ? (
    <Button
      onClick={() => setMyBusinessesOnly(!myBusinessesOnly)}
      variant={myBusinessesOnly ? "primary" : "secondary"}
      size="sm"
      className="flex-shrink-0"
    >
      Mis Negocios
    </Button>
  ) : null
  
  // Active deal toggle button
  const activeDealToggle = (
    <Button
      onClick={() => setActiveDealFilter(!activeDealFilter)}
      variant={activeDealFilter ? "primary" : "secondary"}
      size="sm"
      className="flex-shrink-0"
    >
      Deal Activo {counts['with-active-deal'] !== undefined && `(${counts['with-active-deal']})`}
    </Button>
  )

  // Header right content
  const headerRightContent = (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <>
          <Button
            onClick={pageState.openUploadModal}
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
        onClick={() => pageState.openBusinessModal(null)}
        onMouseEnter={handleNewBusinessHover}
        size="sm"
        leftIcon={<AddIcon style={{ fontSize: 16 }} sx={{}} />}
      >
        Nuevo Negocio
      </Button>
    </div>
  )

  const isLoading = loading || searchLoading

  // Tab state
  const [activeTab, setActiveTab] = useState<PageTab>(() => {
    // Check URL for initial tab
    const tabParam = searchParams.get('tab')
    return tabParam === 'deals' ? 'deals' : 'businesses'
  })

  // Update URL when tab changes
  const handleTabChange = useCallback((tab: PageTab) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'businesses') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    router.replace(`/businesses${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [router, searchParams])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Main Page Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 pt-3">
        <div className="flex gap-1">
          <button
            onClick={() => handleTabChange('businesses')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'businesses'
                ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <StorefrontIcon style={{ fontSize: 18 }} />
            Negocios
          </button>
          <button
            onClick={() => handleTabChange('deals')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
              activeTab === 'deals'
                ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TrendingUpIcon style={{ fontSize: 18 }} />
            Deals
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'deals' ? (
        <DealsTab />
      ) : (
        <>
          {/* Header with Search and Filters */}
          <EntityPageHeader
            entityType="businesses"
            searchPlaceholder="Buscar en todos los negocios..."
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            filterTabs={filterTabs}
            activeFilter={focusFilter === 'with-focus' ? 'with-focus' : opportunityFilter}
            onFilterChange={(id) => {
              if (activeDealFilter) {
                setActiveDealFilter(false)
              }
              
              if (id === 'with-focus') {
                setFocusFilter('with-focus')
                setOpportunityFilter('all')
              } else {
                setFocusFilter('all')
                setOpportunityFilter(id as 'all' | 'with-open' | 'without-open')
              }
            }}
            isAdmin={isAdmin}
            userFilter={userFilter}
            beforeFilters={
              <div className="flex items-center gap-2">
                {myBusinessesToggle}
                {activeDealToggle}
              </div>
            }
            rightContent={headerRightContent}
            {...advancedFilterProps}
          />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loadError ? (
          <div className="p-6 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error al cargar negocios</h3>
                <p className="text-sm text-red-600 mt-1">{loadError}</p>
                <button
                  onClick={() => reload()}
                  className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron negocios"
            description={
              searchQuery || opportunityFilter !== 'all' || focusFilter !== 'all' || activeDealFilter || filterRules.length > 0
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Comience creando un nuevo negocio'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <SearchIndicator />
            
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full text-[13px] text-left">
                <SortableTableHeader
                  columns={COLUMNS}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <tbody className="divide-y divide-slate-100">
                  {filteredBusinesses.map((business, index) => (
                    <BusinessTableRow
                      key={business.id}
                      business={business}
                      index={index}
                      activeFocus={businessActiveFocus.get(business.id)}
                      isExpanded={pageState.isBusinessExpanded(business.id)}
                      cachedDeals={pageState.getBusinessDeals(business.id)}
                      activeDealUrl={activeDealUrls[business.id]}
                      openOpportunityCount={businessOpenOpportunityCount.get(business.id) || 0}
                      pendingRequestCount={businessPendingRequestCount.get(business.name.toLowerCase()) || 0}
                      campaignCount={businessCampaignCounts[business.id] || 0}
                      isAdmin={isAdmin}
                      canEdit={canEditBusiness(business.id)}
                      onRowClick={(b) => pageState.openBusinessModal(b)}
                      onRowHover={handleRowHover}
                      onToggleExpand={pageState.toggleExpandBusiness}
                      onSetFocus={pageState.openFocusModal}
                      onCreateOpportunity={pageState.openOpportunityModal}
                      onCreateRequest={handleCreateRequest}
                      onOpenCampaignModal={pageState.openCampaignModal}
                      onOpenReassignmentModal={pageState.openReassignmentModal}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            <PaginationControls />
          </div>
        )}
      </div>
        </>
      )}

      {/* Business Form Modal */}
      <BusinessFormModal
        isOpen={pageState.businessModalOpen}
        onClose={pageState.closeBusinessModal}
        business={pageState.selectedBusiness}
        onSuccess={(newBusiness) => {
          if (pageState.selectedBusiness) {
            setBusinesses(prev => prev.map(b => b.id === pageState.selectedBusiness!.id ? newBusiness : b))
            if (searchResults) {
              setSearchResults(prev => prev?.map(b => b.id === pageState.selectedBusiness!.id ? newBusiness : b) || null)
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
        canEdit={pageState.selectedBusiness ? canEditBusiness(pageState.selectedBusiness.id) : true}
      />

      {/* Opportunity Modal */}
      {pageState.opportunityModalOpen && pageState.selectedBusinessForOpportunity && (
        <OpportunityFormModal
          isOpen={pageState.opportunityModalOpen}
          onClose={pageState.closeOpportunityModal}
          opportunity={null}
          initialBusinessId={pageState.selectedBusinessForOpportunity.id}
          onSuccess={() => {
            toast.success('Opportunity created successfully')
            pageState.closeOpportunityModal()
            refreshTableCounts()
          }}
          preloadedBusinesses={businesses}
          preloadedCategories={categories}
          preloadedUsers={users}
        />
      )}

      {/* Focus Period Modal */}
      {pageState.focusModalOpen && pageState.selectedBusinessForFocus && (
        <FocusPeriodModal
          isOpen={pageState.focusModalOpen}
          onClose={pageState.closeFocusModal}
          businessId={pageState.selectedBusinessForFocus.id}
          businessName={pageState.selectedBusinessForFocus.name}
          currentFocusPeriod={pageState.selectedBusinessForFocus.focusPeriod}
          currentFocusSetAt={pageState.selectedBusinessForFocus.focusSetAt}
          onSuccess={(updatedFocus) => {
            const businessId = pageState.selectedBusinessForFocus!.id
            setBusinesses(prev => prev.map(b => 
              b.id === businessId 
                ? { ...b, focusPeriod: updatedFocus, focusSetAt: updatedFocus ? new Date().toISOString() : null }
                : b
            ))
            if (searchResults) {
              setSearchResults(prev => prev?.map(b => 
                b.id === businessId 
                  ? { ...b, focusPeriod: updatedFocus, focusSetAt: updatedFocus ? new Date().toISOString() : null }
                  : b
              ) || null)
            }
            pageState.closeFocusModal()
          }}
        />
      )}

      {/* Reassignment Modal */}
      {pageState.reassignmentModalOpen && pageState.selectedBusinessForReassignment && (
        <ReassignmentModal
          isOpen={pageState.reassignmentModalOpen}
          onClose={pageState.closeReassignmentModal}
          businessId={pageState.selectedBusinessForReassignment.id}
          businessName={pageState.selectedBusinessForReassignment.name}
          onSuccess={() => {
            if (!isSearching) {
              loadPage(currentPage)
            }
          }}
        />
      )}

      {/* Campaign Assignment Modal */}
      {pageState.campaignModalOpen && pageState.selectedBusinessForCampaign && (
        <AssignCampaignModal
          isOpen={pageState.campaignModalOpen}
          onClose={pageState.closeCampaignModal}
          businessId={pageState.selectedBusinessForCampaign.id}
          businessName={pageState.selectedBusinessForCampaign.name}
          onSuccess={refreshCampaignCounts}
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
        isOpen={pageState.uploadModalOpen}
        onClose={pageState.closeUploadModal}
        entityName="Negocios"
        expectedHeaders={CSV_IMPORT_HEADERS}
        idField="ID"
        onPreview={handleUploadPreview}
        onConfirm={handleUploadConfirm}
      />
    </div>
  )
}
