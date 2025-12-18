'use client'

import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'
import { formatShortDate } from '@/lib/date'
import { type ColumnConfig } from '@/components/shared'

type PreBookedEventItem = {
  event: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    status: string
    merchant: string | null
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    createdAt: Date
  }
}

interface PreBookedTableProps {
  data: PreBookedEventItem[]
  searchQuery: string
}

export default function PreBookedTable({ data, searchQuery }: PreBookedTableProps) {
  const filteredData = searchQuery
    ? data.filter(item => item.event.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : data

  const columns: ColumnConfig[] = [
    { key: 'name', label: 'Event Name' },
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
        <TableRow key={item.event.id} index={index}>
          <TableCell className="font-medium text-gray-900 text-[13px]">
            {item.event.name}
          </TableCell>
          <TableCell className="text-gray-600 text-[13px]">
            <div className="flex items-center gap-2">
              <CalendarTodayIcon className="text-gray-400" style={{ fontSize: 16 }} />
              <span className="text-[13px]">
                {formatShortDate(item.event.startDate)} — {formatShortDate(item.event.endDate)}
              </span>
            </div>
          </TableCell>
          <TableCell>
            <StatusPill label="Pre-Booked" tone="info" />
          </TableCell>
        </TableRow>
      ))}
    </EntityTable>
  )
}

