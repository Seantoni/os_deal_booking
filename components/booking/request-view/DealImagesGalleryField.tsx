'use client'

import Image from 'next/image'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import type { FieldComment } from '@/types'
import { FieldCommentShell } from './FieldCommentShell'
import type { CommentReplyPrefill, MentionUsersAction } from './types'

interface DealImagesGalleryFieldProps {
  fieldKey: string
  label: string
  images: Array<{ url: string; order: number }>
  comments: FieldComment[]
  containerId: string
  highlightedCommentId: string | null
  activeCommentField: string | null
  savingComment: boolean
  commentInputPrefill: CommentReplyPrefill | null
  onToggleComment: (fieldKey: string | null) => void
  onAddComment: (text: string, mentions: string[]) => Promise<void>
  onReplyToComment: (comment: FieldComment) => void
  getUsersAction: MentionUsersAction
  openLightbox: (images: string[], initialIndex?: number) => void
  onDownloadImage: (url: string, fallbackName: string) => void | Promise<void>
  imageDownloadPrefix: string
}

export function DealImagesGalleryField({
  fieldKey,
  label,
  images,
  comments,
  containerId,
  highlightedCommentId,
  activeCommentField,
  savingComment,
  commentInputPrefill,
  onToggleComment,
  onAddComment,
  onReplyToComment,
  getUsersAction,
  openLightbox,
  onDownloadImage,
  imageDownloadPrefix,
}: DealImagesGalleryFieldProps) {
  const sortedImages = [...images].sort((first, second) => first.order - second.order)
  const galleryUrls = sortedImages.map((image) => image.url)

  return (
    <FieldCommentShell
      fieldKey={fieldKey}
      label={label}
      comments={comments}
      containerId={containerId}
      highlightedCommentId={highlightedCommentId}
      activeCommentField={activeCommentField}
      savingComment={savingComment}
      commentInputPrefill={commentInputPrefill}
      onToggleComment={onToggleComment}
      onAddComment={onAddComment}
      onReplyToComment={onReplyToComment}
      getUsersAction={getUsersAction}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sortedImages.map((image, index) => (
          <div
            key={image.url}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
          >
            <button
              type="button"
              onClick={() => openLightbox(galleryUrls, index)}
              className="absolute inset-0 cursor-zoom-in"
            >
              <Image
                src={image.url}
                alt={`Imagen ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 20vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" style={{ fontSize: 24 }} />
              </div>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                void onDownloadImage(image.url, `${imageDownloadPrefix}-gallery-${index + 1}`)
              }}
              className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md bg-black/55 text-white hover:bg-black/70 transition-colors"
              title="Descargar imagen"
              aria-label={`Descargar imagen ${index + 1}`}
            >
              <FileDownloadIcon style={{ fontSize: 14 }} />
            </button>
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </FieldCommentShell>
  )
}
