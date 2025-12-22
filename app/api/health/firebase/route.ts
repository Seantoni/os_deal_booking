/**
 * API Route: Check Firebase Connection Health
 * 
 * GET /api/health/firebase
 * 
 * Checks if Firebase Admin SDK is properly configured and can connect.
 */

import { NextResponse } from 'next/server'
import { isFirebaseConfigured } from '@/lib/firebase/admin'
import { ENV } from '@/lib/config/env'

export async function GET() {
  try {
    // Check if environment variables are set
    const hasProjectId = !!ENV.FIREBASE_PROJECT_ID
    const hasClientEmail = !!ENV.FIREBASE_CLIENT_EMAIL
    const hasPrivateKey = !!ENV.FIREBASE_PRIVATE_KEY

    const configured = isFirebaseConfigured()

    return NextResponse.json({
      connected: configured,
      configured: hasProjectId && hasClientEmail && hasPrivateKey,
      details: {
        projectId: hasProjectId ? ENV.FIREBASE_PROJECT_ID : null,
        clientEmail: hasClientEmail ? '***configured***' : null,
        privateKey: hasPrivateKey ? '***configured***' : null,
      },
      error: !configured 
        ? 'Firebase credentials not configured or invalid. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
        : null,
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error checking Firebase status',
    })
  }
}

