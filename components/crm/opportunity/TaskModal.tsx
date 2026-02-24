'use client'

import { useState, useEffect } from 'react'
import GroupsIcon from '@mui/icons-material/Groups'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PersonIcon from '@mui/icons-material/Person'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MicIcon from '@mui/icons-material/Mic'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import type { Task } from '@/types'
import { Button, Input, Select, Textarea } from '@/components/ui'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import { useMeetingAiAssistant } from '@/components/crm/opportunity/useMeetingAiAssistant'

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    resetAssistantState()
    
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
  }, [task, isOpen, businessName, forCompletion, resetAssistantState])
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

  const showAssistantManualActions = assistantActionState === 'idle' && Boolean(meetingDetails.trim())
  const assistantSection = (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-sky-50 to-indigo-50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Asistente IA</p>
        {assistantActionState === 'dictating' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            Grabando
          </span>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          key={assistantActionState}
          type="button"
          size="lg"
          variant={assistantActionState === 'dictating' ? 'destructive' : 'secondary'}
          className={`w-full sm:w-auto justify-center text-base font-semibold transition-all duration-500 ${assistantActionConfig.className} ${
            showFirstDictationAnimation && assistantActionState === 'dictating'
              ? 'ring-2 ring-rose-300 ring-offset-1'
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

      {assistantActionState === 'correcting' && (
        <p className="text-center text-xs font-medium text-indigo-700">Paso 1 de 2: Corrigiendo texto</p>
      )}
      {assistantActionState === 'completing' && (
        <p className="text-center text-xs font-medium text-amber-700">Paso 2 de 2: Completando campos</p>
      )}
      {isDictatingMeetingDetails && showFirstDictationAnimation && (
        <p className="text-center text-xs font-medium text-rose-600">
          Dictado iniciado. Hable con frases claras para completar más campos.
        </p>
      )}

      {showAssistantManualActions && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-indigo-700 hover:bg-indigo-100"
            onClick={() => {
              void handleProofreadMeetingDetails()
            }}
          >
            Corregir manual
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="text-amber-700 hover:bg-amber-100"
            onClick={() => {
              void handlePrefillMeetingFieldsFromDetails()
            }}
          >
            Completar manual
          </Button>
        </div>
      )}

      {!speechSupported && (
        <p className="text-center text-xs text-slate-500">Dictado no disponible en este navegador.</p>
      )}

      {aiMeetingDetailsError && (
        <p className="text-xs text-red-600">{aiMeetingDetailsError}</p>
      )}
      {aiMeetingPrefillError && (
        <p className="text-xs text-red-600">{aiMeetingPrefillError}</p>
      )}
      {dictationError && (
        <p className="text-xs text-red-600">{dictationError}</p>
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
                onChange={(e) => setTaskNotes(e.target.value)}
                rows={3}
                placeholder="Agregar notas..."
              />
            </>
          )}

          {/* Meeting-specific fields */}
          {isMeeting && (
            <>
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GroupsIcon fontSize="small" className="text-blue-600" />
                  Información de la Reunión
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  type="text"
                  label="Reunión con"
                  value={meetingWith}
                  onChange={(e) => setMeetingWith(e.target.value)}
                  required
                  placeholder="Nombre de con quién se obtuvo la reunión"
                  helperText="Nombre del contacto"
                />
                
                <Input
                  type="text"
                  label="Posición"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                  placeholder="Posición en la empresa"
                  helperText="Cargo o rol en la empresa"
                />
              </div>

              <div className={`grid gap-3 ${isDateToday ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <Select
                  label="¿Es la persona que toma la decisión final?"
                  value={isDecisionMaker}
                  onChange={(e) => setIsDecisionMaker(e.target.value as '' | 'si' | 'no' | 'no_se')}
                  required
                  options={[
                    { value: '', label: 'Seleccionar' },
                    { value: 'si', label: 'Sí' },
                    { value: 'no', label: 'No' },
                    { value: 'no_se', label: 'No sé' },
                  ]}
                />

                {/* Show "Meeting happened?" field only for today's date */}
                {isDateToday && (
                  <Select
                    label="¿Ya se tuvo la reunión?"
                    value={meetingHappened}
                    onChange={(e) => setMeetingHappened(e.target.value as '' | 'si' | 'no')}
                    required
                    options={[
                      { value: '', label: 'Seleccionar' },
                      { value: 'no', label: 'No' },
                      { value: 'si', label: 'Sí' },
                    ]}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Detalle de la reunión"
                  value={meetingDetails}
                  onChange={(e) => handleMeetingDetailsInputChange(e.target.value)}
                  required
                  rows={3}
                  placeholder="Ser lo más claro y específico posible de todos los puntos relevantes de la reunión..."
                  helperText="Incluya todos los puntos importantes discutidos"
                />
              </div>

              {/* Meeting outcome fields - shown for past dates or today if meeting happened */}
              {showMeetingOutcomeFields && (
                <>
                  <Select
                    label="¿Se llegó a un acuerdo?"
                    value={reachedAgreement}
                    onChange={(e) => setReachedAgreement(e.target.value as 'si' | 'no')}
                    required
                    options={[
                      { value: 'si', label: 'Sí' },
                      { value: 'no', label: 'No' },
                    ]}
                  />

                  {/* Conditional objection fields */}
                  {showObjectionFields && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
                      <h5 className="text-sm font-medium text-amber-800">Información sobre objeción</h5>
                      
                      <Input
                        type="text"
                        label="Principal objeción"
                        value={mainObjection}
                        onChange={(e) => setMainObjection(e.target.value)}
                        required
                        placeholder="Objeción principal o 'no sé'"
                        helperText="¿Cuál fue la principal objeción o barrera?"
                      />
                      
                      <Textarea
                        label="Posible solución a objeción"
                        value={objectionSolution}
                        onChange={(e) => setObjectionSolution(e.target.value)}
                        required
                        rows={2}
                        placeholder="Posible solución para llegar a un acuerdo..."
                        helperText="¿Cómo se podría resolver esta objeción?"
                      />
                    </div>
                  )}

                  <Textarea
                    label="Siguientes pasos"
                    value={nextSteps}
                    onChange={(e) => {
                      setNextSteps(e.target.value)
                      if (validationError) setValidationError(null)
                    }}
                    required
                    rows={2}
                    placeholder='Ej: "Se enviará propuesta de…" o "Aliado se reunirá, y quedamos en hablar el día…"'
                    helperText="Acciones definidas y fechas de seguimiento"
                  />
                </>
              )}
            </>
          )}

      </form>
    </ModalShell>

    <ConfirmDialog
      isOpen={dictationGuideDialog.isOpen}
      title={dictationGuideDialog.mode === 'processing' ? 'Procesando con IA' : 'Guía para dictar'}
      message={(
        <div className="space-y-3 text-left">
          {dictationGuideDialog.mode === 'recording' && (
            <>
              <div className="flex items-center justify-center gap-1.5 h-6">
                <span className="w-1.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <span className="w-1.5 h-4 rounded-full bg-rose-500 animate-pulse [animation-delay:120ms]" />
                <span className="w-1.5 h-3 rounded-full bg-rose-400 animate-pulse [animation-delay:240ms]" />
                <span className="w-1.5 h-5 rounded-full bg-rose-500 animate-pulse [animation-delay:360ms]" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Estamos escuchando su voz. Incluya estos puntos para autocompletar campos:
              </p>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
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
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Corrigiendo el texto y completando campos automáticamente...
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
          ? 'Grabando dictado'
          : missingFieldsDialog.mode === 'processing'
            ? 'Procesando con IA'
            : 'Campos pendientes tras autocompletar'
      }
      message={(
        <>
          {missingFieldsDialog.mode === 'recording' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-1.5 h-6">
                <span className="w-1.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                <span className="w-1.5 h-4 rounded-full bg-rose-500 animate-pulse [animation-delay:120ms]" />
                <span className="w-1.5 h-3 rounded-full bg-rose-400 animate-pulse [animation-delay:240ms]" />
                <span className="w-1.5 h-5 rounded-full bg-rose-500 animate-pulse [animation-delay:360ms]" />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Estamos escuchando su voz. Presione <span className="font-semibold">Detener dictado</span> cuando termine.
              </p>
              {(missingFieldsDialog.missingRequired.length > 0 || missingFieldsDialog.notDetected.length > 0) && (
                <div className="text-left space-y-2">
                  {missingFieldsDialog.missingRequired.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Faltan para completar:</p>
                      <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                        {missingFieldsDialog.missingRequired.map((field) => (
                          <li key={`recording-missing-${field}`}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {missingFieldsDialog.notDetected.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">No detectados por IA:</p>
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
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Corrigiendo el texto y completando campos automáticamente...
              </p>
              <p className="text-xs text-gray-500 text-center">
                Esto puede tomar unos segundos.
              </p>
            </div>
          )}

          {missingFieldsDialog.mode === 'missing' && (
            <div className="text-left space-y-3">
              <p className="text-sm text-gray-600">
                Se autocompletó la reunión, pero aún faltan datos por confirmar.
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
                Puede completar estos datos manualmente o continuar dictando para que IA intente detectarlos.
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
    </>
  )
}
