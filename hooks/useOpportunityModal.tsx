'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Category } from '@prisma/client'
import { getOpportunity } from '@/app/actions/opportunities'
import type { Opportunity, UserData } from '@/types'
import toast from 'react-hot-toast'

const OpportunityFormModal = dynamic(() => import('@/components/crm/opportunity/OpportunityFormModal'), {
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>,
  ssr: false,
})

export type OpportunityModalTab = 'details' | 'activity' | 'chat'

interface OpportunityOpenState {
  opportunityId: string
  tab: OpportunityModalTab
  threadId: string | null
}

interface UseOpportunityModalOptions {
  onModalClose?: () => void
  onModalSuccess?: (opportunity: Opportunity) => void
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
}

export function parseOpportunityOpenState(linkUrl: string): OpportunityOpenState | null {
  const [pathname, queryString = ''] = linkUrl.split('?')
  if (pathname !== '/opportunities') return null

  const params = new URLSearchParams(queryString)
  const opportunityId = params.get('open')
  if (!opportunityId) return null

  const tabParam = params.get('tab')
  const tab: OpportunityModalTab =
    tabParam === 'chat' || tabParam === 'activity' || tabParam === 'details'
      ? tabParam
      : 'details'

  return {
    opportunityId,
    tab,
    threadId: params.get('thread'),
  }
}

export function useOpportunityModal(options: UseOpportunityModalOptions = {}) {
  const {
    onModalClose,
    onModalSuccess,
    preloadedCategories,
    preloadedUsers,
  } = options

  const [isOpen, setIsOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [initialTab, setInitialTab] = useState<OpportunityModalTab>('details')
  const [initialChatThreadId, setInitialChatThreadId] = useState<string | null>(null)

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setSelectedOpportunity(null)
    setInitialTab('details')
    setInitialChatThreadId(null)
    onModalClose?.()
  }, [onModalClose])

  const openById = useCallback(async (
    opportunityId: string,
    openOptions?: {
      tab?: OpportunityModalTab
      threadId?: string | null
    }
  ): Promise<boolean> => {
    try {
      const result = await getOpportunity(opportunityId)
      if (!result.success || !result.data) {
        toast.error(result.error || 'No se pudo cargar la oportunidad')
        return false
      }

      setSelectedOpportunity(result.data)
      setInitialTab(openOptions?.tab || 'details')
      setInitialChatThreadId(openOptions?.threadId ?? null)
      setIsOpen(true)
      return true
    } catch {
      toast.error('No se pudo cargar la oportunidad')
      return false
    }
  }, [])

  const openFromLink = useCallback(async (linkUrl: string): Promise<boolean> => {
    const openState = parseOpportunityOpenState(linkUrl)
    if (!openState) return false

    return openById(openState.opportunityId, {
      tab: openState.tab,
      threadId: openState.threadId,
    })
  }, [openById])

  const modalNode = useMemo(() => {
    if (!isOpen || !selectedOpportunity) return null

    return (
      <OpportunityFormModal
        isOpen={isOpen}
        onClose={closeModal}
        opportunity={selectedOpportunity}
        onSuccess={(updatedOpportunity) => {
          setSelectedOpportunity(updatedOpportunity)
          onModalSuccess?.(updatedOpportunity)
        }}
        initialTab={initialTab}
        initialChatThreadId={initialChatThreadId}
        preloadedCategories={preloadedCategories}
        preloadedUsers={preloadedUsers}
      />
    )
  }, [
    closeModal,
    initialChatThreadId,
    initialTab,
    isOpen,
    onModalSuccess,
    preloadedCategories,
    preloadedUsers,
    selectedOpportunity,
  ])

  return {
    isOpen,
    openById,
    openFromLink,
    closeModal,
    modalNode,
  }
}
