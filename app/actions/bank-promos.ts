'use server'

import { prisma } from '@/lib/prisma'
import { requireAuthOrThrow } from '@/lib/utils/server-actions'
import type { Prisma } from '@prisma/client'
import type { ScrapedBGeneralPromo } from '@/lib/scraping/types'
import { findMatchingBusinessesBatch } from '@/lib/matching/business-name'

// ============================================
// Types
// ============================================

export type BankPromoWithMeta = {
  id: string
  sourceUrl: string
  sourceSite: string
  externalId: string
  businessName: string
  discountText: string
  discountPercent: number | null
  startDate: string
  endDate: string
  conditions: string | null
  matchedBusinessId: string | null
  matchedBusiness: {
    id: string
    name: string
    owner: { name: string | null; email: string | null } | null
  } | null
  matchConfidence: number | null
  lastScannedAt: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================
// Get Bank Promos (Paginated)
// ============================================

interface GetBankPromosParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: 'businessName' | 'discountText' | 'startDate' | 'endDate' | 'lastScannedAt'
  sortOrder?: 'asc' | 'desc'
}

export async function getBankPromos({
  page = 1,
  pageSize = 50,
  search,
  sortBy = 'lastScannedAt',
  sortOrder = 'desc',
}: GetBankPromosParams = {}): Promise<{
  promos: BankPromoWithMeta[]
  total: number
  totalPages: number
}> {
  await requireAuthOrThrow()

  const where: Prisma.BankPromoWhereInput = {}
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: 'insensitive' } },
      { discountText: { contains: search, mode: 'insensitive' } },
      { conditions: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Prisma.BankPromoOrderByWithRelationInput = {}
  if (sortBy === 'businessName') orderBy.businessName = sortOrder
  else if (sortBy === 'discountText') orderBy.discountText = sortOrder
  else if (sortBy === 'startDate') orderBy.startDate = sortOrder
  else if (sortBy === 'endDate') orderBy.endDate = sortOrder
  else orderBy.lastScannedAt = sortOrder

  const [promos, total] = await Promise.all([
    prisma.bankPromo.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        matchedBusiness: {
          select: {
            id: true,
            name: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.bankPromo.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    promos: promos.map((p) => ({
      id: p.id,
      sourceUrl: p.sourceUrl,
      sourceSite: p.sourceSite,
      externalId: p.externalId,
      businessName: p.businessName,
      discountText: p.discountText,
      discountPercent: p.discountPercent,
      startDate: p.startDate,
      endDate: p.endDate,
      conditions: p.conditions,
      matchedBusinessId: p.matchedBusinessId,
      matchedBusiness: p.matchedBusiness,
      matchConfidence: p.matchConfidence ? Number(p.matchConfidence) : null,
      lastScannedAt: p.lastScannedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    total,
    totalPages,
  }
}

// ============================================
// Get Bank Promo Stats
// ============================================

export async function getBankPromoStats(): Promise<{
  totalPromos: number
  lastScanAt: Date | null
}> {
  await requireAuthOrThrow()

  const [totalPromos, lastScan] = await Promise.all([
    prisma.bankPromo.count(),
    prisma.bankPromo.findFirst({
      orderBy: { lastScannedAt: 'desc' },
      select: { lastScannedAt: true },
    }),
  ])

  return {
    totalPromos,
    lastScanAt: lastScan?.lastScannedAt ?? null,
  }
}

// ============================================
// Save promos from scraper result (upsert by sourceUrl)
// ============================================

/**
 * Upsert bank promos from scraped data. No auth check — for use by cron or after auth.
 */
export async function upsertBankPromosFromScan(
  scraped: ScrapedBGeneralPromo[]
): Promise<{ saved: number; created: number; updated: number }> {
  let created = 0
  let updated = 0

  for (const p of scraped) {
    const existing = await prisma.bankPromo.findUnique({
      where: { sourceUrl: p.sourceUrl },
    })

    const data = {
      sourceSite: p.sourceSite,
      externalId: p.externalId,
      businessName: p.businessName,
      discountText: p.discountText,
      discountPercent: p.discountPercent,
      startDate: p.startDate,
      endDate: p.endDate,
      conditions: p.conditions,
      lastScannedAt: new Date(),
    }

    if (existing) {
      await prisma.bankPromo.update({
        where: { id: existing.id },
        data,
      })
      updated++
    } else {
      await prisma.bankPromo.create({
        data: {
          sourceUrl: p.sourceUrl,
          ...data,
        },
      })
      created++
    }
  }

  return { saved: scraped.length, created, updated }
}

export async function saveBankPromosFromScan(
  scraped: ScrapedBGeneralPromo[]
): Promise<{ saved: number; created: number; updated: number }> {
  await requireAuthOrThrow()
  return upsertBankPromosFromScan(scraped)
}

// ============================================
// Run Bulk Business Matching (Bank Promos)
// ============================================

export async function runBankPromoBusinessMatching(): Promise<{
  success: boolean
  data?: { total: number; matched: number; updated: number }
  error?: string
}> {
  await requireAuthOrThrow()
  try {
    const unmatched = await prisma.bankPromo.findMany({
      where: { matchedBusinessId: null },
      select: { id: true, businessName: true },
    })
    if (unmatched.length === 0) {
      return { success: true, data: { total: 0, matched: 0, updated: 0 } }
    }
    const matches = await findMatchingBusinessesBatch(
      unmatched.map((p) => ({ id: p.id, name: p.businessName })),
      0.8
    )
    let updated = 0
    for (const [promoId, match] of matches) {
      await prisma.bankPromo.update({
        where: { id: promoId },
        data: {
          matchedBusinessId: match.businessId,
          matchConfidence: match.confidence,
        },
      })
      updated++
    }
    return {
      success: true,
      data: {
        total: unmatched.length,
        matched: matches.size,
        updated,
      },
    }
  } catch (error) {
    console.error('Error running bank promo business matching:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Update Bank Promo Match (Manual Override)
// ============================================

export async function updateBankPromoMatch(
  bankPromoId: string,
  businessId: string | null
): Promise<{ success: boolean; error?: string }> {
  await requireAuthOrThrow()
  try {
    await prisma.bankPromo.update({
      where: { id: bankPromoId },
      data: {
        matchedBusinessId: businessId,
        matchConfidence: businessId ? 1.0 : null,
      },
    })
    return { success: true }
  } catch (error) {
    console.error('Error updating bank promo match:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
