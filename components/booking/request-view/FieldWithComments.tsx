'use client'

import { memo } from 'react'
import type { FieldComment } from '@/types'
import { FieldCommentShell } from './FieldCommentShell'
import type { CommentReplyPrefill, MentionUsersAction } from './types'

interface FieldWithCommentsProps {
  fieldKey: string
  label: string
  value: string
  href?: string | null
  comments: FieldComment[]
  isHighlighted?: boolean
  highlightedCommentId?: string | null
  activeCommentField: string | null
  savingComment: boolean
  commentInputPrefill?: CommentReplyPrefill | null
  onToggleComment: (fieldKey: string | null) => void
  onAddComment: (text: string, mentions: string[]) => void
  onReplyToComment?: (comment: FieldComment) => void
  getUsersAction?: MentionUsersAction
  containerId?: string
}

function FieldWithCommentsComponent({
  fieldKey,
  label,
  value,
  href = null,
  comments,
  isHighlighted = false,
  highlightedCommentId = null,
  activeCommentField,
  savingComment,
  commentInputPrefill = null,
  onToggleComment,
  onAddComment,
  onReplyToComment,
  getUsersAction,
  containerId,
}: FieldWithCommentsProps) {
  return (
    <FieldCommentShell
      fieldKey={fieldKey}
      label={label}
      comments={comments}
      isHighlighted={isHighlighted}
      highlightedCommentId={highlightedCommentId}
      activeCommentField={activeCommentField}
      savingComment={savingComment}
      commentInputPrefill={commentInputPrefill}
      onToggleComment={onToggleComment}
      onAddComment={onAddComment}
      onReplyToComment={onReplyToComment}
      getUsersAction={getUsersAction}
      containerId={containerId}
      commentButtonVisibility="hover"
    >
      <div className="text-sm text-slate-900 break-words font-medium leading-relaxed whitespace-pre-wrap">
        {href && value && value !== '-' ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            {value}
          </a>
        ) : (
          value || '-'
        )}
      </div>
    </FieldCommentShell>
  )
}

export const FieldWithComments = memo(FieldWithCommentsComponent)
