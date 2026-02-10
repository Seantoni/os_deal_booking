'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE, formatDateForPanama, getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { getDealsPaginated, searchDeals, deleteDeal, getDealsCounts, getDealPublicSlug, getDealAssignmentsOverview, updateDealResponsible, updateDealStatus } from '@/app/actions/deals'
import { updateUserMaxActiveDeals } from '@/app/actions/users'
import type { Deal } from '@/types'
import FilterListIcon from '@mui/icons-material/FilterList'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import InsertLinkIcon from '@mui/icons-material/InsertLink'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import ListAltIcon from '@mui/icons-material/ListAlt'
import toast from 'react-hot-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
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
const BookingRequestViewModal = dynamic(() => import('@/components/booking/request-view/BookingRequestViewModal'), {
  loading: () => null,
  ssr: false,
})

// Status configuration
const STATUS_LABELS: Record<string, string> = {
  pendiente_por_asignar: 'Pendiente por asignar',
  asignado: 'Asignado',
  elaboracion: 'Elaboración',
  borrador_enviado: 'Borrador Enviado',
  borrador_aprobado: 'Borrador Aprobado',
}

const STATUS_ORDER = ['pendiente_por_asignar', 'asignado', 'elaboracion', 'borrador_enviado', 'borrador_aprobado']

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

const ASSIGNMENT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre del Negocio' },
  { key: 'dateRange', label: 'Rango de Fechas' },
  { key: 'daysUntil', label: 'Días para publicación', align: 'center' },
  { key: 'editor', label: 'Editor' },
  { key: 'ere', label: 'ERE' },
]

type AssignmentUser = {
  clerkId: string
  name: string | null
  email: string | null
  maxActiveDeals?: number | null
}

type AssignmentDeal = {
  id: string
  status: string
  responsibleId: string | null
  ereResponsibleId: string | null
  bookingRequest: {
    id: string
    dealId: string | null
    name: string
    startDate: Date | string
    endDate: Date | string
    processedAt: Date | string | null
  }
}

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, isEditorSenior } = useUserRole()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()
  
  // Advanced filters hook
  const { headerProps: advancedFilterProps, filterRules, applyFiltersToData } = useAdvancedFilters<Deal>('deals')
  
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
    refreshCounts,
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

  // Page tab (Editor Senior only)
  const [activeTab, setActiveTab] = useState<'deals' | 'assignments'>('deals')
  useEffect(() => {
    if (!isEditorSenior && !isAdmin && activeTab !== 'deals') {
      setActiveTab('deals')
    }
  }, [isEditorSenior, isAdmin, activeTab])

  // Assignments tab state
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [assignmentDeals, setAssignmentDeals] = useState<AssignmentDeal[]>([])
  const [assignmentEditors, setAssignmentEditors] = useState<AssignmentUser[]>([])
  const [assignmentEres, setAssignmentEres] = useState<AssignmentUser[]>([])
  const [workloadByEditor, setWorkloadByEditor] = useState<Record<string, number>>({})
  const [editorMaxValues, setEditorMaxValues] = useState<Record<string, string>>({})
  const [savingAssignments, setSavingAssignments] = useState<Record<string, boolean>>({})
  const [savingMaxValues, setSavingMaxValues] = useState<Record<string, boolean>>({})
  const assignmentDealsRef = useRef<AssignmentDeal[]>([])

  useEffect(() => {
    assignmentDealsRef.current = assignmentDeals
  }, [assignmentDeals])

  const loadAssignments = useCallback(async () => {
    if (!isEditorSenior && !isAdmin) return
    setAssignmentsLoading(true)
    setAssignmentsError(null)
    try {
      const result = await getDealAssignmentsOverview()
      if (result.success && result.data) {
        setAssignmentDeals(result.data.unassignedDeals || [])
        setAssignmentEditors(result.data.editors || [])
        setAssignmentEres(result.data.eres || [])
        setWorkloadByEditor(result.data.workload || {})
        const nextMaxValues: Record<string, string> = {}
        ;(result.data.editors || []).forEach((editor: AssignmentUser) => {
          nextMaxValues[editor.clerkId] = editor.maxActiveDeals !== null && editor.maxActiveDeals !== undefined
            ? String(editor.maxActiveDeals)
            : ''
        })
        setEditorMaxValues(nextMaxValues)
      } else {
        setAssignmentsError(result.error || 'No se pudo cargar asignaciones')
      }
    } catch (error) {
      setAssignmentsError('No se pudo cargar asignaciones')
    } finally {
      setAssignmentsLoading(false)
    }
  }, [isEditorSenior])

  useEffect(() => {
    if ((isEditorSenior || isAdmin) && activeTab === 'assignments') {
      loadAssignments()
    }
  }, [isEditorSenior, isAdmin, activeTab, loadAssignments])

  // Responsible filter is now managed by the hook
  const responsibleFilter = (filters.responsibleId as string) || 'all'
  const setResponsibleFilter = useCallback((id: string) => {
    updateFilter('responsibleId', id === 'all' ? undefined : id)
  }, [updateFilter])
  
  // Modal state
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const confirmDialog = useConfirmDialog()
  const [dealSlugByRequestId, setDealSlugByRequestId] = useState<Record<string, string>>({})
  const consumedOpenRef = useRef<string | null>(null)

  const clearOpenParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('open')) return
    params.delete('open')
    const next = params.toString()
    router.replace(next ? `/deals?${next}` : '/deals')
  }, [router, searchParams])

  // Handle opening deal from URL query params (e.g., from search)
  useEffect(() => {
    const displayDeals = searchResults || deals
    const openFromUrl = searchParams.get('open')
    if (!openFromUrl) {
      consumedOpenRef.current = null
      return
    }
    if (openFromUrl === consumedOpenRef.current) {
      return
    }
    if (openFromUrl && displayDeals.length > 0) {
      const deal = displayDeals.find(d => d.id === openFromUrl)
      if (deal) {
        setSelectedDeal(deal)
        setDealModalOpen(true)
        consumedOpenRef.current = openFromUrl
        clearOpenParam()
      }
    }
  }, [searchParams, deals, searchResults, clearOpenParam])

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

    // Apply advanced filters (always, both for paginated and search results)
    filtered = applyFiltersToData(filtered)

    // Client-side sort for search results
    if (isSearching && sortColumn) {
    return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayDeals, responsibleFilter, isSearching, sortColumn, sortDirection, getSortValue, applyFiltersToData])

  // Prefetch form config when hovering over a row
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('deal')
  }, [prefetchFormConfig])

  function handleEditDeal(deal: Deal) {
    setSelectedDeal(deal)
    setDealModalOpen(true)
  }

  function handleOpenBookingRequest(deal: Deal) {
    setSelectedRequestId(deal.bookingRequestId)
    setBookingRequestModalOpen(true)
  }

  const handleOpenPublicDeal = useCallback(async (deal: Deal) => {
    if (!deal.bookingRequestId) return
    const cached = dealSlugByRequestId[deal.bookingRequestId]
    if (cached) {
      window.open(`https://ofertasimple.com/ofertas/panama/${cached}`, '_blank', 'noopener,noreferrer')
      return
    }

    const result = await getDealPublicSlug(deal.bookingRequestId)
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      const slug = (result.data as string | null) || null
      if (slug) {
        setDealSlugByRequestId(prev => ({ ...prev, [deal.bookingRequestId]: slug }))
        window.open(`https://ofertasimple.com/ofertas/panama/${slug}`, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('No se encontró el link de la oferta')
      }
      return
    }

    toast.error('No se pudo cargar el link de la oferta')
  }, [dealSlugByRequestId])

  const getDaysUntilLaunch = useCallback((startDate: Date | string) => {
    const launchDate = parseDateInPanamaTime(formatDateForPanama(new Date(startDate)))
    const today = parseDateInPanamaTime(getTodayInPanama())
    return Math.round((launchDate.getTime() - today.getTime()) / ONE_DAY_MS)
  }, [])

  const handleAssignmentChange = useCallback(async (dealId: string, field: 'responsibleId' | 'ereResponsibleId', value: string) => {
    const currentDeal = assignmentDealsRef.current.find(d => d.id === dealId)
    if (!currentDeal) return

    const nextResponsibleId = field === 'responsibleId' ? (value || null) : currentDeal.responsibleId
    const nextEreId = field === 'ereResponsibleId' ? (value || null) : currentDeal.ereResponsibleId

    setAssignmentDeals(prev => prev.map(d => d.id === dealId ? {
      ...d,
      responsibleId: nextResponsibleId,
      ereResponsibleId: nextEreId,
    } : d))

    setSavingAssignments(prev => ({ ...prev, [dealId]: true }))
    const result = await updateDealResponsible(dealId, nextResponsibleId || null, nextEreId || null)
    if (!result.success) {
      toast.error(result.error || 'No se pudo asignar la oferta')
      await loadAssignments()
      setSavingAssignments(prev => ({ ...prev, [dealId]: false }))
      return
    }

    if (currentDeal.responsibleId !== nextResponsibleId) {
      setWorkloadByEditor(prev => {
        const next = { ...prev }
        if (currentDeal.responsibleId) {
          next[currentDeal.responsibleId] = Math.max(0, (next[currentDeal.responsibleId] || 0) - 1)
        }
        if (nextResponsibleId) {
          next[nextResponsibleId] = (next[nextResponsibleId] || 0) + 1
        }
        return next
      })
    }

    if (nextResponsibleId && nextEreId) {
      const statusResult = await updateDealStatus(dealId, 'asignado')
      if (!statusResult.success) {
        toast.error(statusResult.error || 'No se pudo actualizar el estado')
        await loadAssignments()
        setSavingAssignments(prev => ({ ...prev, [dealId]: false }))
        return
      }

      setAssignmentDeals(prev => prev.filter(d => d.id !== dealId))
      await loadPage(currentPage)
      if (!isSearching) {
        refreshCounts()
      }
    }

    setSavingAssignments(prev => ({ ...prev, [dealId]: false }))
  }, [currentPage, isSearching, loadAssignments, loadPage, refreshCounts])

  const handleMaxDealsCommit = useCallback(async (editor: AssignmentUser) => {
    const rawValue = editorMaxValues[editor.clerkId] ?? ''
    const parsed = rawValue === '' ? null : Number(rawValue)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error('Ingrese un número válido')
      setEditorMaxValues(prev => ({
        ...prev,
        [editor.clerkId]: editor.maxActiveDeals !== null && editor.maxActiveDeals !== undefined ? String(editor.maxActiveDeals) : '',
      }))
      return
    }

    if ((editor.maxActiveDeals ?? null) === parsed) {
      return
    }

    setSavingMaxValues(prev => ({ ...prev, [editor.clerkId]: true }))
    const result = await updateUserMaxActiveDeals(editor.clerkId, parsed)
    if (!result.success) {
      toast.error(result.error || 'No se pudo guardar el máximo')
      setEditorMaxValues(prev => ({
        ...prev,
        [editor.clerkId]: editor.maxActiveDeals !== null && editor.maxActiveDeals !== undefined ? String(editor.maxActiveDeals) : '',
      }))
    } else {
      setAssignmentEditors(prev => prev.map(u => u.clerkId === editor.clerkId ? { ...u, maxActiveDeals: parsed } : u))
      toast.success('Máximo actualizado')
    }
    setSavingMaxValues(prev => ({ ...prev, [editor.clerkId]: false }))
  }, [editorMaxValues])

  async function handleDealSuccess() {
    if (!isSearching) {
      await loadPage(currentPage)
    }
    setDealModalOpen(false)
    setSelectedDeal(null)
    clearOpenParam()
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
  const canViewAssignments = isEditorSenior || isAdmin
  const maxWorkload = useMemo(() => {
    const counts = assignmentEditors.map(editor => workloadByEditor[editor.clerkId] || 0)
    return Math.max(1, ...counts)
  }, [assignmentEditors, workloadByEditor])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {canViewAssignments && (
        <div className="bg-white border-b border-gray-200 px-4 pt-3">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'deals'
                  ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ListAltIcon style={{ fontSize: 18 }} />
              Ofertas
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <AssignmentIndIcon style={{ fontSize: 18 }} />
              Asignaciones
            </button>
          </div>
        </div>
      )}

      {!canViewAssignments || activeTab === 'deals' ? (
        <>
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
            {...advancedFilterProps}
          />

          {/* Content */}
          <div className="flex-1 overflow-auto p-0 md:p-4">
            {isLoading ? (
              <div className="p-6 mx-4 mt-4 md:mx-0 md:mt-0 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                {searchLoading ? 'Buscando...' : 'Cargando...'}
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="px-4 pt-4 md:px-0 md:pt-0">
                <EmptyTableState
                  icon={<FilterListIcon className="w-full h-full" />}
                  title={
                    searchQuery || responsibleFilter !== 'all' || filterRules.length > 0
                      ? 'No hay ofertas que coincidan con sus filtros' 
                      : 'Aún no hay ofertas'
                  }
                  description={
                    searchQuery || responsibleFilter !== 'all' || filterRules.length > 0
                      ? 'Intente ajustar su búsqueda o filtros'
                      : 'Las ofertas aparecerán aquí una vez que las solicitudes de booking sean marcadas como reservadas'
                  }
                />
              </div>
            ) : (
              <>
                {/* Mobile list */}
                <div className="md:hidden">
                  <SearchIndicator />
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                      {filteredDeals.length} oferta{filteredDeals.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="bg-white divide-y divide-gray-100">
                    {filteredDeals.map((deal) => (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => handleEditDeal(deal)}
                        onMouseEnter={handleRowHover}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {deal.bookingRequest.name}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {new Date(deal.bookingRequest.startDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric'
                              })} — {new Date(deal.bookingRequest.endDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Editor: {deal.responsible?.name || deal.responsible?.email || 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
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
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenBookingRequest(deal)
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                                aria-label="Detalles"
                                title="Detalles"
                              >
                                <DescriptionOutlinedIcon style={{ fontSize: 18 }} />
                              </button>
                              {deal.bookingRequest?.dealId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    window.open(`https://ofertasimple.com/admin/offer/${deal.bookingRequest.dealId}/edit`, '_blank', 'noopener,noreferrer')
                                  }}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 transition-colors"
                                  aria-label="OS Admin"
                                  title="OS Admin"
                                >
                                  <OpenInNewIcon style={{ fontSize: 18 }} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenPublicDeal(deal)
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-colors"
                                aria-label="Link de la oferta"
                                title="Link de la oferta"
                              >
                                <InsertLinkIcon style={{ fontSize: 18 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-4 py-3">
                    <PaginationControls />
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
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
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenBookingRequest(deal)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                              aria-label="Detalles"
                              title="Detalles"
                            >
                              <DescriptionOutlinedIcon style={{ fontSize: 18 }} />
                            </button>
                            {deal.bookingRequest?.dealId && (
                              <button
                                type="button"
                                onClick={() => window.open(`https://ofertasimple.com/admin/offer/${deal.bookingRequest.dealId}/edit`, '_blank', 'noopener,noreferrer')}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                                aria-label="OS Admin"
                                title="OS Admin"
                              >
                                <OpenInNewIcon style={{ fontSize: 18 }} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenPublicDeal(deal)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition-colors"
                              aria-label="Link de la oferta"
                              title="Link de la oferta"
                            >
                              <InsertLinkIcon style={{ fontSize: 18 }} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </EntityTable>
                    
                  <PaginationControls />
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          {assignmentsLoading ? (
            <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              Cargando asignaciones...
            </div>
          ) : assignmentsError ? (
            <div className="p-6 text-sm text-red-600 bg-white rounded-lg border border-red-200">
              {assignmentsError}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">Carga por Editor</h2>
                    <p className="text-xs text-gray-500 mt-1">Incluye deals que no están en Borrador Enviado o Borrador Aprobado</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {assignmentEditors.length === 0 ? (
                    <div className="text-sm text-gray-500">No hay editores activos.</div>
                  ) : (
                    assignmentEditors.map((editor) => {
                      const count = workloadByEditor[editor.clerkId] || 0
                      const capacity = editor.maxActiveDeals
                      const max = capacity && capacity > 0 ? capacity : maxWorkload
                      const percent = Math.min(100, Math.round((count / max) * 100))
                      const isOver = capacity !== null && capacity !== undefined && capacity > 0 && count > capacity
                      return (
                        <div key={editor.clerkId} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {editor.name || editor.email || editor.clerkId}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{editor.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className={`text-sm font-semibold ${isOver ? 'text-red-600' : 'text-gray-800'}`}>
                                  {capacity ? `${count}/${capacity}` : count}
                                </div>
                                <div className="text-[10px] text-gray-400">activos</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Máx</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editorMaxValues[editor.clerkId] ?? ''}
                                  onChange={(e) => setEditorMaxValues(prev => ({ ...prev, [editor.clerkId]: e.target.value }))}
                                  onBlur={() => handleMaxDealsCommit(editor)}
                                  disabled={savingMaxValues[editor.clerkId]}
                                  className="w-20 text-xs border border-gray-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                  placeholder="∞"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full ${isOver ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Pendientes de Asignación ({assignmentDeals.length})
                  </h2>
                </div>
                {assignmentDeals.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500">No hay ofertas pendientes de asignación.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <EntityTable
                      columns={ASSIGNMENT_COLUMNS}
                      sortColumn={null}
                      sortDirection="asc"
                      onSort={() => {}}
                    >
                      {assignmentDeals.map((deal, index) => {
                        const daysUntil = getDaysUntilLaunch(deal.bookingRequest.startDate)
                        return (
                          <TableRow key={deal.id} index={index}>
                            <TableCell>
                              <span className="text-[13px] font-medium text-gray-900">
                                {deal.bookingRequest.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-gray-600">
                              {new Date(deal.bookingRequest.startDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric',
                              })} — {new Date(deal.bookingRequest.endDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-[13px] text-gray-600 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                daysUntil < 0
                                  ? 'bg-red-100 text-red-700'
                                  : daysUntil === 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : daysUntil <= 7
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-blue-100 text-blue-700'
                              }`}>
                                {daysUntil}
                              </span>
                            </TableCell>
                            <TableCell>
                              <select
                                value={deal.responsibleId || ''}
                                onChange={(e) => handleAssignmentChange(deal.id, 'responsibleId', e.target.value)}
                                disabled={savingAssignments[deal.id]}
                                className="w-full border border-gray-200 rounded-md text-xs px-2 py-1.5 bg-white"
                              >
                                <option value="">Seleccionar editor...</option>
                                {assignmentEditors.map((user) => (
                                  <option key={user.clerkId} value={user.clerkId}>
                                    {user.name || user.email || user.clerkId}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <select
                                value={deal.ereResponsibleId || ''}
                                onChange={(e) => handleAssignmentChange(deal.id, 'ereResponsibleId', e.target.value)}
                                disabled={savingAssignments[deal.id]}
                                className="w-full border border-gray-200 rounded-md text-xs px-2 py-1.5 bg-white"
                              >
                                <option value="">Seleccionar ERE...</option>
                                {assignmentEres.map((user) => (
                                  <option key={user.clerkId} value={user.clerkId}>
                                    {user.name || user.email || user.clerkId}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </EntityTable>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deal Modal */}
      <DealFormModal
        isOpen={dealModalOpen}
        onClose={() => {
          setDealModalOpen(false)
          setSelectedDeal(null)
          clearOpenParam()
        }}
        deal={selectedDeal}
        onSuccess={handleDealSuccess}
      />

      {selectedRequestId && (
        <BookingRequestViewModal
          isOpen={bookingRequestModalOpen}
          onClose={() => {
            setBookingRequestModalOpen(false)
            setSelectedRequestId(null)
          }}
          requestId={selectedRequestId}
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
    </div>
  )
}
