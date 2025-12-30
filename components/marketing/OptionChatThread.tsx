'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import MentionInput from './MentionInput'
import ChatMessage from './ChatMessage'
import {
  getOptionComments,
  createOptionComment,
  updateOptionComment,
  deleteOptionComment,
  toggleCommentReaction,
  type CommentWithAuthor,
  type CommentAttachment,
} from '@/app/actions/marketing-comments'
import toast from 'react-hot-toast'

interface OptionChatThreadProps {
  optionId: string
  canEdit: boolean
}

export default function OptionChatThread({ optionId, canEdit }: OptionChatThreadProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      const result = await getOptionComments(optionId)
      if (result.success && result.data) {
        setComments(result.data)
      } else {
        toast.error(result.error || 'Error al cargar comentarios')
      }
    } catch (err) {
      toast.error('Error al cargar comentarios')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [optionId])

  // Initial load
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (comments.length > 0) {
      scrollToBottom()
    }
  }, [comments.length])

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadComments()
  }

  // Create comment
  const handleCreateComment = async (
    content: string,
    mentions: string[],
    attachments: CommentAttachment[]
  ) => {
    try {
      const result = await createOptionComment(optionId, {
        content,
        mentions,
        attachments,
      })

      if (result.success && result.data) {
        setComments((prev) => [...prev, result.data!])
        // toast.success('Comentario enviado') // Removed purely for cleaner UX like slack/clickup
      } else {
        toast.error(result.error || 'Error al enviar comentario')
      }
    } catch (err) {
      toast.error('Error al enviar comentario')
    }
  }

  // Edit comment
  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const result = await updateOptionComment(commentId, { content })

      if (result.success && result.data) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? result.data! : c))
        )
        toast.success('Comentario actualizado')
      } else {
        toast.error(result.error || 'Error al actualizar comentario')
      }
    } catch (err) {
      toast.error('Error al actualizar comentario')
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await deleteOptionComment(commentId)

      if (result.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        toast.success('Comentario eliminado')
      } else {
        toast.error(result.error || 'Error al eliminar comentario')
      }
    } catch (err) {
      toast.error('Error al eliminar comentario')
    }
  }

  // Toggle reaction
  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      const result = await toggleCommentReaction(commentId, emoji)

      if (result.success && result.data !== undefined) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, reactions: result.data! } : c
          )
        )
      } else {
        toast.error(result.error || 'Error al reaccionar')
      }
    } catch (err) {
      toast.error('Error al reaccionar')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Activity Header (Optional, subtle) */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actividad</h4>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded transition-colors disabled:cursor-not-allowed"
          title="Actualizar"
        >
          <RefreshIcon
            style={{ fontSize: 14 }}
            className={refreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex flex-col gap-2 min-h-[100px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
            <span className="text-sm text-gray-400 font-medium">Aún no hay actividad</span>
            <span className="text-xs text-gray-400">Deja un comentario para iniciar la conversación</span>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <ChatMessage
                key={comment.id}
                comment={comment}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onReact={handleToggleReaction}
                disabled={!canEdit}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      {canEdit && (
        <div className="mt-2">
          <MentionInput
            optionId={optionId}
            onSubmit={handleCreateComment}
            disabled={loading}
          />
        </div>
      )}
    </div>
  )
}
