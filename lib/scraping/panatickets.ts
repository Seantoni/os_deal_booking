/**
 * Panatickets Scraper
 * 
 * Scrapes events from https://panatickets.boletosenlinea.events/
 * Requires visiting each event detail page to get full info
 */

import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedEvent, EventScrapeResult, EventProgressCallback } from './types'

const BASE_URL = 'https://panatickets.boletosenlinea.events'

// Timeouts and wait times
const PAGE_TIMEOUT = 60000 // 60 seconds for page load
const DETAIL_PAGE_TIMEOUT = 30000
const CONTENT_LOAD_WAIT = 3000

interface RawEventData {
  url: string
  eventName: string
  eventDate: string | null
  eventPlace: string | null
  promoter: string | null
  imageUrl: string | null
  price: string | null
}

/**
 * Main scraper function for Panatickets
 */
export async function scrapePanatickets(
  maxEvents: number = 50,
  onProgress?: EventProgressCallback
): Promise<EventScrapeResult> {
  const events: ScrapedEvent[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<EventProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<EventProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'panatickets',
        phase,
        message,
        ...extra,
      })
    }
    console.log(`[Panatickets] ${message}`)
  }
  
  try {
    // Launch browser
    reportProgress('connecting', 'Launching browser...')
    const browser = await getBrowser()
    const page = await createPage(browser)
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })
    
    // Navigate to homepage
    reportProgress('loading_page', 'Loading homepage...')
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
      console.log(`[Panatickets] Navigation successful, URL: ${page.url()}`)
    } catch (navError) {
      console.error(`[Panatickets] Navigation failed:`, navError)
      throw navError
    }
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONTENT_LOAD_WAIT))
    
    // Extract all event URLs from the homepage
    reportProgress('loading_page', 'Extracting event links from homepage...')
    
    const eventUrls = await page.evaluate((baseUrl) => {
      const urls: { url: string; imageUrl: string | null }[] = []
      const processedUrls = new Set<string>()
      
      // Find all "Comprar" links that go to event pages
      // Pattern: eventperformances.asp?evt=XXXX
      const links = document.querySelectorAll('a[href*="eventperformances.asp"]')
      
      links.forEach(link => {
        const href = link.getAttribute('href')
        if (!href) return
        
        // Handle different URL formats:
        // - Full URL: "https://..." or "http://..."
        // - Protocol-relative: "//domain.com/..."
        // - Absolute path: "/path/..."
        // - Relative path: "path/..."
        let fullUrl: string
        if (href.startsWith('http://') || href.startsWith('https://')) {
          fullUrl = href
        } else if (href.startsWith('//')) {
          // Protocol-relative URL
          fullUrl = 'https:' + href
        } else if (href.startsWith('/')) {
          // Absolute path
          fullUrl = baseUrl + href
        } else {
          // Relative path
          fullUrl = baseUrl + '/' + href
        }
        
        // Skip duplicates
        if (processedUrls.has(fullUrl)) return
        processedUrls.add(fullUrl)
        
        // Try to find the associated image
        // The image is usually in a sibling or parent td element
        let imageUrl: string | null = null
        const parentTd = link.closest('td')
        if (parentTd) {
          const parentTable = parentTd.closest('table')
          if (parentTable) {
            const img = parentTable.querySelector('img')
            if (img) {
              imageUrl = img.src || null
            }
          }
        }
        
        // Also try looking in previous sibling rows
        if (!imageUrl) {
          const row = link.closest('tr')
          if (row) {
            const prevRow = row.previousElementSibling
            if (prevRow) {
              const img = prevRow.querySelector('img')
              if (img) {
                imageUrl = img.src || null
              }
            }
          }
        }
        
        urls.push({ url: fullUrl, imageUrl })
      })
      
      return urls
    }, BASE_URL)
    
    console.log(`[Panatickets] Found ${eventUrls.length} event URLs`)
    
    if (eventUrls.length === 0) {
      errors.push('No event URLs found on homepage')
      reportProgress('error', 'No event URLs found on homepage')
      return {
        success: false,
        events: [],
        errors,
        scannedAt: new Date(),
      }
    }
    
    // Limit the number of events to process
    const urlsToProcess = eventUrls.slice(0, maxEvents)
    const totalToProcess = urlsToProcess.length
    
    reportProgress('extracting', `Found ${eventUrls.length} events, processing ${totalToProcess}...`)
    
    // Visit each event page and extract details
    for (let i = 0; i < urlsToProcess.length; i++) {
      const { url, imageUrl } = urlsToProcess[i]
      
      try {
        reportProgress('extracting', `Processing event ${i + 1}/${totalToProcess}...`, {
          current: i + 1,
          total: totalToProcess,
        })
        
        // Navigate to event detail page
        await page.goto(url, { waitUntil: 'networkidle2', timeout: DETAIL_PAGE_TIMEOUT })
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Extract event details including image from the detail page
        const eventData = await page.evaluate(() => {
          // Event name - h3 element
          const h3 = document.querySelector('h3')
          const eventName = h3?.textContent?.trim() || ''
          
          // Location - span.pl-venue
          let eventPlace: string | null = null
          const venueSpan = document.querySelector('.pl-venue')
          if (venueSpan) {
            // Get all text content and clean it up
            const venueText = venueSpan.textContent?.trim() || ''
            // Clean up whitespace and newlines
            eventPlace = venueText.replace(/\s+/g, ' ').trim()
          }
          
          // Date - span.pl-date > time
          let eventDate: string | null = null
          const dateSpan = document.querySelector('.pl-date')
          if (dateSpan) {
            const timeEl = dateSpan.querySelector('time')
            if (timeEl) {
              eventDate = timeEl.textContent?.trim() || null
            } else {
              eventDate = dateSpan.textContent?.trim() || null
            }
          }
          
          // Try to get price if available
          let price: string | null = null
          // Look for price patterns in the page
          const pricePatterns = document.querySelectorAll('[class*="price"], [class*="precio"]')
          if (pricePatterns.length > 0) {
            price = pricePatterns[0].textContent?.trim() || null
          }
          
          // Also try to find price in text like "$XX.XX"
          if (!price) {
            const bodyText = document.body.innerText
            const priceMatch = bodyText.match(/\$\s*[\d,.]+/)
            if (priceMatch) {
              price = priceMatch[0]
            }
          }
          
          // Extract image from detail page
          // Look for the main event image - typically a large image in the content area
          let detailImageUrl: string | null = null
          
          // Try common patterns for event images
          // 1. Look for images near the event info (pl-info, pl-venue, etc.)
          const plInfo = document.querySelector('.pl-info')
          if (plInfo) {
            const parentContainer = plInfo.closest('div')?.parentElement
            if (parentContainer) {
              const img = parentContainer.querySelector('img')
              if (img && img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
                detailImageUrl = img.src
              }
            }
          }
          
          // 2. Look for images in the main content area
          if (!detailImageUrl) {
            const mainImages = document.querySelectorAll('img')
            for (const img of mainImages) {
              const src = img.src || ''
              // Skip small images, icons, logos
              if (src.includes('logo') || src.includes('icon') || src.includes('banner')) continue
              // Check if it's a reasonable size (event images are usually larger)
              if (img.naturalWidth > 100 || img.width > 100) {
                detailImageUrl = src
                break
              }
            }
          }
          
          // 3. Look for background images in divs
          if (!detailImageUrl) {
            const divsWithBg = document.querySelectorAll('[style*="background-image"]')
            for (const div of divsWithBg) {
              const style = div.getAttribute('style') || ''
              const match = style.match(/url\(['"]?([^'"()]+)['"]?\)/)
              if (match && match[1] && !match[1].includes('logo')) {
                detailImageUrl = match[1]
                break
              }
            }
          }
          
          return {
            eventName,
            eventDate,
            eventPlace,
            price,
            detailImageUrl,
          }
        })
        
        // Only add if we have a valid event name
        if (eventData.eventName && eventData.eventName.length > 2) {
          // Prefer image from detail page, fall back to homepage image
          const finalImageUrl = eventData.detailImageUrl || imageUrl
          
          const event: ScrapedEvent = {
            sourceUrl: url,
            sourceSite: 'panatickets',
            eventName: eventData.eventName,
            eventDate: eventData.eventDate,
            eventPlace: eventData.eventPlace,
            promoter: null, // Panatickets doesn't show promoter on detail page
            imageUrl: finalImageUrl,
            price: eventData.price,
          }
          
          events.push(event)
          console.log(`  ✓ ${eventData.eventName} @ ${eventData.eventPlace || 'Unknown'} - ${eventData.eventDate || 'No date'}`)
          if (finalImageUrl) {
            console.log(`    Image: ${finalImageUrl.substring(0, 80)}...`)
          }
        } else {
          console.log(`  ○ Skipped - no valid event name found at ${url}`)
        }
        
        // Small delay between requests to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (err) {
        const errorMsg = `Failed to scrape ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`
        console.error(`  ✗ ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    
    reportProgress('complete', `Scan complete! Found ${events.length} events`)
    
    return {
      success: errors.length < events.length, // Success if we got at least some events
      events,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `Panatickets scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    reportProgress('error', errorMsg)
    
    return {
      success: false,
      events,
      errors,
      scannedAt: new Date(),
    }
  } finally {
    await closeBrowser()
  }
}
