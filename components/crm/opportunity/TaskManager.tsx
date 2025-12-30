'use client'

import { useState } from 'react'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import EventIcon from '@mui/icons-material/Event'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonIcon from '@mui/icons-material/Person'
import WorkIcon from '@mui/icons-material/Work'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { Task } from '@/types'
import { parseMeetingData, type MeetingData } from './TaskModal'
import { Button } from '@/components/ui'

interface TaskManagerProps {
  tasks: Task[]
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onToggleComplete: (task: Task) => void
  isAdmin?: boolean
}

export default function TaskManager({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  isAdmin = false,
}: TaskManagerProps) {
  const futureTasks = tasks
    .filter(t => !t.completed && new Date(t.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const pastTasks = tasks
    .filter(t => t.completed || new Date(t.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <EventIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
        <p className="text-sm text-gray-500 mb-2">No hay tareas aún</p>
        <Button
          type="button"
          onClick={onAddTask}
          variant="secondary"
          size="sm"
          leftIcon={<AddIcon fontSize="small" />}
          className="border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          Crear Primera Tarea
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Task Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onAddTask}
          size="sm"
          leftIcon={<AddIcon fontSize="small" />}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Nueva Tarea
        </Button>
      </div>

      {/* Future Tasks */}
      {futureTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">Tareas Pendientes</h3>
          </div>
          <div className="p-4 space-y-2">
            {futureTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Tasks */}
      {pastTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700">Tareas Pasadas</h3>
          </div>
          <div className="p-4 space-y-2">
            {pastTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
                isPast
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskItem({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  isPast = false,
  isAdmin = false,
}: {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onToggleComplete: (task: Task) => void
  isPast?: boolean
  isAdmin?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isMeeting = task.category === 'meeting'
  const meetingData = isMeeting ? parseMeetingData(task.notes) : null

  return (
    <div
      className={`border rounded-lg ${
        isPast
          ? task.completed
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200 opacity-75'
          : isMeeting
          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      } transition-colors`}
    >
      {/* Header Row */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <button
              type="button"
              onClick={() => onToggleComplete(task)}
              className="mt-0.5 text-gray-400 hover:text-green-600 transition-colors"
            >
              {task.completed ? (
                <CheckCircleIcon className="text-green-600" fontSize="small" />
              ) : (
                <RadioButtonUncheckedIcon fontSize="small" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                  isMeeting 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isMeeting && <GroupsIcon style={{ fontSize: 12 }} />}
                  {isMeeting ? 'Reunión' : 'Tarea'}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(task.date).toLocaleDateString('es-ES', {
                    timeZone: PANAMA_TIMEZONE,
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {meetingData && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                    meetingData.reachedAgreement === 'si'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {meetingData.reachedAgreement === 'si' ? (
                      <><ThumbUpIcon style={{ fontSize: 10 }} /> Acuerdo</>
                    ) : (
                      <><ThumbDownIcon style={{ fontSize: 10 }} /> Sin acuerdo</>
                    )}
                  </span>
                )}
              </div>
              <h4 className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {meetingData ? `Reunión con ${meetingData.meetingWith}` : task.title}
              </h4>
              
              {/* Quick preview for meetings */}
              {meetingData && !expanded && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {meetingData.position} • {meetingData.isDecisionMaker === 'si' ? 'Decisor' : meetingData.isDecisionMaker === 'no' ? 'No decisor' : 'Desconocido'}
                </p>
              )}
              
              {/* Regular notes for non-meetings */}
              {!isMeeting && task.notes && (
                <p className="text-xs text-gray-600 mt-1">{task.notes}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand button for meetings */}
            {meetingData && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                title={expanded ? 'Contraer' : 'Expandir'}
              >
                {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <EditIcon fontSize="small" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <DeleteIcon fontSize="small" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Meeting Details */}
      {meetingData && expanded && (
        <MeetingDetails meetingData={meetingData} />
      )}
    </div>
  )
}

function MeetingDetails({ meetingData }: { meetingData: MeetingData }) {
  return (
    <div className="border-t border-blue-200 bg-white px-4 py-3 space-y-3 text-sm">
      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-2">
          <PersonIcon className="text-blue-500 mt-0.5" style={{ fontSize: 16 }} />
          <div>
            <p className="text-xs font-medium text-gray-500">Reunión con</p>
            <p className="text-gray-900">{meetingData.meetingWith}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <WorkIcon className="text-blue-500 mt-0.5" style={{ fontSize: 16 }} />
          <div>
            <p className="text-xs font-medium text-gray-500">Posición</p>
            <p className="text-gray-900">{meetingData.position}</p>
          </div>
        </div>
      </div>

      {/* Decision Maker */}
      <div>
        <p className="text-xs font-medium text-gray-500">¿Es quien toma la decisión final?</p>
        <p className={`font-medium ${
          meetingData.isDecisionMaker === 'si' 
            ? 'text-green-700' 
            : meetingData.isDecisionMaker === 'no' 
            ? 'text-red-700' 
            : 'text-gray-700'
        }`}>
          {meetingData.isDecisionMaker === 'si' ? 'Sí' : meetingData.isDecisionMaker === 'no' ? 'No' : 'No sé'}
        </p>
      </div>

      {/* Meeting Details */}
      <div>
        <p className="text-xs font-medium text-gray-500">Detalle de la reunión</p>
        <p className="text-gray-900 whitespace-pre-wrap">{meetingData.meetingDetails}</p>
      </div>

      {/* Agreement Status */}
      <div className={`p-3 rounded-lg ${
        meetingData.reachedAgreement === 'si' 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-amber-50 border border-amber-200'
      }`}>
        <p className="text-xs font-medium text-gray-500">¿Se llegó a un acuerdo?</p>
        <p className={`font-semibold ${
          meetingData.reachedAgreement === 'si' ? 'text-green-700' : 'text-amber-700'
        }`}>
          {meetingData.reachedAgreement === 'si' ? '✓ Sí' : '✗ No'}
        </p>
      </div>

      {/* Objection fields - only if no agreement */}
      {meetingData.reachedAgreement === 'no' && (meetingData.mainObjection || meetingData.objectionSolution) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          {meetingData.mainObjection && (
            <div>
              <p className="text-xs font-medium text-amber-700">Principal objeción</p>
              <p className="text-amber-900">{meetingData.mainObjection}</p>
            </div>
          )}
          {meetingData.objectionSolution && (
            <div>
              <p className="text-xs font-medium text-amber-700">Posible solución</p>
              <p className="text-amber-900">{meetingData.objectionSolution}</p>
            </div>
          )}
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs font-medium text-blue-700">Siguientes pasos</p>
        <p className="text-blue-900 whitespace-pre-wrap">{meetingData.nextSteps}</p>
      </div>
    </div>
  )
}
