'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { formatRelativeTime } from '@/lib/date'
import { Textarea } from '@/components/ui'

interface CommentAttachment {
  url: string
  filename: string
  type: string
  size: number
}

interface CommentAuthor {
  clerkId: string
  name: string | null
  email: string | null
}

interface Comment {
  id: string
  userId: string
  content: string
  mentions: string[] | null
  reactions: Record<string, string[]> | null
  attachments: CommentAttachment[] | null
  isEdited: boolean
  editedAt: Date | null
  createdAt: Date
  author: CommentAuthor | null
}

// Common emoji reactions
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

interface ChatMessageProps {
  comment: Comment
  onEdit: (commentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onReact: (commentId: string, emoji: string) => Promise<void>
  disabled?: boolean
}

export default function ChatMessage({
  comment,
  onEdit,
  onDelete,
  onReact,
  disabled = false,
}: ChatMessageProps) {
  const { user } = useUser()
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)

  const isOwner = user?.id === comment.userId
  const authorName = comment.author?.name || comment.author?.email?.split('@')[0] || 'Usuario'
  const authorInitial = (authorName[0] || '?').toUpperCase()

  // Parse content to highlight mentions
  const renderContent = (content: string) => {
    // Simple regex to find @mentions
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium bg-blue-50 px-1 py-0.5 rounded text-[13px]">
            {part}
          </span>
        )
      }
      return part
    })
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() || saving) return
    setSaving(true)
    try {
      await onEdit(comment.id, editContent.trim())
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) return
    await onDelete(comment.id)
  }

  const handleReaction = async (emoji: string) => {
    setShowReactionPicker(false)
    await onReact(comment.id, emoji)
  }

  // Get reaction counts with current user highlighted
  const getReactionCounts = () => {
    if (!comment.reactions) return []

    return Object.entries(comment.reactions).map(([emoji, userIds]) => ({
      emoji,
      count: userIds.length,
      hasReacted: user?.id ? userIds.includes(user.id) : false,
    }))
  }

  const reactionCounts = getReactionCounts()

  return (
    <div
      className="group relative flex gap-2 hover:bg-gray-50/50 -mx-1 px-1.5 py-0.5 rounded transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowReactionPicker(false)
      }}
    >
      {/* Avatar */}
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100 mt-0.5">
        <span className="text-[10px] text-blue-700 font-bold">{authorInitial}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-0">
          <span className="text-xs font-semibold text-gray-900">{authorName}</span>
          <span className="text-[10px] text-gray-400">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.isEdited && (
            <span className="text-[9px] text-gray-300 italic">(editado)</span>
          )}
        </div>

        {/* Message content */}
        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <div className="bg-white border rounded-lg p-2 shadow-sm focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={2}
                className="text-sm border-none p-0 focus:ring-0 resize-none min-h-[60px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editContent.trim()}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
              >
                Guardar Cambios
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
              {renderContent(comment.content)}
            </div>

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {comment.attachments.map((att, index) => (
                  <a
                    key={index}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/file block relative"
                  >
                    {att.type.startsWith('image/') ? (
                      <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-md">
                        <img
                          src={att.url}
                          alt={att.filename}
                          className="max-w-[200px] max-h-[140px] object-cover transition-transform group-hover/file:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                        <div className="p-1.5 bg-white rounded-md border border-gray-100 shadow-sm">
                          <AttachFileIcon style={{ fontSize: 16 }} className="text-blue-500" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[140px]">{att.filename}</span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}

            {/* Reactions */}
            {reactionCounts.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {reactionCounts.map(({ emoji, count, hasReacted }) => (
                  <button
                    key={emoji}
                    onClick={() => !disabled && handleReaction(emoji)}
                    disabled={disabled}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all border ${
                      hasReacted
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    } disabled:cursor-not-allowed`}
                  >
                    <span className="text-[10px]">{emoji}</span>
                    <span className="text-[9px] opacity-80">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions menu (on hover) */}
      {showActions && !isEditing && !disabled && (
        <div className="absolute right-1 top-0 flex items-center bg-white border border-gray-200 rounded shadow-sm divide-x divide-gray-100 z-10">
          {/* Reaction picker toggle */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-l transition-colors"
              title="Agregar reacción"
            >
              <MoreHorizIcon style={{ fontSize: 14 }} />
            </button>

            {/* Reaction picker dropdown */}
            {showReactionPicker && (
              <div className="absolute right-0 top-full mt-0.5 flex gap-0.5 bg-white border border-gray-200 rounded shadow-xl p-1 z-20 w-max animate-in fade-in zoom-in-95 duration-100">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors text-sm hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit (owner only) */}
          {isOwner && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Editar comentario"
            >
              <EditIcon style={{ fontSize: 14 }} />
            </button>
          )}

          {/* Delete (owner only) */}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-r transition-colors"
              title="Eliminar comentario"
            >
              <DeleteIcon style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
