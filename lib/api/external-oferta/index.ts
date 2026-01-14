/**
 * External Oferta API
 * 
 * Unified module for all external OfertaSimple API integrations.
 * 
 * Structure:
 * - shared/  : Constants, HTTP utilities, logger
 * - deal/    : Deal creation API (types, mapper, client)
 * - vendor/  : Vendor creation API (types, mapper, client)
 * 
 * @example
 * ```typescript
 * // Import deal functions
 * import { sendDealToExternalApi, ExternalOfertaDealRequest } from '@/lib/api/external-oferta'
 * 
 * // Import vendor functions
 * import { sendVendorToExternalApi, ExternalOfertaVendorRequest } from '@/lib/api/external-oferta'
 * 
 * // Import logger
 * import { getRecentApiRequests } from '@/lib/api/external-oferta'
 * ```
 */

// Shared utilities
export * from './shared'

// Deal API
export * from './deal'

// Vendor API
export * from './vendor'
