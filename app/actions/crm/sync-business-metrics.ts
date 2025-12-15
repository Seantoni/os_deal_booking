'use server'

import { prisma } from '@/lib/prisma'
import { handleServerActionError, type ServerActionResponse } from '@/lib/utils/server-actions'

type MetricsPayload = Record<
  string,
  {
    net_rev_360_days: number
    total_vouchers: number
    total_deals: number
    last_deal_id?: string
    last_deal_link?: string
  }
>

/**
 * Dummy fetch for vendor metrics data.
 * Replace this with a real API call. Expected payload:
 * { [vendor_id: string]: { net_rev_360_days, total_vouchers, total_deals, last_deal_id?, last_deal_link? } }
 */
async function fetchMetricsFromApi(): Promise<MetricsPayload> {
  return {
    'vendor-1': { net_rev_360_days: 12500, total_vouchers: 320, total_deals: 12, last_deal_id: 'deal-101', last_deal_link: 'https://example.com/deals/deal-101' },
    'vendor-2': { net_rev_360_days: 5400, total_vouchers: 120, total_deals: 5, last_deal_id: 'deal-88', last_deal_link: 'https://example.com/deals/deal-88' },
    'vendor-3': { net_rev_360_days: 22890, total_vouchers: 510, total_deals: 20, last_deal_id: 'deal-150', last_deal_link: 'https://example.com/deals/deal-150' },
  }
}

/**
 * Sync businesses from API data:
 * - Upsert businesses using vendor_id as the business id
 * - Store metrics (netRevenue360, totalVouchers, totalDeals, lastDealId, lastDealLink)
 * - For new businesses, fill minimal placeholders
 */
export async function syncBusinessesFromApi(): Promise<ServerActionResponse<MetricsPayload>> {
  try {
    const payload = await fetchMetricsFromApi()

    for (const [vendorId, data] of Object.entries(payload)) {
      const {
        net_rev_360_days = 0,
        total_vouchers = 0,
        total_deals = 0,
        last_deal_id = null,
        last_deal_link = null,
      } = data

      const name = `Vendor ${vendorId}`

      await prisma.business.upsert({
        where: { id: vendorId },
        update: {
          name,
          metrics: {
            net_rev_360_days,
            total_vouchers,
            total_deals,
            last_deal_id,
            last_deal_link,
          },
          sourceType: 'api',
        },
        create: {
          id: vendorId,
          name,
          contactName: 'Unknown',
          contactPhone: 'N/A',
          contactEmail: `${vendorId}@placeholder.test`,
          ownerId: null,
          salesTeam: null,
          website: null,
          instagram: null,
          description: null,
          tier: null,
          metrics: {
            net_rev_360_days,
            total_vouchers,
            total_deals,
            last_deal_id,
            last_deal_link,
          },
          sourceType: 'api',
        },
      })
    }

    return { success: true, data: payload }
  } catch (error) {
    return handleServerActionError(error, 'syncBusinessesFromApi')
  }
}

