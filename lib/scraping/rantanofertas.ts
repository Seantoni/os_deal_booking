/**
 * RantanOfertas Scraper
 * 
 * Scrapes deals from https://www.rantanofertas.com/
 * Uses Shopify's JSON API for FAST data extraction (no page-by-page scraping!)
 * 
 * Strategy:
 * 1. Fetch /products.json - gets ALL products in one request
 * 2. Extract: title, vendor (merchant), prices, images from JSON
 * 3. For "total sold": fetch each page via HTTP and parse the
 *    <script id="elscup-product"> JSON tag — NO browser needed!
 */

import { ScrapedDeal, ScrapeResult, ProgressCallback } from './types'

const BASE_URL = 'https://www.rantanofertas.com'
const PRODUCTS_JSON_URL = `${BASE_URL}/products.json`

// HTTP settings for "total sold" fetching
const HTTP_TIMEOUT_MS = 15_000  // 15s per page fetch
const HTTP_CONCURRENCY = 5     // Fetch 5 pages in parallel

// Shopify product type from JSON API
interface ShopifyProduct {
  id: number
  title: string
  handle: string
  vendor: string
  product_type: string
  tags: string[]
  variants: Array<{
    price: string
    compare_at_price: string | null
  }>
  images: Array<{
    src: string
  }>
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[]
}

/**
 * Fetch all products from Shopify JSON API
 * This is MUCH faster than scraping each page!
 * Deduplicates by product handle to avoid scanning the same deal twice.
 */
async function fetchProductsFromAPI(
  limit: number = 250,
  onProgress?: ProgressCallback
): Promise<ShopifyProduct[]> {
  const seenHandles = new Set<string>() // Track unique products by handle
  const allProducts: ShopifyProduct[] = []
  let page = 1
  let hasMore = true
  
  onProgress?.({
    site: 'rantanofertas',
    phase: 'loading_list',
    message: 'Fetching products from Shopify API...',
  })
  
  while (hasMore && allProducts.length < limit) {
    const url = `${PRODUCTS_JSON_URL}?limit=250&page=${page}`
    console.log(`[RantanOfertas] Fetching: ${url}`)
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      })
      
      console.log(`[RantanOfertas] Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(`[RantanOfertas] API error: ${response.status} - ${errorText.substring(0, 200)}`)
        break
      }
      
      const text = await response.text()
      console.log(`[RantanOfertas] Response length: ${text.length} bytes`)
      
      let data: ShopifyProductsResponse
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error(`[RantanOfertas] JSON parse error:`, parseError)
        console.log(`[RantanOfertas] Response preview: ${text.substring(0, 500)}`)
        break
      }
      
      if (data.products.length === 0) {
        hasMore = false
      } else {
        // Filter to only active offers (has "Oferta Activa" tag)
        // AND deduplicate by handle
        const activeProducts = data.products.filter(p => {
          // Check if active
          const isActive = p.tags.some(tag => 
            tag.toLowerCase().includes('activa') || tag.toLowerCase().includes('active')
          )
          if (!isActive) return false
          
          // Check for duplicate
          if (seenHandles.has(p.handle)) {
            console.log(`  [Skip duplicate] ${p.handle}`)
            return false
          }
          
          seenHandles.add(p.handle)
          return true
        })
        
        allProducts.push(...activeProducts)
        console.log(`[RantanOfertas] Page ${page}: ${data.products.length} products (${activeProducts.length} unique active)`)
        page++
        
        // Shopify returns max 250 per page, if less then no more pages
        if (data.products.length < 250) {
          hasMore = false
        }
      }
    } catch (error) {
      console.error(`[RantanOfertas] Fetch error:`, error)
      break
    }
  }
  
  console.log(`[RantanOfertas] Total unique active products: ${allProducts.length}`)
  return allProducts.slice(0, limit)
}

/**
 * Convert Shopify product to ScrapedDeal format
 */
function shopifyProductToScrapedDeal(product: ShopifyProduct): ScrapedDeal {
  const variant = product.variants[0] || { price: '0', compare_at_price: null }
  const offerPrice = parseFloat(variant.price) || 0
  const originalPrice = variant.compare_at_price ? parseFloat(variant.compare_at_price) : offerPrice
  
  // Calculate discount
  let discountPercent = 0
  if (originalPrice > 0 && offerPrice > 0 && originalPrice > offerPrice) {
    discountPercent = Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
  }
  
  return {
    sourceUrl: `${BASE_URL}/products/${product.handle}`,
    sourceSite: 'rantanofertas',
    merchantName: product.vendor || 'Unknown',
    dealTitle: product.title,
    originalPrice,
    offerPrice,
    discountPercent,
    totalSold: null, // Not available from API - would need page visit
    imageUrl: product.images[0]?.src || null,
    tag: null,
  }
}

/**
 * Get "total sold" from a deal page via plain HTTP fetch.
 *
 * The page contains a <script id="elscup-product"> tag with JSON that
 * includes product_sales data.  We fetch the raw HTML and parse it with
 * a regex — no headless browser required!
 */
async function getTotalSoldViaHTTP(dealUrl: string): Promise<number | null> {
  try {
    const response = await fetch(dealUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const html = await response.text()

    // Find the <script id="elscup-product"> tag and extract its JSON content
    const match = html.match(/<script[^>]*id=["']elscup-product["'][^>]*>([\s\S]*?)<\/script>/)
    if (!match?.[1]) return null

    const jsonData = JSON.parse(match[1])
    const productSales = jsonData.product_sales || {}
    const counterIds = Object.keys(productSales)
    if (counterIds.length > 0) {
      const firstCounter = productSales[counterIds[0]]
      if (firstCounter && typeof firstCounter.is === 'number') {
        return firstCounter.is
      }
    }

    return null
  } catch {
    // Network error, timeout, or parse failure — skip silently
    return null
  }
}

/**
 * Main scraper using Shopify JSON API + HTTP for "total sold"
 * 
 * Strategy:
 * 1. Fetch products from Shopify API (fast, gets all basic data)
 * 2. Fetch each product page via plain HTTP to extract "total sold" from
 *    the embedded JSON script tag — no browser needed!
 * 3. Deduplicates by product handle to avoid scanning same deal twice
 * 4. Processes deals in parallel batches of HTTP_CONCURRENCY for speed
 */
export async function scrapeRantanOfertas(
  maxDeals: number = 100,
  onProgress?: ProgressCallback,
  options?: {
    startFrom?: number
    dealUrls?: unknown[] // For compatibility, ignored in API mode
    skipTotalSold?: boolean // If true, skips page visits (faster but no sold count)
  }
): Promise<ScrapeResult & { totalAvailable?: number; nextStartFrom?: number }> {
  const deals: ScrapedDeal[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<ProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<ProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'rantanofertas',
        phase,
        message,
        ...extra,
      })
    }
    console.log(`[RantanOfertas] ${message}`)
  }
  
  try {
    // Step 1: Fetch all products from Shopify JSON API (fast!)
    reportProgress('loading_list', 'Fetching products from Shopify API...')
    const products = await fetchProductsFromAPI(maxDeals + (options?.startFrom || 0), onProgress)
    
    const totalAvailable = products.length
    const startFrom = options?.startFrom || 0
    const productsToProcess = products.slice(startFrom, startFrom + maxDeals)
    
    reportProgress('loading_list', `Found ${totalAvailable} unique active deals, processing ${productsToProcess.length}`)
    
    // Step 2: Convert to ScrapedDeal and fetch "total sold" via HTTP
    const shouldFetchSoldCounts = !options?.skipTotalSold

    // Process deals in parallel batches (HTTP_CONCURRENCY at a time).
    // No browser is needed — each "total sold" lookup is a plain HTTP fetch.
    for (let i = 0; i < productsToProcess.length; i += HTTP_CONCURRENCY) {
      const batch = productsToProcess.slice(i, i + HTTP_CONCURRENCY)

      const batchDeals = await Promise.all(
        batch.map(async (product) => {
          const deal = shopifyProductToScrapedDeal(product)

          if (shouldFetchSoldCounts) {
            deal.totalSold = await getTotalSoldViaHTTP(deal.sourceUrl)
          }

          return deal
        })
      )

      for (const deal of batchDeals) {
        deals.push(deal)
        if (deal.totalSold !== null) {
          console.log(`  ✓ ${deal.merchantName}: ${deal.totalSold} sold, $${deal.offerPrice}`)
        } else {
          console.log(`  ○ ${deal.merchantName}: $${deal.offerPrice} (${deal.discountPercent}% off)`)
        }
      }

      // Report progress after each batch
      const processed = Math.min(i + HTTP_CONCURRENCY, productsToProcess.length)
      reportProgress('scanning_deal', `Scanned ${processed}/${productsToProcess.length} deals (HTTP)`, {
        current: startFrom + processed,
        total: totalAvailable,
      })
    }
    
    const endIndex = startFrom + productsToProcess.length
    const hasMore = endIndex < totalAvailable
    
    const withSalesCount = deals.filter(d => d.totalSold !== null).length
    reportProgress('complete', `Scan complete! Found ${deals.length} deals (${withSalesCount} with sales data)`)
    
    return {
      success: true,
      deals,
      errors,
      scannedAt: new Date(),
      totalAvailable,
      nextStartFrom: hasMore ? endIndex : undefined,
    }
  } catch (error) {
    const errorMsg = `RantanOfertas scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    reportProgress('error', errorMsg)
    
    return {
      success: false,
      deals,
      errors,
      scannedAt: new Date(),
    }
  }
}

/**
 * Get deal URLs for chunked processing
 * Returns product handles that can be used to construct URLs
 */
export async function getRantanOfertasDealUrls(
  onProgress?: ProgressCallback
): Promise<{ urls: Array<{ url: string; imageUrl: string | null }>; error?: string }> {
  try {
    if (onProgress) {
      onProgress({ site: 'rantanofertas', phase: 'loading_list', message: 'Fetching deal URLs from API...' })
    }
    
    const products = await fetchProductsFromAPI(500)
    
    const urls = products.map(p => ({
      url: `${BASE_URL}/products/${p.handle}`,
      imageUrl: p.images[0]?.src || null,
    }))
    
    console.log(`[RantanOfertas] Found ${urls.length} deal URLs from API`)
    return { urls }
  } catch (error) {
    const errorMsg = `Failed to get deal URLs: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`[RantanOfertas] ${errorMsg}`)
    return { urls: [], error: errorMsg }
  }
}
