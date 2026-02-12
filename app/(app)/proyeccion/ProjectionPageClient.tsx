'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { Input, Button } from '@/components/ui'
import { FilterTabs } from '@/components/shared'
import { TableRow, TableCell } from '@/components/shared/table'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

type ProjectionSource = 'actual_deal' | 'business_history' | 'category_benchmark' | 'none'
type ProjectionBucket = 'in_process' | 'booked' | 'other'

type ProjectionRow = {
  requestId: string
  requestName: string
  merchant: string | null
  businessEmail: string
  status: string
  startDate: string | Date
  endDate: string | Date
  createdAt: string | Date
  processedAt: string | Date | null
  dealId: string | null
  projectedRevenue: number | null
  projectionSource: ProjectionSource
  bucket: ProjectionBucket
  businessId: string | null
  businessName: string | null
}

type ProjectionSummary = {
  totalInProcessRequests: number
  totalBookedRequests: number
  totalProjectedInProcessRevenue: number
  totalProjectedBookedRevenue: number
  totalProjectedRevenue: number
  projectedInProcessCount: number
  projectedBookedCount: number
  inProcessCoveragePct: number
  bookedCoveragePct: number
  latestMetricsSyncAt: string | Date | null
}

interface ProjectionPageClientProps {
  initialRows: ProjectionRow[]
  initialSummary: ProjectionSummary
}

type SortColumn = 'status' | 'business' | 'request' | 'startDate' | 'createdAt' | 'source' | 'projectedRevenue'

const SOURCE_LABEL: Record<ProjectionSource, string> = {
  actual_deal: 'Actual',
  business_history: 'Histórico',
  category_benchmark: 'Categoría',
  none: 'Sin datos',
}

const SOURCE_STYLE: Record<ProjectionSource, string> = {
  actual_deal: 'bg-emerald-50 text-emerald-700',
  business_history: 'bg-blue-50 text-blue-700',
  category_benchmark: 'bg-amber-50 text-amber-700',
  none: 'bg-gray-100 text-gray-600',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-blue-700',
  booked: 'bg-emerald-50 text-emerald-700',
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatShortDate(value: string | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function getPanamaYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)

  const year = Number(parts.find(part => part.type === 'year')?.value || 0)
  const month = Number(parts.find(part => part.type === 'month')?.value || 0)
  return { year, month }
}

function shiftYearMonth(year: number, month: number, offset: number): { year: number; month: number } {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 15))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  }
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function getPanamaMonthKey(value: string | Date | null | undefined): string | null {
  const date = toDate(value)
  if (!date) return null
  const { year, month } = getPanamaYearMonth(date)
  return toMonthKey(year, month)
}

function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 15)))
}

function translateStatus(status: string): string {
  switch (status) {
    case 'draft':
      return 'Borrador'
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobado'
    case 'booked':
      return 'Reservado'
    default:
      return status
  }
}

export default function ProjectionPageClient({ initialRows, initialSummary }: ProjectionPageClientProps) {
  const [rows] = useState<ProjectionRow[]>(initialRows)
  const [summary] = useState<ProjectionSummary>(initialSummary)
  const [searchQuery, setSearchQuery] = useState('')
  const [bucketFilter, setBucketFilter] = useState<'all' | 'in_process' | 'booked'>('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('projectedRevenue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [visibleCount, setVisibleCount] = useState(50)

  const momSeries = useMemo(() => {
    const now = new Date()
    const nowYM = getPanamaYearMonth(now)
    const lastMonth = shiftYearMonth(nowYM.year, nowYM.month, -1)
    const forecastMonths = [
      shiftYearMonth(nowYM.year, nowYM.month, 1),
      shiftYearMonth(nowYM.year, nowYM.month, 2),
      shiftYearMonth(nowYM.year, nowYM.month, 3),
    ]

    const lastMonthKey = toMonthKey(lastMonth.year, lastMonth.month)
    const realLastMonth = rows.reduce((sum, row) => {
      if (row.projectedRevenue === null) return sum
      if (row.bucket !== 'booked') return sum
      if (row.projectionSource !== 'actual_deal') return sum
      if (getPanamaMonthKey(row.startDate) !== lastMonthKey) return sum
      return sum + row.projectedRevenue
    }, 0)

    const forecastValues = forecastMonths.map((monthDate) => {
      const key = toMonthKey(monthDate.year, monthDate.month)
      const amount = rows.reduce((sum, row) => {
        if (row.projectedRevenue === null) return sum
        if (getPanamaMonthKey(row.startDate) !== key) return sum
        return sum + row.projectedRevenue
      }, 0)

      return {
        key,
        label: formatMonthLabel(monthDate.year, monthDate.month),
        kind: 'forecast' as const,
        amount,
      }
    })

    return [
      {
        key: lastMonthKey,
        label: formatMonthLabel(lastMonth.year, lastMonth.month),
        kind: 'real' as const,
        amount: realLastMonth,
      },
      ...forecastValues,
    ].map(item => ({
      ...item,
      amount: Number(item.amount.toFixed(2)),
    }))
  }, [rows])

  const momMaxAmount = useMemo(
    () => Math.max(...momSeries.map(item => item.amount), 1),
    [momSeries]
  )

  const filteredRows = useMemo(() => {
    let next = rows

    if (bucketFilter !== 'all') {
      next = next.filter(row => row.bucket === bucketFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      next = next.filter(row => {
        return (
          row.requestName.toLowerCase().includes(query) ||
          (row.businessName && row.businessName.toLowerCase().includes(query)) ||
          (row.merchant && row.merchant.toLowerCase().includes(query)) ||
          row.businessEmail.toLowerCase().includes(query) ||
          (row.dealId && row.dealId.toLowerCase().includes(query))
        )
      })
    }

    return [...next].sort((a, b) => {
      let aValue: string | number | null = null
      let bValue: string | number | null = null

      switch (sortColumn) {
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'business':
          aValue = (a.businessName || a.merchant || '').toLowerCase()
          bValue = (b.businessName || b.merchant || '').toLowerCase()
          break
        case 'request':
          aValue = a.requestName.toLowerCase()
          bValue = b.requestName.toLowerCase()
          break
        case 'startDate':
          aValue = toDate(a.startDate)?.getTime() || 0
          bValue = toDate(b.startDate)?.getTime() || 0
          break
        case 'createdAt':
          aValue = toDate(a.createdAt)?.getTime() || 0
          bValue = toDate(b.createdAt)?.getTime() || 0
          break
        case 'source':
          aValue = a.projectionSource
          bValue = b.projectionSource
          break
        case 'projectedRevenue':
          aValue = a.projectedRevenue ?? -1
          bValue = b.projectedRevenue ?? -1
          break
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, bucketFilter, searchQuery, sortColumn, sortDirection])

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  )

  const filterTabs = useMemo(() => {
    const inProcessCount = rows.filter(row => row.bucket === 'in_process').length
    const bookedCount = rows.filter(row => row.bucket === 'booked').length
    return [
      { id: 'all', label: 'Todos', count: rows.length },
      { id: 'in_process', label: 'En proceso', count: inProcessCount },
      { id: 'booked', label: 'Reservadas', count: bookedCount },
    ]
  }, [rows])

  const latestSyncLabel = summary.latestMetricsSyncAt
    ? toDate(summary.latestMetricsSyncAt)?.toLocaleDateString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection(column === 'projectedRevenue' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-3 py-3 md:px-4 md:py-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">MoM Breakdown</p>
              <p className="text-xs text-gray-500 mt-0.5">Último mes real + próximos 3 meses forecast</p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="inline-flex items-center gap-1 text-gray-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Real
              </span>
              <span className="inline-flex items-center gap-1 text-gray-600">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Forecast
              </span>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            {latestSyncLabel ? `Métricas actualizadas: ${latestSyncLabel}` : 'Sin fecha de sync de métricas'}
          </p>

          <div className="mt-3 grid grid-cols-4 gap-2 items-end h-36">
            {momSeries.map((item) => {
              const heightPct = Math.max((item.amount / momMaxAmount) * 100, item.amount > 0 ? 8 : 3)
              return (
                <div key={item.key} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] font-semibold text-gray-700 leading-none">
                    {formatCurrency(item.amount)}
                  </div>
                  <div className="h-24 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        item.kind === 'real' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${item.label}: ${formatCurrency(item.amount)}`}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 text-center leading-tight">{item.label}</div>
                </div>
              )
            })}
          </div>

          <div className="mt-3 text-[11px] text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
            <span><strong>Actual:</strong> ingresos reales del deal ya publicado (deal metrics).</span>
            <span><strong>Histórico:</strong> mediana de los últimos 3 deals del negocio (si tiene 1-2, usa los disponibles).</span>
            <span><strong>Categoría:</strong> mediana por categoría interna (solo deals de últimos 360 días) con mínimo 5 casos; si no llega al mínimo, no se proyecta.</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="w-full md:max-w-md">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por negocio, solicitud, correo o deal ID..."
              size="sm"
              leftIcon={<SearchIcon className="w-4 h-4" />}
            />
          </div>
          <div className="text-xs text-gray-500">
            {filteredRows.length} registro{filteredRows.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="mt-3">
          <FilterTabs
            items={filterTabs}
            activeId={bucketFilter}
            onChange={(id) => {
              setBucketFilter(id as 'all' | 'in_process' | 'booked')
              setVisibleCount(50)
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-0 md:p-4">
        {filteredRows.length === 0 ? (
          <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 overflow-hidden mx-4 mt-4 md:mx-0 md:mt-0">
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <FilterListIcon className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-900">No se encontraron proyecciones</p>
              <p className="text-xs mt-1">Intente ajustar su búsqueda o filtros</p>
            </div>
          </div>
        ) : (
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        <span>Estado</span>
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('business')}>
                      <div className="flex items-center gap-1">
                        <span>Negocio</span>
                        {sortColumn === 'business' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('request')}>
                      <div className="flex items-center gap-1">
                        <span>Solicitud</span>
                        {sortColumn === 'request' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('startDate')}>
                      <div className="flex items-center gap-1">
                        <span>Fechas</span>
                        {sortColumn === 'startDate' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('source')}>
                      <div className="flex items-center gap-1">
                        <span>Fuente</span>
                        {sortColumn === 'source' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors text-right" onClick={() => handleSort('projectedRevenue')}>
                      <div className="flex items-center justify-end gap-1">
                        <span>Proyección</span>
                        {sortColumn === 'projectedRevenue' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('createdAt')}>
                      <div className="flex items-center gap-1">
                        <span>Creado</span>
                        {sortColumn === 'createdAt' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleRows.map((row, index) => (
                    <TableRow key={row.requestId} index={index}>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${STATUS_STYLE[row.status] || STATUS_STYLE.draft}`}>
                          {translateStatus(row.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.businessId ? (
                          <Link href={`/businesses/${row.businessId}`} className="font-medium text-blue-700 hover:underline">
                            {row.businessName || row.merchant || '—'}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-900">{row.businessName || row.merchant || '—'}</span>
                        )}
                        <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{row.businessEmail}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 block text-[13px]">{row.requestName}</span>
                        {row.dealId ? (
                          <span className="inline-flex mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-mono">
                            {row.dealId}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Sin deal ID</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap text-[12px] text-gray-700">
                          {formatShortDate(row.startDate)} - {formatShortDate(row.endDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${SOURCE_STYLE[row.projectionSource]}`}>
                          {SOURCE_LABEL[row.projectionSource]}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        {row.projectedRevenue !== null ? (
                          <span className="font-semibold text-emerald-700">{formatCurrency(row.projectedRevenue)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap text-[12px] text-gray-600">{formatShortDate(row.createdAt)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleCount < filteredRows.length && (
              <div className="p-4 border-t border-gray-100 text-center">
                <Button variant="secondary" size="sm" onClick={() => setVisibleCount(count => count + 50)}>
                  Cargar Más
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
