'use client'

import { useState, useEffect, useMemo, useCallback, useOptimistic, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getUserTasks, toggleTaskComplete, toggleTaskStar, type TaskWithOpportunity } from '@/app/actions/tasks'
import { createTask, updateTask, deleteTask } from '@/app/actions/opportunities'
import { getOpportunity, updateOpportunity } from '@/app/actions/crm'
import type { Opportunity, OpportunityStage } from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useTaskCompletionFollowUp } from '@/hooks/useTaskCompletionFollowUp'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import { buildOpportunityFormData } from '@/components/crm/opportunity/opportunityFormPayload'
import { normalizeAutomationStage, shouldRunMeetingAutomation } from '@/components/crm/opportunity/opportunityAutomationLogic'
import TableSkeleton from '@/components/shared/TableSkeleton'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupsIcon from '@mui/icons-material/Groups'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import PersonIcon from '@mui/icons-material/Person'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { getTodayInPanama, formatDateForPanama, formatShortDateNoYear, daysUntil } from '@/lib/date'
import { addBusinessDaysInPanama } from '@/lib/date/timezone'
import {
  EntityPageHeader,
  FilterTabs,
  UserFilterDropdown,
  DateRangeFilter,
  TaskDescriptionCell,
  BusinessLifecycleBadge,
  type FilterTab,
  type ColumnConfig
} from '@/components/shared'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'
import { type SortDirection } from '@/hooks/useEntityPage'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { isDateInRange, type DateRangeFilterValue } from '@/lib/utils/dateRangeFilter'
import TableViewIcon from '@mui/icons-material/TableView'
import { buildBookingRequestBusinessPrefillParams } from '@/lib/booking-requests/business-prefill'

// Lazy load modals
const TaskModal = dynamic(() => import('@/components/crm/opportunity/TaskModal'), {
  loading: () => null,
  ssr: false,
})

// Import parseMeetingData for validation
import { parseMeetingData, type MeetingData } from '@/components/crm/opportunity/TaskModal'

const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => null,
  ssr: false,
})

// Stage labels for display
const STAGE_LABELS: Record<string, string> = {
  iniciacion: 'Iniciación',
  reunion: 'Reunión',
  propuesta_enviada: 'Propuesta Enviada',
  propuesta_aprobada: 'Propuesta Aprobada',
  won: 'Won',
  lost: 'Lost',
}

const STAGE_COLORS: Record<string, string> = {
  iniciacion: 'bg-gray-100 text-gray-800',
  reunion: 'bg-blue-100 text-blue-800',
  propuesta_enviada: 'bg-yellow-100 text-yellow-800',
  propuesta_aprobada: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
}

// Table columns
const COLUMNS: ColumnConfig[] = [
  { key: 'status', label: '', align: 'center' },
  { key: 'star', label: '', align: 'center' },
  { key: 'business', label: 'Negocio', sortable: true },
  { key: 'lifecycle', label: 'N/R', align: 'center' },
  { key: 'title', label: 'Tarea', sortable: true },
  { key: 'description', label: 'Descripción' },
  { key: 'responsible', label: 'Responsable', sortable: true },
  { key: 'date', label: 'Fecha', sortable: true },
  { key: 'stage', label: 'Etapa', sortable: true },
  { key: 'contactName', label: 'Contacto' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'contactPhone', label: 'Teléfono' },
  { key: 'actions', label: '', align: 'right' },
]

const ALL_TASKS_COLUMNS: ColumnConfig[] = [
  { key: 'star', label: '', align: 'center' },
  { key: 'taskTypeIcon', label: '', align: 'center' },
  { key: 'date', label: 'Fecha', sortable: true },
  { key: 'business', label: 'Negocio', sortable: true },
  { key: 'lifecycle', label: 'N/R', sortable: true, align: 'center' },
  { key: 'meetingOutcome', label: '¿Acuerdo?', sortable: true, align: 'center' },
  { key: 'objection', label: 'Objeción', sortable: true },
  { key: 'responsible', label: 'Responsable', sortable: true },
  { key: 'description', label: 'Descripción' },
]

const TASKS_COLUMN_WIDTHS_STORAGE_KEY = 'tasks-table-column-widths-v2'
const ALL_TASKS_COLUMN_WIDTHS_STORAGE_KEY = 'all-tasks-table-column-widths-v3'
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  status: 40,
  star: 40,
  title: 122,
  description: 170,
  responsible: 80,
  date: 120,
  business: 110,
  lifecycle: 56,
  stage: 88,
  contactName: 105,
  contactEmail: 180,
  contactPhone: 110,
  actions: 48,
}

const ALL_TASKS_DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  star: 40,
  taskTypeIcon: 44,
  date: 120,
  business: 220,
  lifecycle: 56,
  responsible: 170,
  objection: 180,
  description: 240,
  meetingOutcome: 96,
}

const MIN_COLUMN_WIDTHS: Record<string, number> = {
  status: 36,
  star: 36,
  title: 90,
  description: 120,
  responsible: 70,
  date: 95,
  business: 80,
  lifecycle: 48,
  stage: 72,
  contactName: 80,
  contactEmail: 120,
  contactPhone: 90,
  actions: 40,
}

const ALL_TASKS_MIN_COLUMN_WIDTHS: Record<string, number> = {
  star: 1,
  taskTypeIcon: 1,
  date: 1,
  business: 1,
  lifecycle: 1,
  responsible: 1,
  objection: 1,
  description: 1,
  meetingOutcome: 1,
}

type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'meetings' | 'todos'
type TasksPageTab = 'manage' | 'all_tasks'
type AllTasksStatusFilter = 'all' | 'pending' | 'completed'
type AllTasksCategoryFilter = 'all' | 'meetings' | 'tasks'
type StarFilter = 'all' | 'starred'

function compareSortValues(
  aValue: string | number | Date | null,
  bValue: string | number | Date | null,
  direction: SortDirection,
): number {
  if (aValue === null && bValue === null) return 0
  if (aValue === null) return direction === 'asc' ? 1 : -1
  if (bValue === null) return direction === 'asc' ? -1 : 1
  if (aValue < bValue) return direction === 'asc' ? -1 : 1
  if (aValue > bValue) return direction === 'asc' ? 1 : -1
  return 0
}

interface MeetingPipelineAutomationResult {
  didMutateOpportunity: boolean
  navigatedToRequest: boolean
}

export default function TasksPageClient() {
  const router = useRouter()
  const { isAdmin } = useUserRole()
  const { categories, users } = useSharedData()
  const confirmDialog = useConfirmDialog()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()

  const [tasks, setTasks] = useState<TaskWithOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending')
  const [activeTab, setActiveTab] = useState<TasksPageTab>('manage')
  const [allTasksStatusFilter, setAllTasksStatusFilter] = useState<AllTasksStatusFilter>('all')
  const [allTasksCategoryFilter, setAllTasksCategoryFilter] = useState<AllTasksCategoryFilter>('all')
  const [manageStarFilter, setManageStarFilter] = useState<StarFilter>('all')
  const [allTasksStarFilter, setAllTasksStarFilter] = useState<StarFilter>('all')
  const [allTasksDateFilter, setAllTasksDateFilter] = useState<DateRangeFilterValue>({ preset: 'all' })
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null)
  
  // User filter dropdown options
  const userFilterOptions = useMemo(() => {
    return users.map(u => ({
      id: u.clerkId,
      name: u.name || u.email || u.clerkId,
      email: u.email,
    }))
  }, [users])
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithOpportunity | null>(null)
  const [taskCreationContext, setTaskCreationContext] = useState<TaskWithOpportunity | null>(null)
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [forCompletion, setForCompletion] = useState(false) // Track if opening modal to complete a meeting
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loadingOpportunity, setLoadingOpportunity] = useState(false)

  // React 19: useOptimistic for instant UI updates on task completion
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (currentTasks, taskId: string) => 
      currentTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
  )
  
  // React 19: useTransition for non-blocking toggle
  const [, startToggleTransition] = useTransition()

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [allTasksSortColumn, setAllTasksSortColumn] = useState<string | null>('date')
  const [allTasksSortDirection, setAllTasksSortDirection] = useState<SortDirection>('asc')
  const { columnsWithUserWidths, handleColumnResize, getColumnCellStyle } = useResizableColumns(COLUMNS, {
    storageKey: TASKS_COLUMN_WIDTHS_STORAGE_KEY,
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })
  const {
    columnsWithUserWidths: allTasksColumnsWithUserWidths,
    handleColumnResize: handleAllTasksColumnResize,
    getColumnCellStyle: getAllTasksColumnCellStyle,
  } = useResizableColumns(ALL_TASKS_COLUMNS, {
    storageKey: ALL_TASKS_COLUMN_WIDTHS_STORAGE_KEY,
    defaultWidths: ALL_TASKS_DEFAULT_COLUMN_WIDTHS,
    minWidths: ALL_TASKS_MIN_COLUMN_WIDTHS,
  })

  const shouldApplyAllTasksColumnWidth = useCallback((columnKey: string) => {
    if (columnKey === 'description' || columnKey === 'taskTypeIcon' || columnKey === 'star') return true
    const columnConfig = allTasksColumnsWithUserWidths.find((column) => column.key === columnKey)
    const currentWidth = columnConfig?.widthPx
    if (!currentWidth) return false
    return currentWidth !== ALL_TASKS_DEFAULT_COLUMN_WIDTHS[columnKey]
  }, [allTasksColumnsWithUserWidths])

  const allTasksColumnsForTable = useMemo(() => {
    return allTasksColumnsWithUserWidths.map((column) => {
      if (column.key === 'description') {
        return column
      }

      if (shouldApplyAllTasksColumnWidth(column.key)) {
        return column
      }

      return {
        ...column,
        widthPx: undefined,
        minWidth: undefined,
        maxWidth: undefined,
      }
    })
  }, [allTasksColumnsWithUserWidths, shouldApplyAllTasksColumnWidth])

  // Load tasks
  const loadTasks = useCallback(async (filters?: { responsibleId?: string }) => {
    setLoading(true)
    try {
      const result = await getUserTasks(filters)
      if (result.success && result.data) {
        setTasks(result.data)
      } else {
        toast.error(result.error || 'Failed to load tasks')
      }
    } catch (error) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks({ responsibleId: responsibleFilter || undefined })
  }, [loadTasks, responsibleFilter])

  useEffect(() => {
    if (!isAdmin && activeTab !== 'manage') {
      setActiveTab('manage')
    }
  }, [isAdmin, activeTab])

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleAllTasksSort = (column: string) => {
    if (allTasksSortColumn === column) {
      setAllTasksSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setAllTasksSortColumn(column)
      setAllTasksSortDirection('asc')
    }
  }

  const sortTasksWithPriority = useCallback((
    items: TaskWithOpportunity[],
    activeSortColumn: string | null,
    activeSortDirection: SortDirection,
    getSortValue: (task: TaskWithOpportunity, column: string) => string | number | Date | null,
  ) => {
    return [...items].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1

      const primaryCompare = activeSortColumn
        ? compareSortValues(
            getSortValue(a, activeSortColumn),
            getSortValue(b, activeSortColumn),
            activeSortDirection,
          )
        : 0
      if (primaryCompare !== 0) return primaryCompare

      const dueDateCompare = compareSortValues(
        new Date(a.date).getTime(),
        new Date(b.date).getTime(),
        'asc',
      )
      if (dueDateCompare !== 0) return dueDateCompare

      const createdAtCompare = compareSortValues(
        new Date(a.createdAt).getTime(),
        new Date(b.createdAt).getTime(),
        'asc',
      )
      if (createdAtCompare !== 0) return createdAtCompare

      return a.id.localeCompare(b.id)
    })
  }, [])

  // Filter tasks - uses optimisticTasks for instant UI feedback
  const filteredTasksBase = useMemo(() => {
    let filtered = optimisticTasks

    // Apply status filter (using Panama timezone)
    const todayStr = getTodayInPanama()

    switch (activeFilter) {
      case 'pending':
        filtered = filtered.filter(t => !t.completed)
        break
      case 'completed':
        filtered = filtered.filter(t => t.completed)
        break
      case 'overdue':
        filtered = filtered.filter(t => !t.completed && formatDateForPanama(new Date(t.date)) < todayStr)
        break
      case 'meetings':
        filtered = filtered.filter(t => t.category === 'meeting')
        break
      case 'todos':
        filtered = filtered.filter(t => t.category === 'todo')
        break
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.opportunity?.business?.name?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [optimisticTasks, activeFilter, searchQuery])

  const manageStarCounts = useMemo(() => {
    return {
      all: filteredTasksBase.length,
      starred: filteredTasksBase.filter((task) => task.isStarred).length,
    }
  }, [filteredTasksBase])

  const filteredTasks = useMemo(() => {
    if (manageStarFilter === 'starred') {
      return filteredTasksBase.filter((task) => task.isStarred)
    }
    return filteredTasksBase
  }, [filteredTasksBase, manageStarFilter])

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return sortTasksWithPriority(filteredTasks, sortColumn, sortDirection, (task, column) => {
      switch (column) {
        case 'title': return task.title
        case 'date': return new Date(task.date).getTime()
        case 'category': return task.category
        case 'business': return task.opportunity?.business?.name || ''
        case 'responsible': return task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || ''
        case 'status': return task.completed ? 1 : 0
        default: return null
      }
    })
  }, [filteredTasks, sortColumn, sortDirection, sortTasksWithPriority])

  const allTasksBase = useMemo(() => {
    let filtered = optimisticTasks

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.opportunity?.business?.name?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query)
      )
    }

    filtered = filtered.filter((task) => isDateInRange(new Date(task.date), allTasksDateFilter))

    return filtered
  }, [optimisticTasks, searchQuery, allTasksDateFilter])

  const allTasksStatusCounts = useMemo(() => {
    return {
      all: allTasksBase.length,
      pending: allTasksBase.filter((task) => !task.completed).length,
      completed: allTasksBase.filter((task) => task.completed).length,
    }
  }, [allTasksBase])

  const allTasksCategoryCounts = useMemo(() => {
    return {
      all: allTasksBase.length,
      meetings: allTasksBase.filter((task) => task.category === 'meeting').length,
      tasks: allTasksBase.filter((task) => task.category === 'todo').length,
    }
  }, [allTasksBase])

  const allTasksByCategory = useMemo(() => {
    if (allTasksCategoryFilter === 'meetings') {
      return allTasksBase.filter((task) => task.category === 'meeting')
    }
    if (allTasksCategoryFilter === 'tasks') {
      return allTasksBase.filter((task) => task.category === 'todo')
    }
    return allTasksBase
  }, [allTasksBase, allTasksCategoryFilter])

  const allTasksFilteredBase = useMemo(() => {
    if (allTasksStatusFilter === 'pending') {
      return allTasksByCategory.filter((task) => !task.completed)
    }
    if (allTasksStatusFilter === 'completed') {
      return allTasksByCategory.filter((task) => task.completed)
    }
    return allTasksByCategory
  }, [allTasksByCategory, allTasksStatusFilter])

  const allTasksStarCounts = useMemo(() => {
    return {
      all: allTasksFilteredBase.length,
      starred: allTasksFilteredBase.filter((task) => task.isStarred).length,
    }
  }, [allTasksFilteredBase])

  const allTasksFiltered = useMemo(() => {
    if (allTasksStarFilter === 'starred') {
      return allTasksFilteredBase.filter((task) => task.isStarred)
    }
    return allTasksFilteredBase
  }, [allTasksFilteredBase, allTasksStarFilter])

  const allTasksSorted = useMemo(() => {
    return sortTasksWithPriority(allTasksFiltered, allTasksSortColumn, allTasksSortDirection, (task, column) => {
      switch (column) {
        case 'date':
          return new Date(task.date).getTime()
        case 'business':
          return task.opportunity?.business?.name || ''
        case 'lifecycle':
          return task.opportunity?.business?.businessLifecycle || ''
        case 'objection': {
          if (task.category !== 'meeting') return ''
          const meetingData = parseMeetingData(task.notes || null)
          return meetingData?.mainObjection || ''
        }
        case 'category':
          return task.category
        case 'responsible':
          return task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || ''
        case 'status':
          return task.completed ? 1 : 0
        case 'meetingOutcome': {
          if (task.category !== 'meeting') return ''
          const meetingData = parseMeetingData(task.notes || null)
          return meetingData?.reachedAgreement || ''
        }
        default:
          return null
      }
    })
  }, [allTasksFiltered, allTasksSortColumn, allTasksSortDirection, sortTasksWithPriority])

  // Count for filters — computed from already-fetched tasks (no extra DB queries)
  const counts = useMemo(() => {
    const todayStr = getTodayInPanama()
    return {
      all: optimisticTasks.length,
      pending: optimisticTasks.filter(t => !t.completed).length,
      completed: optimisticTasks.filter(t => t.completed).length,
      overdue: optimisticTasks.filter(t => !t.completed && formatDateForPanama(new Date(t.date)) < todayStr).length,
      meetings: optimisticTasks.filter(t => t.category === 'meeting').length,
      todos: optimisticTasks.filter(t => t.category === 'todo').length,
      starred: optimisticTasks.filter(t => t.isStarred).length,
    }
  }, [optimisticTasks])

  const openCreateRequestFromOpportunity = useCallback((opportunity: Opportunity) => {
    const business = opportunity.business
    if (!business) {
      toast.error('No se puede crear la solicitud porque falta la empresa vinculada')
      return
    }

    const params = new URLSearchParams(
      buildBookingRequestBusinessPrefillParams(business, {
        fromOpportunity: opportunity.id,
        includeBusinessId: true,
      })
    )

    router.push(`/booking-requests/new?${params.toString()}`)
  }, [router])

  const fetchOpportunityForAutomation = useCallback(async (opportunityId: string): Promise<Opportunity | null> => {
    const result = await getOpportunity(opportunityId)
    if (!result.success || !result.data) {
      toast.error(result.error || 'No se pudo cargar la oportunidad para la automatización')
      return null
    }
    return result.data
  }, [])

  const updateOpportunityStageForAutomation = useCallback(async (
    opportunity: Opportunity,
    newStage: OpportunityStage,
  ): Promise<Opportunity | null> => {
    const formData = buildOpportunityFormData({
      values: {
        businessId: opportunity.businessId,
        startDate: formatDateForPanama(new Date(opportunity.startDate)),
        closeDate: opportunity.closeDate ? formatDateForPanama(new Date(opportunity.closeDate)) : null,
        notes: opportunity.notes,
        categoryId: opportunity.categoryId,
        tier: opportunity.tier?.toString() || null,
        contactName: opportunity.contactName,
        contactPhone: opportunity.contactPhone,
        contactEmail: opportunity.contactEmail,
      },
      fallbackBusinessId: opportunity.businessId,
      stage: newStage,
      responsibleId: opportunity.responsibleId,
      responsibleMode: 'if_present',
      lostReason: newStage === 'lost' ? (opportunity.lostReason || undefined) : undefined,
    })

    const result = await updateOpportunity(opportunity.id, formData)
    if (!result.success || !result.data) {
      toast.error(result.error || 'No se pudo actualizar la etapa de la oportunidad')
      return null
    }

    setTasks((prev) => prev.map((task) => {
      if (task.opportunityId !== opportunity.id || !task.opportunity) return task
      return {
        ...task,
        opportunity: {
          ...task.opportunity,
          stage: result.data.stage,
        },
      }
    }))

    return result.data
  }, [])

  const createProposalFollowUpTaskForAutomation = useCallback(async (opportunityId: string): Promise<boolean> => {
    const followUpDate = addBusinessDaysInPanama(getTodayInPanama(), 2)
    const formData = new FormData()
    formData.append('opportunityId', opportunityId)
    formData.append('category', 'todo')
    formData.append('title', 'Dar seguimiento a propuesta enviada')
    formData.append('date', followUpDate)
    formData.append('notes', 'Tarea creada automáticamente tras marcar la oportunidad en "Propuesta enviada".')

    const result = await createTask(formData)
    if (!result.success) {
      toast.error(result.error || 'No se pudo crear la tarea automática de seguimiento')
      return false
    }

    return true
  }, [])

  const askStageDecision = useCallback((opts: {
    title: string
    description: string
    options: Array<{ value: string; label: string; className: string }>
    cancelLabel: string
  }): Promise<string | null> => {
    return new Promise((resolve) => {
      let settled = false
      const settle = (value: string | null) => {
        if (settled) return
        settled = true
        resolve(value)
      }

      const buttons = (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">{opts.description}</p>
          <div className="flex flex-col gap-2">
            {opts.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors ${opt.className}`}
                onClick={() => {
                  settle(opt.value)
                  confirmDialog.handleCancel()
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )

      confirmDialog.confirm({
        title: opts.title,
        message: buttons,
        confirmText: '',
        cancelText: opts.cancelLabel,
        confirmVariant: 'primary',
      }).then(() => {
        settle(null)
      }).catch(() => {
        settle(null)
      })
    })
  }, [confirmDialog])

  const askIniciacionAgreementDecision = useCallback(async (): Promise<'reunion' | 'propuesta_enviada' | 'won' | 'keep'> => {
    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'reunion', label: 'Reunión', className: 'bg-blue-600 text-white hover:bg-blue-700' },
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Iniciación',
    })

    return (decision as 'reunion' | 'propuesta_enviada' | 'won') || 'keep'
  }, [askStageDecision])

  const askAgreementPipelineDecision = useCallback(async (): Promise<'keep_reunion' | 'propuesta_enviada' | 'won'> => {
    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Reunión',
    })

    return (decision as 'propuesta_enviada' | 'won') || 'keep_reunion'
  }, [askStageDecision])

  const handleWonPostActions = useCallback(async (opportunity: Opportunity): Promise<boolean> => {
    const createRequestNow = await confirmDialog.confirm({
      title: 'Oportunidad ganada',
      message: '¿Desea crear la solicitud/contrato ahora?',
      confirmText: 'Sí, crear solicitud',
      cancelText: 'No, después',
      confirmVariant: 'primary',
    })

    if (createRequestNow) {
      openCreateRequestFromOpportunity(opportunity)
      return true
    }

    return false
  }, [confirmDialog, openCreateRequestFromOpportunity])

  const runMeetingCompletionPipelineAutomation = useCallback(async (params: {
    opportunityId?: string | null
    capturedStage?: string | null
    meetingData: MeetingData | null
  }): Promise<MeetingPipelineAutomationResult> => {
    const result: MeetingPipelineAutomationResult = {
      didMutateOpportunity: false,
      navigatedToRequest: false,
    }

    if (!params.opportunityId || !params.meetingData?.nextSteps?.trim()) {
      return result
    }

    const initialOpportunity = await fetchOpportunityForAutomation(params.opportunityId)
    if (!initialOpportunity) return result
    let opportunity: Opportunity = initialOpportunity

    const normalizedStage = normalizeAutomationStage(opportunity.stage || params.capturedStage)
    if (normalizedStage !== 'iniciacion' && normalizedStage !== 'reunion') {
      return result
    }

    const changeStage = async (newStage: OpportunityStage): Promise<boolean> => {
      if (opportunity.stage === newStage) return true
      const updated = await updateOpportunityStageForAutomation(opportunity, newStage)
      if (!updated) return false
      opportunity = updated
      result.didMutateOpportunity = true
      return true
    }

    if (normalizedStage === 'iniciacion') {
      if (params.meetingData.reachedAgreement === 'no') {
        await changeStage('reunion')
        return result
      }

      if (params.meetingData.reachedAgreement !== 'si') {
        return result
      }

      const decision = await askIniciacionAgreementDecision()
      if (decision === 'reunion') {
        await changeStage('reunion')
      } else if (decision === 'propuesta_enviada') {
        const changed = await changeStage('propuesta_enviada')
        if (changed) {
          const created = await createProposalFollowUpTaskForAutomation(opportunity.id)
          result.didMutateOpportunity = result.didMutateOpportunity || created
        }
      } else if (decision === 'won') {
        const changed = await changeStage('won')
        if (changed) {
          result.navigatedToRequest = await handleWonPostActions(opportunity)
        }
      }

      return result
    }

    if (params.meetingData.reachedAgreement !== 'si') {
      return result
    }

    const pipelineDecision = await askAgreementPipelineDecision()
    if (pipelineDecision === 'propuesta_enviada') {
      const changed = await changeStage('propuesta_enviada')
      if (changed) {
        const created = await createProposalFollowUpTaskForAutomation(opportunity.id)
        result.didMutateOpportunity = result.didMutateOpportunity || created
      }
      return result
    }

    if (pipelineDecision === 'won') {
      const changed = await changeStage('won')
      if (changed) {
        result.navigatedToRequest = await handleWonPostActions(opportunity)
      }
    }

    return result
  }, [
    askAgreementPipelineDecision,
    askIniciacionAgreementDecision,
    createProposalFollowUpTaskForAutomation,
    fetchOpportunityForAutomation,
    handleWonPostActions,
    updateOpportunityStageForAutomation,
  ])

  const openNewTaskModalForOpportunity = useCallback((task: TaskWithOpportunity) => {
    setSelectedTask(null)
    setTaskCreationContext(task)
    setForCompletion(false)
    setTaskError('')
    setTaskModalOpen(true)
  }, [])

  const taskCompletionFollowUp = useTaskCompletionFollowUp<TaskWithOpportunity>({
    confirmDialog,
    onOpenNewTask: openNewTaskModalForOpportunity,
  })

  const handleToggleComplete = (task: TaskWithOpportunity) => {
    const meetingData = task.category === 'meeting' ? parseMeetingData(task.notes || null) : null

    // If trying to complete a meeting, check if outcome fields are filled
    if (task.category === 'meeting' && !task.completed) {
      // Meeting outcome fields must be filled (nextSteps) before completing
      const hasNextSteps = meetingData?.nextSteps?.trim()
      if (!meetingData || !hasNextSteps) {
        // Open task modal for editing with forCompletion flag
        setSelectedTask(task)
        setTaskCreationContext(null)
        setForCompletion(true)
        setTaskError('')
        setTaskModalOpen(true)
        return
      }
    }

    startToggleTransition(async () => {
      // Instant optimistic update
      addOptimisticTask(task.id)

      const result = await toggleTaskComplete(task.id)
      if (result.success) {
        // Update actual state to match
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))

        const isCompleting = !task.completed
        if (isCompleting) {
          if (task.category === 'meeting') {
            const pipelineResult = await runMeetingCompletionPipelineAutomation({
              opportunityId: task.opportunityId,
              capturedStage: task.opportunity?.stage,
              meetingData,
            })

            if (pipelineResult.didMutateOpportunity) {
              await loadTasks({ responsibleId: responsibleFilter || undefined })
            }

            if (pipelineResult.navigatedToRequest) {
              return
            }
          }

          await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(task)
        }
      } else {
        // On failure, the optimistic state will automatically revert when transition ends
        toast.error(result.error || 'Failed to update task')
      }
    })
  }

  const handleToggleStar = useCallback(async (task: TaskWithOpportunity) => {
    const nextStarred = !task.isStarred

    setTasks((prev) => prev.map((currentTask) => (
      currentTask.id === task.id
        ? { ...currentTask, isStarred: nextStarred }
        : currentTask
    )))

    try {
      const result = await toggleTaskStar(task.id)
      if (!result.success || !result.data) {
        setTasks((prev) => prev.map((currentTask) => (
          currentTask.id === task.id
            ? { ...currentTask, isStarred: task.isStarred }
            : currentTask
        )))
        toast.error(result.error || 'Failed to update starred state')
        return
      }

      setTasks((prev) => prev.map((currentTask) => (
        currentTask.id === task.id
          ? { ...currentTask, isStarred: result.data!.isStarred }
          : currentTask
      )))
    } catch (error) {
      setTasks((prev) => prev.map((currentTask) => (
        currentTask.id === task.id
          ? { ...currentTask, isStarred: task.isStarred }
          : currentTask
      )))
      toast.error('Failed to update starred state')
    }
  }, [])

  // Handle edit task
  const handleEditTask = (task: TaskWithOpportunity) => {
    setSelectedTask(task)
    setTaskCreationContext(null)
    setForCompletion(false) // Regular edit, not for completion
    setTaskError('')
    setTaskModalOpen(true)
  }

  // Handle view opportunity
  const handleViewOpportunity = async (opportunityId: string) => {
    setLoadingOpportunity(true)
    try {
      const result = await getOpportunity(opportunityId)
      if (result.success && result.data) {
        setSelectedOpportunity(result.data)
        setOpportunityModalOpen(true)
      } else {
        toast.error(result.error || 'Failed to load opportunity')
      }
    } catch (error) {
      toast.error('Failed to load opportunity')
    } finally {
      setLoadingOpportunity(false)
    }
  }

  // Handle delete task
  const handleDeleteTask = async (task: TaskWithOpportunity) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Tarea',
      message: `¿Estás seguro de eliminar "${task.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== task.id))

    const result = await deleteTask(task.id)
    if (!result.success) {
      // Revert
      await loadTasks()
      toast.error(result.error || 'Failed to delete task')
    } else {
      toast.success('Tarea eliminada')
    }
  }

  // Handle task submit (update)
  const handleTaskSubmit = async (data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }, options?: {
    markCompleted?: boolean
  }) => {
    const isEditMode = !!selectedTask
    const targetOpportunityId = selectedTask?.opportunityId || taskCreationContext?.opportunityId
    const shouldCompleteAfterSave = !!options?.markCompleted || (isEditMode && forCompletion)

    if (!isEditMode && !targetOpportunityId) {
      setTaskError('No se pudo determinar la oportunidad para crear la tarea')
      return
    }

    setSavingTask(true)
    setTaskError('')

    try {
      const formData = new FormData()
      formData.append('category', data.category)
      formData.append('title', data.title)
      formData.append('date', data.date)
      formData.append('notes', data.notes)
      if (isEditMode) {
        // Preserve current state on edit; completion is applied explicitly after save when needed.
        formData.append('completed', selectedTask!.completed.toString())
      } else {
        formData.append('opportunityId', targetOpportunityId!)
      }

      const result = isEditMode
        ? await updateTask(selectedTask!.id, formData)
        : await createTask(formData)

      if (result.success) {
        const promptTaskContext = selectedTask || taskCreationContext
        const savedTask = result.data
        if (!savedTask) {
          setTaskError(isEditMode ? 'Failed to update task' : 'Failed to create task')
          return
        }

        let finalTask = savedTask
        if (shouldCompleteAfterSave && !savedTask.completed) {
          const completeFormData = new FormData()
          completeFormData.append('category', data.category)
          completeFormData.append('title', data.title)
          completeFormData.append('date', data.date)
          completeFormData.append('completed', 'true')
          completeFormData.append('notes', data.notes || '')

          const completeResult = await updateTask(savedTask.id, completeFormData)
          if (completeResult.success && completeResult.data) {
            finalTask = completeResult.data
          }
        }

        const completedFromModal = isEditMode
          ? !selectedTask!.completed && finalTask.completed
          : finalTask.completed
        const previousMeetingData = selectedTask?.category === 'meeting'
          ? parseMeetingData(selectedTask.notes || null)
          : null
        const currentMeetingData = data.category === 'meeting'
          ? parseMeetingData(data.notes || null)
          : null
        const shouldRunPipelineAutomation = data.category === 'meeting'
          && !!promptTaskContext?.opportunityId
          && shouldRunMeetingAutomation({
            previousMeetingData,
            currentMeetingData,
            wasCompletedBefore: !!selectedTask?.completed,
            isCompletedNow: finalTask.completed,
          })
        const shouldOfferNewTask = completedFromModal && !!promptTaskContext && taskCompletionFollowUp.canOfferNewTaskAfterCompletion(promptTaskContext, data.notes)

        if (isEditMode) {
          toast.success(completedFromModal ? 'Tarea completada' : 'Tarea actualizada')
          setTaskModalOpen(false)
          setSelectedTask(null)
          setTaskCreationContext(null)
          setForCompletion(false)
        } else {
          toast.success('Tarea creada')
          setTaskModalOpen(false)
          setTaskCreationContext(null)
          setSelectedTask(null)
        }

        let pipelineResult: MeetingPipelineAutomationResult = {
          didMutateOpportunity: false,
          navigatedToRequest: false,
        }
        if (shouldRunPipelineAutomation) {
          pipelineResult = await runMeetingCompletionPipelineAutomation({
            opportunityId: promptTaskContext?.opportunityId,
            capturedStage: promptTaskContext?.opportunity?.stage,
            meetingData: currentMeetingData,
          })
        }

        await loadTasks({ responsibleId: responsibleFilter || undefined })

        if (pipelineResult.navigatedToRequest) {
          return
        }

        if (shouldOfferNewTask && promptTaskContext) {
          await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(promptTaskContext, data.notes)
        }
      } else {
        setTaskError(result.error || (isEditMode ? 'Failed to update task' : 'Failed to create task'))
      }
    } catch (error) {
      setTaskError('An error occurred')
    } finally {
      setSavingTask(false)
    }
  }

  const getDaysUntil = (task: TaskWithOpportunity) => {
    const diff = daysUntil(task.date)
    return diff ?? 0
  }

  // Check if task is overdue (using shared daysUntil helper)
  const isOverdue = (task: TaskWithOpportunity) => !task.completed && getDaysUntil(task) < 0

  // Check if task is due today (using shared daysUntil helper)
  const isDueToday = (task: TaskWithOpportunity) => getDaysUntil(task) === 0

  const getDaysUntilText = (daysUntil: number) => {
    if (daysUntil === 0) return 'Hoy'
    if (daysUntil > 0) return `${daysUntil} día${daysUntil === 1 ? '' : 's'}`
    const overdueDays = Math.abs(daysUntil)
    return `-${overdueDays} día${overdueDays === 1 ? '' : 's'}`
  }

  const getDueDateBadgeStyles = (daysUntil: number) => {
    if (daysUntil < 0) return 'bg-red-100 text-red-700'
    if (daysUntil <= 2) return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
  }

  const getDueDateTitle = (task: TaskWithOpportunity, daysUntil: number) => {
    const dueDateLabel = formatShortDateNoYear(task.date)

    if (daysUntil < 0) {
      const overdueDays = Math.abs(daysUntil)
      return `${dueDateLabel} (${overdueDays} día${overdueDays === 1 ? '' : 's'} vencida)`
    }
    if (daysUntil === 0) {
      return `${dueDateLabel} (Hoy)`
    }
    return `${dueDateLabel} (${daysUntil} día${daysUntil === 1 ? '' : 's'})`
  }

  const getTaskDescription = (
    task: TaskWithOpportunity,
    meetingData?: MeetingData | null,
    separator = ' | ',
  ) => {
    if (!task.notes) return '-'
    if (task.category !== 'meeting') return task.notes

    const parsedMeetingData = meetingData ?? parseMeetingData(task.notes)
    if (!parsedMeetingData) return task.notes

    const details = parsedMeetingData.meetingDetails?.trim()
    const nextSteps = parsedMeetingData.nextSteps?.trim()
    const mainObjection = parsedMeetingData.mainObjection?.trim()
    const objectionSolution = parsedMeetingData.objectionSolution?.trim()

    const parts = [details, nextSteps]
    if (parsedMeetingData.reachedAgreement === 'no') {
      if (mainObjection) parts.push(`Objeción: ${mainObjection}`)
      if (objectionSolution) parts.push(`Solución: ${objectionSolution}`)
    }

    return parts.filter(Boolean).join(separator) || '-'
  }

  const filterTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'overdue', label: 'Vencidas', count: counts.overdue },
    { id: 'completed', label: 'Completadas', count: counts.completed },
    { id: 'meetings', label: 'Reuniones', count: counts.meetings },
    { id: 'todos', label: 'To-dos', count: counts.todos },
  ]

  const manageStarTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: manageStarCounts.all },
    { id: 'starred', label: 'Starred', count: manageStarCounts.starred },
  ]

  const allTasksFilterTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: allTasksStatusCounts.all },
    { id: 'pending', label: 'Pendientes', count: allTasksStatusCounts.pending },
    { id: 'completed', label: 'Completadas', count: allTasksStatusCounts.completed },
  ]

  const allTasksCategoryTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: allTasksCategoryCounts.all },
    { id: 'meetings', label: 'Reuniones', count: allTasksCategoryCounts.meetings },
    { id: 'tasks', label: 'Tareas', count: allTasksCategoryCounts.tasks },
  ]

  const allTasksStarTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: allTasksStarCounts.all },
    { id: 'starred', label: 'Starred', count: allTasksStarCounts.starred },
  ]

  const isAllTasksTab = isAdmin && activeTab === 'all_tasks'
  const activeHeaderFilter = isAllTasksTab ? allTasksStatusFilter : activeFilter
  const headerFilterTabs = isAllTasksTab ? allTasksFilterTabs : filterTabs

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {isAdmin && (
        <div className="bg-white border-b border-gray-200 px-4 pt-3">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'manage'
                  ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <AssignmentIcon style={{ fontSize: 18 }} />
              Gestión
            </button>
            <button
              onClick={() => setActiveTab('all_tasks')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'all_tasks'
                  ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <TableViewIcon style={{ fontSize: 18 }} />
              Todas las tareas
            </button>
          </div>
        </div>
      )}

      {/* Header with Search and Filters */}
      <EntityPageHeader
        searchPlaceholder={isAllTasksTab ? 'Buscar en todas las tareas...' : 'Buscar tareas...'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={headerFilterTabs}
        activeFilter={activeHeaderFilter}
        onFilterChange={(id) => {
          if (isAllTasksTab) {
            setAllTasksStatusFilter(id as AllTasksStatusFilter)
            return
          }
          setActiveFilter(id as FilterType)
        }}
        isAdmin={isAdmin}
        beforeFilters={isAllTasksTab ? (
          <div className="flex items-center gap-2">
            <FilterTabs
              items={allTasksStarTabs}
              activeId={allTasksStarFilter}
              onChange={(id) => setAllTasksStarFilter(id as StarFilter)}
            />
            <div className="h-5 w-px bg-gray-200 mx-0.5 flex-shrink-0"></div>
            <DateRangeFilter
              value={allTasksDateFilter}
              onChange={setAllTasksDateFilter}
            />
            <div className="h-5 w-px bg-gray-200 mx-0.5 flex-shrink-0"></div>
            <FilterTabs
              items={allTasksCategoryTabs}
              activeId={allTasksCategoryFilter}
              onChange={(id) => setAllTasksCategoryFilter(id as AllTasksCategoryFilter)}
            />
          </div>
        ) : (
          <FilterTabs
            items={manageStarTabs}
            activeId={manageStarFilter}
            onChange={(id) => setManageStarFilter(id as StarFilter)}
          />
        )}
        userFilter={isAdmin ? (
          <UserFilterDropdown
            users={userFilterOptions}
            value={responsibleFilter}
            onChange={setResponsibleFilter}
            label="Responsable"
            placeholder="Todos"
          />
        ) : undefined}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-0 md:p-4 bg-gray-50">
        {isAllTasksTab ? (
          loading ? (
            <TableSkeleton rows={6} columns={[8, 10, 14, 20, 14, 10, 12]} />
          ) : allTasksSorted.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200 mx-4 md:mx-0">
              <AssignmentIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
              <p className="text-gray-500 font-medium">No hay tareas para mostrar</p>
              <p className="text-sm text-gray-500 mt-1">
                Ajuste la búsqueda, estado o rango de fechas para ver resultados
              </p>
            </div>
          ) : (
            <EntityTable
              columns={allTasksColumnsForTable}
              sortColumn={allTasksSortColumn}
              sortDirection={allTasksSortDirection}
              onSort={handleAllTasksSort}
              onColumnResize={handleAllTasksColumnResize}
              tableClassName="[&_th]:px-3 [&_td]:px-3 [&_td]:text-sm"
            >
              {allTasksSorted.map((task, index) => {
                const meetingData = task.category === 'meeting' ? parseMeetingData(task.notes || null) : null
                const meetingOutcome =
                  meetingData?.reachedAgreement === 'si'
                    ? 'Sí'
                    : meetingData?.reachedAgreement === 'no'
                      ? 'No'
                      : '-'
                const multilineDescription = getTaskDescription(task, meetingData, '\n')

                return (
                  <TableRow
                    key={task.id}
                    index={index}
                    onClick={() => handleEditTask(task)}
                    onMouseEnter={() => prefetchFormConfig('opportunity')}
                    className="hover:bg-slate-50/80 cursor-pointer"
	                  >
	                    <TableCell
	                      align="center"
	                      style={getAllTasksColumnCellStyle('star')}
	                      onClick={(e) => e.stopPropagation()}
	                    >
	                      <button
	                        type="button"
	                        onClick={() => handleToggleStar(task)}
	                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
	                          task.isStarred
	                            ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600'
	                            : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
	                        }`}
	                        title={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                        aria-label={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                      >
	                        {task.isStarred ? <StarIcon style={{ fontSize: 16 }} /> : <StarBorderIcon style={{ fontSize: 16 }} />}
	                      </button>
	                    </TableCell>
	
	                    <TableCell
	                      align="center"
	                      style={getAllTasksColumnCellStyle('taskTypeIcon')}
                    >
                      {task.category === 'meeting' ? (
                        <GroupsIcon className="text-blue-600" style={{ fontSize: 16 }} />
                      ) : (
                        <AssignmentIcon className="text-orange-600" style={{ fontSize: 16 }} />
                      )}
                    </TableCell>

                    <TableCell style={shouldApplyAllTasksColumnWidth('date') ? getAllTasksColumnCellStyle('date') : undefined}>
                      <span className="text-sm text-slate-700 whitespace-nowrap">
                        {formatShortDateNoYear(task.date)}
                      </span>
                    </TableCell>

                    <TableCell style={shouldApplyAllTasksColumnWidth('business') ? getAllTasksColumnCellStyle('business') : undefined}>
                      <span className="text-sm font-medium text-slate-900">
                        {task.opportunity?.business?.name || '-'}
                      </span>
                    </TableCell>

                    <TableCell
                      align="center"
                      style={shouldApplyAllTasksColumnWidth('lifecycle') ? getAllTasksColumnCellStyle('lifecycle') : undefined}
                    >
                      <BusinessLifecycleBadge lifecycle={task.opportunity?.business?.businessLifecycle} />
                    </TableCell>

                    <TableCell
                      align="center"
                      style={shouldApplyAllTasksColumnWidth('meetingOutcome') ? getAllTasksColumnCellStyle('meetingOutcome') : undefined}
                    >
                      <span className="text-sm text-slate-700">
                        {task.category === 'meeting' ? meetingOutcome : '-'}
                      </span>
                    </TableCell>

                    <TableCell style={shouldApplyAllTasksColumnWidth('objection') ? getAllTasksColumnCellStyle('objection') : undefined}>
                      <span
                        className="text-sm text-slate-700 truncate block w-full"
                        title={meetingData?.mainObjection || ''}
                      >
                        {meetingData?.mainObjection || '-'}
                      </span>
                    </TableCell>

                    <TableCell style={shouldApplyAllTasksColumnWidth('responsible') ? getAllTasksColumnCellStyle('responsible') : undefined}>
                      <span
                        className="text-sm text-slate-700 truncate block w-full"
                        title={task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || ''}
                      >
                        {task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || '-'}
                      </span>
                    </TableCell>

                    <TableCell
                      className="!overflow-visible"
                      style={{
                        ...getAllTasksColumnCellStyle('description'),
                        height: 'auto',
                        verticalAlign: 'top',
                      }}
                    >
                      <TaskDescriptionCell text={multilineDescription} mode="multiline" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </EntityTable>
          )
        ) : loading ? (
          <TableSkeleton rows={6} columns={[4, 14, 10, 20, 16, 10, 10, 8]} />
        ) : sortedTasks.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200 mx-4 md:mx-0">
            <AssignmentIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
            <p className="text-gray-500 font-medium">No hay tareas</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeFilter !== 'all'
                ? 'No hay tareas que coincidan con el filtro seleccionado'
                : 'Las tareas aparecerán aquí cuando se creen en las oportunidades'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="md:hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  {sortedTasks.length} tarea{sortedTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="bg-white">
                {sortedTasks.map((task) => {
                  const overdue = isOverdue(task)
                  const today = isDueToday(task)
                  const stageLabel = STAGE_LABELS[task.opportunity?.stage || ''] || task.opportunity?.stage || '-'
                  const stageColor = STAGE_COLORS[task.opportunity?.stage || ''] || 'bg-gray-100 text-gray-600'
                  const businessName = task.opportunity?.business?.name || '-'
                  const contactName = task.opportunity?.business?.contactName || '-'
                  const contactEmail = task.opportunity?.business?.contactEmail
                  const contactPhone = task.opportunity?.business?.contactPhone

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleEditTask(task)}
                      onMouseEnter={() => prefetchFormConfig('opportunity')}
                      className={`px-4 py-3 border-b border-gray-100 active:bg-gray-50 ${
                        task.completed ? 'opacity-70' : ''
                      }`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleComplete(task)
                          }}
                          className={`mt-0.5 transition-colors ${
                            task.completed
                              ? 'text-green-500 hover:text-green-600'
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                          title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                          aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                        >
                          {task.completed ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <RadioButtonUncheckedIcon fontSize="small" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
	                          <div className="flex items-start justify-between gap-3">
	                            <div className="min-w-0">
	                              <div className="flex items-center gap-2">
	                                <span className={`font-semibold text-[14px] truncate ${task.completed ? 'line-through text-gray-500' : 'text-slate-900'}`}>
	                                  {task.title}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  task.category === 'meeting'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-orange-50 text-orange-700'
                                }`}>
                                  {task.category === 'meeting' ? (
                                    <GroupsIcon style={{ fontSize: 12 }} />
                                  ) : (
                                    <AssignmentIcon style={{ fontSize: 12 }} />
                                  )}
                                  {task.category === 'meeting' ? 'Reunión' : 'To-do'}
                                </span>
                              </div>
                              {task.notes && (
                                <p className="text-xs text-slate-500 truncate mt-0.5" title={task.notes}>
                                  {task.notes}
                                </p>
                              )}
                            </div>

	                            <div className="flex items-start gap-1.5">
	                              <button
	                                type="button"
	                                onClick={(e) => {
	                                  e.stopPropagation()
	                                  handleToggleStar(task)
	                                }}
	                                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
	                                  task.isStarred
	                                    ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600'
	                                    : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
	                                }`}
	                                title={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                                aria-label={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                              >
	                                {task.isStarred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
	                              </button>
	                              <div className="flex flex-col items-end gap-0.5">
	                                <span className={`text-[12px] font-medium whitespace-nowrap ${
	                                  overdue
	                                    ? 'text-red-600'
	                                    : today
	                                    ? 'text-orange-600'
	                                    : 'text-slate-700'
	                                }`}>
	                                  {formatShortDateNoYear(task.date)}
	                                </span>
	                                {(overdue || today) && (
	                                  <span className={`text-[10px] uppercase tracking-wide ${
	                                    overdue ? 'text-red-500' : 'text-orange-500'
	                                  }`}>
	                                    {overdue ? 'Vencida' : 'Hoy'}
	                                  </span>
	                                )}
	                              </div>
	                            </div>
	                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                            <span className="truncate" title={businessName}>
                              {businessName}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${stageColor}`}>
                              {stageLabel}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                            <PersonIcon style={{ fontSize: 14 }} />
                            <span className="truncate" title={contactName}>
                              {contactName}
                            </span>
                          </div>

                          {(contactEmail || contactPhone) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {contactEmail && (
                                <a
                                  href={`mailto:${contactEmail}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-[11px]"
                                  title={contactEmail}
                                >
                                  <EmailIcon style={{ fontSize: 12 }} />
                                  <span className="truncate max-w-[180px]">{contactEmail}</span>
                                </a>
                              )}
                              {contactPhone && (
                                <a
                                  href={`tel:${contactPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 px-2 py-1 text-[11px]"
                                >
                                  <PhoneIcon style={{ fontSize: 12 }} />
                                  <span className="whitespace-nowrap">{contactPhone}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {task.opportunityId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewOpportunity(task.opportunityId)
                            }}
                            className="p-1.5 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Ver Oportunidad"
                            aria-label="Ver Oportunidad"
                          >
                            <OpenInNewIcon style={{ fontSize: 18 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <EntityTable
                tableClassName="table-fixed [&_th]:px-2 [&_td]:px-2 [&_td]:overflow-hidden [&_td]:text-sm"
                columns={columnsWithUserWidths}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                onColumnResize={handleColumnResize}
              >
                {sortedTasks.map((task, index) => {
                  const meetingData = task.category === 'meeting' ? parseMeetingData(task.notes || null) : null
                  const taskDescription = getTaskDescription(task, meetingData)

                  return (
                    <TableRow 
                      key={task.id} 
                      index={index}
                      onClick={() => handleEditTask(task)}
                      onMouseEnter={() => prefetchFormConfig('opportunity')}
                      className={task.completed ? 'opacity-60' : ''}
                    >
                      {/* Status */}
	                      <TableCell
	                        align="center"
	                        className="px-0"
                        style={getColumnCellStyle('status')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className={`mx-auto flex h-5 w-5 items-center justify-center transition-colors ${
                            task.completed
                              ? 'text-green-500 hover:text-green-600'
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                          title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                        >
                          {task.completed ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <RadioButtonUncheckedIcon fontSize="small" />
                          )}
	                        </button>
	                      </TableCell>
	
	                      <TableCell
	                        align="center"
	                        className="px-0"
	                        style={getColumnCellStyle('star')}
	                        onClick={(e) => e.stopPropagation()}
	                      >
	                        <button
	                          type="button"
	                          onClick={() => handleToggleStar(task)}
	                          className={`mx-auto flex h-5 w-5 items-center justify-center transition-colors ${
	                            task.isStarred
	                              ? 'text-amber-500 hover:text-amber-600'
	                              : 'text-gray-300 hover:text-gray-500'
	                          }`}
	                          title={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                          aria-label={task.isStarred ? 'Quitar de Starred' : 'Agregar a Starred'}
	                        >
	                          {task.isStarred ? (
	                            <StarIcon fontSize="small" />
	                          ) : (
	                            <StarBorderIcon fontSize="small" />
	                          )}
	                        </button>
	                      </TableCell>
	
	                      {/* Business */}
                      <TableCell style={getColumnCellStyle('business')}>
                        <span className="text-sm text-slate-900 truncate block w-full" title={task.opportunity?.business?.name || ''}>
                          {task.opportunity?.business?.name || '-'}
                        </span>
                      </TableCell>

                      {/* Lifecycle (N/R) */}
                      <TableCell align="center" style={getColumnCellStyle('lifecycle')}>
                        <BusinessLifecycleBadge lifecycle={task.opportunity?.business?.businessLifecycle} />
                      </TableCell>

                      {/* Title */}
                      <TableCell style={getColumnCellStyle('title')}>
                        <div className="flex min-w-0 items-center gap-2">
                          {task.category === 'meeting' ? (
                            <GroupsIcon className="text-blue-600 flex-shrink-0" style={{ fontSize: 16 }} />
                          ) : (
                            <AssignmentIcon className="text-orange-600 flex-shrink-0" style={{ fontSize: 16 }} />
                          )}
                          <span
                            className={`min-w-0 flex-1 truncate font-medium text-sm ${task.completed ? 'line-through text-gray-500' : 'text-slate-900'}`}
                            title={task.title}
                          >
                            {task.title}
                          </span>
                        </div>
                      </TableCell>

                      {/* Description */}
                      <TableCell
                        style={getColumnCellStyle('description')}
                        className="!overflow-visible"
                      >
                        <TaskDescriptionCell text={taskDescription} mode="truncate" />
                      </TableCell>

                      {/* Responsible */}
                      <TableCell style={getColumnCellStyle('responsible')}>
                        <span
                          className="text-sm text-slate-700 truncate block w-full"
                          title={task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || ''}
                        >
                          {task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || '-'}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell style={getColumnCellStyle('date')}>
                        {(() => {
                          const daysUntil = getDaysUntil(task)
                          return (
                            <div
                              className="flex items-center gap-1.5"
                              title={getDueDateTitle(task, daysUntil)}
                            >
                              <span className="text-sm text-slate-700 whitespace-nowrap">
                                {formatShortDateNoYear(task.date)}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getDueDateBadgeStyles(daysUntil)}`}>
                                {getDaysUntilText(daysUntil)}
                              </span>
                            </div>
                          )
                        })()}
                      </TableCell>

                      {/* Stage */}
                      <TableCell style={getColumnCellStyle('stage')}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          STAGE_COLORS[task.opportunity?.stage || ''] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {STAGE_LABELS[task.opportunity?.stage || ''] || task.opportunity?.stage || '-'}
                        </span>
                      </TableCell>

                      {/* Contact Name */}
                      <TableCell style={getColumnCellStyle('contactName')}>
                        <span className="text-sm text-slate-600 truncate block w-full" title={task.opportunity?.business?.contactName || ''}>
                          {task.opportunity?.business?.contactName || '-'}
                        </span>
                      </TableCell>

                      {/* Contact Email */}
                      <TableCell style={getColumnCellStyle('contactEmail')}>
                        {task.opportunity?.business?.contactEmail ? (
                          <a 
                            href={`mailto:${task.opportunity.business.contactEmail}`}
                            className="text-sm text-blue-600 hover:underline truncate block w-full"
                            onClick={(e) => e.stopPropagation()}
                            title={task.opportunity.business.contactEmail}
                          >
                            {task.opportunity.business.contactEmail}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Contact Phone */}
                      <TableCell style={getColumnCellStyle('contactPhone')}>
                        {task.opportunity?.business?.contactPhone ? (
                          <a 
                            href={`tel:${task.opportunity.business.contactPhone}`}
                            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.opportunity.business.contactPhone}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell
                        align="right"
                        style={getColumnCellStyle('actions')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {task.opportunityId && (
                            <button
                              onClick={() => handleViewOpportunity(task.opportunityId)}
                              className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Ver Oportunidad"
                            >
                              <OpenInNewIcon style={{ fontSize: 18 }} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </EntityTable>
            </div>
          </>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setSelectedTask(null)
          setTaskCreationContext(null)
          setForCompletion(false)
        }}
        task={selectedTask}
        onSubmit={handleTaskSubmit}
        loading={savingTask}
        error={taskError}
        businessName={selectedTask?.opportunity?.business?.name || taskCreationContext?.opportunity?.business?.name || ''}
        forCompletion={forCompletion}
        responsibleName={
          selectedTask?.opportunity?.responsible?.name ||
          selectedTask?.opportunity?.responsible?.email ||
          taskCreationContext?.opportunity?.responsible?.name ||
          taskCreationContext?.opportunity?.responsible?.email
        }
        onViewOpportunity={(selectedTask?.opportunityId || taskCreationContext?.opportunityId) ? () => {
          setTaskModalOpen(false)
          const opportunityId = selectedTask?.opportunityId || taskCreationContext?.opportunityId
          if (opportunityId) handleViewOpportunity(opportunityId)
        } : undefined}
      />

      {/* Opportunity Modal */}
      {opportunityModalOpen && selectedOpportunity && (
        <OpportunityFormModal
          isOpen={opportunityModalOpen}
          onClose={() => {
            setOpportunityModalOpen(false)
            setSelectedOpportunity(null)
          }}
          opportunity={selectedOpportunity}
          onSuccess={(updatedOpportunity) => {
            loadTasks()
          }}
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
    </div>
  )
}
