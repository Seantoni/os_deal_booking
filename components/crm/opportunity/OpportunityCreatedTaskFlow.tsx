'use client'

import { useEffect, useMemo, useState } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import AddTaskIcon from '@mui/icons-material/AddTask'
import type { Opportunity, Task } from '@/types'
import { createTask } from '@/app/actions/crm'
import { Button } from '@/components/ui'
import TaskModal from './TaskModal'
import type { ClassifiedActivityFields } from './useActivityDictation'
import { formatDateForPanama, parseDateInPanamaTime } from '@/lib/date/timezone'
import toast from 'react-hot-toast'

interface OpportunityCreatedTaskFlowProps {
  isOpen: boolean
  opportunity: Opportunity | null
  onClose: () => void
  onTaskCreated?: (task: Task) => void | Promise<void>
  zIndex?: number
}

function getSuggestedDueDate(createdAt: Date): string {
  const createdDay = formatDateForPanama(createdAt)
  const nextDay = parseDateInPanamaTime(createdDay)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return formatDateForPanama(nextDay)
}

function formatDueDateLabel(date: string): string {
  return new Intl.DateTimeFormat('es-PA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateInPanamaTime(date))
}

export default function OpportunityCreatedTaskFlow({
  isOpen,
  opportunity,
  onClose,
  onTaskCreated,
  zIndex = 80,
}: OpportunityCreatedTaskFlowProps) {
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [promptError, setPromptError] = useState('')
  const [taskError, setTaskError] = useState('')
  const [creatingSuggestedTask, setCreatingSuggestedTask] = useState(false)
  const [creatingCustomTask, setCreatingCustomTask] = useState(false)

  useEffect(() => {
    if (isOpen) return
    setTaskModalOpen(false)
    setPromptError('')
    setTaskError('')
    setCreatingSuggestedTask(false)
    setCreatingCustomTask(false)
  }, [isOpen])

  const suggestedDueDate = useMemo(() => {
    if (!opportunity) return ''
    return getSuggestedDueDate(new Date(opportunity.createdAt))
  }, [opportunity])

  const suggestedTaskPrefill = useMemo<ClassifiedActivityFields | null>(() => {
    if (!opportunity || !suggestedDueDate) return null

    return {
      category: 'todo',
      title: 'Contacto inicial',
      notes: null,
      dueDate: suggestedDueDate,
      meetingWith: null,
      position: null,
      isDecisionMaker: null,
      meetingDetails: null,
      reachedAgreement: null,
      mainObjection: null,
      objectionSolution: null,
      nextSteps: null,
    }
  }, [opportunity, suggestedDueDate])

  const closeFlow = () => {
    if (creatingSuggestedTask || creatingCustomTask) return
    setTaskModalOpen(false)
    setPromptError('')
    setTaskError('')
    onClose()
  }

  const finishFlow = () => {
    setTaskModalOpen(false)
    setPromptError('')
    setTaskError('')
    onClose()
  }

  const notifyTaskCreated = async (task: Task) => {
    try {
      await onTaskCreated?.(task)
    } catch {
      // Ignore refresh callback errors and keep the primary create action successful.
    }
  }

  const handleSuggestedTaskCreate = async () => {
    if (!opportunity || !suggestedDueDate) return

    setPromptError('')
    setCreatingSuggestedTask(true)

    try {
      const formData = new FormData()
      formData.append('opportunityId', opportunity.id)
      formData.append('category', 'todo')
      formData.append('title', 'Contacto inicial')
      formData.append('date', suggestedDueDate)

      const result = await createTask(formData)
      if (!result.success || !result.data) {
        setPromptError(result.error || 'No se pudo crear la tarea sugerida.')
        return
      }

      toast.success('Tarea creada')
      await notifyTaskCreated(result.data as Task)
      finishFlow()
    } catch {
      setPromptError('No se pudo crear la tarea sugerida.')
    } finally {
      setCreatingSuggestedTask(false)
    }
  }

  const handleCustomTaskSubmit = async (data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }) => {
    if (!opportunity) return

    setTaskError('')
    setCreatingCustomTask(true)

    try {
      const formData = new FormData()
      formData.append('opportunityId', opportunity.id)
      formData.append('category', data.category)
      formData.append('title', data.title)
      formData.append('date', data.date)
      if (data.notes) {
        formData.append('notes', data.notes)
      }

      const result = await createTask(formData)
      if (!result.success || !result.data) {
        setTaskError(result.error || 'No se pudo crear la tarea.')
        return
      }

      toast.success('Tarea creada')
      await notifyTaskCreated(result.data as Task)
      finishFlow()
    } catch {
      setTaskError('No se pudo crear la tarea.')
    } finally {
      setCreatingCustomTask(false)
    }
  }

  if (!isOpen || !opportunity || !suggestedTaskPrefill) {
    return null
  }

  return (
    <>
      {!taskModalOpen && (
        <div className="fixed inset-0" style={{ zIndex }}>
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
            style={{ zIndex }}
            onClick={() => {
              if (!creatingSuggestedTask) {
                closeFlow()
              }
            }}
          />

          <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: zIndex + 1 }}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <TaskAltIcon fontSize="small" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                      Oportunidad creada
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Crear tarea de seguimiento
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Desea abrir una nueva tarea para esta oportunidad?
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="p-1.5"
                  onClick={closeFlow}
                  disabled={creatingSuggestedTask}
                  aria-label="Cerrar"
                >
                  <CloseIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4 px-5 py-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Sugerencia
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-gray-900">Contacto inicial</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Fecha sugerida: {formatDueDateLabel(suggestedDueDate)}
                      </p>
                      {opportunity.business?.name && (
                        <p className="mt-1 text-sm text-gray-500">
                          Oportunidad: {opportunity.business.name}
                        </p>
                      )}
                    </div>

                    <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                      Dia siguiente
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Puede usar esta sugerencia tal cual o abrir el formulario para ajustarla antes de guardar.
                </p>

                {promptError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {promptError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeFlow}
                  disabled={creatingSuggestedTask}
                >
                  No crear
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPromptError('')
                    setTaskError('')
                    setTaskModalOpen(true)
                  }}
                  disabled={creatingSuggestedTask}
                  leftIcon={<AddTaskIcon fontSize="small" />}
                >
                  Crear nueva
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    void handleSuggestedTaskCreate()
                  }}
                  loading={creatingSuggestedTask}
                >
                  Usar sugerencia
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {taskModalOpen && (
        <TaskModal
          isOpen={taskModalOpen}
          onClose={closeFlow}
          onSubmit={handleCustomTaskSubmit}
          loading={creatingCustomTask}
          error={taskError}
          businessName={opportunity.business?.name || ''}
          responsibleName={opportunity.responsible?.name || opportunity.responsible?.email}
          prefillData={suggestedTaskPrefill}
        />
      )}
    </>
  )
}
