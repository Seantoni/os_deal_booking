'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useUser } from '@clerk/nextjs'
import type { ColumnConfig } from '@/components/shared'

interface UseResizableColumnsOptions {
  storageKey: string
  defaultWidths: Record<string, number>
  minWidths?: Record<string, number>
  maxWidth?: number
  resizableKeys?: string[]
}

interface UseResizableColumnsResult {
  columnsWithUserWidths: ColumnConfig[]
  handleColumnResize: (columnKey: string, widthPx: number) => void
  getColumnCellStyle: (columnKey: string) => CSSProperties | undefined
}

const DEFAULT_MIN_WIDTH = 48
const DEFAULT_MAX_WIDTH = 640

export function useResizableColumns(
  columns: ColumnConfig[],
  options: UseResizableColumnsOptions
): UseResizableColumnsResult {
  const { user } = useUser()
  const userId = user?.id || null
  const {
    storageKey,
    defaultWidths,
    minWidths = {},
    maxWidth = DEFAULT_MAX_WIDTH,
    resizableKeys,
  } = options

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths)
  const loadedColumnWidthsForUserRef = useRef<string | null>(null)
  const skipNextColumnWidthsPersistRef = useRef(false)

  const effectiveResizableKeys = useMemo(() => {
    if (resizableKeys && resizableKeys.length > 0) {
      return new Set(resizableKeys)
    }
    return new Set(Object.keys(defaultWidths))
  }, [resizableKeys, defaultWidths])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    const fullStorageKey = `${storageKey}:${userId}`

    try {
      const stored = localStorage.getItem(fullStorageKey)
      if (!stored) {
        loadedColumnWidthsForUserRef.current = userId
        skipNextColumnWidthsPersistRef.current = true
        return
      }

      const parsed = JSON.parse(stored) as Record<string, unknown>
      const sanitized: Record<string, number> = { ...defaultWidths }
      Object.keys(defaultWidths).forEach((columnKey) => {
        const raw = parsed[columnKey]
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          const min = minWidths[columnKey] || DEFAULT_MIN_WIDTH
          sanitized[columnKey] = Math.max(min, Math.min(maxWidth, Math.round(raw)))
        }
      })
      setColumnWidths(sanitized)
    } catch {
      setColumnWidths(defaultWidths)
    } finally {
      loadedColumnWidthsForUserRef.current = userId
      skipNextColumnWidthsPersistRef.current = true
    }
  }, [userId, storageKey, defaultWidths, minWidths, maxWidth])

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return
    if (loadedColumnWidthsForUserRef.current !== userId) return
    if (skipNextColumnWidthsPersistRef.current) {
      skipNextColumnWidthsPersistRef.current = false
      return
    }

    const fullStorageKey = `${storageKey}:${userId}`
    try {
      localStorage.setItem(fullStorageKey, JSON.stringify(columnWidths))
    } catch {
      // Ignore localStorage errors (quota/private mode)
    }
  }, [columnWidths, userId, storageKey])

  const handleColumnResize = useCallback((columnKey: string, widthPx: number) => {
    if (!effectiveResizableKeys.has(columnKey)) return
    const min = minWidths[columnKey] || DEFAULT_MIN_WIDTH
    const nextWidth = Math.max(min, Math.min(maxWidth, Math.round(widthPx)))
    setColumnWidths((prev) => {
      if (prev[columnKey] === nextWidth) return prev
      return { ...prev, [columnKey]: nextWidth }
    })
  }, [effectiveResizableKeys, minWidths, maxWidth])

  const getColumnCellStyle = useCallback((columnKey: string): CSSProperties | undefined => {
    if (!Object.prototype.hasOwnProperty.call(defaultWidths, columnKey)) return undefined
    const width = columnWidths[columnKey] || defaultWidths[columnKey]
    return {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    }
  }, [columnWidths, defaultWidths])

  const columnsWithUserWidths = useMemo(() => {
    return columns.map((column) => {
      const isResizable = effectiveResizableKeys.has(column.key)
      const widthPx = defaultWidths[column.key]
      if (!isResizable || !widthPx) {
        return {
          ...column,
          resizable: false,
        }
      }
      return {
        ...column,
        widthPx: columnWidths[column.key] || widthPx,
        minWidth: minWidths[column.key] || DEFAULT_MIN_WIDTH,
        maxWidth,
        resizable: true,
      }
    })
  }, [columns, effectiveResizableKeys, defaultWidths, columnWidths, minWidths, maxWidth])

  return {
    columnsWithUserWidths,
    handleColumnResize,
    getColumnCellStyle,
  }
}

