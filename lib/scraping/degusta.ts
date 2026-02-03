/**
 * Degusta Panamá Scraper
 * 
 * Scrapes restaurants with discounts from https://www.degustapanama.com/
 */

import { getBrowser, closeBrowser, createPage } from './browser'
import { ScrapedRestaurant, RestaurantScrapeResult, RestaurantProgressCallback } from './types'

const BASE_URL = 'https://www.degustapanama.com'
// Search URL with discounts filter enabled
const SEARCH_URL = 'https://www.degustapanama.com/panama/search?filters=eyJmaWx0ZXJzIjp7ImRpc2NvdW50cyI6dHJ1ZX0sInNjb3JlX3JhbmdlIjp7fSwic29ydCI6InJhbmRvbSJ9'

// Timeouts and wait times
const PAGE_TIMEOUT = 60000 // 60 seconds for page load
const CONTENT_LOAD_WAIT = 3000

/**
 * Main scraper function for Degusta Panamá
 */
export async function scrapeDegusta(
  maxRestaurants: number = 100,
  onProgress?: RestaurantProgressCallback
): Promise<RestaurantScrapeResult> {
  const restaurants: ScrapedRestaurant[] = []
  const errors: string[] = []
  
  const reportProgress = (phase: Parameters<RestaurantProgressCallback>[0]['phase'], message: string, extra?: Partial<Parameters<RestaurantProgressCallback>[0]>) => {
    if (onProgress) {
      onProgress({
        site: 'degusta',
        phase,
        message,
        ...extra,
      })
    }
  }
  
  try {
    // Launch browser
    reportProgress('connecting', 'Launching browser...')
    const browser = await getBrowser()
    const page = await createPage(browser)
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 })
    
    // Navigate to search page with discounts filter
    reportProgress('loading_page', 'Loading search page...')
    
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONTENT_LOAD_WAIT))
    
    // Try to dismiss cookie consent or any popups
    try {
      const cookieSelectors = [
        'button[id*="cookie"]',
        'button[class*="cookie"]',
        'button[class*="accept"]',
        '[class*="consent"] button',
        '.cookie-banner button',
        '#onetrust-accept-btn-handler',
      ]
      for (const selector of cookieSelectors) {
        const btn = await page.$(selector)
        if (btn) {
          await btn.click()
          await new Promise(resolve => setTimeout(resolve, 1000))
          break
        }
      }
    } catch {
      // No cookie consent found, continue
    }
    
    // Wait for restaurant content to appear (with timeout)
    try {
      await page.waitForSelector('a[href*="restaurante"], .dg-result-restaurant-title', { 
        timeout: 10000 
      })
    } catch {
      reportProgress('loading_page', 'Waiting for content to load...')
    }
    
    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Scroll down to load more restaurants (lazy loading)
    reportProgress('loading_page', 'Scrolling to load more restaurants...')
    
    let previousHeight = 0
    let scrollAttempts = 0
    const maxScrollAttempts = 10
    
    while (scrollAttempts < maxScrollAttempts) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight)
      
      if (currentHeight === previousHeight) {
        // No more content to load
        break
      }
      
      previousHeight = currentHeight
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(resolve => setTimeout(resolve, 1500))
      scrollAttempts++
    }
    
    // Extract restaurant data
    reportProgress('extracting', 'Extracting restaurant data...')
    
    const rawRestaurants = await page.evaluate((baseUrl) => {
      const results: Array<{
        sourceUrl: string
        name: string
        cuisine: string | null
        address: string | null
        pricePerPerson: number | null
        discount: string | null
        votes: number | null
        foodRating: number | null
        serviceRating: number | null
        ambientRating: number | null
        imageUrl: string | null
      }> = []
      
      // Try multiple selectors to find restaurant cards
      // Strategy 1: Original selector
      let restaurantCards = document.querySelectorAll('.dg-result-restaurant-title')
      
      // Strategy 2: Look for h5 elements with restaurant links
      if (restaurantCards.length === 0) {
        restaurantCards = document.querySelectorAll('h5.h5 a[href*="restaurante"]')
      }
      
      // Strategy 3: Look for any link to restaurant pages
      if (restaurantCards.length === 0) {
        const allLinks = document.querySelectorAll('a[href*="/restaurante/"]')
        // Filter to unique restaurant links (avoid duplicates from image + text links)
        const uniqueUrls = new Set<string>()
        const uniqueLinks: Element[] = []
        allLinks.forEach(link => {
          const href = link.getAttribute('href')
          if (href && !uniqueUrls.has(href)) {
            uniqueUrls.add(href)
            uniqueLinks.push(link)
          }
        })
        restaurantCards = uniqueLinks as unknown as NodeListOf<Element>
      }
      
      // Strategy 4: Look for card-like containers
      if (restaurantCards.length === 0) {
        restaurantCards = document.querySelectorAll('[class*="card"][class*="restaurant"], [class*="result-item"]')
      }
      
      restaurantCards.forEach((titleEl) => {
        try {
          // Get the link element - it might be the element itself or a child
          let linkEl: Element | null = titleEl.querySelector('a')
          if (!linkEl && titleEl.tagName === 'A') {
            linkEl = titleEl
          }
          if (!linkEl) return
          
          // Get restaurant name and URL
          let name = linkEl.textContent?.trim() || ''
          const href = linkEl.getAttribute('href') || ''
          if (!href) return
          
          // Build full URL
          const sourceUrl = href.startsWith('http') ? href : baseUrl + href
          
          // Find the parent card container - go up several levels to get the full card
          // The card structure has the image/discount in one column and info in another
          let card: Element | null = linkEl.closest('.col-12')?.parentElement || 
                                     linkEl.closest('.row') || 
                                     linkEl.closest('[class*="result"]') ||
                                     linkEl.closest('[class*="card"]')
          
          // Try to find an even larger container if needed (the full restaurant row)
          if (card) {
            const parentRow = card.closest('.row')?.parentElement?.closest('.row') || card.closest('.row')
            if (parentRow) {
              card = parentRow
            }
          }
          
          // If we couldn't find a card, use the link's parent as fallback
          if (!card) {
            card = linkEl.parentElement?.parentElement?.parentElement || linkEl.parentElement
          }
          
          if (!card) return
          
          // If name is empty (e.g., we found an image link), try to get it from the card
          if (!name) {
            const cardTitleEl = card.querySelector('.dg-result-restaurant-title a, h5 a[href*="restaurante"]')
            if (cardTitleEl) {
              name = cardTitleEl.textContent?.trim() || ''
            }
          }
          
          // Extract name from URL as last resort
          if (!name && href) {
            // URL like /panama/restaurante/sugoi-condado-del-rey_109023.html
            const match = href.match(/restaurante\/([^_]+)/)
            if (match) {
              name = match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            }
          }
          
          if (!name) return
          
          // Find cuisine/food type
          let cuisine: string | null = null
          const cuisineEl = card.querySelector('.dg-result-restaurant-cuisine')
          if (cuisineEl) {
            cuisine = cuisineEl.textContent?.trim() || null
          }
          
          // Find address
          let address: string | null = null
          const addressEl = card.querySelector('.dg-result-restaurant-address')
          if (addressEl) {
            address = addressEl.textContent?.trim() || null
          }
          
          // Find price per person
          let pricePerPerson: number | null = null
          const priceEl = card.querySelector('.dg-result-restaurant-price')
          if (priceEl) {
            const priceText = priceEl.textContent?.trim() || ''
            const priceMatch = priceText.match(/\$(\d+)/)
            if (priceMatch) {
              pricePerPerson = parseInt(priceMatch[1], 10)
            }
          }
          
          // Find discount - look for elements with degusta discount classes
          let discount: string | null = null
          const discountSelectors = [
            '.degusta_estandar',
            '.degusta_premium', 
            '[class*="degusta_estandar"]',
            '[class*="degusta_premium"]',
            '.desc-block-v2-single',
            '.desc-block-v2-rsv-button-2',
            '[class*="desc-block"][class*="degusta"]',
          ]
          
          for (const selector of discountSelectors) {
            const discountEl = card.querySelector(selector)
            if (discountEl) {
              const text = discountEl.textContent?.trim()
              // Make sure it looks like a discount (contains % or OFF)
              if (text && (text.includes('%') || text.toLowerCase().includes('off'))) {
                discount = text
                break
              }
            }
          }
          
          // Find votes
          let votes: number | null = null
          const votesEl = card.querySelector('.dg-result-restaurant-number-qualifications')
          if (votesEl) {
            const votesText = votesEl.textContent?.trim() || ''
            const votesMatch = votesText.match(/(\d+)/)
            if (votesMatch) {
              votes = parseInt(votesMatch[1], 10)
            }
          }
          
          // Find ratings
          let foodRating: number | null = null
          let serviceRating: number | null = null
          let ambientRating: number | null = null
          
          const qualificationEls = card.querySelectorAll('.dg-result-restaurant-qualification')
          qualificationEls.forEach((qualEl) => {
            const descEl = qualEl.querySelector('.qualification-description')
            const scoreEl = qualEl.querySelector('.score-number')
            if (descEl && scoreEl) {
              const desc = descEl.textContent?.trim().toLowerCase() || ''
              const score = parseFloat(scoreEl.textContent?.trim() || '0')
              
              if (desc.includes('comida')) {
                foodRating = score
              } else if (desc.includes('servicio')) {
                serviceRating = score
              } else if (desc.includes('ambiente')) {
                ambientRating = score
              }
            }
          })
          
          // Find image
          let imageUrl: string | null = null
          const imgEl = card.querySelector('.img-cropped-search')
          if (imgEl) {
            imageUrl = imgEl.getAttribute('src') || null
          }
          
          results.push({
            sourceUrl,
            name,
            cuisine,
            address,
            pricePerPerson,
            discount,
            votes,
            foodRating,
            serviceRating,
            ambientRating,
            imageUrl,
          })
        } catch {
          // Skip this restaurant if extraction fails
        }
      })
      
      return results
    }, BASE_URL)
    
    if (rawRestaurants.length === 0) {
      errors.push('No restaurants found on page')
      reportProgress('error', 'No restaurants found on page')
    }
    
    // Process and add to results (limit to maxRestaurants)
    const restaurantsToProcess = rawRestaurants.slice(0, maxRestaurants)
    
    for (let i = 0; i < restaurantsToProcess.length; i++) {
      const raw = restaurantsToProcess[i]
      
      reportProgress('extracting', `Processing restaurant ${i + 1}/${restaurantsToProcess.length}: ${raw.name}`, {
        current: i + 1,
        total: restaurantsToProcess.length,
        restaurantName: raw.name,
      })
      
      const restaurant: ScrapedRestaurant = {
        sourceUrl: raw.sourceUrl,
        sourceSite: 'degusta',
        name: raw.name,
        cuisine: raw.cuisine,
        address: raw.address,
        neighborhood: null,
        pricePerPerson: raw.pricePerPerson,
        discount: raw.discount,
        votes: raw.votes,
        foodRating: raw.foodRating,
        serviceRating: raw.serviceRating,
        ambientRating: raw.ambientRating,
        imageUrl: raw.imageUrl,
      }
      
      restaurants.push(restaurant)
    }
    
    reportProgress('complete', `Scan complete! Found ${restaurants.length} restaurants`)
    
    return {
      success: errors.length < restaurants.length,
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
  } finally {
    await closeBrowser()
  }
}
