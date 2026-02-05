import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { extractDisplayName, type ClerkUserLike } from '@/lib/auth/user-display'
import { logger } from '@/lib/logger'

// Clerk webhook secret - must be set in environment
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

/**
 * Clerk webhook event types we handle
 */
type ClerkWebhookEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string // Clerk user ID
    first_name?: string | null
    last_name?: string | null
    username?: string | null
    email_addresses?: Array<{
      email_address: string
      id: string
    }>
    primary_email_address_id?: string | null
  }
}

/**
 * Convert Clerk webhook data to our ClerkUserLike interface
 */
function toClerkUserLike(data: ClerkWebhookEvent['data']): ClerkUserLike {
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    username: data.username,
    emailAddresses: data.email_addresses?.map(e => ({ emailAddress: e.email_address })),
  }
}

/**
 * Get primary email from Clerk webhook data
 */
function getPrimaryEmail(data: ClerkWebhookEvent['data']): string | null {
  if (!data.email_addresses?.length) return null
  
  // Find primary email
  if (data.primary_email_address_id) {
    const primary = data.email_addresses.find(e => e.id === data.primary_email_address_id)
    if (primary) return primary.email_address
  }
  
  // Fallback to first email
  return data.email_addresses[0]?.email_address || null
}

/**
 * Clerk webhook handler
 * Syncs user profile data when users are created or updated in Clerk
 * 
 * To configure:
 * 1. Go to Clerk Dashboard > Webhooks
 * 2. Create a new webhook endpoint pointing to: https://your-domain.com/api/webhooks/clerk
 * 3. Select events: user.created, user.updated, user.deleted
 * 4. Copy the signing secret and set CLERK_WEBHOOK_SECRET in your environment
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret is configured
  if (!CLERK_WEBHOOK_SECRET) {
    logger.error('[Clerk Webhook] CLERK_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  // Get Svix headers for verification
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('[Clerk Webhook] Missing Svix headers')
    return NextResponse.json(
      { error: 'Missing webhook verification headers' },
      { status: 400 }
    )
  }

  // Get request body
  const payload = await request.text()

  // Verify webhook signature
  const wh = new Webhook(CLERK_WEBHOOK_SECRET)
  let event: ClerkWebhookEvent

  try {
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    logger.error('[Clerk Webhook] Signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }

  // Handle the event
  const { type, data } = event
  const clerkId = data.id

  logger.debug(`[Clerk Webhook] Received event: ${type} for user: ${clerkId}`)

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const userLike = toClerkUserLike(data)
        const displayName = extractDisplayName(userLike)
        const email = getPrimaryEmail(data)

        // Upsert the user profile
        await prisma.userProfile.upsert({
          where: { clerkId },
          update: {
            name: displayName,
            email: email,
          },
          create: {
            clerkId,
            name: displayName,
            email: email,
            role: 'sales', // Default role for new users
          },
        })

        logger.info(`[Clerk Webhook] Synced user profile for ${clerkId}: ${displayName || email}`)
        break
      }

      case 'user.deleted': {
        // Mark user as inactive instead of deleting
        // This preserves activity log references
        await prisma.userProfile.update({
          where: { clerkId },
          data: { isActive: false },
        }).catch(() => {
          // User might not exist in our DB yet, that's fine
          logger.debug(`[Clerk Webhook] User ${clerkId} not found for deletion`)
        })

        logger.info(`[Clerk Webhook] Marked user ${clerkId} as inactive`)
        break
      }

      default:
        logger.debug(`[Clerk Webhook] Unhandled event type: ${type}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Clerk Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}
