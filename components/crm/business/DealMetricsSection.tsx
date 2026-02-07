'use client'

import { useState, useEffect } from 'react'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BarChartIcon from '@mui/icons-material/BarChart'
import { getDealMetricsByVendorId } from '@/app/actions/deal-metrics'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'
import type { ColumnConfig } from '@/components/shared/SortableTableHeader'
import type { SortDirection } from '@/hooks/useEntityPage'

interface DealMetric {
  id: string
  externalDealId: string
  dealName?: string | null
  quantitySold: number
  netRevenue: number
  margin: number
  dealUrl: string | null
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

export default function DealMetricsSection({ vendorId, businessName }: DealMetricsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<DealMetric[]>([])
  const [sortColumn, setSortColumn] = useState<string | null>('netRevenue')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

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
      {/* Aggregated Chart */}
      {deals.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Revenue Over Time (All Deals)</h3>
          <AggregatedChart deals={deals} />
        </div>
      )}

      {/* Deals Table */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">All Deals ({deals.length})</h3>
        <EntityTable
          columns={DEAL_COLUMNS}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
        >
          {sortedDeals.map((deal, index) => {
            const isActive = deal.endAt && new Date(deal.endAt) > new Date()
            // Format: "Deal ID - Deal Name" or just "Deal ID" if no name
            const dealDisplay = deal.dealName 
              ? `${deal.externalDealId} - ${deal.dealName}`
              : deal.externalDealId
            return (
              <TableRow key={deal.id} index={index}>
                <TableCell>
                  <span className="font-medium text-slate-900 line-clamp-2" title={dealDisplay}>{dealDisplay}</span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isActive ? 'Active' : 'Ended'}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-medium">{deal.quantitySold.toLocaleString()}</span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-medium text-blue-600">${deal.margin.toLocaleString()}</span>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600 text-xs">
                    {deal.runAt ? new Date(deal.runAt).toLocaleDateString() : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-slate-600 text-xs">
                    {deal.endAt ? new Date(deal.endAt).toLocaleDateString() : '-'}
                  </span>
                </TableCell>
                <TableCell align="right">
                  {deal.dealUrl && (
                    <a
                      href={deal.dealUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 p-1 inline-flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <OpenInNewIcon style={{ fontSize: 16 }} />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </EntityTable>
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
