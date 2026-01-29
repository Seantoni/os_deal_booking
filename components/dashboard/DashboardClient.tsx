'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardStats, getPendingBookings, type DashboardFilters } from '@/app/actions/dashboard'
import { getInboxItems, dismissInboxItem } from '@/app/actions/inbox'
import { getPendingComments, type PendingCommentItem } from '@/app/actions/comments'
import { useSharedData } from '@/hooks/useSharedData'
import { formatRelativeTime } from '@/lib/date'

const PANAMA_TZ = 'America/Panama'
import FilterListIcon from '@mui/icons-material/FilterList'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import HandshakeIcon from '@mui/icons-material/Handshake'
import DescriptionIcon from '@mui/icons-material/Description'
import GroupIcon from '@mui/icons-material/Group'
import RefreshIcon from '@mui/icons-material/Refresh'
import InboxIcon from '@mui/icons-material/Inbox'
import CampaignIcon from '@mui/icons-material/Campaign'
import CheckIcon from '@mui/icons-material/Check'
import EventIcon from '@mui/icons-material/Event'
import ScheduleIcon from '@mui/icons-material/Schedule'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import type { PendingBookingItem } from '@/app/actions/dashboard'
import type { InboxItem } from '@/app/actions/inbox'

// Dashboard stats type
interface DashboardStats {
  opportunities: {
    total: number
    byStage: Record<string, number>
  }
  tasks: {
    total: number
    completed: number
    pending: number
    meetings: number
    meetingsCompleted: number
    meetingsPending: number
    todos: number
  }
  bookings: {
    total: number
    byStatus: Record<string, number>
  }
  teamPerformance: Array<{
    userId: string
    name: string
    isCurrentUser: boolean
    oppsOpen: number
    oppsWon: number
    tasksCompleted: number
    tasksPending: number
    meetings: number
    todos: number
    approvedRequests: number
    bookedRequests: number
  }>
  isSalesUser: boolean
}

interface DashboardClientProps {
  initialData?: {
    stats: DashboardStats | null
    inboxItems: InboxItem[]
    pendingBookings: PendingBookingItem[]
    pendingComments: PendingCommentItem[]
  }
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter()
  
  // Use shared users from context (already loaded in layout) - saves 1 API call
  const { users } = useSharedData()
  
  // Use initial data from server if available (no loading flash)
  const [loading, setLoading] = useState(!initialData?.stats)
  const [stats, setStats] = useState<DashboardStats | null>(initialData?.stats || null)
  const [inboxItems, setInboxItems] = useState<InboxItem[]>(initialData?.inboxItems || [])
  const [pendingBookings, setPendingBookings] = useState<PendingBookingItem[]>(initialData?.pendingBookings || [])
  const [pendingComments, setPendingComments] = useState<PendingCommentItem[]>(initialData?.pendingComments || [])
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<DashboardFilters>({
    userId: '',
    startDate: '',
    endDate: '',
  })
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')
  
  // Debounce timer ref for filter changes
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // Update Panama time every minute (not every second - reduces re-renders)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleString('es-PA', {
        timeZone: PANAMA_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }))
      setDate(now.toLocaleString('es-PA', {
        timeZone: PANAMA_TZ,
        day: 'numeric',
        month: 'short',
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000) // Every minute instead of every second
    return () => clearInterval(interval)
  }, [])

  // Initial load - skip if we have initial data from server
  useEffect(() => {
    if (!initialData?.stats) {
      loadData()
    }
  }, [])

  // Debounced filter effect (500ms delay)
  useEffect(() => {
    // Skip initial mount (already loaded above)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // Clear previous debounce timer
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }
    
    // Debounce filter changes by 500ms
    filterDebounceRef.current = setTimeout(() => {
      loadData()
    }, 500)
    
    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
      }
    }
  }, [filters])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Parallel fetch stats, inbox, pending bookings, and pending comments (users come from shared context)
      const [statsResult, inboxResult, pendingResult, pendingCommentsResult] = await Promise.all([
        getDashboardStats(filters),
        getInboxItems(),
        getPendingBookings(),
        getPendingComments(),
      ])

      if (statsResult.success && 'data' in statsResult && statsResult.data) {
        setStats(statsResult.data)
      } else {
        const errorMsg = 'error' in statsResult ? statsResult.error : 'Error desconocido al cargar estadísticas'
        console.error('Dashboard stats error:', errorMsg)
        setError(errorMsg as string)
        setStats(null)
      }

      if (inboxResult.success && inboxResult.data) {
        setInboxItems(inboxResult.data)
      }

      if (pendingResult.success && pendingResult.data) {
        setPendingBookings(pendingResult.data)
      }

      if (pendingCommentsResult.success && pendingCommentsResult.data) {
        setPendingComments(pendingCommentsResult.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar datos del dashboard')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInboxItemClick = (item: InboxItem) => {
    router.push(item.linkUrl)
  }

  const handleDismissInbox = async (e: React.MouseEvent, item: InboxItem) => {
    e.stopPropagation()
    try {
      const result = await dismissInboxItem(item.commentId, item.entityType)
      if (result.success) {
        setInboxItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        toast.error(result.error || 'Error al marcar como hecho')
      }
    } catch (err) {
      toast.error('Error al marcar como hecho')
    }
  }

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getPercent = (val: number, total: number) => total > 0 ? Math.round((val / total) * 100) : 0

  // Loading state handled by loading.tsx
  if (loading && !stats) {
    return null
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center max-w-md px-4">
          <p className="text-gray-500 mb-2">Error al cargar datos del dashboard</p>
          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 p-2 rounded">{error}</p>
          )}
          <Button onClick={loadData} variant="primary">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Header Row: Filters + Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* User Filter */}
            <div className="flex items-center gap-2 bg-white pl-3 pr-1 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <FilterListIcon className="text-gray-400" style={{ fontSize: 14 }} />
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                className="text-xs text-gray-700 bg-transparent border-0 focus:ring-0 cursor-pointer pr-6 py-0.5 font-medium"
              >
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u.clerkId} value={u.clerkId}>
                    {u.name || u.email || 'Usuario'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-0 focus:ring-0 cursor-pointer w-[105px] py-0.5"
                placeholder="Desde"
              />
              <span className="text-gray-300 text-xs">→</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="text-xs text-gray-600 bg-transparent border-0 focus:ring-0 cursor-pointer w-[105px] py-0.5"
                placeholder="Hasta"
              />
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={loadData}
              className="px-2.5 py-1.5 text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 shadow-sm transition-colors flex items-center justify-center"
              title="Actualizar datos"
            >
              <RefreshIcon style={{ fontSize: 16 }} />
            </button>
          </div>
          
          {/* Time Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/50 rounded-lg">
            <AccessTimeIcon className="text-gray-400" style={{ fontSize: 14 }} />
            <span className="text-xs font-medium text-gray-600">{time}</span>
            <span className="text-gray-300">•</span>
            <span className="text-xs text-gray-500">{date}</span>
          </div>
        </div>

        {/* Priority Row: Pending Bookings + Inbox + Pending Comments side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Bookings Widget - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-orange-50 rounded">
                  <EventIcon className="text-orange-500" style={{ fontSize: 16 }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Por Reservar</h3>
              </div>
              {pendingBookings.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                  {pendingBookings.length}
                </span>
              )}
            </div>
            <div className="max-h-[180px] overflow-y-auto">
              {pendingBookings.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-center">
                  <p className="text-xs text-gray-400">Sin fechas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingBookings.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => router.push('/events')}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <ScheduleIcon 
                        className={item.status === 'pending' ? 'text-yellow-500' : 'text-green-500'} 
                        style={{ fontSize: 14 }} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900 truncate">{item.name}</span>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {item.status === 'pending' ? 'PEND' : 'APROB'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <span>{item.businessName || 'Sin negocio'}</span>
                          <span>•</span>
                          <span>{new Date(item.startDate).toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {pendingBookings.length > 5 && (
              <button
                onClick={() => router.push('/events')}
                className="w-full px-4 py-2 text-[10px] text-orange-600 hover:bg-orange-50 font-medium border-t border-gray-100"
              >
                Ver {pendingBookings.length - 5} más →
              </button>
            )}
          </div>

          {/* Inbox Widget - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-50 rounded">
                  <InboxIcon className="text-blue-500" style={{ fontSize: 16 }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Inbox</h3>
              </div>
              {inboxItems.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {inboxItems.length}
                </span>
              )}
            </div>
            <div className="max-h-[180px] overflow-y-auto">
              {inboxItems.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-center">
                  <p className="text-xs text-gray-400">Sin mensajes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {inboxItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="relative group">
                      <button
                        onClick={() => handleInboxItemClick(item)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3 pr-8"
                      >
                        {item.entityType === 'opportunity' ? (
                          <HandshakeIcon className="text-orange-400" style={{ fontSize: 14 }} />
                        ) : (
                          <CampaignIcon className="text-purple-400" style={{ fontSize: 14 }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900 truncate">
                              {item.author.name || 'Usuario'}
                            </span>
                            <span className="text-[10px] text-gray-400">{formatRelativeTime(item.createdAt)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{truncateContent(item.content, 50)}</p>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDismissInbox(e, item)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <CheckIcon style={{ fontSize: 12 }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {inboxItems.length > 5 && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 text-[10px] text-blue-600 hover:bg-blue-50 font-medium border-t border-gray-100"
              >
                Ver {inboxItems.length - 5} más →
              </button>
            )}
          </div>

          {/* Pending Comments Widget - Compact */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-50 rounded">
                  <ChatBubbleOutlineIcon className="text-purple-500" style={{ fontSize: 16 }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Sin Respuesta</h3>
              </div>
              {pendingComments.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {pendingComments.length}
                </span>
              )}
            </div>
            <div className="max-h-[180px] overflow-y-auto">
              {pendingComments.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-center">
                  <p className="text-xs text-gray-400">Sin comentarios pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingComments.slice(0, 5).map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => router.push(item.linkUrl)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      {item.type === 'opportunity' ? (
                        <HandshakeIcon className="text-orange-400" style={{ fontSize: 14 }} />
                      ) : (
                        <CampaignIcon className="text-purple-400" style={{ fontSize: 14 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900 truncate">
                            {item.author.name || 'Usuario'}
                          </span>
                          <span className="text-[10px] text-gray-400">{formatRelativeTime(item.createdAt)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">{truncateContent(item.content, 40)}</p>
                        <p className="text-[9px] text-gray-400 truncate">{item.entityName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {pendingComments.length > 5 && (
              <button
                onClick={() => router.push('/settings')}
                className="w-full px-4 py-2 text-[10px] text-purple-600 hover:bg-purple-50 font-medium border-t border-gray-100"
              >
                Ver más en Settings →
              </button>
            )}
          </div>
        </div>

        {/* Stats Row - Compact horizontal cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Won Deals */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <HandshakeIcon className="text-green-500" style={{ fontSize: 16 }} />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Ganadas</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stats?.opportunities?.byStage?.['won'] || 0}</span>
              <span className="text-xs text-gray-400">/ {stats?.opportunities?.total || 0}</span>
            </div>
            <div className="mt-2 bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-green-500 h-1 rounded-full" 
                style={{ width: `${getPercent(stats?.opportunities?.byStage?.['won'] || 0, stats?.opportunities?.total || 0)}%` }}
              />
            </div>
          </div>

          {/* Meetings */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <GroupIcon className="text-blue-500" style={{ fontSize: 16 }} />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Reuniones</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gray-900">{stats?.tasks?.meetingsCompleted || 0}</span>
              <span className="text-xs text-gray-400">/ {stats?.tasks?.meetings || 0}</span>
            </div>
          </div>

          {/* Bookings */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DescriptionIcon className="text-purple-500" style={{ fontSize: 16 }} />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Solicitudes</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{stats?.bookings?.total || 0}</span>
            </div>
            <div className="flex gap-2 mt-1 text-[10px]">
              <span className="text-green-600">{stats?.bookings?.byStatus?.['approved'] || 0} aprob</span>
              <span className="text-blue-600">{stats?.bookings?.byStatus?.['booked'] || 0} res</span>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckIcon className="text-emerald-500" style={{ fontSize: 16 }} />
              <span className="text-[10px] font-semibold text-gray-500 uppercase">Tareas</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{stats?.tasks?.completed || 0}</span>
              <span className="text-xs text-gray-400">/ {stats?.tasks?.total || 0}</span>
            </div>
            <div className="mt-2 bg-gray-100 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1 rounded-full" 
                style={{ width: `${getPercent(stats?.tasks?.completed || 0, stats?.tasks?.total || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content: Leaderboard + Request Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-yellow-50 rounded">
                  <HandshakeIcon className="text-yellow-600" style={{ fontSize: 16 }} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">Clasificación</h3>
              </div>
              <span className="text-[10px] text-gray-400">Por reservadas</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-4 py-2 font-semibold text-gray-500 text-left">Miembro</th>
                    <th className="px-3 py-2 font-semibold text-gray-500 text-center">Aprob</th>
                    <th className="px-3 py-2 font-semibold text-gray-500 text-center">Reserv</th>
                    <th className="px-3 py-2 font-semibold text-gray-500 text-center">Meet</th>
                    <th className="px-3 py-2 font-semibold text-gray-500 text-center">Tasks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats?.teamPerformance?.map((member, index) => (
                    <tr 
                      key={member.userId} 
                      className={`${member.isCurrentUser ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-600' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <span className={`font-medium ${member.isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                              {member.name}
                            </span>
                            {member.isCurrentUser && <span className="ml-1 text-[9px] text-blue-500">(tú)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">
                          {member.approvedRequests || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">
                          {member.bookedRequests || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{member.meetings || 0}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{member.todos || 0}</td>
                    </tr>
                  ))}
                  {(!stats?.teamPerformance || stats?.teamPerformance.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">
                        Sin actividad en este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Request Flow */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Flujo de Solicitudes</h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Borrador', count: stats?.bookings?.byStatus?.['draft'] || 0, color: 'gray' },
                { label: 'Pendientes', count: stats?.bookings?.byStatus?.['pending'] || 0, color: 'yellow' },
                { label: 'Aprobadas', count: stats?.bookings?.byStatus?.['approved'] || 0, color: 'green' },
                { label: 'Reservadas', count: stats?.bookings?.byStatus?.['booked'] || 0, color: 'blue' },
                { label: 'Rechazadas', count: stats?.bookings?.byStatus?.['rejected'] || 0, color: 'red' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${item.color}-400`}></div>
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-${item.color}-400`}
                        style={{ width: `${getPercent(item.count, stats?.bookings?.total || 0)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold text-${item.color}-600 w-6 text-right`}>{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
