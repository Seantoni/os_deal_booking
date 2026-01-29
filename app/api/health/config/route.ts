/**
 * Health Check: Configuration Status
 * 
 * GET /api/health/config
 * 
 * Returns the configuration status of all external services
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    resend: {
      configured: !!process.env.RESEND_API_KEY,
    },
    s3: {
      configured: !!(
        process.env.AWS_ACCESS_KEY_ID && 
        process.env.AWS_SECRET_ACCESS_KEY && 
        process.env.AWS_S3_BUCKET
      ),
      bucket: process.env.AWS_S3_BUCKET || null,
      region: process.env.AWS_REGION || 'us-east-1',
    },
    sentry: {
      configured: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    },
    cron: {
      configured: !!process.env.CRON_SECRET,
    },
    oferta: {
      configured: !!process.env.EXTERNAL_OFERTA_API_TOKEN,
      dealApiUrl: process.env.EXTERNAL_OFERTA_API_URL || 'https://ofertasimple.com/external/api/deals',
      vendorApiUrl: process.env.EXTERNAL_OFERTA_VENDOR_API_URL || 'https://ofertasimple.com/external/api/vendors',
      metricsApiUrl: process.env.EXTERNAL_OFERTA_METRICS_API_URL || 'https://ofertasimple.com/external/api/deal-metrics',
    },
    openai: {
      configured: !!process.env.OPENAI_API_KEY,
    },
    email: {
      from: process.env.EMAIL_FROM || null,
      replyTo: process.env.EMAIL_REPLY_TO || null,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || null,
      env: process.env.NODE_ENV,
    }
  })
}
