'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteBookingRequest } from '@/app/actions/booking-requests'
import HamburgerMenu from './HamburgerMenu'
import type { BookingRequest } from '@/types'

interface BookingRequestsClientProps {
  bookingRequests: BookingRequest[]
}

export default function BookingRequestsClient({ bookingRequests }: BookingRequestsClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'approved' | 'booked' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking request?')) {
      return
    }

    setDeletingId(id)
    const result = await deleteBookingRequest(id)
    
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error || 'Failed to delete request')
    }
    setDeletingId(null)
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800 border border-gray-300',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border border-blue-300',
      booked: 'bg-green-100 text-green-800 border border-green-300',
      rejected: 'bg-red-100 text-red-800 border border-red-300',
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      timeZone: 'America/Panama', // Panama EST (UTC-5)
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Calculate status counts for dashboard
  const statusCounts = {
    all: bookingRequests.length,
    draft: bookingRequests.filter(r => r.status === 'draft').length,
    pending: bookingRequests.filter(r => r.status === 'pending').length,
    approved: bookingRequests.filter(r => r.status === 'approved').length,
    booked: bookingRequests.filter(r => r.status === 'booked').length,
    rejected: bookingRequests.filter(r => r.status === 'rejected').length,
  }

  // Filter requests by status and search query
  const filteredRequests = bookingRequests.filter(request => {
    // Status filter
    if (statusFilter !== 'all') {
      if (request.status !== statusFilter) {
        return false
      }
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        request.name.toLowerCase().includes(query) ||
        (request.description && request.description.toLowerCase().includes(query)) ||
        (request.merchant && request.merchant.toLowerCase().includes(query)) ||
        request.businessEmail.toLowerCase().includes(query) ||
        (request.parentCategory && request.parentCategory.toLowerCase().includes(query)) ||
        (request.subCategory1 && request.subCategory1.toLowerCase().includes(query)) ||
        (request.subCategory2 && request.subCategory2.toLowerCase().includes(query))
      )
    }
    
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <HamburgerMenu />
      
      <div className="max-w-7xl mx-auto py-6 px-4 ml-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Booking Requests</h1>
            <p className="text-sm text-gray-600">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== 'all' && ` • ${statusFilter}`}
            </p>
          </div>
          <button
            onClick={() => router.push('/booking-requests/new')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-semibold shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Request
          </button>
        </div>

        {/* Status Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'all'
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">All</div>
            <div className={`text-2xl font-bold ${statusFilter === 'all' ? 'text-blue-700' : 'text-gray-900'}`}>
              {statusCounts.all}
            </div>
          </button>
          
          <button
            onClick={() => setStatusFilter('draft')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'draft'
                ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">Draft</div>
            <div className={`text-2xl font-bold ${statusFilter === 'draft' ? 'text-gray-700' : 'text-gray-900'}`}>
              {statusCounts.draft}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'pending'
                ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">Pending</div>
            <div className={`text-2xl font-bold ${statusFilter === 'pending' ? 'text-yellow-700' : 'text-gray-900'}`}>
              {statusCounts.pending}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'approved'
                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">Approved</div>
            <div className={`text-2xl font-bold ${statusFilter === 'approved' ? 'text-blue-700' : 'text-gray-900'}`}>
              {statusCounts.approved}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('booked')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'booked'
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">Booked</div>
            <div className={`text-2xl font-bold ${statusFilter === 'booked' ? 'text-green-700' : 'text-gray-900'}`}>
              {statusCounts.booked}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              statusFilter === 'rejected'
                ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400 shadow-md'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="text-xs font-semibold text-gray-600 mb-1">Rejected</div>
            <div className={`text-2xl font-bold ${statusFilter === 'rejected' ? 'text-red-700' : 'text-gray-900'}`}>
              {statusCounts.rejected}
            </div>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4 relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, merchant, email, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-10 text-center">
            <svg
              className="mx-auto h-10 w-10 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No booking requests yet</h3>
            <p className="text-sm text-gray-500 mb-4">Get started by creating your first booking request.</p>
            <button
              onClick={() => router.push('/booking-requests/new')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Request
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-md shadow-sm border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all group flex items-center gap-4"
              >
                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {getStatusBadge(request.status)}
                </div>

                {/* Main Content - Name and Key Info */}
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{request.name}</h3>
                      {request.merchant && (
                        <span className="text-xs text-gray-500">• {request.merchant}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{formatDate(request.startDate)} → {formatDate(request.endDate)}</span>
                      {request.parentCategory && (
                        <span className="text-gray-400">•</span>
                      )}
                      {request.parentCategory && (
                        <span className="truncate max-w-xs">
                          {request.parentCategory}
                          {request.subCategory1 && ` > ${request.subCategory1}`}
                          {request.subCategory2 && ` > ${request.subCategory2}`}
                        </span>
                      )}
                    </div>
                    {/* Show processed info for approved/rejected/booked requests */}
                    {request.processedAt && request.processedBy && (request.status === 'approved' || request.status === 'rejected' || request.status === 'booked') && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="text-gray-400">
                          {request.status === 'approved' ? '✓ Approved' : request.status === 'rejected' ? '✗ Rejected' : '✓ Booked'}
                        </span>
                        <span>by {request.processedBy}</span>
                        <span className="text-gray-400">•</span>
                        <span>{new Date(request.processedAt).toLocaleDateString('en-US', { timeZone: 'America/Panama', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {/* Show rejection reason if rejected */}
                    {request.status === 'rejected' && request.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <span className="font-semibold text-red-900">Reason:</span>
                        <span className="text-red-800 ml-1">{request.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="text-xs text-blue-600 font-medium truncate max-w-[200px] hidden md:block">
                    {request.businessEmail}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {request.status === 'draft' && (
                    <button
                      onClick={() => router.push(`/booking-requests/edit/${request.id}`)}
                      className="px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-medium opacity-0 group-hover:opacity-100"
                      title="Edit request"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(request.id)}
                    disabled={deletingId === request.id}
                    className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 transition-all font-medium opacity-0 group-hover:opacity-100"
                    title="Delete request"
                  >
                    {deletingId === request.id ? '...' : 'Del'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

