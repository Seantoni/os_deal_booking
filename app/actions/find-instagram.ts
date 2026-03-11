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
    const openai = getOpenAIClient()

    const normalizedName = restaurantName.trim()
    const normalizedNeighborhood = neighborhood?.trim() || ''
    const domainHint = extractDomainHint(website)
    const searchVariants = buildSearchVariants(normalizedName, normalizedNeighborhood, website)

    const prompt = [
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

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
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

    const text = textOutput?.content
      ?.filter((c): c is Extract<typeof c, { type: 'output_text' }> => c.type === 'output_text')
      .map((c) => c.text)
      .join('')
      .trim()

    if (!text || text.includes('NOT_FOUND')) {
      return { handle: null }
    }

    console.log(`[findInstagramHandle] Raw AI response for "${restaurantName}":`, text)

    const strip = (h: string) => h.replace(/\.+$/, '')

    // Try to extract a handle from the response using multiple strategies
    // 1. Full instagram.com URL anywhere in the text
    const urlMatch = text.match(/instagram\.com\/([a-zA-Z0-9_.]{1,30})\/?/i)
    if (urlMatch) return { handle: strip(urlMatch[1]) }

    // 2. @handle pattern anywhere in the text
    const atMatch = text.match(/@([a-zA-Z0-9_.]{1,30})/)
    if (atMatch) return { handle: strip(atMatch[1]) }

    // 3. Handle in quotes (single or double): "susharkpty" or 'sirenapanama'
    const quotedMatch = text.match(/["']([a-zA-Z0-9_.]{1,30})["']/)
    if (quotedMatch) return { handle: strip(quotedMatch[1]) }

    // 4. "is <handle>" or "is: <handle>" pattern (common AI phrasing)
    const isMatch = text.match(/\bis[:\s]+([a-zA-Z0-9_.]{1,30})(?:[.\s,]|$)/i)
    if (isMatch) return { handle: strip(isMatch[1]) }

    // 5. If the entire response is short enough, it might be just the handle
    const cleaned = text.replace(/^@/, '').trim()
    if (/^[a-zA-Z0-9_.]{1,30}$/.test(cleaned)) {
      return { handle: strip(cleaned) }
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
