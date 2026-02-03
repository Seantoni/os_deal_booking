'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/utils/server-actions'
import { Prisma } from '@prisma/client'
import { runBulkMatching } from '@/lib/matching/restaurant-business'

// ============================================
// Types
// ============================================

export type RestaurantLeadWithStats = {
  id: string
  sourceUrl: string
  sourceSite: string
  name: string
  cuisine: string | null
  address: string | null
  neighborhood: string | null
  pricePerPerson: number | null
  discount: string | null
  votes: number | null
  foodRating: number | null
  serviceRating: number | null
  ambientRating: number | null
  imageUrl: string | null
  matchedBusinessId: string | null
  matchedBusiness: { id: string; name: string } | null
  matchConfidence: number | null
  firstSeenAt: Date
  lastScannedAt: Date
  createdAt: Date
  updatedAt: Date
  // Computed
  isNew: boolean // First seen today
}

// ============================================
// Get Restaurant Leads (Paginated)
// ============================================

interface GetRestaurantLeadsParams {
  page?: number
  pageSize?: number
  sourceSite?: string
  search?: string
  sortBy?: 'name' | 'cuisine' | 'pricePerPerson' | 'votes' | 'foodRating' | 'discount' | 'firstSeenAt' | 'lastScannedAt'
  sortOrder?: 'asc' | 'desc'
  newOnly?: boolean
  hasDiscount?: boolean
}

export async function getRestaurantLeads({
  page = 1,
  pageSize = 50,
  sourceSite,
  search,
  sortBy = 'lastScannedAt',
  sortOrder = 'desc',
  newOnly = false,
  hasDiscount = false,
}: GetRestaurantLeadsParams = {}): Promise<{
  restaurants: RestaurantLeadWithStats[]
  total: number
  totalPages: number
}> {
  await requireAuth()
  
  // Build where clause
  const where: Prisma.RestaurantLeadWhereInput = {}
  
  if (sourceSite) {
    where.sourceSite = sourceSite
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cuisine: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }
  
  if (newOnly) {
    // First seen in the last 24 hours
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    where.firstSeenAt = { gte: yesterday }
  }
  
  if (hasDiscount) {
    where.discount = { not: null }
  }
  
  // Build order by
  const orderBy: Prisma.RestaurantLeadOrderByWithRelationInput = {}
  
  if (sortBy === 'pricePerPerson') {
    orderBy.pricePerPerson = sortOrder
  } else if (sortBy === 'votes') {
    orderBy.votes = sortOrder
  } else if (sortBy === 'foodRating') {
    orderBy.foodRating = sortOrder
  } else if (sortBy === 'name') {
    orderBy.name = sortOrder
  } else if (sortBy === 'cuisine') {
    orderBy.cuisine = sortOrder
  } else if (sortBy === 'firstSeenAt') {
    orderBy.firstSeenAt = sortOrder
  } else {
    orderBy.lastScannedAt = sortOrder
  }
  
  // Get total count
  const total = await prisma.restaurantLead.count({ where })
  
  // Get paginated results with matched business
  const restaurants = await prisma.restaurantLead.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      matchedBusiness: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
  
  // Calculate "new" status (first seen in last 24 hours)
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  
  const restaurantsWithStats: RestaurantLeadWithStats[] = restaurants.map(r => ({
    id: r.id,
    sourceUrl: r.sourceUrl,
    sourceSite: r.sourceSite,
    name: r.name,
    cuisine: r.cuisine,
    address: r.address,
    neighborhood: r.neighborhood,
    pricePerPerson: r.pricePerPerson ? Number(r.pricePerPerson) : null,
    discount: r.discount,
    votes: r.votes,
    foodRating: r.foodRating ? Number(r.foodRating) : null,
    serviceRating: r.serviceRating ? Number(r.serviceRating) : null,
    ambientRating: r.ambientRating ? Number(r.ambientRating) : null,
    imageUrl: r.imageUrl,
    matchedBusinessId: r.matchedBusinessId,
    matchedBusiness: r.matchedBusiness,
    matchConfidence: r.matchConfidence ? Number(r.matchConfidence) : null,
    firstSeenAt: r.firstSeenAt,
    lastScannedAt: r.lastScannedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    isNew: r.firstSeenAt >= yesterday,
  }))
  
  return {
    restaurants: restaurantsWithStats,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ============================================
// Get Restaurant Lead Stats
// ============================================

export async function getRestaurantLeadStats(): Promise<{
  totalRestaurants: number
  withDiscount: number
  bySite: { site: string; count: number }[]
  lastScanAt: Date | null
  newToday: number
  avgFoodRating: number | null
}> {
  await requireAuth()
  
  // Get counts
  const [
    totalRestaurants,
    withDiscount,
    bySiteRaw,
    lastScan,
    newTodayCount,
    avgRating,
  ] = await Promise.all([
    prisma.restaurantLead.count(),
    prisma.restaurantLead.count({ where: { discount: { not: null } } }),
    prisma.restaurantLead.groupBy({
      by: ['sourceSite'],
      _count: { id: true },
    }),
    prisma.restaurantLead.findFirst({
      orderBy: { lastScannedAt: 'desc' },
      select: { lastScannedAt: true },
    }),
    prisma.restaurantLead.count({
      where: {
        firstSeenAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.restaurantLead.aggregate({
      _avg: { foodRating: true },
      where: { foodRating: { not: null } },
    }),
  ])
  
  return {
    totalRestaurants,
    withDiscount,
    bySite: bySiteRaw.map(b => ({ site: b.sourceSite, count: b._count.id })),
    lastScanAt: lastScan?.lastScannedAt ?? null,
    newToday: newTodayCount,
    avgFoodRating: avgRating._avg.foodRating ? Number(avgRating._avg.foodRating) : null,
  }
}

// ============================================
// Get All Restaurant Leads for Export
// ============================================

interface GetAllRestaurantLeadsParams {
  sourceSite?: string
  search?: string
  hasDiscount?: boolean
}

export async function getAllRestaurantLeadsForExport({
  sourceSite,
  search,
  hasDiscount,
}: GetAllRestaurantLeadsParams = {}): Promise<RestaurantLeadWithStats[]> {
  await requireAuth()
  
  // Build where clause
  const where: Prisma.RestaurantLeadWhereInput = {}
  
  if (sourceSite) {
    where.sourceSite = sourceSite
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { cuisine: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }
  
  if (hasDiscount) {
    where.discount = { not: null }
  }
  
  const restaurants = await prisma.restaurantLead.findMany({
    where,
    orderBy: { lastScannedAt: 'desc' },
  })
  
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  
  return restaurants.map(r => ({
    id: r.id,
    sourceUrl: r.sourceUrl,
    sourceSite: r.sourceSite,
    name: r.name,
    cuisine: r.cuisine,
    address: r.address,
    neighborhood: r.neighborhood,
    pricePerPerson: r.pricePerPerson ? Number(r.pricePerPerson) : null,
    discount: r.discount,
    votes: r.votes,
    foodRating: r.foodRating ? Number(r.foodRating) : null,
    serviceRating: r.serviceRating ? Number(r.serviceRating) : null,
    ambientRating: r.ambientRating ? Number(r.ambientRating) : null,
    imageUrl: r.imageUrl,
    matchedBusinessId: null,
    matchedBusiness: null,
    matchConfidence: null,
    firstSeenAt: r.firstSeenAt,
    lastScannedAt: r.lastScannedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    isNew: r.firstSeenAt >= yesterday,
  }))
}

// ============================================
// Run Bulk Matching (On-Demand)
// ============================================

export async function runRestaurantBusinessMatching(): Promise<{
  success: boolean
  data?: {
    total: number
    matched: number
    updated: number
  }
  error?: string
}> {
  await requireAuth()
  
  try {
    const result = await runBulkMatching(0.8)
    
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error running bulk matching:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// Update Restaurant Lead Match (Manual Override)
// ============================================

export async function updateRestaurantLeadMatch(
  restaurantLeadId: string,
  businessId: string | null
): Promise<{
  success: boolean
  error?: string
}> {
  await requireAuth()
  
  try {
    await prisma.restaurantLead.update({
      where: { id: restaurantLeadId },
      data: {
        matchedBusinessId: businessId,
        matchConfidence: businessId ? 1.0 : null, // Manual match = 100% confidence
      },
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error updating restaurant lead match:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
