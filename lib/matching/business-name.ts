/**
 * Business Name Matching (generic)
 *
 * Matches a lead name (e.g. from Degusta, Banco General, event leads) to existing
 * businesses in the database. Uses fuzzy matching with parent name extraction
 * for multi-location or suffixed names. Reusable across restaurant leads, bank
 * promos, and any other source that has a "business name" to link.
 */

import { prisma } from '@/lib/prisma'

export interface MatchResult {
  businessId: string
  businessName: string
  confidence: number // 0-1
}

/**
 * Extract base/parent name from a display name
 * e.g. "Sugoi (Condado del Rey)" -> "Sugoi"
 * e.g. "La Rana Dorada - Casco Viejo" -> "La Rana Dorada"
 */
export function extractBaseName(name: string): string {
  let baseName = name.replace(/\s*\([^)]*\)\s*$/, '')
  baseName = baseName.replace(/\s*-\s*[^-]+$/, '')
  baseName = baseName.replace(/\s*@\s*.+$/, '')
  return baseName.trim()
}

/**
 * Normalize a name for comparison (lowercase, no accents, alphanumeric + spaces)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Similarity score between two strings (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1)
  const norm2 = normalizeName(str2)
  if (norm1 === norm2) return 1
  if (norm1.length === 0 || norm2.length === 0) return 0
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2
    const longer = norm1.length < norm2.length ? norm2 : norm1
    return 0.7 + (0.3 * shorter.length) / longer.length
  }
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  return 1 - distance / maxLength
}

/**
 * Find the best matching business for a given name (any source).
 *
 * @param name - Display name (e.g. from Degusta, Banco General)
 * @param minConfidence - Minimum confidence threshold (default 0.8)
 */
export async function findMatchingBusiness(
  name: string,
  minConfidence: number = 0.8
): Promise<MatchResult | null> {
  const baseName = extractBaseName(name)
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true },
  })

  let bestMatch: MatchResult | null = null
  for (const business of businesses) {
    const fullSimilarity = calculateSimilarity(name, business.name)
    const baseSimilarity = calculateSimilarity(baseName, business.name)
    const businessBaseName = extractBaseName(business.name)
    const baseToBaseSimilarity = calculateSimilarity(baseName, businessBaseName)
    const similarity = Math.max(fullSimilarity, baseSimilarity, baseToBaseSimilarity)

    if (similarity >= minConfidence) {
      if (!bestMatch || similarity > bestMatch.confidence) {
        bestMatch = {
          businessId: business.id,
          businessName: business.name,
          confidence: similarity,
        }
      }
    }
  }
  return bestMatch
}

/**
 * Find matches for multiple names in batch (one DB read for all businesses).
 */
export async function findMatchingBusinessesBatch(
  items: { id: string; name: string }[],
  minConfidence: number = 0.8
): Promise<Map<string, MatchResult>> {
  const businesses = await prisma.business.findMany({
    select: { id: true, name: true },
  })
  const results = new Map<string, MatchResult>()

  for (const item of items) {
    const baseName = extractBaseName(item.name)
    let bestMatch: MatchResult | null = null
    for (const business of businesses) {
      const fullSimilarity = calculateSimilarity(item.name, business.name)
      const baseSimilarity = calculateSimilarity(baseName, business.name)
      const businessBaseName = extractBaseName(business.name)
      const baseToBaseSimilarity = calculateSimilarity(baseName, businessBaseName)
      const similarity = Math.max(fullSimilarity, baseSimilarity, baseToBaseSimilarity)
      if (similarity >= minConfidence) {
        if (!bestMatch || similarity > bestMatch.confidence) {
          bestMatch = {
            businessId: business.id,
            businessName: business.name,
            confidence: similarity,
          }
        }
      }
    }
    if (bestMatch) results.set(item.id, bestMatch)
  }
  return results
}
