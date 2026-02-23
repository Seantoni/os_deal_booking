'use client'

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { getAssignmentsPaginated, getAssignmentsCounts, searchAssignments, assignToNewOwner, cancelReassignment } from '@/app/actions/assignments'
import type { Business } from '@/types'
import FilterListIcon from '@mui/icons-material/FilterList'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import RepeatIcon from '@mui/icons-material/Repeat'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import PersonIcon from '@mui/icons-material/Person'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
import { sortEntities } from '@/hooks/useEntityPage'
import { formatRelativeTime } from '@/lib/date/formatting'
import { 
  EntityPageHeader, 
  EmptyTableState, 
  type FilterTab,
  type ColumnConfig,
} from '@/components/shared'
import { Button } from '@/components/ui'
import { EntityTable, TableRow, TableCell } from '@/components/shared/table'

// Lazy load heavy modal components
const BusinessFormModal = dynamic(() => import('@/components/crm/business/BusinessFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

// Extended Business type with reassignment fields
// Using Omit to override fields from Business that have different types from server
interface AssignmentBusiness extends Omit<Business, 'reassignmentType' | 'reassignmentRequester'> {
  reassignmentStatus?: string | null
  reassignmentType?: string | null // Override to allow any string from server
  reassignmentRequestedBy?: string | null
  reassignmentRequestedAt?: Date | string | null
  reassignmentReason?: string | null
  reassignmentPreviousOwner?: string | null
  reassignmentRequester?: {
    clerkId: string
    name: string | null
    email: string | null
  } | null
  previousOwner?: {
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

interface UserProfile {
  id: string
  clerkId: string
  name: string | null
  email: string | null
  role?: string
}

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Negocio', sortable: true },
  { key: 'contact', label: 'Contacto' },
  { key: 'type', label: 'Tipo', sortable: true, width: 'w-24' },
  { key: 'requestedBy', label: 'Solicitado por' },
  { key: 'previousOwner', label: 'Dueño Anterior' },
  { key: 'requestedAt', label: 'Fecha', sortable: true },
  { key: 'reason', label: 'Razón' },
  { key: 'actions', label: 'Acciones', width: 'w-32' },
]

interface AssignmentsPageClientProps {
  initialAssignments?: AssignmentBusiness[]
  initialTotal?: number
  initialCounts?: Record<string, number>
  users?: UserProfile[]
}

function isArchivedAssignment(business: AssignmentBusiness): boolean {
  return business.reassignmentStatus === 'archived'
}

export default function AssignmentsPageClient({
  initialAssignments = [],
  initialTotal = 0,
  initialCounts,
  users = [],
}: AssignmentsPageClientProps) {
  const [isPending, startTransition] = useTransition()
  
  // Advanced filters hook
  const { headerProps: advancedFilterProps, filterRules, applyFiltersToData } = useAdvancedFilters<Record<string, unknown>>('businesses')
  
  // Data state
  const [assignments, setAssignments] = useState<AssignmentBusiness[]>(
    initialAssignments.filter((assignment) => !isArchivedAssignment(assignment))
  )
  const [total, setTotal] = useState(initialTotal)
  const [counts, setCounts] = useState(initialCounts || { all: 0, reasignar: 0, sacar: 0, recurrente: 0 })
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AssignmentBusiness[] | null>(null)
  
  // Filters and pagination
  const [typeFilter, setTypeFilter] = useState<'all' | 'reasignar' | 'sacar' | 'recurrente'>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [sortColumn, setSortColumn] = useState<string | null>('reassignmentRequestedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<AssignmentBusiness | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAssignBusiness, setSelectedAssignBusiness] = useState<AssignmentBusiness | null>(null)
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('')
  
  const confirmDialog = useConfirmDialog()

  // Load page
  const loadPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const [assignmentsResult, countsResult] = await Promise.all([
        getAssignmentsPaginated({ 
          page, 
          pageSize: 50, 
          sortBy: sortColumn || 'reassignmentRequestedAt',
          sortDirection,
          typeFilter: typeFilter === 'all' ? undefined : typeFilter,
        }),
        getAssignmentsCounts(),
      ])
      
      if (assignmentsResult.success && assignmentsResult.data) {
        setAssignments(
          (assignmentsResult.data as AssignmentBusiness[])
            .filter((assignment) => !isArchivedAssignment(assignment))
        )
        setTotal('total' in assignmentsResult ? (assignmentsResult.total || 0) : 0)
      }
      if (countsResult.success && countsResult.data) {
        setCounts(countsResult.data)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Failed to load assignments:', error)
    } finally {
      setLoading(false)
    }
  }, [sortColumn, sortDirection, typeFilter])

  // Search handler
  const handleSearchChange = useCallback(async (query: string) => {
    setSearchQuery(query)
    
    if (!query || query.length < 2) {
      setSearchResults(null)
      return
    }
    
    setSearchLoading(true)
    try {
      const result = await searchAssignments(query)
      if (result.success && result.data) {
        setSearchResults(
          (result.data as AssignmentBusiness[])
            .filter((assignment) => !isArchivedAssignment(assignment))
        )
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Sort handler
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }, [sortColumn])

  // Reload when filters change
  useEffect(() => {
    if (!searchQuery) {
      loadPage(0)
    }
  }, [typeFilter, loadPage, searchQuery])

  // Get sort value for column
  const getSortValue = useCallback((business: AssignmentBusiness, column: string): string | number => {
    switch (column) {
      case 'name':
        return business.name.toLowerCase()
      case 'type':
        return business.reassignmentType || ''
      case 'reassignmentRequestedAt':
      case 'requestedAt':
        return business.reassignmentRequestedAt 
          ? new Date(business.reassignmentRequestedAt).getTime() 
          : 0
      default:
        return ''
    }
  }, [])

  // Filter and sort data
  const isSearching = !!searchQuery && searchQuery.length >= 2
  const displayAssignments = isSearching ? (searchResults || []) : assignments

  const filteredAssignments = useMemo(() => {
    let filtered = displayAssignments

    // Apply type filter on search results (since search doesn't filter by type)
    if (isSearching && typeFilter !== 'all') {
      filtered = filtered.filter(a => a.reassignmentType === typeFilter)
    }
    
    // Apply advanced filters
    filtered = applyFiltersToData(filtered as unknown as Record<string, unknown>[]) as unknown as AssignmentBusiness[]

    // Client-side sort for search results
    if (isSearching && sortColumn) {
      return sortEntities(filtered, sortColumn, sortDirection, getSortValue)
    }

    return filtered
  }, [displayAssignments, typeFilter, isSearching, sortColumn, sortDirection, getSortValue, applyFiltersToData, filterRules])

  // Handle assign to new owner
  const handleAssign = (business: AssignmentBusiness) => {
    setSelectedAssignBusiness(business)
    setSelectedNewOwner('')
    setAssignModalOpen(true)
  }

  const confirmAssign = async () => {
    if (!selectedAssignBusiness || !selectedNewOwner) return

    startTransition(async () => {
      const result = await assignToNewOwner(selectedAssignBusiness.id, selectedNewOwner)
      
      if (result.success) {
        toast.success(`${selectedAssignBusiness.name} asignado correctamente`)
        setAssignModalOpen(false)
        setSelectedAssignBusiness(null)
        setSelectedNewOwner('')
        loadPage(currentPage)
      } else {
        toast.error(result.error || 'Error al asignar')
      }
    })
  }

  // Handle cancel reassignment
  const handleCancelReassignment = async (business: AssignmentBusiness) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Cancelar Solicitud',
      message: `¿Estás seguro de que deseas cancelar la solicitud de reasignación para "${business.name}"? El negocio volverá a su dueño original.`,
      confirmText: 'Sí, Cancelar',
      cancelText: 'No',
      confirmVariant: 'danger',
    })
    
    if (confirmed) {
      startTransition(async () => {
        const result = await cancelReassignment(business.id)
        
        if (result.success) {
          toast.success(`Solicitud cancelada para ${business.name}`)
          loadPage(currentPage)
        } else {
          toast.error(result.error || 'Error al cancelar')
        }
      })
    }
  }

  // View business details
  const handleViewBusiness = (business: AssignmentBusiness) => {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
  }

  // Filter tabs
  const filterTabs: FilterTab[] = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'reasignar', label: 'Reasignar', count: counts.reasignar },
    { id: 'sacar', label: 'Sacar', count: counts.sacar },
    { id: 'recurrente', label: 'Recurrente', count: counts.recurrente },
  ]

  // Filter sales users only
  const salesUsers = useMemo(() => 
    users.filter(u => u.role === 'sales' || u.role === 'admin'),
    [users]
  )

  const isLoading = loading || searchLoading

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <EntityPageHeader
        entityType="businesses"
        searchPlaceholder="Buscar en solicitudes de asignación..."
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterTabs={filterTabs}
        activeFilter={typeFilter}
        onFilterChange={(id) => setTypeFilter(id as 'all' | 'reasignar' | 'sacar' | 'recurrente')}
        isAdmin={true}
        {...advancedFilterProps}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-6 text-sm text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            {searchLoading ? 'Buscando...' : 'Cargando...'}
          </div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No hay solicitudes pendientes"
            description={
              searchQuery || typeFilter !== 'all' || filterRules.length > 0
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Las solicitudes de reasignación aparecerán aquí'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            {isSearching && (
              <div className="mb-2 px-2 py-1 text-xs text-gray-500 bg-blue-50 rounded inline-block">
                Mostrando {filteredAssignments.length} resultado(s) de búsqueda
              </div>
            )}
            
            <EntityTable
              columns={COLUMNS}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              {filteredAssignments.map((assignment, index) => (
                <TableRow
                  key={assignment.id}
                  index={index}
                  onClick={() => handleViewBusiness(assignment)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-[13px]">
                        {assignment.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    <div>
                      {assignment.contactName || <span className="text-gray-400">-</span>}
                      {assignment.contactEmail && (
                        <div className="text-xs text-gray-400">{assignment.contactEmail}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {assignment.reassignmentType === 'reasignar' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        <SwapHorizIcon style={{ fontSize: 14 }} />
                        Reasignar
                      </span>
                    ) : assignment.reassignmentType === 'recurrente' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        <RepeatIcon style={{ fontSize: 14 }} />
                        Recurrente
                        {assignment.reassignmentRequestedBy === 'system-cron' && (
                          <span className="ml-1 px-1 py-0.5 bg-purple-200 text-purple-800 rounded text-[10px]">Auto</span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        <PersonRemoveIcon style={{ fontSize: 14 }} />
                        Sacar
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {assignment.reassignmentRequestedBy === 'system-cron' 
                      ? <span className="text-purple-600 font-medium">Sistema (Auto)</span>
                      : (assignment.reassignmentRequester?.name || assignment.reassignmentRequestedBy || '-')
                    }
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-600">
                    {assignment.previousOwner?.name || assignment.reassignmentPreviousOwner || '-'}
                  </TableCell>
                  <TableCell className="text-[13px] text-gray-500">
                    {assignment.reassignmentRequestedAt 
                      ? formatRelativeTime(new Date(assignment.reassignmentRequestedAt))
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {assignment.reassignmentReason ? (
                      <span 
                        className="text-xs text-gray-600 truncate block cursor-help"
                        title={assignment.reassignmentReason}
                      >
                        {assignment.reassignmentReason}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleAssign(assignment)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="Asignar a nuevo dueño"
                        disabled={isPending}
                      >
                        <CheckIcon style={{ fontSize: 18 }} />
                      </button>
                      <button
                        onClick={() => handleCancelReassignment(assignment)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Cancelar solicitud"
                        disabled={isPending}
                      >
                        <CloseIcon style={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </EntityTable>
            
            {/* Pagination */}
            {!isSearching && total > 50 && (
              <div className="mt-4 flex items-center justify-between px-2">
                <div className="text-sm text-gray-500">
                  Mostrando {Math.min((currentPage + 1) * 50, total)} de {total} solicitudes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadPage(currentPage - 1)}
                    disabled={currentPage === 0 || loading}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => loadPage(currentPage + 1)}
                    disabled={(currentPage + 1) * 50 >= total || loading}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Business Modal (view only) */}
      {businessModalOpen && selectedBusiness && (
        <BusinessFormModal
          isOpen={businessModalOpen}
          onClose={() => {
            setBusinessModalOpen(false)
            setSelectedBusiness(null)
          }}
          business={selectedBusiness as unknown as Business}
          onSuccess={() => {
            setBusinessModalOpen(false)
            setSelectedBusiness(null)
            loadPage(currentPage)
          }}
          onDelete={(deletedBusinessId) => {
            setBusinessModalOpen(false)
            setSelectedBusiness(null)
            setAssignments(prev => prev.filter(b => b.id !== deletedBusinessId))
            setSearchResults(prev => prev?.filter(b => b.id !== deletedBusinessId) || null)
            loadPage(currentPage)
          }}
        />
      )}

      {/* Assign Modal */}
      {assignModalOpen && selectedAssignBusiness && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setAssignModalOpen(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <PersonIcon />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Asignar Nuevo Dueño</h3>
                  <p className="text-sm text-gray-500 truncate max-w-[280px]">{selectedAssignBusiness.name}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Info about request */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <InfoOutlinedIcon style={{ fontSize: 18 }} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Solicitado por: {selectedAssignBusiness.reassignmentRequester?.name || 'Desconocido'}
                    </p>
                    {selectedAssignBusiness.reassignmentReason && (
                      <p className="text-gray-500 mt-1">
                        Razón: {selectedAssignBusiness.reassignmentReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar nuevo dueño <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedNewOwner}
                onChange={(e) => setSelectedNewOwner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Seleccionar...</option>
                {salesUsers.map((user) => (
                  <option key={user.clerkId} value={user.clerkId}>
                    {user.name || user.email} {user.role === 'admin' ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setAssignModalOpen(false)
                  setSelectedAssignBusiness(null)
                  setSelectedNewOwner('')
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmAssign}
                disabled={isPending || !selectedNewOwner}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {isPending ? 'Asignando...' : 'Asignar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}
