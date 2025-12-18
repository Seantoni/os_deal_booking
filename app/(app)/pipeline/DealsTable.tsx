'use client'

import { Deal, BookingRequest, Opportunity } from '@/types'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'
import { formatShortDate } from '@/lib/date'
import { type ColumnConfig } from '@/components/shared'

type DealItem = {
  deal: {
    id: string
    status: string
    responsibleId: string | null
    bookingRequestId: string
    bookingRequest: BookingRequest
  }
  opportunity: Opportunity | null
  bookingRequest: BookingRequest
}

interface DealsTableProps {
  data: DealItem[]
  searchQuery: string
}

export default function DealsTable({ data, searchQuery }: DealsTableProps) {
  const filteredData = searchQuery
    ? data.filter(item => item.bookingRequest.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : data

  const statusTone = (status: string) => {
    switch (status) {
      case 'borrador_aprobado':
        return 'success'
      case 'borrador_enviado':
        return 'info'
      case 'asignado':
      case 'elaboracion':
      case 'imagenes':
        return 'neutral'
      default:
        return 'warning'
    }
  }

  const columns: ColumnConfig[] = [
    { key: 'name', label: 'Deal Name' },
    { key: 'dates', label: 'Reserved Date' },
    { key: 'status', label: 'Status' },
  ]

  return (
    <EntityTable
      columns={columns}
      sortColumn={null}
      sortDirection={'asc'}
      onSort={() => {}}
    >
      {filteredData.map((item, index) => (
        <TableRow key={item.deal.id} index={index}>
          <TableCell className="font-medium text-gray-900 text-[13px]">
            {item.bookingRequest.name}
          </TableCell>
          <TableCell className="text-gray-600 text-[13px]">
            <div className="flex items-center gap-2">
              <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 16 }} />
              <span className="text-[13px]">
                {formatShortDate(item.bookingRequest.startDate)} — {formatShortDate(item.bookingRequest.endDate)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <StatusPill
              label={item.deal.status.replace(/_/g, ' ')}
              tone={statusTone(item.deal.status)}
            />
          </TableCell>
        </TableRow>
      ))}
    </EntityTable>
  )
}

