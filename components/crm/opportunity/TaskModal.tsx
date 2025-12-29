'use client'

import { useState, useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import GroupsIcon from '@mui/icons-material/Groups'
import type { Task } from '@/types'
import { Button, Input, Select, Textarea } from '@/components/ui'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'

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
}

export default function TaskModal({ 
  isOpen, 
  onClose, 
  task, 
  onSubmit, 
  loading, 
  error,
  businessName = ''
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
  const [reachedAgreement, setReachedAgreement] = useState<'si' | 'no'>('si')
  const [mainObjection, setMainObjection] = useState('')
  const [objectionSolution, setObjectionSolution] = useState('')
  const [nextSteps, setNextSteps] = useState('')

  useEffect(() => {
    if (task) {
      setTaskCategory(task.category)
      setTaskDate(new Date(task.date).toISOString().split('T')[0])
      
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
          // Title is derived from meetingWith
          setTaskTitle(meetingData.meetingWith)
        } else {
          // Fallback for old meeting data
          setTaskTitle(task.title)
          setTaskNotes(task.notes || '')
        }
      } else {
        setTaskTitle(task.title)
        setTaskNotes(task.notes || '')
      }
    } else {
      // Reset all fields for new task
      setTaskCategory('todo')
      setTaskTitle('')
      setTaskDate(new Date().toISOString().split('T')[0])
      setTaskNotes('')
      // Reset meeting fields
      setMeetingWith('')
      setPosition('')
      setIsDecisionMaker('no_se')
      setMeetingDetails('')
      setReachedAgreement('si')
      setMainObjection('')
      setObjectionSolution('')
      setNextSteps('')
    }
  }, [task, isOpen, businessName])


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (taskCategory === 'meeting') {
      // Build meeting data
      const meetingData: MeetingData = {
        meetingWith,
        position,
        isDecisionMaker,
        meetingDetails,
        reachedAgreement,
        nextSteps,
      }
      
      // Only include objection fields if agreement was not reached
      if (reachedAgreement === 'no') {
        meetingData.mainObjection = mainObjection
        meetingData.objectionSolution = objectionSolution
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

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={task ? (isMeeting ? 'Editar Reunión' : 'Editar Tarea') : (isMeeting ? 'Nueva Reunión' : 'Nueva Tarea')}
      icon={isMeeting ? <GroupsIcon fontSize="small" /> : undefined}
      iconColor={isMeeting ? 'blue' : 'orange'}
      maxWidth={isMeeting ? '2xl' : 'md'}
      footer={
        <ModalFooter
          onCancel={onClose}
          submitLabel={task ? 'Actualizar' : 'Crear'}
          submitLoading={loading}
          submitDisabled={loading}
          submitVariant={isMeeting ? 'primary' : 'primary'}
        />
      }
    >
      <form id="modal-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error}
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
                onChange={(e) => setNextSteps(e.target.value)}
                required
                rows={3}
                placeholder='Ej: "Se enviará propuesta de…" o "Aliado se reunirá, y quedamos en hablar el día…"'
                helperText="Acciones definidas y fechas de seguimiento"
              />
            </>
          )}

      </form>
    </ModalShell>
  )
}
