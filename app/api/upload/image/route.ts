/**
 * Image Upload API Route
 * 
 * Handles image uploads to S3
 * POST /api/upload/image
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadFileToS3, generateFileKey, validateImageFile } from '@/lib/s3/upload'
import { logger } from '@/lib/logger'

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

    // Parse form data
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

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Generate unique file key
    const key = generateFileKey(file.name, folder, userId)

    // Upload to S3
    const result = await uploadFileToS3({
      file,
      key,
      folder,
      contentType: file.type,
      makePublic,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }

    logger.info(`Image uploaded successfully by user ${userId}: ${result.key}`)

    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
    })
  } catch (error) {
    logger.error('Error in image upload API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

