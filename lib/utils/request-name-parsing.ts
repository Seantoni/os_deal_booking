/**
 * Pure helpers for booking request name parsing/formatting.
 * Safe for both client and server usage.
 */

/**
 * Extract business name from a formatted request name.
 * Handles both formats: "Business Name" and "Business Name | Date | #Number"
 */
export function extractBusinessName(name: string): string {
  const parts = name.split(' | ')
  return parts[0].trim()
}

/**
 * Extract request number from a formatted request name.
 * Example: "Business | Dec-15-2025 | #3" -> 3
 */
export function extractRequestNumber(name: string): number | null {
  const match = name.match(/#(\d+)\s*$/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

/**
 * Build event name for booking-linked events:
 * "Business - RequestNumber - First Option Title"
 */
export function buildEventNameFromBookingRequest(input: {
  requestName: string
  merchant?: string | null
  pricingOptions?: unknown
}): string {
  const baseBusiness = (input.merchant || '').trim() || extractBusinessName(input.requestName || '')
  const requestNumber = extractRequestNumber(input.requestName || '')

  let firstOptionTitle = ''
  if (Array.isArray(input.pricingOptions) && input.pricingOptions.length > 0) {
    const first = input.pricingOptions[0] as { title?: unknown } | null
    const maybeTitle = typeof first?.title === 'string' ? first.title.trim() : ''
    firstOptionTitle = maybeTitle
  }

  const parts = [baseBusiness]
  if (requestNumber !== null) parts.push(String(requestNumber))
  if (firstOptionTitle) parts.push(firstOptionTitle)

  return parts.filter(Boolean).join(' - ')
}
