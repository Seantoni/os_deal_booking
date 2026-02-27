/**
 * Banco General Promociones Scraper
 *
 * Fetches promos from https://www.bgeneral.com/personas/promociones/
 * Uses admin-ajax.php for the list and detail page HTML for conditions.
 * HTTP only — no browser.
 */

import * as cheerio from 'cheerio'
import {
  ScrapedBGeneralPromo,
  BGeneralScrapeResult,
  BGeneralProgressCallback,
} from './types'

const BASE_URL = 'https://www.bgeneral.com'
const PROMOS_URL = `${BASE_URL}/personas/promociones/`
const AJAX_URL = `${BASE_URL}/wp-admin/admin-ajax.php`
const BATCH_SIZE = 5 // concurrent detail fetches per batch
const BATCH_DELAY_MS = 200 // delay between batches to avoid hammering
const DETAIL_FETCH_TIMEOUT_MS = 8_000 // per-detail page timeout

interface BGeneralApiPromo {
  id: number
  titulo: string
  fecha_inicio: string // YYYYMMDD
  fecha_final: string // YYYYMMDD
  dias_semana: string[]
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#038;/g, '&')
    .replace(/&#215;/g, '×')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/**
 * Parse titulo like "75% de descuento en MyOffice Panamá" or "2×1 en Habibis"
 * into discountText, discountPercent (when numeric), and businessName.
 */
function parseTitulo(titulo: string): {
  businessName: string
  discountText: string
  discountPercent: number | null
} {
  const raw = decodeHtmlEntities(titulo)
  let businessName = ''
  let discountText = raw
  let discountPercent: number | null = null

  // "X% de descuento en Business Name" or "X% de descuento en Business Name & More"
  const pctMatch = raw.match(/^(\d+)\s*%\s*de\s*descuento\s+en\s+(.+)$/i)
  if (pctMatch) {
    discountPercent = parseInt(pctMatch[1], 10)
    discountText = `${pctMatch[1]}% de descuento`
    businessName = pctMatch[2].trim()
    return { businessName, discountText, discountPercent }
  }

  // "2×1 en Business Name" or "2x1 en Business Name"
  const twoForOneMatch = raw.match(/^(2\s*[×x]\s*1)\s+en\s+(.+)$/i)
  if (twoForOneMatch) {
    discountText = '2×1'
    businessName = twoForOneMatch[2].trim()
    return { businessName, discountText, discountPercent }
  }

  // "Promoción especial en Business Name" or "Precio especial de Business Name"
  const specialMatch = raw.match(/^(?:Promoción especial|Precio especial)\s+(?:en|de)\s+(.+)$/i)
  if (specialMatch) {
    discountText = raw.split(/\s+en\s+|\s+de\s+/i)[0] ?? raw
    businessName = specialMatch[1].trim()
    return { businessName, discountText, discountPercent }
  }

  // "Some title with Business Name" — take last part after " en " or " de " as business
  const enDe = raw.match(/\s+en\s+(.+)$/i) || raw.match(/\s+de\s+(.+)$/i)
  if (enDe) {
    businessName = enDe[1].trim()
    discountText = raw.slice(0, raw.length - enDe[1].length).trim()
    return { businessName, discountText, discountPercent }
  }

  // Fallback: whole titulo as discountText, no business
  return { businessName: raw, discountText: raw, discountPercent }
}

function formatDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

/**
 * Fetch list of promos from admin-ajax (obtener_promos_hoy).
 */
async function fetchPromoList(): Promise<BGeneralApiPromo[]> {
  const res = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': PROMOS_URL,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    body: 'action=obtener_promos_hoy',
  })
  if (!res.ok) throw new Error(`AJAX ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json)) return []
  return json as BGeneralApiPromo[]
}

/**
 * Parse main promociones page to get post id → detail URL mapping.
 */
async function fetchIdToDetailUrl(): Promise<Map<string, string>> {
  const res = await fetch(PROMOS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })
  if (!res.ok) throw new Error(`Main page ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  const map = new Map<string, string>()
  $('a.wpupg-item-link[data-id][href]').each((_, el) => {
    const id = $(el).attr('data-id')
    const href = $(el).attr('href')
    if (id && href) {
      const url = href.startsWith('http') ? href : BASE_URL + href
      map.set(String(id), url)
    }
  })
  return map
}

/**
 * Fetch a single promo detail page and extract the "Condiciones" block.
 */
async function fetchConditions(detailUrl: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(detailUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal,
  })
  if (!res.ok) return null
  const html = await res.text()
  const $ = cheerio.load(html)

  // Strong containing "Condiciones:" then next ul (ak-ul) with li items
  const conditionsParts: string[] = []
  $('p strong, strong').each((_, el) => {
    const text = $(el).text().trim()
    if (!text.toLowerCase().includes('condiciones')) return
    const $p = $(el).closest('p')
    const $next = $p.nextAll('ul').first()
    if ($next.length) {
      $next.find('li').each((__, li) => {
        const t = $(li).text().trim()
        if (t) conditionsParts.push(t)
      })
    }
    return false // break after first
  })

  if (conditionsParts.length > 0) {
    return conditionsParts.join('\n')
  }

  // Fallback: any block that follows "Condiciones" text
  const body = $('body').text()
  const idx = body.indexOf('Condiciones:')
  if (idx !== -1) {
    const after = body.slice(idx + 'Condiciones:'.length, idx + 3000).trim()
    const end = after.indexOf('\n\n\n') !== -1 ? after.indexOf('\n\n\n') : after.length
    return after.slice(0, end).replace(/\s+/g, ' ').trim() || null
  }
  return null
}

/**
 * Main scraper: fetches list from API, resolves detail URLs from main page,
 * then fetches detail pages for conditions in parallel batches (or skips conditions for fast cron).
 *
 * @param maxPromos - Max number of promos to return
 * @param onProgress - Optional progress callback
 * @param skipConditions - If true, only fetch list + URL mapping (2 requests, ~5–15s). Use for cron. If false, fetch conditions in parallel batches (~15–30s for 40 promos).
 */
export async function scrapeBGeneral(
  maxPromos: number = 100,
  onProgress?: BGeneralProgressCallback,
  options?: { skipConditions?: boolean }
): Promise<BGeneralScrapeResult> {
  const promos: ScrapedBGeneralPromo[] = []
  const errors: string[] = []
  const skipConditions = options?.skipConditions ?? false

  const report = (phase: Parameters<BGeneralProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<BGeneralProgressCallback>[0]>) => {
    onProgress?.({ site: 'bgeneral', phase, message, ...extra })
    console.log(`[BGeneral] ${message}`)
  }

  try {
    report('connecting', 'Fetching promo list from Banco General...')
    const list = await fetchPromoList()
    if (list.length === 0) {
      errors.push('No promos returned from API')
      return { success: false, promos: [], errors, scannedAt: new Date() }
    }
    report('loading_list', `Found ${list.length} promos, resolving detail URLs...`)

    const idToUrl = await fetchIdToDetailUrl()
    const toProcess = list.slice(0, maxPromos)

    if (skipConditions) {
      // Fast path: no detail fetches. List + main page only (~2 requests, ~5–15s total).
      report('extracting', `Building ${toProcess.length} promos (conditions skipped for speed)...`, { total: toProcess.length })
      for (let i = 0; i < toProcess.length; i++) {
        const item = toProcess[i]
        const { businessName, discountText, discountPercent } = parseTitulo(item.titulo)
        const detailUrl = idToUrl.get(String(item.id))
        const sourceUrl = detailUrl ?? `${PROMOS_URL}?p=${item.id}`
        promos.push({
          sourceUrl,
          sourceSite: 'bgeneral',
          externalId: String(item.id),
          businessName: businessName || item.titulo,
          discountText,
          discountPercent,
          startDate: formatDate(item.fecha_inicio),
          endDate: formatDate(item.fecha_final),
          conditions: null,
        })
      }
      report('complete', `Done. Scraped ${promos.length} promos (no conditions).`)
      return { success: true, promos, errors, scannedAt: new Date() }
    }

    // Full path: fetch conditions in parallel batches
    report('loading_detail', `Fetching conditions for ${toProcess.length} promos (batches of ${BATCH_SIZE})...`, { total: toProcess.length })

    for (let batchStart = 0; batchStart < toProcess.length; batchStart += BATCH_SIZE) {
      const batch = toProcess.slice(batchStart, batchStart + BATCH_SIZE)
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)

      report('loading_detail', `Batch ${batchNum}/${totalBatches} (${batch.length} promos)`, {
        current: batchStart + batch.length,
        total: toProcess.length,
      })

      const conditionsPromises = batch.map((item) => {
        const detailUrl = idToUrl.get(String(item.id))
        if (!detailUrl) return Promise.resolve<{ id: string; conditions: string | null }>({ id: String(item.id), conditions: null })
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), DETAIL_FETCH_TIMEOUT_MS)
        return fetchConditions(detailUrl, controller.signal)
          .then((conditions) => {
            clearTimeout(timeout)
            return { id: String(item.id), conditions }
          })
          .catch((e) => {
            clearTimeout(timeout)
            errors.push(`Conditions ${item.id}: ${e instanceof Error ? e.message : 'Unknown'}`)
            return { id: String(item.id), conditions: null }
          })
      })

      const conditionsResults = await Promise.all(conditionsPromises)
      const conditionsById = new Map(conditionsResults.map((r) => [r.id, r.conditions]))

      for (const item of batch) {
        const { businessName, discountText, discountPercent } = parseTitulo(item.titulo)
        const detailUrl = idToUrl.get(String(item.id))
        const sourceUrl = detailUrl ?? `${PROMOS_URL}?p=${item.id}`
        promos.push({
          sourceUrl,
          sourceSite: 'bgeneral',
          externalId: String(item.id),
          businessName: businessName || item.titulo,
          discountText,
          discountPercent,
          startDate: formatDate(item.fecha_inicio),
          endDate: formatDate(item.fecha_final),
          conditions: conditionsById.get(String(item.id)) ?? null,
        })
      }

      if (batchStart + BATCH_SIZE < toProcess.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))
      }
    }

    report('complete', `Done. Scraped ${promos.length} promos.`)
    return {
      success: errors.length < promos.length,
      promos,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(msg)
    report('error', msg)
    return {
      success: false,
      promos,
      errors,
      scannedAt: new Date(),
    }
  }
}
