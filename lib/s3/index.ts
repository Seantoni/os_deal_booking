/**
 * S3 Module Exports
 * 
 * Centralized exports for S3 functionality
 */

export { s3Client, S3_BUCKET, isS3Configured } from './client'
export {
  uploadFileToS3,
  uploadValidatedFileToS3,
  generateFileKey,
  validateImageFile,
  validateAttachmentFile,
  type UploadFileOptions,
  type UploadValidatedFileOptions,
  type UploadValidatedFileResult,
  type UploadResult,
} from './upload'
