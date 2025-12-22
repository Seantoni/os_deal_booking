/**
 * Oferta24 Scraper
 * 
 * Scrapes deals from https://www.oferta24.com/es
 */

import { Page } from 'puppeteer-core'
import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedDeal, ScrapeResult, ProgressCallback } from './types'

const BASE_URL = 'https://www.oferta24.com'
const DEALS_URL = `${BASE_URL}/es`

// Timeouts and wait times
const PAGE_TIMEOUT = 60000 // 60 seconds for page load
const CONTENT_LOAD_WAIT = 5000

interface RawDealData {
  url: string
  merchantName: string
  dealTitle: string
  originalPrice: number
  offerPrice: number
  totalSold: number | null
  imageUrl: string | null
  tag: string | null
}

/**
 * Scrape deals from Oferta24 list page
 * All data is available on the card, no need to visit detail pages
 */
async function scrapeDealsPage(page: Page): Promise<RawDealData[]> {
  const rawDeals: RawDealData[] = []
  
  console.log(`[Oferta24] Navigating to: ${DEALS_URL}`)
  
  try {
    const response = await page.goto(DEALS_URL, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
    console.log(`[Oferta24] Navigation response status: ${response?.status()}`)
    console.log(`[Oferta24] Final URL: ${page.url()}`)
  } catch (navError) {
    console.error(`[Oferta24] Navigation failed:`, navError)
    throw navError
  }
  
  // Wait longer for JavaScript to fully render
  await new Promise(resolve => setTimeout(resolve, 8000))
  
  // Debug: Check what's on the page now
  const bodyLength = await page.evaluate(() => document.body.innerHTML.length)
  const allLinks = await page.evaluate(() => document.querySelectorAll('a').length)
  console.log(`[Oferta24] After wait - Body length: ${bodyLength}, Links: ${allLinks}`)
  
  // Debug: Log sample of links on page
  const pageDebug = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const hrefs = links.slice(0, 50).map(a => a.href).filter(h => h && !h.startsWith('javascript'))
    const divs = document.querySelectorAll('div').length
    const articles = document.querySelectorAll('article').length
    return { hrefs, divs, articles, totalLinks: links.length }
  })
  console.log(`[Oferta24] Page debug:`, JSON.stringify(pageDebug, null, 2))
  
  // Wait for deal cards to appear - try multiple selectors
  const selectors = ['a[href*="/coupons/"]', 'a[href*="/coupon/"]', 'a[href*="/es/"]', '[class*="card"]']
  for (const sel of selectors) {
    await page.waitForSelector(sel, { timeout: 5000 }).catch(() => {})
  }
  
  // Scroll to load all products
  let previousHeight = 0
  for (let i = 0; i < 10; i++) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight)
    if (currentHeight === previousHeight) break
    previousHeight = currentHeight
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  // Extract deal data from cards - get coupon links first
  const couponUrls = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const couponLinks = links
      .map(a => a.href)
      .filter(href => href && href.includes('/coupons/'))
      // Remove duplicates
      .filter((href, i, arr) => arr.indexOf(href) === i)
    return couponLinks
  })
  
  console.log(`[Oferta24] Found ${couponUrls.length} unique coupon URLs`)
  
  // Extract deal data from cards
  const deals = await page.evaluate((baseUrl) => {
    const dealsData: RawDealData[] = []
    const processedUrls = new Set<string>()
    
    // Find all coupon links
    const cards = document.querySelectorAll('a[href*="/coupons/"]')
    console.log(`Found ${cards.length} deal card elements`)
    
    cards.forEach((card, cardIndex) => {
      try {
        // URL
        const href = card.getAttribute('href') || ''
        if (!href || !href.includes('/coupons/')) return
        const url = href.startsWith('http') ? href : `${baseUrl}${href}`
        
        // Skip if we already processed this URL
        if (processedUrls.has(url)) return
        processedUrls.add(url)
        
        // The card link might not contain all elements - look at parent container too
        // Find the closest parent that contains the full deal card
        // In list view, cards are in: div.col-span-1 > div.flex > [image div] + [content a]
        const parentContainer = card.closest('[class*="col-span"]') ||
                                card.closest('[class*="group"]') ||
                                card.closest('[class*="flex-col"]') || 
                                card.closest('[class*="card"]') || 
                                card.parentElement?.parentElement || 
                                card
        
        // Get all text content
        const cardText = card.textContent || ''
        const containerText = parentContainer.textContent || ''
        
        // Debug: Log first few cards
        if (cardIndex < 3) {
          console.log(`Card ${cardIndex}: URL=${url.substring(0, 50)}..., cardText length=${cardText.length}, containerText length=${containerText.length}`)
        }
        
        // Business/Merchant name - In list cards, it's in an h3 element
        // e.g., <h3 class="text-left text-neutral-400 text-xxxs xs:text-xxs">FREYA PANAMA...</h3>
        let merchantName = 'Unknown'
        const merchantSelectors = [
          'h3.text-left',
          'h3[class*="text-neutral"]',
          'h3[class*="text-xxxs"]',
          'h3[class*="text-xxs"]',
          'h3',
        ]
        
        // First try in card, then in parent container
        for (const searchEl of [card, parentContainer]) {
          if (merchantName !== 'Unknown') break
          for (const sel of merchantSelectors) {
            const el = searchEl.querySelector(sel)
            const text = el?.textContent?.trim()
            // Make sure it's a business name (not a number, price, or too short)
            if (text && text.length > 2 && text.length < 80 && !/^\d+$/.test(text) && !text.includes('$') && !text.includes('vendido')) {
              merchantName = text
              break
            }
          }
        }
        
        // Deal title/description - In list cards, it's in an h4 element
        // e.g., <h4 class="text-left font-medium leading-5...">Masaje relajante de cuerpo completo</h4>
        let dealTitle = ''
        const titleSelectors = [
          'h4.text-left',
          'h4[class*="font-medium"]',
          'h4',
          // Fallback to p tags for detail page structure
          'p[class*="font-lexend"]',
          'p[class*="font-semibold"]',
        ]
        
        // First try in card, then in parent container
        for (const searchEl of [card, parentContainer]) {
          if (dealTitle) break
          for (const sel of titleSelectors) {
            const el = searchEl.querySelector(sel)
            const text = el?.textContent?.trim()
            // Title should be meaningful (longer than 5 chars, not a price)
            if (text && text.length > 5 && !text.startsWith('$') && !text.match(/^\d+$/)) {
              dealTitle = text
              break
            }
          }
        }
        
        // Fallback for deal title - try any h4 or p with substantial text
        if (!dealTitle) {
          const searchEls = [card, parentContainer]
          for (const searchEl of searchEls) {
            if (dealTitle) break
            // Try h4 first, then p
            const elements = [...searchEl.querySelectorAll('h4'), ...searchEl.querySelectorAll('p')]
            for (const el of elements) {
              const text = el.textContent?.trim()
              if (text && text.length > 5 && text.length < 200 && !text.startsWith('$') && !text.match(/^\d+$/)) {
                dealTitle = text
                break
              }
            }
          }
        }
        
        // Use URL as last resort for title
        if (!dealTitle) {
          const urlParts = url.split('/')
          dealTitle = urlParts[urlParts.length - 1] || 'Unknown Deal'
        }
        
        // Prices - look for price elements
        let offerPrice = 0
        let originalPrice = 0
        
        // Look for strikethrough (original) price
        // e.g., <span class="diagonal-strikethrough">$65.00</span>
        const strikeSelectors = [
          '[class*="diagonal-strikethrough"]',
          '[class*="strikethrough"]',
          '[class*="line-through"]',
          's', 
          'del'
        ]
        for (const searchEl of [card, parentContainer]) {
          if (originalPrice > 0) break
          for (const sel of strikeSelectors) {
            const strikeEl = searchEl.querySelector(sel)
            if (strikeEl) {
              const match = strikeEl.textContent?.match(/[\d,.]+/)
              if (match) {
                originalPrice = parseFloat(match[0].replace(',', ''))
                break
              }
            }
          }
        }
        
        // Look for main price (font-bold) - handle split spans like $39 + 00
        // e.g., <p class="font-bold..."><span>$39<span class="align-super">00</span></span></p>
        const priceSelectors = [
          'p.font-bold',
          'p[class*="font-bold"]',
          '[class*="font-bold"][class*="text-"]',
        ]
        for (const searchEl of [card, parentContainer]) {
          if (offerPrice > 0) break
          for (const sel of priceSelectors) {
            const priceEl = searchEl.querySelector(sel)
            if (priceEl) {
              // Get all text including nested spans
              const fullText = priceEl.textContent?.replace(/\s+/g, '') || ''
              // Extract number (might be like "$3900" from "$39" + "00")
              const match = fullText.match(/\$?(\d+)(\d{2})?/)
              if (match) {
                const dollars = match[1]
                const cents = match[2] || '00'
                // If dollars part is > 2 digits and looks like combined (e.g., "3900")
                if (dollars.length > 2 && !fullText.includes('.')) {
                  // Split: last 2 digits are cents
                  const d = dollars.slice(0, -2)
                  const c = dollars.slice(-2)
                  offerPrice = parseFloat(`${d}.${c}`)
                } else {
                  offerPrice = parseFloat(`${dollars}.${cents}`)
                }
                break
              }
            }
          }
        }
        
        // Fallback: Look for any $XX pattern in card text
        if (offerPrice === 0) {
          const priceMatch = cardText.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/g)
          if (priceMatch) {
            for (const pm of priceMatch) {
              const val = parseFloat(pm.replace('$', '').replace(',', '').trim())
              if (val > 0 && val < 10000) {
                if (offerPrice === 0 || val < offerPrice) {
                  offerPrice = val
                }
              }
            }
          }
        }
        
        // Debug: Log what we found for first few cards
        if (cardIndex < 3) {
          console.log(`  -> merchantName: "${merchantName}"`)
          console.log(`  -> dealTitle: "${dealTitle.substring(0, 50)}..."`)
          console.log(`  -> offerPrice: $${offerPrice}, originalPrice: $${originalPrice}`)
        }
        
        // Tag/Badge - look for colored badge (bg-green-600, bg-amber-600, etc.)
        // e.g., "50+ vendido", "Trending", "New"
        let tag: string | null = null
        let totalSold: number | null = null
        
        // Badge is often in the image container which is a sibling to the card link
        // Structure: div.col-span > div.flex > [div.w-1/3 (image+badge)] + [a.w-2/3 (card)]
        // So we need to find the sibling image container
        const flexParent = card.closest('[class*="flex"][class*="relative"]') || 
                           card.parentElement
        const imageContainer = flexParent?.querySelector('[class*="w-1/3"]') ||
                               flexParent?.querySelector('[class*="relative"]:not(a)')
        
        // Search in card, parent container, and image container sibling for badge
        const elementsToSearch = [card, parentContainer]
        if (imageContainer && !elementsToSearch.includes(imageContainer as Element)) {
          elementsToSearch.push(imageContainer as Element)
        }
        
        for (const searchEl of elementsToSearch) {
          if (tag) break
          // Look for badge with colored background or positioned absolutely
          const badgeSelectors = [
            '[class*="bg-amber"]',
            '[class*="bg-green"]',
            '[class*="bg-red"]',
            '[class*="bg-orange"]',
            '[class*="absolute"][class*="top-"][class*="left-"]',
            'div[class*="absolute"]'
          ]
          for (const sel of badgeSelectors) {
            if (tag) break
            const badges = searchEl.querySelectorAll(sel)
            for (const badgeEl of badges) {
              const badgeText = badgeEl.textContent?.trim() || ''
              // Filter out non-badge elements (like buttons, prices)
              if (badgeText && 
                  badgeText.length < 50 && 
                  !badgeText.includes('$') &&
                  !badgeText.includes('Comprar') &&
                  (badgeText.toLowerCase().includes('trending') ||
                   badgeText.toLowerCase().includes('vendido') ||
                   badgeText.toLowerCase().includes('nuevo') ||
                   badgeText.toLowerCase().includes('new') ||
                   badgeText.toLowerCase().includes('hot') ||
                   /^\d+\+?\s/.test(badgeText))) {
                tag = badgeText
                // Try to extract sold count from tag (e.g., "50+ vendido" -> 50)
                const numMatch = badgeText.match(/(\d+)/)
                if (numMatch) {
                  totalSold = parseInt(numMatch[1], 10)
                }
                break
              }
            }
          }
        }
        
        // Debug: Log badge info for first few cards
        if (cardIndex < 3 && tag) {
          console.log(`  -> tag: "${tag}", totalSold: ${totalSold}`)
        }
        
        // Image - search in both card and parent container
        let imageUrl: string | null = null
        for (const searchEl of [card, parentContainer]) {
          if (imageUrl) break
          const imgEl = searchEl.querySelector('img')
          imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || null
        }
        
        dealsData.push({
          url,
          merchantName,
          dealTitle: dealTitle.substring(0, 200), // Limit length
          originalPrice,
          offerPrice,
          totalSold,
          tag,
          imageUrl,
        })
      } catch (e) {
        console.log('Error processing card:', e)
      }
    })
    
    return dealsData
  }, BASE_URL)
  
  console.log(`[Oferta24] Extracted ${deals.length} deals from page`)
  
  return deals
}

/**
 * Main scraper function for Oferta24
 */
export async function scrapeOferta24(
  maxDeals: number = 50,
  onProgress?: ProgressCallback
): Promise<ScrapeResult> {
  const deals: ScrapedDeal[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<ProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<ProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'oferta24',
        phase,
        message,
        ...extra,
      })
    }
    console.log(`[Oferta24] ${message}`)
  }
  
  try {
    // Launch browser using Vercel-compatible helper
    reportProgress('connecting', 'Launching browser...')
    const browser = await getBrowser()
    
    const page = await createPage(browser)
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })
    
    // Scrape deals from list page
    reportProgress('loading_list', 'Loading deals page...')
    
    // Debug: Log what we see on the page
    const debugInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyLength: document.body.innerHTML.length,
        allLinks: document.querySelectorAll('a').length,
        couponLinks: document.querySelectorAll('a[href*="/coupons/"]').length,
        anyHref: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map(a => a.getAttribute('href')),
      }
    })
    console.log('[Oferta24] Debug info:', JSON.stringify(debugInfo, null, 2))
    
    const rawDeals = await scrapeDealsPage(page)
    console.log(`[Oferta24] Extracted ${rawDeals.length} deals from page`)
    
    // Process deals (limit to maxDeals)
    const dealsToProcess = rawDeals.slice(0, maxDeals)
    const totalToProcess = dealsToProcess.length
    console.log(`[Oferta24] Will process ${totalToProcess} deals (limit: ${maxDeals})`)
    reportProgress('loading_list', `Found ${rawDeals.length} deals, processing ${totalToProcess}`)
    
    for (let i = 0; i < dealsToProcess.length; i++) {
      const rawDeal = dealsToProcess[i]
      const shortTitle = rawDeal.dealTitle.length > 40 
        ? rawDeal.dealTitle.substring(0, 40) + '...' 
        : rawDeal.dealTitle
      
      reportProgress('saving', `Processing deal ${i + 1}/${totalToProcess}: ${shortTitle}`, {
        current: i + 1,
        total: totalToProcess,
        dealTitle: rawDeal.dealTitle,
      })
      
      // Calculate discount percentage
      let discountPercent = 0
      if (rawDeal.originalPrice > 0 && rawDeal.offerPrice > 0) {
        discountPercent = Math.round(((rawDeal.originalPrice - rawDeal.offerPrice) / rawDeal.originalPrice) * 100)
      }
      
      const deal: ScrapedDeal = {
        sourceUrl: rawDeal.url,
        sourceSite: 'oferta24',
        merchantName: rawDeal.merchantName,
        dealTitle: rawDeal.dealTitle,
        originalPrice: rawDeal.originalPrice,
        offerPrice: rawDeal.offerPrice,
        discountPercent,
        totalSold: rawDeal.totalSold, // Can be null
        imageUrl: rawDeal.imageUrl,
        tag: rawDeal.tag, // Badge text like "50+ vendido"
      }
      
      deals.push(deal)
      
      if (rawDeal.totalSold !== null) {
        console.log(`  ✓ ${rawDeal.merchantName}: ${rawDeal.totalSold} sold, $${rawDeal.offerPrice} (${discountPercent}% off)`)
      } else {
        console.log(`  ○ ${rawDeal.merchantName}: No sales count, $${rawDeal.offerPrice} (${discountPercent}% off)`)
      }
    }
    
    reportProgress('complete', `Scan complete! Found ${deals.length} deals (${deals.filter(d => d.totalSold !== null).length} with sales data)`)
    
    return {
      success: true,
      deals,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `Oferta24 scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    reportProgress('error', errorMsg)
    
    return {
      success: false,
      deals,
      errors,
      scannedAt: new Date(),
    }
  } finally {
    await closeBrowser()
  }
}
