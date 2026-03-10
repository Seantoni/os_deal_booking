'use server'

/**
 * Scrapes the phone number from a Degusta restaurant detail page.
 */
export async function scrapeRestaurantPhone(
  sourceUrl: string,
): Promise<{ phone: string | null; error?: string }> {
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return { phone: null, error: `HTTP ${response.status}` }
    }

    const html = await response.text()

    // data-phone has all numbers (e.g., "209-1899 / 6223-1899")
    const phoneMatch = html.match(/data-phone="([^"]+)"/)
    const phone = phoneMatch?.[1]?.trim() || null

    return { phone }
  } catch (error) {
    console.error('[scrapeRestaurantPhone] Error:', error)
    return {
      phone: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
