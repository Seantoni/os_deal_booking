import { useMemo } from 'react'

type DegustaMetrics = {
  foodRating: number | null
  votes: number | null
  pricePerPerson: number | null
}

/**
 * Compute a business tier (1–3) from Degusta restaurant metrics.
 *
 * Tier 1 — Proven premium: high food rating backed by strong review volume and higher price.
 * Tier 2 — Solid mid-range: good food rating with enough reviews to be trustworthy.
 * Tier 3 — Everything else (new, low-data, or lower quality).
 *
 * Thresholds:
 *   Tier 1: foodRating >= 4.5  AND  votes >= 200  AND  pricePerPerson >= 20
 *   Tier 2: foodRating >= 4.0  AND  votes >= 50
 *   Tier 3: fallback
 */
export function computeDegustaTier(metrics: DegustaMetrics): '1' | '2' | '3' {
  const { foodRating, votes, pricePerPerson } = metrics

  if (
    foodRating !== null && foodRating >= 4.5 &&
    votes !== null && votes >= 200 &&
    pricePerPerson !== null && pricePerPerson >= 20
  ) {
    return '1'
  }

  if (
    foodRating !== null && foodRating >= 4.0 &&
    votes !== null && votes >= 50
  ) {
    return '2'
  }

  return '3'
}

/**
 * React hook wrapper — memoises the tier computation.
 */
export function useDegustaTier(metrics: DegustaMetrics): '1' | '2' | '3' {
  return useMemo(
    () => computeDegustaTier(metrics),
    [metrics.foodRating, metrics.votes, metrics.pricePerPerson],
  )
}
