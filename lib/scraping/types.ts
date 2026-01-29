/**
 * Types for web scraping competitor deals
 */

export interface ScrapedDeal {
  sourceUrl: string
  sourceSite: 'rantanofertas' | 'oferta24'
  merchantName: string
  dealTitle: string
  originalPrice: number
  offerPrice: number
  discountPercent: number
  totalSold: number | null // null if not available
  imageUrl: string | null
  tag: string | null // Badge text like "50+ vendido", "Trending"
}

export interface ScrapeResult {
  success: boolean
  deals: ScrapedDeal[]
  errors: string[]
  scannedAt: Date
}

export type SourceSite = 'rantanofertas' | 'oferta24'

export const SOURCE_SITES: Record<SourceSite, { name: string; baseUrl: string }> = {
  rantanofertas: {
    name: 'RantanOfertas',
    baseUrl: 'https://www.rantanofertas.com',
  },
  oferta24: {
    name: 'Oferta24',
    baseUrl: 'https://www.oferta24.com',
  },
}

// Progress callback for real-time updates
export type ProgressCallback = (progress: ScanProgress) => void

export interface ScanProgress {
  site: SourceSite
  phase: 'connecting' | 'loading_list' | 'scanning_deal' | 'saving' | 'complete' | 'error'
  message: string
  current?: number
  total?: number
  dealTitle?: string
}

// ============================================
// Event Lead Types (ticket sites scraping)
// ============================================

export type EventSourceSite = 'ticketplus' | 'panatickets'

export interface ScrapedEvent {
  sourceUrl: string
  sourceSite: EventSourceSite
  eventName: string
  eventDate: string | null // Raw date string from card (e.g., "27 FEB", "9 ABR")
  eventPlace: string | null // Venue name
  promoter: string | null // Who is promoting the event
  imageUrl: string | null
  price: string | null // Price text (may have range)
}

export interface EventScrapeResult {
  success: boolean
  events: ScrapedEvent[]
  errors: string[]
  scannedAt: Date
}

export const EVENT_SOURCE_SITES: Record<EventSourceSite, { name: string; baseUrl: string }> = {
  ticketplus: {
    name: 'Ticketplus',
    baseUrl: 'https://ticketpluspty.com',
  },
  panatickets: {
    name: 'Panatickets',
    baseUrl: 'https://panatickets.boletosenlinea.events',
  },
}

// Progress callback for event scraping
export type EventProgressCallback = (progress: EventScanProgress) => void

export interface EventScanProgress {
  site: EventSourceSite
  phase: 'connecting' | 'loading_page' | 'extracting' | 'saving' | 'complete' | 'error'
  message: string
  current?: number
  total?: number
  eventName?: string
}

