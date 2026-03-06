/**
 * Presigned Upload URL API Route
 *
 * Returns a short-lived presigned PUT URL so the browser can upload
 * directly to S3, bypassing the Vercel 4.5 MB body-size limit.
 *
 * POST /api/upload/presign
 * Body: { filename, contentType, size, folder? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createPresignedUploadUrl } from '@/lib/s3/upload'
import { logger } from '@/lib/logger'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx']

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { filename, contentType, size, folder = 'booking-attachments' } = body as {
      filename?: string
      contentType?: string
      size?: number
      folder?: string
    }

    if (!filename || !contentType || !size) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: filename, contentType, size' },
        { status: 400 },
      )
    }

    const extension = filename.split('.').pop()?.toLowerCase() || ''
    const mimeAllowed = ALLOWED_MIME_TYPES.includes(contentType)
    const extensionAllowed = ALLOWED_EXTENSIONS.includes(extension)

    if (!mimeAllowed && !extensionAllowed) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX' },
        { status: 400 },
      )
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    const result = await createPresignedUploadUrl({
      filename,
      contentType,
      folder,
      userId,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create presigned URL' },
        { status: 500 },
      )
    }

    logger.info(`Presigned URL issued for user ${userId}: ${result.key}`)

    return NextResponse.json({
      success: true,
      presignedUrl: result.presignedUrl,
      url: result.url,
      key: result.key,
    })
  } catch (error) {
    logger.error('Error in presign API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
