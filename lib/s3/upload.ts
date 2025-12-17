/**
 * S3 Upload Utilities
 * 
 * Provides functions for uploading files to S3 with proper error handling
 * and file validation.
 */

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, S3_BUCKET, isS3Configured } from './client'
import { ENV } from '@/lib/config/env'
import { logger } from '@/lib/logger'

export interface UploadFileOptions {
  file: File | Buffer
  key: string
  contentType?: string
  folder?: string
  makePublic?: boolean
}

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

/**
 * Generate a unique file key with optional folder prefix
 */
export function generateFileKey(
  originalName: string,
  folder?: string,
  prefix?: string
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop() || ''
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `${baseName}_${timestamp}_${random}.${extension}`
  
  if (folder) {
    const cleanFolder = folder.replace(/^\/|\/$/g, '') // Remove leading/trailing slashes
    return prefix ? `${cleanFolder}/${prefix}/${fileName}` : `${cleanFolder}/${fileName}`
  }
  
  return prefix ? `${prefix}/${fileName}` : fileName
}

/**
 * Upload a file to S3
 */
export async function uploadFileToS3(
  options: UploadFileOptions
): Promise<UploadResult> {
  // Check if S3 is configured
  if (!isS3Configured() || !s3Client) {
    return {
      success: false,
      error: 'S3 is not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET environment variables.',
    }
  }

  try {
    const { file, key, contentType, folder, makePublic = false } = options

    // Generate the full S3 key
    const s3Key = folder ? `${folder.replace(/^\/|\/$/g, '')}/${key}` : key

    // Convert File to Buffer if needed
    let fileBuffer: Buffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
    } else {
      fileBuffer = file
    }

    // Detect content type if not provided
    const detectedContentType = contentType || (file instanceof File ? file.type : 'application/octet-stream')

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: detectedContentType,
      ...(makePublic && { ACL: 'public-read' }),
    })

    await s3Client.send(command)

    // Generate the public URL
    const region = ENV.AWS_REGION || 'us-east-1'
    const url = `https://${S3_BUCKET}.s3.${region}.amazonaws.com/${s3Key}`

    logger.info(`File uploaded to S3: ${s3Key}`)

    return {
      success: true,
      url,
      key: s3Key,
    }
  } catch (error) {
    logger.error('Error uploading file to S3:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error uploading file',
    }
  }
}

/**
 * Validate file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}
