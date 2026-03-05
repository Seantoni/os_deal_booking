'use client'

import type { ChangeEvent } from 'react'
import type { FieldComment } from '@/types'
import CommentIcon from '@mui/icons-material/Comment'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import HistoryIcon from '@mui/icons-material/History'
import { formatDateTime, formatShortDate } from '@/lib/date'
import { CommentText } from './CommentText'
import { getCommentAuthorLabel } from './bookingRequestView.utils'

interface CommentsSidebarProps {
  comments: FieldComment[]
  userId?: string
  isAdmin: boolean
  editingCommentId: string | null
  editCommentText: string
  savingComment: boolean
  fieldLabelMap: Map<string, string>
  onCommentClick: (comment: FieldComment) => void
  onStartEdit: (comment: FieldComment) => void
  onDeleteComment: (commentId: string) => void
  onEditCommentTextChange: (value: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: string) => void
}

export function CommentsSidebar({
  comments,
  userId,
  isAdmin,
  editingCommentId,
  editCommentText,
  savingComment,
  fieldLabelMap,
  onCommentClick,
  onStartEdit,
  onDeleteComment,
  onEditCommentTextChange,
  onCancelEdit,
  onSaveEdit,
}: CommentsSidebarProps) {
  const mentioned = comments.filter((comment) => (comment.mentions || []).includes(userId || ''))
  const others = comments.filter((comment) => !(comment.mentions || []).includes(userId || ''))

  const handleEditTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onEditCommentTextChange(event.target.value)
  }

  const renderComment = (comment: FieldComment) => {
    const isEditing = editingCommentId === comment.id
    const canEdit = comment.authorId === userId || isAdmin
    const canDelete = isAdmin
    const fieldLabel = fieldLabelMap.get(comment.fieldKey) || comment.fieldKey

    return (
      <div
        key={comment.id}
        className="group bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onCommentClick(comment)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{fieldLabel}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-900">{getCommentAuthorLabel(comment)}</span>
              <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
              <span>{formatShortDate(comment.createdAt)}</span>
              {comment.updatedAt && (
                <>
                  <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                  <span className="text-amber-600 font-medium text-[10px] bg-amber-50 px-1 rounded">edited</span>
                </>
              )}
            </div>
          </div>
          {!isEditing && (canEdit || canDelete) && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onStartEdit(comment)
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Editar comentario"
                >
                  <EditIcon style={{ fontSize: 14 }} />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteComment(comment.id)
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Eliminar comentario"
                >
                  <DeleteIcon style={{ fontSize: 14 }} />
                </button>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editCommentText}
              onChange={handleEditTextChange}
              onClick={(event) => event.stopPropagation()}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onCancelEdit()
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onSaveEdit(comment.id)
                }}
                disabled={!editCommentText.trim() || savingComment}
                className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingComment ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            <CommentText content={comment.text} />
          </div>
        )}

        {!isEditing && (
          <div className="mt-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCommentClick(comment)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <ArrowBackIcon style={{ fontSize: 13 }} />
              <span>Ir al comentario</span>
            </button>
          </div>
        )}

        {comment.editHistory.length > 0 && !isEditing && (
          <details className="mt-3 pt-2 border-t border-slate-100">
            <summary className="text-[10px] font-medium text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1 select-none">
              <HistoryIcon style={{ fontSize: 12 }} />
              Ver historial de ediciones ({comment.editHistory.length})
            </summary>
            <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2">
              {comment.editHistory.map((edit, index) => (
                <div key={index} className="text-xs text-slate-500">
                  <p className="text-[10px] font-medium text-slate-400 mb-0.5">
                    {formatDateTime(edit.editedAt)}
                  </p>
                  <p className="text-slate-600 line-through bg-slate-50 px-1 py-0.5 rounded inline-block">
                    {edit.text}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col flex-shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
          Comentarios ({comments.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
        {comments.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CommentIcon className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-900">Aún no hay comentarios</p>
            <p className="text-xs text-slate-500 mt-1">
              Haz clic en el icono de comentario junto a cualquier campo para iniciar una discusión.
            </p>
          </div>
        ) : (
          <>
            {mentioned.length > 0 && <div className="space-y-4">{mentioned.map(renderComment)}</div>}
            {mentioned.length > 0 && others.length > 0 && (
              <div className="border-t border-slate-200 my-4"></div>
            )}
            {others.length > 0 && <div className="space-y-4">{others.map(renderComment)}</div>}
          </>
        )}
      </div>
    </div>
  )
}
