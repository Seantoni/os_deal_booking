'use client'

import type { ReactNode } from 'react'
import type { FieldComment } from '@/types'
import CommentIcon from '@mui/icons-material/Comment'
import AddCommentIcon from '@mui/icons-material/AddComment'
import ReplyIcon from '@mui/icons-material/Reply'
import MentionInput from '@/components/marketing/MentionInput'
import { CommentText } from './CommentText'
import {
  getCommentAuthorLabel,
  getInlineCommentId,
} from './bookingRequestView.utils'
import type { CommentReplyPrefill, MentionUsersAction } from './types'

interface FieldCommentShellProps {
  fieldKey: string
  label: string
  comments: FieldComment[]
  children: ReactNode
  isHighlighted?: boolean
  highlightedCommentId?: string | null
  activeCommentField: string | null
  savingComment: boolean
  commentInputPrefill?: CommentReplyPrefill | null
  onToggleComment: (fieldKey: string | null) => void
  onAddComment: (text: string, mentions: string[]) => void | Promise<void>
  onReplyToComment?: (comment: FieldComment) => void
  getUsersAction?: MentionUsersAction
  containerId?: string
  commentButtonVisibility?: 'hover' | 'always'
}

export function FieldCommentShell({
  fieldKey,
  label,
  comments,
  children,
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
  commentButtonVisibility = 'always',
}: FieldCommentShellProps) {
  const hasComments = comments.length > 0
  const isAddingComment = activeCommentField === fieldKey
  const controlsClassName =
    commentButtonVisibility === 'hover'
      ? 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'
      : 'flex items-center gap-1'

  return (
    <div
      id={containerId}
      className={`relative group rounded-lg p-3 -m-3 transition-colors ${
        isHighlighted
          ? 'bg-yellow-50/50 ring-1 ring-yellow-200'
          : hasComments
            ? 'bg-blue-50/30'
            : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label
            className={`text-[11px] font-bold uppercase tracking-wider mb-2 block ${
              isHighlighted ? 'text-yellow-800' : 'text-slate-500 group-hover:text-slate-700'
            }`}
          >
            {label}
          </label>
          {children}
        </div>

        <div className={controlsClassName}>
          {hasComments && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold ring-1 ring-blue-200">
              {comments.length}
            </span>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleComment(isAddingComment ? null : fieldKey)
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isAddingComment
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Add comment"
            aria-label={`Add comment to ${label}`}
          >
            <AddCommentIcon style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>

      {hasComments && (
        <div className="mt-3 pt-3 border-t border-blue-100/50 space-y-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              id={getInlineCommentId(comment.id)}
              className={`text-xs text-slate-600 bg-white/50 p-2 rounded border transition-colors ${
                highlightedCommentId === comment.id
                  ? 'border-blue-400 ring-2 ring-blue-100'
                  : 'border-slate-100'
              }`}
            >
              <div className="flex items-start gap-2">
                <CommentIcon style={{ fontSize: 12 }} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">
                    {getCommentAuthorLabel(comment)}:
                  </span>
                  <span className="ml-1 whitespace-pre-wrap">
                    <CommentText content={comment.text} />
                  </span>
                  {onReplyToComment && (
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onReplyToComment(comment)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <ReplyIcon style={{ fontSize: 12 }} />
                        Responder
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddingComment && (
        <div className="mt-3 pt-3 border-t border-blue-100 relative z-10">
          {commentInputPrefill && (
            <p className="mb-2 text-[11px] text-slate-500">
              Respuesta con mención automática.
            </p>
          )}
          <MentionInput
            key={commentInputPrefill ? `${fieldKey}-${commentInputPrefill.nonce}` : fieldKey}
            onSubmit={async (content, mentions) => {
              await onAddComment(content, mentions)
            }}
            disabled={savingComment}
            showAttachments={false}
            getUsersAction={getUsersAction}
            initialValue={commentInputPrefill?.value}
            initialMentions={commentInputPrefill?.mentions}
            autoFocus={true}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleComment(null)
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
