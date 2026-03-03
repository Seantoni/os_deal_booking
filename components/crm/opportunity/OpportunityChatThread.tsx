'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import ChatThread, { type ChatThreadActions, type ChatComment } from '@/components/shared/ChatThread'
import TruncatedTextWithTooltip from '@/components/shared/TruncatedTextWithTooltip'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui'
import {
  getOpportunityCommentThreads,
  getOpportunityComments,
  createOpportunityComment,
  updateOpportunityComment,
  deleteOpportunityComment,
  toggleOpportunityCommentReaction,
  getUsersForOpportunityMention,
  resolveOpportunityCommentThread,
  type OpportunityCommentThreadSummary,
} from '@/app/actions/opportunity-comments'

interface OpportunityChatThreadProps {
  opportunityId: string
  canEdit: boolean
  initialThreadId?: string | null
}

function formatDateTime(value: Date | null): string {
  if (!value) return '-'
  return value.toLocaleString('es-PA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OpportunityChatThread({ opportunityId, canEdit, initialThreadId = null }: OpportunityChatThreadProps) {
  const [threads, setThreads] = useState<OpportunityCommentThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [expandedResolvedThreadId, setExpandedResolvedThreadId] = useState<string | null>(null)

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolvingThread, setResolvingThread] = useState(false)

  const openThread = useMemo(
    () => threads.find((thread) => thread.status === 'OPEN') || null,
    [threads]
  )

  const resolvedThreads = useMemo(
    () =>
      threads
        .filter((thread) => thread.status === 'RESOLVED')
        .sort((a, b) => {
          const aTime = (a.resolvedAt || a.createdAt).getTime()
          const bTime = (b.resolvedAt || b.createdAt).getTime()
          return bTime - aTime
        }),
    [threads]
  )

  const loadThreads = useCallback(async (preferredThreadId?: string | null) => {
    setLoadingThreads(true)
    try {
      const result = await getOpportunityCommentThreads(opportunityId)
      if (!result.success || !result.data) {
        toast.error(result.error || 'Error al cargar los items de chat')
        return
      }

      const nextThreads = result.data
      setThreads(nextThreads)

      setExpandedResolvedThreadId((previousId) => {
        const preferredThread = preferredThreadId
          ? nextThreads.find((thread) => thread.id === preferredThreadId)
          : null

        if (preferredThread?.status === 'RESOLVED') {
          return preferredThread.id
        }

        if (previousId) {
          const stillExists = nextThreads.some(
            (thread) => thread.id === previousId && thread.status === 'RESOLVED'
          )
          if (stillExists) return previousId
        }

        if (initialThreadId) {
          const initialResolvedThread = nextThreads.find(
            (thread) => thread.id === initialThreadId && thread.status === 'RESOLVED'
          )
          if (initialResolvedThread) return initialResolvedThread.id
        }

        return null
      })
    } catch {
      toast.error('Error al cargar los items de chat')
    } finally {
      setLoadingThreads(false)
    }
  }, [initialThreadId, opportunityId])

  useEffect(() => {
    loadThreads(initialThreadId)
  }, [initialThreadId, loadThreads])

  const openResolveDialog = useCallback(() => {
    if (!openThread) return

    setResolveDialogOpen(true)
  }, [openThread])

  const handleResolveThread = useCallback(async () => {
    if (!openThread || resolvingThread) return

    setResolvingThread(true)
    try {
      const result = await resolveOpportunityCommentThread(openThread.id)
      if (!result.success || !result.data) {
        toast.error(result.error || 'Error al resolver el item')
        return
      }

      setResolveDialogOpen(false)
      setExpandedResolvedThreadId(result.data.id)
      toast.success('Item resuelto y nuevo item abierto')
      await loadThreads(result.nextOpenThreadId)
    } catch {
      toast.error('Error al resolver el item')
    } finally {
      setResolvingThread(false)
    }
  }, [loadThreads, openThread, resolvingThread])

  const buildActions = useCallback((threadId: string | null): ChatThreadActions => {
    return {
      getComments: async () => {
        if (!threadId) {
          return { success: true, data: [] }
        }

        const result = await getOpportunityComments(opportunityId, threadId)
        if (result.success && result.data) {
          const comments: ChatComment[] = result.data.map((comment) => ({
            id: comment.id,
            userId: comment.userId,
            content: comment.content,
            mentions: comment.mentions,
            reactions: comment.reactions,
            attachments: null,
            isEdited: comment.isEdited,
            editedAt: comment.editedAt,
            createdAt: comment.createdAt,
            author: comment.author,
          }))

          return { success: true, data: comments }
        }

        return result as { success: boolean; error?: string }
      },

      createComment: async (data) => {
        if (!threadId) {
          return { success: false, error: 'No hay un item activo para comentar' }
        }

        const result = await createOpportunityComment(opportunityId, {
          threadId,
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
      },

      updateComment: async (commentId, data) => {
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
      },

      deleteComment: async (commentId) => {
        return deleteOpportunityComment(commentId)
      },

      toggleReaction: async (commentId, emoji) => {
        return toggleOpportunityCommentReaction(commentId, emoji)
      },

      getUsersForMention: async (search?: string) => {
        return getUsersForOpportunityMention(search)
      },
    }
  }, [opportunityId])

  const openThreadActions = useMemo(
    () => buildActions(openThread?.id || null),
    [buildActions, openThread?.id]
  )

  return (
    <div className="space-y-4">
      {resolvedThreads.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-3 py-2">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chats resueltos</h5>
          </div>

          <div className="divide-y divide-gray-100">
            {resolvedThreads.map((thread) => {
              const isExpanded = expandedResolvedThreadId === thread.id
              const resolutionText = thread.resolutionNote?.trim() || 'Sin nota de resolución'
              const resolvedDate = thread.resolvedAt ?? thread.updatedAt ?? thread.createdAt

              return (
                <div key={thread.id} className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedResolvedThreadId((previousId) =>
                        previousId === thread.id ? null : thread.id
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-600">
                      <span className="truncate font-medium text-gray-700">{thread.title}</span>
                      <span className="text-gray-300">•</span>
                      <span className="shrink-0">Resuelto: {formatDateTime(resolvedDate)}</span>
                      <span className="text-gray-300">•</span>
                      <div className="min-w-0 flex-1">
                        <TruncatedTextWithTooltip
                          text={`Resolución: ${resolutionText}`}
                          className="text-sm text-gray-500"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-blue-600">
                      {isExpanded ? 'Ocultar' : 'Ver'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="mb-2 text-xs text-gray-500">
                        Resuelto: {formatDateTime(thread.resolvedAt)}
                      </p>
                      <ChatThread
                        entityId={`${opportunityId}:resolved:${thread.id}`}
                        canEdit={false}
                        actions={buildActions(thread.id)}
                        title={thread.title}
                        emptyTitle="No hay comentarios en este chat"
                        emptySubtitle="Este item se resolvió sin mensajes"
                        showAttachments={false}
                        variant="default"
                        pollingInterval={0}
                        enableReplyAction={false}
                        readOnlyMessage="Este item está resuelto y se muestra en modo solo lectura"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ChatThread
        entityId={`${opportunityId}:open:${openThread?.id || 'none'}`}
        canEdit={!!(canEdit && openThread)}
        actions={openThreadActions}
        title={openThread?.title || 'Sin item activo'}
        initialScrollPosition="bottom"
        headerActions={
          canEdit && openThread ? (
            <Button type="button" size="sm" variant="destructive" onClick={openResolveDialog}>
              Resolver Item
            </Button>
          ) : undefined
        }
        emptyTitle={openThread ? 'No hay comentarios aún' : 'No hay item activo'}
        emptySubtitle={
          openThread
            ? 'Inicia la conversación sobre este item'
            : 'Espere mientras se prepara el siguiente item'
        }
        showAttachments={false}
        variant="default"
        pollingInterval={openThread ? 15000 : 0}
        enableReplyAction={true}
        readOnlyMessage="Solo el responsable o administradores pueden comentar"
      />

      <ConfirmDialog
        isOpen={resolveDialogOpen}
        title="Resolver Item"
        message={
          <div className="space-y-3 text-left">
            <p className="text-sm text-gray-600">
              Esta acción cerrará el item actual, ocultará sus pendientes en el inbox para todos y abrirá un nuevo item automáticamente.
            </p>
            <p className="text-sm text-gray-600">
              La resolución se generará automáticamente con AI en una sola línea y lo más breve posible.
            </p>
          </div>
        }
        confirmText="Confirmar Resolución"
        cancelText="Cancelar"
        confirmVariant="danger"
        loading={resolvingThread}
        loadingText="Resolviendo..."
        onConfirm={handleResolveThread}
        onCancel={() => {
          if (resolvingThread) return
          setResolveDialogOpen(false)
        }}
      />

      {loadingThreads && (
        <p className="text-xs text-gray-400">Cargando chats...</p>
      )}
    </div>
  )
}
