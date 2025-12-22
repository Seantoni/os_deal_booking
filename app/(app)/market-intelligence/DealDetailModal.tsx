'use client'

import { useState, useEffect } from 'react'
import { getCompetitorDeal, CompetitorDealWithStats, DealSnapshot } from '@/app/actions/competitor-deals'
import CloseIcon from '@mui/icons-material/Close'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import StorefrontIcon from '@mui/icons-material/Storefront'
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
  
  // Calculate chart data
  const chartData = snapshots.map((s, index) => {
    const prevSnapshot = index > 0 ? snapshots[index - 1] : null
    const salesSinceLast = prevSnapshot ? s.totalSold - prevSnapshot.totalSold : 0
    return {
      ...s,
      salesSinceLast,
    }
  })
  
  // Get max values for scaling
  const maxTotalSold = Math.max(...snapshots.map(s => s.totalSold), 1)
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUpIcon className="text-blue-600" />
              Deal Details
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <CloseIcon className="text-gray-500" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshIcon className="animate-spin text-gray-400" style={{ fontSize: 32 }} />
              </div>
            ) : !deal ? (
              <div className="text-center py-12 text-gray-500">
                Deal not found
              </div>
            ) : (
              <div className="space-y-6">
                {/* Deal Info */}
                <div className="flex gap-6">
                  {/* Image */}
                  {deal.imageUrl && (
                    <div className="flex-shrink-0">
                      <img 
                        src={deal.imageUrl} 
                        alt="" 
                        className="w-32 h-32 rounded-lg object-cover shadow-sm"
                      />
                    </div>
                  )}
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSiteBadgeColor(deal.sourceSite)}`}>
                        {getSiteLabel(deal.sourceSite)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        deal.status === 'active' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {deal.status === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <StorefrontIcon className="text-gray-400" style={{ fontSize: 20 }} />
                      {deal.merchantName}
                    </h3>
                    <p className="text-gray-600 mt-1">{deal.dealTitle}</p>
                    
                    <div className="mt-4 flex items-center gap-6">
                      <div>
                        <p className="text-sm text-gray-500">Offer Price</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(deal.offerPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Original</p>
                        <p className="text-lg text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Discount</p>
                        <p className="text-lg font-bold text-red-600">-{deal.discountPercent}%</p>
                      </div>
                    </div>
                    
                    <a
                      href={deal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-4 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View on {getSiteLabel(deal.sourceSite)}
                      <OpenInNewIcon style={{ fontSize: 14 }} />
                    </a>
                  </div>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium">Total Sold</p>
                    <p className="text-3xl font-bold text-blue-900">{deal.totalSold.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                    <p className="text-sm text-green-600 font-medium">Sales Today</p>
                    <p className="text-3xl font-bold text-green-900">
                      {deal.salesToday > 0 ? `+${deal.salesToday}` : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-sm text-purple-600 font-medium">This Week</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {deal.salesThisWeek > 0 ? `+${deal.salesThisWeek}` : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-100">
                    <p className="text-sm text-orange-600 font-medium">This Month</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {deal.salesThisMonth > 0 ? `+${deal.salesThisMonth}` : '-'}
                    </p>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <CalendarTodayIcon style={{ fontSize: 16 }} />
                    First seen: {formatShortDate(deal.firstSeenAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshIcon style={{ fontSize: 16 }} />
                    Last updated: {formatCompactDateTime(deal.lastScannedAt)}
                  </div>
                </div>
                
                {/* Sales Chart */}
                {snapshots.length > 1 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">Sales History</h4>
                    
                    {/* Simple bar chart */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="h-48 flex items-end gap-1">
                        {chartData.map((snapshot, index) => {
                          const height = (snapshot.totalSold / maxTotalSold) * 100
                          const isLatest = index === chartData.length - 1
                          
                          return (
                            <div 
                              key={snapshot.id}
                              className="flex-1 flex flex-col items-center group relative"
                            >
                              {/* Bar */}
                              <div 
                                className={`w-full rounded-t transition-all ${
                                  isLatest 
                                    ? 'bg-gradient-to-t from-blue-600 to-blue-400' 
                                    : 'bg-gradient-to-t from-gray-400 to-gray-300'
                                } hover:opacity-80`}
                                style={{ height: `${Math.max(height, 2)}%` }}
                              />
                              
                              {/* Tooltip */}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                  <p className="font-semibold">{snapshot.totalSold.toLocaleString()} sold</p>
                                  {snapshot.salesSinceLast > 0 && (
                                    <p className="text-green-400">+{snapshot.salesSinceLast} since last</p>
                                  )}
                                  <p className="text-gray-400">{formatCompactDateTime(snapshot.scannedAt)}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>{formatShortDate(snapshots[0].scannedAt)}</span>
                        <span>{formatShortDate(snapshots[snapshots.length - 1].scannedAt)}</span>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {snapshots.length} data points tracked
                    </p>
                  </div>
                )}
                
                {snapshots.length <= 1 && (
                  <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
                    <TrendingUpIcon className="text-gray-300 mx-auto mb-2" style={{ fontSize: 48 }} />
                    <p className="text-gray-500">Not enough data for sales chart</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Charts will appear after multiple scans
                    </p>
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

