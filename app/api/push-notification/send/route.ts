/**
 * API Route: Send Push Notification
 * 
 * POST /api/push-notification/send
 * 
 * Sends a push notification to all subscribed users via Firebase Cloud Messaging.
 * Requires admin or marketing role.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserRole } from '@/lib/auth/roles'
import { isFirebaseConfigured, sendToTopic } from '@/lib/firebase/admin'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

interface SendPushNotificationRequest {
  title: string
  body: string
  imageUrl?: string
  linkUrl?: string // Deep link URL when notification is tapped
  scheduledAt?: string // ISO date string for scheduled send
  topic?: string // Default: 'all'
  // Marketing campaign tracking
  marketingOptionId?: string
  bookingRequestId?: string
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user role from database
    const userRole = await getUserRole()

    if (userRole !== 'admin' && userRole !== 'marketing') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Requires admin or marketing role.' },
        { status: 403 }
      )
    }

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Push notifications are not configured. Please set up Firebase credentials.' },
        { status: 503 }
      )
    }

    // Parse request body
    const body: SendPushNotificationRequest = await request.json()

    // Validate required fields
    if (!body.title || !body.body) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Validate title length (FCM limit)
    if (body.title.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Title must be 200 characters or less' },
        { status: 400 }
      )
    }

    // Validate body length (FCM limit)
    if (body.body.length > 1024) {
      return NextResponse.json(
        { success: false, error: 'Body must be 1024 characters or less' },
        { status: 400 }
      )
    }

    const topic = body.topic || 'all'

    // Check if this is a scheduled notification
    const isScheduled = body.scheduledAt && new Date(body.scheduledAt) > new Date()
    const scheduledTime = body.scheduledAt ? new Date(body.scheduledAt) : null

    // Prepare data payload for deep linking
    const data: Record<string, string> = {
      type: 'marketing_promotion',
      timestamp: new Date().toISOString(),
    }

    if (body.bookingRequestId) {
      data.bookingRequestId = body.bookingRequestId
    }

    if (body.marketingOptionId) {
      data.marketingOptionId = body.marketingOptionId
    }

    // Add link URL for deep linking
    if (body.linkUrl) {
      data.linkUrl = body.linkUrl
      data.click_action = body.linkUrl // Standard FCM field for click action
    }

    // TODO: Implement proper scheduling with a job queue
    // For now, scheduled notifications are logged but sent immediately
    // In production, you would store this in a queue and process at scheduledTime
    if (isScheduled) {
      logger.info('Scheduled notification requested', {
        scheduledAt: scheduledTime?.toISOString(),
        title: body.title,
        note: 'Sending immediately - scheduled queue not yet implemented',
      })
    }

    // Send the push notification
    const result = await sendToTopic(
      topic,
      {
        title: body.title,
        body: body.body,
        imageUrl: body.imageUrl,
      },
      data
    )

    // Update marketing option if provided (mark as sent)
    if (body.marketingOptionId) {
      try {
        // Build detailed notes
        const noteParts = [`Push notification sent: "${body.title}"`]
        if (body.linkUrl) {
          noteParts.push(`Link: ${body.linkUrl}`)
        }
        if (isScheduled && scheduledTime) {
          noteParts.push(`(Scheduled for: ${scheduledTime.toLocaleString('es-PA')})`)
        }

        await prisma.marketingOption.update({
          where: { id: body.marketingOptionId },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completedBy: userId,
            notes: noteParts.join('\n'),
            notesUpdatedBy: userId,
            notesUpdatedAt: new Date(),
          },
        })

        // Log the activity
        await logActivity({
          action: 'UPDATE',
          entityType: 'MarketingOption',
          entityId: body.marketingOptionId,
          entityName: `Push: ${body.title}`,
          details: {
            metadata: {
              topic,
              title: body.title,
              messageId: result.messageId,
              linkUrl: body.linkUrl,
              scheduledAt: scheduledTime?.toISOString(),
            },
          },
        })
      } catch (dbError) {
        logger.error('Failed to update marketing option after sending push:', dbError)
        // Don't fail the request, push was already sent
      }
    }

    logger.info('Push notification sent successfully', {
      topic,
      title: body.title,
      messageId: result.messageId,
      linkUrl: body.linkUrl,
      scheduledAt: scheduledTime?.toISOString(),
      sentBy: userId,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      topic,
      linkUrl: body.linkUrl,
      scheduledAt: scheduledTime?.toISOString(),
      // Note: Scheduled notifications are currently sent immediately
      // A proper job queue would be needed for delayed sending
      schedulingNote: isScheduled 
        ? 'Note: Scheduled time recorded, but notification was sent immediately. Implement a job queue for true scheduling.'
        : undefined,
    })
  } catch (error) {
    logger.error('Error sending push notification:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      { success: false, error: `Failed to send push notification: ${errorMessage}` },
      { status: 500 }
    )
  }
}

