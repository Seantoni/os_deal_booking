'use client'

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import RefreshIcon from '@mui/icons-material/Refresh'
import MentionInput from '@/components/marketing/MentionInput'
import ChatMessage from '@/components/marketing/ChatMessage'
import CloseIcon from '@mui/icons-material/Close'
import { ChatLoadingSkeleton, ChatEmptyState } from '@/components/common/ChatLoadingSkeleton'
import toast from 'react-hot-toast'

// Generic comment type that works for both opportunity and marketing comments
export interface ChatComment {
  id: string
  userId: string
  content: string
  mentions: string[] | null
  reactions: Record<string, string[]> | null
  attachments: Array<{ url: string; filename: string; type: string; size: number }> | null
  isEdited: boolean
  editedAt: Date | null
  createdAt: Date
  author: {
    clerkId: string
    name: string | null
    email: string | null
  } | null
}

// Actions interface for CRUD operations
export interface ChatThreadActions {
  getComments: () => Promise<{ success: boolean; data?: ChatComment[]; error?: string }>
  createComment: (data: { content: string; mentions: string[]; attachments?: Array<{ url: string; filename: string; type: string; size: number }> }) => Promise<{ success: boolean; data?: ChatComment; error?: string }>
  updateComment: (commentId: string, data: { content: string }) => Promise<{ success: boolean; data?: ChatComment; error?: string }>
  deleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>
  toggleReaction: (commentId: string, emoji: string) => Promise<{ success: boolean; data?: Record<string, string[]>; error?: string }>
  getUsersForMention?: (search?: string) => Promise<{ success: boolean; data?: Array<{ clerkId: string; name: string | null; email: string | null }>; error?: string }>
}

interface ChatThreadProps {
  entityId: string
  canEdit: boolean
  actions: ChatThreadActions
  // Customization
  title?: string
  emptyTitle?: string
  emptySubtitle?: string
  showAttachments?: boolean
  uploadFolder?: string // For file uploads
  // Styling
  variant?: 'default' | 'compact'
  className?: string
  // Polling
  pollingInterval?: number // In milliseconds, 0 to disable
  enableReplyAction?: boolean
  readOnlyMessage?: string
  headerActions?: ReactNode
  initialScrollPosition?: 'top' | 'bottom'
  onCommentsChange?: (comments: ChatComment[]) => void
}

type MentionableUser = {
  clerkId: string
  name: string | null
  email: string | null
}

type ReplyPrefill = {
  value: string
  mentions: MentionableUser[]
  nonce: number
  authorName: string
}

export default function ChatThread({
  entityId,
  canEdit,
  actions,
  title = 'Chat',
  emptyTitle = 'No hay comentarios aún',
  emptySubtitle = 'Inicia la conversación',
  showAttachments = false,
  uploadFolder,
  variant = 'default',
  className = '',
  pollingInterval = 0,
  enableReplyAction = false,
  readOnlyMessage = 'Solo el responsable o administradores pueden comentar',
  headerActions,
  initialScrollPosition = 'top',
  onCommentsChange,
}: ChatThreadProps) {
  const [comments, setComments] = useState<ChatComment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [replyPrefill, setReplyPrefill] = useState<ReplyPrefill | null>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const didInitialAutoScrollRef = useRef(false)

  // Load comments
  const loadComments = useCallback(async (silent = false) => {
    if (!silent) {
      setRefreshing(true)
    }
    try {
      const result = await actions.getComments()
      if (result.success && result.data) {
        setComments(result.data)
      } else if (!silent) {
        toast.error(result.error || 'Error al cargar comentarios')
      }
    } catch (err) {
      if (!silent) {
        toast.error('Error al cargar comentarios')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [actions])

  // Initial load
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Polling for real-time updates
  useEffect(() => {
    if (pollingInterval <= 0) return

    const interval = setInterval(() => {
      loadComments(true) // Silent refresh
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [loadComments, pollingInterval])

  // Scroll to bottom of chat container only (not the whole page)
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    didInitialAutoScrollRef.current = false
  }, [entityId])

  useEffect(() => {
    if (loading) return
    onCommentsChange?.(comments)
  }, [comments, loading, onCommentsChange])

  // Optional first-load auto-scroll for threads where latest messages should be shown by default.
  useEffect(() => {
    if (loading) return
    if (initialScrollPosition !== 'bottom') return
    if (didInitialAutoScrollRef.current) return

    scrollToBottom()
    window.setTimeout(scrollToBottom, 80)
    didInitialAutoScrollRef.current = true
  }, [comments, initialScrollPosition, loading, scrollToBottom])

  // Manual refresh
  const handleRefresh = async () => {
    await loadComments()
  }

  // Create comment
  const handleCreateComment = async (
    content: string,
    mentions: string[],
    attachments: Array<{ url: string; filename: string; type: string; size: number }>
  ) => {
    try {
      const result = await actions.createComment({
        content,
        mentions,
        attachments: showAttachments ? attachments : undefined,
      })

      if (result.success && result.data) {
        setComments((prev) => [...prev, result.data!])
        setReplyPrefill(null)
        // Scroll to bottom after adding new comment
        setTimeout(scrollToBottom, 100)
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
      const result = await actions.updateComment(commentId, { content })

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
      const result = await actions.deleteComment(commentId)

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
      const result = await actions.toggleReaction(commentId, emoji)

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

  const handleReplyToComment = useCallback((comment: ChatComment) => {
    const displayName = comment.author?.name || comment.author?.email?.split('@')[0] || 'usuario'
    const mentionTarget: MentionableUser = {
      clerkId: comment.author?.clerkId || comment.userId,
      name: comment.author?.name || displayName,
      email: comment.author?.email || null,
    }

    setReplyPrefill({
      value: `@${displayName}  `,
      mentions: [mentionTarget],
      nonce: Date.now(),
      authorName: displayName,
    })

    window.setTimeout(() => {
      inputContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 80)
  }, [])

  const isCompact = variant === 'compact'

  return (
    <div className={`flex flex-col ${isCompact ? 'gap-3' : 'gap-4'} ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b ${isCompact ? 'border-gray-100 pb-2' : 'border-gray-200 pb-3'}`}>
        <h4 className={`font-semibold ${isCompact ? 'text-sm text-gray-500 uppercase tracking-wide' : 'text-base text-gray-700'}`}>
          {title}
        </h4>
        <div className="flex items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleRefresh()
            }}
            disabled={refreshing}
            className={`text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:cursor-not-allowed ${isCompact ? 'p-1' : 'p-1.5'}`}
            title="Actualizar"
            aria-label="Actualizar comentarios"
          >
            <RefreshIcon
              style={{ fontSize: isCompact ? 14 : 16 }}
              className={refreshing ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>

      {/* Messages list */}
      <div 
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto pr-2 custom-scrollbar ${isCompact ? 'min-h-[100px] max-h-[400px] gap-2' : 'min-h-[200px] max-h-[400px]'}`}
        role="log"
        aria-label="Historial de comentarios"
        aria-live="polite"
      >
        {loading ? (
          <ChatLoadingSkeleton variant={variant} messageCount={3} />
        ) : comments.length === 0 ? (
          <ChatEmptyState 
            variant={variant}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        ) : (
          <div className={isCompact ? 'flex flex-col gap-2' : 'space-y-3'}>
            {comments.map((comment) => (
              <ChatMessage
                key={comment.id}
                comment={comment}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onReact={handleToggleReaction}
                onReply={enableReplyAction && canEdit ? handleReplyToComment : undefined}
                disabled={!canEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      {canEdit ? (
        <div
          ref={inputContainerRef}
          className={isCompact ? 'mt-2' : 'mt-4 pt-4 border-t border-gray-200'}
        >
          {enableReplyAction && replyPrefill && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs font-medium text-blue-700">
                Respondiendo a @{replyPrefill.authorName}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setReplyPrefill(null)
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <CloseIcon style={{ fontSize: 12 }} />
                Cancelar
              </button>
            </div>
          )}
          <MentionInput
            key={enableReplyAction && replyPrefill ? `${entityId}-${replyPrefill.nonce}` : entityId}
            onSubmit={handleCreateComment}
            disabled={loading}
            showAttachments={showAttachments}
            optionId={uploadFolder || entityId}
            getUsersAction={actions.getUsersForMention}
            placeholder="Escribe un comentario... usa @ para mencionar"
            initialValue={enableReplyAction ? replyPrefill?.value : undefined}
            initialMentions={enableReplyAction ? replyPrefill?.mentions : undefined}
            autoFocus={enableReplyAction && !!replyPrefill}
          />
        </div>
      ) : (
        <div className={isCompact ? 'mt-2' : 'mt-4 pt-4 border-t border-gray-200'}>
          <p className="text-sm text-gray-400 text-center">
            {readOnlyMessage}
          </p>
        </div>
      )}
    </div>
  )
}
