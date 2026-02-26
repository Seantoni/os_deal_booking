/**
 * Degusta Panamá Scraper
 *
 * Fetches restaurants with discounts via the Degusta internal search API.
 * No browser needed — uses plain HTTP + cheerio for HTML parsing.
 */

import * as cheerio from 'cheerio'
import { ScrapedRestaurant, RestaurantScrapeResult, RestaurantProgressCallback } from './types'

const BASE_URL = 'https://www.degustapanama.com'
const SEARCH_API = `${BASE_URL}/panama/services/search`
const PAGE_SIZE = 10
const REQUEST_DELAY_MS = 800

const FILTERS_B64 = Buffer.from(
  JSON.stringify({ filters: { discounts: true }, score_range: {}, sort: 'food' })
).toString('base64')

interface DegustaGmapEntry {
  id: number
  position: { lat: number; lng: number }
  infoText: string
}

interface DegustaSearchResponse {
  count: number
  next_page_offset: number | null
  html: string
  gmap: DegustaGmapEntry[]
}

function parseRestaurantsFromHtml(html: string, gmapById: Map<number, DegustaGmapEntry>): ScrapedRestaurant[] {
  const $ = cheerio.load(html)
  const results: ScrapedRestaurant[] = []
  const seenUrls = new Set<string>()

  $('.dg-result-restaurant').each((_, cardEl) => {
    const card = $(cardEl)
    const linkEl = card.find('a[href*="/restaurante/"]').first()
    const href = linkEl.attr('href')
    if (!href) return

    const sourceUrl = href.startsWith('http') ? href : BASE_URL + href
    if (seenUrls.has(sourceUrl)) return
    seenUrls.add(sourceUrl)

    const idMatch = href.match(/_(\d+)\.html/)
    const degustaId = idMatch ? parseInt(idMatch[1], 10) : null

    // --- Name ---
    let name = ''
    const titleLink = card.find('h5 a[href*="restaurante"]').first()
    if (titleLink.length) {
      name = titleLink.text().trim()
    }
    if (!name && degustaId) {
      const gmapEntry = gmapById.get(degustaId)
      if (gmapEntry) name = gmapEntry.infoText
    }
    if (!name) {
      const slugMatch = href.match(/restaurante\/([^_]+)/)
      if (slugMatch) {
        name = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      }
    }
    if (!name) return

    // --- Cuisine ---
    const cuisineEl = card.find('.dg-result-restaurant-cuisine')
    const cuisine = cuisineEl.length ? cuisineEl.text().trim() || null : null

    // --- Address & Neighborhood ---
    const addressEl = card.find('.dg-result-restaurant-address')
    let address: string | null = null
    let neighborhood: string | null = null
    if (addressEl.length) {
      address = addressEl.text().trim() || null
      if (address) {
        const parts = address.split(' - ')
        if (parts.length >= 2) {
          neighborhood = parts[parts.length - 2].trim()
        }
      }
    }

    // --- Price ---
    let pricePerPerson: number | null = null
    const priceEl = card.find('.dg-result-restaurant-price')
    if (priceEl.length) {
      const priceMatch = priceEl.text().match(/\$(\d+)/)
      if (priceMatch) pricePerPerson = parseInt(priceMatch[1], 10)
    }

    // --- Discount ---
    let discount: string | null = null
    const discountSelectors = [
      '.degusta_estandar', '.degusta_premium',
      '.desc-block-v2-single', '.desc-block-v2-rsv-button-2',
    ]
    for (const sel of discountSelectors) {
      const el = card.find(sel).first()
      if (el.length) {
        const text = el.text().trim()
        if (text && (text.includes('%') || text.toLowerCase().includes('off'))) {
          discount = text
          break
        }
      }
    }

    // --- Votes ---
    let votes: number | null = null
    const votesEl = card.find('.dg-result-restaurant-number-qualifications')
    if (votesEl.length) {
      const votesMatch = votesEl.text().match(/(\d+)/)
      if (votesMatch) votes = parseInt(votesMatch[1], 10)
    }

    // --- Ratings ---
    let foodRating: number | null = null
    let serviceRating: number | null = null
    let ambientRating: number | null = null

    card.find('.dg-result-restaurant-qualification').each((_, qualEl) => {
      const descText = $(qualEl).find('.qualification-description').text().trim().toLowerCase()
      const scoreText = $(qualEl).find('.score-number').text().trim()
      const score = parseFloat(scoreText)
      if (isNaN(score)) return

      if (descText.includes('comida')) foodRating = score
      else if (descText.includes('servicio')) serviceRating = score
      else if (descText.includes('ambiente')) ambientRating = score
    })

    // --- Image ---
    const imgEl = card.find('img.img-cropped-search, img[src*="degusta-pictures"]').first()
    const imageUrl = imgEl.length ? imgEl.attr('src') || null : null

    results.push({
      sourceUrl,
      sourceSite: 'degusta',
      name,
      cuisine,
      address,
      neighborhood,
      pricePerPerson,
      discount,
      votes,
      foodRating,
      serviceRating,
      ambientRating,
      imageUrl,
    })
  })

  return results
}

/**
 * Main scraper function for Degusta Panamá.
 * Hits the search API directly — no headless browser required.
 */
export async function scrapeDegusta(
  maxRestaurants: number = 100,
  onProgress?: RestaurantProgressCallback
): Promise<RestaurantScrapeResult> {
  const restaurants: ScrapedRestaurant[] = []
  const errors: string[] = []

  const reportProgress = (phase: Parameters<RestaurantProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<RestaurantProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({ site: 'degusta', phase, message, ...extra })
    }
    console.log(`[Degusta] ${message}`)
  }

  try {
    reportProgress('connecting', 'Fetching restaurants from Degusta API...')

    let offset = 0
    let totalCount = 0
    let pageNum = 0
    const maxPages = Math.ceil(maxRestaurants / PAGE_SIZE) + 2
    const seenUrls = new Set<string>()

    while (restaurants.length < maxRestaurants && pageNum < maxPages) {
      const url = `${SEARCH_API}?q=&filters=${FILTERS_B64}&offset=${offset}`

      reportProgress('loading_page', `Fetching page ${pageNum + 1} (offset ${offset})...`)

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        const errMsg = `API returned ${response.status} for offset ${offset}`
        errors.push(errMsg)
        reportProgress('error', errMsg)
        break
      }

      const data: DegustaSearchResponse = await response.json()

      if (pageNum === 0) {
        totalCount = data.count
        reportProgress('loading_page', `Found ${totalCount} restaurants with discounts`)
      }

      if (!data.html || data.html.trim().length === 0) {
        break
      }

      // Build gmap lookup for name fallback
      const gmapById = new Map<number, DegustaGmapEntry>()
      for (const entry of data.gmap ?? []) {
        gmapById.set(entry.id, entry)
      }

      const pageRestaurants = parseRestaurantsFromHtml(data.html, gmapById)

      // Break if page returned nothing (parsing failure or end of data)
      if (pageRestaurants.length === 0) {
        console.log(`[Degusta] Page ${pageNum + 1} returned 0 parsed restaurants, stopping.`)
        break
      }

      let newOnThisPage = 0
      for (const r of pageRestaurants) {
        if (restaurants.length >= maxRestaurants) break
        if (seenUrls.has(r.sourceUrl)) continue
        seenUrls.add(r.sourceUrl)
        restaurants.push(r)
        newOnThisPage++

        reportProgress('extracting', `Extracted ${restaurants.length}/${Math.min(maxRestaurants, totalCount)}: ${r.name}`, {
          current: restaurants.length,
          total: Math.min(maxRestaurants, totalCount),
          restaurantName: r.name,
        })
      }

      // Break if we got only duplicates (stuck on same page)
      if (newOnThisPage === 0) {
        console.log(`[Degusta] Page ${pageNum + 1} returned only duplicates, stopping.`)
        break
      }

      // Advance offset ourselves — don't trust next_page_offset
      offset += PAGE_SIZE
      pageNum++

      if (offset >= totalCount) {
        break
      }

      // Polite delay between requests
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS))
    }

    if (restaurants.length === 0) {
      errors.push('No restaurants found from API')
      reportProgress('error', 'No restaurants found from API')
    } else {
      reportProgress('complete', `Scan complete! Found ${restaurants.length} restaurants`)
    }

    return {
      success: restaurants.length > 0,
      restaurants,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `Degusta scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    reportProgress('error', errorMsg)

    return {
      success: false,
      restaurants,
      errors,
      scannedAt: new Date(),
    }
  }
}
