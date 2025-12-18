'use client'

import { useState, useMemo } from 'react'
import { BookingRequest } from '@/types'
import { BookingRequestViewModal } from '@/components/booking/request-view'
import { EntityTable, RowActionsMenu, StatusPill, TableRow, TableCell } from '@/components/shared/table'
import { type ColumnConfig } from '@/components/shared'

type PipelineItem = {
  bookingRequest: BookingRequest | null
}

interface RequestsTableProps {
  data: PipelineItem[]
  searchQuery: string
}

export default function RequestsTable({ data, searchQuery }: RequestsTableProps) {
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null)

  const filteredData = useMemo(() => {
    if (!searchQuery) return data
    const q = searchQuery.toLowerCase()
    return data.filter(item => item.bookingRequest?.name.toLowerCase().includes(q))
  }, [data, searchQuery])

  const statusTone = (status?: string) => {
    switch (status) {
      case 'booked':
        return 'success'
      case 'approved':
        return 'info'
      case 'pending':
        return 'warning'
      case 'rejected':
        return 'danger'
      default:
        return 'neutral'
    }
  }

  const columns: ColumnConfig[] = [
    { key: 'name', label: 'Name' },
    { key: 'created', label: 'Created Date' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right', width: 'w-12' },
  ]

  return (
    <>
    <EntityTable
      columns={columns}
      sortColumn={null}
      sortDirection={'asc'}
      onSort={() => {}}
    >
      {filteredData.map((item, index) => (
        <TableRow key={item.bookingRequest?.id} index={index}>
          <TableCell className="font-medium text-gray-900 text-[13px]">
            {item.bookingRequest?.name}
          </TableCell>
          <TableCell className="text-gray-600 text-[13px]">
            {new Date(item.bookingRequest?.createdAt || '').toLocaleDateString()}
          </TableCell>
          <TableCell>
            <StatusPill
              label={item.bookingRequest?.status || '-'}
              tone={statusTone(item.bookingRequest?.status)}
            />
          </TableCell>
          <TableCell align="right">
            <RowActionsMenu
              items={[
                {
                  label: 'View',
                  onClick: () => {
                    setSelectedRequest(item.bookingRequest)
                    setRequestModalOpen(true)
                  },
                },
              ]}
            />
          </TableCell>
        </TableRow>
      ))}
    </EntityTable>

      <BookingRequestViewModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        requestId={selectedRequest?.id || null}
      />
    </>
  )
}

