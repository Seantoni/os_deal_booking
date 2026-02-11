'use client'

import { memo, useCallback } from 'react'
import type { FieldComment } from '@/types'
import CommentIcon from '@mui/icons-material/Comment'
import AddCommentIcon from '@mui/icons-material/AddComment'
import MentionInput from '@/components/marketing/MentionInput'

interface FieldWithCommentsProps {
  fieldKey: string
  label: string
  value: string
  comments: FieldComment[]
  isHighlighted?: boolean
  activeCommentField: string | null
  savingComment: boolean
  onToggleComment: (fieldKey: string | null) => void
  onAddComment: (text: string, mentions: string[]) => void
  getUsersAction?: (search?: string) => Promise<{ success: boolean; data?: Array<{ clerkId: string; name: string | null; email: string | null }>; error?: string }>
}

/**
 * Reusable field component with comment functionality
 * Used for both regular fields and additional info fields
 */
function FieldWithCommentsComponent({
  fieldKey,
  label,
  value,
  comments,
  isHighlighted = false,
  activeCommentField,
  savingComment,
  onToggleComment,
  onAddComment,
  getUsersAction,
}: FieldWithCommentsProps) {
  const hasComments = comments.length > 0
  const isAddingComment = activeCommentField === fieldKey

  const renderCommentText = useCallback((content: string) => {
    const mentionRegex = /@[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,3}/gu
    const parts: Array<{ text: string; isMention: boolean }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index), isMention: false })
      }
      parts.push({ text: match[0], isMention: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), isMention: false })
    }

    return parts.map((part, index) =>
      part.isMention ? (
        <span key={index} className="text-blue-600 font-semibold">
          {part.text}
        </span>
      ) : (
        <span key={index}>{part.text}</span>
      )
    )
  }, [])

  return (
    <div
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
            className={`text-[11px] font-bold uppercase tracking-wider mb-1 block ${
              isHighlighted ? 'text-yellow-800' : 'text-slate-500 group-hover:text-slate-700'
            }`}
          >
            {label}
          </label>
          <div className="text-sm text-slate-900 break-words font-medium leading-relaxed whitespace-pre-wrap">
            {value || '-'}
          </div>
        </div>

        {/* Comment indicator/button */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasComments && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold ring-1 ring-blue-200">
              {comments.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
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

      {/* Show field comments inline */}
      {hasComments && (
        <div className="mt-3 pt-3 border-t border-blue-100/50 space-y-2">
          {comments.slice(0, 2).map((comment) => (
            <div
              key={comment.id}
              className="text-xs text-slate-600 bg-white/50 p-2 rounded border border-slate-100"
            >
              <div className="flex items-start gap-2">
                <CommentIcon style={{ fontSize: 12 }} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">
                    {comment.authorName || comment.authorEmail?.split('@')[0] || 'User'}:
                  </span>
                  <span className="ml-1 line-clamp-2">{renderCommentText(comment.text)}</span>
                </div>
              </div>
            </div>
          ))}
          {comments.length > 2 && (
            <p className="text-[10px] font-medium text-blue-600 pl-1 hover:underline cursor-pointer">
              +{comments.length - 2} more comments
            </p>
          )}
        </div>
      )}

      {/* Add comment form */}
      {isAddingComment && (
        <div className="mt-3 pt-3 border-t border-blue-100 relative z-10">
          <MentionInput
            onSubmit={async (content, mentions) => {
              await onAddComment(content, mentions)
            }}
            disabled={savingComment}
            showAttachments={false}
            getUsersAction={getUsersAction}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleComment(null)
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const FieldWithComments = memo(FieldWithCommentsComponent)
