'use client'

import { ReactNode } from 'react'
import { SortableTableHeader, type ColumnConfig } from '@/components/shared'
import type { SortDirection } from '@/hooks/useEntityPage'

interface EntityTableProps {
  columns: ColumnConfig[]
  sortColumn: string | null
  sortDirection: SortDirection
  onSort: (column: string) => void
  children: ReactNode
  className?: string
  tableClassName?: string
}

export default function EntityTable({
  columns,
  sortColumn,
  sortDirection,
  onSort,
  children,
  className = '',
  tableClassName = '',
}: EntityTableProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-[13px] text-left ${tableClassName}`}>
          <SortableTableHeader
            columns={columns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={onSort}
          />
          <tbody className="divide-y divide-slate-100">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}
