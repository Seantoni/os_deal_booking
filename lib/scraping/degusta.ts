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
    console.log(`[Degusta] ${message}`)
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
    
    try {
      await page.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT })
      console.log(`[Degusta] Navigation successful, URL: ${page.url()}`)
    } catch (navError) {
      console.error(`[Degusta] Navigation failed:`, navError)
      throw navError
    }
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, CONTENT_LOAD_WAIT))
    
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
      
      // Find all restaurant cards - they have the title link with class dg-result-restaurant-title
      const restaurantCards = document.querySelectorAll('.dg-result-restaurant-title')
      
      restaurantCards.forEach((titleEl) => {
        try {
          // Get the link element
          const linkEl = titleEl.querySelector('a')
          if (!linkEl) return
          
          // Get restaurant name and URL
          const name = linkEl.textContent?.trim() || ''
          const href = linkEl.getAttribute('href') || ''
          if (!name || !href) return
          
          // Build full URL
          const sourceUrl = href.startsWith('http') ? href : baseUrl + href
          
          // Find the parent card container - go up several levels to get the full card
          // The card structure has the image/discount in one column and info in another
          let card: Element | null = titleEl.closest('.col-12')?.parentElement || 
                                     titleEl.closest('.row') || 
                                     titleEl.closest('[class*="result"]')
          
          // Try to find an even larger container if needed (the full restaurant row)
          if (card) {
            const parentRow = card.closest('.row')?.parentElement?.closest('.row') || card.closest('.row')
            if (parentRow) {
              card = parentRow
            }
          }
          
          if (!card) return
          
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
          // The discount is usually in the image overlay area
          let discount: string | null = null
          // Try multiple selectors - the discount can be in different class patterns
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
        } catch (err) {
          console.error('Error extracting restaurant:', err)
        }
      })
      
      return results
    }, BASE_URL)
    
    console.log(`[Degusta] Found ${rawRestaurants.length} restaurants`)
    
    if (rawRestaurants.length === 0) {
      errors.push('No restaurants found on page')
      reportProgress('error', 'No restaurants found on page')
    }
    
    // Process and add to results (limit to maxRestaurants)
    const restaurantsToProcess = rawRestaurants.slice(0, maxRestaurants)
    
    for (let i = 0; i < restaurantsToProcess.length; i++) {
      const raw = restaurantsToProcess[i]
      
      reportProgress('extracting', `Processing restaurant ${i + 1}/${restaurantsToProcess.length}...`, {
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
        neighborhood: null, // Could extract from address if needed
        pricePerPerson: raw.pricePerPerson,
        discount: raw.discount,
        votes: raw.votes,
        foodRating: raw.foodRating,
        serviceRating: raw.serviceRating,
        ambientRating: raw.ambientRating,
        imageUrl: raw.imageUrl,
      }
      
      restaurants.push(restaurant)
      console.log(`  ✓ ${raw.name} - ${raw.cuisine || 'N/A'} - ${raw.discount || 'No discount'}`)
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
