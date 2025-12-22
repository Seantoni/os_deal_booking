/**
 * Firebase Admin SDK initialization
 * 
 * Used for sending push notifications via Firebase Cloud Messaging (FCM)
 * 
 * Required environment variables:
 * - FIREBASE_PROJECT_ID: Firebase project ID
 * - FIREBASE_CLIENT_EMAIL: Service account client email
 * - FIREBASE_PRIVATE_KEY: Service account private key (with \n escaped)
 */

import admin from 'firebase-admin'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

// Check if Firebase Admin is already initialized
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  // Validate required environment variables
  if (!ENV.FIREBASE_PROJECT_ID || !ENV.FIREBASE_CLIENT_EMAIL || !ENV.FIREBASE_PRIVATE_KEY) {
    logger.warn('Firebase credentials not configured. Push notifications will be disabled.')
    return null
  }

  try {
    // Initialize Firebase Admin with service account credentials
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: ENV.FIREBASE_PROJECT_ID,
        clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
        // Private key comes with escaped newlines, need to replace them
        privateKey: ENV.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })

    logger.info('Firebase Admin SDK initialized successfully')
    return app
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error)
    return null
  }
}

// Initialize once
const firebaseAdmin = getFirebaseAdmin()

/**
 * Check if Firebase is properly configured and available
 */
export function isFirebaseConfigured(): boolean {
  return firebaseAdmin !== null
}

/**
 * Get the Firebase Messaging instance
 */
export function getMessaging() {
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK is not initialized. Check your environment variables.')
  }
  return admin.messaging()
}

/**
 * Send a push notification to a specific topic
 * Topics allow you to send messages to multiple devices that have opted in
 */
export async function sendToTopic(
  topic: string,
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>
) {
  const messaging = getMessaging()

  const message: admin.messaging.Message = {
    topic,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    ...(data && { data }),
    // Android specific configuration
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    // Apple specific configuration
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  }

  try {
    const response = await messaging.send(message)
    logger.info(`Push notification sent to topic "${topic}":`, response)
    return { success: true, messageId: response }
  } catch (error) {
    logger.error(`Failed to send push notification to topic "${topic}":`, error)
    throw error
  }
}

/**
 * Send a push notification to specific device tokens
 */
export async function sendToTokens(
  tokens: string[],
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>
) {
  if (tokens.length === 0) {
    throw new Error('No device tokens provided')
  }

  const messaging = getMessaging()

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
    },
    ...(data && { data }),
    // Android specific configuration
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    // Apple specific configuration
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  }

  try {
    const response = await messaging.sendEachForMulticast(message)
    logger.info(`Push notification sent to ${tokens.length} tokens:`, {
      successCount: response.successCount,
      failureCount: response.failureCount,
    })
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    }
  } catch (error) {
    logger.error('Failed to send push notification to tokens:', error)
    throw error
  }
}

/**
 * Send a push notification to all users (using 'all' topic)
 * Assumes users are subscribed to the 'all' topic in the app
 */
export async function sendToAll(
  notification: {
    title: string
    body: string
    imageUrl?: string
  },
  data?: Record<string, string>
) {
  return sendToTopic('all', notification, data)
}

export default firebaseAdmin

