export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function normalizeDisplayName(name: string | null, email: string | null, userId: string): string {
  if (name && name.trim()) return name.trim()
  if (email && email.trim()) return email.trim()
  return `Usuario ${userId.slice(0, 8)}`
}

// ---------------------------------------------------------------------------
// Objection category types (shared between admin action + modal)
// ---------------------------------------------------------------------------

export interface ObjectionCategory {
  category: string
  count: number
  examples: string[]
}

// ---------------------------------------------------------------------------
// In-memory daily cache for AI results (one call per date key, survives
// across requests within the same server instance).
// ---------------------------------------------------------------------------

const aiCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export function getCachedAiResult<T>(key: string): T | null {
  const entry = aiCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    aiCache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCachedAiResult(key: string, data: unknown): void {
  // Evict stale entries to prevent unbounded growth.
  for (const [k, v] of aiCache) {
    if (Date.now() - v.ts > CACHE_TTL_MS) aiCache.delete(k)
  }
  aiCache.set(key, { data, ts: Date.now() })
}
