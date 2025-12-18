'use client'

import { useState, useEffect } from 'react'
import { getDashboardStats } from '@/app/actions/dashboard'
import { getAllUsers } from '@/app/actions/crm'
import { PANAMA_TIMEZONE } from '@/lib/date'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FilterListIcon from '@mui/icons-material/FilterList'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import GroupIcon from '@mui/icons-material/Group'
import RefreshIcon from '@mui/icons-material/Refresh'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function DashboardClient() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
  })
  const [panamaTime, setPanamaTime] = useState<string>('')

  // Update Panama time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setPanamaTime(now.toLocaleString('es-PA', {
        timeZone: PANAMA_TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadData()
  }, [filters])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [statsResult, usersResult] = await Promise.all([
        getDashboardStats(filters),
        getAllUsers(),
      ])

      if (statsResult.success && 'data' in statsResult && statsResult.data) {
        setStats(statsResult.data)
      } else {
        const errorMsg = 'error' in statsResult ? statsResult.error : 'Unknown error loading stats'
        console.error('Dashboard stats error:', errorMsg)
        setError(errorMsg as string)
        setStats(null)
      }
      
      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getPercent = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0

  if (loading && !stats) {
    return (
      <div className="min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-32 bg-gray-200 rounded-xl"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="h-96 bg-gray-200 rounded-xl lg:col-span-2"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center max-w-md px-4">
          <p className="text-gray-500 mb-2">Failed to load dashboard data</p>
          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 p-2 rounded">{error}</p>
          )}
          <Button onClick={loadData} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Panama Timezone Display - For Validation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <AccessTimeIcon className="text-blue-600" fontSize="small" />
            <div className="text-sm">
              <span className="font-medium text-blue-700">Panamá: </span>
              <span className="text-blue-900 font-mono">{panamaTime || 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Filters Row - Moved Title to AppHeader */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center px-2 text-gray-400">
              <FilterListIcon fontSize="small" />
            </div>
            <div className="w-40">
              <Select
                size="sm"
                options={[
                  { value: '', label: 'All Members' },
                  ...users.map(u => ({ value: u.clerkId, label: u.name || u.email }))
                ]}
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="border-0 bg-transparent focus:ring-0 shadow-none text-sm"
              />
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="w-32">
              <Input
              type="date"
                size="sm"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="border-0 bg-transparent focus:ring-0 shadow-none text-sm"
            />
            </div>
            <span className="text-gray-400">-</span>
            <div className="w-32">
              <Input
              type="date"
                size="sm"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="border-0 bg-transparent focus:ring-0 shadow-none text-sm"
              />
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
            <button 
              onClick={loadData}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RefreshIcon fontSize="small" />
            </button>
          </div>
        </div>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Opportunities Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <HandshakeIcon className="text-green-600" fontSize="small" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Won Deals</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">{stats?.opportunities?.byStage?.['won'] || 0}</span>
              <span className="text-sm text-gray-500">/ {stats?.opportunities?.total || 0} total</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Conversion Rate</span>
                <span className="text-green-600 font-bold">{getPercent(stats?.opportunities?.byStage?.['won'] || 0, stats?.opportunities?.total || 0)}%</span>
              </div>
              <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${getPercent(stats?.opportunities?.byStage?.['won'] || 0, stats?.opportunities?.total || 0)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Meetings Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <GroupIcon className="text-blue-600" fontSize="small" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meetings</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">{stats?.tasks?.meetings || 0}</span>
              <span className="text-sm text-gray-500">scheduled</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50/50 rounded-lg p-2 text-center border border-green-100">
                <div className="text-lg font-bold text-green-700">{stats?.tasks?.meetingsCompleted || 0}</div>
                <div className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Done</div>
              </div>
              <div className="bg-blue-50/50 rounded-lg p-2 text-center border border-blue-100">
                <div className="text-lg font-bold text-blue-700">{stats?.tasks?.meetingsPending || 0}</div>
                <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Pending</div>
              </div>
            </div>
          </div>

          {/* Booking Requests Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <DescriptionIcon className="text-purple-600" fontSize="small" />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Requests</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-gray-900">{stats?.bookings?.total || 0}</span>
              <span className="text-sm text-gray-500">total</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col justify-between bg-gray-50 rounded-lg p-2 border border-gray-100">
                <span className="text-[10px] text-gray-500 uppercase font-medium">Approved</span>
                <span className="text-lg font-bold text-gray-900">{stats?.bookings?.byStatus?.['approved'] || 0}</span>
              </div>
              <div className="flex-1 flex flex-col justify-between bg-blue-50/50 rounded-lg p-2 border border-blue-100">
                <span className="text-[10px] text-blue-600 uppercase font-medium">Booked</span>
                <span className="text-lg font-bold text-blue-700">{stats?.bookings?.byStatus?.['booked'] || 0}</span>
              </div>
              <div className="flex-1 flex flex-col justify-between bg-yellow-50/50 rounded-lg p-2 border border-yellow-100">
                <span className="text-[10px] text-yellow-600 uppercase font-medium">Pending</span>
                <span className="text-lg font-bold text-yellow-700">{stats?.bookings?.byStatus?.['pending'] || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-yellow-50 rounded-md">
                  <HandshakeIcon className="text-yellow-600" fontSize="small" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Leaderboard</h3>
                  <p className="text-xs text-gray-500">Team performance rankings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded text-gray-600">Ranked by Booked</span>
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                    <th className="px-6 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider w-1/3">Member</th>
                    <th className="px-4 py-[5px] font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Approved</th>
                    <th className="px-4 py-[5px] font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Booked</th>
                    <th className="px-4 py-[5px] font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Meetings</th>
                    <th className="px-4 py-[5px] font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Tasks</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-50">
                {stats?.teamPerformance?.map((member: any, index: number) => (
                  <tr 
                    key={member.userId} 
                      className={`group transition-colors ${member.isCurrentUser ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                  >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-1 ring-inset ${
                            index === 0 ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                            index === 1 ? 'bg-gray-100 text-gray-700 ring-gray-500/20' :
                            index === 2 ? 'bg-orange-50 text-orange-800 ring-orange-600/20' :
                            'bg-transparent text-gray-400 ring-gray-200'
                        }`}>
                          {index + 1}
                        </span>
                          <div className="flex flex-col">
                            <span className={`font-semibold ${member.isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                          {member.name}
                        </span>
                            {member.isCurrentUser && <span className="text-[10px] text-blue-500 font-medium">You</span>}
                          </div>
                      </div>
                    </td>
                      <td className="px-4 py-[5px] text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        {member.approvedRequests || 0}
                      </span>
                    </td>
                      <td className="px-4 py-[5px] text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                        {member.bookedRequests || 0}
                      </span>
                    </td>
                      <td className="px-4 py-[5px] text-center text-gray-600 font-medium">
                      {member.meetings || 0}
                    </td>
                      <td className="px-4 py-[5px] text-center text-gray-600 font-medium">
                      {member.todos || 0}
                    </td>
                  </tr>
                ))}
                {(!stats?.teamPerformance || stats?.teamPerformance.length === 0) && (
                  <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                        No team activity found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

          {/* Right Column: Request Flow & Quick Stats */}
          <div className="flex flex-col gap-6">
            
            {/* Request Flow Widget */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-white">
                <h3 className="text-base font-bold text-gray-900">Request Flow</h3>
                <p className="text-xs text-gray-500">Current status distribution</p>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {[
                    { label: 'Draft', count: stats?.bookings?.byStatus?.['draft'] || 0, color: 'gray', bg: 'bg-gray-100', text: 'text-gray-600' },
                    { label: 'Pending', count: stats?.bookings?.byStatus?.['pending'] || 0, color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-700' },
                    { label: 'Approved', count: stats?.bookings?.byStatus?.['approved'] || 0, color: 'green', bg: 'bg-green-50', text: 'text-green-700' },
                    { label: 'Booked', count: stats?.bookings?.byStatus?.['booked'] || 0, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-700' },
                    { label: 'Rejected', count: stats?.bookings?.byStatus?.['rejected'] || 0, color: 'red', bg: 'bg-red-50', text: 'text-red-700' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.bg.replace('bg-', 'bg-').replace('50', '400').replace('100', '400')}`}></div>
                        <span className="text-sm font-medium text-gray-600">{item.label}</span>
            </div>
                      <div className="flex items-center gap-3">
                         <div className="flex-1 w-24 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${item.bg.replace('bg-', 'bg-').replace('50', '500').replace('100', '500')}`}
                              style={{ width: `${getPercent(item.count, stats?.bookings?.total || 0)}%` }}
                            ></div>
          </div>
                         <span className={`text-sm font-bold ${item.text}`}>{item.count}</span>
              </div>
            </div>
                  ))}
            </div>
          </div>
        </div>

          </div>

        </div>

      </div>
    </div>
  )
}
