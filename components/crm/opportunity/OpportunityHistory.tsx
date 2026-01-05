'use client'

import { useState, useEffect, useCallback } from 'react'
import { getEntityActivityLogs } from '@/app/actions/activity-log'
import { formatDateTime } from '@/lib/date'
import HistoryIcon from '@mui/icons-material/History'
import RefreshIcon from '@mui/icons-material/Refresh'

interface ActivityLogDetails {
  statusChange?: { from: string; to: string }
  changedFields?: string[]
  previousValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  taskAction?: 'created' | 'updated' | 'completed' | 'reopened' | 'deleted'
  taskTitle?: string
  taskCategory?: string
  taskDate?: string
  [key: string]: unknown
}

interface ActivityLog {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: ActivityLogDetails | null
  createdAt: Date
}

interface OpportunityHistoryProps {
  opportunityId: string
}

// Translate action to Spanish with full description
function getActionLabel(action: string, details?: ActivityLogDetails | null): string {
  // Handle task-specific actions
  if (details?.taskAction) {
    const taskLabels: Record<string, string> = {
      created: 'agregó tarea',
      updated: 'editó tarea',
      completed: 'completó tarea',
      reopened: 'reabrió tarea',
      deleted: 'eliminó tarea',
    }
    return taskLabels[details.taskAction] || 'modificó tarea'
  }

  const labels: Record<string, string> = {
    CREATE: 'creó esta oportunidad',
    UPDATE: 'actualizó la oportunidad',
    DELETE: 'eliminó la oportunidad',
    STATUS_CHANGE: 'cambió la etapa a',
    IMPORT: 'importó esta oportunidad',
  }
  return labels[action] || action.toLowerCase()
}

// Get dot color
function getDotColor(action: string, details?: ActivityLogDetails | null): string {
  // Handle task-specific actions
  if (details?.taskAction) {
    switch (details.taskAction) {
      case 'created':
        return 'bg-indigo-500'
      case 'completed':
        return 'bg-green-500'
      case 'reopened':
        return 'bg-amber-500'
      case 'deleted':
        return 'bg-red-400'
      case 'updated':
        return 'bg-blue-400'
      default:
        return 'bg-gray-400'
    }
  }

  switch (action) {
    case 'CREATE':
      return 'bg-green-500'
    case 'UPDATE':
      return 'bg-blue-500'
    case 'DELETE':
      return 'bg-red-500'
    case 'STATUS_CHANGE':
      return 'bg-orange-500'
    case 'IMPORT':
      return 'bg-purple-500'
    default:
      return 'bg-gray-400'
  }
}

// Translate stage names
function translateStage(stage: string): string {
  const stages: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    meeting: 'Reunión',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    won: 'Ganado',
    lost: 'Perdido',
  }
  return stages[stage] || stage
}

// Format details for display
function formatDetails(details: ActivityLogDetails | null): string | null {
  if (!details) return null

  // Task title takes priority
  if (details.taskTitle) {
    // Truncate long task titles
    const title = details.taskTitle
    return title.length > 30 ? title.substring(0, 30) + '...' : title
  }

  if (details.statusChange) {
    return translateStage(details.statusChange.to)
  }

  return null
}

// Format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return formatDateTime(date)
}

export default function OpportunityHistory({ opportunityId }: OpportunityHistoryProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getEntityActivityLogs('Opportunity', opportunityId, 50)
      if (result.success && result.data) {
        setLogs(result.data as ActivityLog[])
      } else {
        setError(result.error || 'Error al cargar')
      }
    } catch {
      setError('Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse py-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded flex-1" />
            <div className="h-3 bg-gray-100 rounded w-12" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-4">
          <p className="text-xs text-red-600 mb-2">{error}</p>
          <button
            type="button"
            onClick={loadLogs}
            className="text-xs text-blue-600 hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <HistoryIcon className="text-gray-300 mx-auto mb-2" style={{ fontSize: 32 }} />
          <p className="text-xs text-gray-400">Sin historial</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Historial</span>
        <button
          type="button"
          onClick={loadLogs}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshIcon style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Compact list */}
      <div className="space-y-0">
        {logs.map((log) => {
          const logDetails = log.details as ActivityLogDetails | null
          const formattedDetails = formatDetails(logDetails)
          const firstName = log.userName?.split(' ')[0] || 'Usuario'

          return (
            <div
              key={log.id}
              className="flex items-center gap-2.5 py-1.5 text-xs group hover:bg-gray-50 -mx-2 px-2 rounded"
            >
              {/* Dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getDotColor(log.action, logDetails)}`} />
              
              {/* Content */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className="font-medium text-gray-700 truncate">{firstName}</span>
                <span className="text-gray-400">{getActionLabel(log.action, logDetails)}</span>
                {formattedDetails && (
                  <span className="text-gray-500 font-medium truncate">{formattedDetails}</span>
                )}
              </div>

              {/* Time */}
              <span className="text-gray-400 flex-shrink-0 tabular-nums">
                {formatRelativeTime(log.createdAt)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

