export const PENDING_COMMENT_CLOSED_MARKER = '__pending_comment_closed__'
export const THREAD_RESOLVED_MARKER = '__thread_resolved__'

export function normalizeDismissedBy(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : []
}

export function addDismissedByValues(current: unknown, valuesToAdd: string[]): string[] {
  const existing = normalizeDismissedBy(current)
  return Array.from(new Set([...existing, ...valuesToAdd]))
}

export function hasPendingCommentClosedMarker(value: unknown): boolean {
  return normalizeDismissedBy(value).includes(PENDING_COMMENT_CLOSED_MARKER)
}

export function hasThreadResolvedMarker(value: unknown): boolean {
  return normalizeDismissedBy(value).includes(THREAD_RESOLVED_MARKER)
}
