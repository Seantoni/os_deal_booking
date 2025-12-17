/**
 * Image compression utility using browser-image-compression
 * Compresses images client-side before uploading to S3
 */

import imageCompression from 'browser-image-compression'

export interface CompressionOptions {
  /** Maximum file size in MB (default: 0.5 = 500KB) */
  maxSizeMB?: number
  /** Maximum width/height in pixels (default: 1920) */
  maxWidthOrHeight?: number
  /** Use WebP format when supported (default: true) */
  useWebWorker?: boolean
  /** Initial quality (0-1, default: 0.8) */
  initialQuality?: number
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 0.5, // 500KB max
  maxWidthOrHeight: 1920, // Max dimension
  useWebWorker: true,
  initialQuality: 0.8,
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  // Skip compression for small files (already under target size)
  const targetSizeBytes = (mergedOptions.maxSizeMB || 0.5) * 1024 * 1024
  if (file.size <= targetSizeBytes) {
    console.log(`[ImageCompression] File already small (${formatFileSize(file.size)}), skipping compression`)
    return file
  }

  // Skip compression for non-image files
  if (!file.type.startsWith('image/')) {
    console.log(`[ImageCompression] Not an image file, skipping compression`)
    return file
  }

  const originalSize = file.size
  console.log(`[ImageCompression] Starting compression: ${file.name} (${formatFileSize(originalSize)})`)

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: mergedOptions.maxSizeMB,
      maxWidthOrHeight: mergedOptions.maxWidthOrHeight,
      useWebWorker: mergedOptions.useWebWorker,
      initialQuality: mergedOptions.initialQuality,
      // Preserve file name but change extension if format changes
      fileType: file.type as any,
    })

    const newSize = compressedFile.size
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1)
    
    console.log(
      `[ImageCompression] Compressed: ${formatFileSize(originalSize)} → ${formatFileSize(newSize)} (${savings}% reduction)`
    )

    // Return as File with original name (browser-image-compression returns Blob)
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    })
  } catch (error) {
    console.error('[ImageCompression] Compression failed, using original:', error)
    return file
  }
}

/**
 * Compress multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compressed files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)))
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

