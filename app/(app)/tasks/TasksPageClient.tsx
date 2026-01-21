'use client'

import { useState, useEffect, useMemo, useCallback, useOptimistic, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { getUserTasks, toggleTaskComplete, getTaskCounts, type TaskWithOpportunity } from '@/app/actions/tasks'
import { updateTask, deleteTask } from '@/app/actions/opportunities'
import { getOpportunity } from '@/app/actions/crm'
import type { Opportunity } from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
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
import { formatShortDate, formatRelativeTime } from '@/lib/date'
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
  { key: 'status', label: '', width: 'w-10', align: 'center' },
  { key: 'title', label: 'Tarea', sortable: true },
  { key: 'category', label: 'Tipo', sortable: true, width: 'w-24', align: 'center' },
  { key: 'date', label: 'Vencimiento', sortable: true, width: 'w-32' },
  { key: 'business', label: 'Negocio', sortable: true },
  { key: 'stage', label: 'Etapa', sortable: true, width: 'w-32' },
  { key: 'contactName', label: 'Contacto', width: 'w-32' },
  { key: 'contactEmail', label: 'Email', width: 'w-48' },
  { key: 'contactPhone', label: 'Teléfono', width: 'w-32' },
  { key: 'actions', label: '', width: 'w-16', align: 'right' },
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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
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

    // Apply status filter
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    switch (activeFilter) {
      case 'pending':
        filtered = filtered.filter(t => !t.completed)
        break
      case 'completed':
        filtered = filtered.filter(t => t.completed)
        break
      case 'overdue':
        filtered = filtered.filter(t => !t.completed && new Date(t.date) < now)
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
    // Fallback to client-side counts
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return {
      all: optimisticTasks.length,
      pending: optimisticTasks.filter(t => !t.completed).length,
      completed: optimisticTasks.filter(t => t.completed).length,
      overdue: optimisticTasks.filter(t => !t.completed && new Date(t.date) < now).length,
      meetings: optimisticTasks.filter(t => t.category === 'meeting').length,
      todos: optimisticTasks.filter(t => t.category === 'todo').length,
    }
  }, [optimisticTasks, serverCounts])

  // React 19: Handle toggle complete using useOptimistic for instant UI update
  const handleToggleComplete = (task: TaskWithOpportunity) => {
    // If trying to complete a meeting, check if outcome fields are filled
    if (task.category === 'meeting' && !task.completed) {
      const meetingData = parseMeetingData(task.notes || null)
      // Meeting outcome fields must be filled (nextSteps) before completing
      const hasNextSteps = meetingData?.nextSteps?.trim()
      if (!meetingData || !hasNextSteps) {
        // Open task modal for editing with forCompletion flag
        setSelectedTask(task)
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
      } else {
        // On failure, the optimistic state will automatically revert when transition ends
        toast.error(result.error || 'Failed to update task')
      }
    })
  }

  // Handle edit task
  const handleEditTask = (task: TaskWithOpportunity) => {
    setSelectedTask(task)
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
  }) => {
    if (!selectedTask) return

    setSavingTask(true)
    setTaskError('')

    try {
      const formData = new FormData()
      formData.append('category', data.category)
      formData.append('title', data.title)
      formData.append('date', data.date)
      // If forCompletion is true, mark as completed after saving
      formData.append('completed', forCompletion ? 'true' : selectedTask.completed.toString())
      formData.append('notes', data.notes)

      const result = await updateTask(selectedTask.id, formData)

      if (result.success) {
        toast.success(forCompletion ? 'Tarea completada' : 'Tarea actualizada')
        setTaskModalOpen(false)
        setSelectedTask(null)
        setForCompletion(false)
        await loadTasks()
      } else {
        setTaskError(result.error || 'Failed to update task')
      }
    } catch (error) {
      setTaskError('An error occurred')
    } finally {
      setSavingTask(false)
    }
  }

  // Check if task is overdue
  const isOverdue = (task: TaskWithOpportunity) => {
    if (task.completed) return false
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return new Date(task.date) < now
  }

  // Check if task is due today
  const isDueToday = (task: TaskWithOpportunity) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(task.date)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() === today.getTime()
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
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {loading ? (
          <div className="space-y-2">
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
          <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
            <AssignmentIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
            <p className="text-gray-500 font-medium">No hay tareas</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeFilter !== 'all'
                ? 'No hay tareas que coincidan con el filtro seleccionado'
                : 'Las tareas aparecerán aquí cuando se creen en las oportunidades'}
            </p>
          </div>
        ) : (
          <EntityTable
            columns={COLUMNS}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          >
            {sortedTasks.map((task, index) => {
              const overdue = isOverdue(task)
              const today = isDueToday(task)

              return (
                <TableRow 
                  key={task.id} 
                  index={index}
                  onClick={() => handleEditTask(task)}
                  onMouseEnter={() => prefetchFormConfig('opportunity')}
                  className={task.completed ? 'opacity-60' : ''}
                >
                  {/* Status */}
                  <TableCell align="center" className="w-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={`transition-colors ${
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium whitespace-nowrap text-[13px] ${task.completed ? 'line-through text-gray-500' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                      {task.notes && (
                        <span className="text-slate-400 text-xs truncate max-w-[200px]" title={task.notes}>
                          - {task.notes}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell align="center">
                    <div className="flex justify-center">
                      {task.category === 'meeting' ? (
                        <div className="text-blue-600" title="Reunión">
                          <GroupsIcon fontSize="small" />
                        </div>
                      ) : (
                        <div className="text-orange-600" title="To-do">
                          <AssignmentIcon fontSize="small" />
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <span className={`text-[13px] whitespace-nowrap ${
                      overdue 
                        ? 'text-red-600 font-medium' 
                        : today 
                        ? 'text-orange-600 font-medium' 
                        : 'text-slate-700'
                    }`}>
                      {formatShortDate(task.date)}
                    </span>
                  </TableCell>

                  {/* Business */}
                  <TableCell>
                    <span className="text-[13px] text-slate-900 truncate block max-w-[180px]" title={task.opportunity?.business?.name || ''}>
                      {task.opportunity?.business?.name || '-'}
                    </span>
                  </TableCell>

                  {/* Stage */}
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${
                      STAGE_COLORS[task.opportunity?.stage || ''] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {STAGE_LABELS[task.opportunity?.stage || ''] || task.opportunity?.stage || '-'}
                    </span>
                  </TableCell>

                  {/* Contact Name */}
                  <TableCell>
                    <span className="text-[13px] text-slate-600 truncate block max-w-[120px]" title={task.opportunity?.business?.contactName || ''}>
                      {task.opportunity?.business?.contactName || '-'}
                    </span>
                  </TableCell>

                  {/* Contact Email */}
                  <TableCell>
                    {task.opportunity?.business?.contactEmail ? (
                      <a 
                        href={`mailto:${task.opportunity.business.contactEmail}`}
                        className="text-[13px] text-blue-600 hover:underline truncate block max-w-[180px]"
                        onClick={(e) => e.stopPropagation()}
                        title={task.opportunity.business.contactEmail}
                      >
                        {task.opportunity.business.contactEmail}
                      </a>
                    ) : (
                      <span className="text-[13px] text-slate-400">-</span>
                    )}
                  </TableCell>

                  {/* Contact Phone */}
                  <TableCell>
                    {task.opportunity?.business?.contactPhone ? (
                      <a 
                        href={`tel:${task.opportunity.business.contactPhone}`}
                        className="text-[13px] text-blue-600 hover:underline whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.opportunity.business.contactPhone}
                      </a>
                    ) : (
                      <span className="text-[13px] text-slate-400">-</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setSelectedTask(null)
          setForCompletion(false)
        }}
        task={selectedTask}
        onSubmit={handleTaskSubmit}
        loading={savingTask}
        error={taskError}
        businessName={selectedTask?.opportunity?.business?.name || ''}
        forCompletion={forCompletion}
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
