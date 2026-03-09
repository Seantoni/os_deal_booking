'use client'

import { useState, useEffect } from 'react'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BarChartIcon from '@mui/icons-material/BarChart'
import PostAddIcon from '@mui/icons-material/PostAdd'
import { getDealMetricsByVendorId } from '@/app/actions/deal-metrics'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'
import TruncatedTextWithTooltip from '@/components/shared/TruncatedTextWithTooltip'
import type { ColumnConfig } from '@/components/shared/SortableTableHeader'
import type { SortDirection } from '@/hooks/useEntityPage'
import { useResizableColumns } from '@/hooks/useResizableColumns'

interface DealMetric {
  id: string
  externalDealId: string
  dealName?: string | null
  quantitySold: number
  netRevenue: number
  margin: number
  dealUrl: string | null
  previewUrl?: string | null
  runAt: Date | null
  endAt: Date | null
  lastSyncedAt: Date
  snapshots: {
    date: Date
    quantitySold: number
    netRevenue: number
    margin: number
  }[]
}

interface DealMetricsSectionProps {
  vendorId: string | null | undefined
  businessName: string
  summaryView?: 'chart' | 'topDeals' | 'none'
  onCreateRequestFromDeal?: (externalDealId: string) => void
}

// Table columns configuration
const DEAL_COLUMNS: ColumnConfig[] = [
  { key: 'externalDealId', label: 'Deal', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'quantitySold', label: 'Sold', sortable: true, align: 'right' },
  { key: 'netRevenue', label: 'Revenue', sortable: true, align: 'right' },
  { key: 'margin', label: 'Margin', sortable: true, align: 'right' },
  { key: 'runAt', label: 'Start Date', sortable: true },
  { key: 'endAt', label: 'End Date', sortable: true },
  { key: 'actions', label: '', align: 'right', width: 'w-10' },
]

const DEAL_METRICS_TABLE_DEFAULT_WIDTHS: Record<string, number> = {
  externalDealId: 260,
  status: 110,
  quantitySold: 80,
  netRevenue: 110,
  margin: 90,
  runAt: 120,
  endAt: 120,
  actions: 56,
}

const DEAL_METRICS_TABLE_MIN_WIDTHS: Record<string, number> = {
  externalDealId: 160,
  status: 90,
  quantitySold: 70,
  netRevenue: 90,
  margin: 80,
  runAt: 100,
  endAt: 100,
  actions: 48,
}

export default function DealMetricsSection({ vendorId, businessName, summaryView = 'chart', onCreateRequestFromDeal }: DealMetricsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<DealMetric[]>([])
  const [sortColumn, setSortColumn] = useState<string | null>('runAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const { columnsWithUserWidths, handleColumnResize, getColumnCellStyle } = useResizableColumns(DEAL_COLUMNS, {
    storageKey: 'business-deal-metrics-column-widths',
    defaultWidths: DEAL_METRICS_TABLE_DEFAULT_WIDTHS,
    minWidths: DEAL_METRICS_TABLE_MIN_WIDTHS,
    resizableKeys: ['externalDealId'],
  })

  useEffect(() => {
    async function loadMetrics() {
      if (!vendorId) {
        setLoading(false)
        return
      }

      try {
        const result = await getDealMetricsByVendorId(vendorId)
        setDeals(result.deals as DealMetric[])
      } catch (error) {
        console.error('Error loading deal metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [vendorId])

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort deals
  const sortedDeals = [...deals].sort((a, b) => {
    if (!sortColumn) return 0
    
    let aVal: number | string | Date | null = null
    let bVal: number | string | Date | null = null
    
    switch (sortColumn) {
      case 'externalDealId':
        aVal = a.externalDealId
        bVal = b.externalDealId
        break
      case 'status':
        aVal = a.endAt && new Date(a.endAt) > new Date() ? 1 : 0
        bVal = b.endAt && new Date(b.endAt) > new Date() ? 1 : 0
        break
      case 'quantitySold':
        aVal = a.quantitySold
        bVal = b.quantitySold
        break
      case 'netRevenue':
        aVal = a.netRevenue
        bVal = b.netRevenue
        break
      case 'margin':
        aVal = a.margin
        bVal = b.margin
        break
      case 'runAt':
        aVal = a.runAt ? new Date(a.runAt).getTime() : 0
        bVal = b.runAt ? new Date(b.runAt).getTime() : 0
        break
      case 'endAt':
        aVal = a.endAt ? new Date(a.endAt).getTime() : 0
        bVal = b.endAt ? new Date(b.endAt).getTime() : 0
        break
      default:
        return 0
    }
    
    if (aVal === null || bVal === null) return 0
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  if (!vendorId) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <BarChartIcon className="text-slate-300 mb-2" style={{ fontSize: 48 }} />
        <p className="text-slate-500">No vendor ID linked to this business</p>
        <p className="text-xs text-slate-400 mt-1">Link an OS Admin Vendor ID to see deal metrics</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-8 text-center">
        <TrendingUpIcon className="text-slate-300 mb-2" style={{ fontSize: 48 }} />
        <p className="text-slate-500">No deal metrics found</p>
        <p className="text-xs text-slate-400 mt-1">Vendor ID: {vendorId}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary section */}
      {summaryView === 'chart' && deals.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Revenue Over Time (All Deals)</h3>
          <AggregatedChart deals={deals} />
        </div>
      )}
      {summaryView === 'topDeals' && deals.length > 0 && (
        <TopDealsCards deals={deals} />
      )}

      {/* Deals Table */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">All Deals ({deals.length})</h3>
        <EntityTable
          className="deal-metrics-tooltip-table"
          tableClassName="table-fixed"
          columns={columnsWithUserWidths}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onColumnResize={handleColumnResize}
        >
          {sortedDeals.map((deal, index) => {
            const isActive = deal.endAt && new Date(deal.endAt) > new Date()
            // Format: "Deal ID - Deal Name" or just "Deal ID" if no name
            const dealDisplay = deal.dealName 
              ? `${deal.externalDealId} - ${deal.dealName}`
              : deal.externalDealId
            return (
              <TableRow key={deal.id} index={index}>
                <TableCell style={getColumnCellStyle('externalDealId')}>
                  <TruncatedTextWithTooltip
                    text={dealDisplay}
                    className="font-medium text-slate-900 text-[13px]"
                  />
                </TableCell>
                <TableCell style={getColumnCellStyle('status')}>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isActive ? 'Active' : 'Ended'}
                  </span>
                </TableCell>
                <TableCell align="right" style={getColumnCellStyle('quantitySold')}>
                  <span className="font-medium">{deal.quantitySold.toLocaleString()}</span>
                </TableCell>
                <TableCell align="right" style={getColumnCellStyle('netRevenue')}>
                  <span className="font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
                </TableCell>
                <TableCell align="right" style={getColumnCellStyle('margin')}>
                  <span className="font-medium text-blue-600">${deal.margin.toLocaleString()}</span>
                </TableCell>
                <TableCell style={getColumnCellStyle('runAt')}>
                  <span className="text-slate-600 text-xs">
                    {deal.runAt ? new Date(deal.runAt).toLocaleDateString() : '-'}
                  </span>
                </TableCell>
                <TableCell style={getColumnCellStyle('endAt')}>
                  <span className="text-slate-600 text-xs">
                    {deal.endAt ? new Date(deal.endAt).toLocaleDateString() : '-'}
                  </span>
                </TableCell>
                <TableCell align="right" style={getColumnCellStyle('actions')}>
                  <div className="flex items-center justify-end gap-0.5">
                    {onCreateRequestFromDeal && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateRequestFromDeal(deal.externalDealId)
                        }}
                        className="text-green-500 hover:text-green-700 p-1 inline-flex"
                        title="Crear solicitud desde este deal"
                      >
                        <PostAddIcon style={{ fontSize: 16 }} />
                      </button>
                    )}
                    {(deal.previewUrl || deal.dealUrl) && (
                      <a
                        href={(deal.previewUrl || deal.dealUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 p-1 inline-flex"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <OpenInNewIcon style={{ fontSize: 16 }} />
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </EntityTable>
      </div>
    </div>
  )
}

function TopDealsCards({ deals }: { deals: DealMetric[] }) {
  const topByRevenue = [...deals]
    .sort((a, b) => b.netRevenue - a.netRevenue)
    .slice(0, 3)

  const topByQuantity = [...deals]
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 3)

  const getDealLabel = (deal: DealMetric) =>
    deal.dealName ? `${deal.externalDealId} - ${deal.dealName}` : deal.externalDealId

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2">Top 3 by Net Rev</h3>
        <ul className="space-y-1.5">
          {topByRevenue.map((deal, index) => (
            <li key={`rev-${deal.id}`} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 w-5">#{index + 1}</span>
                <p className="text-xs text-slate-700 truncate" title={getDealLabel(deal)}>
                  {getDealLabel(deal)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-emerald-600 whitespace-nowrap">
                  ${deal.netRevenue.toLocaleString()}
                </span>
                {(deal.previewUrl || deal.dealUrl) && (
                  <a
                    href={(deal.previewUrl || deal.dealUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-600 inline-flex"
                    title="Open deal"
                  >
                    <OpenInNewIcon style={{ fontSize: 14 }} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <h3 className="text-xs font-semibold text-slate-700 mb-2">Top 3 by Quantity Sold</h3>
        <ul className="space-y-1.5">
          {topByQuantity.map((deal, index) => (
            <li key={`qty-${deal.id}`} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 w-5">#{index + 1}</span>
                <p className="text-xs text-slate-700 truncate" title={getDealLabel(deal)}>
                  {getDealLabel(deal)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                  {deal.quantitySold.toLocaleString()}
                </span>
                {(deal.previewUrl || deal.dealUrl) && (
                  <a
                    href={(deal.previewUrl || deal.dealUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-600 inline-flex"
                    title="Open deal"
                  >
                    <OpenInNewIcon style={{ fontSize: 14 }} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AggregatedChart({ deals }: { deals: DealMetric[] }) {
  // Aggregate all snapshots by date
  const dateMap = new Map<string, { revenue: number; sold: number }>()
  
  deals.forEach(deal => {
    deal.snapshots.forEach(snapshot => {
      const dateKey = new Date(snapshot.date).toISOString().split('T')[0]
      const existing = dateMap.get(dateKey) || { revenue: 0, sold: 0 }
      dateMap.set(dateKey, {
        revenue: existing.revenue + snapshot.netRevenue,
        sold: existing.sold + snapshot.quantitySold,
      })
    })
  })

  // Sort by date
  const sortedData = Array.from(dateMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30) // Last 30 data points

  if (sortedData.length === 0) {
    return <p className="text-sm text-slate-400">No historical data available</p>
  }

  const maxRevenue = Math.max(...sortedData.map(d => d[1].revenue), 1)

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {sortedData.map(([date, data], i) => (
          <div
            key={date}
            className="flex-1 min-w-[8px] bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors cursor-pointer"
            style={{
              height: `${Math.max((data.revenue / maxRevenue) * 100, 3)}%`,
            }}
            title={`${date}\nRevenue: $${data.revenue.toLocaleString()}\nSold: ${data.sold.toLocaleString()}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{sortedData[0]?.[0]}</span>
        <span>{sortedData[sortedData.length - 1]?.[0]}</span>
      </div>
    </div>
  )
}
