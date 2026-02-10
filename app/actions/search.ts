'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { getUserRole } from '@/lib/auth/roles'

export interface SearchResult {
  id: string
  type: 'business' | 'opportunity' | 'booking-request' | 'deal' | 'event' | 'task' | 'lead'
  title: string
  subtitle?: string
  status?: string
  url: string
}

export interface GroupedSearchResults {
  businesses: SearchResult[]
  opportunities: SearchResult[]
  bookingRequests: SearchResult[]
  deals: SearchResult[]
  events: SearchResult[]
  tasks: SearchResult[]
  leads: SearchResult[]
}

/**
 * Global search across all entities with parallel queries
 */
export async function globalSearch(query: string): Promise<{ success: boolean; data?: GroupedSearchResults; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }
  const { userId } = authResult

  if (!query || query.trim().length < 2) {
    return { success: true, data: { businesses: [], opportunities: [], bookingRequests: [], deals: [], events: [], tasks: [], leads: [] } }
  }

  try {
    const role = await getUserRole()
    const searchTerm = query.trim().toLowerCase()
    
    // Check if searching by ID (alphanumeric string that looks like an ID)
    const isIdSearch = /^[a-z0-9]{20,}$/i.test(query.trim())

    // Build all queries in parallel
    const [businesses, opportunities, bookingRequests, deals, events, tasks, leads] = await Promise.all([
      // Search Businesses
      searchBusinesses(searchTerm, isIdSearch, role, userId),
      // Search Opportunities
      searchOpportunities(searchTerm, isIdSearch, role, userId),
      // Search Booking Requests
      searchBookingRequests(searchTerm, isIdSearch, role, userId),
      // Search Deals
      searchDeals(searchTerm, isIdSearch, role, userId),
      // Search Events
      searchEvents(searchTerm, isIdSearch, role, userId),
      // Search Tasks
      searchTasks(searchTerm, isIdSearch, role, userId),
      // Search Leads
      searchLeads(searchTerm, isIdSearch, role, userId),
    ])

    // Sort each group by relevance
    const sortByRelevance = (results: SearchResult[]) => {
      return results.sort((a, b) => {
        const aTitle = a.title.toLowerCase()
        const bTitle = b.title.toLowerCase()
        const aExact = aTitle === searchTerm
        const bExact = bTitle === searchTerm
        const aStarts = aTitle.startsWith(searchTerm)
        const bStarts = bTitle.startsWith(searchTerm)

        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return 0
      })
    }

    return {
      success: true,
      data: {
        businesses: sortByRelevance(businesses),
        opportunities: sortByRelevance(opportunities),
        bookingRequests: sortByRelevance(bookingRequests),
        deals: sortByRelevance(deals),
        events: sortByRelevance(events),
        tasks: sortByRelevance(tasks),
        leads: sortByRelevance(leads),
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'globalSearch')
  }
}

async function searchBusinesses(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
    return []
  }

  const orConditions: Prisma.BusinessWhereInput[] = [
    { name: { contains: searchTerm, mode: 'insensitive' } },
    { contactName: { contains: searchTerm, mode: 'insensitive' } },
    { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
    { contactPhone: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  // Search by external vendor ID (osAdminVendorId) - exact or partial match
  // Check if searchTerm looks like a numeric ID (digits only)
  if (/^\d+$/.test(searchTerm)) {
    orConditions.push({ osAdminVendorId: { equals: searchTerm } })
  } else {
    // Also allow partial match for vendor ID
    orConditions.push({ osAdminVendorId: { contains: searchTerm, mode: 'insensitive' } })
  }

  const where: Prisma.BusinessWhereInput = { OR: orConditions }
  
  // NOTE: Sales users can VIEW all businesses (no ownerId filter)
  // They can only EDIT assigned ones, which is enforced at the update action level

  const businesses = await prisma.business.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return businesses.map(business => ({
    id: business.id,
    type: 'business' as const,
    title: business.name,
    subtitle: business.osAdminVendorId 
      ? `OS ID: ${business.osAdminVendorId}` 
      : (business.contactEmail || business.contactName || undefined),
    url: `/businesses/${business.id}`,
  }))
}

async function searchOpportunities(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
    return []
  }

  const orConditions: Prisma.OpportunityWhereInput[] = [
    { notes: { contains: searchTerm, mode: 'insensitive' } },
    { business: { name: { contains: searchTerm, mode: 'insensitive' } } },
    { stage: { contains: searchTerm, mode: 'insensitive' } },
    { name: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.OpportunityWhereInput = { OR: orConditions }

  if (role === 'sales') {
    where.responsibleId = userId
  }

  const opportunities = await prisma.opportunity.findMany({
    where,
    include: {
      business: { select: { name: true } },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  // Fetch responsible user names
  const responsibleIds = opportunities.map(o => o.responsibleId).filter(Boolean) as string[]
  const responsibleUsers = responsibleIds.length > 0
    ? await prisma.userProfile.findMany({
        where: { clerkId: { in: responsibleIds } },
        select: { clerkId: true, name: true },
      })
    : []
  const responsibleMap = new Map(responsibleUsers.map(u => [u.clerkId, u.name]))

  return opportunities.map(opportunity => ({
    id: opportunity.id,
    type: 'opportunity' as const,
    title: opportunity.business.name,
    subtitle: opportunity.responsibleId ? responsibleMap.get(opportunity.responsibleId) || undefined : undefined,
    status: opportunity.stage,
    url: `/opportunities?open=${opportunity.id}`,
  }))
}

async function searchBookingRequests(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
    return []
  }

  const orConditions: Prisma.BookingRequestWhereInput[] = [
    { name: { contains: searchTerm, mode: 'insensitive' } },
    { merchant: { contains: searchTerm, mode: 'insensitive' } },
    { businessEmail: { contains: searchTerm, mode: 'insensitive' } },
    { status: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.BookingRequestWhereInput = { OR: orConditions }

  if (role === 'sales') {
    where.userId = userId
  }

  const bookingRequests = await prisma.bookingRequest.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return bookingRequests.map(request => ({
    id: request.id,
    type: 'booking-request' as const,
    title: request.name,
    subtitle: request.merchant || request.businessEmail || undefined,
    status: request.status,
    url: `/booking-requests?view=${request.id}`,
  }))
}

async function searchDeals(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  const orConditions: Prisma.DealWhereInput[] = [
    { bookingRequest: { name: { contains: searchTerm, mode: 'insensitive' } } },
    { bookingRequest: { merchant: { contains: searchTerm, mode: 'insensitive' } } },
    { bookingRequest: { businessEmail: { contains: searchTerm, mode: 'insensitive' } } },
    { status: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.DealWhereInput = { OR: orConditions }

  if (role === 'editor' || role === 'ere' || role === 'editor_senior') {
    where.responsibleId = userId
  }

  const deals = await prisma.deal.findMany({
    where,
    include: {
      bookingRequest: {
        select: { name: true, merchant: true, businessEmail: true },
      },
      opportunity: {
        select: { responsibleId: true },
      },
    },
    take: 10, // Fetch more to filter for sales
    orderBy: { createdAt: 'desc' },
  })

  // Filter deals for sales role
  let filteredDeals = deals
  if (role === 'sales') {
    filteredDeals = deals.filter(deal => deal.opportunity?.responsibleId === userId)
  }

  return filteredDeals.slice(0, 5).map(deal => ({
    id: deal.id,
    type: 'deal' as const,
    title: deal.bookingRequest.name,
    subtitle: deal.bookingRequest.merchant || deal.bookingRequest.businessEmail || undefined,
    status: deal.status,
    url: `/deals?open=${deal.id}`,
  }))
}

async function searchEvents(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  const orConditions: Prisma.EventWhereInput[] = [
    { name: { contains: searchTerm, mode: 'insensitive' } },
    { description: { contains: searchTerm, mode: 'insensitive' } },
    { business: { contains: searchTerm, mode: 'insensitive' } },
    { status: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.EventWhereInput = { OR: orConditions }

  if (role === 'sales') {
    where.userId = userId
  }

  const events = await prisma.event.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return events.map(event => ({
    id: event.id,
    type: 'event' as const,
    title: event.name,
    subtitle: event.business || event.description || undefined,
    status: event.status,
    url: `/events?open=${event.id}`,
  }))
}

async function searchTasks(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  const orConditions: Prisma.TaskWhereInput[] = [
    { title: { contains: searchTerm, mode: 'insensitive' } },
    { notes: { contains: searchTerm, mode: 'insensitive' } },
    { category: { contains: searchTerm, mode: 'insensitive' } },
  ]

  // Check for status-like searches
  if (['pendiente', 'pending', 'completado', 'completed', 'done'].some(s => searchTerm.includes(s))) {
    const isCompleted = ['completado', 'completed', 'done'].some(s => searchTerm.includes(s))
    orConditions.push({ completed: isCompleted })
  }

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.TaskWhereInput = { OR: orConditions }

  // For sales role, filter by opportunity's responsibleId
  if (role === 'sales') {
    where.opportunity = { responsibleId: userId }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      opportunity: {
        select: {
          business: { select: { name: true } },
        },
      },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return tasks.map(task => ({
    id: task.id,
    type: 'task' as const,
    title: task.title,
    subtitle: task.opportunity?.business?.name || undefined,
    status: task.completed ? 'Completado' : 'Pendiente',
    url: `/tasks?taskId=${task.id}`,
  }))
}

async function searchLeads(searchTerm: string, isIdSearch: boolean, role: string | null, userId: string): Promise<SearchResult[]> {
  const orConditions: Prisma.LeadWhereInput[] = [
    { name: { contains: searchTerm, mode: 'insensitive' } },
    { contactName: { contains: searchTerm, mode: 'insensitive' } },
    { contactEmail: { contains: searchTerm, mode: 'insensitive' } },
    { contactPhone: { contains: searchTerm, mode: 'insensitive' } },
    { stage: { contains: searchTerm, mode: 'insensitive' } },
  ]

  if (isIdSearch) {
    orConditions.push({ id: searchTerm })
  }

  let where: Prisma.LeadWhereInput = { OR: orConditions }

  if (role === 'sales') {
    where.responsibleId = userId
  }

  const leads = await prisma.lead.findMany({
    where,
    take: 5,
    orderBy: { createdAt: 'desc' },
  })

  return leads.map(lead => ({
    id: lead.id,
    type: 'lead' as const,
    title: lead.name,
    subtitle: lead.contactEmail || lead.contactName || undefined,
    status: lead.stage,
    url: `/leads?open=${lead.id}`,
  }))
}
