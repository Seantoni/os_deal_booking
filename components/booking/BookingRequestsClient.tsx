'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import { deleteBookingRequest, resendBookingRequest, bulkDeleteBookingRequests, bulkUpdateBookingRequestStatus, refreshBookingRequests, cancelBookingRequest } from '@/app/actions/booking'
import type { BookingRequest } from '@/types'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SendIcon from '@mui/icons-material/Send'
import BlockIcon from '@mui/icons-material/Block'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import { formatDateShort } from '@/lib/date'
import NewRequestModal from './NewRequestModal'
import ResendRequestModal from './ResendRequestModal'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@clerk/nextjs'
import { Button, Input } from '@/components/ui'
import { FilterTabs } from '@/components/shared'
import { TableRow, TableCell } from '@/components/shared/table'

// Lazy load heavy modal component
const BookingRequestViewModal = dynamic(() => import('@/components/booking/request-view/BookingRequestViewModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

interface BookingRequestsClientProps {
  bookingRequests: BookingRequest[]
}

export default function BookingRequestsClient({ bookingRequests: initialBookingRequests }: BookingRequestsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { role: userRole } = useUserRole()
  const { user } = useUser()
  const currentUserId = user?.id || null
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>(initialBookingRequests)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'approved' | 'booked' | 'rejected' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [viewRequestId, setViewRequestId] = useState<string | null>(null)
  const [resendRequest, setResendRequest] = useState<{ id: string; email: string; name: string } | null>(null)
  const confirmDialog = useConfirmDialog()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  
  const isAdmin = userRole === 'admin'

  // Refresh booking requests data without full page refresh
  // This avoids Clerk API calls on booking request updates
  const refreshData = useCallback(async () => {
    const result = await refreshBookingRequests()
    if (result.success && result.data) {
      setBookingRequests(result.data as BookingRequest[])
    }
  }, [])

  // Read search query from URL params on mount
  useEffect(() => {
    // Read from both searchParams and window.location to ensure we catch it
    const searchParam = searchParams.get('search') || new URLSearchParams(window.location.search).get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
      // Clean up URL after reading
      const currentParams = new URLSearchParams(window.location.search)
      currentParams.delete('search')
      const newUrl = currentParams.toString() 
        ? `${window.location.pathname}?${currentParams.toString()}`
        : window.location.pathname
      router.replace(newUrl, { scroll: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Update local state when props change
  useEffect(() => {
    setBookingRequests(initialBookingRequests)
  }, [initialBookingRequests])

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Booking Request',
      message: 'Are you sure you want to delete this booking request? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update: remove from UI immediately
    const deletedRequest = bookingRequests.find(r => r.id === id)
    setBookingRequests(prev => prev.filter(r => r.id !== id))
    setDeletingId(id)
    
    // Delete in background
    const result = await deleteBookingRequest(id)
    
    if (!result.success) {
      // Rollback on error
      if (deletedRequest) {
        setBookingRequests(prev => [...prev, deletedRequest].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
      }
      toast.error(result.error || 'Failed to delete request')
    } else {
      toast.success('Booking request deleted successfully')
    }
    
    setDeletingId(null)
    // Refresh data in background (fetches only booking requests, NOT user data)
    refreshData()
  }

  const handleCancel = async (request: BookingRequest) => {
    // Check if user can cancel: must be creator or admin
    const isCreator = request.userId === currentUserId
    if (!isCreator && !isAdmin) {
      toast.error('No tienes permiso para cancelar esta solicitud')
      return
    }

    // Check if request can be cancelled (only draft or pending)
    if (request.status !== 'draft' && request.status !== 'pending') {
      toast.error('Solo se pueden cancelar solicitudes en estado borrador o pendiente')
      return
    }

    const confirmed = await confirmDialog.confirm({
      title: 'Cancelar Solicitud',
      message: `¿Estás seguro de que deseas cancelar la solicitud "${request.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Cancelar Solicitud',
      cancelText: 'Volver',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setCancellingId(request.id)
    
    const result = await cancelBookingRequest(request.id)
    
    if (result.success) {
      // Update local state
      setBookingRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'cancelled' as const } : r
      ))
      toast.success('Solicitud cancelada exitosamente')
    } else {
      toast.error(result.error || 'Error al cancelar la solicitud')
    }
    
    setCancellingId(null)
    refreshData()
  }

  const handleResendWithEmail = async (emails: string[]) => {
    if (!resendRequest) return

    setResendingId(resendRequest.id)
    
    const result = await resendBookingRequest(resendRequest.id, emails)
    
    if (result.success) {
      const sentCount = (result as any).sentCount || 1
      const totalCount = (result as any).totalCount || 1
      toast.success(
        totalCount > 1 
          ? `Email enviado a ${sentCount} de ${totalCount} destinatarios` 
          : 'Email reenviado exitosamente!'
      )
      // Update local state if primary email changed
      if (emails[0] !== resendRequest.email) {
        setBookingRequests(prev => 
          prev.map(r => r.id === resendRequest.id ? { ...r, businessEmail: emails[0] } : r)
        )
      }
      // Refresh data in background (fetches only booking requests, NOT user data)
      refreshData()
    } else {
      const errorMessage = (result as any).error || 'Error al reenviar email'
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
    
    setResendingId(null)
  }

  const openResendModal = (request: { id: string; businessEmail: string; name: string }) => {
    setResendRequest({
      id: request.id,
      email: request.businessEmail,
      name: request.name,
    })
  }

  const getStatusBadge = (status: string, daysSinceSent: number | null = null) => {
    // For pending status, color code based on days since sent
    if (status === 'pending' && daysSinceSent !== null) {
      let pendingColor = ''
      if (daysSinceSent <= 2) {
        pendingColor = 'bg-green-50 text-green-700'
      } else if (daysSinceSent > 2 && daysSinceSent <= 5) {
        pendingColor = 'bg-orange-50 text-orange-700'
      } else {
        pendingColor = 'bg-red-50 text-red-700'
      }
      
      return (
        <span className={`px-2 py-0.5 rounded text-[13px] font-medium ${pendingColor}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      )
    }

    // Default colors for other statuses
    const statusColors = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-50 text-yellow-700', // Fallback if daysSinceSent is null
      approved: 'bg-blue-50 text-blue-700',
      booked: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-700',
      cancelled: 'bg-orange-50 text-orange-700',
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[13px] font-medium ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Calculate days since a date
  const daysSince = (date: Date | null): number | null => {
    if (!date) return null
    const now = new Date()
    const diffTime = now.getTime() - new Date(date).getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  // Get the date when request was sent (status changed to pending)
  // Since we don't have a "sentAt" field, we'll use createdAt for pending/approved/booked/rejected
  // and null for drafts (not sent yet)
  const getSentDate = (request: BookingRequest): Date | null => {
    if (request.status === 'draft') return null
    // For non-draft statuses, assume it was sent when created
    // In a real scenario, you'd want a "sentAt" timestamp
    return request.createdAt
  }

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '—'
    return formatDateShort(date)
  }

  // Format date for Dates column: "Dec 15, 25"
  const formatDateShortYear = (date: Date | null): string => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', {
      timeZone: PANAMA_TIMEZONE,
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    })
  }

  // Calculate status counts
  const statusCounts = useMemo(() => ({
    all: bookingRequests.length,
    draft: bookingRequests.filter(r => r.status === 'draft').length,
    pending: bookingRequests.filter(r => r.status === 'pending').length,
    approved: bookingRequests.filter(r => r.status === 'approved').length,
    booked: bookingRequests.filter(r => r.status === 'booked').length,
    rejected: bookingRequests.filter(r => r.status === 'rejected').length,
    cancelled: bookingRequests.filter(r => r.status === 'cancelled').length,
  }), [bookingRequests])

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Sort function
  const sortRequests = (requests: BookingRequest[]) => {
    if (!sortColumn) return requests

    return [...requests].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'merchant':
          aValue = (a.merchant || '').toLowerCase()
          bValue = (b.merchant || '').toLowerCase()
          break
        case 'email':
          aValue = a.businessEmail.toLowerCase()
          bValue = b.businessEmail.toLowerCase()
          break
        case 'startDate':
          aValue = new Date(a.startDate).getTime()
          bValue = new Date(b.startDate).getTime()
          break
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'days':
          const aDays = daysSince(a.createdAt) ?? 0
          const bDays = daysSince(b.createdAt) ?? 0
          aValue = aDays
          bValue = bDays
          break
        case 'sent':
          const aSent = getSentDate(a)
          const bSent = getSentDate(b)
          aValue = aSent ? new Date(aSent).getTime() : 0
          bValue = bSent ? new Date(bSent).getTime() : 0
          break
        case 'processed':
          aValue = a.processedAt ? new Date(a.processedAt).getTime() : 0
          bValue = b.processedAt ? new Date(b.processedAt).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Filter requests by status and search query
  const filteredRequests = useMemo(() => {
    const filtered = bookingRequests.filter(request => {
      // Status filter
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          request.name.toLowerCase().includes(query) ||
          (request.merchant && request.merchant.toLowerCase().includes(query)) ||
          request.businessEmail.toLowerCase().includes(query) ||
          (request.parentCategory && request.parentCategory.toLowerCase().includes(query))
        )
      }
      
      return true
    })

    return sortRequests(filtered)
  }, [bookingRequests, statusFilter, searchQuery, sortColumn, sortDirection])

  // Paginated requests for display
  const visibleRequests = useMemo(() => {
    return filteredRequests.slice(0, visibleCount)
  }, [filteredRequests, visibleCount])

  // Bulk selection handlers
  const allFilteredSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.has(r.id))
  const someFilteredSelected = filteredRequests.some(r => selectedIds.has(r.id))

  const handleSelectAll = () => {
    if (!isAdmin) return
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    if (!isAdmin) return
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const confirmed = await confirmDialog.confirm({
      title: 'Delete Selected Requests',
      message: `Are you sure you want to delete ${selectedIds.size} booking request${selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setBulkActionLoading(true)
    const idsArray = Array.from(selectedIds)
    
    // Optimistic update
    setBookingRequests(prev => prev.filter(r => !selectedIds.has(r.id)))
    setSelectedIds(new Set())

    const result = await bulkDeleteBookingRequests(idsArray)
    
    if (result.success && 'deletedCount' in result) {
      toast.success(`Successfully deleted ${result.deletedCount || idsArray.length} request${idsArray.length > 1 ? 's' : ''}`)
      // Refresh data in background (fetches only booking requests, NOT user data)
      refreshData()
    } else {
      toast.error('error' in result ? (result.error || 'Failed to delete requests') : 'Failed to delete requests')
      // Refresh data in background to restore correct state
      refreshData()
    }
    
    setBulkActionLoading(false)
  }

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.size === 0) return

    const confirmed = await confirmDialog.confirm({
      title: `Update Status to ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Are you sure you want to update ${selectedIds.size} booking request${selectedIds.size > 1 ? 's' : ''} to "${status}"?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      confirmVariant: 'primary',
    })

    if (!confirmed) return

    setBulkActionLoading(true)
    const idsArray = Array.from(selectedIds)
    
    // Optimistic update
    setBookingRequests(prev => 
      prev.map(r => selectedIds.has(r.id) ? { ...r, status: status as any } : r)
    )
    setSelectedIds(new Set())

    const result = await bulkUpdateBookingRequestStatus(idsArray, status as any)
    
    if (result.success && 'updatedCount' in result) {
      toast.success(`Successfully updated ${result.updatedCount || idsArray.length} request${idsArray.length > 1 ? 's' : ''}`)
      // Refresh data in background (fetches only booking requests, NOT user data)
      refreshData()
    } else {
      toast.error('error' in result ? (result.error || 'Failed to update requests') : 'Failed to update requests')
      // Refresh data in background to restore correct state
      refreshData()
    }
    
    setBulkActionLoading(false)
  }

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter, searchQuery])

  // Clear selection when user is not admin
  useEffect(() => {
    if (!isAdmin) {
      setSelectedIds(new Set())
    }
  }, [isAdmin])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              size="sm"
              leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>

            {/* New Request Button */}
            <Button
              onClick={() => setShowNewRequestModal(true)}
              size="sm"
              leftIcon={<AddIcon fontSize="small" />}
            >
              New Request
            </Button>
          </div>

          {/* Status Tabs */}
          <FilterTabs
            items={[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'draft', label: 'Draft', count: statusCounts.draft },
              { id: 'pending', label: 'Pending', count: statusCounts.pending },
              { id: 'approved', label: 'Approved', count: statusCounts.approved },
              { id: 'booked', label: 'Booked', count: statusCounts.booked },
              { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
              { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
            ]}
            activeId={statusFilter}
            onChange={(id) => setStatusFilter(id as any)}
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} request{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelectedIds(new Set())}
                variant="secondary"
                size="sm"
                disabled={bulkActionLoading}
              >
                Clear
              </Button>
              {isAdmin && (
                <Button
                  onClick={handleBulkDelete}
                  variant="destructive"
                  size="sm"
                  loading={bulkActionLoading}
                >
                  Delete
                </Button>
              )}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value)
                    e.target.value = ''
                  }
                }}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                defaultValue=""
              >
                <option value="">Change Status...</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="booked">Booked</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <FilterListIcon className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">No requests found</p>
              <p className="text-xs mt-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by creating a new request'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 font-medium text-gray-500">
                  <tr>
                    {isAdmin && (
                      <th className="px-4 py-[5px] w-12">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                          title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                        >
                          {allFilteredSelected ? (
                            <CheckBoxIcon className="w-4 h-4 text-blue-600" />
                          ) : someFilteredSelected ? (
                            <div className="w-4 h-4 border-2 border-blue-600 bg-blue-100 rounded" />
                          ) : (
                            <CheckBoxOutlineBlankIcon className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        {sortColumn === 'status' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span>Source</span>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Name</span>
                        {sortColumn === 'name' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Email</span>
                        {sortColumn === 'email' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('startDate')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Dates</span>
                        {sortColumn === 'startDate' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Created</span>
                        {sortColumn === 'createdAt' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('days')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Days</span>
                        {sortColumn === 'days' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('sent')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Sent</span>
                        {sortColumn === 'sent' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('processed')}
                    >
                      <div className="flex items-center gap-1">
                        <span>Processed</span>
                        {sortColumn === 'processed' && (
                          sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-medium">Rejection Reason</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {visibleRequests.map((request, index) => {
                  const sentDate = getSentDate(request)
                  const daysSinceCreated = daysSince(request.createdAt)
                  const daysSinceSent = sentDate ? daysSince(sentDate) : null
                  const daysSinceProcessed = request.processedAt ? daysSince(request.processedAt) : null
                  
                  // Determine row background color for pending requests or alternating stripes
                  // Even rows: white
                  // Odd rows: light blue/slate for better contrast
                  // Logic moved to TableRow component, but we handle pending override here
                  let rowBgColor = ''
                  
                  // Pending status gets priority coloring
                  if (request.status === 'pending' && daysSinceSent !== null) {
                    if (daysSinceSent <= 2) {
                      rowBgColor = 'bg-green-50/30 hover:bg-green-50/50'
                    } else if (daysSinceSent > 2 && daysSinceSent <= 5) {
                      rowBgColor = 'bg-orange-50/30 hover:bg-orange-50/50'
                    } else {
                      rowBgColor = 'bg-red-50/30 hover:bg-red-50/50'
                    }
                  }
                  
                  return (
                    <TableRow
                      key={request.id}
                      index={index}
                      className={rowBgColor}
                    >
                      {isAdmin && (
                        <TableCell>
                          <button
                            onClick={() => handleSelectOne(request.id)}
                            className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                            title={selectedIds.has(request.id) ? 'Deselect' : 'Select'}
                          >
                            {selectedIds.has(request.id) ? (
                              <CheckBoxIcon className="w-4 h-4 text-blue-600" />
                            ) : (
                              <CheckBoxOutlineBlankIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </TableCell>
                      )}
                      <TableCell>
                        {getStatusBadge(request.status, request.status === 'pending' ? daysSinceSent : null)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[13px] font-medium ${
                          request.sourceType === 'public_link' 
                            ? 'bg-purple-50 text-purple-700' 
                            : 'bg-gray-50 text-gray-700'
                        }`}>
                          {request.sourceType === 'public_link' ? 'Public Link' : 'Internal'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 truncate block text-[13px]">{request.name}</span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="truncate block max-w-[180px] text-[13px]">{request.businessEmail}</span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="whitespace-nowrap text-[13px]">
                          {formatDateShortYear(request.startDate)} - {formatDateShortYear(request.endDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="whitespace-nowrap text-[13px]">{formatDate(request.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 text-[13px]">
                          {daysSinceCreated !== null ? `${daysSinceCreated}` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="whitespace-nowrap text-[13px]">{formatDate(sentDate)}</span>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <span className="whitespace-nowrap text-[13px]">{formatDate(request.processedAt)}</span>
                      </TableCell>
                      <TableCell>
                        {request.status === 'rejected' && request.rejectionReason ? (
                          <div className="max-w-[200px]">
                            <p className="text-[13px] text-red-700 line-clamp-2" title={request.rejectionReason}>
                              {request.rejectionReason}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[13px]">—</span>
                        )}
                      </TableCell>
                      <TableCell align="right" className="relative">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              setViewRequestId(request.id)
                            }}
                            variant="ghost"
                            size="sm"
                            className="p-1.5"
                            title="View request"
                          >
                            <VisibilityIcon fontSize="small" />
                          </Button>
                          {/* Cancel button - visible to creator or admin, only for draft/pending */}
                          {(request.status === 'draft' || request.status === 'pending') && 
                           (request.userId === currentUserId || isAdmin) && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancel(request)
                              }}
                              variant="ghost"
                              size="sm"
                              className="p-1.5 hover:text-orange-600 hover:bg-orange-50"
                              loading={cancellingId === request.id}
                              title="Cancelar solicitud"
                            >
                              <BlockIcon fontSize="small" />
                            </Button>
                          )}
                    {request.status === 'draft' && (
                      <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/booking-requests/edit/${request.id}`)
                              }}
                              variant="ghost"
                              size="sm"
                              className="p-1.5"
                        title="Edit request"
                      >
                        <EditIcon fontSize="small" />
                      </Button>
                    )}
                          {(request.status === 'draft' || request.status === 'pending') && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                openResendModal(request)
                              }}
                              variant="ghost"
                              size="sm"
                              className="p-1.5 hover:text-green-600 hover:bg-green-50"
                              loading={resendingId === request.id}
                              title="Resend email"
                            >
                              <SendIcon fontSize="small" />
                            </Button>
                          )}
                    {isAdmin && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(request.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="p-1.5 hover:text-red-600 hover:bg-red-50"
                        loading={deletingId === request.id}
                        title="Delete request"
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    )}
                  </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                </tbody>
              </table>
              </div>
              {visibleCount < filteredRequests.length && (
                <div className="p-4 border-t border-gray-100 text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + 50)}
                  >
                    Load More
                  </Button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
      />

      {/* Resend Request Modal */}
      <ResendRequestModal
        isOpen={!!resendRequest}
        onClose={() => setResendRequest(null)}
        onResend={handleResendWithEmail}
        currentEmail={resendRequest?.email || ''}
        requestName={resendRequest?.name || ''}
      />

      {/* View Request Modal */}
      <BookingRequestViewModal
        isOpen={!!viewRequestId}
        onClose={() => setViewRequestId(null)}
        requestId={viewRequestId}
      />

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

