'use client'

import EventIcon from '@mui/icons-material/Event'
import type { Opportunity, Task } from '@/types'
import TaskManager from './TaskManager'

interface OpportunityActivityTabProps {
  opportunity?: Opportunity | null
  tasks: Task[]
  isAdmin: boolean
  isViewOnly: boolean
  isDictating: boolean
  onAddTask: () => void
  onDictateTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onToggleComplete: (task: Task) => void
}

export default function OpportunityActivityTab({
  opportunity,
  tasks,
  isAdmin,
  isViewOnly,
  isDictating,
  onAddTask,
  onDictateTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
}: OpportunityActivityTabProps) {
  return (
    <div className="p-3 md:p-6">
      {!opportunity ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <EventIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
          <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para agregar tareas</p>
          <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para agregar actividades</p>
        </div>
      ) : (
        <TaskManager
          tasks={tasks}
          onAddTask={isViewOnly ? () => {} : onAddTask}
          onDictateTask={isViewOnly ? undefined : onDictateTask}
          onEditTask={isViewOnly ? () => {} : onEditTask}
          onDeleteTask={isViewOnly ? () => {} : onDeleteTask}
          onToggleComplete={isViewOnly ? () => {} : onToggleComplete}
          isAdmin={isAdmin}
          readOnly={isViewOnly}
          isDictating={isDictating}
        />
      )}
    </div>
  )
}
