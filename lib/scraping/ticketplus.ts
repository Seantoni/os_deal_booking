/**
 * Ticketplus Scraper
 * 
 * Scrapes events from https://ticketpluspty.com/
 * No pagination - all events are on the homepage
 */

import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedEvent, EventScrapeResult, EventProgressCallback } from './types'

const BASE_URL = 'https://ticketpluspty.com'

// Timeouts and wait times
const PAGE_TIMEOUT = 60000 // 60 seconds for page load
const CONTENT_LOAD_WAIT = 5000

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
 * Main scraper function for Ticketplus
 */
export async function scrapeTicketplus(
  maxEvents: number = 100,
  onProgress?: EventProgressCallback
): Promise<EventScrapeResult> {
  const events: ScrapedEvent[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<EventProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<EventProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'ticketplus',
        phase,
        message,
        ...extra,
      })
    }
    console.log(`[Ticketplus] ${message}`)
  }
  
  try {
    // Launch browser
    reportProgress('connecting', 'Launching browser...')
    const browser = await getBrowser()
    const page = await createPage(browser)
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })
    
    // Navigate to homepage
    reportProgress('loading_page', 'Loading events page...')
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
      console.log(`[Ticketplus] Navigation successful, URL: ${page.url()}`)
    } catch (navError) {
      console.error(`[Ticketplus] Navigation failed:`, navError)
      throw navError
    }
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONTENT_LOAD_WAIT))
    
    // Scroll to load all content
    reportProgress('loading_page', 'Scrolling to load all events...')
    let previousHeight = 0
    for (let i = 0; i < 5; i++) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight)
      if (currentHeight === previousHeight) break
      previousHeight = currentHeight
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Extract event data from cards
    reportProgress('extracting', 'Extracting event data from cards...')
    
    const rawEvents = await page.evaluate((baseUrl) => {
      const eventsData: RawEventData[] = []
      const processedUrls = new Set<string>()
      
      // Ticketplus structure based on the HTML:
      // Each event card contains:
      // - h1 for event name
      // - ul with li elements containing venue and date
      // - "Comprar Entrada" link
      // - Image with event poster
      
      // Find all event containers - they have "Comprar Entrada" links
      // Note: Using valid CSS selectors only (no Playwright-specific :has-text)
      const eventLinks = document.querySelectorAll('a[href*="comprar"], a.elementor-button')
      console.log(`[Ticketplus] Found ${eventLinks.length} potential event links`)
      
      // Try a different approach - find all sections/cards with event info
      // Look for h1 elements which contain event names
      const eventHeaders = document.querySelectorAll('h1')
      console.log(`[Ticketplus] Found ${eventHeaders.length} h1 elements`)
      
      eventHeaders.forEach((header, idx) => {
        try {
          const eventName = header.textContent?.trim() || ''
          
          // Skip empty or navigation headers
          if (!eventName || eventName.length < 3 || 
              eventName.toLowerCase().includes('ticketplus') ||
              eventName.toLowerCase().includes('inicio') ||
              eventName.toLowerCase().includes('mejores eventos')) {
            return
          }
          
          // Find the parent container that holds all event info
          // Go up until we find a section or article or div with substantial content
          let container = header.parentElement
          for (let i = 0; i < 5 && container; i++) {
            if (container.querySelector('a[href]') && 
                (container.querySelector('img') || container.querySelector('ul'))) {
              break
            }
            container = container.parentElement
          }
          
          if (!container) {
            container = header.parentElement
          }
          
          // Find the link to the event page
          let eventUrl = ''
          const links = container?.querySelectorAll('a[href]') || []
          for (const link of links) {
            const href = link.getAttribute('href') || ''
            // Look for "Comprar Entrada" or event-specific links
            if (href && !href.includes('#') && !href.includes('javascript') &&
                (link.textContent?.toLowerCase().includes('comprar') ||
                 href.includes('evento') || href.includes('event'))) {
              eventUrl = href.startsWith('http') ? href : `${baseUrl}${href}`
              break
            }
          }
          
          // If no specific link found, try any link in the container
          if (!eventUrl && links.length > 0) {
            for (const link of links) {
              const href = link.getAttribute('href') || ''
              if (href && !href.includes('#') && !href.includes('javascript') && 
                  href.startsWith('http')) {
                eventUrl = href
                break
              }
            }
          }
          
          // Skip if no URL or already processed
          if (!eventUrl || processedUrls.has(eventUrl)) {
            return
          }
          processedUrls.add(eventUrl)
          
          // Extract venue and date from list items
          let eventPlace: string | null = null
          let eventDate: string | null = null
          
          const listItems = container?.querySelectorAll('li') || []
          listItems.forEach(li => {
            const text = li.textContent?.trim() || ''
            // Date patterns: "27 FEB", "9 ABR", "ENE - MAR", etc.
            if (/\d+\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i.test(text) ||
                /^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s*[-–]\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i.test(text) ||
                /^\d+\s*(AL|Y)\s*\d+/i.test(text)) {
              eventDate = text
            }
            // Place patterns: Usually in CAPS, contains words like TEATRO, PLAZA, etc.
            else if (/^[A-Z\s\-–]+$/.test(text) || 
                     /(TEATRO|PLAZA|CENTRO|HOTEL|ATLAPA|FIGALI|BALBOA|MALL)/i.test(text)) {
              eventPlace = text
            }
          })
          
          // Also check for spans or other text elements
          if (!eventPlace || !eventDate) {
            const spans = container?.querySelectorAll('span, p, div') || []
            for (const el of spans) {
              const text = el.textContent?.trim() || ''
              if (!text || text.length > 100) continue
              
              if (!eventDate && 
                  (/\d+\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i.test(text) ||
                   /^(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i.test(text))) {
                eventDate = text
              }
              if (!eventPlace && 
                  /(TEATRO|PLAZA|CENTRO|HOTEL|ATLAPA|FIGALI|BALBOA|MALL)/i.test(text)) {
                eventPlace = text
              }
            }
          }
          
          // Extract image
          let imageUrl: string | null = null
          const img = container?.querySelector('img')
          if (img) {
            imageUrl = img.src || img.getAttribute('data-src') || null
          }
          
          // Extract price (class="text semi" or similar)
          let price: string | null = null
          const priceEl = container?.querySelector('.text.semi, [class*="precio"], [class*="price"]')
          if (priceEl) {
            price = priceEl.textContent?.trim() || null
          }
          // Also try to find any price pattern
          if (!price) {
            const containerText = container?.textContent || ''
            const priceMatch = containerText.match(/\$\s*[\d,.]+/)
            if (priceMatch) {
              price = priceMatch[0]
            }
          }
          
          eventsData.push({
            url: eventUrl,
            eventName,
            eventDate,
            eventPlace,
            promoter: null, // Will try to extract from page or leave null
            imageUrl,
            price,
          })
          
          if (idx < 5) {
            console.log(`[Ticketplus] Event ${idx}: "${eventName}", place: ${eventPlace}, date: ${eventDate}`)
          }
        } catch (err) {
          console.log(`[Ticketplus] Error processing event ${idx}:`, err)
        }
      })
      
      return eventsData
    }, BASE_URL)
    
    console.log(`[Ticketplus] Extracted ${rawEvents.length} events from page`)
    
    // If we didn't find events with the first approach, try an alternative
    if (rawEvents.length === 0) {
      console.log(`[Ticketplus] Trying alternative extraction method...`)
      
      const altEvents = await page.evaluate((baseUrl) => {
        const eventsData: RawEventData[] = []
        const processedUrls = new Set<string>()
        
        // Look for any anchor tags that look like event links
        const allLinks = document.querySelectorAll('a[href]')
        
        allLinks.forEach(link => {
          const href = link.getAttribute('href') || ''
          
          // Skip non-event links
          if (!href || href === '#' || href.includes('javascript') ||
              href.includes('facebook') || href.includes('twitter') ||
              href.includes('instagram') || href.includes('whatsapp') ||
              href.includes('preguntas') || href.includes('contacto') ||
              href.includes('blog') || href.includes('agendar') ||
              processedUrls.has(href)) {
            return
          }
          
          // Check if link text or parent contains "Comprar"
          const linkText = link.textContent?.trim() || ''
          if (linkText.toLowerCase().includes('comprar entrada') ||
              linkText.toLowerCase().includes('comprar')) {
            
            const url = href.startsWith('http') ? href : `${baseUrl}${href}`
            if (processedUrls.has(url)) return
            processedUrls.add(url)
            
            // Find the card/container
            let container = link.parentElement
            for (let i = 0; i < 8 && container; i++) {
              // Look for a container that has an h1 or heading
              if (container.querySelector('h1, h2, h3')) {
                break
              }
              container = container.parentElement
            }
            
            // Get event name from heading
            const heading = container?.querySelector('h1, h2, h3')
            const eventName = heading?.textContent?.trim() || ''
            
            if (!eventName || eventName.length < 3) return
            
            // Get venue/date from list items or text
            let eventPlace: string | null = null
            let eventDate: string | null = null
            
            const allText = container?.textContent || ''
            const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            
            for (const line of lines) {
              if (!eventDate && 
                  (/\d+\s*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)/i.test(line) ||
                   /^\d+\s*AL\s*\d+/i.test(line))) {
                eventDate = line.substring(0, 50)
              }
              if (!eventPlace && 
                  /(TEATRO|PLAZA|CENTRO|HOTEL|ATLAPA|FIGALI|BALBOA|MALL|WESTIN|SOHO)/i.test(line)) {
                eventPlace = line.substring(0, 100)
              }
            }
            
            // Get image
            const img = container?.querySelector('img')
            const imageUrl = img?.src || img?.getAttribute('data-src') || null
            
            eventsData.push({
              url,
              eventName,
              eventDate,
              eventPlace,
              promoter: null,
              imageUrl,
              price: null,
            })
          }
        })
        
        return eventsData
      }, BASE_URL)
      
      rawEvents.push(...altEvents)
      console.log(`[Ticketplus] Alternative method found ${altEvents.length} additional events`)
    }
    
    // Process events
    const eventsToProcess = rawEvents.slice(0, maxEvents)
    const totalToProcess = eventsToProcess.length
    console.log(`[Ticketplus] Will process ${totalToProcess} events (limit: ${maxEvents})`)
    reportProgress('extracting', `Found ${rawEvents.length} events, processing ${totalToProcess}`)
    
    for (let i = 0; i < eventsToProcess.length; i++) {
      const rawEvent = eventsToProcess[i]
      const shortName = rawEvent.eventName.length > 40 
        ? rawEvent.eventName.substring(0, 40) + '...' 
        : rawEvent.eventName
      
      reportProgress('saving', `Processing event ${i + 1}/${totalToProcess}: ${shortName}`, {
        current: i + 1,
        total: totalToProcess,
        eventName: rawEvent.eventName,
      })
      
      const event: ScrapedEvent = {
        sourceUrl: rawEvent.url,
        sourceSite: 'ticketplus',
        eventName: rawEvent.eventName,
        eventDate: rawEvent.eventDate,
        eventPlace: rawEvent.eventPlace,
        promoter: rawEvent.promoter,
        imageUrl: rawEvent.imageUrl,
        price: rawEvent.price,
      }
      
      events.push(event)
      console.log(`  ✓ ${rawEvent.eventName} @ ${rawEvent.eventPlace || 'Unknown venue'} - ${rawEvent.eventDate || 'No date'}`)
    }
    
    reportProgress('complete', `Scan complete! Found ${events.length} events`)
    
    return {
      success: true,
      events,
      errors,
      scannedAt: new Date(),
    }
  } catch (error) {
    const errorMsg = `Ticketplus scraper error: ${error instanceof Error ? error.message : 'Unknown error'}`
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
