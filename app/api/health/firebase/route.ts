/**
 * API Route: Check Firebase Connection Health
 * 
 * GET /api/health/firebase
 * 
 * Checks if Firebase Admin SDK is properly configured and can connect.
 */

import { NextResponse } from 'next/server'
import { isFirebaseConfigured, getFirebaseInitError } from '@/lib/firebase/admin'
import { ENV } from '@/lib/config/env'

export async function GET() {
  try {
    // Check if environment variables are set
    const hasProjectId = !!ENV.FIREBASE_PROJECT_ID
    const hasClientEmail = !!ENV.FIREBASE_CLIENT_EMAIL
    const hasPrivateKey = !!ENV.FIREBASE_PRIVATE_KEY
    
    // Check private key format
    let privateKeyInfo = null
    if (hasPrivateKey && ENV.FIREBASE_PRIVATE_KEY) {
      const key = ENV.FIREBASE_PRIVATE_KEY
      privateKeyInfo = {
        length: key.length,
        startsWithQuote: key.startsWith('"'),
        containsBeginMarker: key.includes('-----BEGIN'),
        containsEndMarker: key.includes('-----END'),
        containsEscapedNewlines: key.includes('\\n'),
        containsActualNewlines: key.includes('\n') && !key.includes('\\n'),
      }
    }

    const configured = isFirebaseConfigured()
    const initError = getFirebaseInitError()

    return NextResponse.json({
      connected: configured,
      configured: hasProjectId && hasClientEmail && hasPrivateKey,
      details: {
        projectId: hasProjectId ? ENV.FIREBASE_PROJECT_ID : null,
        clientEmail: hasClientEmail ? ENV.FIREBASE_CLIENT_EMAIL : null,
        privateKey: hasPrivateKey ? '***configured***' : null,
        privateKeyInfo,
      },
      error: initError || (!configured 
        ? 'Firebase credentials not configured or invalid.'
        : null),
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error checking Firebase status',
    })
  }
}

