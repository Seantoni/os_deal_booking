/**
 * Shared HTTP utilities for External Oferta API
 * Error handling, validation formatting, and common utilities
 */

/**
 * Safely stringify a value with max length
 */
export function safeStringify(value: unknown, maxLen: number = 1500): string {
  try {
    const s = JSON.stringify(value)
    return s.length > maxLen ? s.slice(0, maxLen) + '…' : s
  } catch {
    return String(value)
  }
}

/**
 * API error response shape from external API
 */
export interface ApiErrorResponse {
  errors?: unknown
  error?: { errors?: unknown } | string
  validation?: unknown
  detail?: unknown
  details?: unknown
  data?: { errors?: unknown }
  message?: string
}

/**
 * Format validation error from external API response
 * Handles various error response formats from the external API
 */
export function formatValidationError(responseData: unknown, responseText: string): string {
  const data = (responseData ?? {}) as ApiErrorResponse

  const candidates = [
    data?.errors,
    typeof data?.error === 'object' ? data?.error?.errors : undefined,
    data?.validation,
    data?.detail,
    data?.details,
    data?.data?.errors,
    data?.message,
    data?.error,
  ]

  const first = candidates.find((v) => v !== undefined && v !== null)

  if (Array.isArray(first)) {
    return `Validation failed: ${first.map(String).join(', ')}`
  }

  if (first && typeof first === 'object') {
    const entries = Object.entries(first as Record<string, unknown>)
    const formatted = entries
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.map(String).join(', ') : String(v)}`)
      .join('; ')
    return `Validation failed: ${formatted || safeStringify(first)}`
  }

  if (typeof first === 'string' && first.trim() && first.trim().toLowerCase() !== 'validation failed') {
    return `Validation failed: ${first}`
  }

  // Last resort: include a snippet of the raw body so we can see what the API returned.
  const rawSnippet = responseText.length > 1000 ? responseText.slice(0, 1000) + '…' : responseText
  return `Validation failed (raw): ${rawSnippet || safeStringify(data)}`
}

/**
 * Check if API token is configured
 */
export function isApiConfigured(token: string | undefined): token is string {
  return !!token
}

/**
 * Common trigger types for API calls
 */
export type TriggerType = 'manual' | 'cron' | 'webhook' | 'system'
