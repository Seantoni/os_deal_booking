'use client'

import { useCallback } from 'react'
import ChatThread, { type ChatThreadActions, type ChatComment } from '@/components/shared/ChatThread'
import {
  getOpportunityComments,
  createOpportunityComment,
  updateOpportunityComment,
  deleteOpportunityComment,
  toggleOpportunityCommentReaction,
  getUsersForOpportunityMention,
} from '@/app/actions/opportunity-comments'

interface OpportunityChatThreadProps {
  opportunityId: string
  canEdit: boolean
}

export default function OpportunityChatThread({ opportunityId, canEdit }: OpportunityChatThreadProps) {
  // Build actions object for the generic ChatThread
  const actions: ChatThreadActions = {
    getComments: useCallback(async () => {
      const result = await getOpportunityComments(opportunityId)
      if (result.success && result.data) {
        // Transform to generic ChatComment type
        const comments: ChatComment[] = result.data.map(c => ({
          id: c.id,
          userId: c.userId,
          content: c.content,
          mentions: c.mentions,
          reactions: c.reactions,
          attachments: null, // No attachments for opportunities
          isEdited: c.isEdited,
          editedAt: c.editedAt,
          createdAt: c.createdAt,
          author: c.author,
        }))
        return { success: true, data: comments }
      }
      return result as { success: boolean; error?: string }
    }, [opportunityId]),

    createComment: useCallback(async (data) => {
      const result = await createOpportunityComment(opportunityId, {
        content: data.content,
        mentions: data.mentions,
      })
      if (result.success && result.data) {
        const comment: ChatComment = {
          id: result.data.id,
          userId: result.data.userId,
          content: result.data.content,
          mentions: result.data.mentions,
          reactions: result.data.reactions,
          attachments: null,
          isEdited: result.data.isEdited,
          editedAt: result.data.editedAt,
          createdAt: result.data.createdAt,
          author: result.data.author,
        }
        return { success: true, data: comment }
      }
      return result as { success: boolean; error?: string }
    }, [opportunityId]),

    updateComment: useCallback(async (commentId, data) => {
      const result = await updateOpportunityComment(commentId, data)
      if (result.success && result.data) {
        const comment: ChatComment = {
          id: result.data.id,
          userId: result.data.userId,
          content: result.data.content,
          mentions: result.data.mentions,
          reactions: result.data.reactions,
          attachments: null,
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
      return deleteOpportunityComment(commentId)
    }, []),

    toggleReaction: useCallback(async (commentId, emoji) => {
      return toggleOpportunityCommentReaction(commentId, emoji)
    }, []),

    getUsersForMention: useCallback(async (search?: string) => {
      return getUsersForOpportunityMention(search)
    }, []),
  }

  return (
    <ChatThread
      entityId={opportunityId}
      canEdit={canEdit}
      actions={actions}
      title="Chat de Oportunidad"
      emptyTitle="No hay comentarios aún"
      emptySubtitle="Inicia la conversación sobre esta oportunidad"
      showAttachments={false}
      variant="default"
      pollingInterval={15000} // Poll every 15 seconds
    />
  )
}
