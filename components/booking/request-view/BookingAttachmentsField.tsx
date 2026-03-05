'use client'

import Image from 'next/image'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DescriptionIcon from '@mui/icons-material/Description'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import type { FieldComment } from '@/types'
import { FieldCommentShell } from './FieldCommentShell'
import {
  formatAttachmentSize,
  getAttachmentLabel,
  isImageAttachment,
} from './bookingRequestView.utils'
import type {
  BookingAttachmentItem,
  CommentReplyPrefill,
  MentionUsersAction,
} from './types'

interface BookingAttachmentsFieldProps {
  fieldKey: string
  label: string
  attachments: BookingAttachmentItem[]
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
}

export function BookingAttachmentsField({
  fieldKey,
  label,
  attachments,
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
}: BookingAttachmentsFieldProps) {
  const imageUrls = attachments
    .filter((attachment) => isImageAttachment(attachment.mimeType, attachment.filename))
    .map((attachment) => attachment.url)

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
      <div className="space-y-2.5">
        {attachments.map((attachment, index) => {
          const isImage = isImageAttachment(attachment.mimeType, attachment.filename)
          const imageIndex = imageUrls.indexOf(attachment.url)

          return (
            <div
              key={`${attachment.url}-${index}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                {isImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (imageIndex >= 0) openLightbox(imageUrls, imageIndex)
                    }}
                    className="relative h-11 w-11 rounded-md overflow-hidden border border-slate-200 cursor-zoom-in group shrink-0"
                  >
                    <Image
                      src={attachment.url}
                      alt={attachment.filename || `Adjunto ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="44px"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100" style={{ fontSize: 16 }} />
                    </div>
                  </button>
                ) : (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 w-11 rounded-md border border-slate-200 bg-white flex items-center justify-center shrink-0 hover:bg-slate-50 transition-colors"
                    title="Abrir archivo"
                  >
                    {attachment.mimeType === 'application/pdf' ? (
                      <PictureAsPdfIcon className="text-red-500" />
                    ) : attachment.mimeType.includes('word') ? (
                      <DescriptionIcon className="text-blue-500" />
                    ) : (
                      <AttachFileIcon className="text-slate-500" />
                    )}
                  </a>
                )}

                <div className="min-w-0 flex-1">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-slate-900 hover:text-blue-600"
                    title={attachment.filename}
                  >
                    {attachment.filename || `Adjunto ${index + 1}`}
                  </a>
                  <p className="text-xs text-slate-500">
                    {getAttachmentLabel(attachment.mimeType, attachment.filename)} · {formatAttachmentSize(attachment.size)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </FieldCommentShell>
  )
}
