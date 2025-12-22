/**
 * RantanOfertas Scraper
 * 
 * Scrapes deals from https://www.rantanofertas.com/
 * Uses Shopify's JSON API for FAST data extraction (no page-by-page scraping!)
 * 
 * Strategy:
 * 1. Fetch /products.json - gets ALL products in one request
 * 2. Extract: title, vendor (merchant), prices, images from JSON
 * 3. For "total sold": visit detail pages only if needed (slower)
 */

import { Page } from 'puppeteer-core'
import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedDeal, ScrapeResult, ProgressCallback } from './types'

const BASE_URL = 'https://www.rantanofertas.com'
const PRODUCTS_JSON_URL = `${BASE_URL}/products.json`

// Timeouts
const PAGE_TIMEOUT = 60000 // 60 seconds for page load

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
 * Get "total sold" from a deal page using Puppeteer
 * Only call this if you need the sold count!
 */
async function getTotalSoldFromPage(page: Page, dealUrl: string): Promise<number | null> {
  try {
    await page.goto(dealUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT })
    
    // Extract from JSON data (fast, no animation wait!)
    const totalSold = await page.evaluate(() => {
      const jsonScript = document.querySelector('script#elscup-product')
      if (jsonScript) {
        try {
          const jsonData = JSON.parse(jsonScript.textContent || '{}')
          const productSales = jsonData.product_sales || {}
          const counterIds = Object.keys(productSales)
          if (counterIds.length > 0) {
            const firstCounter = productSales[counterIds[0]]
            if (firstCounter && typeof firstCounter.is === 'number') {
              return firstCounter.is
            }
          }
        } catch {
          // JSON parse failed
        }
      }
      return null
    })
    
    return totalSold
  } catch (error) {
    console.error(`[RantanOfertas] Error getting total sold for ${dealUrl}:`, error)
    return null
  }
}

/**
 * Main scraper using Shopify JSON API + page visits for "total sold"
 * 
 * Strategy:
 * 1. Fetch products from Shopify API (fast, gets all basic data)
 * 2. Visit each page ONCE to get "total sold" from JSON (no animation wait!)
 * 3. Deduplicates by product handle to avoid scanning same deal twice
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
    
    // Step 2: Convert to ScrapedDeal and fetch "total sold" from pages
    const shouldFetchSoldCounts = !options?.skipTotalSold
    let browser = null
    let page: Page | null = null
    
    if (shouldFetchSoldCounts && productsToProcess.length > 0) {
      reportProgress('connecting', 'Launching browser for sold counts...')
      browser = await getBrowser()
      page = await createPage(browser)
    }
    
    try {
      for (let i = 0; i < productsToProcess.length; i++) {
        const product = productsToProcess[i]
        const deal = shopifyProductToScrapedDeal(product)
        
        const shortTitle = deal.dealTitle.length > 40 
          ? deal.dealTitle.substring(0, 40) + '...' 
          : deal.dealTitle
        
        reportProgress('scanning_deal', `Scanning ${i + 1}/${productsToProcess.length}: ${shortTitle}`, {
          current: startFrom + i + 1,
          total: totalAvailable,
        })
        
        // Fetch "total sold" from page (fast - uses JSON, no animation wait!)
        if (page) {
          const totalSold = await getTotalSoldFromPage(page, deal.sourceUrl)
          deal.totalSold = totalSold
        }
        
        deals.push(deal)
        
        // Log progress
        if (deal.totalSold !== null) {
          console.log(`  ✓ ${deal.merchantName}: ${deal.totalSold} sold, $${deal.offerPrice}`)
        } else {
          console.log(`  ○ ${deal.merchantName}: $${deal.offerPrice} (${deal.discountPercent}% off)`)
        }
      }
    } finally {
      if (browser) {
        await closeBrowser()
      }
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
