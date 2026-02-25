'use client'

import { useState } from 'react'
import { PANAMA_TIMEZONE, getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import AddIcon from '@mui/icons-material/Add'
import MicIcon from '@mui/icons-material/Mic'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import EventIcon from '@mui/icons-material/Event'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import type { Task } from '@/types'
import { parseMeetingData, type MeetingData } from './TaskModal'
import { Button } from '@/components/ui'

interface TaskManagerProps {
  tasks: Task[]
  onAddTask: () => void
  onDictateTask?: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onToggleComplete: (task: Task) => void
  isAdmin?: boolean
  readOnly?: boolean
  isDictating?: boolean
}

type TaskFilter = 'all' | 'task' | 'meeting'

export default function TaskManager({
  tasks,
  onAddTask,
  onDictateTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  isAdmin = false,
  readOnly = false,
  isDictating = false,
}: TaskManagerProps) {
  const [filter, setFilter] = useState<TaskFilter>('all')
  const todayStr = getTodayInPanama() // YYYY-MM-DD in Panama timezone
  
  // Helper to get the date string from a task date (using Panama timezone)
  const getTaskDateStr = (date: Date | string) => {
    return formatDateForPanama(new Date(date))
  }

  // Filter tasks by type
  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'meeting') return t.category === 'meeting'
    return t.category !== 'meeting'
  })

  // Count tasks by type for badges
  const meetingCount = tasks.filter(t => t.category === 'meeting').length
  const taskCount = tasks.filter(t => t.category !== 'meeting').length
  
  const futureTasks = filteredTasks
    .filter(t => {
      const taskDateStr = getTaskDateStr(t.date)
      return !t.completed && taskDateStr >= todayStr
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const pastTasks = filteredTasks
    .filter(t => {
      const taskDateStr = getTaskDateStr(t.date)
      return t.completed || taskDateStr < todayStr
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <EventIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
        <p className="text-sm text-gray-500 mb-2">No hay tareas aún</p>
        {!readOnly && (
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              onClick={onAddTask}
              variant="secondary"
              size="sm"
              leftIcon={<AddIcon fontSize="small" />}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              Crear Tarea
            </Button>
            {onDictateTask && (
              <Button
                type="button"
                onClick={onDictateTask}
                variant="secondary"
                size="sm"
                leftIcon={<MicIcon fontSize="small" />}
                className={isDictating
                  ? 'border-rose-300 bg-rose-50 text-rose-600 animate-pulse'
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}
              >
                {isDictating ? 'Grabando...' : 'Dictar'}
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
            filter === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('task')}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
            filter === 'task'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tareas ({taskCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('meeting')}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
            filter === 'meeting'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          Reuniones ({meetingCount})
        </button>
      </div>

      {/* Future Tasks */}
      {futureTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Tareas Pendientes</h3>
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                {onDictateTask && (
                  <Button
                    type="button"
                    onClick={onDictateTask}
                    size="xs"
                    leftIcon={<MicIcon style={{ fontSize: 14 }} />}
                    className={isDictating
                      ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700'}
                  >
                    {isDictating ? 'Grabando...' : 'Dictar'}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={onAddTask}
                  size="xs"
                  leftIcon={<AddIcon style={{ fontSize: 14 }} />}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Nueva
                </Button>
              </div>
            )}
          </div>
          <div className="p-2 space-y-0">
            {futureTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={readOnly ? undefined : onEditTask}
                onDelete={readOnly ? undefined : onDeleteTask}
                onToggleComplete={readOnly ? undefined : onToggleComplete}
                isAdmin={isAdmin}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Tasks */}
      {pastTasks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Tareas Pasadas</h3>
            {!readOnly && futureTasks.length === 0 && (
              <div className="flex items-center gap-1.5">
                {onDictateTask && (
                  <Button
                    type="button"
                    onClick={onDictateTask}
                    size="xs"
                    leftIcon={<MicIcon style={{ fontSize: 14 }} />}
                    className={isDictating
                      ? 'bg-rose-500 hover:bg-rose-600 animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-700'}
                  >
                    {isDictating ? 'Grabando...' : 'Dictar'}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={onAddTask}
                  size="xs"
                  leftIcon={<AddIcon style={{ fontSize: 14 }} />}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Nueva
                </Button>
              </div>
            )}
          </div>
          <div className="p-2 space-y-0">
            {pastTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={readOnly ? undefined : onEditTask}
                onDelete={readOnly ? undefined : onDeleteTask}
                onToggleComplete={readOnly ? undefined : onToggleComplete}
                isPast
                isAdmin={isAdmin}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state for filtered results */}
      {futureTasks.length === 0 && pastTasks.length === 0 && filter !== 'all' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-sm text-gray-500">
            No hay {filter === 'meeting' ? 'reuniones' : 'tareas'} registradas
          </p>
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
  readOnly = false,
}: {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
  onToggleComplete?: (task: Task) => void
  isPast?: boolean
  isAdmin?: boolean
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isMeeting = task.category === 'meeting'
  const meetingData = isMeeting ? parseMeetingData(task.notes) : null

  // Format date compactly
  const formattedDate = new Date(task.date).toLocaleDateString('es-ES', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
  })

  // Calculate days difference (using Panama timezone)
  const taskDateStr = formatDateForPanama(new Date(task.date))
  const taskParts = taskDateStr.split('-').map(Number)
  
  const todayStr = getTodayInPanama() // YYYY-MM-DD
  const todayParts = todayStr.split('-').map(Number)
  
  // Create local dates for diff calculation (both at midnight)
  const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
  const taskLocalDate = new Date(taskParts[0], taskParts[1] - 1, taskParts[2])
  
  const diffTime = taskLocalDate.getTime() - todayDate.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  let daysText = ''
  let daysColor = ''
  
  if (diffDays > 0) {
    daysText = `en ${diffDays}d`
    // Color based on urgency: red for 0-2 days, orange for 3-7 days, green for 8+ days
    if (diffDays <= 2) {
      daysColor = 'text-red-500'
    } else if (diffDays <= 7) {
      daysColor = 'text-amber-500'
    } else {
      daysColor = 'text-green-500'
    }
  } else if (diffDays < 0) {
    daysText = `hace ${Math.abs(diffDays)}d`
    // Overdue tasks are always red
    daysColor = 'text-red-500'
  } else {
    daysText = 'hoy'
    // Today is urgent
    daysColor = 'text-red-500'
  }

  return (
    <div
      className={`group transition-colors border-b border-gray-200 last:border-b-0 ${
        isPast
          ? task.completed
            ? 'hover:bg-green-50'
            : 'opacity-60 hover:bg-gray-50'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Single Row Layout */}
      <div className="flex items-center gap-2 py-1 px-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => !readOnly && onToggleComplete?.(task)}
          className={`flex-shrink-0 ${readOnly ? 'cursor-default' : 'text-gray-300 hover:text-green-500 transition-colors'}`}
          disabled={readOnly}
        >
          {task.completed ? (
            <CheckCircleIcon className="text-green-500" style={{ fontSize: 18 }} />
          ) : (
            <RadioButtonUncheckedIcon className={readOnly ? 'text-gray-300' : ''} style={{ fontSize: 18 }} />
          )}
        </button>

        {/* Type indicator dot */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isMeeting ? 'bg-blue-500' : 'bg-gray-400'
        }`} />

        {/* Title with description */}
        <span className={`text-xs flex-1 min-w-0 truncate ${
          task.completed ? 'line-through text-gray-400' : 'text-gray-700'
        }`}>
          {meetingData ? `${meetingData.meetingWith}` : task.title}
          {!isMeeting && task.notes && (
            <span className="text-gray-400 font-normal"> | {task.notes}</span>
          )}
        </span>

        {/* Due date with days remaining in parentheses */}
        <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">
          {formattedDate} <span className={daysColor}>({daysText})</span>
        </span>

        {/* Task type */}
        <span className="text-[11px] text-gray-500 flex-shrink-0">
          {isMeeting ? 'Reunión' : 'Tarea'}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
          >
            {expanded ? <ExpandLessIcon style={{ fontSize: 16 }} /> : <ExpandMoreIcon style={{ fontSize: 16 }} />}
          </button>
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => onEdit?.(task)}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <EditIcon style={{ fontSize: 16 }} />
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDelete?.(task.id)}
                  className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <DeleteIcon style={{ fontSize: 16 }} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="ml-[68px] mr-2 mb-2">
          {meetingData ? (
            <MeetingDetails meetingData={meetingData} />
          ) : task.notes ? (
            <div className="bg-gray-50 border border-gray-100 rounded-md p-2.5 text-xs text-gray-600">
              {task.notes}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MeetingDetails({ meetingData }: { meetingData: MeetingData }) {
  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-md p-2.5 space-y-2 text-xs">
      {/* Contact & Position - inline */}
      <div className="flex items-center gap-3 text-gray-600">
        <span><span className="text-gray-400">Con:</span> {meetingData.meetingWith}</span>
        <span className="text-gray-300">•</span>
        <span><span className="text-gray-400">Cargo:</span> {meetingData.position}</span>
        <span className="text-gray-300">•</span>
        <span className={meetingData.isDecisionMaker === 'si' ? 'text-green-600' : 'text-gray-500'}>
          {meetingData.isDecisionMaker === 'si' ? '✓ Decisor' : meetingData.isDecisionMaker === 'no' ? 'No decisor' : '? Desconocido'}
        </span>
      </div>

      {/* Meeting Details */}
      {meetingData.meetingDetails && (
        <p className="text-gray-600 whitespace-pre-wrap">{meetingData.meetingDetails}</p>
      )}

      {/* Agreement & Objections */}
      {meetingData.reachedAgreement === 'no' && (meetingData.mainObjection || meetingData.objectionSolution) && (
        <div className="text-amber-700 bg-amber-50 rounded px-2 py-1.5">
          {meetingData.mainObjection && <p><span className="font-medium">Objeción:</span> {meetingData.mainObjection}</p>}
          {meetingData.objectionSolution && <p><span className="font-medium">Solución:</span> {meetingData.objectionSolution}</p>}
        </div>
      )}

      {/* Next Steps */}
      {meetingData.nextSteps && (
        <div className="text-blue-700 bg-blue-50 rounded px-2 py-1.5">
          <span className="font-medium">Siguiente:</span> {meetingData.nextSteps}
        </div>
      )}
    </div>
  )
}
