'use client'

import { useMemo, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SyncIcon from '@mui/icons-material/Sync'
import FilterListIcon from '@mui/icons-material/FilterList'
import {
  getDealMetricsPaginated,
  searchDealMetrics,
  getDealMetricsCounts,
  type FormattedDealMetric,
} from '@/app/actions/deal-metrics'
import {
  EntityPageHeader,
  EmptyTableState,
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useUserRole } from '@/hooks/useUserRole'
import { sortEntities } from '@/hooks/useEntityPage'
import toast from 'react-hot-toast'

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'externalDealId', label: 'Deal ID', sortable: true },
  { key: 'businessName', label: 'Negocio', sortable: true },
  { key: 'status', label: 'Estado', sortable: true },
  { key: 'quantitySold', label: 'Vendidos', sortable: true, align: 'right' },
  { key: 'netRevenue', label: 'Ing. Neto', sortable: true, align: 'right' },
  { key: 'margin', label: 'Margen', sortable: true, align: 'right' },
  { key: 'runAt', label: 'Inicio', sortable: true },
  { key: 'endAt', label: 'Fin', sortable: true },
  { key: 'snapshotCount', label: 'Snapshots', sortable: true, align: 'center' },
  { key: 'actions', label: '', width: 'w-16' },
]

interface DealMetricsPageClientProps {
  initialMetrics: FormattedDealMetric[]
  initialTotal: number
  initialCounts: Record<string, number>
  vendors: { id: string; dealCount: number; businessName: string | null }[]
}

export default function DealMetricsPageClient({
  initialMetrics,
  initialTotal,
  initialCounts,
  vendors,
}: DealMetricsPageClientProps) {
  const router = useRouter()
  const { role: userRole } = useUserRole()
  const isAdmin = userRole === 'admin'

  // Paginated search hook
  const fetchPaginated = useCallback(async (options: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDirection?: 'asc' | 'desc'
    statusFilter?: string
    vendorId?: string
  }) => {
    const result = await getDealMetricsPaginated({
      page: options.page ?? 0,
      pageSize: options.pageSize ?? 50,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
      statusFilter: options.statusFilter as 'all' | 'active' | 'ended',
      vendorId: options.vendorId,
    })
    return { data: result.data, total: result.total }
  }, [])

  const {
    data: metrics,
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
    fetchPaginated,
    searchFn: searchDealMetrics,
    fetchCounts: getDealMetricsCounts,
    initialData: initialMetrics,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'métricas',
  })

  // Status filter
  const statusFilter = (filters.statusFilter as 'all' | 'active' | 'ended') || 'all'
  const setStatusFilter = useCallback((filter: 'all' | 'active' | 'ended') => {
    updateFilter('statusFilter', filter === 'all' ? undefined : filter)
  }, [updateFilter])

  // Vendor filter
  const vendorFilter = (filters.vendorId as string) || null
  const setVendorFilter = useCallback((vendorId: string | null) => {
    updateFilter('vendorId', vendorId || undefined)
  }, [updateFilter])

  // Syncing state
  const [syncing, setSyncing] = useState(false)

  // Handle sync
  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/deal-metrics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays: 30, fetchAll: true }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(result.message)
        // Refresh the page data
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

  // Determine which metrics to display
  const displayMetrics = searchResults !== null ? searchResults : metrics

  // Filter tabs with counts
  const filterTabs: FilterTab[] = useMemo(() => {
    if (isSearching) {
      const now = new Date()
      const baseMetrics = displayMetrics
      return [
        { id: 'all', label: 'Todos', count: baseMetrics.length },
        { id: 'active', label: 'Activos', count: baseMetrics.filter(m => m.endAt && new Date(m.endAt) > now).length },
        { id: 'ended', label: 'Finalizados', count: baseMetrics.filter(m => !m.endAt || new Date(m.endAt) <= now).length },
      ]
    }
    return [
      { id: 'all', label: 'Todos', count: counts.all ?? initialTotal },
      { id: 'active', label: 'Activos', count: counts.active ?? 0 },
      { id: 'ended', label: 'Finalizados', count: counts.ended ?? 0 },
    ]
  }, [displayMetrics, isSearching, counts, initialTotal])

  // Get sort value for a metric
  const getSortValue = useCallback((metric: FormattedDealMetric, column: string): string | number | null => {
    switch (column) {
      case 'externalDealId':
        return metric.externalDealId.toLowerCase()
      case 'businessName':
        return (metric.businessName || metric.externalVendorId || '').toLowerCase()
      case 'status':
        return metric.endAt && new Date(metric.endAt) > new Date() ? 1 : 0
      case 'quantitySold':
        return metric.quantitySold
      case 'netRevenue':
        return metric.netRevenue
      case 'margin':
        return metric.margin
      case 'runAt':
        return metric.runAt ? new Date(metric.runAt).getTime() : 0
      case 'endAt':
        return metric.endAt ? new Date(metric.endAt).getTime() : 0
      case 'snapshotCount':
        return metric.snapshotCount
      default:
        return null
    }
  }, [])

  // Filter and sort metrics (client-side for search results)
  const filteredMetrics = useMemo(() => {
    let filtered = displayMetrics

    // Only apply client-side filters when searching
    if (isSearching && statusFilter !== 'all') {
      const now = new Date()
      if (statusFilter === 'active') {
        filtered = filtered.filter(m => m.endAt && new Date(m.endAt) > now)
      } else if (statusFilter === 'ended') {
        filtered = filtered.filter(m => !m.endAt || new Date(m.endAt) <= now)
      }
    }

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayMetrics, statusFilter, isSearching, sortColumn, sortDirection, getSortValue])

  // Right side content for header
  const headerRightContent = (
    <div className="flex items-center gap-2">
      {/* Business filter dropdown */}
      {vendors.length > 0 && (
        <select
          value={vendorFilter || ''}
          onChange={(e) => setVendorFilter(e.target.value || null)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
        >
          <option value="">Todos los negocios</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>
              {v.businessName || v.id} ({v.dealCount})
            </option>
          ))}
        </select>
      )}
      
      {isAdmin && (
        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="secondary"
          size="sm"
          leftIcon={<SyncIcon style={{ fontSize: 16 }} className={syncing ? 'animate-spin' : ''} />}
        >
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      )}
    </div>
  )

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        searchPlaceholder="Buscar por Deal ID, negocio..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={statusFilter}
        onFilterChange={(id) => setStatusFilter(id as 'all' | 'active' | 'ended')}
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
        ) : filteredMetrics.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron métricas"
            description={
              searchQuery || statusFilter !== 'all' || vendorFilter
                ? 'Intente ajustar su búsqueda o filtros'
                : 'Sincronice las métricas desde la API externa para comenzar'
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
              {filteredMetrics.map((metric, index) => {
                const isActive = metric.endAt && new Date(metric.endAt) > new Date()
                return (
                  <TableRow key={metric.id} index={index}>
                    <TableCell>
                      <span className="font-medium text-gray-900 text-[13px]">{metric.externalDealId}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[13px] text-gray-600" title={metric.externalVendorId || undefined}>
                        {metric.businessName || metric.externalVendorId || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isActive ? 'Activo' : 'Finalizado'}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-medium text-[13px]">{metric.quantitySold.toLocaleString()}</span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-medium text-emerald-600 text-[13px]">
                        ${metric.netRevenue.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="font-medium text-blue-600 text-[13px]">
                        ${metric.margin.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 text-xs">
                        {metric.runAt ? new Date(metric.runAt).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600 text-xs">
                        {metric.endAt ? new Date(metric.endAt).toLocaleDateString() : '-'}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <span className="text-xs text-gray-500">{metric.snapshotCount}</span>
                    </TableCell>
                    <TableCell align="right">
                      {metric.dealUrl && (
                        <a
                          href={metric.dealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex"
                          title="Ver oferta"
                        >
                          <OpenInNewIcon style={{ fontSize: 18 }} />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </EntityTable>

            <PaginationControls />
          </div>
        )}
      </div>
    </div>
  )
}
