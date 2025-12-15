'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { getUserTasks, toggleTaskComplete, type TaskWithOpportunity } from '@/app/actions/tasks'
import { updateTask, deleteTask } from '@/app/actions/opportunities'
import { getOpportunity } from '@/app/actions/crm'
import type { Opportunity } from '@/types'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupsIcon from '@mui/icons-material/Groups'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { formatShortDate, formatRelativeTime } from '@/lib/utils/date-format'
import { EntityPageHeader, type FilterTab } from '@/components/shared'

// Lazy load modals
const TaskModal = dynamic(() => import('@/components/crm/opportunity/TaskModal'), {
  loading: () => null,
  ssr: false,
})

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

type FilterType = 'all' | 'pending' | 'completed' | 'overdue' | 'meetings' | 'todos'

export default function TasksPageClient() {
  const { isAdmin } = useUserRole()
  const confirmDialog = useConfirmDialog()

  const [tasks, setTasks] = useState<TaskWithOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithOpportunity | null>(null)
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [loadingOpportunity, setLoadingOpportunity] = useState(false)

  // Load tasks
  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getUserTasks()
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
    loadTasks()
  }, [loadTasks])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks

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
  }, [tasks, activeFilter, searchQuery])

  // Count for filters
  const counts = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return {
      all: tasks.length,
      pending: tasks.filter(t => !t.completed).length,
      completed: tasks.filter(t => t.completed).length,
      overdue: tasks.filter(t => !t.completed && new Date(t.date) < now).length,
      meetings: tasks.filter(t => t.category === 'meeting').length,
      todos: tasks.filter(t => t.category === 'todo').length,
    }
  }, [tasks])

  // Handle toggle complete
  const handleToggleComplete = async (task: TaskWithOpportunity) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))

    const result = await toggleTaskComplete(task.id)
    if (!result.success) {
      // Revert
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t))
      toast.error(result.error || 'Failed to update task')
    }
  }

  // Handle edit task
  const handleEditTask = (task: TaskWithOpportunity) => {
    setSelectedTask(task)
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
      formData.append('completed', selectedTask.completed.toString())
      formData.append('notes', data.notes)

      const result = await updateTask(selectedTask.id, formData)

      if (result.success) {
        toast.success('Tarea actualizada')
        setTaskModalOpen(false)
        setSelectedTask(null)
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
        entityType="opportunities" // Tasks are related to opportunities, using this for type safety
        searchPlaceholder="Buscar tareas..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTabs={filterTabs}
        activeFilter={activeFilter}
        onFilterChange={(id) => setActiveFilter(id as FilterType)}
        savedFilters={[]} // Tasks don't have saved filters
        activeFilterId={null}
        onFilterSelect={() => {}} // No-op since no saved filters
        onAdvancedFiltersChange={() => {}} // No-op since no advanced filters for tasks
        onSavedFiltersChange={() => {}} // No-op since no saved filters
        isAdmin={isAdmin}
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
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <AssignmentIcon className="text-gray-300 mx-auto mb-3" style={{ fontSize: 48 }} />
            <p className="text-gray-500 font-medium">No hay tareas</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeFilter !== 'all'
                ? 'No hay tareas que coincidan con el filtro seleccionado'
                : 'Las tareas aparecerán aquí cuando se creen en las oportunidades'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task)
              const today = isDueToday(task)

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg border transition-all hover:shadow-sm ${
                    task.completed
                      ? 'border-gray-100 opacity-60'
                      : overdue
                      ? 'border-red-200 bg-red-50/30'
                      : today
                      ? 'border-orange-200 bg-orange-50/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Complete toggle */}
                      <button
                        onClick={() => handleToggleComplete(task)}
                        className={`mt-0.5 flex-shrink-0 transition-colors ${
                          task.completed
                            ? 'text-green-500 hover:text-green-600'
                            : 'text-gray-300 hover:text-gray-400'
                        }`}
                        title={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                      >
                        {task.completed ? (
                          <CheckCircleIcon fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon fontSize="small" />
                        )}
                      </button>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Category icon */}
                          {task.category === 'meeting' ? (
                            <GroupsIcon fontSize="small" className="text-blue-500" />
                          ) : (
                            <AssignmentIcon fontSize="small" className="text-orange-500" />
                          )}

                          {/* Title */}
                          <span className={`font-medium text-sm ${
                            task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}>
                            {task.title}
                          </span>

                          {/* Due date badge */}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.completed
                              ? 'bg-gray-100 text-gray-500'
                              : overdue
                              ? 'bg-red-100 text-red-700 font-medium'
                              : today
                              ? 'bg-orange-100 text-orange-700 font-medium'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {overdue ? 'Vencida: ' : today ? 'Hoy: ' : ''}
                            {formatShortDate(task.date)}
                          </span>
                        </div>

                        {/* Business and opportunity info */}
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-gray-500">
                          <span className="font-medium text-gray-700">
                            {task.opportunity?.business?.name || 'Sin negocio'}
                          </span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            STAGE_COLORS[task.opportunity?.stage || ''] || 'bg-gray-100 text-gray-600'
                          }`}>
                            {STAGE_LABELS[task.opportunity?.stage || ''] || task.opportunity?.stage}
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(task.createdAt)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleViewOpportunity(task.opportunityId)}
                          disabled={loadingOpportunity}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ver oportunidad"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </button>
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          title="Editar tarea"
                        >
                          <EditIcon fontSize="small" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteTask(task)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar tarea"
                          >
                            <DeleteIcon fontSize="small" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setSelectedTask(null)
        }}
        task={selectedTask}
        onSubmit={handleTaskSubmit}
        loading={savingTask}
        error={taskError}
        businessName={selectedTask?.opportunity?.business?.name || ''}
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
            // Reload tasks when opportunity is updated (tasks might have changed)
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

