'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getUserRole } from '@/lib/auth/roles'
import type { EventLead } from '@prisma/client'

// Inline type definition to avoid Prisma cache issues
type WhereInput = {
  sourceSite?: string
  status?: string
  firstSeenAt?: { gte?: Date; lt?: Date }
  OR?: Array<{
    eventName?: { contains: string; mode: 'insensitive' }
    eventPlace?: { contains: string; mode: 'insensitive' }
    promoter?: { contains: string; mode: 'insensitive' }
  }>
}

// Type for groupBy result
interface GroupBySiteResult {
  sourceSite: string
  _count: { id: number }
}

// Types
export interface EventLeadWithStats {
  id: string
  sourceUrl: string
  sourceSite: string
  eventName: string
  eventDate: string | null
  eventPlace: string | null
  promoter: string | null
  imageUrl: string | null
  price: string | null
  status: string
  firstSeenAt: Date
  lastScannedAt: Date
}

interface GetEventLeadsParams {
  page?: number
  pageSize?: number
  sourceSite?: string
  status?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  newOnly?: boolean // Filter for events first seen today
}

interface GetEventLeadsResult {
  events: EventLeadWithStats[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Check if user has admin access
 */
async function checkAdminAccess(): Promise<boolean> {
  const role = await getUserRole()
  return role === 'admin'
}

// Valid database columns that can be used in Prisma orderBy
const VALID_DB_SORT_FIELDS = new Set([
  'id', 'sourceUrl', 'sourceSite', 'eventName', 'eventDate',
  'eventPlace', 'promoter', 'imageUrl', 'price', 'status',
  'firstSeenAt', 'lastScannedAt', 'createdAt', 'updatedAt'
])

/**
 * Get event leads with pagination, filtering, and sorting
 */
export async function getEventLeads(params: GetEventLeadsParams = {}): Promise<GetEventLeadsResult> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { events: [], total: 0, page: 1, pageSize: 25, totalPages: 0 }
  }
  
  const {
    page = 1,
    pageSize = 25,
    sourceSite,
    status,
    search,
    sortBy = 'lastScannedAt',
    sortOrder = 'desc',
    newOnly = false,
  } = params
  
  // Build where clause
  const where: WhereInput = {}
  
  if (sourceSite) {
    where.sourceSite = sourceSite
  }
  
  if (status) {
    where.status = status
  }
  
  if (search) {
    where.OR = [
      { eventName: { contains: search, mode: 'insensitive' } },
      { eventPlace: { contains: search, mode: 'insensitive' } },
      { promoter: { contains: search, mode: 'insensitive' } },
    ]
  }
  
  // Filter for events first seen today
  if (newOnly) {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrowStart = new Date(todayStart)
    tomorrowStart.setDate(tomorrowStart.getDate() + 1)
    
    where.firstSeenAt = {
      gte: todayStart,
      lt: tomorrowStart,
    }
  }
  
  // Get total count
  const total = await prisma.eventLead.count({ where })
  
  // Validate sort field
  const validSortBy = VALID_DB_SORT_FIELDS.has(sortBy) ? sortBy : 'lastScannedAt'
  
  // Get events with pagination
  const events = await prisma.eventLead.findMany({
    where,
    orderBy: { [validSortBy]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })
  
  // Map to response type
  const eventsWithStats: EventLeadWithStats[] = events.map((event: EventLead) => ({
    id: event.id,
    sourceUrl: event.sourceUrl,
    sourceSite: event.sourceSite,
    eventName: event.eventName,
    eventDate: event.eventDate,
    eventPlace: event.eventPlace,
    promoter: event.promoter,
    imageUrl: event.imageUrl,
    price: event.price,
    status: event.status,
    firstSeenAt: event.firstSeenAt,
    lastScannedAt: event.lastScannedAt,
  }))
  
  return {
    events: eventsWithStats,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Get a single event lead
 */
export async function getEventLead(eventId: string): Promise<EventLeadWithStats | null> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return null
  }
  
  const event = await prisma.eventLead.findUnique({
    where: { id: eventId },
  })
  
  if (!event) {
    return null
  }
  
  return {
    id: event.id,
    sourceUrl: event.sourceUrl,
    sourceSite: event.sourceSite,
    eventName: event.eventName,
    eventDate: event.eventDate,
    eventPlace: event.eventPlace,
    promoter: event.promoter,
    imageUrl: event.imageUrl,
    price: event.price,
    status: event.status,
    firstSeenAt: event.firstSeenAt,
    lastScannedAt: event.lastScannedAt,
  }
}

/**
 * Delete an event lead
 */
export async function deleteEventLead(eventId: string): Promise<{ success: boolean }> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return { success: false }
  }
  
  await prisma.eventLead.delete({
    where: { id: eventId },
  })
  
  revalidatePath('/leads-negocios')
  return { success: true }
}

/**
 * Get summary stats for the event leads dashboard
 */
export async function getEventLeadStats(): Promise<{
  totalEvents: number
  activeEvents: number
  bySite: { site: string; count: number }[]
  lastScanAt: Date | null
  newToday: number
}> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return {
      totalEvents: 0,
      activeEvents: 0,
      bySite: [],
      lastScanAt: null,
      newToday: 0,
    }
  }
  
  // Time boundaries
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const [
    totalEvents, 
    activeEvents, 
    bySiteStats, 
    lastEvent,
    newToday,
  ] = await Promise.all([
    prisma.eventLead.count(),
    prisma.eventLead.count({ where: { status: 'active' } }),
    // Get count by site
    prisma.eventLead.groupBy({
      by: ['sourceSite'],
      _count: { id: true },
      where: { status: 'active' },
    }),
    prisma.eventLead.findFirst({
      orderBy: { lastScannedAt: 'desc' },
      select: { lastScannedAt: true },
    }),
    // Count new events today
    prisma.eventLead.count({
      where: {
        firstSeenAt: { gte: todayStart },
      },
    }),
  ])
  
  return {
    totalEvents,
    activeEvents,
    bySite: bySiteStats.map((r: GroupBySiteResult) => ({ 
      site: r.sourceSite, 
      count: r._count.id,
    })),
    lastScanAt: lastEvent?.lastScannedAt || null,
    newToday,
  }
}

/**
 * Search event leads (for quick search)
 */
export async function searchEventLeads(
  query: string,
  options?: { limit?: number; sourceSite?: string }
): Promise<EventLeadWithStats[]> {
  const isAdmin = await checkAdminAccess()
  if (!isAdmin) {
    return []
  }
  
  const limit = options?.limit ?? 50
  
  const where: WhereInput = {
    OR: [
      { eventName: { contains: query, mode: 'insensitive' } },
      { eventPlace: { contains: query, mode: 'insensitive' } },
      { promoter: { contains: query, mode: 'insensitive' } },
    ],
  }
  
  if (options?.sourceSite) {
    where.sourceSite = options.sourceSite
  }
  
  const events = await prisma.eventLead.findMany({
    where,
    orderBy: { lastScannedAt: 'desc' },
    take: limit,
  })
  
  return events.map((event: EventLead) => ({
    id: event.id,
    sourceUrl: event.sourceUrl,
    sourceSite: event.sourceSite,
    eventName: event.eventName,
    eventDate: event.eventDate,
    eventPlace: event.eventPlace,
    promoter: event.promoter,
    imageUrl: event.imageUrl,
    price: event.price,
    status: event.status,
    firstSeenAt: event.firstSeenAt,
    lastScannedAt: event.lastScannedAt,
  }))
}
