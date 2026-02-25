'use client'

import { useState, useEffect } from 'react'
import GroupsIcon from '@mui/icons-material/Groups'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MicIcon from '@mui/icons-material/Mic'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import EditNoteIcon from '@mui/icons-material/EditNote'
import type { Task } from '@/types'
import { Button, Input, Select, Textarea } from '@/components/ui'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import AiVoiceVisualizer from '@/components/shared/AiVoiceVisualizer'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import { useMeetingAiAssistant } from '@/components/crm/opportunity/useMeetingAiAssistant'
import { useTaskAiAssistant } from '@/components/crm/opportunity/useTaskAiAssistant'

// Meeting data structure stored as JSON in notes
export interface MeetingData {
  meetingWith: string // Reunión con
  position: string // Posición
  isDecisionMaker: '' | 'si' | 'no' | 'no_se' // ¿Es la persona que toma la decisión final?
  meetingDetails: string // Detalle de la reunión
  reachedAgreement: 'si' | 'no' // ¿Se llegó a un acuerdo?
  mainObjection?: string // Principal objeción (if reachedAgreement = 'no')
  objectionSolution?: string // Posible solución a objeción (if reachedAgreement = 'no')
  nextSteps: string // Siguientes pasos
}

// Helper to parse meeting data from notes
export function parseMeetingData(notes: string | null): MeetingData | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    // Check if it has meeting-specific fields
    if (parsed.meetingWith !== undefined) {
      return parsed as MeetingData
    }
    return null
  } catch {
    return null
  }
}

// Helper to serialize meeting data to notes
function serializeMeetingData(data: MeetingData): string {
  return JSON.stringify(data)
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  onSubmit: (data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }, options?: {
    markCompleted?: boolean
  }) => void | Promise<void>
  loading?: boolean
  error?: string
  businessName?: string // For auto-filling "Reunión con"
  forCompletion?: boolean // When true, outcome fields are required before saving
  responsibleName?: string | null // Name of the responsible user
  onViewOpportunity?: () => void // Callback to open opportunity modal
}

export default function TaskModal({ 
  isOpen, 
  onClose, 
  task, 
  onSubmit, 
  loading, 
  error,
  businessName = '',
  forCompletion = false,
  responsibleName,
  onViewOpportunity,
}: TaskModalProps) {
  const [taskCategory, setTaskCategory] = useState<'meeting' | 'todo'>('todo')
  
  // Todo fields
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  
  // Meeting fields
  const [meetingWith, setMeetingWith] = useState('')
  const [position, setPosition] = useState('')
  const [isDecisionMaker, setIsDecisionMaker] = useState<'' | 'si' | 'no' | 'no_se'>('')
  const [meetingDetails, setMeetingDetails] = useState('')
  const [meetingHappened, setMeetingHappened] = useState<'' | 'si' | 'no'>('') // New field for "today" meetings
  const [reachedAgreement, setReachedAgreement] = useState<'si' | 'no'>('si')
  const [mainObjection, setMainObjection] = useState('')
  const [objectionSolution, setObjectionSolution] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Determine if date is past, today, or future using Panama timezone
  const todayStr = getTodayInPanama() // YYYY-MM-DD in Panama timezone
  const selectedDateStr = taskDate || todayStr
  const isDatePast = selectedDateStr < todayStr
  const isDateToday = selectedDateStr === todayStr

  const {
    isAiImprovingMeetingDetails,
    aiMeetingDetailsError,
    isAiPrefillingMeetingFields,
    aiMeetingPrefillError,
    missingFieldsDialog,
    dictationGuideDialog,
    speechSupported,
    isDictatingMeetingDetails,
    dictationError,
    showFirstDictationAnimation,
    handleMeetingDetailsInputChange,
    handleProofreadMeetingDetails,
    handlePrefillMeetingFieldsFromDetails,
    toggleMeetingDetailsDictation,
    handleDictationGuideHide,
    handleDictationGuideStopDictation,
    handleMissingFieldsManual,
    handleMissingFieldsDictate,
    handleMissingFieldsStopDictation,
    resetAssistantState,
  } = useMeetingAiAssistant({
    meeting: {
      meetingWith,
      position,
      isDecisionMaker,
      meetingDetails,
      meetingHappened,
      reachedAgreement,
      mainObjection,
      objectionSolution,
      nextSteps,
    },
    setMeeting: {
      setMeetingWith,
      setPosition,
      setIsDecisionMaker,
      setMeetingDetails,
      setMeetingHappened,
      setReachedAgreement,
      setMainObjection,
      setObjectionSolution,
      setNextSteps,
    },
    forCompletion,
    isDatePast,
    isDateToday,
    setValidationError,
  })

  const taskAi = useTaskAiAssistant({
    task: { title: taskTitle, notes: taskNotes, date: taskDate },
    setTask: { setTitle: setTaskTitle, setNotes: setTaskNotes, setDate: setTaskDate },
    todayDate: todayStr,
  })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    resetAssistantState()
    taskAi.resetAssistantState()
    
    if (task) {
      setTaskCategory(task.category)
      // Format the task date in Panama timezone for the date input
      setTaskDate(formatDateForPanama(new Date(task.date)))
      
      if (task.category === 'meeting') {
        // Parse meeting data from notes
        const meetingData = parseMeetingData(task.notes)
        if (meetingData) {
          setMeetingWith(meetingData.meetingWith)
          setPosition(meetingData.position)
          setIsDecisionMaker(meetingData.isDecisionMaker)
          setMeetingDetails(meetingData.meetingDetails)
          setReachedAgreement(meetingData.reachedAgreement)
          setMainObjection(meetingData.mainObjection || '')
          setObjectionSolution(meetingData.objectionSolution || '')
          setNextSteps(meetingData.nextSteps)
          // If completing or nextSteps has content, meeting happened
          setMeetingHappened(forCompletion || meetingData.nextSteps ? 'si' : 'no')
          // Title is derived from meetingWith
          setTaskTitle(meetingData.meetingWith)
        } else {
          // Fallback for old meeting data
          setTaskTitle(task.title)
          setTaskNotes(task.notes || '')
          setMeetingHappened(forCompletion ? 'si' : 'no')
        }
      } else {
        setTaskTitle(task.title)
        setTaskNotes(task.notes || '')
      }
    } else {
      // Reset all fields for new task
      setTaskCategory('todo')
      setTaskTitle('')
      setTaskDate(getTodayInPanama())
      setTaskNotes('')
      // Reset meeting fields
      setMeetingWith('')
      setPosition('')
      setIsDecisionMaker('')
      setMeetingDetails('')
      setMeetingHappened('')
      setReachedAgreement('si')
      setMainObjection('')
      setObjectionSolution('')
      setNextSteps('')
    }
  }, [task, isOpen, businessName, forCompletion, resetAssistantState, taskAi.resetAssistantState])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    
    if (taskCategory === 'meeting') {
      // Validate meeting outcome fields if they should be shown
      if (showMeetingOutcomeFields) {
        if (!nextSteps.trim()) {
          setValidationError('Por favor complete el campo "Siguientes pasos" antes de guardar')
          return
        }
        if (reachedAgreement === 'no' && (!mainObjection.trim() || !objectionSolution.trim())) {
          setValidationError('Por favor complete los campos de objeción antes de guardar')
          return
        }
      }
      
      // Build meeting data
      const meetingData: MeetingData = {
        meetingWith,
        position,
        isDecisionMaker,
        meetingDetails,
        reachedAgreement: showMeetingOutcomeFields ? reachedAgreement : 'si', // Default if not shown
        nextSteps: showMeetingOutcomeFields ? nextSteps.trim() : '', // Empty if not shown, trimmed if shown
      }
      
      // Only include objection fields if agreement was not reached and outcome fields are shown
      if (showMeetingOutcomeFields && reachedAgreement === 'no') {
        meetingData.mainObjection = mainObjection.trim()
        meetingData.objectionSolution = objectionSolution.trim()
      }
      
      await onSubmit({
        category: 'meeting',
        title: `Reunión: ${meetingWith}`, // Title for display
        date: taskDate,
        notes: serializeMeetingData(meetingData),
      }, {
        // If today's meeting already happened, complete it immediately after save.
        markCompleted: isDateToday && meetingHappened === 'si',
      })
    } else {
      await onSubmit({
        category: 'todo',
        title: taskTitle,
        date: taskDate,
        notes: taskNotes,
      })
    }
  }

  const isMeeting = taskCategory === 'meeting'
  const showObjectionFields = isMeeting && reachedAgreement === 'no'

  // Show meeting outcome fields based on date and meeting happened status
  // OR when opening for completion (must fill outcome fields to complete)
  const showMeetingOutcomeFields = isMeeting && (forCompletion || isDatePast || (isDateToday && meetingHappened === 'si'))

  // Compute if form is valid for submission
  const isFormValid = (() => {
    // Basic validation for all tasks
    if (!taskDate) return false
    
    if (isMeeting) {
      // Meeting basic fields
      if (!meetingWith.trim() || !position.trim() || !meetingDetails.trim()) return false
      if (!isDecisionMaker) return false
      if (isDateToday && !meetingHappened) return false
      
      // Meeting outcome fields required when shown
      if (showMeetingOutcomeFields) {
        if (!nextSteps.trim()) return false
        // If no agreement, objection fields required
        if (reachedAgreement === 'no') {
          if (!mainObjection.trim() || !objectionSolution.trim()) return false
        }
      }
    } else {
      // Todo task requires title
      if (!taskTitle.trim()) return false
    }
    
    return true
  })()

  const assistantActionState: 'idle' | 'dictating' | 'correcting' | 'completing' =
    isDictatingMeetingDetails
      ? 'dictating'
      : isAiPrefillingMeetingFields
        ? 'completing'
        : isAiImprovingMeetingDetails
          ? 'correcting'
          : 'idle'

  const assistantActionConfig = (() => {
    if (assistantActionState === 'dictating') {
      return {
        label: 'Detener dictado',
        leftIcon: <RadioButtonCheckedIcon fontSize="small" className="text-rose-100 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_6px_18px_rgba(239,68,68,0.32)] hover:from-rose-600 hover:to-red-600 animate-pulse',
      }
    }

    if (assistantActionState === 'correcting') {
      return {
        label: 'Corrigiendo...',
        leftIcon: <SmartToyIcon fontSize="small" className="text-indigo-600 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.18)]',
      }
    }

    if (assistantActionState === 'completing') {
      return {
        label: 'Completando...',
        leftIcon: <FactCheckIcon fontSize="small" className="text-amber-600 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-[0_4px_14px_rgba(245,158,11,0.18)]',
      }
    }

    return {
      label: 'Dictar',
      leftIcon: <MicIcon fontSize="small" className="text-emerald-600" />,
      className:
        'min-w-[230px] rounded-xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-[0_6px_20px_rgba(16,185,129,0.2)] hover:from-emerald-100 hover:to-teal-100',
    }
  })()

  const assistantActionDisabled =
    assistantActionState === 'idle'
      ? !speechSupported
      : assistantActionState === 'correcting' || assistantActionState === 'completing'

  // Task AI assistant config
  const taskActionConfig = (() => {
    if (taskAi.assistantActionState === 'dictating') {
      return {
        label: 'Detener dictado',
        leftIcon: <RadioButtonCheckedIcon fontSize="small" className="text-rose-100 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_6px_18px_rgba(239,68,68,0.32)] hover:from-rose-600 hover:to-red-600 animate-pulse',
      }
    }
    if (taskAi.assistantActionState === 'correcting') {
      return {
        label: 'Corrigiendo...',
        leftIcon: <SmartToyIcon fontSize="small" className="text-indigo-600 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl border-indigo-200 bg-indigo-50 text-indigo-700 shadow-[0_4px_14px_rgba(79,70,229,0.18)]',
      }
    }
    if (taskAi.assistantActionState === 'completing') {
      return {
        label: 'Completando...',
        leftIcon: <FactCheckIcon fontSize="small" className="text-amber-600 animate-pulse" />,
        className:
          'min-w-[230px] rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-[0_4px_14px_rgba(245,158,11,0.18)]',
      }
    }
    return {
      label: 'Dictar',
      leftIcon: <MicIcon fontSize="small" className="text-emerald-600" />,
      className:
        'min-w-[230px] rounded-xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 shadow-[0_6px_20px_rgba(16,185,129,0.2)] hover:from-emerald-100 hover:to-teal-100',
    }
  })()

  const taskActionDisabled =
    taskAi.assistantActionState === 'idle'
      ? !taskAi.speechSupported
      : taskAi.assistantActionState === 'correcting' || taskAi.assistantActionState === 'completing'

  const showTaskManualActions = taskAi.assistantActionState === 'idle' && Boolean(taskNotes.trim())

  const taskAssistantSection = (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-indigo-100 rounded-md">
            <SmartToyIcon style={{ fontSize: 16 }} className="text-indigo-600" />
          </div>
          <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Asistente IA</p>
        </div>
        {taskAi.assistantActionState === 'dictating' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Grabando
          </span>
        )}
      </div>

      <div className="flex justify-center mb-2">
        <Button
          key={taskAi.assistantActionState}
          type="button"
          size="lg"
          variant={taskAi.assistantActionState === 'dictating' ? 'destructive' : 'secondary'}
          className={`w-full justify-center text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow ${taskActionConfig.className} ${
            taskAi.showFirstDictationAnimation && taskAi.assistantActionState === 'dictating'
              ? 'ring-4 ring-rose-100 ring-offset-0'
              : ''
          }`}
          onClick={() => {
            if (taskAi.assistantActionState === 'idle' || taskAi.assistantActionState === 'dictating') {
              taskAi.toggleDictation()
            }
          }}
          disabled={taskActionDisabled}
          leftIcon={taskActionConfig.leftIcon}
        >
          {taskActionConfig.label}
        </Button>
      </div>

      <div className="space-y-2 min-h-[1.5rem] flex flex-col justify-center">
        {taskAi.assistantActionState === 'correcting' && (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Paso 1/2: Mejorando redacción...
          </div>
        )}
        {taskAi.assistantActionState === 'completing' && (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-600 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Paso 2/2: Extrayendo título y notas...
          </div>
        )}
        {taskAi.isDictating && taskAi.showFirstDictationAnimation && (
          <p className="text-center text-xs font-medium text-rose-600 animate-[fadeIn_0.3s_ease-out]">
            Describa la tarea. La IA extraerá título y notas.
          </p>
        )}

        {showTaskManualActions && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-indigo-50/50">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 gap-1"
              onClick={() => {
                void taskAi.proofreadAndExtract()
              }}
            >
              <AutoFixHighIcon style={{ fontSize: 14 }} />
              Mejorar y extraer
            </Button>
          </div>
        )}
      </div>

      {!taskAi.speechSupported && (
        <p className="text-center text-[10px] text-slate-400 mt-2">Dictado no disponible en este navegador.</p>
      )}

      {(taskAi.proofreadError || taskAi.extractError || taskAi.dictationError) && (
        <div className="mt-2 p-2 bg-red-50 rounded text-[10px] text-red-600 border border-red-100">
          {taskAi.proofreadError || taskAi.extractError || taskAi.dictationError}
        </div>
      )}
    </div>
  )

  const showAssistantManualActions = assistantActionState === 'idle' && Boolean(meetingDetails.trim())
  const assistantSection = (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-indigo-100 rounded-md">
            <SmartToyIcon style={{ fontSize: 16 }} className="text-indigo-600" />
          </div>
          <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Asistente IA</p>
        </div>
        {assistantActionState === 'dictating' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Grabando
          </span>
        )}
      </div>

      <div className="flex justify-center mb-2">
        <Button
          key={assistantActionState}
          type="button"
          size="lg"
          variant={assistantActionState === 'dictating' ? 'destructive' : 'secondary'}
          className={`w-full justify-center text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow ${assistantActionConfig.className} ${
            showFirstDictationAnimation && assistantActionState === 'dictating'
              ? 'ring-4 ring-rose-100 ring-offset-0'
              : ''
          }`}
          onClick={() => {
            if (assistantActionState === 'idle' || assistantActionState === 'dictating') {
              toggleMeetingDetailsDictation()
            }
          }}
          disabled={assistantActionDisabled}
          leftIcon={assistantActionConfig.leftIcon}
        >
          {assistantActionConfig.label}
        </Button>
      </div>

      <div className="space-y-2 min-h-[1.5rem] flex flex-col justify-center">
        {assistantActionState === 'correcting' && (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Paso 1/2: Mejorando redacción...
          </div>
        )}
        {assistantActionState === 'completing' && (
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-600 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Paso 2/2: Extrayendo datos...
          </div>
        )}
        {isDictatingMeetingDetails && showFirstDictationAnimation && (
          <p className="text-center text-xs font-medium text-rose-600 animate-[fadeIn_0.3s_ease-out]">
            Hable claro para completar los campos automáticamente.
          </p>
        )}

        {showAssistantManualActions && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-indigo-50/50">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 gap-1"
              onClick={() => {
                void handleProofreadMeetingDetails()
              }}
            >
              <AutoFixHighIcon style={{ fontSize: 14 }} />
              Mejorar texto
            </Button>
            <div className="w-px h-3 bg-indigo-100" />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="h-7 text-[10px] font-medium text-amber-600 hover:bg-amber-50 hover:text-amber-700 gap-1"
              onClick={() => {
                void handlePrefillMeetingFieldsFromDetails()
              }}
            >
              <EditNoteIcon style={{ fontSize: 14 }} />
              Autocompletar
            </Button>
          </div>
        )}
      </div>

      {!speechSupported && (
        <p className="text-center text-[10px] text-slate-400 mt-2">Dictado no disponible en este navegador.</p>
      )}

      {(aiMeetingDetailsError || aiMeetingPrefillError || dictationError) && (
        <div className="mt-2 p-2 bg-red-50 rounded text-[10px] text-red-600 border border-red-100">
          {aiMeetingDetailsError || aiMeetingPrefillError || dictationError}
        </div>
      )}
    </div>
  )

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={task ? (isMeeting ? 'Editar Reunión' : 'Editar Tarea') : (isMeeting ? 'Nueva Reunión' : 'Nueva Tarea')}
      icon={isMeeting ? <GroupsIcon fontSize="small" /> : undefined}
      iconColor={isMeeting ? 'blue' : 'orange'}
      maxWidth={isMeeting ? 'xl' : 'md'}
      autoHeight={true}
      footer={
        <ModalFooter
          onCancel={onClose}
          submitLabel={task ? 'Actualizar' : 'Crear'}
          submitLoading={loading}
          submitDisabled={loading || !isFormValid}
          submitVariant={isMeeting ? 'primary' : 'primary'}
          formId="task-modal-form"
        />
      }
    >
      <form id="task-modal-form" onSubmit={handleSubmit} className={isMeeting ? 'p-4 space-y-3' : 'p-6 space-y-4'}>
          {(error || validationError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {validationError || error}
            </div>
          )}

          {/* Context Info: Responsible & Opportunity Link */}
          {task && (responsibleName || onViewOpportunity) && (
            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              {responsibleName && (
                <div className="flex items-center gap-1.5">
                  <PersonIcon style={{ fontSize: 14 }} />
                  <span>{responsibleName}</span>
                </div>
              )}
              {onViewOpportunity && businessName && (
                <button
                  type="button"
                  onClick={onViewOpportunity}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <span>{businessName}</span>
                  <OpenInNewIcon style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
          )}

          {isMeeting && (
            <div className="md:flex md:justify-end">
              <div className="w-full md:w-[520px]">
                {assistantSection}
              </div>
            </div>
          )}

          {/* Category Selection */}
          <Select
            label="Categoría"
            value={taskCategory}
            onChange={(e) => setTaskCategory(e.target.value as 'meeting' | 'todo')}
            required
            options={[
              { value: 'todo', label: 'Tarea' },
              { value: 'meeting', label: 'Reunión' },
            ]}
          />

          {/* Date - Always visible */}
          <Input
            type="date"
            label="Fecha"
            value={taskDate}
            onChange={(e) => setTaskDate(e.target.value)}
            required
          />

          {/* Todo-specific fields */}
          {!isMeeting && (
            <>
              {taskAssistantSection}

              <Input
                type="text"
                label="Título"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                placeholder="Ingrese título de la tarea..."
              />
              <Textarea
                label="Notas"
                value={taskNotes}
                onChange={(e) => taskAi.handleNotesInputChange(e.target.value)}
                rows={3}
                placeholder="Describa la tarea, puede también usar el dictado por voz..."
              />
            </>
          )}

          {/* Meeting-specific fields */}
          {isMeeting && (
            <div className="space-y-6 animate-[slideUpSmall_0.3s_ease-out]">
              
              {/* Section: Contact Info */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-colors duration-300">
                <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <PersonIcon fontSize="small" className="text-blue-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Contacto</h4>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="text"
                    label="Reunión con"
                    value={meetingWith}
                    onChange={(e) => setMeetingWith(e.target.value)}
                    required
                    placeholder="Nombre del contacto"
                    className="bg-transparent"
                  />
                  
                  <Input
                    type="text"
                    label="Posición"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    required
                    placeholder="Cargo o rol"
                    className="bg-transparent"
                  />

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="¿Es tomador de decisión?"
                      value={isDecisionMaker}
                      onChange={(e) => setIsDecisionMaker(e.target.value as '' | 'si' | 'no' | 'no_se')}
                      required
                      options={[
                        { value: '', label: 'Seleccionar...' },
                        { value: 'si', label: 'Sí, toma la decisión' },
                        { value: 'no', label: 'No, es influenciador' },
                        { value: 'no_se', label: 'No estoy seguro' },
                      ]}
                    />

                    {/* Show "Meeting happened?" field only for today's date */}
                    {isDateToday && (
                      <Select
                        label="¿Ya se realizó?"
                        value={meetingHappened}
                        onChange={(e) => setMeetingHappened(e.target.value as '' | 'si' | 'no')}
                        required
                        options={[
                          { value: '', label: 'Seleccionar estado...' },
                          { value: 'no', label: 'Pendiente' },
                          { value: 'si', label: 'Completada' },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Section: Meeting Details */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-colors duration-300">
                <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <FactCheckIcon fontSize="small" className="text-indigo-500" />
                  <h4 className="text-sm font-semibold text-slate-700">Resumen de la Reunión</h4>
                </div>
                <div className="p-4">
                  <Textarea
                    label="Detalles clave"
                    value={meetingDetails}
                    onChange={(e) => handleMeetingDetailsInputChange(e.target.value)}
                    required
                    rows={4}
                    placeholder="Puntos importantes discutidos, intereses del cliente, ambiente de la reunión..."
                    className="resize-none bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              {/* Meeting outcome fields - shown for past dates or today if meeting happened */}
              {showMeetingOutcomeFields && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-blue-100 shadow-sm overflow-hidden animate-[slideUpSmall_0.4s_ease-out]">
                  <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                    <GroupsIcon fontSize="small" className="text-blue-600" />
                    <h4 className="text-sm font-semibold text-blue-900">Resultados y Acuerdos</h4>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <Select
                      label="¿Se llegó a un acuerdo?"
                      value={reachedAgreement}
                      onChange={(e) => setReachedAgreement(e.target.value as 'si' | 'no')}
                      required
                      options={[
                        { value: 'si', label: 'Sí, hay acuerdo' },
                        { value: 'no', label: 'No hubo acuerdo' },
                      ]}
                      className="bg-white"
                    />

                    {/* Conditional objection fields */}
                    {showObjectionFields && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-4 animate-[slideUpSmall_0.3s_ease-out]">
                        <div className="flex items-center gap-2 text-amber-800 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <h5 className="text-xs font-bold uppercase tracking-wider">Gestión de Objeciones</h5>
                        </div>
                        
                        <Input
                          type="text"
                          label="Principal objeción"
                          value={mainObjection}
                          onChange={(e) => setMainObjection(e.target.value)}
                          required
                          placeholder="Ej: Precio, Tiempo, Competencia..."
                          className="bg-white"
                        />
                        
                        <Textarea
                          label="Posible solución"
                          value={objectionSolution}
                          onChange={(e) => setObjectionSolution(e.target.value)}
                          required
                          rows={2}
                          placeholder="Estrategia para superar esta objeción..."
                          className="bg-white resize-none"
                        />
                      </div>
                    )}

                    <div className="pt-2">
                      <Textarea
                        label="Siguientes pasos"
                        value={nextSteps}
                        onChange={(e) => {
                          setNextSteps(e.target.value)
                          if (validationError) setValidationError(null)
                        }}
                        required
                        rows={2}
                        placeholder='Ej: "Enviar propuesta el martes", "Agendar demo para el viernes"...'
                        helperText="Define claramente las próximas acciones"
                        className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

      </form>
    </ModalShell>

    <ConfirmDialog
      isOpen={dictationGuideDialog.isOpen}
      title={dictationGuideDialog.mode === 'processing' ? 'Procesando dictado' : 'Asistente de Voz'}
      message={(
        <div className="space-y-4 text-left">
          {(dictationGuideDialog.mode === 'recording' || dictationGuideDialog.mode === 'processing') && (
            <AiVoiceVisualizer 
              mode={dictationGuideDialog.mode === 'recording' ? 'listening' : 'processing'} 
              className="mb-2"
            />
          )}

          {dictationGuideDialog.mode === 'recording' && (
            <>
              <p className="text-sm text-gray-600 text-center animate-in fade-in slide-in-from-bottom-2">
                Hable con naturalidad. Intente mencionar los siguientes puntos para que la IA complete el formulario por usted:
              </p>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 animate-in fade-in slide-in-from-bottom-3 delay-100">
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                  {dictationGuideDialog.items.map((item) => (
                    <li key={`dictation-guide-${item.label}`}>
                      <span className="font-semibold">{item.label}:</span> {item.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {dictationGuideDialog.mode === 'processing' && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-sm font-medium text-indigo-700 text-center">
                Interpretando su dictado y estructurando la información...
              </p>
              <p className="text-xs text-gray-500 text-center">
                Esto puede tomar unos segundos.
              </p>
            </div>
          )}
        </div>
      )}
      confirmText={dictationGuideDialog.mode === 'processing' ? 'Procesando...' : 'Detener dictado'}
      cancelText={dictationGuideDialog.mode === 'processing' ? '' : 'Ocultar guía'}
      confirmVariant="primary"
      loading={dictationGuideDialog.mode === 'processing'}
      loadingText="Procesando..."
      onConfirm={
        dictationGuideDialog.mode === 'processing'
          ? () => {}
          : handleDictationGuideStopDictation
      }
      onCancel={
        dictationGuideDialog.mode === 'processing'
          ? () => {}
          : handleDictationGuideHide
      }
      zIndex={78}
    />

    <ConfirmDialog
      isOpen={missingFieldsDialog.isOpen}
      title={
        missingFieldsDialog.mode === 'recording'
          ? 'Escuchando...'
          : missingFieldsDialog.mode === 'processing'
            ? 'Analizando...'
            : 'Verificación de Datos'
      }
      message={(
        <>
          {(missingFieldsDialog.mode === 'recording' || missingFieldsDialog.mode === 'processing') && (
            <div className="mb-4">
              <AiVoiceVisualizer 
                mode={missingFieldsDialog.mode === 'recording' ? 'listening' : 'processing'} 
              />
            </div>
          )}

          {missingFieldsDialog.mode === 'recording' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-sm text-gray-600 text-center">
                El micrófono está activo. Presione <span className="font-semibold">Detener</span> cuando haya finalizado.
              </p>
              {(missingFieldsDialog.missingRequired.length > 0 || missingFieldsDialog.notDetected.length > 0) && (
                <div className="text-left space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {missingFieldsDialog.missingRequired.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-rose-700 mb-1">Faltan para completar:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                        {missingFieldsDialog.missingRequired.map((field) => (
                          <li key={`recording-missing-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {missingFieldsDialog.notDetected.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-1">No detectados por IA:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                        {missingFieldsDialog.notDetected.map((field) => (
                          <li key={`recording-not-detected-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {missingFieldsDialog.mode === 'processing' && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-sm font-medium text-indigo-700 text-center">
                Organizando los detalles de la reunión...
              </p>
              <p className="text-xs text-gray-500 text-center">
                Esto puede tomar unos segundos.
              </p>
            </div>
          )}

          {missingFieldsDialog.mode === 'missing' && (
            <div className="text-left space-y-3">
              <p className="text-sm text-gray-600">
                La IA ha completado la mayor parte, pero necesitamos confirmar algunos detalles:
              </p>
              {missingFieldsDialog.missingRequired.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Faltan para completar:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                    {missingFieldsDialog.missingRequired.map((field) => (
                      <li key={`missing-${field}`}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              {missingFieldsDialog.notDetected.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">No detectados por IA:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                    {missingFieldsDialog.notDetected.map((field) => (
                      <li key={`not-detected-${field}`}>{field}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Puede escribir estos datos ahora o volver a dictar para agregarlos.
              </p>
            </div>
          )}
        </>
      )}
      confirmText={
        missingFieldsDialog.mode === 'recording'
          ? 'Detener dictado'
          : missingFieldsDialog.mode === 'processing'
            ? 'Procesando...'
            : 'Dictar'
      }
      cancelText={
        missingFieldsDialog.mode === 'processing'
          ? ''
          : missingFieldsDialog.mode === 'recording'
            ? 'Completar manualmente'
            : 'Registrar manualmente'
      }
      confirmVariant="primary"
      loading={missingFieldsDialog.mode === 'processing'}
      loadingText="Procesando..."
      onConfirm={
        missingFieldsDialog.mode === 'recording'
          ? handleMissingFieldsStopDictation
          : missingFieldsDialog.mode === 'processing'
            ? () => {}
            : handleMissingFieldsDictate
      }
      onCancel={handleMissingFieldsManual}
      zIndex={80}
    />

    <ConfirmDialog
      isOpen={taskAi.dictationGuideDialog.isOpen}
      title={taskAi.dictationGuideDialog.mode === 'processing' ? 'Procesando tarea' : 'Asistente de Voz'}
      message={(
        <div className="space-y-4 text-left">
          {(taskAi.dictationGuideDialog.mode === 'recording' || taskAi.dictationGuideDialog.mode === 'processing') && (
            <AiVoiceVisualizer 
              mode={taskAi.dictationGuideDialog.mode === 'recording' ? 'listening' : 'processing'} 
              className="mb-2"
            />
          )}

          {taskAi.dictationGuideDialog.mode === 'recording' && (
            <>
              <p className="text-sm text-gray-600 text-center">
                Describa la tarea. La IA generará el título y organizará las notas:
              </p>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                  {taskAi.dictationGuideDialog.items.map((item) => (
                    <li key={`task-guide-${item.label}`}>
                      <span className="font-semibold">{item.label}:</span> {item.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {taskAi.dictationGuideDialog.mode === 'processing' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-indigo-700 text-center">
                Generando título y organizando las notas...
              </p>
              <p className="text-xs text-gray-500 text-center">
                Esto puede tomar unos segundos.
              </p>
            </div>
          )}
        </div>
      )}
      confirmText={taskAi.dictationGuideDialog.mode === 'processing' ? 'Procesando...' : 'Detener dictado'}
      cancelText={taskAi.dictationGuideDialog.mode === 'processing' ? '' : 'Ocultar guía'}
      confirmVariant="primary"
      loading={taskAi.dictationGuideDialog.mode === 'processing'}
      loadingText="Procesando..."
      onConfirm={
        taskAi.dictationGuideDialog.mode === 'processing'
          ? () => {}
          : taskAi.handleGuideStopDictation
      }
      onCancel={
        taskAi.dictationGuideDialog.mode === 'processing'
          ? () => {}
          : taskAi.handleGuideHide
      }
      zIndex={78}
    />
    </>
  )
}
