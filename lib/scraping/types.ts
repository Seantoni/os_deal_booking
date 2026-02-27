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

export type EventSourceSite = 'ticketplus' | 'panatickets' | 'enlataquilla'

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
  enlataquilla: {
    name: 'En La Taquilla',
    baseUrl: 'https://enlataquilla.com',
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

// ============================================
// Restaurant Lead Types (Degusta, etc.)
// ============================================

export type RestaurantSourceSite = 'degusta'

export interface ScrapedRestaurant {
  sourceUrl: string
  sourceSite: RestaurantSourceSite
  name: string
  cuisine: string | null       // Food type (e.g., "Japonesa, Asiática, Fusion")
  address: string | null
  neighborhood: string | null
  pricePerPerson: number | null  // Price in dollars
  discount: string | null      // Discount text (e.g., "10% OFF")
  votes: number | null         // Number of votes/reviews
  foodRating: number | null    // e.g., 4.8
  serviceRating: number | null
  ambientRating: number | null
  imageUrl: string | null
}

export interface RestaurantScrapeResult {
  success: boolean
  restaurants: ScrapedRestaurant[]
  errors: string[]
  scannedAt: Date
}

export const RESTAURANT_SOURCE_SITES: Record<RestaurantSourceSite, { name: string; baseUrl: string }> = {
  degusta: {
    name: 'Degusta Panamá',
    baseUrl: 'https://www.degustapanama.com',
  },
}

// Progress callback for restaurant scraping
export type RestaurantProgressCallback = (progress: RestaurantScanProgress) => void

export interface RestaurantScanProgress {
  site: RestaurantSourceSite
  phase: 'connecting' | 'loading_page' | 'extracting' | 'saving' | 'complete' | 'error'
  message: string
  current?: number
  total?: number
  restaurantName?: string
}

// ============================================
// Banco General Promotions (bgeneral.com)
// ============================================

export type BGeneralSourceSite = 'bgeneral'

export interface ScrapedBGeneralPromo {
  sourceUrl: string
  sourceSite: BGeneralSourceSite
  externalId: string // WordPress post ID
  businessName: string
  discountText: string // e.g. "75% de descuento", "2×1"
  discountPercent: number | null // parsed when possible (e.g. 75, 40)
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  conditions: string | null // Full "Condiciones" block text
}

export interface BGeneralScrapeResult {
  success: boolean
  promos: ScrapedBGeneralPromo[]
  errors: string[]
  scannedAt: Date
}

export type BGeneralProgressCallback = (progress: BGeneralScanProgress) => void

export interface BGeneralScanProgress {
  site: BGeneralSourceSite
  phase: 'connecting' | 'loading_list' | 'loading_detail' | 'extracting' | 'complete' | 'error'
  message: string
  current?: number
  total?: number
  businessName?: string
}

export const BGENERAL_SOURCE_SITES: Record<BGeneralSourceSite, { name: string; baseUrl: string }> = {
  bgeneral: {
    name: 'Banco General Promociones',
    baseUrl: 'https://www.bgeneral.com',
  },
}
