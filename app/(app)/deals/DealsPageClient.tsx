'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { getDealsPaginated, searchDeals, deleteDeal, getDealsCounts } from '@/app/actions/deals'
import type { Deal } from '@/types'
import FilterListIcon from '@mui/icons-material/FilterList'
import toast from 'react-hot-toast'
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
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'

// Lazy load heavy modal components
const DealFormModal = dynamic(() => import('@/components/crm/deal/DealFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

// Status configuration
const STATUS_LABELS: Record<string, string> = {
  pendiente_por_asignar: 'Pendiente por asignar',
  asignado: 'Asignado',
  elaboracion: 'Elaboración',
  imagenes: 'Imágenes',
  borrador_enviado: 'Borrador Enviado',
  borrador_aprobado: 'Borrador Aprobado',
}

const STATUS_ORDER = ['pendiente_por_asignar', 'asignado', 'elaboracion', 'imagenes', 'borrador_enviado', 'borrador_aprobado']

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre del Negocio', sortable: true },
  { key: 'dateRange', label: 'Rango de Fechas', sortable: true },
  { key: 'opportunityResponsible', label: 'Resp. Opp.', sortable: true },
  { key: 'dealResponsible', label: 'Editor', sortable: true },
  { key: 'ereResponsible', label: 'ERE' },
  { key: 'bookedDate', label: 'Reservado', sortable: true },
  { key: 'status', label: 'Estado', sortable: true },
  { key: 'actions', label: '', align: 'right' },
]

interface DealsPageClientProps {
  initialDeals?: Deal[]
  initialTotal?: number
  initialCounts?: Record<string, number>
}

export default function DealsPageClient({
  initialDeals,
  initialTotal = 0,
  initialCounts,
}: DealsPageClientProps = {}) {
  const searchParams = useSearchParams()
  const { isAdmin } = useUserRole()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Use the reusable paginated search hook (now with server-side filtering)
  const {
    data: deals,
    setData: setDeals,
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
  } = usePaginatedSearch<Deal>({
    fetchPaginated: getDealsPaginated,
    searchFn: searchDeals,
    fetchCounts: getDealsCounts,
    initialData: initialDeals,
    initialTotal,
    initialCounts,
    pageSize: 50,
    entityName: 'ofertas',
  })

  // Responsible filter is now managed by the hook
  const responsibleFilter = (filters.responsibleId as string) || 'all'
  const setResponsibleFilter = useCallback((id: string) => {
    updateFilter('responsibleId', id === 'all' ? undefined : id)
  }, [updateFilter])
  
  // Modal state
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const confirmDialog = useConfirmDialog()

  // Handle opening deal from URL query params (e.g., from search)
  useEffect(() => {
    const displayDeals = searchResults || deals
    const openFromUrl = searchParams.get('open')
    if (openFromUrl && displayDeals.length > 0) {
      const deal = displayDeals.find(d => d.id === openFromUrl)
      if (deal) {
        setSelectedDeal(deal)
        setDealModalOpen(true)
      }
    }
  }, [searchParams, deals, searchResults])

  // Get unique responsible users for filter
  const responsibleUsers = useMemo(() => {
    const displayDeals = searchResults || deals
    const users = new Map<string, { clerkId: string; name: string | null; email: string | null }>()
    displayDeals.forEach(deal => {
      if (deal.responsible) {
        users.set(deal.responsible.clerkId, {
          clerkId: deal.responsible.clerkId,
          name: deal.responsible.name,
          email: deal.responsible.email,
        })
      }
    })
    return Array.from(users.values())
  }, [deals, searchResults])

  // Determine which deals to display
  const displayDeals = searchResults !== null ? searchResults : deals
  
  // Filter tabs with responsible counts (server-side when not searching)
  const filterTabs: FilterTab[] = useMemo(() => {
    // When searching, use client-side counts
    if (isSearching) {
      const baseDeals = displayDeals
      const localCounts: Record<string, number> = { all: baseDeals.length }
      responsibleUsers.forEach(user => {
        localCounts[user.clerkId] = baseDeals.filter(d => d.responsibleId === user.clerkId).length
      })
      localCounts['unassigned'] = baseDeals.filter(d => !d.responsibleId).length
      
      return [
        { id: 'all', label: 'All', count: localCounts.all },
        { id: 'unassigned', label: 'Unassigned', count: localCounts['unassigned'] },
        ...responsibleUsers.map(user => ({
          id: user.clerkId,
          label: user.name || user.email || 'Unknown',
          count: localCounts[user.clerkId] || 0
        }))
      ]
    }
    
    // Use server-side counts
    return [
      { id: 'all', label: 'All', count: counts.all ?? totalCount },
      { id: 'unassigned', label: 'Unassigned', count: counts.unassigned ?? 0 },
      ...responsibleUsers.map(user => ({
        id: user.clerkId,
        label: user.name || user.email || 'Unknown',
        count: counts[user.clerkId] ?? 0
      }))
    ]
  }, [displayDeals, responsibleUsers, totalCount, isSearching, counts])

  // Get sort value for a deal
  const getSortValue = useCallback((deal: Deal, column: string): string | number | null => {
    switch (column) {
      case 'name':
        return (deal.bookingRequest.name || '').toLowerCase()
      case 'dateRange':
        return new Date(deal.bookingRequest.startDate).getTime()
      case 'opportunityResponsible':
        return (deal.opportunityResponsible?.name || deal.opportunityResponsible?.email || '').toLowerCase()
      case 'dealResponsible':
        return (deal.responsible?.name || deal.responsible?.email || 'unassigned').toLowerCase()
      case 'bookedDate':
        return deal.bookingRequest.processedAt ? new Date(deal.bookingRequest.processedAt).getTime() : 0
      case 'status':
        return STATUS_ORDER.indexOf(deal.status || 'pendiente_por_asignar')
      default:
        return null
    }
  }, [])

  // Filter and sort deals
  // Server-side filtering is used for paginated data
  // Client-side filtering only needed for search results
  const filteredDeals = useMemo(() => {
    let filtered = displayDeals

    // Only apply client-side responsible filter when searching (server doesn't filter search results by responsible)
    if (isSearching && responsibleFilter !== 'all') {
      if (responsibleFilter === 'unassigned') {
        filtered = filtered.filter(d => !d.responsibleId)
      } else {
        filtered = filtered.filter(d => d.responsibleId === responsibleFilter)
      }
    }

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayDeals, responsibleFilter, isSearching, sortColumn, sortDirection, getSortValue])

  // Prefetch form config when hovering over a row
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('deal')
  }, [prefetchFormConfig])

  function handleEditDeal(deal: Deal) {
    setSelectedDeal(deal)
    setDealModalOpen(true)
  }

  async function handleDealSuccess() {
    if (!isSearching) {
      await loadPage(currentPage)
    }
    setDealModalOpen(false)
    setSelectedDeal(null)
  }

  async function handleDelete(dealId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    setDeals(prev => prev.filter(d => d.id !== dealId))
    if (searchResults) {
      setSearchResults(prev => prev?.filter(d => d.id !== dealId) || null)
    }
    
    const result = await deleteDeal(dealId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete deal')
      loadPage(currentPage)
    } else {
      toast.success('Deal deleted')
    }
  }

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="deals"
        searchPlaceholder="Buscar en todas las ofertas..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={responsibleFilter}
        onFilterChange={setResponsibleFilter}
        isAdmin={isAdmin}
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
            icon={<FilterListIcon className="w-full h-full" />}
            title={
              searchQuery || responsibleFilter !== 'all' 
                ? 'No hay ofertas que coincidan con sus filtros' 
                : 'Aún no hay ofertas'
            }
            description={
              searchQuery || responsibleFilter !== 'all'
                ? 'Intente ajustar su búsqueda o filtros'
                : 'Las ofertas aparecerán aquí una vez que las solicitudes de booking sean marcadas como reservadas'
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
              {filteredDeals.map((deal, index) => (
                <TableRow
                  key={deal.id}
                  index={index}
                  onClick={() => handleEditDeal(deal)}
                  onMouseEnter={handleRowHover}
                >
                  <TableCell>
                    <span className="text-[13px] font-medium text-gray-900">
                      {deal.bookingRequest.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {new Date(deal.bookingRequest.startDate).toLocaleDateString('en-US', {
                      timeZone: PANAMA_TIMEZONE,
                      month: 'short',
                      day: 'numeric'
                    })} — {new Date(deal.bookingRequest.endDate).toLocaleDateString('en-US', {
                      timeZone: PANAMA_TIMEZONE,
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {deal.opportunityResponsible?.name || deal.opportunityResponsible?.email || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {deal.responsible?.name || deal.responsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {deal.ereResponsible?.name || deal.ereResponsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {deal.bookingRequest.processedAt 
                      ? new Date(deal.bookingRequest.processedAt).toLocaleDateString('en-US', {
                          timeZone: PANAMA_TIMEZONE,
                          month: 'short',
                          day: 'numeric'
                        })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={STATUS_LABELS[deal.status || 'pendiente_por_asignar']}
                      tone={
                        deal.status === 'borrador_aprobado'
                          ? 'success'
                          : deal.status === 'borrador_enviado'
                            ? 'info'
                            : 'neutral'
                      }
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Actions removed - row click opens edit modal */}
                  </TableCell>
                </TableRow>
              ))}
            </EntityTable>
            
            <PaginationControls />
          </div>
        )}
      </div>

      {/* Deal Modal */}
      <DealFormModal
        isOpen={dealModalOpen}
        onClose={() => {
          setDealModalOpen(false)
          setSelectedDeal(null)
        }}
        deal={selectedDeal}
        onSuccess={handleDealSuccess}
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
