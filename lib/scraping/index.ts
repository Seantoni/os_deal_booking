/**
 * Market Intelligence - Web Scraping Module
 * 
 * Orchestrates scraping from multiple competitor deal sites
 */

import { prisma } from '@/lib/prisma'
import { scrapeRantanOfertas, getRantanOfertasDealUrls } from './rantanofertas'
import { scrapeOferta24 } from './oferta24'
import { scrapeTicketplus } from './ticketplus'
import { scrapePanatickets } from './panatickets'
import { scrapeEnLaTaquilla } from './enlataquilla'
import { scrapeDegusta } from './degusta'
import { scrapeBGeneral } from './bgeneral'
import { findMatchingBusiness } from '@/lib/matching/restaurant-business'
import { 
  ScrapedDeal, 
  ScrapeResult, 
  SourceSite, 
  ProgressCallback, 
  ScanProgress,
  ScrapedEvent,
  EventScrapeResult,
  EventSourceSite,
  EventProgressCallback,
  EventScanProgress,
  ScrapedRestaurant,
  RestaurantScrapeResult,
  RestaurantSourceSite,
  RestaurantProgressCallback,
  RestaurantScanProgress,
  ScrapedBGeneralPromo,
  BGeneralScrapeResult,
  BGeneralProgressCallback,
} from './types'

export * from './types'
export { getRantanOfertasDealUrls } from './rantanofertas'
export { scrapeTicketplus } from './ticketplus'
export { scrapePanatickets } from './panatickets'
export { scrapeEnLaTaquilla } from './enlataquilla'
export { scrapeDegusta } from './degusta'
export { scrapeBGeneral } from './bgeneral'

const MAX_DEALS_PER_SITE = 150 // 100 per site = 300 total max
const CHUNK_SIZE = 50 // 50 deals per invocation — rantanofertas now uses HTTP (no browser), so each deal is ~0.3-0.5s
const CHUNK_TIMEOUT_MS = 4 * 60 * 1000 // 4 minutes — must be under Vercel's 5min maxDuration

export { CHUNK_SIZE }

interface ScanResult {
  success: boolean
  totalDealsFound: number
  totalDealsWithSales: number
  newDeals: number
  updatedDeals: number
  errors: string[]
  duration: number // in seconds
}

/**
 * Save scraped deal to database, creating or updating as needed
 * Now handles deals without total sold (stores as 0 with a flag)
 */
async function saveDeal(scrapedDeal: ScrapedDeal): Promise<{ isNew: boolean; updated: boolean }> {
  const existingDeal = await prisma.competitorDeal.findUnique({
    where: { sourceUrl: scrapedDeal.sourceUrl },
  })
  
  // Use 0 if totalSold is null (we'll track that it has no sales data)
  const totalSoldValue = scrapedDeal.totalSold ?? 0
  
  if (existingDeal) {
    // Update existing deal
    const hasChanges = 
      existingDeal.totalSold !== totalSoldValue ||
      existingDeal.offerPrice.toNumber() !== scrapedDeal.offerPrice ||
      existingDeal.originalPrice.toNumber() !== scrapedDeal.originalPrice
    
    // Always update last scanned time
    await prisma.competitorDeal.update({
      where: { id: existingDeal.id },
      data: {
        totalSold: totalSoldValue,
        offerPrice: scrapedDeal.offerPrice,
        originalPrice: scrapedDeal.originalPrice,
        discountPercent: scrapedDeal.discountPercent,
        merchantName: scrapedDeal.merchantName,
        dealTitle: scrapedDeal.dealTitle,
        imageUrl: scrapedDeal.imageUrl,
        tag: scrapedDeal.tag,
        lastScannedAt: new Date(),
        status: 'active',
      },
    })
    
    // Create snapshot if there are changes and we have sales data
    if (hasChanges && scrapedDeal.totalSold !== null) {
      await prisma.competitorDealSnapshot.create({
        data: {
          dealId: existingDeal.id,
          totalSold: totalSoldValue,
          offerPrice: scrapedDeal.offerPrice,
          originalPrice: scrapedDeal.originalPrice,
        },
      })
    }
    
    return { isNew: false, updated: hasChanges }
  } else {
    // Create new deal
    const newDeal = await prisma.competitorDeal.create({
      data: {
        sourceUrl: scrapedDeal.sourceUrl,
        sourceSite: scrapedDeal.sourceSite,
        merchantName: scrapedDeal.merchantName,
        dealTitle: scrapedDeal.dealTitle,
        originalPrice: scrapedDeal.originalPrice,
        offerPrice: scrapedDeal.offerPrice,
        discountPercent: scrapedDeal.discountPercent,
        totalSold: totalSoldValue,
        imageUrl: scrapedDeal.imageUrl,
        tag: scrapedDeal.tag,
        status: 'active',
        isTracking: true,
      },
    })
    
    // Create initial snapshot only if we have sales data
    if (scrapedDeal.totalSold !== null) {
      await prisma.competitorDealSnapshot.create({
        data: {
          dealId: newDeal.id,
          totalSold: totalSoldValue,
          offerPrice: scrapedDeal.offerPrice,
          originalPrice: scrapedDeal.originalPrice,
        },
      })
    }
    
    return { isNew: true, updated: false }
  }
}

/**
 * Mark deals as expired if they weren't found in the latest scan
 * 
 * Logic: If a deal was active but NOT found in today's scan, mark it expired immediately.
 * The scan finds all currently available deals, so missing = no longer available.
 */
async function markExpiredDeals(sourceSite: SourceSite, foundUrls: string[]): Promise<number> {
  if (foundUrls.length === 0) {
    // Don't mark anything expired if we found 0 deals (likely a scan error)
    console.log(`[markExpiredDeals] Skipping - no deals found (possible scan error)`)
    return 0
  }
  
  const result = await prisma.competitorDeal.updateMany({
    where: {
      sourceSite,
      status: 'active',
      sourceUrl: { notIn: foundUrls },
    },
    data: {
      status: 'expired',
      expiresAt: new Date(), // Record when it expired
    },
  })
  
  if (result.count > 0) {
    console.log(`[markExpiredDeals] Marked ${result.count} ${sourceSite} deals as expired`)
  }
  
  return result.count
}

/**
 * Scan a specific site for deals
 */
async function scanSite(site: SourceSite, onProgress?: ProgressCallback, maxDeals?: number): Promise<ScrapeResult> {
  const limit = maxDeals ?? MAX_DEALS_PER_SITE
  switch (site) {
    case 'rantanofertas':
      return await scrapeRantanOfertas(limit, onProgress)
    case 'oferta24':
      return await scrapeOferta24(limit, onProgress)
    default:
      return {
        success: false,
        deals: [],
        errors: [`Unknown site: ${site}`],
        scannedAt: new Date(),
      }
  }
}

/**
 * Chunked scan result - includes info for continuation
 */
export interface ChunkedScanResult {
  success: boolean
  dealsProcessed: number
  dealsWithSales: number
  newDeals: number
  updatedDeals: number
  errors: string[]
  duration: number
  // Continuation info
  site: SourceSite
  totalAvailable: number
  nextStartFrom?: number // undefined if complete
  isComplete: boolean
}

/**
 * Run a chunked scan - processes CHUNK_SIZE deals and returns continuation info.
 * This is designed to stay under Vercel's timeout limit.
 *
 * An overall CHUNK_TIMEOUT_MS guard ensures the function always returns
 * before Vercel kills it, so the cron log can be completed properly.
 */
export async function runChunkedScan(
  site: SourceSite,
  startFrom: number = 0,
  onProgress?: ProgressCallback,
  dealUrlsJson?: string // Serialized deal URLs for continuation
): Promise<ChunkedScanResult> {
  const startTime = Date.now()

  // Race the actual work against an absolute timeout so the function
  // always returns a result — even if the browser hangs on a page.
  try {
    return await Promise.race([
      _runChunkedScanWork(site, startFrom, onProgress, dealUrlsJson),
      new Promise<ChunkedScanResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Chunk timed out after ${CHUNK_TIMEOUT_MS / 1000}s`)),
          CHUNK_TIMEOUT_MS,
        ),
      ),
    ])
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000
    const errorMsg = `Chunked scan timeout/error for ${site}: ${error instanceof Error ? error.message : 'Unknown'}`
    console.error(errorMsg)

    if (onProgress) {
      onProgress({ site, phase: 'error', message: errorMsg })
    }

    return {
      success: false,
      dealsProcessed: 0,
      dealsWithSales: 0,
      newDeals: 0,
      updatedDeals: 0,
      errors: [errorMsg],
      duration,
      site,
      totalAvailable: 0,
      nextStartFrom: startFrom > 0 ? startFrom : undefined, // allow retry from same position
      isComplete: false,
    }
  }
}

/** Inner implementation — extracted so it can be wrapped by the timeout race. */
async function _runChunkedScanWork(
  site: SourceSite,
  startFrom: number,
  onProgress?: ProgressCallback,
  dealUrlsJson?: string,
): Promise<ChunkedScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let newDeals = 0
  let updatedDeals = 0
  let dealsProcessed = 0
  let dealsWithSales = 0
  let totalAvailable = 0
  let nextStartFrom: number | undefined
  
  console.log(`\n=== Chunked Scan: ${site} (starting from ${startFrom}) ===`)
  
  try {
    if (site === 'rantanofertas') {
      // Parse pre-fetched URLs if provided
      let dealUrls: { url: string; imageUrl: string | null }[] | undefined
      if (dealUrlsJson) {
        try {
          dealUrls = JSON.parse(dealUrlsJson)
          console.log(`[ChunkedScan] Using ${dealUrls?.length} pre-fetched URLs`)
        } catch {
          console.log(`[ChunkedScan] Failed to parse dealUrls, will fetch fresh`)
        }
      }
      
      // If no pre-fetched URLs and starting from 0, get them first
      if (!dealUrls && startFrom === 0) {
        const urlResult = await getRantanOfertasDealUrls(onProgress)
        if (urlResult.error) {
          errors.push(urlResult.error)
        }
        dealUrls = urlResult.urls
      }
      
      // Run chunked scrape
      const result = await scrapeRantanOfertas(CHUNK_SIZE, onProgress, {
        startFrom,
        dealUrls,
      })
      
      totalAvailable = result.totalAvailable ?? 0
      nextStartFrom = result.nextStartFrom
      
      // Save deals progressively
      if (onProgress) {
        onProgress({
          site,
          phase: 'saving',
          message: `Saving ${result.deals.length} deals to database...`,
        })
      }
      
      for (const deal of result.deals) {
        try {
          const { isNew, updated } = await saveDeal(deal)
          if (isNew) newDeals++
          if (updated) updatedDeals++
          dealsProcessed++
          if (deal.totalSold !== null) dealsWithSales++
        } catch (err) {
          errors.push(`Failed to save deal: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
      
      errors.push(...result.errors)
      
    } else if (site === 'oferta24') {
      // Oferta24 is fast (no detail pages), run full scan
      const result = await scrapeOferta24(MAX_DEALS_PER_SITE, onProgress)
      
      totalAvailable = result.deals.length
      
      if (onProgress) {
        onProgress({
          site,
          phase: 'saving',
          message: `Saving ${result.deals.length} deals to database...`,
        })
      }
      
      for (const deal of result.deals) {
        try {
          const { isNew, updated } = await saveDeal(deal)
          if (isNew) newDeals++
          if (updated) updatedDeals++
          dealsProcessed++
          if (deal.totalSold !== null) dealsWithSales++
        } catch (err) {
          errors.push(`Failed to save deal: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
      
      errors.push(...result.errors)
      // Oferta24 completes in one go
      nextStartFrom = undefined
    }
    
    // Mark expired deals only when scan is complete
    if (!nextStartFrom) {
      // Get all active deal URLs for this site
      const activeDeals = await prisma.competitorDeal.findMany({
        where: { sourceSite: site, status: 'active' },
        select: { sourceUrl: true },
      })
      const activeUrls = activeDeals.map((d: { sourceUrl: string }) => d.sourceUrl)
      await markExpiredDeals(site, activeUrls)
    }
    
  } catch (error) {
    const errorMsg = `Chunked scan error for ${site}: ${error instanceof Error ? error.message : 'Unknown'}`
    errors.push(errorMsg)
    console.error(errorMsg)
    
    if (onProgress) {
      onProgress({ site, phase: 'error', message: errorMsg })
    }
  }
  
  const duration = (Date.now() - startTime) / 1000
  const isComplete = nextStartFrom === undefined
  
  console.log(`\n=== Chunk Complete ===`)
  console.log(`Duration: ${duration.toFixed(1)}s`)
  console.log(`Deals processed: ${dealsProcessed}`)
  console.log(`New: ${newDeals}, Updated: ${updatedDeals}`)
  console.log(`Is complete: ${isComplete}${!isComplete ? `, next start: ${nextStartFrom}` : ''}`)
  
  return {
    success: errors.length === 0,
    dealsProcessed,
    dealsWithSales,
    newDeals,
    updatedDeals,
    errors,
    duration,
    site,
    totalAvailable,
    nextStartFrom,
    isComplete,
  }
}

/**
 * Run a full scan of all competitor sites
 */
export async function runFullScan(onProgress?: ProgressCallback, maxDealsPerSite?: number): Promise<ScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let totalDealsFound = 0
  let totalDealsWithSales = 0
  let newDeals = 0
  let updatedDeals = 0
  
  const sites: SourceSite[] = ['oferta24', 'rantanofertas']
  
  for (const site of sites) {
    console.log(`\n=== Scanning ${site} ===`)
    
    try {
      const result = await scanSite(site, onProgress, maxDealsPerSite)
      
      if (!result.success) {
        errors.push(...result.errors)
        continue
      }
      
      totalDealsFound += result.deals.length
      totalDealsWithSales += result.deals.filter(d => d.totalSold !== null).length
      
      // Report saving progress
      if (onProgress) {
        onProgress({
          site,
          phase: 'saving',
          message: `Saving ${result.deals.length} deals to database...`,
        })
      }
      
      // Save deals to database
      for (const deal of result.deals) {
        const { isNew, updated } = await saveDeal(deal)
        if (isNew) newDeals++
        if (updated) updatedDeals++
      }
      
      // Mark expired deals
      const foundUrls = result.deals.map(d => d.sourceUrl)
      await markExpiredDeals(site, foundUrls)
      
      errors.push(...result.errors)
    } catch (error) {
      const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
      
      if (onProgress) {
        onProgress({
          site,
          phase: 'error',
          message: errorMsg,
        })
      }
    }
  }
  
  const duration = (Date.now() - startTime) / 1000
  
  console.log(`\n=== Scan Complete ===`)
  console.log(`Duration: ${duration.toFixed(1)}s`)
  console.log(`Total deals found: ${totalDealsFound}`)
  console.log(`Deals with sales data: ${totalDealsWithSales}`)
  console.log(`New deals: ${newDeals}`)
  console.log(`Updated deals: ${updatedDeals}`)
  console.log(`Errors: ${errors.length}`)
  
  return {
    success: errors.length === 0,
    totalDealsFound,
    totalDealsWithSales,
    newDeals,
    updatedDeals,
    errors,
    duration,
  }
}

/**
 * Scan a single site
 */
export async function runSiteScan(site: SourceSite, onProgress?: ProgressCallback): Promise<ScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let newDeals = 0
  let updatedDeals = 0
  
  console.log(`\n=== Scanning ${site} ===`)
  
  try {
    const result = await scanSite(site, onProgress)
    
    if (!result.success) {
      return {
        success: false,
        totalDealsFound: 0,
        totalDealsWithSales: 0,
        newDeals: 0,
        updatedDeals: 0,
        errors: result.errors,
        duration: (Date.now() - startTime) / 1000,
      }
    }
    
    const dealsWithSales = result.deals.filter(d => d.totalSold !== null)
    
    // Report saving progress
    if (onProgress) {
      onProgress({
        site,
        phase: 'saving',
        message: `Saving ${result.deals.length} deals to database...`,
      })
    }
    
    // Save deals to database
    for (const deal of result.deals) {
      const { isNew, updated } = await saveDeal(deal)
      if (isNew) newDeals++
      if (updated) updatedDeals++
    }
    
    // Mark expired deals
    const foundUrls = result.deals.map(d => d.sourceUrl)
    await markExpiredDeals(site, foundUrls)
    
    const duration = (Date.now() - startTime) / 1000
    
    return {
      success: true,
      totalDealsFound: result.deals.length,
      totalDealsWithSales: dealsWithSales.length,
      newDeals,
      updatedDeals,
      errors: result.errors,
      duration,
    }
  } catch (error) {
    const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
    
    if (onProgress) {
      onProgress({
        site,
        phase: 'error',
        message: errorMsg,
      })
    }
    
    return {
      success: false,
      totalDealsFound: 0,
      totalDealsWithSales: 0,
      newDeals: 0,
      updatedDeals: 0,
      errors: [errorMsg],
      duration: (Date.now() - startTime) / 1000,
    }
  }
}

// ============================================
// Event Lead Scraping Functions
// ============================================

const MAX_EVENTS_PER_SITE = 100

/**
 * Event scan result
 */
export interface EventScanResult {
  success: boolean
  eventsFound: number
  newEvents: number
  updatedEvents: number
  errors: string[]
  duration: number // in seconds
}

/**
 * Save scraped event to database, creating or updating as needed
 */
async function saveEventLead(scrapedEvent: ScrapedEvent): Promise<{ isNew: boolean; updated: boolean }> {
  const existingEvent = await prisma.eventLead.findUnique({
    where: { sourceUrl: scrapedEvent.sourceUrl },
  })
  
  if (existingEvent) {
    // Update existing event
    const hasChanges = 
      existingEvent.eventName !== scrapedEvent.eventName ||
      existingEvent.eventDate !== scrapedEvent.eventDate ||
      existingEvent.eventPlace !== scrapedEvent.eventPlace ||
      existingEvent.price !== scrapedEvent.price
    
    // Always update last scanned time
    await prisma.eventLead.update({
      where: { id: existingEvent.id },
      data: {
        eventName: scrapedEvent.eventName,
        eventDate: scrapedEvent.eventDate,
        eventPlace: scrapedEvent.eventPlace,
        promoter: scrapedEvent.promoter,
        imageUrl: scrapedEvent.imageUrl,
        price: scrapedEvent.price,
        lastScannedAt: new Date(),
        status: 'active',
      },
    })
    
    return { isNew: false, updated: hasChanges }
  } else {
    // Create new event lead
    await prisma.eventLead.create({
      data: {
        sourceUrl: scrapedEvent.sourceUrl,
        sourceSite: scrapedEvent.sourceSite,
        eventName: scrapedEvent.eventName,
        eventDate: scrapedEvent.eventDate,
        eventPlace: scrapedEvent.eventPlace,
        promoter: scrapedEvent.promoter,
        imageUrl: scrapedEvent.imageUrl,
        price: scrapedEvent.price,
        status: 'active',
      },
    })
    
    return { isNew: true, updated: false }
  }
}

/**
 * Mark event leads as expired if they weren't found in the latest scan
 */
async function markExpiredEventLeads(sourceSite: EventSourceSite, foundUrls: string[]): Promise<number> {
  if (foundUrls.length === 0) {
    // Don't mark anything expired if we found 0 events (likely a scan error)
    console.log(`[markExpiredEventLeads] Skipping - no events found (possible scan error)`)
    return 0
  }
  
  const result = await prisma.eventLead.updateMany({
    where: {
      sourceSite,
      status: 'active',
      sourceUrl: { notIn: foundUrls },
    },
    data: {
      status: 'expired',
    },
  })
  
  if (result.count > 0) {
    console.log(`[markExpiredEventLeads] Marked ${result.count} ${sourceSite} events as expired`)
  }
  
  return result.count
}

/**
 * Scan a specific event site
 */
async function scanEventSite(site: EventSourceSite, onProgress?: EventProgressCallback, maxEvents?: number): Promise<EventScrapeResult> {
  const limit = maxEvents ?? MAX_EVENTS_PER_SITE
  switch (site) {
    case 'ticketplus':
      return await scrapeTicketplus(limit, onProgress)
    case 'panatickets':
      return await scrapePanatickets(limit, onProgress)
    case 'enlataquilla':
      return await scrapeEnLaTaquilla(limit, onProgress)
    default:
      return {
        success: false,
        events: [],
        errors: [`Unknown event site: ${site}`],
        scannedAt: new Date(),
      }
  }
}

/**
 * Run a full scan of all event sites
 */
export async function runFullEventScan(onProgress?: EventProgressCallback, maxEventsPerSite?: number): Promise<EventScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let totalEventsFound = 0
  let newEvents = 0
  let updatedEvents = 0
  
  // All event sites
  const sites: EventSourceSite[] = ['ticketplus', 'panatickets', 'enlataquilla']
  
  for (const site of sites) {
    console.log(`\n=== Scanning Event Site: ${site} ===`)
    
    try {
      const result = await scanEventSite(site, onProgress, maxEventsPerSite)
      
      if (!result.success) {
        errors.push(...result.errors)
        continue
      }
      
      totalEventsFound += result.events.length
      
      // Report saving progress
      if (onProgress) {
        onProgress({
          site,
          phase: 'saving',
          message: `Saving ${result.events.length} events to database...`,
        })
      }
      
      // Save events to database
      for (const event of result.events) {
        try {
          const { isNew, updated } = await saveEventLead(event)
          if (isNew) newEvents++
          if (updated) updatedEvents++
        } catch (err) {
          errors.push(`Failed to save event: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
      
      // Mark expired events
      const foundUrls = result.events.map(e => e.sourceUrl)
      await markExpiredEventLeads(site, foundUrls)
      
      errors.push(...result.errors)
    } catch (error) {
      const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
      
      if (onProgress) {
        onProgress({
          site,
          phase: 'error',
          message: errorMsg,
        })
      }
    }
  }
  
  const duration = (Date.now() - startTime) / 1000
  
  console.log(`\n=== Event Scan Complete ===`)
  console.log(`Duration: ${duration.toFixed(1)}s`)
  console.log(`Total events found: ${totalEventsFound}`)
  console.log(`New events: ${newEvents}`)
  console.log(`Updated events: ${updatedEvents}`)
  console.log(`Errors: ${errors.length}`)
  
  return {
    success: errors.length === 0,
    eventsFound: totalEventsFound,
    newEvents,
    updatedEvents,
    errors,
    duration,
  }
}

/**
 * Scan a single event site
 */
export async function runEventSiteScan(site: EventSourceSite, onProgress?: EventProgressCallback): Promise<EventScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let newEvents = 0
  let updatedEvents = 0
  
  console.log(`\n=== Scanning Event Site: ${site} ===`)
  
  try {
    const result = await scanEventSite(site, onProgress)
    
    if (!result.success) {
      return {
        success: false,
        eventsFound: 0,
        newEvents: 0,
        updatedEvents: 0,
        errors: result.errors,
        duration: (Date.now() - startTime) / 1000,
      }
    }
    
    // Report saving progress
    if (onProgress) {
      onProgress({
        site,
        phase: 'saving',
        message: `Saving ${result.events.length} events to database...`,
      })
    }
    
    // Save events to database
    for (const event of result.events) {
      try {
        const { isNew, updated } = await saveEventLead(event)
        if (isNew) newEvents++
        if (updated) updatedEvents++
      } catch (err) {
        errors.push(`Failed to save event: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }
    
    // Mark expired events
    const foundUrls = result.events.map(e => e.sourceUrl)
    await markExpiredEventLeads(site, foundUrls)
    
    const duration = (Date.now() - startTime) / 1000
    
    return {
      success: true,
      eventsFound: result.events.length,
      newEvents,
      updatedEvents,
      errors: result.errors,
      duration,
    }
  } catch (error) {
    const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
    
    if (onProgress) {
      onProgress({
        site,
        phase: 'error',
        message: errorMsg,
      })
    }
    
    return {
      success: false,
      eventsFound: 0,
      newEvents: 0,
      updatedEvents: 0,
      errors: [errorMsg],
      duration: (Date.now() - startTime) / 1000,
    }
  }
}

// ============================================
// Restaurant Lead Scraping Functions
// ============================================

const MAX_RESTAURANTS_PER_SITE = 150

/**
 * Restaurant scan result
 */
export interface RestaurantScanResult {
  success: boolean
  restaurantsFound: number
  newRestaurants: number
  updatedRestaurants: number
  errors: string[]
  duration: number // in seconds
}

/**
 * Save scraped restaurant to database, creating or updating as needed
 * Also attempts to match with existing businesses
 */
async function saveRestaurantLead(scrapedRestaurant: ScrapedRestaurant): Promise<{ isNew: boolean; updated: boolean; matched: boolean }> {
  const existingRestaurant = await prisma.restaurantLead.findUnique({
    where: { sourceUrl: scrapedRestaurant.sourceUrl },
  })
  
  if (existingRestaurant) {
    // Update existing restaurant
    const hasChanges = 
      existingRestaurant.name !== scrapedRestaurant.name ||
      existingRestaurant.cuisine !== scrapedRestaurant.cuisine ||
      existingRestaurant.discount !== scrapedRestaurant.discount ||
      (existingRestaurant.pricePerPerson?.toNumber() ?? null) !== scrapedRestaurant.pricePerPerson
    
    // Try to match if not already matched and name changed
    let matchedBusinessId = existingRestaurant.matchedBusinessId
    let matchConfidence = existingRestaurant.matchConfidence?.toNumber() ?? null
    
    if (!matchedBusinessId || (hasChanges && existingRestaurant.name !== scrapedRestaurant.name)) {
      try {
        const match = await findMatchingBusiness(scrapedRestaurant.name)
        if (match) {
          matchedBusinessId = match.businessId
          matchConfidence = match.confidence
        }
      } catch (err) {
        console.error('Error matching business:', err)
      }
    }
    
    // Always update last scanned time
    await prisma.restaurantLead.update({
      where: { id: existingRestaurant.id },
      data: {
        name: scrapedRestaurant.name,
        cuisine: scrapedRestaurant.cuisine,
        address: scrapedRestaurant.address,
        neighborhood: scrapedRestaurant.neighborhood,
        pricePerPerson: scrapedRestaurant.pricePerPerson,
        discount: scrapedRestaurant.discount,
        votes: scrapedRestaurant.votes,
        foodRating: scrapedRestaurant.foodRating,
        serviceRating: scrapedRestaurant.serviceRating,
        ambientRating: scrapedRestaurant.ambientRating,
        imageUrl: scrapedRestaurant.imageUrl,
        matchedBusinessId,
        matchConfidence,
        lastScannedAt: new Date(),
      },
    })
    
    return { isNew: false, updated: hasChanges, matched: !!matchedBusinessId }
  } else {
    // Try to match with existing business
    let matchedBusinessId: string | null = null
    let matchConfidence: number | null = null
    
    try {
      const match = await findMatchingBusiness(scrapedRestaurant.name)
      if (match) {
        matchedBusinessId = match.businessId
        matchConfidence = match.confidence
      }
    } catch (err) {
      console.error('Error matching business:', err)
    }
    
    // Create new restaurant lead
    await prisma.restaurantLead.create({
      data: {
        sourceUrl: scrapedRestaurant.sourceUrl,
        sourceSite: scrapedRestaurant.sourceSite,
        name: scrapedRestaurant.name,
        cuisine: scrapedRestaurant.cuisine,
        address: scrapedRestaurant.address,
        neighborhood: scrapedRestaurant.neighborhood,
        pricePerPerson: scrapedRestaurant.pricePerPerson,
        discount: scrapedRestaurant.discount,
        votes: scrapedRestaurant.votes,
        foodRating: scrapedRestaurant.foodRating,
        serviceRating: scrapedRestaurant.serviceRating,
        ambientRating: scrapedRestaurant.ambientRating,
        imageUrl: scrapedRestaurant.imageUrl,
        matchedBusinessId,
        matchConfidence,
      },
    })
    
    return { isNew: true, updated: false, matched: !!matchedBusinessId }
  }
}

/**
 * Scan a specific restaurant site
 */
async function scanRestaurantSite(site: RestaurantSourceSite, onProgress?: RestaurantProgressCallback, maxRestaurants?: number): Promise<RestaurantScrapeResult> {
  const limit = maxRestaurants ?? MAX_RESTAURANTS_PER_SITE
  switch (site) {
    case 'degusta':
      return await scrapeDegusta(limit, onProgress)
    default:
      return {
        success: false,
        restaurants: [],
        errors: [`Unknown restaurant site: ${site}`],
        scannedAt: new Date(),
      }
  }
}

/**
 * Run a full scan of all restaurant sites
 */
export async function runFullRestaurantScan(onProgress?: RestaurantProgressCallback, maxRestaurantsPerSite?: number): Promise<RestaurantScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let totalRestaurantsFound = 0
  let newRestaurants = 0
  let updatedRestaurants = 0
  
  // All restaurant sites
  const sites: RestaurantSourceSite[] = ['degusta']
  
  for (const site of sites) {
    console.log(`\n=== Scanning Restaurant Site: ${site} ===`)
    
    try {
      const result = await scanRestaurantSite(site, onProgress, maxRestaurantsPerSite)
      
      if (!result.success) {
        errors.push(...result.errors)
        continue
      }
      
      totalRestaurantsFound += result.restaurants.length
      
      // Report saving progress
      if (onProgress) {
        onProgress({
          site,
          phase: 'saving',
          message: `Saving ${result.restaurants.length} restaurants to database...`,
        })
      }
      
      // Save restaurants to database
      for (const restaurant of result.restaurants) {
        try {
          const { isNew, updated } = await saveRestaurantLead(restaurant)
          if (isNew) newRestaurants++
          if (updated) updatedRestaurants++
        } catch (err) {
          errors.push(`Failed to save restaurant: ${err instanceof Error ? err.message : 'Unknown'}`)
        }
      }
      
      errors.push(...result.errors)
    } catch (error) {
      const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
      
      if (onProgress) {
        onProgress({
          site,
          phase: 'error',
          message: errorMsg,
        })
      }
    }
  }
  
  const duration = (Date.now() - startTime) / 1000
  
  console.log(`\n=== Restaurant Scan Complete ===`)
  console.log(`Duration: ${duration.toFixed(1)}s`)
  console.log(`Total restaurants found: ${totalRestaurantsFound}`)
  console.log(`New restaurants: ${newRestaurants}`)
  console.log(`Updated restaurants: ${updatedRestaurants}`)
  console.log(`Errors: ${errors.length}`)
  
  return {
    success: errors.length === 0,
    restaurantsFound: totalRestaurantsFound,
    newRestaurants,
    updatedRestaurants,
    errors,
    duration,
  }
}

/**
 * Scan a single restaurant site
 */
export async function runRestaurantSiteScan(site: RestaurantSourceSite, onProgress?: RestaurantProgressCallback): Promise<RestaurantScanResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let newRestaurants = 0
  let updatedRestaurants = 0
  
  console.log(`\n=== Scanning Restaurant Site: ${site} ===`)
  
  try {
    const result = await scanRestaurantSite(site, onProgress)
    
    if (!result.success) {
      return {
        success: false,
        restaurantsFound: 0,
        newRestaurants: 0,
        updatedRestaurants: 0,
        errors: result.errors,
        duration: (Date.now() - startTime) / 1000,
      }
    }
    
    // Report saving progress
    if (onProgress) {
      onProgress({
        site,
        phase: 'saving',
        message: `Saving ${result.restaurants.length} restaurants to database...`,
      })
    }
    
    // Save restaurants to database
    for (const restaurant of result.restaurants) {
      try {
        const { isNew, updated } = await saveRestaurantLead(restaurant)
        if (isNew) newRestaurants++
        if (updated) updatedRestaurants++
      } catch (err) {
        errors.push(`Failed to save restaurant: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }
    
    const duration = (Date.now() - startTime) / 1000
    
    return {
      success: true,
      restaurantsFound: result.restaurants.length,
      newRestaurants,
      updatedRestaurants,
      errors: result.errors,
      duration,
    }
  } catch (error) {
    const errorMsg = `Error scanning ${site}: ${error instanceof Error ? error.message : 'Unknown error'}`
    
    if (onProgress) {
      onProgress({
        site,
        phase: 'error',
        message: errorMsg,
      })
    }
    
    return {
      success: false,
      restaurantsFound: 0,
      newRestaurants: 0,
      updatedRestaurants: 0,
      errors: [errorMsg],
      duration: (Date.now() - startTime) / 1000,
    }
  }
}
