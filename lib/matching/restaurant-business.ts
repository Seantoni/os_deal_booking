/**
 * Restaurant-Business Matching (Degusta)
 *
 * Matches restaurant names from Degusta to existing businesses. Uses the shared
 * business-name matching logic; this module adds the RestaurantLead-specific
 * bulk run and re-exports the generic APIs for backward compatibility.
 */

import { prisma } from '@/lib/prisma'
import {
  extractBaseName,
  normalizeName,
  calculateSimilarity,
  findMatchingBusiness as findMatchingBusinessCore,
  findMatchingBusinessesBatch,
  type MatchResult,
} from './business-name'

export type { MatchResult }
export { extractBaseName, normalizeName, calculateSimilarity, findMatchingBusinessesBatch }

/**
 * Find the best matching business for a restaurant name (Degusta or other).
 * Re-export of generic findMatchingBusiness with same signature.
 */
export const findMatchingBusiness = findMatchingBusinessCore

/**
 * Run matching for all unmatched restaurant leads; updates DB.
 */
export async function runBulkMatching(minConfidence: number = 0.8): Promise<{
  total: number
  matched: number
  updated: number
}> {
  const unmatched = await prisma.restaurantLead.findMany({
    where: { matchedBusinessId: null },
    select: { id: true, name: true },
  })
  if (unmatched.length === 0) {
    return { total: 0, matched: 0, updated: 0 }
  }
  const matches = await findMatchingBusinessesBatch(unmatched, minConfidence)
  let updated = 0
  for (const [restaurantId, match] of matches) {
    await prisma.restaurantLead.update({
      where: { id: restaurantId },
      data: {
        matchedBusinessId: match.businessId,
        matchConfidence: match.confidence,
      },
    })
    updated++
  }
  return {
    total: unmatched.length,
    matched: matches.size,
    updated,
  }
}
