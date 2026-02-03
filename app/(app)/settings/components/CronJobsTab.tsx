'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCronJobLogs, getCronJobStats, type CronJobLog, type CronJobName, type CronJobStatus } from '@/app/actions/cron-logs'
import RefreshIcon from '@mui/icons-material/Refresh'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import toast from 'react-hot-toast'

const JOB_LABELS: Record<string, string> = {
  'deal-metrics-sync': 'Sync de Métricas',
  'task-reminders': 'Recordatorios de Tareas',
  'market-intelligence-scan': 'Escaneo de Mercado',
  'event-leads-sync': 'Sync de Eventos',
}

const STATUS_CONFIG = {
  running: { icon: HourglassEmptyIcon, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Ejecutando' },
  success: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50', label: 'Exitoso' },
  failed: { icon: ErrorIcon, color: 'text-red-600', bg: 'bg-red-50', label: 'Fallido' },
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-PA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Panama',
  })
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Nunca'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins}min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  return `Hace ${diffDays}d`
}

export default function CronJobsTab() {
  const [logs, setLogs] = useState<CronJobLog[]>([])
  const [stats, setStats] = useState<{
    jobName: string
    lastRun: Date | null
    lastStatus: string | null
    successCount24h: number
    failedCount24h: number
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filterJob, setFilterJob] = useState<CronJobName | ''>('')
  const [filterStatus, setFilterStatus] = useState<CronJobStatus | ''>('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const pageSize = 15

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [logsResult, statsResult] = await Promise.all([
        getCronJobLogs({
          page,
          pageSize,
          jobName: filterJob || undefined,
          status: filterStatus || undefined,
        }),
        getCronJobStats(),
      ])

      if (logsResult.success && logsResult.data) {
        setLogs(logsResult.data)
        setTotalCount(logsResult.totalCount ?? 0)
      }
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data)
      }
    } catch (error) {
      console.error('Failed to load cron logs:', error)
      toast.error('Error al cargar logs')
    } finally {
      setLoading(false)
    }
  }, [page, filterJob, filterStatus])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleTriggerJob = async (jobName: CronJobName) => {
    setTriggering(jobName)
    try {
      const endpoints: Record<CronJobName, string> = {
        'deal-metrics-sync': '/api/cron/deal-metrics-sync',
        'task-reminders': '/api/cron/task-reminders',
        'market-intelligence-scan': '/api/cron/market-intelligence-scan',
        'event-leads-sync': '/api/cron/event-leads-sync',
      }

      const response = await fetch(endpoints[jobName], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.success || response.ok) {
        toast.success(`${JOB_LABELS[jobName]} iniciado`)
        // Reload data after a short delay
        setTimeout(() => loadData(), 2000)
      } else {
        toast.error(result.error || 'Error al iniciar job')
      }
    } catch (error) {
      console.error('Failed to trigger job:', error)
      toast.error('Error al iniciar job')
    } finally {
      setTriggering(null)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const StatusIcon = stat.lastStatus ? STATUS_CONFIG[stat.lastStatus as keyof typeof STATUS_CONFIG]?.icon : null
          const statusColor = stat.lastStatus ? STATUS_CONFIG[stat.lastStatus as keyof typeof STATUS_CONFIG]?.color : 'text-gray-400'

          return (
            <div
              key={stat.jobName}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">
                  {JOB_LABELS[stat.jobName] || stat.jobName}
                </h3>
                <button
                  onClick={() => handleTriggerJob(stat.jobName as CronJobName)}
                  disabled={triggering === stat.jobName}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="Ejecutar manualmente"
                >
                  {triggering === stat.jobName ? (
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayArrowIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Última ejecución:</span>
                  <div className="flex items-center gap-1.5">
                    {StatusIcon && <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />}
                    <span className="text-gray-700">{formatRelativeTime(stat.lastRun)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Últimas 24h:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">{stat.successCount24h} ✓</span>
                    {stat.failedCount24h > 0 && (
                      <span className="text-red-600">{stat.failedCount24h} ✗</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterJob}
            onChange={(e) => {
              setFilterJob(e.target.value as CronJobName | '')
              setPage(0)
            }}
            className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los jobs</option>
            <option value="deal-metrics-sync">Sync de Métricas</option>
            <option value="task-reminders">Recordatorios de Tareas</option>
            <option value="market-intelligence-scan">Escaneo de Mercado</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as CronJobStatus | '')
              setPage(0)
            }}
            className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="success">Exitoso</option>
            <option value="failed">Fallido</option>
            <option value="running">Ejecutando</option>
          </select>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-2"></th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Iniciado
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duración
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No hay logs disponibles
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const statusConfig = STATUS_CONFIG[log.status as keyof typeof STATUS_CONFIG]
                const StatusIcon = statusConfig?.icon || HourglassEmptyIcon
                const isExpanded = expandedRow === log.id
                const hasDetails = log.details || log.error || log.message

                return (
                  <>
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 ${hasDetails ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDetails && setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <td className="px-3 py-2">
                        {hasDetails && (
                          <ExpandMoreIcon
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {JOB_LABELS[log.jobName] || log.jobName}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig?.bg} ${statusConfig?.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig?.label || log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatDateTime(log.startedAt)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {formatDuration(log.durationMs)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-400 capitalize">
                        {log.triggeredBy}
                      </td>
                    </tr>
                    {isExpanded && hasDetails && (
                      <tr key={`${log.id}-details`}>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <div className="space-y-2 text-xs">
                            {log.message && (
                              <div>
                                <span className="font-medium text-gray-700">Mensaje:</span>
                                <span className="ml-2 text-gray-600">{log.message}</span>
                              </div>
                            )}
                            {log.error && (
                              <div>
                                <span className="font-medium text-red-600">Error:</span>
                                <span className="ml-2 text-red-600">{log.error}</span>
                              </div>
                            )}
                            {log.details && (
                              <div>
                                <span className="font-medium text-gray-700">Detalles:</span>
                                <pre className="mt-1 p-2 bg-white border border-gray-200 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <strong>Horarios de Cron Jobs (hora Panamá):</strong>
        <ul className="mt-1 ml-4 list-disc">
          <li>Sync de Métricas: 12:00 AM (medianoche)</li>
          <li>Recordatorios de Tareas: 8:00 AM</li>
          <li>Escaneo de Mercado: 12:00 AM (medianoche)</li>
        </ul>
        <p className="mt-2">Los logs se mantienen por 30 días.</p>
      </div>
    </div>
  )
}
