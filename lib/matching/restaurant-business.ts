/**
 * Restaurant-Business Fuzzy Matching
 * 
 * Matches restaurant names from Degusta to existing businesses in the database.
 * Uses fuzzy matching with parent name extraction for multi-location restaurants.
 */

import { prisma } from '@/lib/prisma'

interface MatchResult {
  businessId: string
  businessName: string
  confidence: number // 0-1
}

/**
 * Extract base/parent name from restaurant name
 * e.g., "Sugoi (Condado del Rey)" -> "Sugoi"
 * e.g., "La Rana Dorada - Casco Viejo" -> "La Rana Dorada"
 */
export function extractBaseName(name: string): string {
  // Remove text in parentheses (location suffix)
  let baseName = name.replace(/\s*\([^)]*\)\s*$/, '')
  
  // Remove text after dash (another location pattern)
  baseName = baseName.replace(/\s*-\s*[^-]+$/, '')
  
  // Remove text after " @ " (another location pattern)
  baseName = baseName.replace(/\s*@\s*.+$/, '')
  
  // Trim and normalize whitespace
  return baseName.trim()
}

/**
 * Normalize a name for comparison
 * Lowercase, remove special characters, normalize whitespace
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric and spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance normalized by max length
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeName(str1)
  const norm2 = normalizeName(str2)
  
  if (norm1 === norm2) return 1
  if (norm1.length === 0 || norm2.length === 0) return 0
  
  // Check if one contains the other (high confidence)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2
    const longer = norm1.length < norm2.length ? norm2 : norm1
    // Bonus for containment, scaled by how much of the longer string is covered
    return 0.7 + (0.3 * shorter.length / longer.length)
  }
  
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)
  
  return 1 - (distance / maxLength)
}

/**
 * Find the best matching business for a restaurant name
 * 
 * @param restaurantName - Full name from Degusta (e.g., "Sugoi (Condado del Rey)")
 * @param minConfidence - Minimum confidence threshold (default 0.8)
 * @returns Best match or null if none found above threshold
 */
export async function findMatchingBusiness(
  restaurantName: string,
  minConfidence: number = 0.8
): Promise<MatchResult | null> {
  // Extract base name for parent matching
  const baseName = extractBaseName(restaurantName)
  
  // Get all businesses (we could optimize with search if too many)
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
    },
  })
  
  let bestMatch: MatchResult | null = null
  
  for (const business of businesses) {
    // Try matching full name first
    const fullSimilarity = calculateSimilarity(restaurantName, business.name)
    
    // Try matching base name (for multi-location restaurants)
    const baseSimilarity = calculateSimilarity(baseName, business.name)
    
    // Also try extracting base name from business
    const businessBaseName = extractBaseName(business.name)
    const baseToBaseSimilarity = calculateSimilarity(baseName, businessBaseName)
    
    // Take the best similarity
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
 * Find matches for multiple restaurant names in batch
 * More efficient than calling findMatchingBusiness one by one
 */
export async function findMatchingBusinessesBatch(
  restaurantNames: { id: string; name: string }[],
  minConfidence: number = 0.8
): Promise<Map<string, MatchResult>> {
  // Get all businesses once
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
    },
  })
  
  const results = new Map<string, MatchResult>()
  
  for (const restaurant of restaurantNames) {
    const baseName = extractBaseName(restaurant.name)
    let bestMatch: MatchResult | null = null
    
    for (const business of businesses) {
      const fullSimilarity = calculateSimilarity(restaurant.name, business.name)
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
    
    if (bestMatch) {
      results.set(restaurant.id, bestMatch)
    }
  }
  
  return results
}

/**
 * Run matching for all unmatched restaurant leads
 * Returns count of matches found
 */
export async function runBulkMatching(minConfidence: number = 0.8): Promise<{
  total: number
  matched: number
  updated: number
}> {
  // Get all unmatched restaurant leads
  const unmatched = await prisma.restaurantLead.findMany({
    where: {
      matchedBusinessId: null,
    },
    select: {
      id: true,
      name: true,
    },
  })
  
  if (unmatched.length === 0) {
    return { total: 0, matched: 0, updated: 0 }
  }
  
  // Find matches
  const matches = await findMatchingBusinessesBatch(unmatched, minConfidence)
  
  // Update matched leads
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
