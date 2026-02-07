'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { 
  getEventLeads, 
  getEventLeadStats,
  getAllEventLeadsForExport,
  EventLeadWithStats 
} from '@/app/actions/event-leads'
import {
  getRestaurantLeads,
  getRestaurantLeadStats,
  getAllRestaurantLeadsForExport,
  runRestaurantBusinessMatching,
  RestaurantLeadWithStats,
} from '@/app/actions/restaurant-leads'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FilterListIcon from '@mui/icons-material/FilterList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DownloadIcon from '@mui/icons-material/Download'
import StorefrontIcon from '@mui/icons-material/Storefront'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import EventIcon from '@mui/icons-material/Event'
import StarIcon from '@mui/icons-material/Star'
import LinkIcon from '@mui/icons-material/Link'
import { Button } from '@/components/ui'
import { EntityTable, StatusPill, TableRow, TableCell } from '@/components/shared/table'
import { EmptyTableState, type ColumnConfig } from '@/components/shared'
import ModalShell from '@/components/shared/ModalShell'
import toast from 'react-hot-toast'
import { formatCompactDateTime, getTodayInPanama, formatDateForPanama } from '@/lib/date'
import { exportEventLeadsToCsv } from './csv-export'
import { PromoterBusinessSelect } from './components/PromoterBusinessSelect'
import { RestaurantBusinessSelect } from './components/RestaurantBusinessSelect'
import { getBusiness } from '@/app/actions/businesses'
import type { Business } from '@/types'

type LeadTab = 'eventos' | 'restaurantes'

// Lazy load business modal
const BusinessFormModal = dynamic(() => import('@/components/crm/business/BusinessFormModal'), {
  loading: () => null,
  ssr: false,
})

type SortField = 'eventName' | 'eventDate' | 'eventPlace' | 'promoter' | 'sourceSite' | 'firstSeenAt' | 'lastScannedAt'

// Spanish month names - supports both abbreviated (ENE, FEB) and full names (enero, febrero)
const MONTH_TO_NUM: Record<string, number> = {
  // Abbreviated (uppercase)
  'ENE': 0, 'FEB': 1, 'MAR': 2, 'ABR': 3, 'MAY': 4, 'JUN': 5,
  'JUL': 6, 'AGO': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DIC': 11,
  // Full names (lowercase for case-insensitive matching)
  'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5,
  'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11,
}

const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/**
 * Parse raw date string into a Date object
 * Supports:
 * - "27 FEB" (day + abbreviated month)
 * - "9 ABR" (day + abbreviated month)
 * - "ENE - MAR" (date range, uses first month)
 * - "Jueves 14 may 2026" (full date with year from Panatickets)
 * - "14 mayo 2026" (day + full month + year)
 * - "14 de Marzo de 2026" (En La Taquilla format)
 * - "del 24 de Febrero al 14 de Marzo" (date range, uses first date)
 * - "04, 05 y 06 de Febrero" (multiple dates, uses first)
 */
function parseEventDate(rawDate: string | null): Date | null {
  if (!rawDate) return null
  
  const normalized = rawDate.trim()
  
  // Pattern 1: Full date with year like "Jueves 14 may 2026" or "14 mayo 2026" or "14 de Marzo de 2026"
  // Match: optional day name, day number, optional "de", month name, optional "de", year
  const fullDateMatch = normalized.match(/(?:\w+\s+)?(\d{1,2})\s+(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(?:de\s+)?(\d{4})/i)
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10)
    const monthStr = fullDateMatch[2].toUpperCase()
    const year = parseInt(fullDateMatch[3], 10)
    
    // Find month number - try full name first, then abbreviated
    let monthNum = MONTH_TO_NUM[monthStr]
    if (monthNum === undefined) {
      // Try to match abbreviated version
      const abbr = monthStr.substring(0, 3)
      monthNum = MONTH_TO_NUM[abbr]
    }
    
    if (monthNum !== undefined) {
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 2: Date range like "del 24 de Febrero al 14 de Marzo" - extract first date
  const rangeWithDayMatch = normalized.match(/(?:del?\s+)?(\d{1,2})\s+(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(?:al|a|-)/i)
  if (rangeWithDayMatch) {
    const day = parseInt(rangeWithDayMatch[1], 10)
    const monthStr = rangeWithDayMatch[2].toUpperCase()
    
    let monthNum = MONTH_TO_NUM[monthStr]
    if (monthNum === undefined) {
      const abbr = monthStr.substring(0, 3)
      monthNum = MONTH_TO_NUM[abbr]
    }
    
    if (monthNum !== undefined) {
      const now = new Date()
      const currentYear = now.getFullYear()
      let year = currentYear
      const tentativeDate = new Date(currentYear, monthNum, day)
      if (tentativeDate < now) {
        year = currentYear + 1
      }
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 3: Multiple dates like "04, 05 y 06 de Febrero" - use first date
  const multipleDatesMatch = normalized.match(/(\d{1,2})(?:,\s*\d{1,2})*\s+(?:y\s+\d{1,2}\s+)?(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)/i)
  if (multipleDatesMatch) {
    const day = parseInt(multipleDatesMatch[1], 10)
    const monthStr = multipleDatesMatch[2].toUpperCase()
    
    let monthNum = MONTH_TO_NUM[monthStr]
    if (monthNum === undefined) {
      const abbr = monthStr.substring(0, 3)
      monthNum = MONTH_TO_NUM[abbr]
    }
    
    if (monthNum !== undefined) {
      const now = new Date()
      const currentYear = now.getFullYear()
      let year = currentYear
      const tentativeDate = new Date(currentYear, monthNum, day)
      if (tentativeDate < now) {
        year = currentYear + 1
      }
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 4: Day + full month name without year like "24 de Febrero"
  const dayMonthMatch = normalized.match(/(\d{1,2})\s+(?:de\s+)?(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)/i)
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10)
    const monthStr = dayMonthMatch[2].toUpperCase()
    
    let monthNum = MONTH_TO_NUM[monthStr]
    if (monthNum === undefined) {
      const abbr = monthStr.substring(0, 3)
      monthNum = MONTH_TO_NUM[abbr]
    }
    
    if (monthNum !== undefined) {
      const now = new Date()
      const currentYear = now.getFullYear()
      let year = currentYear
      const tentativeDate = new Date(currentYear, monthNum, day)
      if (tentativeDate < now) {
        year = currentYear + 1
      }
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 5: Day + abbreviated month like "27 FEB", "9 ABR"
  const shortMatch = normalized.match(/(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i)
  if (shortMatch) {
    const day = parseInt(shortMatch[1], 10)
    const monthKey = shortMatch[2].toUpperCase()
    const monthNum = MONTH_TO_NUM[monthKey]
    
    if (monthNum !== undefined) {
      const now = new Date()
      const currentYear = now.getFullYear()
      
      // Determine if this year or next year
      let year = currentYear
      const tentativeDate = new Date(currentYear, monthNum, day)
      
      // If the date has already passed this year, assume next year
      if (tentativeDate < now) {
        year = currentYear + 1
      }
      
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 6: Date range like "ENE - MAR" - use first month
  const rangeMatch = normalized.match(/^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i)
  if (rangeMatch) {
    const monthKey = rangeMatch[1].toUpperCase()
    const monthNum = MONTH_TO_NUM[monthKey]
    if (monthNum !== undefined) {
      const now = new Date()
      const year = now.getMonth() > monthNum ? now.getFullYear() + 1 : now.getFullYear()
      return new Date(year, monthNum, 1)
    }
  }
  
  return null
}

/**
 * Format date in Spanish like "Enero 20, 2025"
 */
function formatDateSpanish(date: Date | null): string {
  if (!date) return '-'
  return `${MONTH_NAMES_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/**
 * Export restaurant leads to CSV
 */
function exportRestaurantLeadsToCsv(restaurants: RestaurantLeadWithStats[], filename: string): void {
  const headers = ['Nombre', 'Tipo', 'Descuento', 'Precio/Persona', 'Comida', 'Servicio', 'Ambiente', 'Votos', 'Dirección', 'URL', 'Primera vez', 'Actualizado']
  
  const rows = restaurants.map(r => [
    r.name,
    r.cuisine || '',
    r.discount || '',
    r.pricePerPerson ? `$${r.pricePerPerson}` : '',
    r.foodRating ? r.foodRating.toFixed(1) : '',
    r.serviceRating ? r.serviceRating.toFixed(1) : '',
    r.ambientRating ? r.ambientRating.toFixed(1) : '',
    r.votes?.toString() || '',
    r.address || '',
    r.sourceUrl,
    r.firstSeenAt.toISOString(),
    r.lastScannedAt.toISOString(),
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

/**
 * Calculate days until a date (using Panama timezone)
 */
function getDaysUntil(date: Date | null): number | null {
  if (!date) return null
  
  // Use Panama timezone for consistent date comparison
  const todayStr = getTodayInPanama()
  const eventDateStr = formatDateForPanama(date)
  
  const todayParts = todayStr.split('-').map(Number)
  const eventParts = eventDateStr.split('-').map(Number)
  
  const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
  const eventDate = new Date(eventParts[0], eventParts[1] - 1, eventParts[2])
  
  const diffTime = eventDate.getTime() - todayDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Format days until with color coding
 */
function formatDaysUntil(days: number | null): { text: string; className: string } {
  if (days === null) return { text: '-', className: 'text-gray-400' }
  
  if (days < 0) {
    return { text: `Pasó hace ${Math.abs(days)}d`, className: 'text-gray-400' }
  }
  if (days === 0) {
    return { text: 'Hoy', className: 'text-green-600 font-medium' }
  }
  if (days === 1) {
    return { text: 'Mañana', className: 'text-green-600 font-medium' }
  }
  if (days <= 7) {
    return { text: `${days} días`, className: 'text-orange-600 font-medium' }
  }
  if (days <= 30) {
    return { text: `${days} días`, className: 'text-blue-600' }
  }
  return { text: `${days} días`, className: 'text-gray-600' }
}

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'sourceSite', label: 'Fuente', sortable: true, width: 'w-24' },
  { key: 'eventName', label: 'Nombre', sortable: true },
  { key: 'eventDate', label: 'Fecha', sortable: true, width: 'w-36' },
  { key: 'daysUntil', label: 'Días', sortable: true, width: 'w-24' },
  { key: 'eventPlace', label: 'Lugar', sortable: true },
  { key: 'promoter', label: 'Promotor', sortable: true },
  { key: 'lastScannedAt', label: 'Actualizado', sortable: true, width: 'w-28' },
  { key: 'actions', label: '', align: 'center', width: 'w-20' },
]

interface ScanProgress {
  site: string
  phase: string
  message: string
  current?: number
  total?: number
  eventName?: string
}

interface Stats {
  totalEvents: number
  activeEvents: number
  bySite: { site: string; count: number }[]
  lastScanAt: Date | null
  newToday: number
}

interface RestaurantScanProgress {
  site: string
  phase: string
  message: string
  current?: number
  total?: number
  restaurantName?: string
}

interface RestaurantStats {
  totalRestaurants: number
  withDiscount: number
  bySite: { site: string; count: number }[]
  lastScanAt: Date | null
  newToday: number
  avgFoodRating: number | null
}

type RestaurantSortField = 'name' | 'cuisine' | 'pricePerPerson' | 'votes' | 'foodRating' | 'discount' | 'firstSeenAt' | 'lastScannedAt'

// Restaurant table columns
const RESTAURANT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Restaurante', sortable: true },
  { key: 'matchedBusiness', label: 'Negocio', sortable: false, width: 'w-36' },
  { key: 'cuisine', label: 'Tipo', sortable: true, width: 'w-28' },
  { key: 'discount', label: 'Descuento', sortable: true, width: 'w-24' },
  { key: 'pricePerPerson', label: 'Precio', sortable: true, width: 'w-20' },
  { key: 'foodRating', label: 'Comida', sortable: true, width: 'w-20' },
  { key: 'votes', label: 'Votos', sortable: true, width: 'w-20' },
  { key: 'lastScannedAt', label: 'Actualizado', sortable: true, width: 'w-28' },
  { key: 'actions', label: '', align: 'center', width: 'w-20' },
]

export default function LeadsNegociosClient() {
  // Tab state
  const [activeTab, setActiveTab] = useState<LeadTab>('eventos')
  
  // Events state
  const [events, setEvents] = useState<EventLeadWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Restaurant state
  const [restaurants, setRestaurants] = useState<RestaurantLeadWithStats[]>([])
  const [restaurantLoading, setRestaurantLoading] = useState(true)
  const [restaurantScanning, setRestaurantScanning] = useState(false)
  const [restaurantScanProgress, setRestaurantScanProgress] = useState<RestaurantScanProgress | null>(null)
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null)
  const [restaurantPage, setRestaurantPage] = useState(1)
  const [restaurantTotalPages, setRestaurantTotalPages] = useState(1)
  const [restaurantTotal, setRestaurantTotal] = useState(0)
  const [restaurantSearch, setRestaurantSearch] = useState('')
  const [restaurantCommittedSearch, setRestaurantCommittedSearch] = useState('')
  const [restaurantSortBy, setRestaurantSortBy] = useState<RestaurantSortField>('lastScannedAt')
  const [restaurantSortOrder, setRestaurantSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showRestaurantNewOnly, setShowRestaurantNewOnly] = useState(false)
  const [showDiscountOnly, setShowDiscountOnly] = useState(true)
  const [showRestaurantExportMenu, setShowRestaurantExportMenu] = useState(false)
  const [restaurantExporting, setRestaurantExporting] = useState(false)
  const [matching, setMatching] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 50
  
  // Filters
  const [search, setSearch] = useState('')
  const [committedSearch, setCommittedSearch] = useState('')
  const [sourceSite, setSourceSite] = useState<string>('')
  const [status, setStatus] = useState<string>('active')
  const [showNewOnly, setShowNewOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortField>('lastScannedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Calendar modal state
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  
  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  // Business modal state
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(false)
  
  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getEventLeads({
        page,
        pageSize,
        sourceSite: sourceSite || undefined,
        status: status || undefined,
        search: committedSearch || undefined,
        sortBy,
        sortOrder,
        newOnly: showNewOnly,
      })
      
      setEvents(result.events)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, sourceSite, status, committedSearch, sortBy, sortOrder, showNewOnly])
  
  const loadStats = useCallback(async () => {
    try {
      const statsResult = await getEventLeadStats()
      setStats(statsResult)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])
  
  // Restaurant loading functions
  const loadRestaurants = useCallback(async () => {
    setRestaurantLoading(true)
    try {
      const result = await getRestaurantLeads({
        page: restaurantPage,
        pageSize,
        search: restaurantCommittedSearch || undefined,
        sortBy: restaurantSortBy,
        sortOrder: restaurantSortOrder,
        newOnly: showRestaurantNewOnly,
        hasDiscount: showDiscountOnly,
      })
      
      setRestaurants(result.restaurants)
      setRestaurantTotalPages(result.totalPages)
      setRestaurantTotal(result.total)
    } catch (error) {
      console.error('Failed to load restaurants:', error)
      toast.error('Failed to load restaurants')
    } finally {
      setRestaurantLoading(false)
    }
  }, [restaurantPage, pageSize, restaurantCommittedSearch, restaurantSortBy, restaurantSortOrder, showRestaurantNewOnly, showDiscountOnly])
  
  const loadRestaurantStats = useCallback(async () => {
    try {
      const statsResult = await getRestaurantLeadStats()
      setRestaurantStats(statsResult)
    } catch (error) {
      console.error('Failed to load restaurant stats:', error)
    }
  }, [])
  
  // Export handlers
  const handleExportCurrentView = useCallback(() => {
    setShowExportMenu(false)
    if (events.length === 0) {
      toast.error('No hay eventos para exportar')
      return
    }
    const count = exportEventLeadsToCsv(events, `event-leads-vista-actual-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exportados ${count} eventos`)
  }, [events])
  
  const handleExportAll = useCallback(async () => {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const allEvents = await getAllEventLeadsForExport({
        sourceSite: sourceSite || undefined,
        status: status || undefined,
        search: committedSearch || undefined,
      })
      if (allEvents.length === 0) {
        toast.error('No hay eventos para exportar')
        return
      }
      const count = exportEventLeadsToCsv(allEvents, `event-leads-todos-${new Date().toISOString().split('T')[0]}.csv`)
      toast.success(`Exportados ${count} eventos`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Error al exportar eventos')
    } finally {
      setExporting(false)
    }
  }, [sourceSite, status, committedSearch])
  
  // Load events when filters change
  useEffect(() => {
    if (activeTab === 'eventos') {
      loadEvents()
    }
  }, [loadEvents, activeTab])
  
  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [loadStats])
  
  // Load restaurants when filters change
  useEffect(() => {
    if (activeTab === 'restaurantes') {
      loadRestaurants()
    }
  }, [loadRestaurants, activeTab])
  
  // Load restaurant stats on mount
  useEffect(() => {
    loadRestaurantStats()
  }, [loadRestaurantStats])
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setCommittedSearch(search)
  }
  
  const handleSort = (column: string) => {
    // Map daysUntil to eventDate since it's a computed field
    const field = (column === 'daysUntil' ? 'eventDate' : column) as SortField
    
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      // Default to ascending for dates (soonest first), descending for others
      setSortOrder(field === 'eventDate' ? 'asc' : 'desc')
    }
    setPage(1)
  }
  
  const handleScan = async (site?: 'ticketplus' | 'panatickets') => {
    setScanning(true)
    setScanProgress(null)
    
    try {
      // Use SSE for real-time progress
      const response = await fetch('/api/event-leads/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: site ? JSON.stringify({ site }) : '{}',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Scan failed')
        setScanning(false)
        return
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        toast.error('Failed to start scan stream')
        setScanning(false)
        return
      }
      
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              const eventIndex = lines.indexOf(line) - 1
              const eventLine = eventIndex >= 0 ? lines[eventIndex] : ''
              
              if (eventLine.includes('progress')) {
                setScanProgress(data)
              } else if (eventLine.includes('complete')) {
                setScanProgress(null)
                
                if (data.errors && data.errors.length > 0) {
                  toast.error(
                    `Scan had errors: ${data.errors[0]}${data.errors.length > 1 ? ` (+${data.errors.length - 1} more)` : ''}`,
                    { duration: 10000 }
                  )
                } else if (data.eventsFound === 0) {
                  toast.error('No events found. The site structure may have changed.')
                } else {
                  toast.success(
                    `Scan complete! Found ${data.eventsFound} events (${data.newEvents} new)`,
                    { duration: 5000 }
                  )
                }
                
                // Reload data
                loadEvents()
                loadStats()
              } else if (eventLine.includes('error')) {
                toast.error(data.message || 'Scan failed')
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Scan error:', error)
      toast.error(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setScanning(false)
      setScanProgress(null)
    }
  }
  
  const getSiteName = (site: string) => {
    switch (site) {
      case 'ticketplus': return 'Ticketplus'
      case 'panatickets': return 'Panatickets'
      case 'enlataquilla': return 'En La Taquilla'
      default: return site
    }
  }
  
  // Handler for opening business modal from event lead
  const handleOpenBusiness = async (event: EventLeadWithStats) => {
    if (!event.promoterBusinessId) {
      toast.error('Primero selecciona un negocio promotor')
      return
    }
    
    setLoadingBusiness(true)
    try {
      const result = await getBusiness(event.promoterBusinessId)
      if (result.success && result.data) {
        setSelectedBusiness(result.data as Business)
        setBusinessModalOpen(true)
      } else {
        toast.error('No se pudo cargar el negocio')
      }
    } catch {
      toast.error('Error al cargar el negocio')
    } finally {
      setLoadingBusiness(false)
    }
  }
  
  const handleBusinessModalClose = () => {
    setBusinessModalOpen(false)
    setSelectedBusiness(null)
  }
  
  const handleBusinessSuccess = () => {
    setBusinessModalOpen(false)
    setSelectedBusiness(null)
    loadEvents() // Refresh to show any updates
  }
  
  // Restaurant handlers
  const handleRestaurantSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setRestaurantPage(1)
    setRestaurantCommittedSearch(restaurantSearch)
  }
  
  const handleRestaurantSort = (column: string) => {
    const field = column as RestaurantSortField
    
    if (restaurantSortBy === field) {
      setRestaurantSortOrder(restaurantSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setRestaurantSortBy(field)
      setRestaurantSortOrder(field === 'foodRating' || field === 'votes' ? 'desc' : 'asc')
    }
    setRestaurantPage(1)
  }
  
  const handleRestaurantScan = async () => {
    setRestaurantScanning(true)
    setRestaurantScanProgress(null)
    
    try {
      // Use SSE for real-time progress
      const response = await fetch('/api/restaurant-leads/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || 'Scan failed')
        setRestaurantScanning(false)
        return
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        toast.error('Failed to start scan stream')
        setRestaurantScanning(false)
        return
      }
      
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('event: ')) continue
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              const eventIndex = lines.indexOf(line) - 1
              const eventLine = eventIndex >= 0 ? lines[eventIndex] : ''
              
              if (eventLine.includes('progress')) {
                setRestaurantScanProgress(data)
              } else if (eventLine.includes('complete')) {
                setRestaurantScanProgress(null)
                
                if (data.errors && data.errors.length > 0) {
                  toast.error(
                    `Scan had errors: ${data.errors[0]}${data.errors.length > 1 ? ` (+${data.errors.length - 1} more)` : ''}`,
                    { duration: 10000 }
                  )
                } else if (data.restaurantsFound === 0) {
                  toast.error('No restaurants found. The site structure may have changed.')
                } else {
                  toast.success(
                    `Scan complete! Found ${data.restaurantsFound} restaurants (${data.newRestaurants} new)`,
                    { duration: 5000 }
                  )
                }
                
                loadRestaurants()
                loadRestaurantStats()
              } else if (eventLine.includes('error')) {
                toast.error(data.message || 'Scan failed')
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Restaurant scan error:', error)
      toast.error(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setRestaurantScanning(false)
      setRestaurantScanProgress(null)
    }
  }
  
  // Restaurant export handlers
  const handleRestaurantExportCurrentView = useCallback(() => {
    setShowRestaurantExportMenu(false)
    if (restaurants.length === 0) {
      toast.error('No hay restaurantes para exportar')
      return
    }
    exportRestaurantLeadsToCsv(restaurants, `restaurant-leads-vista-actual-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success(`Exportados ${restaurants.length} restaurantes`)
  }, [restaurants])
  
  const handleRestaurantExportAll = useCallback(async () => {
    setShowRestaurantExportMenu(false)
    setRestaurantExporting(true)
    try {
      const allRestaurants = await getAllRestaurantLeadsForExport({
        search: restaurantCommittedSearch || undefined,
        hasDiscount: showDiscountOnly,
      })
      if (allRestaurants.length === 0) {
        toast.error('No hay restaurantes para exportar')
        return
      }
      exportRestaurantLeadsToCsv(allRestaurants, `restaurant-leads-todos-${new Date().toISOString().split('T')[0]}.csv`)
      toast.success(`Exportados ${allRestaurants.length} restaurantes`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Error al exportar restaurantes')
    } finally {
      setRestaurantExporting(false)
    }
  }, [restaurantCommittedSearch, showDiscountOnly])
  
  // Handle bulk matching
  const handleBulkMatching = async () => {
    setMatching(true)
    try {
      const result = await runRestaurantBusinessMatching()
      if (result.success && result.data) {
        const { total, matched, updated } = result.data
        if (updated > 0) {
          toast.success(`Encontrados ${matched} de ${total} sin match. ${updated} actualizados.`)
          loadRestaurants()
          loadRestaurantStats()
        } else if (total === 0) {
          toast.success('Todos los restaurantes ya tienen match.')
        } else {
          toast.success(`No se encontraron nuevos matches (${total} sin match)`)
        }
      } else {
        toast.error(result.error || 'Error al buscar matches')
      }
    } catch (error) {
      console.error('Matching error:', error)
      toast.error('Error al buscar matches')
    } finally {
      setMatching(false)
    }
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('eventos')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'eventos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <EventIcon style={{ fontSize: 18 }} />
            Eventos
            {stats && (
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'eventos' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {stats.totalEvents}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('restaurantes')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'restaurantes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <RestaurantIcon style={{ fontSize: 18 }} />
            Restaurantes
            {restaurantStats && (
              <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'restaurantes' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {restaurantStats.totalRestaurants}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Events Tab Content */}
      {activeTab === 'eventos' && (
        <>
      {/* Header with Stats, Search, Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        {/* Stats Row */}
        {stats && (
          <div className="flex items-center gap-4 mb-3 text-[13px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Total:</span>
              <span className="font-medium text-gray-900">{stats.totalEvents}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Active:</span>
              <span className="font-medium text-green-600">{stats.activeEvents}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">New Today:</span>
              <span className="font-medium text-blue-600">{stats.newToday}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Last Scan:</span>
              <span className="font-medium text-gray-700">
                {stats.lastScanAt ? formatCompactDateTime(stats.lastScanAt) : 'Never'}
              </span>
            </div>
          </div>
        )}
        
        {/* Search and Filters Row */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '1rem' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar eventos..."
                className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Buscar
            </Button>
          </form>
          
          {/* Filters */}
          <div className="flex gap-2 items-center flex-wrap">
            {/* Source Site Filter */}
            <select
              value={sourceSite}
              onChange={(e) => { setSourceSite(e.target.value); setPage(1) }}
              className="text-[13px] border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos los Sitios</option>
              <option value="ticketplus">Ticketplus</option>
              <option value="panatickets">Panatickets</option>
              <option value="enlataquilla">En La Taquilla</option>
            </select>
            
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="text-[13px] border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todo Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
            
            {/* New Only Toggle */}
            <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => { setShowNewOnly(e.target.checked); setPage(1) }}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              Nuevos hoy
            </label>
            
            {/* Calendar Button */}
            <Button
              onClick={() => setShowCalendar(true)}
              variant="secondary"
              size="sm"
              leftIcon={<CalendarMonthIcon style={{ fontSize: 14 }} />}
            >
              Calendario
            </Button>
            
            {/* Export Button with Dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                variant="secondary"
                size="sm"
                leftIcon={exporting ? <RefreshIcon className="animate-spin" style={{ fontSize: 14 }} /> : <DownloadIcon style={{ fontSize: 14 }} />}
              >
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
              
              {showExportMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportMenu(false)}
                  />
                  {/* Dropdown menu */}
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <button
                      onClick={handleExportCurrentView}
                      className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-t-md"
                    >
                      Vista actual ({events.length})
                    </button>
                    <button
                      onClick={handleExportAll}
                      className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-b-md border-t border-gray-100"
                    >
                      Todos los datos ({total})
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Scan Button */}
            <Button
              onClick={() => handleScan()}
              disabled={scanning}
              variant="primary"
              size="sm"
              leftIcon={scanning ? <RefreshIcon className="animate-spin" style={{ fontSize: 14 }} /> : <PlayArrowIcon style={{ fontSize: 14 }} />}
            >
              {scanning ? 'Escaneando...' : 'Escanear'}
            </Button>
          </div>
        </div>
        
        {/* Scan Progress */}
        {scanProgress && (
          <div className="mt-3 p-2.5 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-center gap-2">
              <RefreshIcon className="animate-spin text-blue-600" style={{ fontSize: '0.9rem' }} />
              <span className="text-[13px] text-blue-700">
                {scanProgress.message}
                {scanProgress.current && scanProgress.total && (
                  <span className="ml-1">({scanProgress.current}/{scanProgress.total})</span>
                )}
              </span>
            </div>
            {scanProgress.eventName && (
              <div className="text-xs text-blue-600 mt-1 truncate">
                Current: {scanProgress.eventName}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="p-6 text-[13px] text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Cargando...
          </div>
        ) : events.length === 0 ? (
          <EmptyTableState
            icon={<FilterListIcon className="w-full h-full" />}
            title="No se encontraron eventos"
            description={
              committedSearch || sourceSite || showNewOnly
                ? 'Intente ajustar su búsqueda o filtros' 
                : 'Haga clic en "Escanear" para obtener eventos de los sitios de tickets'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            {/* Results count */}
            <div className="text-[13px] text-gray-500 mb-2">
              Mostrando {events.length} de {total} eventos
              {committedSearch && <span className="ml-1">que coinciden con &quot;{committedSearch}&quot;</span>}
            </div>

            <EntityTable
              columns={COLUMNS}
              sortColumn={sortBy}
              sortDirection={sortOrder}
              onSort={handleSort}
            >
              {events.map((event, index) => {
                const parsedDate = parseEventDate(event.eventDate)
                const daysUntil = getDaysUntil(parsedDate)
                const daysDisplay = formatDaysUntil(daysUntil)
                
                return (
                  <TableRow key={event.id} index={index}>
                    <TableCell>
                      <StatusPill 
                        label={getSiteName(event.sourceSite)} 
                        tone={event.sourceSite === 'ticketplus' ? 'info' : 'warning'} 
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {event.imageUrl && (
                          <img 
                            src={event.imageUrl} 
                            alt="" 
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-[13px] truncate max-w-[320px]" title={event.eventName}>
                            {event.eventName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[13px] text-gray-700">
                        {parsedDate ? formatDateSpanish(parsedDate) : (
                          event.eventDate ? (
                            <span className="text-gray-500" title="Formato de fecha no reconocido">{event.eventDate}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[13px] ${daysDisplay.className}`}>
                        {daysDisplay.text}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-[13px] text-gray-600 max-w-[180px] truncate" title={event.eventPlace || undefined}>
                        {event.eventPlace || <span className="text-gray-400">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px]">
                      <PromoterBusinessSelect
                        eventId={event.id}
                        promoterBusinessId={event.promoterBusinessId}
                        promoterBusinessName={event.promoterBusiness?.name ?? null}
                        onSuccess={loadEvents}
                      />
                      {event.promoter && !event.promoterBusiness && (
                        <div className="text-[11px] text-gray-400 truncate mt-0.5" title={event.promoter}>
                          (scraped: {event.promoter})
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-500">
                      {formatCompactDateTime(event.lastScannedAt)}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenBusiness(event)}
                          disabled={loadingBusiness || !event.promoterBusinessId}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            event.promoterBusinessId 
                              ? 'hover:bg-blue-50 text-gray-400 hover:text-blue-600' 
                              : 'text-gray-300 cursor-not-allowed'
                          } ${loadingBusiness ? 'opacity-50' : ''}`}
                          title={event.promoterBusinessId ? 'Ver Negocio' : 'Selecciona un promotor primero'}
                        >
                          <StorefrontIcon style={{ fontSize: '1rem' }} />
                        </button>
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver en sitio"
                        >
                          <OpenInNewIcon style={{ fontSize: '1rem' }} />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </EntityTable>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                <div className="text-[13px] text-gray-500">
                  Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    variant="secondary"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    variant="secondary"
                    size="sm"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Calendar Modal */}
      <ModalShell
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        title="Calendario de Eventos"
        icon={<CalendarMonthIcon style={{ fontSize: 18 }} />}
        iconColor="blue"
        maxWidth="4xl"
        autoHeight
      >
        <CalendarView 
          events={events}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          parseEventDate={parseEventDate}
        />
      </ModalShell>
        </>
      )}
      
      {/* Restaurants Tab Content */}
      {activeTab === 'restaurantes' && (
        <>
          {/* Restaurant Header with Stats, Search, Filters */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            {/* Restaurant Stats Row */}
            {restaurantStats && (
              <div className="flex items-center gap-4 mb-3 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium text-gray-900">{restaurantStats.totalRestaurants}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Con Descuento:</span>
                  <span className="font-medium text-green-600">{restaurantStats.withDiscount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Nuevos Hoy:</span>
                  <span className="font-medium text-blue-600">{restaurantStats.newToday}</span>
                </div>
                {restaurantStats.avgFoodRating && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">Rating Promedio:</span>
                    <span className="font-medium text-yellow-600 flex items-center gap-0.5">
                      <StarIcon style={{ fontSize: 14 }} />
                      {restaurantStats.avgFoodRating.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Último Scan:</span>
                  <span className="font-medium text-gray-700">
                    {restaurantStats.lastScanAt ? formatCompactDateTime(restaurantStats.lastScanAt) : 'Nunca'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Restaurant Search and Filters Row */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              {/* Search */}
              <form onSubmit={handleRestaurantSearch} className="flex gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '1rem' }} />
                  <input
                    type="text"
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    placeholder="Buscar restaurantes..."
                    className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>
              
              {/* Restaurant Filters */}
              <div className="flex gap-2 items-center flex-wrap">
                {/* Discount Only Toggle */}
                <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDiscountOnly}
                    onChange={(e) => { setShowDiscountOnly(e.target.checked); setRestaurantPage(1) }}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  Con descuento
                </label>
                
                {/* New Only Toggle */}
                <label className="flex items-center gap-1.5 text-[13px] text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRestaurantNewOnly}
                    onChange={(e) => { setShowRestaurantNewOnly(e.target.checked); setRestaurantPage(1) }}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  Nuevos hoy
                </label>
                
                {/* Restaurant Export Button with Dropdown */}
                <div className="relative">
                  <Button
                    onClick={() => setShowRestaurantExportMenu(!showRestaurantExportMenu)}
                    disabled={restaurantExporting}
                    variant="secondary"
                    size="sm"
                    leftIcon={restaurantExporting ? <RefreshIcon className="animate-spin" style={{ fontSize: 14 }} /> : <DownloadIcon style={{ fontSize: 14 }} />}
                  >
                    {restaurantExporting ? 'Exportando...' : 'Exportar'}
                  </Button>
                  
                  {showRestaurantExportMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowRestaurantExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                        <button
                          onClick={handleRestaurantExportCurrentView}
                          className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-t-md"
                        >
                          Vista actual ({restaurants.length})
                        </button>
                        <button
                          onClick={handleRestaurantExportAll}
                          className="w-full text-left px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 rounded-b-md border-t border-gray-100"
                        >
                          Todos los datos ({restaurantTotal})
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Match Button */}
                <Button
                  onClick={handleBulkMatching}
                  disabled={matching || restaurantScanning}
                  variant="secondary"
                  size="sm"
                  leftIcon={matching ? <RefreshIcon className="animate-spin" style={{ fontSize: 14 }} /> : <LinkIcon style={{ fontSize: 14 }} />}
                >
                  {matching ? 'Buscando...' : 'Buscar Matches'}
                </Button>
                
                {/* Scan Button */}
                <Button
                  onClick={handleRestaurantScan}
                  disabled={restaurantScanning || matching}
                  variant="primary"
                  size="sm"
                  leftIcon={restaurantScanning ? <RefreshIcon className="animate-spin" style={{ fontSize: 14 }} /> : <PlayArrowIcon style={{ fontSize: 14 }} />}
                >
                  {restaurantScanning ? 'Escaneando...' : 'Escanear'}
                </Button>
              </div>
            </div>
            
            {/* Restaurant Scan Progress */}
            {restaurantScanProgress && (
              <div className="mt-3 p-2.5 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2">
                  <RefreshIcon className="animate-spin text-blue-600" style={{ fontSize: '0.9rem' }} />
                  <span className="text-[13px] text-blue-700">
                    {restaurantScanProgress.message}
                    {restaurantScanProgress.current && restaurantScanProgress.total && (
                      <span className="ml-1">({restaurantScanProgress.current}/{restaurantScanProgress.total})</span>
                    )}
                  </span>
                </div>
                {restaurantScanProgress.restaurantName && (
                  <div className="text-xs text-blue-600 mt-1 truncate">
                    Current: {restaurantScanProgress.restaurantName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Restaurant Content */}
          <div className="flex-1 overflow-auto p-4">
            {restaurantLoading ? (
              <div className="p-6 text-[13px] text-gray-500 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                Cargando...
              </div>
            ) : restaurants.length === 0 ? (
              <EmptyTableState
                icon={<RestaurantIcon className="w-full h-full" />}
                title="No se encontraron restaurantes"
                description={
                  restaurantCommittedSearch || showRestaurantNewOnly
                    ? 'Intente ajustar su búsqueda o filtros' 
                    : 'Haga clic en "Escanear" para obtener restaurantes de Degusta'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                {/* Results count */}
                <div className="text-[13px] text-gray-500 mb-2">
                  Mostrando {restaurants.length} de {restaurantTotal} restaurantes
                  {restaurantCommittedSearch && <span className="ml-1">que coinciden con &quot;{restaurantCommittedSearch}&quot;</span>}
                </div>

                <EntityTable
                  columns={RESTAURANT_COLUMNS}
                  sortColumn={restaurantSortBy}
                  sortDirection={restaurantSortOrder}
                  onSort={handleRestaurantSort}
                >
                  {restaurants.map((restaurant, index) => (
                    <TableRow key={restaurant.id} index={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {restaurant.imageUrl && (
                            <img 
                              src={restaurant.imageUrl} 
                              alt="" 
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-[13px] truncate max-w-[250px]" title={restaurant.name}>
                              {restaurant.name}
                            </div>
                            {restaurant.isNew && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                                Nuevo
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RestaurantBusinessSelect
                          restaurantId={restaurant.id}
                          matchedBusinessId={restaurant.matchedBusinessId}
                          matchedBusinessName={restaurant.matchedBusiness?.name || null}
                          matchConfidence={restaurant.matchConfidence}
                          onSuccess={loadRestaurants}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-[13px] text-gray-600 truncate max-w-[100px]" title={restaurant.cuisine || undefined}>
                          {restaurant.cuisine || <span className="text-gray-400">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {restaurant.discount ? (
                          <StatusPill label={restaurant.discount} tone="success" />
                        ) : (
                          <span className="text-gray-400 text-[13px]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-700 font-medium">
                          {restaurant.pricePerPerson ? `$${restaurant.pricePerPerson}` : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {restaurant.foodRating ? (
                          <span className="text-[13px] text-yellow-600 font-medium flex items-center gap-0.5">
                            <StarIcon style={{ fontSize: 12 }} />
                            {restaurant.foodRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[13px]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-[13px] text-gray-600">
                          {restaurant.votes ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-[13px] text-gray-500">
                        {formatCompactDateTime(restaurant.lastScannedAt)}
                      </TableCell>
                      <TableCell align="center">
                        <div className="flex items-center gap-0.5">
                          {restaurant.matchedBusinessId && (
                            <a
                              href={`/businesses/${restaurant.matchedBusinessId}`}
                              className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-green-50 text-green-500 hover:text-green-700 transition-colors"
                              title="Ver Negocio"
                            >
                              <StorefrontIcon style={{ fontSize: '1rem' }} />
                            </a>
                          )}
                          <a
                            href={restaurant.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Ver en Degusta"
                          >
                            <OpenInNewIcon style={{ fontSize: '1rem' }} />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </EntityTable>
                
                {/* Restaurant Pagination */}
                {restaurantTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                    <div className="text-[13px] text-gray-500">
                      Página {restaurantPage} de {restaurantTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setRestaurantPage(p => Math.max(1, p - 1))}
                        disabled={restaurantPage === 1 || restaurantLoading}
                        variant="secondary"
                        size="sm"
                      >
                        Anterior
                      </Button>
                      <Button
                        onClick={() => setRestaurantPage(p => Math.min(restaurantTotalPages, p + 1))}
                        disabled={restaurantPage === restaurantTotalPages || restaurantLoading}
                        variant="secondary"
                        size="sm"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Business Modal */}
      {businessModalOpen && selectedBusiness && (
        <BusinessFormModal
          isOpen={businessModalOpen}
          onClose={handleBusinessModalClose}
          business={selectedBusiness}
          onSuccess={handleBusinessSuccess}
        />
      )}
    </div>
  )
}

// Calendar View Component
interface CalendarViewProps {
  events: EventLeadWithStats[]
  month: Date
  onMonthChange: (date: Date) => void
  parseEventDate: (rawDate: string | null) => Date | null
}

function CalendarView({ events, month, onMonthChange, parseEventDate }: CalendarViewProps) {
  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  
  // Get first day of month and total days
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()
  
  // Group events by date
  const eventsByDate = new Map<string, EventLeadWithStats[]>()
  events.forEach(event => {
    const date = parseEventDate(event.eventDate)
    if (date && 
        date.getMonth() === month.getMonth() && 
        date.getFullYear() === month.getFullYear()) {
      const key = date.getDate().toString()
      const existing = eventsByDate.get(key) || []
      eventsByDate.set(key, [...existing, event])
    }
  })
  
  // Navigate months
  const prevMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))
  }
  const goToday = () => {
    const now = new Date()
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  
  // Check if day is today
  const today = new Date()
  const isToday = (day: number) => 
    today.getDate() === day && 
    today.getMonth() === month.getMonth() && 
    today.getFullYear() === month.getFullYear()
  
  // Build calendar grid (6 weeks max)
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  
  // Fill empty cells before first day
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null)
  }
  
  // Fill days
  for (let day = 1; day <= totalDays; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  
  // Fill remaining cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }
  
  return (
    <div className="p-4">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon style={{ fontSize: 20 }} className="text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {MONTH_NAMES_FULL[month.getMonth()]} {month.getFullYear()}
          </h3>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon style={{ fontSize: 20 }} className="text-gray-600" />
          </button>
        </div>
        <Button onClick={goToday} variant="ghost" size="sm">
          Hoy
        </Button>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {DAY_NAMES.map(day => (
          <div key={day} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {weeks.map((week, weekIndex) => 
          week.map((day, dayIndex) => {
            const dayEvents = day ? eventsByDate.get(day.toString()) || [] : []
            
            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`bg-white min-h-[90px] p-1.5 ${
                  day === null ? 'bg-gray-50' : ''
                }`}
              >
                {day !== null && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) 
                        ? 'w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full' 
                        : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[60px]">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <a
                          key={i}
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block text-[10px] leading-tight truncate px-1.5 py-0.5 rounded ${
                            event.sourceSite === 'ticketplus' 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                          title={event.eventName}
                        >
                          {event.eventName}
                        </a>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-gray-500 px-1">
                          +{dayEvents.length - 3} más
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span>
          Ticketplus
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span>
          Panatickets
        </div>
        <div className="text-gray-400 ml-auto">
          {eventsByDate.size > 0 
            ? `${Array.from(eventsByDate.values()).flat().length} eventos en ${eventsByDate.size} días`
            : 'No hay eventos este mes'
          }
        </div>
      </div>
    </div>
  )
}
