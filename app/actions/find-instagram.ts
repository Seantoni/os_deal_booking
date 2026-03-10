'use server'

import { getOpenAIClient } from '@/lib/openai'

/**
 * Uses OpenAI Responses API with web search to find a restaurant's Instagram handle.
 * Returns the handle (without @) or null if not found.
 */
export async function findInstagramHandle(
  restaurantName: string,
  neighborhood?: string | null,
): Promise<{ handle: string | null; error?: string }> {
  try {
    const openai = getOpenAIClient()

    const locationHint = neighborhood ? `, ${neighborhood}` : ''
    const prompt = [
      `Find the official Instagram account for the restaurant "${restaurantName}"${locationHint}, Panama City, Panama.`,
      `Return ONLY the Instagram handle (without the @ symbol) if you find it.`,
      `If you cannot find a verified Instagram account for this specific restaurant, return exactly: NOT_FOUND`,
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
