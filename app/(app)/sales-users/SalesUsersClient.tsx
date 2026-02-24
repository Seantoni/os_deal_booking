'use client'

import GroupsIcon from '@mui/icons-material/Groups'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import EventNoteIcon from '@mui/icons-material/EventNote'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { formatDateTime } from '@/lib/date'

interface SalesUserCardData {
  clerkId: string
  name: string | null
  email: string | null
  lastLoginAt: Date | string | null
  lastActivityAt: Date | string | null
  meetingsLast7Days: number
  tasksLast7Days: number
  approvalsLast7Days: number
}

interface SalesUsersClientProps {
  users: SalesUserCardData[]
  windowLabel: {
    startDate: string
    endDate: string
  } | null
  error: string | null
}

function getHoursSince(date: Date | string | null): string {
  if (!date) return '—'
  const resolved = new Date(date)
  if (Number.isNaN(resolved.getTime())) return '—'

  const diffMs = Date.now() - resolved.getTime()
  if (diffMs <= 0) return '0h'

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours === 0) return '<1h'
  return `${hours}h`
}

function formatWindowLabel(windowLabel: { startDate: string; endDate: string } | null): string {
  if (!windowLabel) return 'Últimos 7 días'
  return `${windowLabel.startDate} → ${windowLabel.endDate}`
}

function formatDateWithHoursAgo(date: Date | string | null): string {
  if (!date) return 'Sin registro'
  const resolved = new Date(date)
  if (Number.isNaN(resolved.getTime())) return 'Sin registro'
  return `${formatDateTime(resolved)} · hace ${getHoursSince(resolved)}`
}

export default function SalesUsersClient({ users, windowLabel, error }: SalesUsersClientProps) {
  return (
    <div className="h-full overflow-auto p-4 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <GroupsIcon className="text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Resumen de usuarios con rol Sales</h2>
            </div>
            <span className="text-xs text-slate-500">Ventana: {formatWindowLabel(windowLabel)}</span>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <WarningAmberIcon className="text-amber-700" />
            <p className="text-sm text-amber-900">{error}</p>
          </div>
        )}

        {!error && users.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
            No hay usuarios activos con rol sales.
          </div>
        )}

        {users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user) => (
              <div key={user.clerkId} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {user.name || user.email || user.clerkId}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">{user.email || user.clerkId}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <AccessTimeIcon className="text-slate-400 mt-0.5" style={{ fontSize: 16 }} />
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wide">Última actividad</p>
                      <p className="text-xs text-slate-700">
                        {formatDateWithHoursAgo(user.lastActivityAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 text-center">
                    <EventNoteIcon className="text-blue-700 mx-auto" style={{ fontSize: 16 }} />
                    <p className="text-[10px] text-blue-700 mt-1">Meetings 7d</p>
                    <p className="text-sm font-semibold text-blue-800">{user.meetingsLast7Days}</p>
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-2 text-center">
                    <TaskAltIcon className="text-indigo-700 mx-auto" style={{ fontSize: 16 }} />
                    <p className="text-[10px] text-indigo-700 mt-1">Tasks 7d</p>
                    <p className="text-sm font-semibold text-indigo-800">{user.tasksLast7Days}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-center">
                    <CheckCircleIcon className="text-emerald-700 mx-auto" style={{ fontSize: 16 }} />
                    <p className="text-[10px] text-emerald-700 mt-1">Approvals 7d</p>
                    <p className="text-sm font-semibold text-emerald-800">{user.approvalsLast7Days}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
