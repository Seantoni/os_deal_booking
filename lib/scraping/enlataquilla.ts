/**
 * En La Taquilla Scraper
 * 
 * Scrapes events from https://enlataquilla.com/
 * Uses WooCommerce Product Table structure
 */

import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedEvent, EventScrapeResult, EventProgressCallback } from './types'

const BASE_URL = 'https://enlataquilla.com'

// Timeouts and wait times
const PAGE_TIMEOUT = 60000 // 60 seconds for page load
const CONTENT_LOAD_WAIT = 3000

/**
 * Main scraper function for En La Taquilla
 */
export async function scrapeEnLaTaquilla(
  maxEvents: number = 50,
  onProgress?: EventProgressCallback
): Promise<EventScrapeResult> {
  const events: ScrapedEvent[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<EventProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<EventProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'enlataquilla',
        phase,
        message,
        ...extra,
      })
    }
    console.log(`[EnLaTaquilla] ${message}`)
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
      console.log(`[EnLaTaquilla] Navigation successful, URL: ${page.url()}`)
    } catch (navError) {
      console.error(`[EnLaTaquilla] Navigation failed:`, navError)
      throw navError
    }
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONTENT_LOAD_WAIT))
    
    // Extract all events from the homepage table
    reportProgress('extracting', 'Extracting events from page...')
    
    const rawEvents = await page.evaluate((baseUrl) => {
      const eventList: {
        sourceUrl: string
        eventName: string
        eventDate: string | null
        eventPlace: string | null
        imageUrl: string | null
        price: string | null
      }[] = []
      
      // The site uses WooCommerce Product Table
      // Events are in table rows with various wcpt-* classes
      
      // Find all event title links (wcpt-title class)
      const titleLinks = document.querySelectorAll('a.wcpt-title')
      
      titleLinks.forEach(titleLink => {
        const href = titleLink.getAttribute('href')
        const eventName = titleLink.textContent?.trim() || ''
        
        if (!href || !eventName) return
        
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`
        
        // Navigate up to find the row/container for this event
        // The structure varies but typically in a table row or div container
        let container: Element | null = titleLink.closest('tr') ?? titleLink.closest('td')?.parentElement?.closest('tr') ?? null
        if (!container) {
          // Try finding a common parent div
          container = titleLink.closest('[class*="wcpt"]')?.parentElement ?? null
        }
        
        let imageUrl: string | null = null
        let eventDate: string | null = null
        let eventPlace: string | null = null
        let price: string | null = null
        
        if (container) {
          // Find image - look for img.wp-post-image or any img in the container
          const img = container.querySelector('img.wp-post-image') || container.querySelector('img[src*="uploads"]')
          if (img) {
            // Get the largest image from srcset if available
            const srcset = img.getAttribute('srcset')
            if (srcset) {
              // Parse srcset to get the largest image
              const sources = srcset.split(',').map(s => {
                const parts = s.trim().split(' ')
                const url = parts[0]
                const width = parseInt(parts[1]?.replace('w', '') || '0')
                return { url, width }
              })
              // Sort by width descending and get the largest (but not too large)
              const sorted = sources.sort((a, b) => b.width - a.width)
              const preferred = sorted.find(s => s.width <= 1024 && s.width >= 400) || sorted[0]
              if (preferred) {
                imageUrl = preferred.url
              }
            }
            if (!imageUrl) {
              imageUrl = img.getAttribute('src')
            }
          }
          
          // Find date - look for custom field divs
          // The date field has a specific class pattern
          const allDivs = container.querySelectorAll('div.wcpt-custom-field')
          allDivs.forEach(div => {
            const text = div.textContent?.trim() || ''
            
            // Check if it looks like a date (contains month names or date patterns)
            const datePatterns = [
              /\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i, // "14 de Marzo de 2026"
              /\d{1,2}[\s,]+\d{1,2}[\s,]+.*de\s+\w+/i, // "04, 05 y 06 de Febrero"
              /del?\s+\d{1,2}.*al\s+\d{1,2}/i, // "del 24 de Febrero al 14 de Marzo"
              /\d{1,2}\s+de\s+\w+/i, // "18 de Enero"
            ]
            
            if (datePatterns.some(pattern => pattern.test(text))) {
              if (!eventDate) {
                eventDate = text
              }
            }
            // Check if it looks like a location (contains location keywords or is long text)
            else if (
              text.includes(' - ') || 
              text.includes('Calle') || 
              text.includes('Panamá') ||
              text.includes('Plaza') ||
              text.includes('Teatro') ||
              text.includes('Local')
            ) {
              if (!eventPlace) {
                eventPlace = text
              }
            }
          })
          
          // Find price - look for price patterns
          const priceContainer = container.querySelector('[class*="price"]') || 
                                 container.querySelector('td:last-child') ||
                                 container
          if (priceContainer) {
            const priceText = priceContainer.textContent || ''
            // Match price patterns like "$25.00-$55.00" or "$10.00"
            const priceMatch = priceText.match(/\$[\d.,]+(?:\s*-\s*\$[\d.,]+)?/)
            if (priceMatch) {
              price = priceMatch[0]
            }
          }
        }
        
        // Also try to get data from parent table structure
        if (!imageUrl || !eventDate || !eventPlace) {
          // Find the table row
          const row = titleLink.closest('tr')
          if (row) {
            // Get all cells in this row
            const cells = row.querySelectorAll('td')
            cells.forEach(cell => {
              // Check for image
              if (!imageUrl) {
                const img = cell.querySelector('img')
                if (img) {
                  const srcset = img.getAttribute('srcset')
                  if (srcset) {
                    const sources = srcset.split(',').map(s => {
                      const parts = s.trim().split(' ')
                      return { url: parts[0], width: parseInt(parts[1]?.replace('w', '') || '0') }
                    })
                    const sorted = sources.sort((a, b) => b.width - a.width)
                    const preferred = sorted.find(s => s.width <= 1024 && s.width >= 400) || sorted[0]
                    if (preferred) imageUrl = preferred.url
                  }
                  if (!imageUrl) imageUrl = img.getAttribute('src')
                }
              }
              
              // Check for date/location in custom fields
              const customFields = cell.querySelectorAll('div.wcpt-custom-field')
              customFields.forEach(field => {
                const text = field.textContent?.trim() || ''
                
                // Date patterns
                if (!eventDate && /\d{1,2}.*de\s+\w+/i.test(text)) {
                  eventDate = text
                }
                // Location patterns
                else if (!eventPlace && (
                  text.includes(' - ') || 
                  text.includes('Calle') || 
                  text.includes('Panamá')
                )) {
                  eventPlace = text
                }
              })
              
              // Check for price
              if (!price) {
                const cellText = cell.textContent || ''
                const priceMatch = cellText.match(/\$[\d.,]+(?:\s*-\s*\$[\d.,]+)?/)
                if (priceMatch) {
                  price = priceMatch[0]
                }
              }
            })
          }
        }
        
        eventList.push({
          sourceUrl: fullUrl,
          eventName,
          eventDate,
          eventPlace,
          imageUrl,
          price,
        })
      })
      
      return eventList
    }, BASE_URL)
    
    console.log(`[EnLaTaquilla] Found ${rawEvents.length} events`)
    
    if (rawEvents.length === 0) {
      errors.push('No events found on homepage')
      reportProgress('error', 'No events found on homepage')
      return {
        success: false,
        events: [],
        errors,
        scannedAt: new Date(),
      }
    }
    
    // Process events
    const eventsToProcess = rawEvents.slice(0, maxEvents)
    const totalToProcess = eventsToProcess.length
    
    reportProgress('extracting', `Processing ${totalToProcess} events...`)
    
    for (let i = 0; i < eventsToProcess.length; i++) {
      const rawEvent = eventsToProcess[i]
      
      reportProgress('extracting', `Processing event ${i + 1}/${totalToProcess}: ${rawEvent.eventName}`, {
        current: i + 1,
        total: totalToProcess,
      })
      
      // Only add if we have a valid event name
      if (rawEvent.eventName && rawEvent.eventName.length > 2) {
        const event: ScrapedEvent = {
          sourceUrl: rawEvent.sourceUrl,
          sourceSite: 'enlataquilla',
          eventName: rawEvent.eventName,
          eventDate: rawEvent.eventDate,
          eventPlace: rawEvent.eventPlace,
          promoter: null, // Not available on this site
          imageUrl: rawEvent.imageUrl,
          price: rawEvent.price,
        }
        
        events.push(event)
        console.log(`  ✓ ${rawEvent.eventName}`)
        if (rawEvent.eventPlace) console.log(`    Location: ${rawEvent.eventPlace}`)
        if (rawEvent.eventDate) console.log(`    Date: ${rawEvent.eventDate}`)
        if (rawEvent.imageUrl) console.log(`    Image: ${rawEvent.imageUrl.substring(0, 60)}...`)
      } else {
        console.log(`  ○ Skipped - no valid event name`)
      }
    }
    
    reportProgress('complete', `Scan complete! Found ${events.length} events`)
    
    return {
      success: errors.length < events.length,
      events,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `EnLaTaquilla scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
