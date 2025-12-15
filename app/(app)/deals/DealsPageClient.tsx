'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getDeals, deleteDeal } from '@/app/actions/deals'
import type { Deal } from '@/types'
import FilterListIcon from '@mui/icons-material/FilterList'
import toast from 'react-hot-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { useEntityPage, sortEntities } from '@/hooks/useEntityPage'
import { logger } from '@/lib/logger'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { RowActionsMenu, EntityTable, StatusPill } from '@/components/shared/table'
import { Button } from '@/components/ui'

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

const STATUS_COLORS: Record<string, string> = {
  pendiente_por_asignar: 'bg-gray-100 text-gray-700',
  asignado: 'bg-blue-50 text-blue-700',
  elaboracion: 'bg-indigo-50 text-indigo-700',
  imagenes: 'bg-purple-50 text-purple-700',
  borrador_enviado: 'bg-yellow-50 text-yellow-700',
  borrador_aprobado: 'bg-green-50 text-green-700',
}

const STATUS_ORDER = ['pendiente_por_asignar', 'asignado', 'elaboracion', 'imagenes', 'borrador_enviado', 'borrador_aprobado']

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Business Name', sortable: true },
  { key: 'dateRange', label: 'Date Range', sortable: true },
  { key: 'opportunityResponsible', label: 'Opp. Responsible', sortable: true },
  { key: 'dealResponsible', label: 'Editor', sortable: true },
  { key: 'ereResponsible', label: 'ERE' },
  { key: 'bookedDate', label: 'Booked', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'actions', label: '', align: 'right' },
]

// Search fields for deals
const SEARCH_FIELDS = ['bookingRequest.name', 'bookingRequest.businessEmail', 'bookingRequest.merchant']

export default function DealsPageClient() {
  const { isAdmin } = useUserRole()
  
  // Use shared hook for common functionality
  const {
    data: deals,
    setData: setDeals,
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
  } = useEntityPage<Deal>({
    entityType: 'deals',
    fetchFn: async () => {
      const result = await getDeals()
      if (result.success && result.data) {
        // Type assertion - the data includes all fields from Prisma
        return { success: true, data: result.data as unknown as Deal[] }
      }
      return result as { success: boolean; data?: Deal[]; error?: string }
    },
    searchFields: SEARCH_FIELDS,
  })

  // Responsible filter state
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all')
  
  // Modal state
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(50)
  const confirmDialog = useConfirmDialog()

  // Get unique responsible users for filter
  const responsibleUsers = useMemo(() => {
    const users = new Map<string, { clerkId: string; name: string | null; email: string | null }>()
    deals.forEach(deal => {
      if (deal.responsible) {
        users.set(deal.responsible.clerkId, {
          clerkId: deal.responsible.clerkId,
          name: deal.responsible.name,
          email: deal.responsible.email,
        })
      }
    })
    return Array.from(users.values())
  }, [deals])

  // Static filter tabs (shown immediately)
  const staticFilterTabs: FilterTab[] = useMemo(() => [
    { id: 'all', label: 'All' },
    { id: 'unassigned', label: 'Unassigned' },
  ], [])
  
  // Filter tabs with responsible counts (dynamic after load)
  const filterTabs: FilterTab[] = useMemo(() => {
    const counts: Record<string, number> = { all: deals.length }
    responsibleUsers.forEach(user => {
      counts[user.clerkId] = deals.filter(d => d.responsibleId === user.clerkId).length
    })
    counts['unassigned'] = deals.filter(d => !d.responsibleId).length
    
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'unassigned', label: 'Unassigned', count: counts['unassigned'] },
      ...responsibleUsers.map(user => ({
        id: user.clerkId,
        label: user.name || user.email || 'Unknown',
        count: counts[user.clerkId] || 0
      }))
    ]
  }, [deals, responsibleUsers, staticFilterTabs])

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
  const filteredDeals = useMemo(() => {
    let filtered = deals

    // Responsible filter
    if (responsibleFilter !== 'all') {
      if (responsibleFilter === 'unassigned') {
        filtered = filtered.filter(d => !d.responsibleId)
      } else {
        filtered = filtered.filter(d => d.responsibleId === responsibleFilter)
      }
    }

    // Apply search filter
    filtered = applySearchFilter(filtered)

    // Apply advanced filters
    filtered = applyAdvancedFilters(filtered)

    // Sort
    return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
  }, [deals, responsibleFilter, applySearchFilter, applyAdvancedFilters, sortColumn, sortDirection, getSortValue])

  const visibleDeals = useMemo(() => filteredDeals.slice(0, visibleCount), [filteredDeals, visibleCount])

  function handleEditDeal(deal: Deal) {
    setSelectedDeal(deal)
    setDealModalOpen(true)
  }

  async function handleDealSuccess() {
    await loadData()
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

    setDeletingId(dealId)
    const result = await deleteDeal(dealId)
    if (!result.success) {
      toast.error(result.error || 'Failed to delete deal')
    } else {
      toast.success('Deal deleted')
      setDeals(prev => prev.filter(d => d.id !== dealId))
    }
    setDeletingId(null)
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="deals"
        searchPlaceholder="Search deals..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={responsibleFilter}
        onFilterChange={setResponsibleFilter}
        savedFilters={savedFilters}
        activeFilterId={activeFilterId}
        onFilterSelect={handleFilterSelect}
        onAdvancedFiltersChange={handleAdvancedFiltersChange}
        onSavedFiltersChange={loadSavedFilters}
        isAdmin={isAdmin}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200">Loading...</div>
        ) : filteredDeals.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title={
              searchQuery || responsibleFilter !== 'all' 
                ? 'No deals match your filters' 
                : 'No deals yet'
            }
            description={
              searchQuery || responsibleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Deals will appear here once booking requests are marked as booked'
            }
          />
        ) : (
          <>
            <EntityTable
            columns={COLUMNS}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          >
            {visibleDeals.map((deal) => (
              <tr
                key={deal.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleEditDeal(deal)}
              >
                <td className="px-4 py-[5px]">
                  <span className="text-[13px] font-medium text-gray-900">
                    {deal.bookingRequest.name}
                  </span>
                </td>
                <td className="px-4 py-[5px] text-[13px] text-gray-600">
                  {new Date(deal.bookingRequest.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })} — {new Date(deal.bookingRequest.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-4 py-[5px] text-[13px] text-gray-600">
                  {deal.opportunityResponsible?.name || deal.opportunityResponsible?.email || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-[5px] text-[13px] text-gray-600">
                  {deal.responsible?.name || deal.responsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-[5px] text-[13px] text-gray-600">
                  {deal.ereResponsible?.name || deal.ereResponsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                <td className="px-4 py-[5px] text-[13px] text-gray-600">
                  {deal.bookingRequest.processedAt 
                    ? new Date(deal.bookingRequest.processedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : '-'}
                </td>
                <td className="px-4 py-[5px]">
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
                </td>
                <td
                  className="px-4 py-2 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActionsMenu
                    isOpen={menuOpen === deal.id}
                    onOpenChange={(open) => setMenuOpen(open ? deal.id : null)}
                    items={[
                      {
                        label: isAdmin ? 'Edit' : 'View',
                        onClick: () => handleEditDeal(deal),
                      },
                      isAdmin
                        ? {
                            label: 'Delete',
                            tone: 'danger',
                            onClick: () => handleDelete(deal.id),
                            disabled: deletingId === deal.id,
                          }
                        : null,
                    ].filter(Boolean) as any}
                  />
                </td>
              </tr>
            ))}
          </EntityTable>
          {visibleCount < filteredDeals.length && (
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
          </>
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
