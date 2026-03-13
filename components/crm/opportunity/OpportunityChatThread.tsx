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
  getOpportunityThreadTaskRecommendations,
  type OpportunityCommentThreadSummary,
  type OpportunityThreadTaskRecommendation,
} from '@/app/actions/opportunity-comments'

interface OpportunityChatThreadProps {
  opportunityId: string
  canEdit: boolean
  initialThreadId?: string | null
  onApplyTaskRecommendation?: (recommendation: OpportunityThreadTaskRecommendation) => void
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

export default function OpportunityChatThread({
  opportunityId,
  canEdit,
  initialThreadId = null,
  onApplyTaskRecommendation,
}: OpportunityChatThreadProps) {
  const [threads, setThreads] = useState<OpportunityCommentThreadSummary[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [expandedResolvedThreadId, setExpandedResolvedThreadId] = useState<string | null>(null)

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [resolvingThread, setResolvingThread] = useState(false)
  const [fetchingRecommendations, setFetchingRecommendations] = useState(false)
  const [recommendationQueue, setRecommendationQueue] = useState<OpportunityThreadTaskRecommendation[]>([])
  const [activeRecommendationIndex, setActiveRecommendationIndex] = useState(0)
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false)

  const openThread = useMemo(
    () => threads.find((thread) => thread.status === 'OPEN') || null,
    [threads]
  )

  const canResolveOpenThread = canEdit && !!openThread && openThread.commentCount > 0

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
    if (!openThread || openThread.commentCount === 0) return

    setResolveDialogOpen(true)
  }, [openThread])

  const handleResolveThread = useCallback(async () => {
    if (!openThread || openThread.commentCount === 0 || resolvingThread) return

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

      if (canEdit && onApplyTaskRecommendation) {
        setRecommendationDialogOpen(false)
        setRecommendationQueue([])
        setActiveRecommendationIndex(0)
        setFetchingRecommendations(true)

        try {
          const recommendationResult = await getOpportunityThreadTaskRecommendations(result.data.id)
          if (recommendationResult.success) {
            const recommendations = recommendationResult.data || []
            if (recommendations.length > 0) {
              setRecommendationQueue(recommendations)
              setActiveRecommendationIndex(0)
              setRecommendationDialogOpen(true)
            }
          } else {
            toast.error(recommendationResult.error || 'No se pudieron generar recomendaciones de tareas')
          }
        } catch {
          toast.error('No se pudieron generar recomendaciones de tareas')
        } finally {
          setFetchingRecommendations(false)
        }
      }
    } catch {
      toast.error('Error al resolver el item')
    } finally {
      setResolvingThread(false)
    }
  }, [canEdit, loadThreads, onApplyTaskRecommendation, openThread, resolvingThread])

  const handleOpenThreadCommentsChange = useCallback((comments: ChatComment[]) => {
    if (!openThread) return

    const nextCommentCount = comments.length
    const nextLastCommentAt = comments.length > 0 ? comments[comments.length - 1].createdAt : null

    setThreads((previousThreads) => {
      let changed = false

      const nextThreads = previousThreads.map((thread) => {
        if (thread.id !== openThread.id) return thread

        const sameCommentCount = thread.commentCount === nextCommentCount
        const sameLastCommentAt =
          (thread.lastCommentAt?.getTime() ?? null) === (nextLastCommentAt?.getTime() ?? null)

        if (sameCommentCount && sameLastCommentAt) {
          return thread
        }

        changed = true
        return {
          ...thread,
          commentCount: nextCommentCount,
          lastCommentAt: nextLastCommentAt,
        }
      })

      return changed ? nextThreads : previousThreads
    })
  }, [openThread])

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

  const activeRecommendation = recommendationQueue[activeRecommendationIndex] || null

  const closeRecommendationDialog = useCallback(() => {
    setRecommendationDialogOpen(false)
    setRecommendationQueue([])
    setActiveRecommendationIndex(0)
  }, [])

  const handleAcceptRecommendation = useCallback(() => {
    if (!activeRecommendation || !onApplyTaskRecommendation) {
      closeRecommendationDialog()
      return
    }

    onApplyTaskRecommendation(activeRecommendation)
    toast.success('Sugerencia cargada en nueva tarea')

    const nextIndex = activeRecommendationIndex + 1
    if (nextIndex >= recommendationQueue.length) {
      closeRecommendationDialog()
      return
    }

    setActiveRecommendationIndex(nextIndex)
  }, [
    activeRecommendation,
    activeRecommendationIndex,
    closeRecommendationDialog,
    onApplyTaskRecommendation,
    recommendationQueue.length,
  ])

  const handleSkipRecommendation = useCallback(() => {
    const nextIndex = activeRecommendationIndex + 1
    if (nextIndex >= recommendationQueue.length) {
      closeRecommendationDialog()
      return
    }

    setActiveRecommendationIndex(nextIndex)
  }, [activeRecommendationIndex, closeRecommendationDialog, recommendationQueue.length])

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
          canResolveOpenThread ? (
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
        onCommentsChange={handleOpenThreadCommentsChange}
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

      <ConfirmDialog
        isOpen={fetchingRecommendations}
        title="Generando recomendaciones"
        message={
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-700">
              AI está analizando la resolución para sugerir tareas de seguimiento.
            </p>
            <div className="flex justify-center">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          </div>
        }
        confirmText=""
        cancelText=""
        confirmVariant="primary"
        loading={true}
        onConfirm={() => {}}
        onCancel={() => {}}
      />

      <ConfirmDialog
        isOpen={recommendationDialogOpen && !!activeRecommendation}
        title="Recomendación de nueva tarea"
        message={
          activeRecommendation ? (
            <div className="space-y-3 text-left">
              <p className="text-sm text-gray-700">
                AI recomienda abrir esta tarea de seguimiento.
              </p>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-800">{activeRecommendation.title}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Tipo: {activeRecommendation.category === 'meeting' ? 'Reunión' : 'Tarea'}
                  {activeRecommendation.dueDate ? ` • Fecha sugerida: ${activeRecommendation.dueDate}` : ''}
                </p>
                {activeRecommendation.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">{activeRecommendation.notes}</p>
                )}
                {activeRecommendation.reason && (
                  <p className="mt-2 text-xs text-gray-700">Motivo: {activeRecommendation.reason}</p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Sugerencia {activeRecommendationIndex + 1} de {recommendationQueue.length}
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText="Sí, abrir tarea"
        cancelText={activeRecommendationIndex + 1 < recommendationQueue.length ? 'Omitir' : 'Cerrar'}
        confirmVariant="primary"
        onConfirm={handleAcceptRecommendation}
        onCancel={handleSkipRecommendation}
      />

      {loadingThreads && (
        <p className="text-xs text-gray-400">Cargando chats...</p>
      )}
    </div>
  )
}
