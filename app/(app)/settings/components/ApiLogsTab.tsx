'use client'

import { useState, useEffect } from 'react'
import { formatCompactDateTime } from '@/lib/date'
import { Button } from '@/components/ui'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import DescriptionIcon from '@mui/icons-material/Description'

interface ApiLog {
  id: string
  endpoint: string
  method: string
  statusCode: number | null
  success: boolean
  errorMessage: string | null
  externalId: number | null
  bookingRequestId: string | null
  triggeredBy: string | null
  durationMs: number | null
  createdAt: Date | string
  bookingRequest?: {
    id: string
    name: string
    businessEmail: string | null
  } | null
}

interface ApiLogsResponse {
  success: boolean
  data?: {
    logs: ApiLog[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    stats: {
      total: number
      successful: number
      failed: number
      successRate: string
    }
  }
  error?: string
}

export default function ApiLogsTab() {
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<{ total: number; successful: number; failed: number; successRate: string } | null>(null)
  const pageSize = 20

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/external-oferta/logs?page=${page}&limit=${pageSize}`)
      const data: ApiLogsResponse = await response.json()
      
      if (data.success && data.data) {
        setLogs(data.data.logs)
        setTotalPages(data.data.pagination.totalPages)
        setTotal(data.data.pagination.total)
        setStats(data.data.stats)
      }
    } catch (error) {
      console.error('Failed to load API logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page])

  const getStatusBadge = (log: ApiLog) => {
    if (log.success) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
          <CheckCircleIcon style={{ fontSize: 12 }} />
          Success
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
        <ErrorIcon style={{ fontSize: 12 }} />
        Failed
      </span>
    )
  }

  const getStatusCodeColor = (statusCode: number | null) => {
    if (!statusCode) return 'text-gray-400'
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600'
    if (statusCode >= 400 && statusCode < 500) return 'text-orange-600'
    if (statusCode >= 500) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">Total Requests</div>
            <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">Successful</div>
            <div className="text-lg font-semibold text-green-600">{stats.successful}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">Failed</div>
            <div className="text-lg font-semibold text-red-600">{stats.failed}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500 mb-1">Success Rate</div>
            <div className="text-lg font-semibold text-blue-600">{stats.successRate}</div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with refresh */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">API Request Logs</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPage(1)
              loadLogs()
            }}
            disabled={loading}
            leftIcon={<RefreshIcon style={{ fontSize: 16 }} className={loading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  External ID
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Booking Request
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Triggered By
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <RefreshIcon className="animate-spin mx-auto mb-2" style={{ fontSize: 24 }} />
                    <p>Loading logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <DescriptionIcon className="mx-auto mb-2 text-gray-400" style={{ fontSize: 48 }} />
                    <p className="font-medium">No API logs found</p>
                    <p className="text-xs mt-1">API requests will appear here once made</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {formatCompactDateTime(log.createdAt)}
                    </td>
                    <td className="px-3 py-2">
                      {getStatusBadge(log)}
                    </td>
                    <td className={`px-3 py-2 text-[10px] font-medium ${getStatusCodeColor(log.statusCode)}`}>
                      {log.statusCode || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                        {log.method}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600 max-w-xs truncate" title={log.endpoint}>
                      {log.endpoint}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600">
                      {log.externalId ? `#${log.externalId}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-600 max-w-xs truncate">
                      {log.bookingRequest ? (
                        <span title={log.bookingRequest.businessEmail || undefined}>
                          {log.bookingRequest.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      {log.triggeredBy || '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] text-gray-500">
                      {log.durationMs ? `${log.durationMs}ms` : '-'}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-red-600 max-w-xs truncate" title={log.errorMessage || undefined}>
                      {log.errorMessage || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-xs text-gray-500">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-xs text-gray-600 font-medium px-2">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

