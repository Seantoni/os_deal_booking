'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { deleteBusiness } from '@/app/actions/crm'
import { getBusinessesPaginated, searchBusinesses, getBusinessCounts, getBusinessTableCounts, getBusinessActiveDealUrls } from '@/app/actions/businesses'
import { getDealsByVendorId, type SimplifiedDeal } from '@/app/actions/deal-metrics'
import type { Business } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import LaunchIcon from '@mui/icons-material/Launch'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
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

const FocusPeriodModal = dynamic(() => import('@/components/crm/business/FocusPeriodModal'), {
  loading: () => null,
  ssr: false,
})

const ReassignmentModal = dynamic(() => import('@/components/crm/business/ReassignmentModal'), {
  loading: () => null,
  ssr: false,
})
import toast from 'react-hot-toast'
import { getActiveFocus, FOCUS_PERIOD_LABELS, type FocusPeriod } from '@/lib/utils/focus-period'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
import { sortEntities } from '@/hooks/useEntityPage'
import { logger } from '@/lib/logger'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  UserFilterDropdown,
  SortableTableHeader,
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { TableRow, TableCell } from '@/components/shared/table'

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
  { key: 'actions', label: '', width: 'w-16' },
]

// Cache for fetched deals per business
interface BusinessDealsCache {
  deals: SimplifiedDeal[]
  totalCount: number
  loading: boolean
}

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
  
  // Get shared/cached data for categories and users
  const { categories, users } = useSharedData()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Advanced filters hook
  const { headerProps: advancedFilterProps, filterRules, applyFiltersToData } = useAdvancedFilters<Business>('businesses')
  
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

  // Lazy-loaded table counts (opportunity counts per business, request counts per business name)
  const [tableCounts, setTableCounts] = useState<{
    openOpportunityCounts: Record<string, number>
    pendingRequestCounts: Record<string, number>
  } | null>(null)
  const [tableCountsLoading, setTableCountsLoading] = useState(true)
  
  // Lazy-loaded active deal URLs (businessId -> dealUrl)
  const [activeDealUrls, setActiveDealUrls] = useState<Record<string, string>>({})
  const [activeDealUrlsLoading, setActiveDealUrlsLoading] = useState(true)
  
  // Expanded businesses state (for showing deals)
  const [expandedBusinesses, setExpandedBusinesses] = useState<Set<string>>(new Set())
  const [businessDealsCache, setBusinessDealsCache] = useState<Map<string, BusinessDealsCache>>(new Map())
  
  // Opportunity filter is now managed by the hook
  const opportunityFilter = (filters.opportunityFilter as 'all' | 'with-open' | 'without-open') || 'all'
  const setOpportunityFilter = useCallback((filter: 'all' | 'with-open' | 'without-open') => {
    updateFilter('opportunityFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])
  
  // Focus filter is also managed by the hook
  const focusFilter = (filters.focusFilter as 'all' | 'with-focus') || 'all'
  const setFocusFilter = useCallback((filter: 'all' | 'with-focus') => {
    updateFilter('focusFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])
  
  // Sales rep filter (admin quick filter)
  const salesRepFilter = (filters.salesRepId as string) || null
  const setSalesRepFilter = useCallback((userId: string | null) => {
    updateFilter('salesRepId', userId || undefined)
  }, [updateFilter])
  
  // Active deal filter (toggle button)
  const activeDealFilter = (filters.activeDealFilter as boolean) || false
  const setActiveDealFilter = useCallback((enabled: boolean) => {
    if (enabled) {
      // Clear other filters when enabling active deal filter
      updateFilter('activeDealFilter', true)
      updateFilter('opportunityFilter', undefined)
      updateFilter('focusFilter', undefined)
    } else {
      updateFilter('activeDealFilter', undefined)
    }
  }, [updateFilter])
  
  // Modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedBusinessForOpportunity, setSelectedBusinessForOpportunity] = useState<Business | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [focusModalOpen, setFocusModalOpen] = useState(false)
  const [selectedBusinessForFocus, setSelectedBusinessForFocus] = useState<Business | null>(null)
  const [reassignmentModalOpen, setReassignmentModalOpen] = useState(false)
  const [selectedBusinessForReassignment, setSelectedBusinessForReassignment] = useState<Business | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null) // Track which row has open menu
  
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

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuOpen && !(event.target as Element).closest('.relative')) {
        setActionMenuOpen(null)
      }
    }
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [actionMenuOpen])

  // Lazy load table counts (opportunity and request counts per business)
  // This runs on mount and is much faster than loading all opportunities/requests
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

  // Lazy load active deal URLs
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

  // Map of business IDs to count of open opportunities (from lazy-loaded counts)
  const businessOpenOpportunityCount = useMemo(() => {
    const map = new Map<string, number>()
    if (tableCounts?.openOpportunityCounts) {
      Object.entries(tableCounts.openOpportunityCounts).forEach(([businessId, count]) => {
        map.set(businessId, count)
      })
    }
    return map
  }, [tableCounts])

  // Map of business names to count of pending requests (from lazy-loaded counts)
  const businessPendingRequestCount = useMemo(() => {
    const map = new Map<string, number>()
    if (tableCounts?.pendingRequestCounts) {
      Object.entries(tableCounts.pendingRequestCounts).forEach(([merchantLower, count]) => {
        map.set(merchantLower, count)
      })
    }
    return map
  }, [tableCounts])

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
    // When searching, use client-side counts
    if (isSearching) {
      const baseBusinesses = displayBusinesses
      return [
        { id: 'all', label: 'All', count: baseBusinesses.length },
        { id: 'with-focus', label: 'Con Foco', count: baseBusinesses.filter(b => businessActiveFocus.has(b.id)).length },
        { id: 'with-open', label: 'With Open Opportunity', count: baseBusinesses.filter(b => businessHasOpenOpportunity.get(b.id)).length },
        { id: 'without-open', label: 'Without Open Opportunity', count: baseBusinesses.filter(b => !businessHasOpenOpportunity.get(b.id)).length },
      ]
    }
    
    // Use server-side counts
    return [
      { id: 'all', label: 'All', count: counts.all ?? initialTotal },
      { id: 'with-focus', label: 'Con Foco', count: counts['with-focus'] ?? 0 },
      { id: 'with-open', label: 'With Open Opportunity', count: counts['with-open'] ?? 0 },
      { id: 'without-open', label: 'Without Open Opportunity', count: counts['without-open'] ?? 0 },
    ]
  }, [displayBusinesses, businessHasOpenOpportunity, businessActiveFocus, initialTotal, isSearching, counts])

  // Get sort value for a business (now uses denormalized columns directly)
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

  // Filter and sort businesses (client-side for filters when searching)
  const filteredBusinesses = useMemo(() => {
    let filtered = displayBusinesses

    // Only apply client-side filters when searching (server doesn't filter search results)
    if (isSearching) {
      // Apply opportunity filter
      if (opportunityFilter === 'with-open') {
        filtered = filtered.filter(b => businessHasOpenOpportunity.get(b.id))
      } else if (opportunityFilter === 'without-open') {
        filtered = filtered.filter(b => !businessHasOpenOpportunity.get(b.id))
      }
      
      // Apply focus filter
      if (focusFilter === 'with-focus') {
        filtered = filtered.filter(b => businessActiveFocus.has(b.id))
      }
    }

    // Apply advanced filters (always, both for paginated and search results)
    filtered = applyFiltersToData(filtered)

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayBusinesses, opportunityFilter, focusFilter, businessHasOpenOpportunity, businessActiveFocus, isSearching, sortColumn, sortDirection, getSortValue, applyFiltersToData])

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

  function handleSetFocus(business: Business) {
    setSelectedBusinessForFocus(business)
    setFocusModalOpen(true)
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

  // Toggle expand/collapse for a business to show its deals
  const toggleExpandBusiness = useCallback(async (business: Business) => {
    const businessId = business.id
    const newExpanded = new Set(expandedBusinesses)
    
    if (newExpanded.has(businessId)) {
      // Collapse
      newExpanded.delete(businessId)
      setExpandedBusinesses(newExpanded)
    } else {
      // Expand - fetch deals if not cached
      newExpanded.add(businessId)
      setExpandedBusinesses(newExpanded)
      
      // Check if already cached
      if (!businessDealsCache.has(businessId) && business.osAdminVendorId) {
        // Set loading state
        setBusinessDealsCache(prev => new Map(prev).set(businessId, { deals: [], totalCount: 0, loading: true }))
        
        // Fetch deals using vendor ID
        const result = await getDealsByVendorId(business.osAdminVendorId, 10)
        
        if (result.success && result.data) {
          setBusinessDealsCache(prev => new Map(prev).set(businessId, {
            deals: result.data!,
            totalCount: result.totalCount ?? 0,
            loading: false,
          }))
        } else {
          setBusinessDealsCache(prev => new Map(prev).set(businessId, { deals: [], totalCount: 0, loading: false }))
          toast.error('Error al cargar deals')
        }
      }
    }
  }, [expandedBusinesses, businessDealsCache])

  // User filter dropdown options (from users in shared data)
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
      value={salesRepFilter}
      onChange={setSalesRepFilter}
      label="Owner"
      placeholder="Todos"
    />
  ) : undefined

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
        activeFilter={focusFilter === 'with-focus' ? 'with-focus' : opportunityFilter}
        onFilterChange={(id) => {
          // Clear active deal filter when other filters are selected
          if (activeDealFilter) {
            setActiveDealFilter(false)
          }
          
          if (id === 'with-focus') {
            setFocusFilter('with-focus')
            setOpportunityFilter('all') // Clear opportunity filter when focus filter is active
          } else {
            setFocusFilter('all') // Clear focus filter when opportunity filter is selected
            setOpportunityFilter(id as 'all' | 'with-open' | 'without-open')
          }
        }}
        isAdmin={isAdmin}
        userFilter={userFilter}
        beforeFilters={activeDealToggle}
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
            {/* Search indicator from hook */}
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
                  {filteredBusinesses.map((business, index) => {
                    const activeFocus = businessActiveFocus.get(business.id)
                    const isExpanded = expandedBusinesses.has(business.id)
                    const cachedData = businessDealsCache.get(business.id)
                    const isLoadingDeals = cachedData?.loading ?? false
                    const deals = cachedData?.deals ?? []
                    const totalCount = cachedData?.totalCount ?? 0
                    const remainingDeals = totalCount - deals.length
                    const hasDeals = (business.totalDeals360d ?? 0) > 0

                    return (
                      <>
                        {/* Business Row */}
                        <TableRow
                          key={business.id}
                          index={index}
                          onClick={() => handleEditBusiness(business)}
                          onMouseEnter={handleRowHover}
                          className={activeFocus ? 'bg-amber-50/50 hover:bg-amber-50' : undefined}
                        >
                          {/* Expand/Collapse Button */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => toggleExpandBusiness(business)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              disabled={!hasDeals || !business.osAdminVendorId}
                            >
                              {isExpanded ? (
                                <ExpandMoreIcon style={{ fontSize: 20 }} />
                              ) : (
                                <ChevronRightIcon style={{ fontSize: 20 }} className={!hasDeals || !business.osAdminVendorId ? 'opacity-30' : ''} />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-[13px]">
                                {business.name}
                              </span>
                              {activeFocus && (
                                <span 
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium"
                                  title={`Foco: ${FOCUS_PERIOD_LABELS[activeFocus]}`}
                                >
                                  <CenterFocusStrongIcon style={{ fontSize: 12 }} />
                                  {FOCUS_PERIOD_LABELS[activeFocus].charAt(0)}
                                </span>
                              )}
                            </div>
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
                          {/* Deal Metrics Columns (denormalized on Business) */}
                          {/* Top Vendido */}
                          <TableCell align="right">
                            {business.topSoldQuantity ? (
                              business.topSoldDealUrl ? (
                                <a
                                  href={business.topSoldDealUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                                >
                                  {business.topSoldQuantity.toLocaleString()}
                                </a>
                              ) : (
                                <span className="text-xs font-medium text-gray-700">
                                  {business.topSoldQuantity.toLocaleString()}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          {/* Top Ingresos */}
                          <TableCell align="right">
                            {business.topRevenueAmount ? (
                              business.topRevenueDealUrl ? (
                                <a
                                  href={business.topRevenueDealUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  ${Number(business.topRevenueAmount).toLocaleString()}
                                </a>
                              ) : (
                                <span className="text-xs font-medium text-gray-700">
                                  ${Number(business.topRevenueAmount).toLocaleString()}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          {/* Último Lanzamiento */}
                          <TableCell align="center">
                            {business.lastLaunchDate ? (
                              <span 
                                className="text-xs text-slate-600"
                                title={new Date(business.lastLaunchDate).toLocaleDateString()}
                              >
                                {Math.floor((Date.now() - new Date(business.lastLaunchDate).getTime()) / (1000 * 60 * 60 * 24))}d
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          {/* Deals (360d) */}
                          <TableCell align="center">
                            {business.totalDeals360d ? (
                              <span className="text-xs font-medium text-gray-700">
                                {business.totalDeals360d}
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
                              {/* Active Deal Link - only show if business has active deal */}
                              {activeDealUrls[business.id] && (
                                <a
                                  href={activeDealUrls[business.id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                                  title="Ver Deal Activo"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <LaunchIcon style={{ fontSize: 18 }} />
                                </a>
                              )}
                              <button
                                onClick={() => handleSetFocus(business)}
                                className={`p-1.5 rounded transition-colors ${
                                  activeFocus 
                                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                                    : 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                                }`}
                                title={activeFocus ? `Foco: ${FOCUS_PERIOD_LABELS[activeFocus]}` : 'Establecer Foco'}
                              >
                                <CenterFocusStrongIcon style={{ fontSize: 18 }} />
                              </button>
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
                              {/* Action Menu (Acción) */}
                              <div className="relative">
                                <button
                                  onClick={() => setActionMenuOpen(actionMenuOpen === business.id ? null : business.id)}
                                  className="p-1.5 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
                                  title="Acción"
                                >
                                  <MoreVertIcon style={{ fontSize: 18 }} />
                                </button>
                                {actionMenuOpen === business.id && (
                                  <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                                    <button
                                      onClick={() => {
                                        setSelectedBusinessForReassignment(business)
                                        setReassignmentModalOpen(true)
                                        setActionMenuOpen(null)
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                    >
                                      Reasignar / Sacar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Deals Rows */}
                        {isExpanded && (
                          <>
                            {isLoadingDeals ? (
                              <tr className="bg-slate-50/50">
                                <td colSpan={13} className="px-4 py-3">
                                  <div className="flex items-center gap-2 text-sm text-gray-500 pl-8">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    Cargando deals...
                                  </div>
                                </td>
                              </tr>
                            ) : deals.length === 0 ? (
                              <tr className="bg-slate-50/50">
                                <td colSpan={13} className="px-4 py-3">
                                  <div className="text-sm text-gray-500 pl-8">
                                    No hay deals para este negocio
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <>
                                {/* Deals Header */}
                                <tr className="bg-slate-50 border-t border-slate-200">
                                  <td></td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Deal ID</td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right" colSpan={2}>Vendidos</td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right" colSpan={2}>Ing. Neto</td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500" colSpan={2}>Fechas</td>
                                  <td colSpan={5}></td>
                                </tr>
                                
                                {/* Deal Rows */}
                                {deals.map((deal, dealIndex) => (
                                  <tr
                                    key={deal.id}
                                    className={`bg-slate-50/50 ${dealIndex < deals.length - 1 ? 'border-b border-slate-100' : ''}`}
                                  >
                                    <td className="pl-4 pr-2 py-2">
                                      <span className="text-slate-300">├─</span>
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className="text-[12px] font-medium text-slate-700">{deal.externalDealId}</span>
                                      <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                        deal.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        {deal.isActive ? 'Activo' : 'Fin'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right" colSpan={2}>
                                      <span className="text-[12px] font-medium text-slate-700">{deal.quantitySold.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right" colSpan={2}>
                                      <span className="text-[12px] font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2" colSpan={2}>
                                      <span className="text-[11px] text-slate-500">
                                        {deal.runAt ? new Date(deal.runAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                                        {' → '}
                                        {deal.endAt ? new Date(deal.endAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right" colSpan={5}>
                                      {deal.dealUrl && (
                                        <a
                                          href={deal.dealUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex"
                                          title="Ver oferta"
                                        >
                                          <OpenInNewIcon style={{ fontSize: 16 }} />
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}

                                {/* "View more" link if there are remaining deals */}
                                {remainingDeals > 0 && (
                                  <tr className="bg-slate-50/50 border-t border-slate-100">
                                    <td className="pl-4 pr-2 py-2">
                                      <span className="text-slate-300">└─</span>
                                    </td>
                                    <td colSpan={12} className="px-4 py-2">
                                      <button
                                        onClick={() => router.push(`/businesses/${business.id}?tab=metrics`)}
                                        className="text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
                                      >
                                        Ver los {remainingDeals} deals restantes →
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
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
            // Refresh table counts (much faster than loading all opportunities)
            getBusinessTableCounts().then(result => {
              if (result.success && result.data) {
                setTableCounts(result.data)
              }
            })
          }}
          preloadedBusinesses={businesses}
          preloadedCategories={categories}
          preloadedUsers={users}
        />
      )}

      {/* Focus Period Modal */}
      {focusModalOpen && selectedBusinessForFocus && (
        <FocusPeriodModal
          isOpen={focusModalOpen}
          onClose={() => {
            setFocusModalOpen(false)
            setSelectedBusinessForFocus(null)
          }}
          businessId={selectedBusinessForFocus.id}
          businessName={selectedBusinessForFocus.name}
          currentFocusPeriod={selectedBusinessForFocus.focusPeriod}
          currentFocusSetAt={selectedBusinessForFocus.focusSetAt}
          onSuccess={(updatedFocus) => {
            // Update the business in state
            const businessId = selectedBusinessForFocus.id
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
            setFocusModalOpen(false)
            setSelectedBusinessForFocus(null)
          }}
        />
      )}

      {/* Reassignment Modal */}
      {reassignmentModalOpen && selectedBusinessForReassignment && (
        <ReassignmentModal
          isOpen={reassignmentModalOpen}
          onClose={() => {
            setReassignmentModalOpen(false)
            setSelectedBusinessForReassignment(null)
          }}
          businessId={selectedBusinessForReassignment.id}
          businessName={selectedBusinessForReassignment.name}
          onSuccess={() => {
            // Business will be filtered out since it now has reassignmentStatus
            // Reload to reflect the change
            if (!isSearching) {
              loadPage(currentPage)
            }
          }}
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
