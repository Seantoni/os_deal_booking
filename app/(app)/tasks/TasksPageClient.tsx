'use client'

import { useState, useEffect, useMemo, useCallback, useOptimistic, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { getUserTasks, toggleTaskComplete, getTaskCounts, type TaskWithOpportunity } from '@/app/actions/tasks'
import { createTask, updateTask, deleteTask } from '@/app/actions/opportunities'
import { getOpportunity } from '@/app/actions/crm'
import type { Opportunity } from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useTaskCompletionFollowUp } from '@/hooks/useTaskCompletionFollowUp'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useSharedData } from '@/hooks/useSharedData'
import { useFormConfigCache } from '@/hooks/useFormConfigCache'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupsIcon from '@mui/icons-material/Groups'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import PersonIcon from '@mui/icons-material/Person'
import { formatRelativeTime, getTodayInPanama, formatDateForPanama, formatShortDateNoYear, daysUntil } from '@/lib/date'
import {
  EntityPageHeader,
  UserFilterDropdown,
  type FilterTab,
  type ColumnConfig
} from '@/components/shared'
import { EntityTable, CellStack, TableRow, TableCell } from '@/components/shared/table'
import { sortEntities, type SortDirection } from '@/hooks/useEntityPage'

// Lazy load modals
const TaskModal = dynamic(() => import('@/components/crm/opportunity/TaskModal'), {
  loading: () => null,
  ssr: false,
})

// Import parseMeetingData for validation
import { parseMeetingData } from '@/components/crm/opportunity/TaskModal'

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
  { key: 'status', label: '', width: 'w-[40px]', align: 'center' },
  { key: 'title', label: 'Tarea', sortable: true, width: 'w-[122px]' },
  { key: 'responsible', label: 'Responsable', sortable: true, width: 'w-[80px]' },
  { key: 'date', label: 'Vencimiento', sortable: true, width: 'w-[77px]' },
  { key: 'business', label: 'Negocio', sortable: true, width: 'w-[93px]' },
  { key: 'stage', label: 'Etapa', sortable: true, width: 'w-[64px]' },
  { key: 'contactName', label: 'Contacto', width: 'w-[88px]' },
  { key: 'contactEmail', label: 'Email', width: 'w-[140px]' },
  { key: 'contactPhone', label: 'Teléfono', width: 'w-[77px]' },
  { key: 'actions', label: '', width: 'w-[48px]', align: 'right' },
]

type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'meetings' | 'todos'

export default function TasksPageClient() {
  const { isAdmin } = useUserRole()
  const { users } = useSharedData()
  const confirmDialog = useConfirmDialog()
  
  // Get form config cache for prefetching
  const { prefetch: prefetchFormConfig } = useFormConfigCache()

  const [tasks, setTasks] = useState<TaskWithOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('pending')
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null)
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({})
  
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
  const [isToggling, startToggleTransition] = useTransition()

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

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
      
      // Also load counts
      const countsResult = await getTaskCounts(filters)
      if (countsResult.success && countsResult.data) {
        setServerCounts(countsResult.data)
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

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter tasks - uses optimisticTasks for instant UI feedback
  const filteredTasks = useMemo(() => {
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

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return sortEntities(filteredTasks, sortColumn, sortDirection, (task, column) => {
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
  }, [filteredTasks, sortColumn, sortDirection])

  // Count for filters - uses server counts when available, falls back to optimistic counts
  const counts = useMemo(() => {
    if (Object.keys(serverCounts).length > 0) {
      return serverCounts
    }
    // Fallback to client-side counts (using Panama timezone)
    const todayStr = getTodayInPanama()
    return {
      all: optimisticTasks.length,
      pending: optimisticTasks.filter(t => !t.completed).length,
      completed: optimisticTasks.filter(t => t.completed).length,
      overdue: optimisticTasks.filter(t => !t.completed && formatDateForPanama(new Date(t.date)) < todayStr).length,
      meetings: optimisticTasks.filter(t => t.category === 'meeting').length,
      todos: optimisticTasks.filter(t => t.category === 'todo').length,
    }
  }, [optimisticTasks, serverCounts])

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
    // If trying to complete a meeting, check if outcome fields are filled
    if (task.category === 'meeting' && !task.completed) {
      const meetingData = parseMeetingData(task.notes || null)
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
          void taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(task)
        }
      } else {
        // On failure, the optimistic state will automatically revert when transition ends
        toast.error(result.error || 'Failed to update task')
      }
    })
  }

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

        await loadTasks()

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

  const filterTabs: FilterTab[] = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'overdue', label: 'Vencidas', count: counts.overdue },
    { id: 'completed', label: 'Completadas', count: counts.completed },
    { id: 'meetings', label: 'Reuniones', count: counts.meetings },
    { id: 'todos', label: 'To-dos', count: counts.todos },
  ]

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        searchPlaceholder="Buscar tareas..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={activeFilter}
        onFilterChange={(id) => setActiveFilter(id as FilterType)}
        isAdmin={isAdmin}
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
        {loading ? (
          <div className="space-y-2 p-4 md:p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
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
                columns={COLUMNS}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                {sortedTasks.map((task, index) => {
                  return (
                    <TableRow 
                      key={task.id} 
                      index={index}
                      onClick={() => handleEditTask(task)}
                      onMouseEnter={() => prefetchFormConfig('opportunity')}
                      className={task.completed ? 'opacity-60' : ''}
                    >
                      {/* Status */}
                      <TableCell align="center" className="w-[40px] px-0" onClick={(e) => e.stopPropagation()}>
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

                      {/* Title */}
                      <TableCell className="w-[122px]">
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
                          {task.notes && (
                            <span className="text-slate-400 text-xs truncate max-w-[68px]" title={task.notes}>
                              - {task.notes}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Responsible */}
                      <TableCell className="w-[80px]">
                        <span
                          className="text-sm text-slate-700 truncate block max-w-[80px]"
                          title={task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || ''}
                        >
                          {task.opportunity?.responsible?.name || task.opportunity?.responsible?.email || '-'}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="w-[77px]">
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

                      {/* Business */}
                      <TableCell className="w-[93px]">
                        <span className="text-sm text-slate-900 truncate block w-full" title={task.opportunity?.business?.name || ''}>
                          {task.opportunity?.business?.name || '-'}
                        </span>
                      </TableCell>

                      {/* Stage */}
                      <TableCell className="w-[64px]">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          STAGE_COLORS[task.opportunity?.stage || ''] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {STAGE_LABELS[task.opportunity?.stage || ''] || task.opportunity?.stage || '-'}
                        </span>
                      </TableCell>

                      {/* Contact Name */}
                      <TableCell className="w-[88px]">
                        <span className="text-sm text-slate-600 truncate block w-full" title={task.opportunity?.business?.contactName || ''}>
                          {task.opportunity?.business?.contactName || '-'}
                        </span>
                      </TableCell>

                      {/* Contact Email */}
                      <TableCell className="w-[140px]">
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
                      <TableCell className="w-[77px]">
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
                      <TableCell align="right" className="w-[48px]" onClick={(e) => e.stopPropagation()}>
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
