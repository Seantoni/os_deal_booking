/**
 * CRM Actions - Domain Barrel
 *
 * Groups all CRM-related server actions in one place:
 * - Businesses
 * - Opportunities
 * - Deals
 * - Leads
 * - Deal drafts
 *
 * Preferred import for CRM actions:
 *   import { getBusinesses, getOpportunities } from '@/app/actions/crm'
 */

// Businesses
export * from './businesses'

// Opportunities
export * from './opportunities'

// Deals
export * from './deals'

// Leads
export * from './leads'

// Deal draft (AI-assisted deal content)
export * from './dealDraft'
