'use server'

import { getOpenAIClient } from '@/lib/openai'

const IG_SEARCH_STOP_WORDS = new Set([
  'bar',
  'cafe',
  'car',
  'cars',
  'club',
  'coffee',
  'dealership',
  'grill',
  'group',
  'hotel',
  'panama',
  'panamá',
  'pty',
  'rental',
  'rent',
  'rentals',
  'restaurant',
  'restaurante',
])

function extractDomainHint(website?: string | null): string | null {
  if (!website) return null

  try {
    const url = website.startsWith('http') ? new URL(website) : new URL(`https://${website}`)
    return url.hostname.replace(/^www\./i, '')
  } catch {
    return null
  }
}

function buildSearchVariants(
  businessName: string,
  neighborhood?: string | null,
  website?: string | null,
): string[] {
  const normalizedName = businessName.trim()
  const normalizedNeighborhood = neighborhood?.trim() || ''
  const domainHint = extractDomainHint(website)
  const variants = new Set<string>([
    `"${normalizedName}" Instagram Panamá`,
    `"${normalizedName}" Instagram PTY`,
    `"${normalizedName}" Panamá`,
    `"${normalizedName}" PTY`,
  ])

  const brandTokens = normalizedName
    .split(/[\s/&(),.-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !IG_SEARCH_STOP_WORDS.has(token.toLowerCase()))

  const brandName = brandTokens.join(' ').trim()
  if (brandName && brandName.toLowerCase() !== normalizedName.toLowerCase()) {
    variants.add(`"${brandName}" Instagram Panamá`)
    variants.add(`"${brandName}" Instagram PTY`)
    variants.add(`"${brandName}" Panamá`)
    variants.add(`"${brandName}" PTY`)
  }

  if (normalizedNeighborhood) {
    variants.add(`"${normalizedName}" Instagram ${normalizedNeighborhood} Panamá`)
    if (brandName) {
      variants.add(`"${brandName}" Instagram ${normalizedNeighborhood} Panamá`)
    }
  }

  if (domainHint) {
    variants.add(`site:instagram.com "${domainHint}"`)
    variants.add(`"${normalizedName}" "${domainHint}" Instagram`)
    if (brandName) {
      variants.add(`"${brandName}" "${domainHint}" Instagram`)
    }
  }

  return [...variants]
}

function normalizeCompactToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function buildHandleCandidates(
  businessName: string,
  neighborhood?: string | null,
): string[] {
  const normalizedName = businessName.trim()
  const normalizedNeighborhood = neighborhood?.trim() || ''
  const brandTokens = normalizedName
    .split(/[\s/&(),.-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !IG_SEARCH_STOP_WORDS.has(token.toLowerCase()))

  const brandName = brandTokens.join(' ').trim()
  const compactBases = new Set<string>([
    normalizeCompactToken(normalizedName),
    normalizeCompactToken(brandName),
  ])

  const neighborhoodToken = normalizeCompactToken(normalizedNeighborhood)
  const candidates = new Set<string>()

  for (const base of compactBases) {
    if (!base) continue
    candidates.add(base)
    candidates.add(`${base}pty`)
    candidates.add(`${base}panama`)
    if (neighborhoodToken) {
      candidates.add(`${base}${neighborhoodToken}`)
    }
  }

  return [...candidates].filter((candidate) => candidate.length > 0 && candidate.length <= 30)
}

function extractHandleFromResponse(text: string): string | null {
  const strip = (handle: string) => handle.replace(/\.+$/, '')

  const urlMatch = text.match(/instagram\.com\/([a-zA-Z0-9_.]{1,30})\/?/i)
  if (urlMatch) return strip(urlMatch[1])

  const atMatch = text.match(/@([a-zA-Z0-9_.]{1,30})/)
  if (atMatch) return strip(atMatch[1])

  const quotedMatch = text.match(/["']([a-zA-Z0-9_.]{1,30})["']/)
  if (quotedMatch) return strip(quotedMatch[1])

  const isMatch = text.match(/\bis[:\s]+([a-zA-Z0-9_.]{1,30})(?:[.\s,]|$)/i)
  if (isMatch) return strip(isMatch[1])

  const cleaned = text.replace(/^@/, '').trim()
  if (/^[a-zA-Z0-9_.]{1,30}$/.test(cleaned)) {
    return strip(cleaned)
  }

  return null
}

async function runInstagramSearch(
  model: 'gpt-4o-mini' | 'gpt-4o',
  prompt: string,
): Promise<string | null> {
  const openai = getOpenAIClient()
  const response = await openai.responses.create({
    model,
    tools: [
      {
        type: 'web_search_preview',
        user_location: {
          type: 'approximate',
          country: 'PA',
          city: 'Panama City',
          timezone: 'America/Panama',
        },
      },
    ],
    input: prompt,
  })

  const textOutput = response.output.find(
    (item): item is Extract<typeof item, { type: 'message' }> => item.type === 'message',
  )

  return textOutput?.content
    ?.filter((c): c is Extract<typeof c, { type: 'output_text' }> => c.type === 'output_text')
    .map((c) => c.text)
    .join('')
    .trim() || null
}

/**
 * Uses OpenAI Responses API with web search to find a restaurant's Instagram handle.
 * Returns the handle (without @) or null if not found.
 */
export async function findInstagramHandle(
  restaurantName: string,
  neighborhood?: string | null,
  website?: string | null,
): Promise<{ handle: string | null; error?: string }> {
  try {
    const normalizedName = restaurantName.trim()
    const normalizedNeighborhood = neighborhood?.trim() || ''
    const domainHint = extractDomainHint(website)
    const searchVariants = buildSearchVariants(normalizedName, normalizedNeighborhood, website)
    const handleCandidates = buildHandleCandidates(normalizedName, normalizedNeighborhood)

    const firstPassPrompt = [
      `Find the official Instagram account for the business "${normalizedName}" in Panama City, Panama.`,
      normalizedNeighborhood
        ? `Prioritize results that match this neighborhood or area: "${normalizedNeighborhood}".`
        : `Prioritize results that clearly match Panama City, Panama.`,
      domainHint
        ? `Official website/domain hint: "${domainHint}". Favor the Instagram account tied to that business or its official Panama operator.`
        : `If the business is an international brand, look for its official Panama account or official local operator.`,
      `The Instagram handle may use a localized naming pattern instead of the exact business name, such as brand + panama, panamá, or pty.`,
      `Try search variants based on the business name, especially these: ${searchVariants.join(' | ')}.`,
      `Return ONLY the Instagram handle (without the @ symbol) if you find it.`,
      `If you cannot find a verified Instagram account for this specific business, return exactly: NOT_FOUND`,
      `Do not guess or make up handles. Only return handles you find from reliable sources.`,
    ].join('\n')

    const firstPassText = await runInstagramSearch('gpt-4o-mini', firstPassPrompt)
    if (firstPassText) {
      console.log(`[findInstagramHandle] First-pass AI response for "${restaurantName}":`, firstPassText)
      const firstPassHandle = extractHandleFromResponse(firstPassText)
      if (firstPassHandle && !firstPassText.includes('NOT_FOUND')) {
        return { handle: firstPassHandle }
      }
    }

    const secondPassPrompt = [
      `Search again for the official Instagram account of "${normalizedName}" in Panama City, Panama.`,
      `The first search may have failed because the handle is compressed or localized.`,
      normalizedNeighborhood
        ? `Area hint: "${normalizedNeighborhood}".`
        : `Area hint: Panama City, Panama.`,
      domainHint
        ? `Website/domain hint: "${domainHint}".`
        : `The business may use a local Panama account even if it is part of a larger brand.`,
      `Look carefully for handles that combine the brand with local suffixes such as panama, panamá, or pty.`,
      `Candidate handle patterns to verify: ${handleCandidates.join(', ')}.`,
      `If you find the official account, return ONLY the handle without @.`,
      `If not found, return exactly: NOT_FOUND.`,
      `Do not explain your reasoning.`,
    ].join('\n')

    const secondPassText = await runInstagramSearch('gpt-4o', secondPassPrompt)
    if (secondPassText) {
      console.log(`[findInstagramHandle] Second-pass AI response for "${restaurantName}":`, secondPassText)
      const secondPassHandle = extractHandleFromResponse(secondPassText)
      if (secondPassHandle && !secondPassText.includes('NOT_FOUND')) {
        return { handle: secondPassHandle }
      }
    }

    return { handle: null }
  } catch (error) {
    console.error('[findInstagramHandle] Error:', error)
    return {
      handle: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
