'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getCompetitorDeals, 
  getCompetitorDealsDailyStats,
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
import { formatCompactDateTime } from '@/lib/date'

type SortField = 'totalSold' | 'salesToday' | 'salesThisWeek' | 'salesThisMonth' | 'discountPercent' | 'offerPrice' | 'grossRevenue' | 'firstSeenAt' | 'lastScannedAt'

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
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 25
  
  // Filters
  const [search, setSearch] = useState('') // Input value
  const [committedSearch, setCommittedSearch] = useState('') // Value used for API calls
  const [sourceSite, setSourceSite] = useState<string>('')
  const [status, setStatus] = useState<string>('active')
  const [showNewOnly, setShowNewOnly] = useState(false) // Filter for deals seen today
  const [sortBy, setSortBy] = useState<SortField>('totalSold')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Charts data
  const [dailyStats, setDailyStats] = useState<{
    launchesPerDay: Array<{ date: string; count: number }>
    salesPerDay: Array<{ date: string; totalSold: number; dealsCount: number }>
    revenuePerDay: Array<{ date: string; grossRevenue: number; dealsCount: number }>
  } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  
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
        search: committedSearch || undefined,
        sortBy,
        sortOrder,
        newOnly: showNewOnly,
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
  }, [page, pageSize, sourceSite, status, committedSearch, sortBy, sortOrder, showNewOnly])
  
  const loadDailyStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const stats = await getCompetitorDealsDailyStats(30, sourceSite || undefined)
      setDailyStats(stats)
    } catch (error) {
      console.error('Failed to load daily stats:', error)
      toast.error('Failed to load statistics')
    } finally {
      setLoadingStats(false)
    }
  }, [sourceSite])
  
  
  // Reload deals when filter/sort/page/search changes
  useEffect(() => {
    loadDeals()
  }, [loadDeals])
  
  // Load daily stats when charts are shown or source filter changes
  useEffect(() => {
    if (showCharts) {
      loadDailyStats()
    }
  }, [showCharts, loadDailyStats])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setCommittedSearch(search) // Commit the search value to trigger reload
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
                
                // Check if there were errors
                if (data.errors && data.errors.length > 0) {
                  console.error('Scan errors:', data.errors)
                  toast.error(
                    `Scan had errors: ${data.errors[0]}${data.errors.length > 1 ? ` (+${data.errors.length - 1} more)` : ''}`,
                    { duration: 10000 }
                  )
                } else if (data.totalDealsFound === 0) {
                  toast.error(
                    'Scan found 0 deals - there may be a connectivity issue. Check console for details.',
                    { duration: 8000 }
                  )
                } else {
                  toast.success(
                    `Scan complete! Found ${data.totalDealsFound} deals (${data.newDeals} new, ${data.updatedDeals} updated)`,
                    { duration: 5000 }
                  )
                }
                loadDeals()
              } else if (eventLine.includes('error')) {
                setScanProgress(null)
                console.error('Scan error event:', data)
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
                Escanear Ahora
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
                  {scanProgress.phase === 'connecting' && '🔌 Conectando...'}
                  {scanProgress.phase === 'loading_list' && '📋 Cargando lista de ofertas...'}
                  {scanProgress.phase === 'scanning_deal' && '🔍 Escaneando ofertas...'}
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
          
          {/* New filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showNewOnly}
              onChange={(e) => { setShowNewOnly(e.target.checked); setPage(1); }}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700">New (Today)</span>
          </label>
          
          {/* Charts toggle */}
          <Button
            onClick={() => {
              setShowCharts(!showCharts)
              if (!showCharts && !dailyStats) {
                loadDailyStats()
              }
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 h-8 text-xs"
          >
            {showCharts ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
          </Button>
        </div>
      </div>
      
      {/* Charts Section */}
      {showCharts && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Estadísticas de los Últimos 30 Días
            {sourceSite && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({sourceSite === 'rantanofertas' ? 'RantanOfertas' : 'Oferta24'})
              </span>
            )}
          </h3>
          
          {loadingStats ? (
            <div className="flex items-center justify-center py-12">
              <RefreshIcon className="animate-spin text-gray-400" style={{ fontSize: 24 }} />
              <span className="ml-2 text-sm text-gray-500">Cargando estadísticas...</span>
            </div>
          ) : dailyStats && dailyStats.launchesPerDay.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Find the first day with actual data (initial scraping day to exclude) */}
              {(() => {
                // Find index of first day with significant sales data (initial scraping day)
                const firstDataDayIndex = dailyStats.salesPerDay.findIndex(d => d.totalSold > 0)
                const isInitialScrapingDay = (index: number) => index === firstDataDayIndex
                
                return (
                  <>
              {/* Launches Per Day Chart */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3">Ofertas Lanzadas por Día</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="h-44 flex items-end gap-[2px]">
                    {dailyStats.launchesPerDay.map((day, index) => {
                      // Skip initial scraping day as it has inflated data
                      const adjustedCount = isInitialScrapingDay(index) ? 0 : day.count
                      const adjustedData = dailyStats.launchesPerDay.map((d, i) => isInitialScrapingDay(i) ? 0 : d.count)
                      const maxCount = Math.max(...adjustedData, 1)
                      const heightPx = Math.max((adjustedCount / maxCount) * 140, adjustedCount > 0 ? 8 : 2) // 140px max for bars
                      // Parse date as local timezone
                      const dateParts = day.date.split('-')
                      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                      const today = new Date()
                      const isToday = date.toDateString() === today.toDateString()
                      
                      return (
                        <div key={day.date} className="flex-1 min-w-[4px] flex flex-col justify-end items-center group relative">
                          {/* Value label on hover */}
                          {adjustedCount > 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                              {adjustedCount}
                            </div>
                          )}
                          <div 
                            className={`w-full rounded-t transition-all cursor-pointer ${
                              isToday 
                                ? 'bg-gradient-to-t from-green-600 to-green-400' 
                                : adjustedCount > 0 
                                  ? 'bg-gradient-to-t from-blue-500 to-blue-300'
                                  : 'bg-gray-200'
                            } hover:opacity-80`}
                            style={{ height: `${heightPx}px` }}
                            title={`${day.date}: ${adjustedCount} ofertas${isInitialScrapingDay(index) ? ' (inicio de tracking - excluido)' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[7px] text-gray-500">
                    {dailyStats.launchesPerDay.filter((_, i) => i % 7 === 0).map(day => {
                      const dateParts = day.date.split('-')
                      return (
                        <span key={day.date}>
                          {parseInt(dateParts[2])}/{parseInt(dateParts[1])}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Total: {dailyStats.launchesPerDay.reduce((sum, d, i) => sum + (isInitialScrapingDay(i) ? 0 : d.count), 0)} ofertas en {dailyStats.launchesPerDay.length - 1} días
                  </div>
                </div>
              </div>
              
              {/* Sales Per Day Chart */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3">Ventas por Día</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="h-44 flex items-end gap-[2px]">
                    {dailyStats.salesPerDay.map((day, index) => {
                      // Skip initial scraping day as it has inflated data
                      const adjustedSales = isInitialScrapingDay(index) ? 0 : day.totalSold
                      const adjustedData = dailyStats.salesPerDay.map((d, i) => isInitialScrapingDay(i) ? 0 : d.totalSold)
                      const maxSales = Math.max(...adjustedData, 1)
                      const heightPx = Math.max((adjustedSales / maxSales) * 140, adjustedSales > 0 ? 8 : 2) // 140px max for bars
                      // Parse date as local timezone
                      const dateParts = day.date.split('-')
                      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                      const today = new Date()
                      const isToday = date.toDateString() === today.toDateString()
                      
                      return (
                        <div key={day.date} className="flex-1 min-w-[4px] flex flex-col justify-end items-center group relative">
                          {/* Value label on hover */}
                          {adjustedSales > 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                              {adjustedSales.toLocaleString()}
                            </div>
                          )}
                          <div 
                            className={`w-full rounded-t transition-all cursor-pointer ${
                              isToday 
                                ? 'bg-gradient-to-t from-orange-600 to-orange-400' 
                                : adjustedSales > 0
                                  ? 'bg-gradient-to-t from-purple-500 to-purple-300'
                                  : 'bg-gray-200'
                            } hover:opacity-80`}
                            style={{ height: `${heightPx}px` }}
                            title={`${day.date}: ${adjustedSales.toLocaleString()} ventas${isInitialScrapingDay(index) ? ' (inicio de tracking - excluido)' : ` (${day.dealsCount} ofertas)`}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[7px] text-gray-500">
                    {dailyStats.salesPerDay.filter((_, i) => i % 7 === 0).map(day => {
                      const dateParts = day.date.split('-')
                      return (
                        <span key={day.date}>
                          {parseInt(dateParts[2])}/{parseInt(dateParts[1])}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Total: {dailyStats.salesPerDay.reduce((sum, d, i) => sum + (isInitialScrapingDay(i) ? 0 : d.totalSold), 0).toLocaleString()} ventas
                  </div>
                </div>
              </div>
              
              {/* Gross Revenue Per Day Chart */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-3">Gross Revenue por Día</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="h-44 flex items-end gap-[2px]">
                    {dailyStats.revenuePerDay.map((day, index) => {
                      // Skip initial scraping day as it has inflated data
                      const adjustedRevenue = isInitialScrapingDay(index) ? 0 : day.grossRevenue
                      const adjustedData = dailyStats.revenuePerDay.map((d, i) => isInitialScrapingDay(i) ? 0 : d.grossRevenue)
                      const maxRevenue = Math.max(...adjustedData, 1)
                      const heightPx = Math.max((adjustedRevenue / maxRevenue) * 140, adjustedRevenue > 0 ? 8 : 2) // 140px max for bars
                      // Parse date as local timezone
                      const dateParts = day.date.split('-')
                      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
                      const today = new Date()
                      const isToday = date.toDateString() === today.toDateString()
                      
                      return (
                        <div key={day.date} className="flex-1 min-w-[4px] flex flex-col justify-end items-center group relative">
                          {/* Value label on hover */}
                          {adjustedRevenue > 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                              {formatCurrency(adjustedRevenue)}
                            </div>
                          )}
                          <div 
                            className={`w-full rounded-t transition-all cursor-pointer ${
                              isToday 
                                ? 'bg-gradient-to-t from-yellow-500 to-yellow-300' 
                                : adjustedRevenue > 0
                                  ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                  : 'bg-gray-200'
                            } hover:opacity-80`}
                            style={{ height: `${heightPx}px` }}
                            title={`${day.date}: ${formatCurrency(adjustedRevenue)}${isInitialScrapingDay(index) ? ' (inicio de tracking - excluido)' : ` (${day.dealsCount} ofertas)`}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[7px] text-gray-500">
                    {dailyStats.revenuePerDay.filter((_, i) => i % 7 === 0).map(day => {
                      const dateParts = day.date.split('-')
                      return (
                        <span key={day.date}>
                          {parseInt(dateParts[2])}/{parseInt(dateParts[1])}
                        </span>
                      )
                    })}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Total: {formatCurrency(dailyStats.revenuePerDay.reduce((sum, d, i) => sum + (isInitialScrapingDay(i) ? 0 : d.grossRevenue), 0))}
                  </div>
                </div>
              </div>
                  </>
                )
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay datos disponibles
            </div>
          )}
        </div>
      )}
      
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Origen
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Etiqueta
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Oferta
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Precio
                </th>
                <SortHeader field="discountPercent" label="Descuento" className="text-right" />
                <SortHeader field="totalSold" label="Vendido" className="text-right" />
                <SortHeader field="grossRevenue" label="Gross Rev" className="text-right" />
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Días
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  /Día
                </th>
                <SortHeader field="salesToday" label="Hoy" className="text-right" />
                <SortHeader field="salesThisWeek" label="Semana" className="text-right" />
                <SortHeader field="salesThisMonth" label="Mes" className="text-right" />
                <SortHeader field="firstSeenAt" label="Primera Vez" />
                <SortHeader field="lastScannedAt" label="Actualizado" />
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Ver
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-gray-500">
                    <RefreshIcon className="animate-spin mx-auto mb-2" style={{ fontSize: 24 }} />
                    <p>Cargando ofertas...</p>
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-gray-500">
                    <StorefrontIcon className="mx-auto mb-2 text-gray-400" style={{ fontSize: 48 }} />
                    <p className="font-medium">No se encontraron ofertas</p>
                    <p className="text-sm mt-1">
                      {search || sourceSite || status !== 'active' 
                        ? 'Intente ajustar sus filtros'
                        : 'Haga clic en "Escanear Ahora" para descubrir ofertas de competidores'}
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
                      <span className="text-xs font-bold text-emerald-600">
                        {formatCurrency(deal.totalSold * deal.offerPrice)}
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
                      {formatCompactDateTime(deal.firstSeenAt)}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {formatCompactDateTime(deal.lastScannedAt)}
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

