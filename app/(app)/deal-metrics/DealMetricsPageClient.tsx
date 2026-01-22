'use client'

import { useMemo, useCallback, useState, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SyncIcon from '@mui/icons-material/Sync'
import FilterListIcon from '@mui/icons-material/FilterList'
import StoreIcon from '@mui/icons-material/Store'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import Link from 'next/link'
import {
  getConsolidatedBusinessMetricsPaginated,
  searchConsolidatedBusinessMetrics,
  getDealsByVendorId,
  type ConsolidatedBusinessMetric,
  type SimplifiedDeal,
} from '@/app/actions/deal-metrics'
import { getBusiness } from '@/app/actions/businesses'
import {
  EntityPageHeader,
  EmptyTableState,
  SortableTableHeader,
  type ColumnConfig,
} from '@/components/shared'
import { Button, Dropdown } from '@/components/ui'
import { TableRow, TableCell } from '@/components/shared/table'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useUserRole } from '@/hooks/useUserRole'
import { sortEntities } from '@/hooks/useEntityPage'
import toast from 'react-hot-toast'
import type { Business } from '@/types'

// Lazy load BusinessFormModal
const BusinessFormModal = lazy(() => import('@/components/crm/business/BusinessFormModal'))

// Business Table columns configuration
const BUSINESS_COLUMNS: ColumnConfig[] = [
  { key: 'expand', label: '', width: 'w-10' },
  { key: 'businessName', label: 'Negocio', sortable: true },
  { key: 'topSold', label: 'Top Vendidos', sortable: true, align: 'right' },
  { key: 'topRevenue', label: 'Top Ingresos', sortable: true, align: 'right' },
  { key: 'lastLaunchDate', label: 'Último Lanzamiento', sortable: true },
  { key: 'totalDeals360d', label: 'Deals (360d)', sortable: true, align: 'center' },
  { key: 'actions', label: '', width: 'w-16' },
]

interface Owner {
  id: string
  name: string
  businessCount: number
}

interface DealMetricsPageClientProps {
  initialBusinessMetrics: ConsolidatedBusinessMetric[]
  initialTotal: number
  owners: Owner[]
}

// Cache for fetched deals
interface VendorDealsCache {
  deals: SimplifiedDeal[]
  totalCount: number
  loading: boolean
}

export default function DealMetricsPageClient({
  initialBusinessMetrics,
  initialTotal,
  owners,
}: DealMetricsPageClientProps) {
  const router = useRouter()
  const { user } = useUser()
  const { isAdmin } = useUserRole()

  // Owner filter state
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)

  // BusinessFormModal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null)

  // Expanded vendors state
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set())
  const [vendorDealsCache, setVendorDealsCache] = useState<Map<string, VendorDealsCache>>(new Map())

  // Paginated search hook for business metrics
  const fetchBusinessesPaginated = useCallback(async (options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
  }) => {
    const result = await getConsolidatedBusinessMetricsPaginated({
      page: options.page ?? 0,
      pageSize: options.pageSize ?? 50,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      ownerId: selectedOwnerId ?? undefined,
    })
    return { success: true as const, data: result.data, total: result.total }
  }, [selectedOwnerId])

  // Wrap search function to include owner filter
  const searchWithOwnerFilter = useCallback(async (
    query: string,
    options?: { limit?: number } & Record<string, string | number | boolean | undefined>
  ) => {
    return searchConsolidatedBusinessMetrics(query, {
      ...options,
      ownerId: selectedOwnerId ?? undefined,
    })
  }, [selectedOwnerId])

  const {
    data: businessMetrics,
    searchResults: businessSearchResults,
    loading: businessLoading,
    searchLoading: businessSearchLoading,
    searchQuery: businessSearchQuery,
    handleSearchChange: handleBusinessSearchChange,
    isSearching: isBusinessSearching,
    sortColumn: businessSortColumn,
    sortDirection: businessSortDirection,
    handleSort: handleBusinessSort,
    PaginationControls: BusinessPaginationControls,
    SearchIndicator: BusinessSearchIndicator,
    setData: setBusinessData,
  } = usePaginatedSearch<ConsolidatedBusinessMetric>({
    fetchPaginated: fetchBusinessesPaginated,
    searchFn: searchWithOwnerFilter,
    initialData: initialBusinessMetrics,
    initialTotal: initialTotal,
    pageSize: 50,
    defaultSortBy: 'totalDeals360d',
    defaultSortDirection: 'desc',
    entityName: 'negocios',
  })

  // Handle owner filter change
  const handleOwnerFilterChange = useCallback((ownerId: string) => {
    setSelectedOwnerId(ownerId === '' ? null : ownerId)
  }, [])

  // Handle opening business modal
  const handleOpenBusinessModal = useCallback(async (businessId: string) => {
    setLoadingBusinessId(businessId)
    try {
      const result = await getBusiness(businessId)
      if (result.success && result.data) {
        setSelectedBusiness(result.data as Business)
        setBusinessModalOpen(true)
      } else {
        toast.error('Error al cargar el negocio')
      }
    } catch {
      toast.error('Error al cargar el negocio')
    } finally {
      setLoadingBusinessId(null)
    }
  }, [])

  // Handle business modal success
  const handleBusinessModalSuccess = useCallback(() => {
    setBusinessModalOpen(false)
    setSelectedBusiness(null)
    router.refresh()
  }, [router])

  // Refetch when owner filter changes (skip initial render)
  const [isOwnerFilterMounted, setIsOwnerFilterMounted] = useState(false)
  const [isRefetchingOwnerFilter, setIsRefetchingOwnerFilter] = useState(false)
  
  // Effect to refetch when owner filter changes
  useMemo(() => {
    if (!isOwnerFilterMounted) {
      setIsOwnerFilterMounted(true)
      return
    }
    
    // Refetch data with new owner filter
    const refetchWithOwnerFilter = async () => {
      setIsRefetchingOwnerFilter(true)
      try {
        const result = await getConsolidatedBusinessMetricsPaginated({
          page: 0,
          pageSize: 50,
          sortBy: businessSortColumn ?? 'totalDeals360d',
          sortDirection: businessSortDirection,
          ownerId: selectedOwnerId ?? undefined,
        })
        if (result.data) {
          setBusinessData(result.data)
        }
      } finally {
        setIsRefetchingOwnerFilter(false)
      }
    }
    
    refetchWithOwnerFilter()
  }, [selectedOwnerId])

  // Build owner dropdown items
  const ownerDropdownItems = useMemo(() => {
    const items = [{ value: '', label: 'Todos los propietarios' }]
    for (const owner of owners) {
      items.push({
        value: owner.id,
        label: `${owner.name} (${owner.businessCount})`,
      })
    }
    return items
  }, [owners])

  // Get sort value for business metric
  const getBusinessSortValue = useCallback((business: ConsolidatedBusinessMetric, column: string): string | number | null => {
    switch (column) {
      case 'businessName':
        return (business.businessName || business.vendorId).toLowerCase()
      case 'topSold':
        return business.topSoldDeal?.quantity ?? 0
      case 'topRevenue':
        return business.topRevenueDeal?.revenue ?? 0
      case 'lastLaunchDate':
        return business.lastLaunchDate ? new Date(business.lastLaunchDate).getTime() : 0
      case 'totalDeals360d':
        return business.totalDeals360d
      default:
        return null
    }
  }, [])

  // Determine which business metrics to display
  const displayBusinessMetrics = useMemo(() => {
    const data = businessSearchResults !== null ? businessSearchResults : businessMetrics
    
    // Client-side sort for search results
    if (isBusinessSearching && businessSortColumn) {
      return sortEntities(data, businessSortColumn, businessSortDirection, getBusinessSortValue)
    }
    
    return data
  }, [businessSearchResults, businessMetrics, isBusinessSearching, businessSortColumn, businessSortDirection, getBusinessSortValue])

  // Toggle expand/collapse for a vendor
  const toggleExpand = useCallback(async (vendorId: string) => {
    const newExpanded = new Set(expandedVendors)
    
    if (newExpanded.has(vendorId)) {
      // Collapse
      newExpanded.delete(vendorId)
      setExpandedVendors(newExpanded)
    } else {
      // Expand - fetch deals if not cached
      newExpanded.add(vendorId)
      setExpandedVendors(newExpanded)
      
      // Check if already cached
      if (!vendorDealsCache.has(vendorId)) {
        // Set loading state
        setVendorDealsCache(prev => new Map(prev).set(vendorId, { deals: [], totalCount: 0, loading: true }))
        
        // Fetch deals
        const result = await getDealsByVendorId(vendorId, 10)
        
        if (result.success && result.data) {
          setVendorDealsCache(prev => new Map(prev).set(vendorId, {
            deals: result.data!,
            totalCount: result.totalCount ?? 0,
            loading: false,
          }))
        } else {
          setVendorDealsCache(prev => new Map(prev).set(vendorId, { deals: [], totalCount: 0, loading: false }))
          toast.error('Error al cargar deals')
        }
      }
    }
  }, [expandedVendors, vendorDealsCache])

  // Syncing state
  const [syncing, setSyncing] = useState(false)

  // Handle sync
  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/deal-metrics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays: 360, fetchAll: true }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        // Clear cache and refresh
        setVendorDealsCache(new Map())
        setExpandedVendors(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Error al sincronizar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSyncing(false)
    }
  }

  const isLoading = businessLoading || businessSearchLoading || isRefetchingOwnerFilter

  // Check if current user is in the owners list
  const currentUserInOwners = user?.id ? owners.some(o => o.id === user.id) : false
  const isFilteredByMe = selectedOwnerId === user?.id

  // Handle "filter by me" quick action
  const handleFilterByMe = useCallback(() => {
    if (user?.id) {
      setSelectedOwnerId(isFilteredByMe ? null : user.id)
    }
  }, [user?.id, isFilteredByMe])

  // Right content for header (owner filter + sync button)
  const headerRightContent = (
    <div className="flex items-center gap-3">
      {/* Loading indicator for owner filter */}
      {isRefetchingOwnerFilter && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span>Cargando...</span>
        </div>
      )}
      
      {/* Quick "Filter by me" button */}
      {currentUserInOwners && (
        <Button
          onClick={handleFilterByMe}
          variant={isFilteredByMe ? 'primary' : 'ghost'}
          size="sm"
          disabled={isRefetchingOwnerFilter}
        >
          {isFilteredByMe ? 'Mis negocios ✓' : 'Mis negocios'}
        </Button>
      )}
      
      {/* Owner Filter Dropdown */}
      <div className={`flex items-center gap-2 ${isRefetchingOwnerFilter ? 'opacity-50 pointer-events-none' : ''}`}>
        <PersonIcon style={{ fontSize: 18 }} className={isRefetchingOwnerFilter ? 'text-gray-300' : 'text-gray-400'} />
        <Dropdown
          items={ownerDropdownItems}
          value={selectedOwnerId ?? ''}
          onSelect={handleOwnerFilterChange}
          placeholder="Filtrar por propietario"
          className="min-w-[200px]"
        />
      </div>
      
      {/* Sync Button (admin only) */}
      {isAdmin && (
        <Button
          onClick={handleSync}
          disabled={syncing || isRefetchingOwnerFilter}
          variant="secondary"
          size="sm"
          leftIcon={<SyncIcon style={{ fontSize: 16 }} className={syncing ? 'animate-spin' : ''} />}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <EntityPageHeader
        searchPlaceholder="Buscar negocio..."
        searchQuery={businessSearchQuery}
        onSearchChange={handleBusinessSearchChange}
        filterTabs={[]}
        activeFilter=""
        onFilterChange={() => {}}
        isAdmin={isAdmin}
        rightContent={headerRightContent}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {businessSearchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : displayBusinessMetrics.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron negocios"
            description={
              businessSearchQuery
                ? 'Intente ajustar su búsqueda'
                : 'Sincronice las métricas desde la API externa para comenzar'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <BusinessSearchIndicator />
            
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full text-[13px] text-left">
                <SortableTableHeader
                  columns={BUSINESS_COLUMNS}
                  sortColumn={businessSortColumn}
                  sortDirection={businessSortDirection}
                  onSort={handleBusinessSort}
                />
                <tbody className="divide-y divide-slate-100">
                  {displayBusinessMetrics.map((business, index) => {
                    const isExpanded = expandedVendors.has(business.vendorId)
                    const cachedData = vendorDealsCache.get(business.vendorId)
                    const isLoadingDeals = cachedData?.loading ?? false
                    const deals = cachedData?.deals ?? []
                    const totalCount = cachedData?.totalCount ?? 0
                    const remainingDeals = totalCount - deals.length

                    return (
                      <>
                        {/* Business Row */}
                        <TableRow key={business.vendorId} index={index}>
                          {/* Expand/Collapse */}
                          <TableCell>
                            <button
                              onClick={() => toggleExpand(business.vendorId)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                              disabled={business.totalDeals360d === 0}
                            >
                              {isExpanded ? (
                                <ExpandMoreIcon style={{ fontSize: 20 }} />
                              ) : (
                                <ChevronRightIcon style={{ fontSize: 20 }} className={business.totalDeals360d === 0 ? 'opacity-30' : ''} />
                              )}
                            </button>
                          </TableCell>
                          
                          {/* Business Name */}
                          <TableCell>
                            {business.businessId ? (
                              <Link
                                href={`/businesses/${business.businessId}?tab=metrics`}
                                className="font-medium text-blue-600 hover:text-blue-700 hover:underline text-[13px]"
                              >
                                {business.businessName || business.vendorId}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900 text-[13px]">
                                {business.businessName || business.vendorId}
                              </span>
                            )}
                          </TableCell>

                          {/* Top Sold */}
                          <TableCell align="right">
                            {business.topSoldDeal ? (
                              business.topSoldDeal.dealUrl ? (
                                <a
                                  href={business.topSoldDeal.dealUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline text-[13px]"
                                  title={`Deal ID: ${business.topSoldDeal.dealId}`}
                                >
                                  {business.topSoldDeal.quantity.toLocaleString()}
                                </a>
                              ) : (
                                <span className="font-medium text-gray-700 text-[13px]">
                                  {business.topSoldDeal.quantity.toLocaleString()}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-[13px]">-</span>
                            )}
                          </TableCell>

                          {/* Top Revenue */}
                          <TableCell align="right">
                            {business.topRevenueDeal ? (
                              business.topRevenueDeal.dealUrl ? (
                                <a
                                  href={business.topRevenueDeal.dealUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline text-[13px]"
                                  title={`Deal ID: ${business.topRevenueDeal.dealId}`}
                                >
                                  ${business.topRevenueDeal.revenue.toLocaleString()}
                                </a>
                              ) : (
                                <span className="font-medium text-gray-700 text-[13px]">
                                  ${business.topRevenueDeal.revenue.toLocaleString()}
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 text-[13px]">-</span>
                            )}
                          </TableCell>

                          {/* Last Launch */}
                          <TableCell>
                            <span className="text-slate-600 text-xs" title={business.lastLaunchDate ? new Date(business.lastLaunchDate).toLocaleDateString() : undefined}>
                              {business.lastLaunchDate
                                ? `${Math.floor((Date.now() - new Date(business.lastLaunchDate).getTime()) / (1000 * 60 * 60 * 24))}d`
                                : '-'}
                            </span>
                          </TableCell>

                          {/* Total Deals */}
                          <TableCell align="center">
                            <span className="font-medium text-[13px]">{business.totalDeals360d}</span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="right">
                            {business.businessId && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenBusinessModal(business.businessId!)}
                                  disabled={loadingBusinessId === business.businessId}
                                  className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                                  title="Editar negocio"
                                >
                                  {loadingBusinessId === business.businessId ? (
                                    <div className="w-[18px] h-[18px] border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <EditIcon style={{ fontSize: 18 }} />
                                  )}
                                </button>
                                <Link
                                  href={`/businesses/${business.businessId}?tab=metrics`}
                                  className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors inline-flex"
                                  title="Ver negocio"
                                >
                                  <StoreIcon style={{ fontSize: 18 }} />
                                </Link>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Deals Rows */}
                        {isExpanded && (
                          <>
                            {isLoadingDeals ? (
                              <tr className="bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="flex items-center gap-2 text-sm text-gray-500 pl-8">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                    Cargando deals...
                                  </div>
                                </td>
                              </tr>
                            ) : deals.length === 0 ? (
                              <tr className="bg-slate-50/50">
                                <td colSpan={7} className="px-4 py-3">
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
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Vendidos</td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Ing. Neto</td>
                                  <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500" colSpan={2}>Fechas</td>
                                  <td></td>
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
                                    <td className="px-4 py-2 text-right">
                                      <span className="text-[12px] font-medium text-slate-700">{deal.quantitySold.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <span className="text-[12px] font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
                                    </td>
                                    <td className="px-4 py-2" colSpan={2}>
                                      <span className="text-[11px] text-slate-500">
                                        {deal.runAt ? new Date(deal.runAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-'}
                                        {' → '}
                                        {deal.endAt ? new Date(deal.endAt).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
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
                                {remainingDeals > 0 && business.businessId && (
                                  <tr className="bg-slate-50/50 border-t border-slate-100">
                                    <td className="pl-4 pr-2 py-2">
                                      <span className="text-slate-300">└─</span>
                                    </td>
                                    <td colSpan={6} className="px-4 py-2">
                                      <Link
                                        href={`/businesses/${business.businessId}?tab=metrics`}
                                        className="text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
                                      >
                                        Ver los {remainingDeals} deals restantes →
                                      </Link>
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

            <BusinessPaginationControls />
          </div>
        )}
      </div>

      {/* Business Form Modal */}
      {businessModalOpen && (
        <Suspense fallback={null}>
          <BusinessFormModal
            isOpen={businessModalOpen}
            onClose={() => {
              setBusinessModalOpen(false)
              setSelectedBusiness(null)
            }}
            business={selectedBusiness}
            onSuccess={handleBusinessModalSuccess}
          />
        </Suspense>
      )}
    </div>
  )
}
