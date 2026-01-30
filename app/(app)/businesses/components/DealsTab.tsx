/**
 * Deals Tab Component
 * 
 * Shows paginated deal metrics with active deals first.
 * Uses the same table structure as DealMetricsSection.
 */

'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getDealMetricsPaginated, searchDealMetrics, getDealMetricsCounts, type FormattedDealMetric } from '@/app/actions/deal-metrics'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { sortEntities } from '@/hooks/useEntityPage'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  SortableTableHeader,
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { TableRow, TableCell } from '@/components/shared/table'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StorefrontIcon from '@mui/icons-material/Storefront'

// Helper to check if a deal is active
// Active = runAt <= today AND endAt >= today
function isDealActive(deal: { runAt: Date | null; endAt: Date | null }): boolean {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // Start of today
  
  const hasStarted = deal.runAt ? new Date(deal.runAt) <= now : false
  const hasNotEnded = deal.endAt ? new Date(deal.endAt) >= today : false
  
  return hasStarted && hasNotEnded
}

// Table columns configuration (matching DealMetricsSection)
const DEAL_COLUMNS: ColumnConfig[] = [
  { key: 'externalDealId', label: 'Deal', sortable: true },
  { key: 'businessName', label: 'Negocio', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'quantitySold', label: 'Sold', sortable: true, align: 'right' },
  { key: 'netRevenue', label: 'Revenue', sortable: true, align: 'right' },
  { key: 'margin', label: 'Margin', sortable: true, align: 'right' },
  { key: 'runAt', label: 'Start', sortable: true },
  { key: 'endAt', label: 'End', sortable: true },
  { key: 'actions', label: '', align: 'right', width: 'w-10' },
]

interface DealsTabProps {
  initialData?: FormattedDealMetric[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export function DealsTab({
  initialData,
  initialTotal = 0,
  initialCounts,
}: DealsTabProps) {
  const router = useRouter()
  
  // Use the paginated search hook
  const {
    data: deals,
    searchResults,
    loading,
    searchLoading,
    searchQuery,
    handleSearchChange,
    isSearching,
    sortColumn,
    sortDirection,
    handleSort,
    filters,
    updateFilter,
    counts,
    PaginationControls,
    SearchIndicator,
  } = usePaginatedSearch<FormattedDealMetric>({
    fetchPaginated: getDealMetricsPaginated,
    searchFn: searchDealMetrics,
    fetchCounts: getDealMetricsCounts,
    initialData,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'deals',
  })

  // Status filter
  const statusFilter = (filters.statusFilter as 'all' | 'active' | 'ended') || 'all'
  const setStatusFilter = useCallback((filter: 'all' | 'active' | 'ended') => {
    updateFilter('statusFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])

  // Determine which deals to display
  const displayDeals = searchResults !== null ? searchResults : deals

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    if (isSearching) {
      return [
        { id: 'all', label: 'Todos', count: displayDeals.length },
        { id: 'active', label: 'Activos', count: displayDeals.filter(d => isDealActive(d)).length },
        { id: 'ended', label: 'Finalizados', count: displayDeals.filter(d => !isDealActive(d)).length },
      ]
    }
    
    return [
      { id: 'all', label: 'Todos', count: counts.all ?? initialTotal },
      { id: 'active', label: 'Activos', count: counts.active ?? 0 },
      { id: 'ended', label: 'Finalizados', count: counts.ended ?? 0 },
    ]
  }, [displayDeals, isSearching, counts, initialTotal])

  // Get sort value for a deal
  const getSortValue = useCallback((deal: FormattedDealMetric, column: string): string | number | null => {
    switch (column) {
      case 'externalDealId':
        return deal.externalDealId.toLowerCase()
      case 'businessName':
        return (deal.businessName || '').toLowerCase()
      case 'status':
        return isDealActive(deal) ? 1 : 0
      case 'quantitySold':
        return deal.quantitySold
      case 'netRevenue':
        return deal.netRevenue
      case 'margin':
        return deal.margin
      case 'runAt':
        return deal.runAt ? new Date(deal.runAt).getTime() : 0
      case 'endAt':
        return deal.endAt ? new Date(deal.endAt).getTime() : 0
      default:
        return null
    }
  }, [])

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    let filtered = displayDeals

    // Apply status filter when searching (server already filters for paginated)
    if (isSearching) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(d => isDealActive(d))
      } else if (statusFilter === 'ended') {
        filtered = filtered.filter(d => !isDealActive(d))
      }
    }

    // Always sort: active deals first, then by selected column (or netRevenue desc by default)
    return [...filtered].sort((a, b) => {
      // Primary sort: Active deals first
      const aActive = isDealActive(a) ? 1 : 0
      const bActive = isDealActive(b) ? 1 : 0
      if (aActive !== bActive) return bActive - aActive
      
      // Secondary sort: by selected column or netRevenue desc
      if (sortColumn && sortColumn !== 'status') {
        const aVal = getSortValue(a, sortColumn)
        const bVal = getSortValue(b, sortColumn)
        if (aVal !== null && bVal !== null) {
          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        }
        return 0
      }
      
      // Default: by netRevenue descending
      return b.netRevenue - a.netRevenue
    })
  }, [displayDeals, statusFilter, isSearching, sortColumn, sortDirection, getSortValue])

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="deals"
        searchPlaceholder="Buscar deals por ID, negocio o URL..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={statusFilter}
        onFilterChange={(id) => setStatusFilter(id as 'all' | 'active' | 'ended')}
        isAdmin={false}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : filteredDeals.length === 0 ? (
          <EmptyTableState
            icon={<TrendingUpIcon className="w-full h-full" />}
            title="No se encontraron deals"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'No hay métricas de deals sincronizadas'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <SearchIndicator />
            
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full text-[13px] text-left">
                <SortableTableHeader
                  columns={DEAL_COLUMNS}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.map((deal, index) => {
                    const isActive = isDealActive(deal)
                    const dealDisplay = deal.dealName 
                      ? `${deal.externalDealId} - ${deal.dealName}`
                      : deal.externalDealId

                    return (
                      <TableRow key={deal.id} index={index}>
                        {/* Deal ID / Name */}
                        <TableCell>
                          <span className="font-medium text-slate-900 line-clamp-2" title={dealDisplay}>
                            {dealDisplay}
                          </span>
                        </TableCell>
                        
                        {/* Business Name */}
                        <TableCell>
                          {deal.businessName ? (
                            <button
                              onClick={() => {
                                if (deal.businessId) {
                                  sessionStorage.setItem('openBusinessId', deal.businessId)
                                  router.push('/businesses')
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:underline text-left flex items-center gap-1"
                              disabled={!deal.businessId}
                            >
                              <StorefrontIcon style={{ fontSize: 14 }} />
                              <span className="line-clamp-1">{deal.businessName}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              {deal.externalVendorId || '-'}
                            </span>
                          )}
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isActive ? 'Activo' : 'Fin'}
                          </span>
                        </TableCell>
                        
                        {/* Quantity Sold */}
                        <TableCell align="right">
                          <span className="font-medium">{deal.quantitySold.toLocaleString()}</span>
                        </TableCell>
                        
                        {/* Net Revenue */}
                        <TableCell align="right">
                          <span className="font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
                        </TableCell>
                        
                        {/* Margin */}
                        <TableCell align="right">
                          <span className="font-medium text-blue-600">${deal.margin.toLocaleString()}</span>
                        </TableCell>
                        
                        {/* Start Date */}
                        <TableCell>
                          <span className="text-slate-600 text-xs">
                            {deal.runAt ? new Date(deal.runAt).toLocaleDateString() : '-'}
                          </span>
                        </TableCell>
                        
                        {/* End Date */}
                        <TableCell>
                          <span className="text-slate-600 text-xs">
                            {deal.endAt ? new Date(deal.endAt).toLocaleDateString() : '-'}
                          </span>
                        </TableCell>
                        
                        {/* Actions */}
                        <TableCell align="right">
                          {deal.dealUrl && (
                            <a
                              href={deal.dealUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 p-1 inline-flex"
                              onClick={(e) => e.stopPropagation()}
                              title="Ver deal en OfertaSimple"
                            >
                              <OpenInNewIcon style={{ fontSize: 16 }} />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <PaginationControls />
          </div>
        )}
      </div>
    </div>
  )
}
