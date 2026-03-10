'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalShell from '@/components/shared/ModalShell'
import { Button } from '@/components/ui/Button'
import { getSalesDailyAgenda, type SalesDailyAgendaData } from '@/app/actions/daily-agenda'
import { useAutoCreateOpportunity } from '@/hooks/useAutoCreateOpportunity'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { getTodayInPanama } from '@/lib/date/timezone'
import TodayIcon from '@mui/icons-material/Today'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import GroupsIcon from '@mui/icons-material/Groups'
import InsightsIcon from '@mui/icons-material/Insights'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'

interface DailyAgendaModalProps {
  isOpen: boolean
  onClose: () => void
}

type AgendaOpportunityDialogState =
  | { isOpen: false }
  | {
      isOpen: true
      mode: 'success'
      title: string
      message: string
      opportunityId: string
    }
  | {
      isOpen: true
      mode: 'error'
      title: string
      message: string
    }

function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
}

function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString('es-PA', {
    month: 'short',
    day: 'numeric',
  })
}

export default function DailyAgendaModal({ isOpen, onClose }: DailyAgendaModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agenda, setAgenda] = useState<SalesDailyAgendaData | null>(null)
  const { autoCreate, creatingForBusinessId: creatingOpportunityForBusinessId } = useAutoCreateOpportunity()
  const [opportunityDialog, setOpportunityDialog] = useState<AgendaOpportunityDialogState>({ isOpen: false })

  const loadAgenda = useCallback(async (force = false) => {
    if (!force && agenda && agenda.today.date === getTodayInPanama()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await getSalesDailyAgenda()
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
    return `Hola ${agenda.user.displayName}, hoy tienes ${agenda.today.meetingsCount} reuniones y ${agenda.today.pendingTasksCount} tareas pendientes.`
  }, [agenda])

  const handleOpenTasks = () => {
    onClose()
    router.push('/tasks')
  }

  const handleOpenDashboard = () => {
    onClose()
    router.push('/dashboard')
  }

  const handleCloseOpportunityDialog = () => {
    setOpportunityDialog({ isOpen: false })
  }

  const handleGoToOpportunity = () => {
    if (!opportunityDialog.isOpen || opportunityDialog.mode !== 'success') {
      return
    }

    const opportunityId = opportunityDialog.opportunityId
    setOpportunityDialog({ isOpen: false })
    onClose()

    try {
      sessionStorage.setItem('openOpportunityId', opportunityId)
    } catch {
      // Ignore sessionStorage errors (private mode/quota).
    }
    router.push('/opportunities')
  }

  const handleCreateOpportunityFromAgenda = async (businessId: string) => {
    if (!businessId || creatingOpportunityForBusinessId) return

    const result = await autoCreate(businessId, 'daily_agenda')

    if (!result.success || !result.opportunity) {
      setOpportunityDialog({
        isOpen: true,
        mode: 'error',
        title: 'No se pudo abrir la oportunidad',
        message: result.error || 'Ocurrió un error al crear la oportunidad.',
      })
      return
    }

    setAgenda((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        priorities: {
          ...prev.priorities,
          tier1WithoutOpenOpportunity: prev.priorities.tier1WithoutOpenOpportunity.filter(
            (item) => item.businessId !== businessId
          ),
        },
      }
    })

    setOpportunityDialog({
      isOpen: true,
      mode: 'success',
      title: result.created ? 'Oportunidad creada' : 'Oportunidad ya existente',
      message: result.created
        ? 'La oportunidad se creó en segundo plano. Puedes abrirla ahora.'
        : 'Ya existía una oportunidad abierta para este negocio. Puedes abrirla ahora.',
      opportunityId: result.opportunity.id,
    })
  }

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="5xl"
        title="Agenda diaria"
        subtitle="Ventas"
        icon={<TodayIcon style={{ fontSize: 18 }} />}
        iconColor="blue"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleOpenDashboard}>
              Ver dashboard
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleOpenTasks}>
              Ver tareas
            </Button>
          </div>
        )}
      >
        <div className="p-3 md:p-4 space-y-3">
          {loading && !agenda && (
            <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="h-4 w-3/4 rounded skel" />

              {/* Stats strip skeleton */}
              <div className="rounded-lg bg-gray-50/80 border border-gray-100 px-3 py-2.5 flex items-center gap-5">
                <div className="h-3 w-10 rounded skel-strong" />
                <div className="flex items-center gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="text-center space-y-1">
                      <div className="h-4 w-8 mx-auto rounded skel-strong" style={{ animationDelay: `${i * 80}ms` }} />
                      <div className="h-2.5 w-12 rounded skel" style={{ animationDelay: `${i * 80}ms` }} />
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block w-px h-5 bg-gray-200/60" />
                <div className="h-3 w-32 rounded skel" style={{ animationDelay: '300ms' }} />
              </div>

              {/* Priorities grid skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded skel" />
                    <div className="h-2.5 w-20 rounded skel" />
                  </div>
                  <div className="divide-y divide-gray-100/80">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-3.5 rounded skel-strong" style={{ animationDelay: `${i * 120}ms`, width: `${65 - i * 12}%` }} />
                          <div className="h-3 w-8 rounded skel" style={{ animationDelay: `${i * 120}ms` }} />
                        </div>
                        <div className="h-2.5 rounded skel" style={{ animationDelay: `${i * 120 + 40}ms`, width: `${80 - i * 8}%` }} />
                        <div className="h-2.5 w-2/3 rounded skel" style={{ animationDelay: `${i * 120 + 80}ms` }} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-3">
                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden flex-1">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded skel" />
                      <div className="h-2.5 w-24 rounded skel" />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="h-3 rounded skel-strong" style={{ animationDelay: `${i * 100 + 200}ms`, width: `${75 - i * 10}%` }} />
                            <div className="h-2 w-1/2 rounded skel" style={{ animationDelay: `${i * 100 + 240}ms` }} />
                          </div>
                          <div className="h-3 w-7 rounded skel" style={{ animationDelay: `${i * 100 + 200}ms` }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 rounded skel" />
                      <div className="h-2.5 w-16 rounded skel" />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="h-3 w-4 rounded skel" style={{ animationDelay: `${i * 100 + 400}ms` }} />
                            <div className="space-y-1 flex-1">
                              <div className="h-3 rounded skel-strong" style={{ animationDelay: `${i * 100 + 400}ms`, width: `${70 - i * 15}%` }} />
                              <div className="h-2 w-2/3 rounded skel" style={{ animationDelay: `${i * 100 + 440}ms` }} />
                            </div>
                          </div>
                          <div className="h-3 w-6 rounded skel" style={{ animationDelay: `${i * 100 + 400}ms` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's pending skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1].map((col) => (
                  <div key={col} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                      <div className="h-2.5 w-20 rounded skel" style={{ animationDelay: `${col * 150 + 500}ms` }} />
                      <div className="h-3 w-4 rounded skel" style={{ animationDelay: `${col * 150 + 500}ms` }} />
                    </div>
                    <div className="px-3 py-1.5 space-y-2">
                      {[0, 1].map((row) => (
                        <div key={row} className="flex items-center justify-between gap-2 py-0.5">
                          <div className="h-3 rounded skel" style={{ animationDelay: `${col * 150 + row * 80 + 550}ms`, width: `${70 - row * 15}%` }} />
                          <div className="h-2.5 w-10 rounded skel" style={{ animationDelay: `${col * 150 + row * 80 + 550}ms` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
              {/* Greeting */}
              <p className="text-[13px] text-gray-500 leading-relaxed">{summaryLine}</p>

              {/* Tier 1 without open opportunity */}
              {agenda.priorities.tier1WithoutOpenOpportunity.length > 0 && (
                <div className="rounded-lg border border-amber-200/70 bg-amber-50/30 p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <AddCircleOutlineIcon className="text-amber-500" style={{ fontSize: 13 }} />
                    <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">
                      Tier 1 sin oportunidad
                    </p>
                  </div>
                  {agenda.priorities.tier1WithoutOpenOpportunity.map((item) => (
                    <div
                      key={item.businessId}
                      className="flex items-center justify-between gap-3 rounded-md bg-white border border-amber-100/80 pl-3 pr-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{item.businessName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{item.suggestedAction}</p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="primary"
                        loading={creatingOpportunityForBusinessId === item.businessId}
                        disabled={creatingOpportunityForBusinessId !== null}
                        onClick={() => void handleCreateOpportunityFromAgenda(item.businessId)}
                      >
                        Abrir oportunidad
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats strip: weekly recap + team rank */}
              <div className="rounded-lg bg-gray-50/80 border border-gray-100 px-3 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">7 días</p>
                <div className="flex items-center gap-4">
                  {([
                    { label: 'Reuniones', value: agenda.weeklyRecap.meetingsCompleted },
                    { label: 'Tareas', value: agenda.weeklyRecap.todosCompleted },
                    { label: 'Aprobadas', value: agenda.weeklyRecap.approvedRequests },
                    { label: 'Reservadas', value: agenda.weeklyRecap.bookedRequests },
                  ] as const).map((stat) => (
                    <div key={stat.label} className="text-center min-w-[3.5rem]">
                      <p className="text-sm font-bold text-gray-900 tabular-nums leading-none">{stat.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block w-px h-5 bg-gray-200/80" />
                <div className="flex items-center gap-1.5">
                  <GroupsIcon className="text-blue-400" style={{ fontSize: 13 }} />
                  <p className="text-[12px] text-gray-500">
                    Puesto{' '}
                    <span className="font-bold text-gray-900">#{agenda.performance.rank}</span>
                    <span className="text-gray-400">/{agenda.performance.teamSize}</span>
                    <span className="text-gray-200 mx-1.5">|</span>
                    <span className="tabular-nums">{agenda.performance.userScore.toFixed(1)}</span>
                    <span className="text-gray-300 mx-0.5">vs</span>
                    <span className="tabular-nums">{agenda.performance.teamAverageScore.toFixed(1)} avg</span>
                    <span className={`ml-1 font-semibold tabular-nums ${agenda.performance.deltaVsAveragePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatPercent(agenda.performance.deltaVsAveragePct)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Main content: priorities grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                {/* High-impact priorities */}
                <section className="lg:col-span-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUpIcon className="text-orange-400" style={{ fontSize: 14 }} />
                      <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mayor impacto</h3>
                    </div>
                    <span className="text-[10px] text-gray-400 tabular-nums">{agenda.priorities.high.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100/80">
                    {agenda.priorities.high.length === 0 ? (
                      <p className="px-3 py-4 text-[13px] text-gray-400 text-center">No hay negocios priorizados para hoy.</p>
                    ) : (
                      agenda.priorities.high.map((item) => (
                        <div key={item.key} className="px-3 py-2 hover:bg-gray-50/40 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-gray-900 truncate">{item.businessName}</p>
                            <span className="text-[11px] font-mono font-bold text-orange-600 tabular-nums shrink-0">
                              {item.priorityScore.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                            <span className="font-medium text-gray-600">T{item.tier || '?'}</span>
                            <span className="text-gray-300">·</span>
                            <span className="tabular-nums">{formatMoney(item.projectionRevenue)}</span>
                            <span className="text-gray-300">·</span>
                            <span>{item.meetingsCount} reun. / {item.todosCount} tareas</span>
                            {item.riskLabel && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-red-500 font-medium">{item.riskLabel}</span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-gray-500">
                            <span className="font-medium text-gray-600">Acción:</span> {item.suggestedAction}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Right column: other priorities + team leaderboard */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  {/* Other priorities */}
                  <section className="rounded-lg border border-gray-200 bg-white overflow-hidden flex-1 min-h-0">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <InsightsIcon className="text-gray-400" style={{ fontSize: 14 }} />
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Otras prioridades</h3>
                      </div>
                      <span className="text-[10px] text-gray-400 tabular-nums">{agenda.priorities.others.length}</span>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto divide-y divide-gray-50">
                      {agenda.priorities.others.length === 0 ? (
                        <p className="px-3 py-3 text-[13px] text-gray-400 text-center">Sin otras prioridades.</p>
                      ) : (
                        agenda.priorities.others.map((item) => (
                          <div key={item.key} className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-gray-50/40 transition-colors">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-gray-800 truncate">{item.businessName}</p>
                              <p className="text-[10px] text-gray-400">
                                T{item.tier || '?'} · {item.totalTasksCount} pend.
                                {item.riskLabel && <span className="text-red-400 ml-1">· {item.riskLabel}</span>}
                              </p>
                            </div>
                            <span className="text-[11px] font-mono text-gray-400 tabular-nums shrink-0">
                              {item.priorityScore.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Team leaderboard */}
                  <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GroupsIcon className="text-blue-400" style={{ fontSize: 14 }} />
                        <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top equipo</h3>
                      </div>
                      <span className="text-[10px] text-gray-400">{agenda.performance.teamName}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {agenda.performance.topPerformers.length === 0 ? (
                        <p className="px-3 py-3 text-[13px] text-gray-400 text-center">Sin actividad del equipo.</p>
                      ) : (
                        agenda.performance.topPerformers.map((member, index) => (
                          <div
                            key={member.userId}
                            className={`px-3 py-1.5 flex items-center justify-between gap-2 ${member.isCurrentUser ? 'bg-blue-50/40' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-mono text-gray-300 w-4 text-right shrink-0">#{index + 1}</span>
                              <div className="min-w-0">
                                <p className={`text-[13px] truncate ${member.isCurrentUser ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                                  {member.name}
                                </p>
                                <p className="text-[10px] text-gray-400 tabular-nums">
                                  {member.meetingsCompleted}r · {member.todosCompleted}t · {member.bookedRequests} res.
                                </p>
                              </div>
                            </div>
                            <span className={`text-[11px] font-mono font-semibold tabular-nums shrink-0 ${member.isCurrentUser ? 'text-blue-600' : 'text-gray-500'}`}>
                              {member.score.toFixed(1)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </div>

              {/* Today's pending: meetings + tasks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Reuniones hoy</h3>
                    <span className="text-[11px] font-mono font-semibold text-gray-500 tabular-nums">{agenda.today.meetingsCount}</span>
                  </div>
                  <div className="px-3 py-1">
                    {agenda.today.meetings.length === 0 ? (
                      <p className="text-[13px] text-gray-400 py-2 text-center">Sin reuniones pendientes.</p>
                    ) : (
                      agenda.today.meetings.slice(0, 5).map((meeting) => (
                        <div key={meeting.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
                          <span className="text-[13px] text-gray-700 truncate">{meeting.title}</span>
                          <span className="text-[11px] text-gray-400 shrink-0">{formatShortDate(meeting.date)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tareas hoy</h3>
                    <span className="text-[11px] font-mono font-semibold text-gray-500 tabular-nums">{agenda.today.pendingTasksCount}</span>
                  </div>
                  <div className="px-3 py-1">
                    {agenda.today.tasks.length === 0 ? (
                      <p className="text-[13px] text-gray-400 py-2 text-center">Sin tareas pendientes.</p>
                    ) : (
                      agenda.today.tasks.slice(0, 5).map((task) => (
                        <div key={task.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
                          <span className="text-[13px] text-gray-700 truncate">{task.title}</span>
                          <span className="text-[11px] text-gray-400 shrink-0">{formatShortDate(task.date)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </ModalShell>

      <ConfirmDialog
        isOpen={opportunityDialog.isOpen}
        title={opportunityDialog.isOpen ? opportunityDialog.title : ''}
        message={opportunityDialog.isOpen ? opportunityDialog.message : ''}
        confirmText={
          opportunityDialog.isOpen && opportunityDialog.mode === 'success'
            ? 'Ir a oportunidad'
            : ''
        }
        cancelText="Cerrar"
        confirmVariant={
          opportunityDialog.isOpen && opportunityDialog.mode === 'success'
            ? 'success'
            : 'danger'
        }
        onConfirm={handleGoToOpportunity}
        onCancel={handleCloseOpportunityDialog}
        zIndex={90}
      />
    </>
  )
}
