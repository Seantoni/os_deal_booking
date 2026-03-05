/**
 * File Upload API Route
 *
 * Handles generic booking attachment uploads to S3.
 * POST /api/upload/file
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadValidatedFileToS3 } from '@/lib/s3/upload'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'
    const makePublic = formData.get('makePublic') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const result = await uploadValidatedFileToS3({
      file,
      folder,
      userId,
      makePublic,
      mode: 'attachment',
    })

    if (!result.success) {
      const statusCode = result.error?.startsWith('Invalid file type') || result.error?.startsWith('File size exceeds')
        ? 400
        : 500
      return NextResponse.json(
        { success: false, error: result.error || 'Upload failed' },
        { status: statusCode }
      )
    }

    logger.info(`Attachment uploaded successfully by user ${userId}: ${result.key}`)

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      filename: result.filename || file.name,
      mimeType: result.mimeType || file.type,
      size: result.size || file.size,
    })
  } catch (error) {
    logger.error('Error in file upload API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
