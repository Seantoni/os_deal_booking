/**
 * Event Leads CSV Export Configuration
 */

import type { EventLeadWithStats } from '@/app/actions/event-leads'
import { generateCsv, downloadCsv, formatDateForCsv, generateFilename } from '@/lib/utils/csv-export'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date'

// Spanish month names for date parsing
const MONTH_TO_NUM: Record<string, number> = {
  'ENE': 0, 'FEB': 1, 'MAR': 2, 'ABR': 3, 'MAY': 4, 'JUN': 5,
  'JUL': 6, 'AGO': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DIC': 11,
  'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5,
  'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11,
}

/**
 * Parse raw date string into a Date object
 */
function parseEventDate(rawDate: string | null): Date | null {
  if (!rawDate) return null
  
  const normalized = rawDate.trim()
  
  // Pattern 1: Full date with year like "Jueves 14 may 2026" or "14 mayo 2026"
  const fullDateMatch = normalized.match(/(?:\w+\s+)?(\d{1,2})\s+(ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?)\s+(\d{4})/i)
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10)
    const monthStr = fullDateMatch[2].toUpperCase()
    const year = parseInt(fullDateMatch[3], 10)
    
    let monthNum = MONTH_TO_NUM[monthStr]
    if (monthNum === undefined) {
      const abbr = monthStr.substring(0, 3)
      monthNum = MONTH_TO_NUM[abbr]
    }
    
    if (monthNum !== undefined) {
      return new Date(year, monthNum, day)
    }
  }
  
  // Pattern 2: Day + abbreviated month like "27 FEB", "9 ABR"
  const shortMatch = normalized.match(/(\d{1,2})\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i)
  if (shortMatch) {
    const day = parseInt(shortMatch[1], 10)
    const monthKey = shortMatch[2].toUpperCase()
    const monthNum = MONTH_TO_NUM[monthKey]
    
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
  
  // Pattern 3: Date range like "ENE - MAR" - use first month
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
 * Calculate days until an event date
 */
function getDaysUntil(date: Date | null): number | null {
  if (!date) return null
  
  const todayStr = getTodayInPanama()
  const eventDateStr = formatDateForPanama(date)
  
  const todayParts = todayStr.split('-').map(Number)
  const eventParts = eventDateStr.split('-').map(Number)
  
  const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
  const eventDate = new Date(eventParts[0], eventParts[1] - 1, eventParts[2])
  
  const diffTime = eventDate.getTime() - todayDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// CSV column configuration for export
export const CSV_EXPORT_COLUMNS = [
  { key: 'id', label: 'ID', getValue: (e: EventLeadWithStats) => e.id },
  { key: 'sourceSite', label: 'Fuente', getValue: (e: EventLeadWithStats) => e.sourceSite },
  { key: 'eventName', label: 'Nombre del Evento', getValue: (e: EventLeadWithStats) => e.eventName },
  { key: 'eventDate', label: 'Fecha del Evento', getValue: (e: EventLeadWithStats) => e.eventDate || '' },
  { key: 'daysUntil', label: 'Días para Evento', getValue: (e: EventLeadWithStats) => {
    const parsedDate = parseEventDate(e.eventDate)
    const days = getDaysUntil(parsedDate)
    return days !== null ? days : ''
  }},
  { key: 'eventPlace', label: 'Lugar', getValue: (e: EventLeadWithStats) => e.eventPlace || '' },
  { key: 'promoter', label: 'Promotor', getValue: (e: EventLeadWithStats) => e.promoter || '' },
  { key: 'status', label: 'Status', getValue: (e: EventLeadWithStats) => e.status },
  { key: 'sourceUrl', label: 'URL', getValue: (e: EventLeadWithStats) => e.sourceUrl },
  { key: 'firstSeenAt', label: 'Primera Vez Visto', getValue: (e: EventLeadWithStats) => formatDateForCsv(e.firstSeenAt) },
  { key: 'lastScannedAt', label: 'Última Actualización', getValue: (e: EventLeadWithStats) => formatDateForCsv(e.lastScannedAt) },
]

/**
 * Export event leads to CSV file
 */
export function exportEventLeadsToCsv(events: EventLeadWithStats[], filename?: string): number {
  const csvContent = generateCsv(events, CSV_EXPORT_COLUMNS)
  downloadCsv(csvContent, filename || generateFilename('event-leads'))
  return events.length
}
