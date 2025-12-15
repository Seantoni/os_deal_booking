'use client'

import { memo } from 'react'
import type { FieldComment } from '@/types'
import CommentIcon from '@mui/icons-material/Comment'
import AddCommentIcon from '@mui/icons-material/AddComment'

interface FieldWithCommentsProps {
  fieldKey: string
  label: string
  value: string
  comments: FieldComment[]
  isHighlighted?: boolean
  activeCommentField: string | null
  newCommentText: string
  savingComment: boolean
  onToggleComment: (fieldKey: string | null) => void
  onCommentTextChange: (text: string) => void
  onAddComment: () => void
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
  newCommentText,
  savingComment,
  onToggleComment,
  onCommentTextChange,
  onAddComment,
}: FieldWithCommentsProps) {
  const hasComments = comments.length > 0
  const isAddingComment = activeCommentField === fieldKey

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
                  <span className="ml-1 line-clamp-2">{comment.text}</span>
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
          <textarea
            value={newCommentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none shadow-sm"
            rows={2}
            autoFocus
            onClick={(e) => e.stopPropagation()}
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
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddComment()
              }}
              disabled={!newCommentText.trim() || savingComment}
              className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {savingComment ? 'Saving...' : 'Add Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const FieldWithComments = memo(FieldWithCommentsComponent)

