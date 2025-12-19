/**
 * AWS S3 Client Configuration
 * 
 * Creates and exports a singleton S3 client instance for the application.
 * Gracefully handles missing credentials.
 */

import { S3Client } from '@aws-sdk/client-s3'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  const configured = !!(
    ENV.AWS_ACCESS_KEY_ID &&
    ENV.AWS_SECRET_ACCESS_KEY &&
    ENV.AWS_S3_BUCKET
  )
  
  // Debug logging (only when not configured)
  if (!configured) {
    logger.debug('[S3] Not configured', {
      hasAccessKey: !!ENV.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!ENV.AWS_SECRET_ACCESS_KEY,
      hasBucket: !!ENV.AWS_S3_BUCKET,
      bucket: ENV.AWS_S3_BUCKET,
      region: ENV.AWS_REGION,
    })
  }
  
  return configured
}

/**
 * Singleton S3 client instance
 * Only created if credentials are configured
 */
export const s3Client: S3Client | null = isS3Configured()
  ? new S3Client({
      region: ENV.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID!,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null

/**
 * Get the S3 bucket name from environment
 */
export const S3_BUCKET = ENV.AWS_S3_BUCKET || ''
