'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import MentionInput from '@/components/marketing/MentionInput'
import ChatMessage from '@/components/marketing/ChatMessage'
import {
  getOpportunityComments,
  createOpportunityComment,
  updateOpportunityComment,
  deleteOpportunityComment,
  toggleOpportunityCommentReaction,
  getUsersForOpportunityMention,
  type OpportunityCommentWithAuthor,
} from '@/app/actions/opportunity-comments'
import toast from 'react-hot-toast'

interface OpportunityChatThreadProps {
  opportunityId: string
  canEdit: boolean
}

export default function OpportunityChatThread({ opportunityId, canEdit }: OpportunityChatThreadProps) {
  const [comments, setComments] = useState<OpportunityCommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      const result = await getOpportunityComments(opportunityId)
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
  }, [opportunityId])

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

  // Create comment (no attachments for opportunity comments)
  const handleCreateComment = async (
    content: string,
    mentions: string[],
    _attachments: unknown[] // Unused but required by interface
  ) => {
    try {
      const result = await createOpportunityComment(opportunityId, {
        content,
        mentions,
      })

      if (result.success && result.data) {
        setComments((prev) => [...prev, result.data!])
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
      const result = await updateOpportunityComment(commentId, { content })

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
      const result = await deleteOpportunityComment(commentId)

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
      const result = await toggleOpportunityCommentReaction(commentId, emoji)

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <h4 className="text-sm font-semibold text-gray-700">Chat de Oportunidad</h4>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:cursor-not-allowed"
          title="Actualizar"
        >
          <RefreshIcon
            style={{ fontSize: 16 }}
            className={refreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[200px] max-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <ChatBubbleOutlineIcon className="text-gray-400" style={{ fontSize: 24 }} />
            </div>
            <span className="text-sm text-gray-500 font-medium">No hay comentarios aún</span>
            <span className="text-xs text-gray-400 mt-1">Inicia la conversación sobre esta oportunidad</span>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <ChatMessage
                key={comment.id}
                comment={{
                  id: comment.id,
                  userId: comment.userId,
                  content: comment.content,
                  mentions: comment.mentions,
                  reactions: comment.reactions,
                  attachments: null, // No attachments for opportunity comments
                  isEdited: comment.isEdited,
                  editedAt: comment.editedAt,
                  createdAt: comment.createdAt,
                  author: comment.author,
                }}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onReact={handleToggleReaction}
                disabled={!canEdit}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      {canEdit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <MentionInput
            onSubmit={handleCreateComment}
            disabled={loading}
            showAttachments={false}
            getUsersAction={getUsersForOpportunityMention}
            placeholder="Escribe un comentario... usa @ para mencionar"
          />
        </div>
      )}

      {!canEdit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Solo el responsable o administradores pueden comentar
          </p>
        </div>
      )}
    </div>
  )
}

