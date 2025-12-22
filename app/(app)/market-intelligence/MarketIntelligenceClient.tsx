'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getCompetitorDeals, 
  getCompetitorDealStats,
  CompetitorDealWithStats 
} from '@/app/actions/competitor-deals'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import StorefrontIcon from '@mui/icons-material/Storefront'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Button } from '@/components/ui'
import toast from 'react-hot-toast'
import DealDetailModal from './DealDetailModal'

type SortField = 'totalSold' | 'salesToday' | 'salesThisWeek' | 'salesThisMonth' | 'discountPercent' | 'offerPrice' | 'firstSeenAt' | 'lastScannedAt'

interface ScanProgress {
  site: string
  phase: string
  message: string
  current?: number
  total?: number
  dealTitle?: string
}

export default function MarketIntelligenceClient() {
  const [deals, setDeals] = useState<CompetitorDealWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [stats, setStats] = useState<{
    totalDeals: number
    activeDeals: number
    totalSalesTracked: number
    bySite: { site: string; count: number; totalSold: number }[]
    lastScanAt: Date | null
    salesToday: number
    salesThisWeek: number
    salesLast30Days: number
  } | null>(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 25
  
  // Filters
  const [search, setSearch] = useState('')
  const [sourceSite, setSourceSite] = useState<string>('')
  const [status, setStatus] = useState<string>('active')
  const [sortBy, setSortBy] = useState<SortField>('totalSold')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Modal
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  
  const loadDeals = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getCompetitorDeals({
        page,
        pageSize,
        sourceSite: sourceSite || undefined,
        status: status || undefined,
        search: search || undefined,
        sortBy,
        sortOrder,
      })
      setDeals(result.deals)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sourceSite, status, search, sortBy, sortOrder])
  
  const loadStats = useCallback(async () => {
    try {
      const result = await getCompetitorDealStats()
      setStats(result)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])
  
  useEffect(() => {
    loadDeals()
    loadStats()
  }, [loadDeals, loadStats])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadDeals()
  }
  
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }
  
  const handleScan = async (site?: 'rantanofertas' | 'oferta24') => {
    setScanning(true)
    setScanProgress(null)
    
    try {
      // Use SSE for real-time progress
      const response = await fetch('/api/market-intelligence/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: site ? JSON.stringify({ site }) : '{}',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Scan failed')
        setScanning(false)
        return
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        toast.error('Failed to start scan stream')
        setScanning(false)
        return
      }
      
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            // Next line should be data
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              // Check the previous line for event type
              const eventIndex = lines.indexOf(line) - 1
              const eventLine = eventIndex >= 0 ? lines[eventIndex] : ''
              
              if (eventLine.includes('progress')) {
                setScanProgress(data)
              } else if (eventLine.includes('complete')) {
                setScanProgress(null)
                toast.success(
                  `Scan complete! Found ${data.totalDealsFound} deals (${data.newDeals} new, ${data.updatedDeals} updated)`,
                  { duration: 5000 }
                )
                loadDeals()
                loadStats()
              } else if (eventLine.includes('error')) {
                setScanProgress(null)
                toast.error(data.message || 'Scan failed')
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      toast.error('Failed to start scan')
    } finally {
      setScanning(false)
      setScanProgress(null)
    }
  }
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-PA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      rantanofertas: 'bg-orange-100 text-orange-800',
      oferta24: 'bg-blue-100 text-blue-800',
    }
    return colors[site] || 'bg-gray-100 text-gray-800'
  }
  
  // Calculate active days (difference between firstSeenAt and lastScannedAt)
  const getActiveDays = (firstSeenAt: Date | string, lastScannedAt: Date | string): number => {
    const first = new Date(firstSeenAt).getTime()
    const last = new Date(lastScannedAt).getTime()
    const diffMs = last - first
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays) // At least 1 day
  }
  
  // Calculate sales per day
  const getSalesPerDay = (totalSold: number, activeDays: number): string => {
    if (activeDays <= 0 || totalSold <= 0) return '-'
    const perDay = totalSold / activeDays
    return perDay >= 1 ? perDay.toFixed(1) : perDay.toFixed(2)
  }
  
  const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <th 
      className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === field && (
          <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  )

  return (
    <div className="p-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUpIcon className="text-blue-600" />
            Market Intelligence
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track competitor deals from RantanOfertas and Oferta24
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleScan()}
            disabled={scanning}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white h-8 text-xs"
          >
            {scanning ? (
              <>
                <RefreshIcon className="animate-spin mr-2" style={{ fontSize: 16 }} />
                Scanning...
              </>
            ) : (
              <>
                <PlayArrowIcon className="mr-1" style={{ fontSize: 16 }} />
                Scan Now
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Scan Progress Panel */}
      {scanning && scanProgress && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <RefreshIcon className="animate-spin text-blue-600" style={{ fontSize: 20 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSiteBadgeColor(scanProgress.site)}`}>
                  {getSiteLabel(scanProgress.site)}
                </span>
                <span className="text-xs font-medium text-gray-700">
                  {scanProgress.phase === 'connecting' && '🔌 Connecting...'}
                  {scanProgress.phase === 'loading_list' && '📋 Loading deals list...'}
                  {scanProgress.phase === 'scanning_deal' && '🔍 Scanning deals...'}
                  {scanProgress.phase === 'saving' && '💾 Saving to database...'}
                  {scanProgress.phase === 'complete' && '✅ Complete!'}
                  {scanProgress.phase === 'error' && '❌ Error'}
                </span>
              </div>
              <p className="text-xs text-gray-600 truncate">
                {scanProgress.message}
              </p>
              {scanProgress.current && scanProgress.total && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>Progress</span>
                    <span>{scanProgress.current} / {scanProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Stats Cards */}
      {stats && (
        <>
          {/* Row 1: Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Active Deals</p>
              <p className="text-xl font-bold text-gray-900">{stats.activeDeals}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">of {stats.totalDeals} total</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Vouchers Sold</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalSalesTracked.toLocaleString()}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">across all tracked deals</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-3">
              <p className="text-[10px] text-orange-600 uppercase tracking-wide font-medium">RantanOfertas</p>
              <p className="text-xl font-bold text-orange-700">
                {(stats.bySite.find(s => s.site === 'rantanofertas')?.totalSold || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-orange-500 mt-0.5">
                {stats.bySite.find(s => s.site === 'rantanofertas')?.count || 0} deals
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-3">
              <p className="text-[10px] text-blue-600 uppercase tracking-wide font-medium">Oferta24</p>
              <p className="text-xl font-bold text-blue-700">
                {(stats.bySite.find(s => s.site === 'oferta24')?.totalSold || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-blue-500 mt-0.5">
                {stats.bySite.find(s => s.site === 'oferta24')?.count || 0} deals
              </p>
            </div>
          </div>
          
          {/* Row 2: Sales Performance */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-green-600 uppercase tracking-wide font-medium">Sales Today</p>
                <span className="text-green-500 text-sm">📈</span>
              </div>
              <p className="text-2xl font-bold text-green-700 mt-0.5">
                {stats.salesToday.toLocaleString()}
              </p>
              <p className="text-[10px] text-green-500 mt-0.5">vouchers sold today</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg shadow-sm border border-purple-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-purple-600 uppercase tracking-wide font-medium">This Week</p>
                <span className="text-purple-500 text-sm">📊</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 mt-0.5">
                {stats.salesThisWeek.toLocaleString()}
              </p>
              <p className="text-[10px] text-purple-500 mt-0.5">last 7 days</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg shadow-sm border border-indigo-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-indigo-600 uppercase tracking-wide font-medium">Last 30 Days</p>
                <span className="text-indigo-500 text-sm">📅</span>
              </div>
              <p className="text-2xl font-bold text-indigo-700 mt-0.5">
                {stats.salesLast30Days.toLocaleString()}
              </p>
              <p className="text-[10px] text-indigo-500 mt-0.5">monthly trend</p>
            </div>
          </div>
        </>
      )}
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 18 }} />
              <input
                type="text"
                placeholder="Search merchant or deal title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              />
            </div>
          </form>
          
          {/* Source filter */}
          <div className="flex items-center gap-2">
            <FilterListIcon className="text-gray-400" style={{ fontSize: 18 }} />
            <select
              value={sourceSite}
              onChange={(e) => { setSourceSite(e.target.value); setPage(1); }}
              className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            >
              <option value="">All Sources</option>
              <option value="rantanofertas">RantanOfertas</option>
              <option value="oferta24">Oferta24</option>
            </select>
          </div>
          
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          
          {/* Last scan info */}
          {stats?.lastScanAt && (
            <div className="text-[10px] text-gray-500 ml-auto">
              Last scan: {formatDate(stats.lastScanAt)}
            </div>
          )}
        </div>
      </div>
      
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Tag
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Deal
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <SortHeader field="discountPercent" label="Discount" className="text-right" />
                <SortHeader field="totalSold" label="Sold" className="text-right" />
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  /Day
                </th>
                <SortHeader field="salesToday" label="Today" className="text-right" />
                <SortHeader field="salesThisWeek" label="Week" className="text-right" />
                <SortHeader field="salesThisMonth" label="Month" className="text-right" />
                <SortHeader field="firstSeenAt" label="First Seen" />
                <SortHeader field="lastScannedAt" label="Updated" />
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                    <RefreshIcon className="animate-spin mx-auto mb-2" style={{ fontSize: 24 }} />
                    <p>Loading deals...</p>
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-gray-500">
                    <StorefrontIcon className="mx-auto mb-2 text-gray-400" style={{ fontSize: 48 }} />
                    <p className="font-medium">No deals found</p>
                    <p className="text-sm mt-1">
                      {search || sourceSite || status !== 'active' 
                        ? 'Try adjusting your filters'
                        : 'Click "Scan Now" to discover competitor deals'}
                    </p>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr 
                    key={deal.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedDealId(deal.id)}
                  >
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getSiteBadgeColor(deal.sourceSite)}`}>
                        {getSiteLabel(deal.sourceSite)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {deal.tag ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                          {deal.tag}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {deal.imageUrl && (
                          <img 
                            src={deal.imageUrl} 
                            alt="" 
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate max-w-[200px]">
                            {deal.merchantName}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate max-w-[200px]">
                            {deal.dealTitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div>
                        <p className="text-xs font-semibold text-green-600">
                          {formatCurrency(deal.offerPrice)}
                        </p>
                        <p className="text-[10px] text-gray-400 line-through">
                          {formatCurrency(deal.originalPrice)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700">
                        -{deal.discountPercent}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-xs font-bold text-gray-900">
                        {deal.totalSold.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-[10px] text-gray-500">
                        {getActiveDays(deal.firstSeenAt, deal.lastScannedAt)}d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-xs font-medium text-indigo-600">
                        {getSalesPerDay(deal.totalSold, getActiveDays(deal.firstSeenAt, deal.lastScannedAt))}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-xs font-medium ${deal.salesToday > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {deal.salesToday > 0 ? `+${deal.salesToday}` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-xs font-medium ${deal.salesThisWeek > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {deal.salesThisWeek > 0 ? `+${deal.salesThisWeek}` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-xs font-medium ${deal.salesThisMonth > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {deal.salesThisMonth > 0 ? `+${deal.salesThisMonth}` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {formatDate(deal.firstSeenAt)}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {formatDate(deal.lastScannedAt)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <a
                        href={deal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <OpenInNewIcon style={{ fontSize: 14 }} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-500">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Prev
              </button>
              <span className="text-xs text-gray-600 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Deal Detail Modal */}
      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
        />
      )}
    </div>
  )
}

