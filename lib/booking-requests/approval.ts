import type { BookingRequest } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTodayInPanama, parseDateInPanamaTime } from '@/lib/date/timezone'

type ApproveBookingRequestParams = {
  requestId: string
  processedBy: string
}

export type ApproveBookingRequestResult =
  | {
      success: true
      bookingRequest: BookingRequest
      createdOpportunityId: string | null
      createdTaskId: string | null
    }
  | {
      success: false
      code: 'NOT_FOUND' | 'INVALID_STATUS'
      status?: string
    }

/**
 * Atomically approves a pending booking request and creates a follow-up
 * opportunity+task when the request was linked to an existing opportunity.
 *
 * Idempotency guarantee: only one caller can transition pending -> approved,
 * so the follow-up opportunity is created at most once per request.
 */
export async function approveBookingRequestWithFollowUp({
  requestId,
  processedBy,
}: ApproveBookingRequestParams): Promise<ApproveBookingRequestResult> {
  return prisma.$transaction(async (tx) => {
    const now = new Date()

    // Only transition pending -> approved once.
    const updated = await tx.bookingRequest.updateMany({
      where: {
        id: requestId,
        status: 'pending',
      },
      data: {
        status: 'approved',
        processedAt: now,
        processedBy,
      },
    })

    if (updated.count === 0) {
      const existing = await tx.bookingRequest.findUnique({
        where: { id: requestId },
        select: { status: true },
      })

      if (!existing) {
        return { success: false, code: 'NOT_FOUND' }
      }

      return {
        success: false,
        code: 'INVALID_STATUS',
        status: existing.status,
      }
    }

    const bookingRequest = await tx.bookingRequest.findUnique({
      where: { id: requestId },
    })

    if (!bookingRequest) {
      return { success: false, code: 'NOT_FOUND' }
    }

    if (bookingRequest.eventId) {
      await tx.event.update({
        where: { id: bookingRequest.eventId },
        data: { status: 'approved' },
      })
    }

    const sourceOpportunity = await tx.opportunity.findFirst({
      where: {
        bookingRequestId: requestId,
        hasRequest: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessId: true,
        userId: true,
        responsibleId: true,
      },
    })

    let createdOpportunityId: string | null = null
    let createdTaskId: string | null = null

    if (sourceOpportunity) {
      const todayPanama = getTodayInPanama()
      const startDate = parseDateInPanamaTime(todayPanama)
      const followUpDate = new Date(startDate)
      followUpDate.setUTCDate(followUpDate.getUTCDate() + 20)

      const newOpportunity = await tx.opportunity.create({
        data: {
          businessId: sourceOpportunity.businessId,
          stage: 'iniciacion',
          startDate,
          closeDate: null,
          notes: null,
          userId: sourceOpportunity.userId,
          responsibleId: sourceOpportunity.responsibleId,
          hasRequest: false,
          bookingRequestId: null,
          nextActivityDate: followUpDate,
          lastActivityDate: null,
        },
        select: { id: true },
      })

      createdOpportunityId = newOpportunity.id

      const followUpTask = await tx.task.create({
        data: {
          opportunityId: newOpportunity.id,
          category: 'todo',
          title: 'Contactar al negocio para gestionar un nuevo trato',
          date: followUpDate,
          completed: false,
          notes: 'Recordatorio automático generado al aprobar la solicitud.',
        },
        select: { id: true },
      })

      createdTaskId = followUpTask.id
    }

    return {
      success: true,
      bookingRequest,
      createdOpportunityId,
      createdTaskId,
    }
  })
}
