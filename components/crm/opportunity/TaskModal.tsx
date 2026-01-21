'use client'

import { useState, useEffect } from 'react'
import GroupsIcon from '@mui/icons-material/Groups'
import type { Task } from '@/types'
import { Button, Input, Select, Textarea } from '@/components/ui'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import { getTodayInPanama } from '@/lib/date/timezone'

// Meeting data structure stored as JSON in notes
export interface MeetingData {
  meetingWith: string // Reunión con
  position: string // Posición
  isDecisionMaker: 'si' | 'no' | 'no_se' // ¿Es la persona que toma la decisión final?
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
  }) => void | Promise<void>
  loading?: boolean
  error?: string
  businessName?: string // For auto-filling "Reunión con"
  forCompletion?: boolean // When true, outcome fields are required before saving
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
}: TaskModalProps) {
  const [taskCategory, setTaskCategory] = useState<'meeting' | 'todo'>('todo')
  
  // Todo fields
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  
  // Meeting fields
  const [meetingWith, setMeetingWith] = useState('')
  const [position, setPosition] = useState('')
  const [isDecisionMaker, setIsDecisionMaker] = useState<'si' | 'no' | 'no_se'>('no_se')
  const [meetingDetails, setMeetingDetails] = useState('')
  const [meetingHappened, setMeetingHappened] = useState<'si' | 'no'>('no') // New field for "today" meetings
  const [reachedAgreement, setReachedAgreement] = useState<'si' | 'no'>('si')
  const [mainObjection, setMainObjection] = useState('')
  const [objectionSolution, setObjectionSolution] = useState('')
  const [nextSteps, setNextSteps] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    // Reset validation error when modal opens or task changes
    setValidationError(null)
    
    if (task) {
      setTaskCategory(task.category)
      // Format the task date in Panama timezone for the date input
      const taskDateObj = new Date(task.date)
      const year = taskDateObj.getUTCFullYear()
      const month = String(taskDateObj.getUTCMonth() + 1).padStart(2, '0')
      const day = String(taskDateObj.getUTCDate()).padStart(2, '0')
      setTaskDate(`${year}-${month}-${day}`)
      
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
      setIsDecisionMaker('no_se')
      setMeetingDetails('')
      setMeetingHappened('no')
      setReachedAgreement('si')
      setMainObjection('')
      setObjectionSolution('')
      setNextSteps('')
    }
  }, [task, isOpen, businessName, forCompletion])


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

  // Determine if date is past, today, or future using Panama timezone
  const todayStr = getTodayInPanama() // YYYY-MM-DD in Panama timezone
  const selectedDateStr = taskDate || todayStr
  
  const isDatePast = selectedDateStr < todayStr
  const isDateToday = selectedDateStr === todayStr
  const isDateFuture = selectedDateStr > todayStr

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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={task ? (isMeeting ? 'Editar Reunión' : 'Editar Tarea') : (isMeeting ? 'Nueva Reunión' : 'Nueva Tarea')}
      icon={isMeeting ? <GroupsIcon fontSize="small" /> : undefined}
      iconColor={isMeeting ? 'blue' : 'orange'}
      maxWidth={isMeeting ? '2xl' : 'md'}
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
      <form id="task-modal-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {(error || validationError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {validationError || error}
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
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <GroupsIcon fontSize="small" className="text-blue-600" />
                  Información de la Reunión
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Select
                label="¿Es la persona que toma la decisión final?"
                value={isDecisionMaker}
                onChange={(e) => setIsDecisionMaker(e.target.value as 'si' | 'no' | 'no_se')}
                required
                options={[
                  { value: 'si', label: 'Sí' },
                  { value: 'no', label: 'No' },
                  { value: 'no_se', label: 'No sé' },
                ]}
              />

              <Textarea
                label="Detalle de la reunión"
                value={meetingDetails}
                onChange={(e) => setMeetingDetails(e.target.value)}
                required
                rows={4}
                placeholder="Ser lo más claro y específico posible de todos los puntos relevantes de la reunión..."
                helperText="Incluya todos los puntos importantes discutidos"
              />

              {/* Show "Meeting happened?" field only for today's date */}
              {isDateToday && (
                <Select
                  label="¿Ya se tuvo la reunión?"
                  value={meetingHappened}
                  onChange={(e) => setMeetingHappened(e.target.value as 'si' | 'no')}
                  required
                  options={[
                    { value: 'no', label: 'No' },
                    { value: 'si', label: 'Sí' },
                  ]}
                />
              )}

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
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
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
                    rows={3}
                    placeholder='Ej: "Se enviará propuesta de…" o "Aliado se reunirá, y quedamos en hablar el día…"'
                    helperText="Acciones definidas y fechas de seguimiento"
                  />
                </>
              )}
            </>
          )}

      </form>
    </ModalShell>
  )
}
