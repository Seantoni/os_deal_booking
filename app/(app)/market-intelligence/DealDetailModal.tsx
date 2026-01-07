'use client'

import { useState, useEffect } from 'react'
import { getCompetitorDeal, CompetitorDealWithStats, DealSnapshot } from '@/app/actions/competitor-deals'
import { useModalEscape } from '@/hooks/useModalEscape'
import CloseIcon from '@mui/icons-material/Close'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import RefreshIcon from '@mui/icons-material/Refresh'
import { formatCompactDateTime, formatShortDate } from '@/lib/date'

interface DealDetailModalProps {
  dealId: string
  onClose: () => void
}

export default function DealDetailModal({ dealId, onClose }: DealDetailModalProps) {
  const [deal, setDeal] = useState<CompetitorDealWithStats | null>(null)
  const [snapshots, setSnapshots] = useState<DealSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  
  useModalEscape(true, onClose)
  
  useEffect(() => {
    const loadDeal = async () => {
      setLoading(true)
      try {
        const result = await getCompetitorDeal(dealId)
        setDeal(result.deal)
        setSnapshots(result.snapshots)
      } catch (error) {
        console.error('Failed to load deal:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadDeal()
  }, [dealId])
  
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value)
  }
  
  const getSiteLabel = (site: string) => {
    const labels: Record<string, string> = {
      rantanofertas: 'RantanOfertas',
      oferta24: 'Oferta24',
    }
    return labels[site] || site
  }
  
  const getSiteBadgeColor = (site: string) => {
    const colors: Record<string, string> = {
      rantanofertas: 'bg-orange-100 text-orange-800 border-orange-200',
      oferta24: 'bg-blue-100 text-blue-800 border-blue-200',
    }
    return colors[site] || 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  // Calculate chart data with all days filled in
  const chartData = (() => {
    if (snapshots.length === 0) return []
    
    const firstDate = new Date(snapshots[0].scannedAt)
    const lastDate = new Date(snapshots[snapshots.length - 1].scannedAt)
    
    // Normalize to start of day
    firstDate.setHours(0, 0, 0, 0)
    lastDate.setHours(0, 0, 0, 0)
    
    const dayMs = 24 * 60 * 60 * 1000
    const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / dayMs) + 1
    
    // Create a map of date -> snapshot for quick lookup
    const snapshotsByDate = new Map<string, typeof snapshots[0]>()
    snapshots.forEach(s => {
      const d = new Date(s.scannedAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      // Keep the latest snapshot for each day
      if (!snapshotsByDate.has(key) || new Date(snapshotsByDate.get(key)!.scannedAt) < d) {
        snapshotsByDate.set(key, s)
      }
    })
    
    const result: Array<{
      id: string
      totalSold: number
      scannedAt: Date
      salesSinceLast: number
      hasData: boolean
    }> = []
    
    let lastKnownSnapshot = snapshots[0]
    let prevTotalSold = 0
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(firstDate.getTime() + i * dayMs)
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`
      
      const snapshot = snapshotsByDate.get(key)
      
      if (snapshot) {
        lastKnownSnapshot = snapshot
        const salesSinceLast = prevTotalSold > 0 ? snapshot.totalSold - prevTotalSold : 0
        result.push({
          id: snapshot.id,
          totalSold: snapshot.totalSold,
          scannedAt: currentDate,
          salesSinceLast,
          hasData: true,
        })
        prevTotalSold = snapshot.totalSold
      } else {
        // No data for this day - use last known value
        result.push({
          id: `blank-${i}`,
          totalSold: lastKnownSnapshot.totalSold,
          scannedAt: currentDate,
          salesSinceLast: 0,
          hasData: false,
        })
      }
    }
    
    return result
  })()
  
  // Get max values for scaling
  const maxTotalSold = Math.max(...chartData.map(s => s.totalSold), 1)
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <TrendingUpIcon className="text-blue-600" style={{ fontSize: 20 }} />
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Deal Analytics</h2>
                <p className="text-[10px] text-gray-500">Competitor tracking</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <CloseIcon className="text-gray-400" style={{ fontSize: 18 }} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshIcon className="animate-spin text-gray-400" style={{ fontSize: 24 }} />
              </div>
            ) : !deal ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Deal not found
              </div>
            ) : (
              <div className="space-y-4">
                {/* Deal Info - Compact */}
                <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {/* Image */}
                  {deal.imageUrl && (
                      <img 
                        src={deal.imageUrl} 
                        alt="" 
                      className="w-20 h-20 rounded-lg object-cover shadow-sm flex-shrink-0"
                      />
                  )}
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${getSiteBadgeColor(deal.sourceSite)}`}>
                        {getSiteLabel(deal.sourceSite)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        deal.status === 'active' 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {deal.status === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-bold text-gray-900 truncate">{deal.merchantName}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{deal.dealTitle}</p>
                    
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="text-lg font-bold text-green-600">{formatCurrency(deal.offerPrice)}</span>
                      <span className="text-xs text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</span>
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{deal.discountPercent}%</span>
                      </div>
                    </div>
                    
                  {/* External Link */}
                    <a
                      href={deal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    className="self-start p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={`View on ${getSiteLabel(deal.sourceSite)}`}
                    >
                    <OpenInNewIcon style={{ fontSize: 16 }} />
                    </a>
                </div>
                
                {/* Stats Cards - Compact inline */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-blue-50/50 rounded-lg px-3 py-2 border border-blue-100/50">
                    <p className="text-[10px] text-blue-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-blue-900">{deal.totalSold.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50/50 rounded-lg px-3 py-2 border border-green-100/50">
                    <p className="text-[10px] text-green-600 font-medium">Today</p>
                    <p className="text-lg font-bold text-green-900">
                      {deal.salesToday > 0 ? `+${deal.salesToday}` : '-'}
                    </p>
                  </div>
                  <div className="bg-purple-50/50 rounded-lg px-3 py-2 border border-purple-100/50">
                    <p className="text-[10px] text-purple-600 font-medium">Week</p>
                    <p className="text-lg font-bold text-purple-900">
                      {deal.salesThisWeek > 0 ? `+${deal.salesThisWeek}` : '-'}
                    </p>
                  </div>
                  <div className="bg-orange-50/50 rounded-lg px-3 py-2 border border-orange-100/50">
                    <p className="text-[10px] text-orange-600 font-medium">Month</p>
                    <p className="text-lg font-bold text-orange-900">
                      {deal.salesThisMonth > 0 ? `+${deal.salesThisMonth}` : '-'}
                    </p>
                  </div>
                </div>
                
                {/* Dates - inline */}
                <div className="flex items-center gap-4 text-[10px] text-gray-400">
                  <div className="flex items-center gap-1">
                    <CalendarTodayIcon style={{ fontSize: 12 }} />
                    First: {formatShortDate(deal.firstSeenAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshIcon style={{ fontSize: 12 }} />
                    Updated: {formatCompactDateTime(deal.lastScannedAt)}
                  </div>
                </div>
                
                {/* Sales Chart */}
                {snapshots.length > 1 && chartData.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700">Sales History</h4>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span>{chartData.length}d</span>
                        <span>•</span>
                        <span>{snapshots.length} pts</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-300 rounded"></div>
                          <span>gap</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="h-32 flex items-end gap-[1px]">
                        {chartData.map((snapshot, index) => {
                          const height = maxTotalSold > 0 ? (snapshot.totalSold / maxTotalSold) * 100 : 5
                          const isLatest = index === chartData.length - 1
                          const barWidth = Math.max(100 / chartData.length, 3)
                          
                          return (
                            <div 
                              key={snapshot.id}
                              className="flex flex-col items-center group relative"
                              style={{ 
                                width: `${barWidth}%`,
                                minWidth: '3px',
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'flex-end'
                              }}
                            >
                              <div 
                                className={`w-full rounded-sm transition-all cursor-pointer ${
                                  !snapshot.hasData
                                    ? 'bg-gray-200'
                                    : isLatest 
                                      ? 'bg-blue-500' 
                                      : 'bg-gray-400'
                                } hover:opacity-70`}
                                style={{ 
                                  height: `${Math.max(height, 4)}%`,
                                  minHeight: '3px'
                                }}
                              />
                              
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                  <p className="font-semibold">{snapshot.totalSold.toLocaleString()}</p>
                                  {snapshot.hasData ? (
                                    snapshot.salesSinceLast > 0 && (
                                      <p className="text-green-400">+{snapshot.salesSinceLast}</p>
                                    )
                                  ) : (
                                    <p className="text-gray-400">no data</p>
                                  )}
                                  <p className="text-gray-400">{formatShortDate(snapshot.scannedAt)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                        <span>{formatShortDate(chartData[0].scannedAt)}</span>
                        <span>{formatShortDate(chartData[chartData.length - 1].scannedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {snapshots.length <= 1 && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                    <TrendingUpIcon className="text-gray-300 mx-auto mb-1" style={{ fontSize: 32 }} />
                    <p className="text-xs text-gray-500">Not enough data yet</p>
                    <p className="text-[10px] text-gray-400">Charts appear after multiple scans</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

