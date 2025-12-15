/**
 * Centralized date formatting utilities
 * Ensures consistent date display across the application
 */

/**
 * Format date for request names: "Dec-15-2025"
 */
export function formatRequestNameDate(date: Date = new Date()): string {
  return date
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .replace(',', '')
    .split(' ')
    .join('-')
}

/**
 * Format date as short display: "Dec 15, 2025"
 */
export function formatShortDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date as compact: "Dec 15"
 */
export function formatCompactDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format date as full: "December 15, 2025"
 */
export function formatFullDate(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format date as ISO: "2025-12-15"
 */
export function formatISODate(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  return d.toISOString().split('T')[0]
}

/**
 * Format date with time: "Dec 15, 2025 at 3:30 PM"
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ' at')
}

/**
 * Format as relative time: "2 days ago", "in 3 hours", etc.
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  const isFuture = diffMs < 0
  const absDiffMins = Math.abs(diffMins)
  const absDiffHours = Math.abs(diffHours)
  const absDiffDays = Math.abs(diffDays)
  
  if (Math.abs(diffSecs) < 60) {
    return 'just now'
  }
  
  if (absDiffMins < 60) {
    const unit = absDiffMins === 1 ? 'minute' : 'minutes'
    return isFuture ? `in ${absDiffMins} ${unit}` : `${absDiffMins} ${unit} ago`
  }
  
  if (absDiffHours < 24) {
    const unit = absDiffHours === 1 ? 'hour' : 'hours'
    return isFuture ? `in ${absDiffHours} ${unit}` : `${absDiffHours} ${unit} ago`
  }
  
  if (absDiffDays < 7) {
    const unit = absDiffDays === 1 ? 'day' : 'days'
    return isFuture ? `in ${absDiffDays} ${unit}` : `${absDiffDays} ${unit} ago`
  }
  
  if (absDiffDays < 30) {
    const weeks = Math.floor(absDiffDays / 7)
    const unit = weeks === 1 ? 'week' : 'weeks'
    return isFuture ? `in ${weeks} ${unit}` : `${weeks} ${unit} ago`
  }
  
  // For dates older than a month, show the actual date
  return formatShortDate(d)
}

/**
 * Calculate days since a date
 */
export function daysSince(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  
  const now = new Date()
  const diffTime = now.getTime() - d.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days until a date
 */
export function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  
  const now = new Date()
  const diffTime = d.getTime() - now.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format a date range: "Dec 15 - Dec 20, 2025" or "Dec 15, 2025 - Jan 5, 2026"
 */
export function formatDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null
): string {
  if (!startDate && !endDate) return '—'
  if (!startDate) return `Until ${formatShortDate(endDate)}`
  if (!endDate) return `From ${formatShortDate(startDate)}`
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—'
  
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  
  if (sameMonth) {
    // "Dec 15 - 20, 2025"
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`
  }
  
  if (sameYear) {
    // "Dec 15 - Jan 5, 2025"
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`
  }
  
  // "Dec 15, 2025 - Jan 5, 2026"
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
}

