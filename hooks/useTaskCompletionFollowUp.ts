'use client'

import { useCallback } from 'react'
import type { ReactNode } from 'react'
import { parseMeetingData } from '@/components/crm/opportunity/TaskModal'

type CompletionPromptTask = {
  id: string
  category: 'meeting' | 'todo'
  notes: string | null
}

interface ConfirmDialogLike {
  confirm: (options: {
    title?: string
    message: string | ReactNode
    confirmText?: string
    cancelText?: string
    confirmVariant?: 'danger' | 'primary' | 'success'
  }) => Promise<boolean>
}

interface UseTaskCompletionFollowUpOptions<TTask extends CompletionPromptTask> {
  confirmDialog: ConfirmDialogLike
  onOpenNewTask: (task: TTask) => void
  onLog?: (event: string, payload?: Record<string, unknown>) => void
}

export function useTaskCompletionFollowUp<TTask extends CompletionPromptTask>({
  confirmDialog,
  onOpenNewTask,
  onLog,
}: UseTaskCompletionFollowUpOptions<TTask>) {
  const canOfferNewTaskAfterCompletion = useCallback((task: TTask, notesOverride?: string | null): boolean => {
    if (task.category !== 'meeting') return true
    const meetingData = parseMeetingData(notesOverride ?? task.notes ?? null)
    return meetingData?.reachedAgreement === 'no'
  }, [])

  const maybeOfferNewTaskAfterCompletion = useCallback(async (task: TTask, notesOverride?: string | null) => {
    if (!canOfferNewTaskAfterCompletion(task, notesOverride)) {
      onLog?.('skip_not_eligible', {
        taskId: task.id,
        category: task.category,
      })
      return
    }

    const openNewTask = await confirmDialog.confirm({
      title: 'Tarea completada',
      message: '¿Desea abrir una nueva tarea para continuar el seguimiento de esta oportunidad?',
      confirmText: 'Sí, abrir nueva',
      cancelText: 'No',
      confirmVariant: 'primary',
    })

    onLog?.('prompt_result', {
      taskId: task.id,
      openNewTask,
    })

    if (openNewTask) {
      onOpenNewTask(task)
    }
  }, [canOfferNewTaskAfterCompletion, confirmDialog, onOpenNewTask, onLog])

  return {
    canOfferNewTaskAfterCompletion,
    maybeOfferNewTaskAfterCompletion,
  }
}
