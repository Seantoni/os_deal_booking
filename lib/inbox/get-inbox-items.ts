import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { parseFieldComments } from '@/types'

export interface InboxItem {
  id: string
  type: 'opportunity_comment' | 'opportunity_mention' | 'marketing_comment' | 'marketing_mention' | 'booking_mention'
  commentId: string
  author: {
    clerkId: string
    name: string | null
    email: string | null
  }
  content: string
  createdAt: Date
  entityId: string
  entityName: string
  entityType: 'opportunity' | 'marketing' | 'booking_request'
  linkUrl: string
}

interface AuthorProfile {
  clerkId: string
  name: string | null
  email: string | null
}

export async function getInboxItemsForUser(userId: string): Promise<InboxItem[]> {
  const [userOppLatestResponses, userMktLatestResponses] = await Promise.all([
    prisma.opportunityComment.groupBy({
      by: ['opportunityId'],
      where: { userId, isDeleted: false },
      _max: { createdAt: true },
    }),
    prisma.marketingOptionComment.groupBy({
      by: ['optionId'],
      where: { userId, isDeleted: false },
      _max: { createdAt: true },
    }),
  ])

  const userOppLatestMap = new Map<string, Date>()
  for (const row of userOppLatestResponses) {
    if (row._max.createdAt) {
      userOppLatestMap.set(row.opportunityId, row._max.createdAt)
    }
  }

  const userMktLatestMap = new Map<string, Date>()
  for (const row of userMktLatestResponses) {
    if (row._max.createdAt) {
      userMktLatestMap.set(row.optionId, row._max.createdAt)
    }
  }

  const hasUserRespondedToOpp = (opportunityId: string, afterDate: Date): boolean => {
    const latest = userOppLatestMap.get(opportunityId)
    return latest ? latest > afterDate : false
  }

  const hasUserRespondedToMkt = (optionId: string, afterDate: Date): boolean => {
    const latest = userMktLatestMap.get(optionId)
    return latest ? latest > afterDate : false
  }

  const oppComments = await prisma.opportunityComment.findMany({
    where: {
      isDeleted: false,
      userId: { not: userId },
      OR: [
        { mentions: { array_contains: [userId] } },
        {
          opportunity: {
            OR: [{ responsibleId: userId }, { userId }],
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      content: true,
      mentions: true,
      dismissedBy: true,
      createdAt: true,
      opportunityId: true,
      opportunity: {
        select: {
          id: true,
          responsibleId: true,
          userId: true,
          business: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const allMktComments = await prisma.marketingOptionComment.findMany({
    where: {
      isDeleted: false,
      userId: { not: userId },
      mentions: { array_contains: [userId] },
    },
    select: {
      id: true,
      userId: true,
      content: true,
      mentions: true,
      dismissedBy: true,
      createdAt: true,
      optionId: true,
      option: {
        select: {
          campaign: {
            select: {
              id: true,
              bookingRequest: {
                select: { merchant: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const mktComments = allMktComments.filter((comment) => {
    const mentions = (comment.mentions as string[]) || []
    return mentions.includes(userId)
  })

  const bookingRequestsWithComments = await prisma.bookingRequest.findMany({
    where: {
      fieldComments: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      name: true,
      merchant: true,
      fieldComments: true,
    },
  })

  const bookingComments = bookingRequestsWithComments.flatMap((request) => {
    const comments = parseFieldComments(request.fieldComments)
    return comments
      .filter((comment) => {
        if (comment.authorId === userId) return false
        const mentions = comment.mentions || []
        if (!mentions.includes(userId)) return false
        const dismissedBy = comment.dismissedBy || []
        if (dismissedBy.includes(userId)) return false
        return true
      })
      .map((comment) => ({
        id: comment.id,
        userId: comment.authorId,
        content: comment.text,
        createdAt: new Date(comment.createdAt),
        requestId: request.id,
        requestName: request.merchant || request.name,
      }))
  })

  if (oppComments.length === 0 && mktComments.length === 0 && bookingComments.length === 0) {
    return []
  }

  const authorIds = new Set<string>()
  oppComments.forEach((c: typeof oppComments[number]) => authorIds.add(c.userId))
  mktComments.forEach((c: typeof mktComments[number]) => authorIds.add(c.userId))
  bookingComments.forEach((c) => authorIds.add(c.userId))

  const authorProfiles = await prisma.userProfile.findMany({
    where: { clerkId: { in: Array.from(authorIds) } },
    select: { clerkId: true, name: true, email: true },
  })

  const authorMap = new Map<string, AuthorProfile>()
  for (const profile of authorProfiles) {
    authorMap.set(profile.clerkId, profile)
  }

  const getAuthor = (authorId: string): AuthorProfile => {
    return authorMap.get(authorId) || { clerkId: authorId, name: null, email: null }
  }

  const inboxItems: InboxItem[] = []

  for (const comment of oppComments) {
    if (hasUserRespondedToOpp(comment.opportunityId, comment.createdAt)) continue

    const dismissedBy = (comment.dismissedBy as string[]) || []
    if (dismissedBy.includes(userId)) continue

    const mentions = (comment.mentions as string[]) || []
    const isMentioned = mentions.includes(userId)

    inboxItems.push({
      id: `opp_${comment.id}`,
      type: isMentioned ? 'opportunity_mention' : 'opportunity_comment',
      commentId: comment.id,
      author: getAuthor(comment.userId),
      content: comment.content,
      createdAt: comment.createdAt,
      entityId: comment.opportunityId,
      entityName: comment.opportunity.business?.name || 'Oportunidad',
      entityType: 'opportunity',
      linkUrl: `/opportunities?open=${comment.opportunityId}&tab=chat`,
    })
  }

  for (const comment of mktComments) {
    if (hasUserRespondedToMkt(comment.optionId, comment.createdAt)) continue

    const dismissedBy = (comment.dismissedBy as string[]) || []
    if (dismissedBy.includes(userId)) continue

    const mentions = (comment.mentions as string[]) || []
    const isMentioned = mentions.includes(userId)
    const campaign = comment.option.campaign
    const businessName = campaign.bookingRequest.merchant || campaign.bookingRequest.name

    inboxItems.push({
      id: `mkt_${comment.id}`,
      type: isMentioned ? 'marketing_mention' : 'marketing_comment',
      commentId: comment.id,
      author: getAuthor(comment.userId),
      content: comment.content,
      createdAt: comment.createdAt,
      entityId: campaign.id,
      entityName: businessName,
      entityType: 'marketing',
      linkUrl: `/marketing?open=${campaign.id}&option=${comment.optionId}`,
    })
  }

  for (const comment of bookingComments) {
    inboxItems.push({
      id: `booking_${comment.id}`,
      type: 'booking_mention',
      commentId: comment.id,
      author: getAuthor(comment.userId),
      content: comment.content,
      createdAt: comment.createdAt,
      entityId: comment.requestId,
      entityName: comment.requestName || 'Solicitud',
      entityType: 'booking_request',
      linkUrl: `/deals?request=${comment.requestId}&comment=${comment.id}`,
    })
  }

  inboxItems.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return inboxItems
}
