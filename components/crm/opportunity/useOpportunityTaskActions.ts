'use client'

import { useCallback, useState, useTransition } from 'react'
import { createTask, updateTask, deleteTask } from '@/app/actions/crm'
import { useTaskCompletionFollowUp } from '@/hooks/useTaskCompletionFollowUp'
import { formatDateForPanama } from '@/lib/date/timezone'
import type { Opportunity, OpportunityStage, Task } from '@/types'
import { parseMeetingData, type MeetingData } from './TaskModal'
import type { ClassifiedActivityFields } from './useActivityDictation'
import {
  normalizeAutomationStage,
  shouldAutoCompleteTask,
  shouldRequireMeetingOutcomeBeforeCompletion,
} from './opportunityAutomationLogic'

interface ConfirmDialogLike {
  confirm: (options: {
    title?: string
    message: string | React.ReactNode
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'danger' | 'primary' | 'success'
  }) => Promise<boolean>
}

interface UseOpportunityTaskActionsOptions {
  opportunity?: Opportunity | null
  stage: OpportunityStage
  stageRef: React.MutableRefObject<string>
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  setError: (message: string) => void
  confirmDialog: ConfirmDialogLike
  onLog: (event: string, payload?: Record<string, unknown>) => void
  evaluateShouldRunMeetingAutomation: (params: {
    previousMeetingData: MeetingData | null
    currentMeetingData: MeetingData | null
    wasCompletedBefore: boolean
    isCompletedNow: boolean
  }) => boolean
  queueMeetingCompletionPipelineAutomation: (meetingData: MeetingData | null, capturedStage: string) => void
}

export function useOpportunityTaskActions({
  opportunity,
  stage,
  stageRef,
  tasks,
  setTasks,
  setError,
  confirmDialog,
  onLog,
  evaluateShouldRunMeetingAutomation,
  queueMeetingCompletionPipelineAutomation,
}: UseOpportunityTaskActionsOptions) {
  const [isTaskPending, startTaskTransition] = useTransition()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [taskPrefill, setTaskPrefill] = useState<ClassifiedActivityFields | null>(null)
  const [togglingTaskIds, setTogglingTaskIds] = useState<Set<string>>(new Set())

  const openTaskModal = useCallback((task?: Task, forCompletion = false) => {
    setSelectedTask(task || null)
    setTaskPrefill(null)
    if (!forCompletion) {
      setCompletingTaskId(null)
    }
    setTaskModalOpen(true)
  }, [])

  const closeTaskModal = useCallback(() => {
    setTaskModalOpen(false)
    setSelectedTask(null)
    setCompletingTaskId(null)
    setTaskPrefill(null)
  }, [])

  const taskCompletionFollowUp = useTaskCompletionFollowUp<Task>({
    confirmDialog,
    onOpenNewTask: () => {
      setError('')
      openTaskModal()
    },
    onLog: (event, payload) => {
      onLog(`completionFollowUp:${event}`, payload)
    },
  })

  const handleTaskSubmit = useCallback((data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }, options?: {
    markCompleted?: boolean
  }) => {
    if (!opportunity) {
      setError('Por favor guarde la oportunidad primero antes de agregar tareas')
      return
    }

    onLog('handleTaskSubmit:start', {
      category: data.category,
      selectedTaskId: selectedTask?.id || null,
      completingTaskId: completingTaskId || null,
      stage,
      runtimeStage: stageRef.current,
      normalizedRuntimeStage: normalizeAutomationStage(stageRef.current),
      hasNotes: !!data.notes,
    })

    setError('')

    startTaskTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('opportunityId', opportunity.id)
        formData.append('category', data.category)
        formData.append('title', data.title)
        formData.append('date', data.date)
        if (data.notes) formData.append('notes', data.notes)

        const newTask: Task = {
          id: selectedTask?.id || 'temp-' + Date.now(),
          opportunityId: opportunity.id,
          category: data.category,
          title: data.title,
          date: new Date(data.date),
          completed: false,
          notes: data.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        if (selectedTask) {
          setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? newTask : t))
        } else {
          setTasks((prev) => [...prev, newTask])
        }

        const result = selectedTask
          ? await updateTask(selectedTask.id, formData)
          : await createTask(formData)

        if (result.success && result.data) {
          let updatedTask = result.data
          const taskId = selectedTask?.id || result.data.id
          const wasCompletedBefore = !!selectedTask?.completed
          const previousMeetingData = selectedTask?.category === 'meeting'
            ? parseMeetingData(selectedTask.notes)
            : null
          const meetingData = data.category === 'meeting'
            ? parseMeetingData(data.notes)
            : null

          onLog('handleTaskSubmit:task_saved', {
            taskId,
            category: data.category,
            wasCompletedBefore,
            isCompletedAfterSave: updatedTask.completed,
            parsedMeetingData: !!meetingData,
            reachedAgreement: meetingData?.reachedAgreement || null,
            hasNextSteps: !!meetingData?.nextSteps?.trim(),
          })

          const shouldComplete = shouldAutoCompleteTask({
            markCompleted: options?.markCompleted,
            completingTaskId,
            selectedTaskId: selectedTask?.id || null,
            meetingData,
          })

          if (shouldComplete && !updatedTask.completed) {
            const completeFormData = new FormData()
            completeFormData.append('category', data.category)
            completeFormData.append('title', data.title)
            completeFormData.append('date', data.date)
            completeFormData.append('completed', 'true')
            completeFormData.append('notes', data.notes || '')

            const completeResult = await updateTask(taskId, completeFormData)
            if (completeResult.success && completeResult.data) {
              updatedTask = completeResult.data
            }
          }
          setCompletingTaskId(null)

          if (selectedTask) {
            setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? updatedTask : t))
          } else {
            setTasks((prev) => prev.map((t) => t.id === newTask.id ? updatedTask : t))
          }

          setTaskModalOpen(false)
          setSelectedTask(null)
          setTaskPrefill(null)

          const completedFromModal = selectedTask
            ? !selectedTask.completed && updatedTask.completed
            : updatedTask.completed

          const shouldRunAutomation = data.category === 'meeting' && evaluateShouldRunMeetingAutomation({
            previousMeetingData,
            currentMeetingData: meetingData,
            wasCompletedBefore,
            isCompletedNow: updatedTask.completed,
          })

          onLog('handleTaskSubmit:automation_decision', {
            shouldRunAutomation,
            category: data.category,
          })

          if (shouldRunAutomation) {
            queueMeetingCompletionPipelineAutomation(meetingData, stage)
          }

          if (completedFromModal) {
            await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(updatedTask, data.notes)
          }
        } else {
          if (selectedTask) {
            setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? selectedTask : t))
          } else {
            setTasks((prev) => prev.filter((t) => t.id !== newTask.id))
          }
          setCompletingTaskId(null)
          setError(result.error || 'Error al guardar la tarea')
        }
      } catch {
        if (selectedTask) {
          setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? selectedTask : t))
        } else {
          setTasks((prev) => prev.filter((t) => !t.id.startsWith('temp-')))
        }
        setCompletingTaskId(null)
        setError('An error occurred')
      }
    })
  }, [
    completingTaskId,
    evaluateShouldRunMeetingAutomation,
    onLog,
    opportunity,
    queueMeetingCompletionPipelineAutomation,
    selectedTask,
    setError,
    setTasks,
    stage,
    stageRef,
    taskCompletionFollowUp,
  ])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Tarea',
      message: '¿Está seguro de que desea eliminar esta tarea? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    const taskToDelete = tasks.find((t) => t.id === taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    startTaskTransition(async () => {
      try {
        const result = await deleteTask(taskId)
        if (!result.success) {
          if (taskToDelete) {
            setTasks((prev) => [...prev, taskToDelete].sort((a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
            ))
          }
          setError(result.error || 'Error al eliminar la tarea')
        }
      } catch {
        if (taskToDelete) {
          setTasks((prev) => [...prev, taskToDelete].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ))
        }
        setError('An error occurred')
      }
    })
  }, [confirmDialog, setError, setTasks, tasks])

  const handleToggleTaskComplete = useCallback(async (task: Task) => {
    const existingMeetingData = task.category === 'meeting' ? parseMeetingData(task.notes) : null

    onLog('handleToggleTaskComplete:start', {
      taskId: task.id,
      category: task.category,
      currentlyCompleted: task.completed,
      hasExistingMeetingData: !!existingMeetingData,
      reachedAgreement: existingMeetingData?.reachedAgreement || null,
      hasNextSteps: !!existingMeetingData?.nextSteps?.trim(),
      stage,
      runtimeStage: stageRef.current,
      normalizedRuntimeStage: normalizeAutomationStage(stageRef.current),
    })

    if (shouldRequireMeetingOutcomeBeforeCompletion({
      category: task.category,
      completed: task.completed,
      meetingData: existingMeetingData,
    })) {
      onLog('handleToggleTaskComplete:open_modal_for_completion', {
        taskId: task.id,
        reason: !existingMeetingData ? 'missing_meeting_data' : 'missing_next_steps',
      })
      setCompletingTaskId(task.id)
      openTaskModal(task, true)
      return
    }

    const newCompletedState = !task.completed
    const isCompleting = !task.completed
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newCompletedState } : t))
    setTogglingTaskIds((prev) => new Set(prev).add(task.id))

    try {
      const formData = new FormData()
      formData.append('category', task.category)
      formData.append('title', task.title)
      formData.append('date', formatDateForPanama(new Date(task.date)))
      formData.append('completed', newCompletedState.toString())
      formData.append('notes', task.notes || '')

      const result = await updateTask(task.id, formData)
      if (result.success && result.data) {
        setTasks((prev) => prev.map((t) => t.id === task.id ? result.data : t))

        onLog('handleToggleTaskComplete:update_success', {
          taskId: task.id,
          newCompletedState,
        })

        if (task.category === 'meeting' && isCompleting) {
          const completedMeetingData = parseMeetingData(result.data.notes)
          onLog('handleToggleTaskComplete:queue_automation', {
            taskId: task.id,
            reachedAgreement: completedMeetingData?.reachedAgreement || null,
            hasNextSteps: !!completedMeetingData?.nextSteps?.trim(),
          })
          queueMeetingCompletionPipelineAutomation(completedMeetingData, stage)
        }

        if (isCompleting) {
          await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(result.data)
        }
      } else {
        onLog('handleToggleTaskComplete:update_failed', {
          taskId: task.id,
          error: result.error || 'unknown',
        })
        setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: task.completed } : t))
      }
    } catch {
      onLog('handleToggleTaskComplete:exception', {
        taskId: task.id,
      })
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: task.completed } : t))
    } finally {
      setTogglingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }, [
    onLog,
    openTaskModal,
    queueMeetingCompletionPipelineAutomation,
    setTasks,
    stage,
    stageRef,
    taskCompletionFollowUp,
  ])

  return {
    isTaskPending,
    taskModalOpen,
    selectedTask,
    completingTaskId,
    taskPrefill,
    togglingTaskIds,
    setTaskPrefill,
    openTaskModal,
    closeTaskModal,
    handleTaskSubmit,
    handleDeleteTask,
    handleToggleTaskComplete,
  }
}
