/**
 * Degusta Panamá Scraper
 *
 * Fetches restaurants via the Degusta internal search API.
 * Supports two modes:
 *   - 'discounts': only restaurants with active discounts (default)
 *   - 'all': every restaurant on the site (~1800+), using concurrent requests
 *
 * No browser needed — uses plain HTTP + cheerio for HTML parsing.
 */

import * as cheerio from 'cheerio'
import { ScrapedRestaurant, RestaurantScrapeResult, RestaurantProgressCallback } from './types'

export type DegustaMode = 'discounts' | 'all'

const BASE_URL = 'https://www.degustapanama.com'
const SEARCH_API = `${BASE_URL}/panama/services/search`
const PAGE_SIZE = 10

const SEQUENTIAL_DELAY_MS = 800
const CONCURRENT_BATCH_SIZE = 5
const CONCURRENT_BATCH_DELAY_MS = 250
const API_OFFSET_CAP = 1000

type DegustaSort = 'food' | 'service' | 'ambient' | 'relevance' | 'price' | 'popularity' | 'discount' | 'discover'

function buildFiltersB64(mode: DegustaMode, sort: DegustaSort = 'food'): string {
  const payload = mode === 'all'
    ? { filters: {}, score_range: {}, sort }
    : { filters: { discounts: true }, score_range: {}, sort }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

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

const API_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
}

async function fetchPage(filtersB64: string, offset: number): Promise<DegustaSearchResponse> {
  const url = `${SEARCH_API}?q=&filters=${filtersB64}&offset=${offset}`
  const response = await fetch(url, { headers: API_HEADERS })
  if (!response.ok) throw new Error(`API returned ${response.status} for offset ${offset}`)
  return response.json()
}

function processPage(data: DegustaSearchResponse): ScrapedRestaurant[] {
  if (!data.html || data.html.trim().length === 0) return []
  const gmapById = new Map<number, DegustaGmapEntry>()
  for (const entry of data.gmap ?? []) gmapById.set(entry.id, entry)
  return parseRestaurantsFromHtml(data.html, gmapById)
}

/**
 * Sequential fetcher — used for 'discounts' mode (smaller dataset, ~100-200 results).
 */
async function fetchSequential(
  filtersB64: string,
  maxRestaurants: number,
  reportProgress: ReportProgressFn,
): Promise<{ restaurants: ScrapedRestaurant[]; errors: string[] }> {
  const restaurants: ScrapedRestaurant[] = []
  const errors: string[] = []
  const seenUrls = new Set<string>()
  const maxPages = Math.ceil(maxRestaurants / PAGE_SIZE) + 2

  let offset = 0
  let totalCount = 0

  for (let pageNum = 0; pageNum < maxPages && restaurants.length < maxRestaurants; pageNum++) {
    reportProgress('loading_page', `Fetching page ${pageNum + 1} (offset ${offset})...`)

    let data: DegustaSearchResponse
    try {
      data = await fetchPage(filtersB64, offset)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : `Unknown error at offset ${offset}`
      errors.push(errMsg)
      reportProgress('error', errMsg)
      break
    }

    if (pageNum === 0) {
      totalCount = data.count
      reportProgress('loading_page', `Found ${totalCount} restaurants with discounts`)
    }

    const pageRestaurants = processPage(data)
    if (pageRestaurants.length === 0) break

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

    if (newOnThisPage === 0) break

    offset += PAGE_SIZE
    if (offset >= totalCount) break

    await new Promise(resolve => setTimeout(resolve, SEQUENTIAL_DELAY_MS))
  }

  return { restaurants, errors }
}

/**
 * Fetch one sort-order pass concurrently up to the API's offset cap (1000).
 * Returns only the newly discovered restaurants (not already in seenUrls).
 */
async function fetchSortPass(
  mode: DegustaMode,
  sort: DegustaSort,
  seenUrls: Set<string>,
  maxRestaurants: number,
  reportProgress: ReportProgressFn,
  passLabel: string,
): Promise<{ restaurants: ScrapedRestaurant[]; totalCount: number; errors: string[] }> {
  const filtersB64 = buildFiltersB64(mode, sort)
  const restaurants: ScrapedRestaurant[] = []
  const errors: string[] = []

  let firstData: DegustaSearchResponse
  try {
    firstData = await fetchPage(filtersB64, 0)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : `Failed to fetch first page (${sort})`
    return { restaurants, totalCount: 0, errors: [errMsg] }
  }

  const totalCount = firstData.count
  const maxOffset = Math.min(API_OFFSET_CAP, totalCount)

  for (const r of processPage(firstData)) {
    if (seenUrls.has(r.sourceUrl)) continue
    seenUrls.add(r.sourceUrl)
    restaurants.push(r)
  }

  const offsets: number[] = []
  for (let o = PAGE_SIZE; o < maxOffset; o += PAGE_SIZE) {
    offsets.push(o)
  }

  for (let i = 0; i < offsets.length; i += CONCURRENT_BATCH_SIZE) {
    const batch = offsets.slice(i, i + CONCURRENT_BATCH_SIZE)
    const batchNum = Math.floor(i / CONCURRENT_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(offsets.length / CONCURRENT_BATCH_SIZE)

    reportProgress('loading_page', `${passLabel} batch ${batchNum}/${totalBatches} (sort: ${sort})`)

    const results = await Promise.allSettled(batch.map(offset => fetchPage(filtersB64, offset)))

    let emptyPages = 0
    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'rejected') {
        errors.push(`Offset ${batch[j]} failed: ${result.reason}`)
        continue
      }

      const parsed = processPage(result.value)
      if (parsed.length === 0) { emptyPages++; continue }

      for (const r of parsed) {
        if (seenUrls.has(r.sourceUrl)) continue
        seenUrls.add(r.sourceUrl)
        restaurants.push(r)
      }
    }

    if (emptyPages === batch.length) break

    if (i + CONCURRENT_BATCH_SIZE < offsets.length) {
      await new Promise(resolve => setTimeout(resolve, CONCURRENT_BATCH_DELAY_MS))
    }
  }

  return { restaurants, totalCount, errors }
}

/**
 * Concurrent fetcher — used for 'all' mode (~1800+ results).
 *
 * The Degusta API caps results at offset 1000 (~1000 restaurants per sort order).
 * To get the full catalog we run multiple passes with different sort orders,
 * merging unique results. Two passes (food + popularity) typically cover all ~1800.
 */
async function fetchConcurrent(
  _filtersB64: string,
  maxRestaurants: number,
  reportProgress: ReportProgressFn,
): Promise<{ restaurants: ScrapedRestaurant[]; errors: string[] }> {
  const allRestaurants: ScrapedRestaurant[] = []
  const allErrors: string[] = []
  const seenUrls = new Set<string>()

  const sortPasses: DegustaSort[] = ['food', 'popularity']

  for (let p = 0; p < sortPasses.length; p++) {
    const sort = sortPasses[p]
    const passLabel = `Pass ${p + 1}/${sortPasses.length}`

    reportProgress('loading_page', `${passLabel} — scanning with sort "${sort}"...`)

    const { restaurants, totalCount, errors } = await fetchSortPass(
      'all', sort, seenUrls, maxRestaurants, reportProgress, passLabel,
    )

    allRestaurants.push(...restaurants)
    allErrors.push(...errors)

    const target = Math.min(maxRestaurants, totalCount)
    reportProgress('extracting', `${passLabel} done — ${restaurants.length} new (${allRestaurants.length} total unique / ${target} on site)`, {
      current: allRestaurants.length,
      total: target,
    })

    if (allRestaurants.length >= target) break
  }

  return { restaurants: allRestaurants, errors: allErrors }
}

type ReportProgressFn = (
  phase: Parameters<RestaurantProgressCallback>[0]['phase'],
  message: string,
  extra?: Partial<Parameters<RestaurantProgressCallback>[0]>,
) => void

/**
 * Main scraper function for Degusta Panamá.
 *
 * @param mode - 'discounts' (only restaurants with discounts) or 'all' (entire site, concurrent)
 * @param maxRestaurants - cap on results. Defaults to 200 for discounts, 2000 for all.
 */
export async function scrapeDegusta(
  maxRestaurants?: number,
  onProgress?: RestaurantProgressCallback,
  mode: DegustaMode = 'discounts',
): Promise<RestaurantScrapeResult> {
  const limit = maxRestaurants ?? (mode === 'all' ? 2000 : 200)
  const filtersB64 = buildFiltersB64(mode)
  const errors: string[] = []

  const reportProgress: ReportProgressFn = (phase, message, extra) => {
    if (onProgress) onProgress({ site: 'degusta', phase, message, ...extra })
    console.log(`[Degusta] ${message}`)
  }

  try {
    const modeLabel = mode === 'all' ? 'all restaurants' : 'restaurants with discounts'
    reportProgress('connecting', `Fetching ${modeLabel} from Degusta API...`)

    const fetcher = mode === 'all' ? fetchConcurrent : fetchSequential
    const result = await fetcher(filtersB64, limit, reportProgress)

    errors.push(...result.errors)

    if (result.restaurants.length === 0) {
      errors.push('No restaurants found from API')
      reportProgress('error', 'No restaurants found from API')
    } else {
      reportProgress('complete', `Scan complete! Found ${result.restaurants.length} restaurants`)
    }

    return {
      success: result.restaurants.length > 0,
      restaurants: result.restaurants,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `Degusta scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    reportProgress('error', errorMsg)

    return {
      success: false,
      restaurants: [],
      errors,
      scannedAt: new Date(),
    }
  }
}
