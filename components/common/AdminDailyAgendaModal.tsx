'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalShell from '@/components/shared/ModalShell'
import { Button } from '@/components/ui/Button'
import { getAdminDailyAgenda, type AdminDailyAgendaData } from '@/app/actions/daily-agenda'
import { getTodayInPanama } from '@/lib/date/timezone'
import TodayIcon from '@mui/icons-material/Today'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded'
import BlockIcon from '@mui/icons-material/Block'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import GroupsIcon from '@mui/icons-material/Groups'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import VideocamIcon from '@mui/icons-material/Videocam'

interface AdminDailyAgendaModalProps {
  isOpen: boolean
  onClose: () => void
}

function DeltaBadge({ value, avg, suffix = '' }: { value: number; avg: number; suffix?: string }) {
  if (avg <= 0) return null
  const delta = ((value - avg) / avg) * 100
  const isPositive = delta >= 0
  const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      <Icon style={{ fontSize: 11 }} />
      {isPositive ? '+' : ''}{delta.toFixed(0)}%{suffix}
    </span>
  )
}

export default function AdminDailyAgendaModal({ isOpen, onClose }: AdminDailyAgendaModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agenda, setAgenda] = useState<AdminDailyAgendaData | null>(null)

  const loadAgenda = useCallback(async (force = false) => {
    if (!force && agenda && agenda.yesterday.date) {
      const today = getTodayInPanama()
      const [y, m, d] = today.split('-').map(Number)
      const todayMs = new Date(y, m - 1, d).getTime()
      const [yy, ym, yd] = agenda.yesterday.date.split('-').map(Number)
      const yesterdayMs = new Date(yy, ym - 1, yd).getTime()
      if (todayMs - yesterdayMs <= 86400000) return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await getAdminDailyAgenda()
      if (result.success && result.data) {
        setAgenda(result.data)
        return
      }
      setError(result.error || 'No se pudo cargar la agenda diaria.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda diaria.')
    } finally {
      setLoading(false)
    }
  }, [agenda])

  useEffect(() => {
    if (!isOpen) return
    void loadAgenda()
  }, [isOpen, loadAgenda])

  const summaryLine = useMemo(() => {
    if (!agenda) return ''
    const a = agenda
    const parts: string[] = []
    if (a.bookingActivity.sent > 0) parts.push(`${a.bookingActivity.sent} solicitudes enviadas`)
    if (a.bookingActivity.booked > 0) parts.push(`${a.bookingActivity.booked} reservadas`)
    if (a.meetingsCompleted > 0) parts.push(`${a.meetingsCompleted} reuniones completadas`)
    if (a.objections.length > 0) parts.push(`${a.objections.length} objeciones`)
    if (a.tier1AtRisk.length > 0) parts.push(`${a.tier1AtRisk.length} Tier 1 en riesgo`)
    const detail = parts.length > 0 ? parts.join(', ') + '.' : 'sin actividad registrada.'
    return `Hola ${a.user.displayName}, ayer (${a.yesterday.displayLabel}): ${detail}`
  }, [agenda])

  const handleOpenDashboard = () => {
    onClose()
    router.push('/dashboard')
  }

  const handleOpenBookingRequests = () => {
    onClose()
    router.push('/booking-requests')
  }

  const noOpportunityCount = agenda?.tier1AtRisk.filter((b) => b.riskType === 'no_opportunity').length ?? 0
  const noTractionCount = agenda?.tier1AtRisk.filter((b) => b.riskType === 'no_traction').length ?? 0

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title="Agenda macro diaria"
      subtitle="Admin"
      icon={<TodayIcon style={{ fontSize: 18 }} />}
      iconColor="purple"
      footer={(
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleOpenBookingRequests}>
            Ver solicitudes
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleOpenDashboard}>
            Ver dashboard
          </Button>
        </div>
      )}
    >
      <div className="p-3 md:p-4 space-y-3">
        {loading && !agenda && (
          <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
            <div className="h-4 w-3/4 rounded skel" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-1.5">
                  <div className="h-2.5 w-16 rounded skel" style={{ animationDelay: `${i * 80}ms` }} />
                  <div className="h-5 w-10 rounded skel-strong" style={{ animationDelay: `${i * 80}ms` }} />
                  <div className="h-2 w-12 rounded skel" style={{ animationDelay: `${i * 80 + 40}ms` }} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded skel" />
                  <div className="h-2.5 w-24 rounded skel" />
                </div>
                <div className="divide-y divide-gray-100/80">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="px-3 py-2.5 space-y-1">
                      <div className="h-3.5 rounded skel-strong" style={{ animationDelay: `${i * 120}ms`, width: `${70 - i * 10}%` }} />
                      <div className="h-2.5 rounded skel" style={{ animationDelay: `${i * 120 + 40}ms`, width: `${50 - i * 5}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 rounded skel" />
                  <div className="h-2.5 w-20 rounded skel" />
                </div>
                <div className="divide-y divide-gray-50">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="h-3 rounded skel-strong" style={{ animationDelay: `${i * 100 + 200}ms`, width: `${70 - i * 15}%` }} />
                        <div className="h-2 w-1/2 rounded skel" style={{ animationDelay: `${i * 100 + 240}ms` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded skel" />
                <div className="h-2.5 w-32 rounded skel" />
              </div>
              <div className="space-y-1 px-3 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="h-3 w-32 rounded skel-strong" style={{ animationDelay: `${i * 80 + 400}ms` }} />
                    {[0, 1, 2, 3].map((j) => (
                      <div key={j} className="h-3 w-8 rounded skel" style={{ animationDelay: `${i * 80 + j * 40 + 420}ms` }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && !agenda && (
          <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {agenda && (
          <div className="space-y-3 animate-[fadeIn_0.35s_ease-out]">
            <p className="text-[13px] text-gray-500 leading-relaxed">{summaryLine}</p>

            {/* KPI cards: booking activity + meetings */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <KpiCard
                icon={<SendIcon style={{ fontSize: 13 }} />}
                iconClass="text-blue-500"
                label="Enviadas"
                value={agenda.bookingActivity.sent}
                avg={agenda.weeklyComparison.avgBookingsSent}
              />
              <KpiCard
                icon={<CheckCircleOutlineIcon style={{ fontSize: 13 }} />}
                iconClass="text-emerald-500"
                label="Aprobadas"
                value={agenda.bookingActivity.approved}
                avg={agenda.weeklyComparison.avgBookingsApproved}
              />
              <KpiCard
                icon={<BookmarkAddedIcon style={{ fontSize: 13 }} />}
                iconClass="text-indigo-500"
                label="Reservadas"
                value={agenda.bookingActivity.booked}
                avg={agenda.weeklyComparison.avgBookingsBooked}
              />
              <KpiCard
                icon={<BlockIcon style={{ fontSize: 13 }} />}
                iconClass="text-red-400"
                label="Rechazadas"
                value={agenda.bookingActivity.rejected}
              />
              <KpiCard
                icon={<VideocamIcon style={{ fontSize: 13 }} />}
                iconClass="text-orange-500"
                label="Reuniones"
                value={agenda.meetingsCompleted}
                avg={agenda.weeklyComparison.avgMeetingsCompleted}
              />
            </div>

            {/* Main content: objections + Tier 1 at risk */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Objections (rejected + lost) */}
              <section className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ReportProblemIcon className="text-red-400" style={{ fontSize: 14 }} />
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Objeciones de ayer</h3>
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums">{agenda.objections.length}</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-gray-100/80">
                  {agenda.objections.length === 0 ? (
                    <p className="px-3 py-4 text-[13px] text-gray-400 text-center">Sin objeciones ayer.</p>
                  ) : (
                    agenda.objections.map((item) => (
                      <div key={item.id} className="px-3 py-2 hover:bg-gray-50/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{item.businessName}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            item.type === 'rejection'
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : 'bg-orange-50 text-orange-600 border border-orange-100'
                          }`}>
                            {item.type === 'rejection' ? 'Rechazada' : 'Perdida'}
                          </span>
                        </div>
                        {item.ownerName && (
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.ownerName}</p>
                        )}
                        {item.reason && (
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                            <span className="font-medium text-gray-600">Razón:</span> {item.reason}
                          </p>
                        )}
                        {!item.reason && (
                          <p className="text-[11px] text-gray-400 italic mt-0.5">Sin razón registrada</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Tier 1 at risk */}
              <section className="lg:col-span-2 rounded-lg border border-amber-200/70 bg-amber-50/20 overflow-hidden">
                <div className="px-3 py-2 border-b border-amber-200/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <WarningAmberIcon className="text-amber-500" style={{ fontSize: 14 }} />
                    <h3 className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Tier 1 en riesgo</h3>
                  </div>
                  <span className="text-[10px] text-amber-500 tabular-nums">{agenda.tier1AtRisk.length}</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-amber-100/60">
                  {agenda.tier1AtRisk.length === 0 ? (
                    <p className="px-3 py-4 text-[13px] text-gray-400 text-center">Todos los Tier 1 tienen tracción.</p>
                  ) : (
                    <>
                      {noOpportunityCount > 0 && (
                        <div className="px-3 py-1.5 bg-amber-50/50">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                            Sin oportunidad ({noOpportunityCount})
                          </p>
                        </div>
                      )}
                      {agenda.tier1AtRisk
                        .filter((b) => b.riskType === 'no_opportunity')
                        .map((item) => (
                          <Tier1RiskRow key={item.businessId} item={item} />
                        ))}
                      {noTractionCount > 0 && (
                        <div className="px-3 py-1.5 bg-amber-50/50">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                            Sin tracción ({noTractionCount})
                          </p>
                        </div>
                      )}
                      {agenda.tier1AtRisk
                        .filter((b) => b.riskType === 'no_traction')
                        .map((item) => (
                          <Tier1RiskRow key={item.businessId} item={item} />
                        ))}
                    </>
                  )}
                </div>
              </section>
            </div>

            {/* Per-user sales performance table */}
            {agenda.salesPerformance.length > 0 && (
              <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <GroupsIcon className="text-purple-500" style={{ fontSize: 14 }} />
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Performance por vendedor <span className="text-gray-300 font-normal normal-case">({agenda.yesterday.displayLabel})</span>
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums">{agenda.salesPerformance.length} vendedores</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[640px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">#</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vendedor</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Reun.</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Tareas</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Env.</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Aprob.</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Reserv.</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Opp +</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">Won</th>
                        <th className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {agenda.salesPerformance.map((user, idx) => {
                        const hasActivity = user.score > 0
                        return (
                          <tr
                            key={user.userId}
                            className={`transition-colors ${hasActivity ? 'hover:bg-gray-50/40' : 'opacity-50'}`}
                          >
                            <td className="px-3 py-1.5 text-[11px] font-mono text-gray-300 tabular-nums">{idx + 1}</td>
                            <td className="px-3 py-1.5">
                              <p className="text-[13px] font-medium text-gray-800 truncate max-w-[160px]">{user.name}</p>
                              {user.team && <p className="text-[10px] text-gray-400">{user.team}</p>}
                            </td>
                            <CellNum value={user.meetingsCompleted} />
                            <CellNum value={user.todosCompleted} />
                            <CellNum value={user.requestsSent} />
                            <CellNum value={user.requestsApproved} accent="emerald" />
                            <CellNum value={user.requestsBooked} accent="indigo" />
                            <CellNum value={user.opportunitiesCreated} />
                            <CellNum value={user.opportunitiesWon} accent="emerald" />
                            <td className="px-3 py-1.5 text-right">
                              <span className={`text-[12px] font-mono font-semibold tabular-nums ${user.score > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                {user.score.toFixed(1)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Weekly rolling comparison strip */}
            <div className="rounded-lg bg-gray-50/80 border border-gray-100 px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prom. 7d</p>
              {([
                { label: 'Enviadas', value: agenda.weeklyComparison.avgBookingsSent },
                { label: 'Aprobadas', value: agenda.weeklyComparison.avgBookingsApproved },
                { label: 'Reservadas', value: agenda.weeklyComparison.avgBookingsBooked },
                { label: 'Reuniones', value: agenda.weeklyComparison.avgMeetingsCompleted },
              ] as const).map((stat) => (
                <div key={stat.label} className="text-center min-w-[3.5rem]">
                  <p className="text-[13px] font-bold text-gray-900 tabular-nums leading-none">{stat.value.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function KpiCard({
  icon,
  iconClass,
  label,
  value,
  avg,
}: {
  icon: React.ReactNode
  iconClass: string
  label: string
  value: number
  avg?: number
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <span className={iconClass}>{icon}</span>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        {avg !== undefined && avg > 0 && <DeltaBadge value={value} avg={avg} suffix=" vs 7d" />}
      </div>
    </div>
  )
}

function Tier1RiskRow({ item }: { item: AdminDailyAgendaData['tier1AtRisk'][number] }) {
  return (
    <div className="px-3 py-1.5 hover:bg-amber-50/40 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-gray-800 truncate">{item.businessName}</p>
        {item.daysSinceLastActivity !== null && (
          <span className="text-[10px] font-mono text-amber-600 tabular-nums shrink-0">
            {item.daysSinceLastActivity}d
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        {item.ownerName && (
          <span className="text-[11px] text-gray-400 truncate">{item.ownerName}</span>
        )}
        {item.ownerName && <span className="text-gray-200">·</span>}
        <span className="text-[11px] text-amber-600">{item.detail}</span>
      </div>
    </div>
  )
}

function CellNum({ value, accent }: { value: number; accent?: 'emerald' | 'indigo' }) {
  const colorClass = value > 0 && accent
    ? accent === 'emerald' ? 'text-emerald-700 font-semibold' : 'text-indigo-700 font-semibold'
    : value > 0 ? 'text-gray-900' : 'text-gray-300'

  return (
    <td className="px-3 py-1.5 text-center">
      <span className={`text-[13px] tabular-nums ${colorClass}`}>{value}</span>
    </td>
  )
}
