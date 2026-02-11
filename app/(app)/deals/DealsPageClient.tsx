'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE, formatDateForPanama, getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { DEAL_STATUS_OPTIONS, DEAL_STATUS_LABELS } from '@/lib/constants'
import { getDealsPaginated, searchDeals, deleteDeal, getDealsCounts, getDealPublicSlug, getDealAssignmentsOverview, updateDealResponsible, updateDealStatus, getDealByBookingRequestId } from '@/app/actions/deals'
import { dismissInboxItem } from '@/app/actions/inbox'
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
  loading: () => null,
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
  { key: 'deliveryDate', label: 'Entrega', sortable: true },
  { key: 'dealResponsible', label: 'Editor', sortable: true },
  { key: 'ereResponsible', label: 'ERE' },
  { key: 'status', label: 'Estado', sortable: true },
  { key: 'actions', label: '', align: 'right' },
]

const ASSIGNMENT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre del Negocio' },
  { key: 'dateRange', label: 'Rango de Fechas' },
  { key: 'daysUntil', label: 'Días para publicación', align: 'center' },
  { key: 'editor', label: 'Editor' },
  { key: 'ere', label: 'ERE' },
  { key: 'actions', label: '', align: 'right' },
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
  eventDates?: {
    startDate: Date | string
    endDate: Date | string
  } | null
  bookingRequest: {
    id: string
    dealId: string | null
    name: string
    startDate: Date | string
    endDate: Date | string
    processedAt: Date | string | null
  }
}

type AssignmentDeliveryDeal = {
  id: string
  status: string
  responsibleId: string | null
  deliveryDate: Date | string | null
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
  const { isAdmin, isEditorSenior, isEditor } = useUserRole()
  
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
  
  const [hasManualSort, setHasManualSort] = useState(false)
  const handleSortWithTracking = useCallback((column: string) => {
    setHasManualSort(true)
    handleSort(column)
  }, [handleSort])

  // Page tab (Editor Senior only)
  const [activeTab, setActiveTab] = useState<'deals' | 'assignments'>('deals')
  const lastTabParamRef = useRef<string | null>(null)
  useEffect(() => {
    if (!isEditorSenior && !isAdmin && activeTab !== 'deals') {
      setActiveTab('deals')
    }
  }, [isEditorSenior, isAdmin, activeTab])
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === lastTabParamRef.current) return
    lastTabParamRef.current = tabParam
    if (tabParam === 'assignments' && (isEditorSenior || isAdmin)) {
      setActiveTab('assignments')
      return
    }
    if (tabParam === 'deals') {
      setActiveTab('deals')
    }
  }, [searchParams, isEditorSenior, isAdmin])

  // Assignments tab state
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null)
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false)
  const [assignmentDeals, setAssignmentDeals] = useState<AssignmentDeal[]>([])
  const [assignmentEditors, setAssignmentEditors] = useState<AssignmentUser[]>([])
  const [assignmentEres, setAssignmentEres] = useState<AssignmentUser[]>([])
  const [workloadByEditor, setWorkloadByEditor] = useState<Record<string, number>>({})
  const [assignmentDeliveryDeals, setAssignmentDeliveryDeals] = useState<AssignmentDeliveryDeal[]>([])
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
        setAssignmentDeliveryDeals(result.data.deliveryDeals || [])
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
      setAssignmentsLoaded(true)
    }
  }, [isEditorSenior, isAdmin])

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
  const dismissedCommentRef = useRef<string | null>(null)
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

  const clearRequestParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('request')) return
    params.delete('request')
    const next = params.toString()
    router.replace(next ? `/deals?${next}` : '/deals')
  }, [router, searchParams])

  const clearCommentParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('comment')) return
    params.delete('comment')
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

  useEffect(() => {
    const requestId = searchParams.get('request')
    if (!requestId) return
    setSelectedRequestId(requestId)
    setBookingRequestModalOpen(true)
    clearRequestParam()
  }, [searchParams, clearRequestParam])

  useEffect(() => {
    const commentId = searchParams.get('comment')
    if (!commentId || dismissedCommentRef.current === commentId) return
    dismissedCommentRef.current = commentId
    dismissInboxItem(commentId, 'booking_request').catch(() => {})
    clearCommentParam()
  }, [searchParams, clearCommentParam])

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

  const canViewAssignments = isEditorSenior || isAdmin
  const canViewOsAdminLink = isAdmin || isEditorSenior || isEditor
  const canEditStatus = isEditorSenior || isAdmin || isEditor

  useEffect(() => {
    if (!canViewAssignments || assignmentsLoaded || assignmentsLoading) return
    loadAssignments()
  }, [canViewAssignments, assignmentsLoaded, assignmentsLoading, loadAssignments])

  const getDaysUntilLaunch = useCallback((dateValue: Date | string | null) => {
    if (!dateValue) return null
    const launchDate = parseDateInPanamaTime(formatDateForPanama(new Date(dateValue)))
    const today = parseDateInPanamaTime(getTodayInPanama())
    return Math.round((launchDate.getTime() - today.getTime()) / ONE_DAY_MS)
  }, [])

  // Get sort value for a deal
  const getSortValue = useCallback((deal: Deal, column: string): string | number | null => {
    switch (column) {
      case 'name':
        return (deal.bookingRequest.name || '').toLowerCase()
      case 'dateRange':
        return deal.eventDates?.startDate ? new Date(deal.eventDates.startDate).getTime() : 0
      case 'deliveryDate':
        return deal.deliveryDate ? new Date(deal.deliveryDate).getTime() : 0
      case 'opportunityResponsible':
        return (deal.opportunityResponsible?.name || deal.opportunityResponsible?.email || '').toLowerCase()
      case 'dealResponsible':
        return (deal.responsible?.name || deal.responsible?.email || 'unassigned').toLowerCase()
      case 'status':
        return STATUS_ORDER.indexOf(deal.status || 'pendiente_por_asignar')
      default:
        return null
    }
  }, [getDaysUntilLaunch])

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

  const visibleDeals = useMemo(() => {
    if (!canViewAssignments) {
      return filteredDeals
    }
    return filteredDeals.filter(deal => deal.responsibleId && deal.ereResponsibleId && deal.deliveryDate)
  }, [filteredDeals, canViewAssignments])

  const assignedDeals = useMemo(() => {
    return filteredDeals.filter(deal => deal.responsibleId && deal.ereResponsibleId && deal.deliveryDate)
  }, [filteredDeals])

  const sortedAssignedDeals = useMemo(() => {
    if (hasManualSort && sortColumn) {
      return sortEntities(assignedDeals, sortColumn, sortDirection, getSortValue)
    }
    return [...assignedDeals].sort((a, b) => {
      const daysA = getDaysUntilLaunch(a.deliveryDate ?? null)
      const daysB = getDaysUntilLaunch(b.deliveryDate ?? null)
      const normalizedA = daysA === null ? Number.POSITIVE_INFINITY : daysA
      const normalizedB = daysB === null ? Number.POSITIVE_INFINITY : daysB
      if (normalizedA !== normalizedB) {
        return normalizedA - normalizedB
      }
      const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Number.POSITIVE_INFINITY
      const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Number.POSITIVE_INFINITY
      return dateA - dateB
    })
  }, [assignedDeals, getDaysUntilLaunch, getSortValue, hasManualSort, sortColumn, sortDirection])

  // Prefetch form config when hovering over a row
  const handleRowHover = useCallback(() => {
    prefetchFormConfig('deal')
  }, [prefetchFormConfig])

  function handleEditDeal(deal: Deal) {
    setSelectedDeal(deal)
    setDealModalOpen(true)
  }

  function handleOpenBookingRequest(bookingRequestId: string) {
    setSelectedRequestId(bookingRequestId)
    setBookingRequestModalOpen(true)
  }

  const handleOpenPublicDeal = useCallback(async (bookingRequestId: string) => {
    if (!bookingRequestId) return
    const cached = dealSlugByRequestId[bookingRequestId]
    if (cached) {
      window.open(`https://ofertasimple.com/ofertas/panama/${cached}`, '_blank', 'noopener,noreferrer')
      return
    }

    const result = await getDealPublicSlug(bookingRequestId)
    if (result && typeof result === 'object' && 'success' in result && result.success) {
      const slug = (result.data as string | null) || null
      if (slug) {
        setDealSlugByRequestId(prev => ({ ...prev, [bookingRequestId]: slug }))
        window.open(`https://ofertasimple.com/ofertas/panama/${slug}`, '_blank', 'noopener,noreferrer')
      } else {
        toast.error('No se encontró el link de la oferta')
      }
      return
    }

    toast.error('No se pudo cargar el link de la oferta')
  }, [dealSlugByRequestId])

  const handleEditAssignmentDeal = useCallback(async (deal: AssignmentDeal) => {
    if (!deal.bookingRequest?.id) return
    try {
      const result = await getDealByBookingRequestId(deal.bookingRequest.id)
      if (result && typeof result === 'object' && 'success' in result && result.success) {
        const fullDeal = result.data as Deal | null
        if (fullDeal) {
          setSelectedDeal(fullDeal)
          setDealModalOpen(true)
          return
        }
      }
      toast.error((result && typeof result === 'object' && 'error' in result && result.error) || 'No se pudo cargar la oferta')
    } catch (error) {
      toast.error('No se pudo cargar la oferta')
    }
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
    if (canViewAssignments) {
      await loadAssignments()
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

  const handleInlineStatusChange = useCallback(async (dealId: string, nextStatus: string) => {
    const previous = displayDeals.find(d => d.id === dealId)?.status
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: nextStatus as Deal['status'] } : d))
    if (searchResults) {
      setSearchResults(prev => prev?.map(d => d.id === dealId ? { ...d, status: nextStatus as Deal['status'] } : d) || null)
    }

    const result = await updateDealStatus(dealId, nextStatus)
    if (!result.success) {
      toast.error(result.error || 'No se pudo actualizar el estado')
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: (previous || d.status) as Deal['status'] } : d))
      if (searchResults) {
        setSearchResults(prev => prev?.map(d => d.id === dealId ? { ...d, status: (previous || d.status) as Deal['status'] } : d) || null)
      }
    } else {
      toast.success('Estado actualizado')
    }
  }, [displayDeals, searchResults, setDeals, setSearchResults])

  const isLoading = loading || searchLoading
  const maxWorkload = useMemo(() => {
    const counts = assignmentEditors.map(editor => workloadByEditor[editor.clerkId] || 0)
    return Math.max(1, ...counts)
  }, [assignmentEditors, workloadByEditor])

  const deliveryWindow = useMemo(() => {
    const weekdayLabels = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
    const today = parseDateInPanamaTime(getTodayInPanama())
    const day = today.getUTCDay()
    const offsetToMonday = day === 0 ? -6 : 1 - day
    const weekStart = new Date(today.getTime() + offsetToMonday * ONE_DAY_MS)
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PANAMA_TIMEZONE,
      month: 'short',
      day: 'numeric',
    })
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(weekStart.getTime() + index * ONE_DAY_MS)
      const key = formatDateForPanama(date)
      const dayNum = key.split('-')[2]
      return {
        key,
        label: formatter.format(date),
        dayNum,
        weekday: weekdayLabels[index % 7],
      }
    })
    return { days }
  }, [])

  const todayKey = useMemo(() => getTodayInPanama(), [])

  const deliveryStatsByEditor = useMemo(() => {
    const baseCounts: Record<string, number> = {}
    deliveryWindow.days.forEach(day => {
      baseCounts[day.key] = 0
    })
    const stats: Record<string, { counts: Record<string, number>; noDate: number; max: number }> = {}

    assignmentEditors.forEach(editor => {
      stats[editor.clerkId] = { counts: { ...baseCounts }, noDate: 0, max: 1 }
    })

    assignmentDeliveryDeals.forEach(deal => {
      if (!deal.responsibleId) return
      const entry = stats[deal.responsibleId]
      if (!entry) return
      if (!deal.deliveryDate) {
        entry.noDate += 1
        return
      }
      const key = formatDateForPanama(new Date(deal.deliveryDate))
      if (Object.prototype.hasOwnProperty.call(entry.counts, key)) {
        entry.counts[key] += 1
      }
    })

    Object.values(stats).forEach(entry => {
      entry.max = Math.max(1, ...Object.values(entry.counts))
    })

    return stats
  }, [assignmentDeliveryDeals, assignmentEditors, deliveryWindow.days])

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
              <span className="relative">
                Asignaciones
                {assignmentDeals.length > 0 && (
                  <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
                    {assignmentDeals.length > 99 ? '99+' : assignmentDeals.length}
                  </span>
                )}
              </span>
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
            ) : assignedDeals.length === 0 ? (
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
                    {assignedDeals.length} oferta{assignedDeals.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="bg-white divide-y divide-gray-100">
                  {sortedAssignedDeals.map((deal) => (
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
                              {deal.eventDates?.startDate
                                ? new Date(deal.eventDates.startDate).toLocaleDateString('en-US', {
                                    timeZone: PANAMA_TIMEZONE,
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '-'} — {deal.eventDates?.endDate
                                ? new Date(deal.eventDates.endDate).toLocaleDateString('en-US', {
                                    timeZone: PANAMA_TIMEZONE,
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : '-'}
                              {(() => {
                                const daysUntilStart = getDaysUntilLaunch(deal.eventDates?.startDate ?? null)
                                if (daysUntilStart === null) return ''
                                return ` (${daysUntilStart} días)`
                              })()}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Entrega: {(() => {
                                const daysUntil = getDaysUntilLaunch(deal.deliveryDate ?? null)
                                const deliveryLabel = deal.deliveryDate
                                  ? new Date(deal.deliveryDate).toLocaleDateString('en-US', {
                                      timeZone: PANAMA_TIMEZONE,
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : '-'
                                if (daysUntil === null) {
                                  return deliveryLabel
                                }
                                return `${deliveryLabel} (${daysUntil} días)`
                              })()}
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
                                  handleOpenBookingRequest(deal.bookingRequestId)
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                                aria-label="Detalles"
                                title="Detalles"
                              >
                                <DescriptionOutlinedIcon style={{ fontSize: 18 }} />
                              </button>
                              {canViewOsAdminLink && deal.bookingRequest?.dealId && (
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
                                  handleOpenPublicDeal(deal.bookingRequestId)
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
                    onSort={handleSortWithTracking}
                  >
                  {sortedAssignedDeals.map((deal, index) => (
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
                          {deal.eventDates?.startDate
                            ? new Date(deal.eventDates.startDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'} — {deal.eventDates?.endDate
                            ? new Date(deal.eventDates.endDate).toLocaleDateString('en-US', {
                                timeZone: PANAMA_TIMEZONE,
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'}
                          {(() => {
                            const daysUntilStart = getDaysUntilLaunch(deal.eventDates?.startDate ?? null)
                            if (daysUntilStart === null) return null
                            return (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {daysUntilStart} días
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600">
                          {(() => {
                            const daysUntil = getDaysUntilLaunch(deal.deliveryDate ?? null)
                            const deliveryLabel = deal.deliveryDate
                              ? new Date(deal.deliveryDate).toLocaleDateString('en-US', {
                                  timeZone: PANAMA_TIMEZONE,
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '-'
                            if (daysUntil === null) {
                              return deliveryLabel
                            }
                            return (
                              <span className="inline-flex items-center gap-2">
                                <span>{deliveryLabel}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  daysUntil < 0
                                    ? 'bg-red-100 text-red-700'
                                    : daysUntil === 0
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : daysUntil <= 7
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {daysUntil} días
                                </span>
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600">
                          {deal.responsible?.name || deal.responsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-[13px] text-gray-600">
                          {deal.ereResponsible?.name || deal.ereResponsible?.email || <span className="text-gray-400 italic">Unassigned</span>}
                        </TableCell>
                    <TableCell>
                      {canEditStatus ? (
                        <select
                          value={deal.status || 'pendiente_por_asignar'}
                          onChange={(e) => handleInlineStatusChange(deal.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="border border-gray-200 rounded-md text-xs px-2 py-1.5 bg-white"
                        >
                          {DEAL_STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {DEAL_STATUS_LABELS[option.value]}
                            </option>
                          ))}
                        </select>
                      ) : (
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
                      )}
                    </TableCell>
                        <TableCell
                          align="right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenBookingRequest(deal.bookingRequestId)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                              aria-label="Detalles"
                              title="Detalles"
                            >
                              <DescriptionOutlinedIcon style={{ fontSize: 18 }} />
                            </button>
                            {canViewOsAdminLink && deal.bookingRequest?.dealId && (
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
                              onClick={() => handleOpenPublicDeal(deal.bookingRequestId)}
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
                <div className="mt-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {assignmentEditors.length === 0 ? (
                      <div className="text-sm text-gray-500">No hay editores activos.</div>
                    ) : (
                      assignmentEditors.map((editor) => {
                        const count = workloadByEditor[editor.clerkId] || 0
                        const capacity = editor.maxActiveDeals
                        const isOver = capacity !== null && capacity !== undefined && capacity > 0 && count > capacity
                        const editorStats = deliveryStatsByEditor[editor.clerkId]
                        return (
                          <div key={editor.clerkId} className="border border-gray-100 rounded-lg p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">
                                  {editor.name || editor.email || editor.clerkId}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                  <label className="text-[9px] text-gray-400 uppercase tracking-wide">Máx</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editorMaxValues[editor.clerkId] ?? ''}
                                    onChange={(e) => setEditorMaxValues(prev => ({ ...prev, [editor.clerkId]: e.target.value }))}
                                    onBlur={() => handleMaxDealsCommit(editor)}
                                    disabled={savingMaxValues[editor.clerkId]}
                                    className="w-10 text-[10px] border border-gray-200 rounded-md px-1 py-0.5 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="∞"
                                  />
                                </div>
                              </div>
                            </div>
                            {editorStats && (
                              <div className="mt-3 border-t border-gray-100 pt-2">
                                <div className="flex items-center justify-between text-[10px] text-gray-500">
                                  <span>Entrega 2 semanas</span>
                                  <span>Sin fecha: <span className="font-semibold text-gray-700">{editorStats.noDate}</span></span>
                                </div>
                                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                                  {deliveryWindow.days.map((day) => {
                                    const dayCount = editorStats.counts[day.key] || 0
                                    const height = Math.round((dayCount / editorStats.max) * 32)
                                    const barHeight = dayCount === 0 ? 4 : Math.max(4, height)
                                    const isToday = day.key === todayKey
                                    const isWeekend = day.weekday === 'Sab' || day.weekday === 'Dom'
                                    const hasCapacity = capacity !== null && capacity !== undefined && capacity > 0
                                    const reachedDailyMax = hasCapacity && dayCount >= capacity
                                    return (
                                      <div key={day.key} className={`min-w-[22px] flex flex-col items-center ${isToday ? 'text-blue-700' : ''}`}>
                                        <div className={`text-[9px] font-semibold ${
                                          reachedDailyMax
                                            ? 'text-red-600'
                                            : isToday
                                              ? 'text-blue-700'
                                              : isWeekend
                                                ? 'text-amber-700'
                                                : 'text-gray-700'
                                        }`}>
                                          {dayCount}
                                        </div>
                                        <div className="mt-0.5 h-10 w-full flex items-end">
                                          <div
                                            className={`w-full rounded-sm ${
                                              dayCount === 0
                                                ? 'bg-gray-100'
                                                : hasCapacity
                                                  ? reachedDailyMax
                                                    ? 'bg-red-500'
                                                    : 'bg-emerald-500'
                                                  : isWeekend
                                                    ? 'bg-amber-400'
                                                    : 'bg-blue-500'
                                            } ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                                            style={{ height: `${barHeight}px` }}
                                          />
                                        </div>
                                        <div className={`mt-1 text-[9px] ${
                                          reachedDailyMax
                                            ? 'font-semibold text-red-600'
                                            : isToday
                                              ? 'font-semibold text-blue-700'
                                              : isWeekend
                                                ? 'text-amber-700'
                                                : 'text-gray-500'
                                        }`}>{day.weekday}</div>
                                        <div className={`text-[9px] ${
                                          reachedDailyMax
                                            ? 'text-red-600'
                                            : isToday
                                              ? 'text-blue-700'
                                              : isWeekend
                                                ? 'text-amber-700'
                                                : 'text-gray-500'
                                        }`}>{day.dayNum}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
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
                        const runAt = deal.eventDates?.startDate ?? null
                        const endAt = deal.eventDates?.endDate ?? null
                        const daysUntil = getDaysUntilLaunch(runAt)
                        return (
                          <TableRow
                            key={deal.id}
                            index={index}
                            onClick={() => handleEditAssignmentDeal(deal)}
                            onMouseEnter={handleRowHover}
                          >
                            <TableCell>
                              <span className="text-[13px] font-medium text-gray-900">
                                {deal.bookingRequest.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-[13px] text-gray-600">
                              {runAt
                                ? new Date(runAt).toLocaleDateString('en-US', {
                                    timeZone: PANAMA_TIMEZONE,
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '-'} — {endAt
                                ? new Date(endAt).toLocaleDateString('en-US', {
                                    timeZone: PANAMA_TIMEZONE,
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : '-'}
                            </TableCell>
                            <TableCell className="text-[13px] text-gray-600 text-center">
                              {daysUntil === null ? (
                                <span className="text-xs text-gray-400">-</span>
                              ) : (
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
                              )}
                            </TableCell>
                            <TableCell>
                              <select
                                value={deal.responsibleId || ''}
                                onChange={(e) => handleAssignmentChange(deal.id, 'responsibleId', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
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
                                onClick={(e) => e.stopPropagation()}
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
                            <TableCell
                              align="right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenBookingRequest(deal.bookingRequest.id)
                                  }}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                                  aria-label="Detalles"
                                  title="Detalles"
                                >
                                  <DescriptionOutlinedIcon style={{ fontSize: 18 }} />
                                </button>
                                {canViewOsAdminLink && deal.bookingRequest?.dealId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(`https://ofertasimple.com/admin/offer/${deal.bookingRequest.dealId}/edit`, '_blank', 'noopener,noreferrer')
                                    }}
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
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
                                    handleOpenPublicDeal(deal.bookingRequest.id)
                                  }}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition-colors"
                                  aria-label="Link de la oferta"
                                  title="Link de la oferta"
                                >
                                  <InsertLinkIcon style={{ fontSize: 18 }} />
                                </button>
                              </div>
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
      {dealModalOpen && (
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
      )}

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
