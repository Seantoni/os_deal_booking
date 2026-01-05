'use client'

import { useState, useEffect, useCallback } from 'react'
import { getActivityLogs, getActivityLogUsers } from '@/app/actions/activity-log'
import { formatDateTime } from '@/lib/date'
import { Input, Button, Select } from '@/components/ui'
import { EntityTable, EmptyTableState, type ColumnConfig } from '@/components/shared'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonIcon from '@mui/icons-material/Person'
import BusinessIcon from '@mui/icons-material/Business'
import HandshakeIcon from '@mui/icons-material/Handshake'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ContactsIcon from '@mui/icons-material/Contacts'
import EventNoteIcon from '@mui/icons-material/EventNote'
import SettingsIcon from '@mui/icons-material/Settings'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import LoginIcon from '@mui/icons-material/Login'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import SendIcon from '@mui/icons-material/Send'
import FilterListIcon from '@mui/icons-material/FilterList'

interface ActivityLog {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  details: Record<string, unknown> | null
  createdAt: Date
}

interface User {
  userId: string
  userName: string | null
  userEmail: string | null
}

const COLUMNS: ColumnConfig[] = [
  { key: 'user', label: 'Usuario' },
  { key: 'action', label: 'Acción' },
  { key: 'entity', label: 'Entidad' },
  { key: 'details', label: 'Detalles', className: 'hidden md:table-cell' },
  { key: 'date', label: 'Fecha', align: 'right' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las Acciones' },
  { value: 'CREATE', label: 'Crear' },
  { value: 'UPDATE', label: 'Actualizar' },
  { value: 'DELETE', label: 'Eliminar' },
  { value: 'VIEW', label: 'Ver' },
  { value: 'STATUS_CHANGE', label: 'Cambio de Estado' },
  { value: 'APPROVE', label: 'Aprobar' },
  { value: 'REJECT', label: 'Rechazar' },
  { value: 'SEND', label: 'Enviar' },
  { value: 'RESEND', label: 'Reenviar' },
  { value: 'LOGIN', label: 'Iniciar Sesión' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las Entidades' },
  { value: 'Business', label: 'Negocio' },
  { value: 'Opportunity', label: 'Oportunidad' },
  { value: 'Deal', label: 'Oferta' },
  { value: 'Lead', label: 'Lead' },
  { value: 'BookingRequest', label: 'Booking Request' },
  { value: 'Event', label: 'Event' },
  { value: 'Settings', label: 'Settings' },
]

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATE':
      return <AddIcon className="w-4 h-4 text-green-600" />
    case 'UPDATE':
      return <EditIcon className="w-4 h-4 text-blue-600" />
    case 'DELETE':
      return <DeleteIcon className="w-4 h-4 text-red-600" />
    case 'VIEW':
      return <VisibilityIcon className="w-4 h-4 text-gray-600" />
    case 'LOGIN':
      return <LoginIcon className="w-4 h-4 text-purple-600" />
    case 'STATUS_CHANGE':
      return <SyncIcon className="w-4 h-4 text-orange-600" />
    case 'APPROVE':
      return <CheckCircleIcon className="w-4 h-4 text-green-600" />
    case 'REJECT':
      return <CancelIcon className="w-4 h-4 text-red-600" />
    case 'SEND':
    case 'RESEND':
      return <SendIcon className="w-4 h-4 text-blue-600" />
    default:
      return <EditIcon className="w-4 h-4 text-gray-600" />
  }
}

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case 'Business':
      return <BusinessIcon className="w-4 h-4 text-blue-600" />
    case 'Opportunity':
      return <HandshakeIcon className="w-4 h-4 text-purple-600" />
    case 'Deal':
      return <AssignmentIcon className="w-4 h-4 text-green-600" />
    case 'Lead':
      return <ContactsIcon className="w-4 h-4 text-orange-600" />
    case 'BookingRequest':
      return <EventNoteIcon className="w-4 h-4 text-teal-600" />
    case 'Event':
      return <EventNoteIcon className="w-4 h-4 text-pink-600" />
    case 'Settings':
      return <SettingsIcon className="w-4 h-4 text-gray-600" />
    case 'User':
      return <PersonIcon className="w-4 h-4 text-indigo-600" />
    default:
      return <BusinessIcon className="w-4 h-4 text-gray-600" />
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-800'
    case 'UPDATE':
      return 'bg-blue-100 text-blue-800'
    case 'DELETE':
      return 'bg-red-100 text-red-800'
    case 'VIEW':
      return 'bg-gray-100 text-gray-800'
    case 'LOGIN':
      return 'bg-purple-100 text-purple-800'
    case 'STATUS_CHANGE':
      return 'bg-orange-100 text-orange-800'
    case 'APPROVE':
      return 'bg-green-100 text-green-800'
    case 'REJECT':
      return 'bg-red-100 text-red-800'
    case 'SEND':
    case 'RESEND':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export default function ActivityLogClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [page, setPage] = useState(0)
  const limit = 50

  const loadLogs = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const offset = reset ? 0 : page * limit
      const result = await getActivityLogs({
        userId: selectedUser || undefined,
        action: (selectedAction || undefined) as typeof selectedAction,
        entityType: (selectedEntity || undefined) as typeof selectedEntity,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset,
      })

      if (result.success && result.data) {
        setLogs(result.data.logs as ActivityLog[])
        setTotal(result.data.total)
        setHasMore(result.data.hasMore)
        if (reset) setPage(0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, selectedUser, selectedAction, selectedEntity, search, startDate, endDate])

  const loadUsers = useCallback(async () => {
    const result = await getActivityLogUsers()
    if (result.success && result.data) {
      setUsers(result.data as User[])
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadLogs(true)
  }, [selectedUser, selectedAction, selectedEntity, startDate, endDate])

  const handleSearch = () => {
    loadLogs(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedUser('')
    setSelectedAction('')
    setSelectedEntity('')
    setStartDate('')
    setEndDate('')
    setPage(0)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {total} {total === 1 ? 'activity' : 'activities'}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadLogs(true)}
            leftIcon={<RefreshIcon className="w-4 h-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-10"
                size="sm"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <SearchIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
            <Select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              options={[
                { value: '', label: 'All Users' },
                ...users.map(u => ({
                  value: u.userId,
                  label: u.userName || u.userEmail || u.userId,
                })),
              ]}
              size="sm"
            />
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <Select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              options={ACTION_OPTIONS}
              size="sm"
            />
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
            <Select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              options={ENTITY_OPTIONS}
              size="sm"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="sm"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-[34px]"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-xs text-gray-500">
          Showing {logs.length} of {total} activities
        </div>
        </div>

        {/* Activity List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : logs.length === 0 ? (
            <EmptyTableState
              icon={<FilterListIcon className="w-full h-full" />}
              title="No se encontraron actividades"
              description="Intente ajustar su búsqueda o filtros"
            />
          ) : (
            <div className="overflow-x-auto">
              <EntityTable 
                columns={COLUMNS}
                sortColumn="date"
                sortDirection="desc"
                onSort={() => {}}
              >
                {logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-gray-50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-[5px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <PersonIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-gray-900">
                            {log.userName || log.userEmail?.split('@')[0] || 'Unknown'}
                          </span>
                          {log.userEmail && (
                            <span className="text-[11px] text-gray-500 hidden sm:block">
                              {log.userEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-[5px]">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-[5px]">
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-700">
                        {getEntityIcon(log.entityType)}
                        <span className="font-medium">{log.entityType}</span>
                        {log.entityName && (
                          <span className="text-gray-500 truncate max-w-[150px]">
                            • {log.entityName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-[5px] hidden md:table-cell">
                      {log.details ? (
                        <div className="text-[13px] text-gray-600 flex flex-col gap-0.5">
                          {log.details.statusChange && (
                            <span>
                              Status: <span className="font-medium">{log.details.statusChange.from}</span> → <span className="font-medium">{log.details.statusChange.to}</span>
                            </span>
                          )}
                          {log.details.metadata && Object.entries(log.details.metadata).map(([key, value]) => {
                            if (key === 'rejectionReason') return <span key={key}>Reason: {String(value)}</span>
                            if (typeof value === 'object') return null // Skip complex objects for table view
                            return (
                              <span key={key} className="truncate max-w-[200px]">
                                <span className="text-gray-500">{key}:</span> {String(value)}
                              </span>
                            )
                          })}
                          
                          {/* Field Changes */}
                          {log.details.changedFields && log.details.changedFields.length > 0 && (
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              {log.details.changedFields.map((field: string) => {
                                const from = log.details.previousValues?.[field]
                                const to = log.details.newValues?.[field]
                                return (
                                  <span key={field} className="truncate max-w-[300px] text-[12px]">
                                    <span className="text-gray-500 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                                    <span className="line-through text-gray-400 px-1 bg-gray-50 rounded">{String(from ?? '-')}</span>
                                    <span className="text-gray-400 mx-1">→</span>
                                    <span className="font-medium text-gray-700 px-1 bg-blue-50 text-blue-700 rounded">{String(to ?? '-')}</span>
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {!log.details.statusChange && 
                           (!log.details.metadata || Object.keys(log.details.metadata).length === 0) && 
                           (!log.details.changedFields || log.details.changedFields.length === 0) && (
                            <span className="text-gray-400 italic">No details</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-[5px] text-right">
                      <span className="text-[13px] text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </EntityTable>
            </div>
          )}

          {/* Pagination */}
          {hasMore && (
            <div className="p-4 border-t border-gray-100 text-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPage(p => p + 1)
                  loadLogs()
                }}
                loading={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
