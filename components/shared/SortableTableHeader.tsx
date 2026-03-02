'use client'

import { useEffect, useState } from 'react'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import type { SortDirection } from '@/hooks/useEntityPage'

export interface ColumnConfig {
  /** Unique key for the column (used for sorting) */
  key: string
  /** Display label (string or custom React node) */
  label: string | React.ReactNode
  /** Whether this column is sortable */
  sortable?: boolean
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Additional CSS classes */
  className?: string
  /** Column width (e.g., 'w-28', 'w-10') */
  width?: string
  /** Fixed width in pixels (for user-resizable tables) */
  widthPx?: number
  /** Allow dragging this column edge to resize */
  resizable?: boolean
  /** Minimum width in pixels when resizable */
  minWidth?: number
  /** Maximum width in pixels when resizable */
  maxWidth?: number
}

interface SortableTableHeaderProps {
  columns: ColumnConfig[]
  sortColumn: string | null
  sortDirection: SortDirection
  onSort: (column: string) => void
  onColumnResize?: (column: string, widthPx: number) => void
}

/**
 * Reusable sortable table header component.
 * 
 * @example
 * ```tsx
 * const columns: ColumnConfig[] = [
 *   { key: 'name', label: 'Business Name', sortable: true },
 *   { key: 'contact', label: 'Contact', sortable: true },
 *   { key: 'email', label: 'Email', sortable: false },
 *   { key: 'actions', label: '', align: 'right', width: 'w-10' },
 * ]
 * 
 * <SortableTableHeader
 *   columns={columns}
 *   sortColumn={sortColumn}
 *   sortDirection={sortDirection}
 *   onSort={handleSort}
 * />
 * ```
 */
export function SortableTableHeader({
  columns,
  sortColumn,
  sortDirection,
  onSort,
  onColumnResize,
}: SortableTableHeaderProps) {
  const [activeResize, setActiveResize] = useState<{
    columnKey: string
    startX: number
    startWidth: number
    minWidth: number
    maxWidth: number
  } | null>(null)

  useEffect(() => {
    if (!activeResize || !onColumnResize) return

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientX - activeResize.startX
      const nextWidth = Math.max(
        activeResize.minWidth,
        Math.min(activeResize.maxWidth, Math.round(activeResize.startWidth + delta))
      )
      onColumnResize(activeResize.columnKey, nextWidth)
    }

    const handleMouseUp = () => {
      setActiveResize(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [activeResize, onColumnResize])

  return (
    <thead className="bg-slate-100 border-b border-slate-200">
      <tr>
        {columns.map((column) => {
          const isActive = sortColumn === column.key
          const alignClass = column.align === 'center' 
            ? 'text-center' 
            : column.align === 'right' 
              ? 'text-right' 
              : 'text-left'
          
          return (
            <th
              key={column.key}
              className={`px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap overflow-hidden ${alignClass} ${
                column.sortable ? 'cursor-pointer hover:bg-slate-200/50 transition-colors' : ''
              } ${column.width || ''} ${column.className || ''} ${column.resizable ? 'relative' : ''}`}
              onClick={column.sortable ? () => onSort(column.key) : undefined}
              style={column.widthPx ? { width: `${column.widthPx}px`, minWidth: `${column.widthPx}px`, maxWidth: `${column.widthPx}px` } : undefined}
            >
              <div className={`flex min-w-0 items-center gap-1 ${
                column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''
              }`}>
                <span className="truncate">{column.label}</span>
                {column.sortable && isActive && (
                  sortDirection === 'asc' 
                    ? <ArrowUpwardIcon style={{ fontSize: 14 }} className="text-blue-600 shrink-0" /> 
                    : <ArrowDownwardIcon style={{ fontSize: 14 }} className="text-blue-600 shrink-0" />
                )}
              </div>
              {column.resizable && onColumnResize && (
                <button
                  type="button"
                  aria-label={`Resize ${typeof column.label === 'string' ? column.label : column.key} column`}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize border-r border-transparent hover:border-slate-400 focus:outline-none"
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setActiveResize({
                      columnKey: column.key,
                      startX: event.clientX,
                      startWidth: column.widthPx || column.minWidth || 80,
                      minWidth: column.minWidth || 48,
                      maxWidth: column.maxWidth || 640,
                    })
                  }}
                />
              )}
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

/**
 * Empty state component for tables
 */
interface EmptyTableStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  hasFilters?: boolean
}

export function EmptyTableState({ icon, title, description }: EmptyTableStateProps) {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-gray-500 bg-white rounded-lg border border-gray-200 shadow-sm">
      {icon && <div className="w-12 h-12 text-gray-400 mb-3">{icon}</div>}
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs mt-1">{description}</p>
    </div>
  )
}

/**
 * Loading state component for tables
 * Shows a skeleton that matches the table structure
 */
export function TableLoadingState({ 
  columns = 5, 
  showCheckbox = false,
  rows = 5 
}: { 
  columns?: number
  showCheckbox?: boolean
  rows?: number 
} = {}) {
  const defaultWidths = [
    'w-32', 'w-24', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20', 
    'w-28', 'w-24', 'w-20', 'w-32', 'w-24', 'w-20', 'w-16'
  ]
  const widths = defaultWidths.slice(0, columns)

  return (
    <div className="animate-pulse">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Table header */}
        <div className="bg-gray-50 px-4 py-3 flex gap-4 border-b border-gray-200">
          {showCheckbox && (
            <div className="h-4 bg-gray-300 rounded w-12 flex-shrink-0"></div>
          )}
          {Array.from({ length: columns }).map((_, i) => (
            <div 
              key={i} 
              className={`h-4 bg-gray-300 rounded ${widths[i] || 'w-24'}`}
            ></div>
          ))}
          <div className="h-4 bg-gray-300 rounded w-16 flex-shrink-0 ml-auto"></div>
        </div>
        
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100 flex gap-4 items-center last:border-b-0">
            {showCheckbox && (
              <div className="h-5 w-5 bg-gray-200 rounded flex-shrink-0"></div>
            )}
            {Array.from({ length: columns }).map((_, j) => (
              <div 
                key={j} 
                className={`h-4 bg-gray-200 rounded ${widths[j] || 'w-24'}`}
              ></div>
            ))}
            <div className="h-4 bg-gray-200 rounded w-16 flex-shrink-0 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
