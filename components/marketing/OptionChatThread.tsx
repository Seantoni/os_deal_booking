'use client'

import { useCallback } from 'react'
import ChatThread, { type ChatThreadActions, type ChatComment } from '@/components/shared/ChatThread'
import {
  getOptionComments,
  createOptionComment,
  updateOptionComment,
  deleteOptionComment,
  toggleCommentReaction,
  getUsersForMention,
} from '@/app/actions/marketing-comments'

interface OptionChatThreadProps {
  optionId: string
  canEdit: boolean
}

export default function OptionChatThread({ optionId, canEdit }: OptionChatThreadProps) {
  // Build actions object for the generic ChatThread
  const actions: ChatThreadActions = {
    getComments: useCallback(async () => {
      const result = await getOptionComments(optionId)
      if (result.success && result.data) {
        // Transform to generic ChatComment type
        const comments: ChatComment[] = result.data.map(c => ({
          id: c.id,
          userId: c.userId,
          content: c.content,
          mentions: c.mentions,
          reactions: c.reactions,
          attachments: c.attachments,
          isEdited: c.isEdited,
          editedAt: c.editedAt,
          createdAt: c.createdAt,
          author: c.author,
        }))
        return { success: true, data: comments }
      }
      return result as { success: boolean; error?: string }
    }, [optionId]),

    createComment: useCallback(async (data) => {
      const result = await createOptionComment(optionId, {
        content: data.content,
        mentions: data.mentions,
        attachments: data.attachments || [],
      })
      if (result.success && result.data) {
        const comment: ChatComment = {
          id: result.data.id,
          userId: result.data.userId,
          content: result.data.content,
          mentions: result.data.mentions,
          reactions: result.data.reactions,
          attachments: result.data.attachments,
          isEdited: result.data.isEdited,
          editedAt: result.data.editedAt,
          createdAt: result.data.createdAt,
          author: result.data.author,
        }
        return { success: true, data: comment }
      }
      return result as { success: boolean; error?: string }
    }, [optionId]),

    updateComment: useCallback(async (commentId, data) => {
      const result = await updateOptionComment(commentId, data)
      if (result.success && result.data) {
        const comment: ChatComment = {
          id: result.data.id,
          userId: result.data.userId,
          content: result.data.content,
          mentions: result.data.mentions,
          reactions: result.data.reactions,
          attachments: result.data.attachments,
          isEdited: result.data.isEdited,
          editedAt: result.data.editedAt,
          createdAt: result.data.createdAt,
          author: result.data.author,
        }
        return { success: true, data: comment }
      }
      return result as { success: boolean; error?: string }
    }, []),

    deleteComment: useCallback(async (commentId) => {
      return deleteOptionComment(commentId)
    }, []),

    toggleReaction: useCallback(async (commentId, emoji) => {
      return toggleCommentReaction(commentId, emoji)
    }, []),

    getUsersForMention: useCallback(async (search?: string) => {
      return getUsersForMention(search)
    }, []),
  }

  return (
    <ChatThread
      entityId={optionId}
      canEdit={canEdit}
      actions={actions}
      title="Actividad"
      emptyTitle="Aún no hay actividad"
      emptySubtitle="Deja un comentario para iniciar la conversación"
      showAttachments={true}
      uploadFolder={`marketing-comments/${optionId}`}
      variant="compact"
      pollingInterval={15000} // Poll every 15 seconds
    />
  )
}
