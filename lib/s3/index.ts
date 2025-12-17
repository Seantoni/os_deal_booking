/**
 * S3 Module Exports
 * 
 * Centralized exports for S3 functionality
 */

export { s3Client, S3_BUCKET, isS3Configured } from './client'
export {
  uploadFileToS3,
  generateFileKey,
  validateImageFile,
  type UploadFileOptions,
  type UploadResult,
} from './upload'
