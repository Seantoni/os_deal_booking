'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import DescriptionIcon from '@mui/icons-material/Description'
import SearchIcon from '@mui/icons-material/Search'
import {
  addFieldComment,
  cancelBookingRequest,
  deleteFieldComment,
  getBookingRequest,
  getFieldComments,
  getUsersForFieldCommentMention,
  updateFieldComment,
} from '@/app/actions/booking'
import { adminApproveBookingRequest } from '@/app/actions/booking-requests'
import { getDealByBookingRequestId, getDealPublicSlug } from '@/app/actions/deals'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useUserRole } from '@/hooks/useUserRole'
import type { Deal } from '@/types'
import {
  getCommentCountsByField,
  getCommentsForField,
  parseFieldComments,
  type AdditionalInfo,
  type BookingRequestViewData,
  type FieldComment,
  type SectionDefinition,
} from '@/types'
import { BASE_SECTIONS, SECTION_TITLES } from './bookingRequestView.config'
import { BookingAttachmentsField } from './BookingAttachmentsField'
import { AdditionalRedemptionContactsField } from './AdditionalRedemptionContactsField'
import { BookingRequestHeaderActions } from './BookingRequestHeaderActions'
import { BookingRequestHistoryBar } from './BookingRequestHistoryBar'
import { BookingRequestSearchBar } from './BookingRequestSearchBar'
import { BookingRequestSectionCard } from './BookingRequestSectionCard'
import { ContactDetailField } from './ContactDetailField'
import { CommentsSidebar } from './CommentsSidebar'
import { DealImagesGalleryField } from './DealImagesGalleryField'
import { FieldWithComments } from './FieldWithComments'
import { PricingOptionsField } from './PricingOptionsField'
import { useBookingRequestCommentNavigation } from './useBookingRequestCommentNavigation'
import { useRemoteImageDownload } from './useRemoteImageDownload'
import {
  buildAdditionalInfoSection,
  formatBookingRequestFieldValue,
  getBookingRequestFieldHref,
  getFieldContainerId,
  getFieldValue,
  normalizeBookingAttachments,
  persistBookingRequestReplicatePayload,
  remapCommentsToDisplayKeys,
  sanitizeFilenamePart,
} from './bookingRequestView.utils'
import type {
  BookingAttachmentItem,
  CommentReplyPrefill,
} from './types'

const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })
const DealFormModal = dynamic(() => import('@/components/crm/deal/DealFormModal'), { ssr: false })
const MarketingCampaignModal = dynamic(() => import('@/components/marketing/MarketingCampaignModal'), {
  ssr: false,
})

interface BookingRequestViewModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string | null
  hideBackdrop?: boolean
  showReplicateAction?: boolean
}

export default function BookingRequestViewModal({
  isOpen,
  onClose,
  requestId,
  hideBackdrop = false,
  showReplicateAction = false,
}: BookingRequestViewModalProps) {
  useModalEscape(isOpen, onClose)

  const router = useRouter()
  const { isAdmin } = useUserRole()
  const { user } = useUser()
  const userId = user?.id

  const [loading, setLoading] = useState(true)
  const [requestData, setRequestData] = useState<BookingRequestViewData | null>(null)
  const [comments, setComments] = useState<FieldComment[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const [activeCommentField, setActiveCommentField] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [commentInputPrefill, setCommentInputPrefill] = useState<CommentReplyPrefill | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [approving, setApproving] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)
  const [replicating, setReplicating] = useState(false)
  const [internalDealId, setInternalDealId] = useState<string | null>(null)
  const [loadingDealLink, setLoadingDealLink] = useState(false)
  const [publicDealSlug, setPublicDealSlug] = useState<string | null>(null)
  const [loadingPublicDealLink, setLoadingPublicDealLink] = useState(false)
  const [internalDeal, setInternalDeal] = useState<Deal | null>(null)
  const [dealModalOpen, setDealModalOpen] = useState(false)
  const [showEditConfirm, setShowEditConfirm] = useState(false)
  const [editProcessing, setEditProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)

  const imageDownloadPrefix = useMemo(() => {
    const requestBusinessName = requestData?.name ? String(requestData.name).split('|')[0]?.trim() : ''
    const baseLabel = requestBusinessName || requestId || 'booking-request'
    const normalized = sanitizeFilenamePart(baseLabel)
    return normalized || 'booking-request'
  }, [requestData?.name, requestId])

  const bookingAttachments = useMemo((): BookingAttachmentItem[] => {
    const info = requestData?.additionalInfo as AdditionalInfo | null
    if (!info || typeof info !== 'object') return []
    return normalizeBookingAttachments(info.bookingAttachments)
  }, [requestData?.additionalInfo])

  const additionalSection = useMemo(
    () => buildAdditionalInfoSection((requestData?.additionalInfo as AdditionalInfo | null) || null),
    [requestData?.additionalInfo]
  )

  const displayComments = useMemo(
    () => remapCommentsToDisplayKeys(comments, additionalSection?.legacyCommentFieldKeyMap || {}),
    [comments, additionalSection]
  )

  const commentCounts = useMemo(() => getCommentCountsByField(displayComments), [displayComments])

  const hasEventDays = useMemo(() => {
    if (!Array.isArray(requestData?.eventDays)) return false
    return requestData.eventDays.some((date) => typeof date === 'string' && date.trim().length > 0)
  }, [requestData?.eventDays])

  const hideTentativeCampaignDates = requestData?.status === 'approved' || requestData?.status === 'booked'

  const allSections = useMemo((): SectionDefinition[] => {
    const baseSections = BASE_SECTIONS.map((section) => {
      if (section.title !== SECTION_TITLES.CAMPAIGN_DETAILS) return section

      const baseFields = section.fields.filter((field) => {
        if (field.key === 'campaignDuration' || field.key === 'eventDays') return false
        if (hideTentativeCampaignDates && (field.key === 'startDate' || field.key === 'endDate')) {
          return false
        }
        return true
      })

      return {
        ...section,
        fields: [
          ...baseFields,
          hasEventDays
            ? { key: 'eventDays', label: 'Días del Evento', type: 'json' as const }
            : { key: 'campaignDuration', label: 'Duración de la Campaña' },
        ],
      }
    })

    if (!additionalSection?.section) return baseSections

    const additionalInfoIndex = baseSections.findIndex(
      (section) => section.title === SECTION_TITLES.ADDITIONAL_INFO
    )

    if (additionalInfoIndex < 0) {
      return [...baseSections, additionalSection.section]
    }

    return [
      ...baseSections.slice(0, additionalInfoIndex),
      additionalSection.section,
      ...baseSections.slice(additionalInfoIndex),
    ]
  }, [additionalSection, hasEventDays, hideTentativeCampaignDates])

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSections
    }

    const query = searchQuery.toLowerCase()
    return allSections.filter((section) => {
      if (section.title.toLowerCase().includes(query)) {
        return true
      }

      return section.fields.some(
        (field) =>
          field.label.toLowerCase().includes(query) || field.key.toLowerCase().includes(query)
      )
    })
  }, [allSections, searchQuery])

  const fieldLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    allSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (!map.has(field.key)) {
          map.set(field.key, field.label)
        }
      })
    })
    return map
  }, [allSections])

  const {
    highlightedCommentId,
    setHighlightedCommentId,
    scrollToCommentLocation,
    handleReplyToComment,
  } = useBookingRequestCommentNavigation({
    allSections,
    searchQuery,
    setSearchQuery,
    setExpandedSections,
    setActiveCommentField,
    setCommentInputPrefill,
  })

  const downloadImage = useRemoteImageDownload()

  const loadData = useCallback(async () => {
    if (!requestId) return

    setLoading(true)
    setCommentInputPrefill(null)
    setHighlightedCommentId(null)

    try {
      const [requestResult, commentsResult] = await Promise.all([
        getBookingRequest(requestId),
        getFieldComments(requestId),
      ])

      if (requestResult.success && requestResult.data) {
        setRequestData(requestResult.data as BookingRequestViewData)
        const requestComments = parseFieldComments(requestResult.data.fieldComments)
        setComments(commentsResult.success && commentsResult.data ? commentsResult.data : requestComments)
      }

      setExpandedSections(new Set(BASE_SECTIONS.slice(0, 3).map((section) => section.title)))
    } catch {
      toast.error('Error al cargar los datos de la solicitud')
    } finally {
      setLoading(false)
    }
  }, [requestId, setHighlightedCommentId])

  useEffect(() => {
    if (isOpen && requestId) {
      void loadData()
    }
  }, [isOpen, requestId, loadData])

  useEffect(() => {
    if (!requestData?.id) {
      setInternalDealId(null)
      setInternalDeal(null)
      return
    }

    let cancelled = false
    setLoadingDealLink(true)

    void getDealByBookingRequestId(requestData.id)
      .then((result) => {
        if (cancelled) return

        if (result && typeof result === 'object' && 'success' in result && result.success) {
          const dealData = result.data as Deal | null
          setInternalDealId(dealData?.id || null)
          setInternalDeal(dealData || null)
        } else {
          setInternalDealId(null)
          setInternalDeal(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInternalDealId(null)
          setInternalDeal(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDealLink(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestData?.id])

  useEffect(() => {
    if (!requestData?.id) {
      setPublicDealSlug(null)
      return
    }

    let cancelled = false
    setLoadingPublicDealLink(true)

    void getDealPublicSlug(requestData.id)
      .then((result) => {
        if (cancelled) return

        if (result && typeof result === 'object' && 'success' in result && result.success) {
          setPublicDealSlug((result.data as string | null) || null)
        } else {
          setPublicDealSlug(null)
        }
      })
      .catch(() => {
        if (!cancelled) setPublicDealSlug(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingPublicDealLink(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestData?.id])

  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedSections(new Set(filteredSections.map((section) => section.title)))
    }
  }, [filteredSections, searchQuery])

  const openLightbox = (images: string[], initialIndex: number = 0) => {
    setLightboxImages(images)
    setLightboxInitialIndex(initialIndex)
    setLightboxOpen(true)
  }

  const handleToggleComment = useCallback((fieldKey: string | null) => {
    setActiveCommentField(fieldKey)
    setCommentInputPrefill((current) =>
      fieldKey && current?.fieldKey === fieldKey ? current : null
    )
  }, [])

  const toggleSection = (title: string) => {
    setExpandedSections((current) => {
      const next = new Set(current)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  async function handleAddComment(fieldKey: string, text: string, mentions: string[]) {
    if (!requestId || !fieldKey || !text.trim()) return

    setSavingComment(true)
    try {
      const result = await addFieldComment(requestId, fieldKey, text, mentions)
      if (result.success && result.data) {
        setComments((current) => [...current, result.data as FieldComment])
        setActiveCommentField(null)
        setCommentInputPrefill(null)
        toast.success('Comentario agregado')
      } else {
        toast.error(result.error || 'Error al agregar comentario')
      }
    } finally {
      setSavingComment(false)
    }
  }

  async function handleEditComment(commentId: string) {
    if (!requestId || !editCommentText.trim()) return

    setSavingComment(true)
    try {
      const result = await updateFieldComment(requestId, commentId, editCommentText)
      if (result.success && result.data) {
        setComments((current) =>
          current.map((comment) => (comment.id === commentId ? (result.data as FieldComment) : comment))
        )
        setEditingCommentId(null)
        setEditCommentText('')
        toast.success('Comentario actualizado')
      } else {
        toast.error(result.error || 'Error al actualizar comentario')
      }
    } finally {
      setSavingComment(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!requestId) return
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return

    setSavingComment(true)
    try {
      const result = await deleteFieldComment(requestId, commentId)
      if (result.success) {
        setComments((current) => current.filter((comment) => comment.id !== commentId))
        toast.success('Comentario eliminado')
      } else {
        toast.error(result.error || 'Error al eliminar comentario')
      }
    } finally {
      setSavingComment(false)
    }
  }

  function handleEditClick() {
    if (!requestId || !requestData) return
    if (requestData.status === 'draft') {
      onClose()
      router.push(`/booking-requests/new?editId=${requestId}`)
      return
    }
    setShowEditConfirm(true)
  }

  async function handleEditConfirm() {
    if (!requestId || !requestData) return

    setEditProcessing(true)
    const result = await cancelBookingRequest(requestId)

    if (!result.success) {
      toast.error(result.error || 'Error al cancelar la solicitud')
      setEditProcessing(false)
      return
    }

    try {
      const replicateKey = persistBookingRequestReplicatePayload(requestData)
      setShowEditConfirm(false)
      onClose()
      router.push(`/booking-requests/new?replicateKey=${encodeURIComponent(replicateKey)}`)
    } catch (error) {
      console.error('Failed to create editable copy', error)
      toast.error('La solicitud fue cancelada pero no se pudo crear la copia automáticamente.')
    } finally {
      setEditProcessing(false)
    }
  }

  function handleCancelClick() {
    if (!requestId || !requestData) return

    const isCreator = requestData.userId === userId
    if (!isCreator && !isAdmin) {
      toast.error('No tienes permiso para cancelar esta solicitud')
      return
    }

    if (requestData.status !== 'draft' && requestData.status !== 'pending') {
      toast.error('Solo se pueden cancelar solicitudes en estado borrador o pendiente')
      return
    }

    setShowCancelConfirm(true)
  }

  async function handleCancelConfirm() {
    if (!requestId) return

    setCancelling(true)
    const result = await cancelBookingRequest(requestId)

    if (result.success) {
      toast.success('Solicitud cancelada exitosamente')
      setShowCancelConfirm(false)
      onClose()
    } else {
      toast.error(result.error || 'Error al cancelar la solicitud')
    }

    setCancelling(false)
  }

  async function handleAdminApprove() {
    if (!requestId || !requestData) return

    if (!isAdmin) {
      toast.error('Solo los administradores pueden aprobar solicitudes')
      return
    }

    if (requestData.status !== 'pending') {
      toast.error('Solo se pueden aprobar solicitudes en estado pendiente')
      return
    }

    setApproving(true)
    const result = await adminApproveBookingRequest(requestId)

    if (result.success) {
      toast.success('Solicitud aprobada exitosamente. Se enviaron notificaciones por correo.')
      setShowApproveConfirm(false)
      onClose()
    } else {
      toast.error(result.error || 'Error al aprobar la solicitud')
    }

    setApproving(false)
  }

  function handleReplicate() {
    if (!requestData) return

    setReplicating(true)

    window.setTimeout(() => {
      try {
        const replicateKey = persistBookingRequestReplicatePayload(requestData)
        onClose()
        router.push(`/booking-requests/new?replicateKey=${encodeURIComponent(replicateKey)}`)
      } catch (error) {
        console.error('Failed to replicate request', error)
        toast.error('No se pudo replicar la solicitud')
      } finally {
        setReplicating(false)
      }
    }, 0)
  }

  const handleOpenInternalDeal = async () => {
    if (internalDeal) {
      setDealModalOpen(true)
      return
    }

    if (!requestData?.id) return

    setLoadingDealLink(true)
    try {
      const result = await getDealByBookingRequestId(requestData.id)
      if (result && typeof result === 'object' && 'success' in result && result.success) {
        const dealData = result.data as Deal | null
        setInternalDealId(dealData?.id || null)
        setInternalDeal(dealData || null)
        if (dealData) setDealModalOpen(true)
      }
    } finally {
      setLoadingDealLink(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {!hideBackdrop && (
        <div className="fixed inset-0 bg-gray-900/30 z-40 transition-opacity" onClick={onClose} />
      )}

      <div className="fixed inset-0 z-[80] flex items-center justify-center md:p-3 pointer-events-none">
        <div
          className={`w-full max-w-5xl bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-[85vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg border border-blue-200">
                <DescriptionIcon className="text-blue-600" style={{ fontSize: 20 }} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-tight">
                  {(requestData?.name as string) || 'Cargando...'}
                </h2>
              </div>
            </div>

            <BookingRequestHeaderActions
              requestData={requestData}
              userId={userId}
              isAdmin={isAdmin}
              loading={loading}
              approving={approving}
              editProcessing={editProcessing}
              cancelling={cancelling}
              replicating={replicating}
              loadingDealLink={loadingDealLink}
              loadingPublicDealLink={loadingPublicDealLink}
              publicDealSlug={publicDealSlug}
              internalDealId={internalDealId}
              internalDeal={internalDeal}
              showSidebar={showSidebar}
              showReplicateAction={showReplicateAction}
              commentCount={displayComments.length}
              onOpenPublicDeal={() => {
                if (!publicDealSlug) return
                window.open(
                  `https://ofertasimple.com/ofertas/panama/${publicDealSlug}`,
                  '_blank',
                  'noopener,noreferrer'
                )
              }}
              onOpenInternalDeal={handleOpenInternalDeal}
              onApprove={() => setShowApproveConfirm(true)}
              onEdit={handleEditClick}
              onCancel={handleCancelClick}
              onReplicate={handleReplicate}
              onOpenDraftDeal={() => {
                if (requestId) {
                  window.open(`/deals/draft/${requestId}`, '_blank')
                }
              }}
              onOpenMarketing={() => setShowMarketingModal(true)}
              onToggleSidebar={() => setShowSidebar((current) => !current)}
              onClose={onClose}
            />
          </div>

          {!loading && requestData && <BookingRequestHistoryBar requestData={requestData} />}

          <BookingRequestSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            filteredCount={filteredSections.length}
            totalCount={allSections.length}
          />

          <div className="flex-1 overflow-hidden flex bg-slate-50">
            <div className={`flex-1 overflow-y-auto p-6 md:p-8 ${showSidebar ? 'pr-6' : ''}`}>
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse shadow-sm"
                    >
                      <div className="h-5 bg-slate-200 rounded w-1/4 mb-6"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                        <div className="space-y-3">
                          <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSections.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <SearchIcon className="text-slate-400" style={{ fontSize: 32 }} />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No se encontraron coincidencias</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Ningún campo coincide con &quot;{searchQuery}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredSections.map((section) => {
                    const isExpanded = expandedSections.has(section.title)
                    const sectionCommentCount = section.fields.reduce(
                      (total, field) => total + (commentCounts[field.key] || 0),
                      0
                    )

                    return (
                      <BookingRequestSectionCard
                        key={section.title}
                        title={section.title}
                        isExpanded={isExpanded}
                        commentCount={sectionCommentCount}
                        onToggle={() => toggleSection(section.title)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          {section.fields.map((field) => {
                            const rawValue =
                              field.key === 'bookingAttachments'
                                ? bookingAttachments
                                : (additionalSection?.values && additionalSection.values[field.key]) ??
                                  getFieldValue(requestData, field.key)
                            const formattedValue = formatBookingRequestFieldValue(
                              rawValue,
                              field.type,
                              field.key,
                              requestData?.campaignDurationUnit || null
                            )
                            const fieldHref = getBookingRequestFieldHref(rawValue, field.key)
                            const contactCardValue =
                              field.type === 'contact'
                                ? [
                                    getFieldValue(requestData, 'redemptionContactName'),
                                    getFieldValue(requestData, 'redemptionContactEmail'),
                                    getFieldValue(requestData, 'redemptionContactPhone'),
                                  ].find((value) => Boolean(String(value || '').trim()))
                                : null

                            if (
                              field.key === 'redemptionContactEmail' ||
                              field.key === 'redemptionContactPhone'
                            ) {
                              return null
                            }

                            const isFieldMatch =
                              !!searchQuery &&
                              (field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                field.key.toLowerCase().includes(searchQuery.toLowerCase()))

                            const fieldComments =
                              field.key === 'redemptionContactName'
                                ? [
                                    ...getCommentsForField(displayComments, 'redemptionContactName'),
                                    ...getCommentsForField(displayComments, 'redemptionContactEmail'),
                                    ...getCommentsForField(displayComments, 'redemptionContactPhone'),
                                  ]
                                : getCommentsForField(displayComments, field.key)
                            const fieldPrefill =
                              field.key === 'redemptionContactName'
                                ? (
                                    commentInputPrefill &&
                                    [
                                      'redemptionContactName',
                                      'redemptionContactEmail',
                                      'redemptionContactPhone',
                                    ].includes(commentInputPrefill.fieldKey)
                                  )
                                  ? {
                                      ...commentInputPrefill,
                                      fieldKey: 'redemptionContactName',
                                    }
                                  : null
                                : commentInputPrefill?.fieldKey === field.key
                                  ? commentInputPrefill
                                  : null

                            if (
                              (field.type === 'gallery' ||
                                field.type === 'pricing' ||
                                field.type === 'attachments' ||
                                field.type === 'contact' ||
                                field.type === 'contacts') &&
                              (
                                field.type === 'contact'
                                  ? !contactCardValue
                                  : !rawValue || (Array.isArray(rawValue) && rawValue.length === 0)
                              )
                            ) {
                              return null
                            }

                            if (field.type === 'contact' && typeof rawValue !== 'undefined') {
                              return (
                                <div key={field.key} className="md:col-span-2">
                                  <ContactDetailField
                                    fieldKey={field.key}
                                    containerId={getFieldContainerId(field.key)}
                                    label={field.label}
                                    contact={{
                                      name: String(getFieldValue(requestData, 'redemptionContactName') || ''),
                                      email: String(getFieldValue(requestData, 'redemptionContactEmail') || ''),
                                      phone: String(getFieldValue(requestData, 'redemptionContactPhone') || ''),
                                    }}
                                    badgeLabel="Principal"
                                    comments={fieldComments}
                                    highlightedCommentId={highlightedCommentId}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    commentInputPrefill={fieldPrefill}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    onReplyToComment={handleReplyToComment}
                                    getUsersAction={getUsersForFieldCommentMention}
                                  />
                                </div>
                              )
                            }

                            if (field.type === 'pricing' && Array.isArray(rawValue) && rawValue.length > 0) {
                              return (
                                <div key={field.key} className="md:col-span-2">
                                  <PricingOptionsField
                                    fieldKey={field.key}
                                    label={field.label}
                                    options={
                                      rawValue as Array<{
                                        title?: string
                                        description?: string
                                        price?: string | number
                                        realValue?: string | number
                                        quantity?: string | number
                                        imageUrl?: string
                                        limitByUser?: string | number
                                        maxGiftsPerUser?: string | number
                                        endAt?: string
                                        expiresIn?: string | number
                                      }>
                                    }
                                    comments={fieldComments}
                                    containerId={getFieldContainerId(field.key)}
                                    highlightedCommentId={highlightedCommentId}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    commentInputPrefill={fieldPrefill}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    onReplyToComment={handleReplyToComment}
                                    getUsersAction={getUsersForFieldCommentMention}
                                    openLightbox={openLightbox}
                                    onDownloadImage={downloadImage}
                                    imageDownloadPrefix={imageDownloadPrefix}
                                  />
                                </div>
                              )
                            }

                            if (field.type === 'gallery' && Array.isArray(rawValue) && rawValue.length > 0) {
                              return (
                                <div key={field.key} className="md:col-span-2">
                                  <DealImagesGalleryField
                                    fieldKey={field.key}
                                    label={field.label}
                                    images={rawValue as Array<{ url: string; order: number }>}
                                    comments={fieldComments}
                                    containerId={getFieldContainerId(field.key)}
                                    highlightedCommentId={highlightedCommentId}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    commentInputPrefill={fieldPrefill}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    onReplyToComment={handleReplyToComment}
                                    getUsersAction={getUsersForFieldCommentMention}
                                    openLightbox={openLightbox}
                                    onDownloadImage={downloadImage}
                                    imageDownloadPrefix={imageDownloadPrefix}
                                  />
                                </div>
                              )
                            }

                            if (
                              field.type === 'contacts' &&
                              Array.isArray(rawValue) &&
                              rawValue.length > 0
                            ) {
                              return (
                                <div key={field.key} className="md:col-span-2">
                                  <AdditionalRedemptionContactsField
                                    fieldKey={field.key}
                                    label={field.label}
                                    contacts={rawValue}
                                    comments={fieldComments}
                                    containerId={getFieldContainerId(field.key)}
                                    highlightedCommentId={highlightedCommentId}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    commentInputPrefill={fieldPrefill}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    onReplyToComment={handleReplyToComment}
                                    getUsersAction={getUsersForFieldCommentMention}
                                  />
                                </div>
                              )
                            }

                            if (
                              field.type === 'attachments' &&
                              Array.isArray(rawValue) &&
                              rawValue.length > 0
                            ) {
                              return (
                                <div key={field.key} className="md:col-span-2">
                                  <BookingAttachmentsField
                                    fieldKey={field.key}
                                    label={field.label}
                                    attachments={rawValue as BookingAttachmentItem[]}
                                    comments={fieldComments}
                                    containerId={getFieldContainerId(field.key)}
                                    highlightedCommentId={highlightedCommentId}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    commentInputPrefill={fieldPrefill}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    onReplyToComment={handleReplyToComment}
                                    getUsersAction={getUsersForFieldCommentMention}
                                    openLightbox={openLightbox}
                                  />
                                </div>
                              )
                            }

                            return (
                              <FieldWithComments
                                key={field.key}
                                fieldKey={field.key}
                                containerId={getFieldContainerId(field.key)}
                                label={field.label}
                                value={formattedValue}
                                href={fieldHref}
                                comments={fieldComments}
                                isHighlighted={isFieldMatch}
                                highlightedCommentId={highlightedCommentId}
                                activeCommentField={activeCommentField}
                                savingComment={savingComment}
                                commentInputPrefill={fieldPrefill}
                                onToggleComment={handleToggleComment}
                                onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                onReplyToComment={handleReplyToComment}
                                getUsersAction={getUsersForFieldCommentMention}
                              />
                            )
                          })}
                        </div>
                      </BookingRequestSectionCard>
                    )
                  })}
                </div>
              )}
            </div>

            {showSidebar && (
                <CommentsSidebar
                  comments={displayComments}
                  userId={userId}
                  isAdmin={isAdmin}
                  editingCommentId={editingCommentId}
                  editCommentText={editCommentText}
                  savingComment={savingComment}
                  fieldLabelMap={fieldLabelMap}
                  onCommentClick={scrollToCommentLocation}
                  onStartEdit={(comment) => {
                    setEditingCommentId(comment.id)
                    setEditCommentText(comment.text)
                  }}
                  onDeleteComment={handleDeleteComment}
                  onEditCommentTextChange={setEditCommentText}
                  onCancelEdit={() => {
                    setEditingCommentId(null)
                    setEditCommentText('')
                  }}
                  onSaveEdit={handleEditComment}
                />
            )}
          </div>
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDownloadImage={(url, index) => downloadImage(url, `${imageDownloadPrefix}-image-${index + 1}`)}
      />

      {dealModalOpen && internalDeal && (
        <DealFormModal
          isOpen={dealModalOpen}
          onClose={() => setDealModalOpen(false)}
          deal={internalDeal}
          onSuccess={async () => {
            setDealModalOpen(false)
            if (requestData?.id) {
              const result = await getDealByBookingRequestId(requestData.id)
              if (result && typeof result === 'object' && 'success' in result && result.success) {
                const dealData = result.data as Deal | null
                setInternalDealId(dealData?.id || null)
                setInternalDeal(dealData || null)
              }
            }
          }}
          hideBackdrop={true}
          containerClassName="z-[90]"
        />
      )}

      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="¿Aprobar esta solicitud?"
        message={
          <div className="space-y-3">
            <p className="text-gray-600">Estás a punto de aprobar la solicitud:</p>
            <p className="text-gray-900 font-semibold px-4 py-2 bg-gray-50 rounded-lg">
              {requestData?.name}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">Al aprobar:</p>
              <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-0.5">
                <li>El estado cambiará a &quot;Aprobado&quot;</li>
                <li>Se enviará notificación al negocio</li>
                <li>Se enviará notificación al creador</li>
                <li>La solicitud quedará lista para programar</li>
              </ul>
            </div>
          </div>
        }
        confirmText="Sí, Aprobar"
        cancelText="No, Volver"
        confirmVariant="success"
        onConfirm={handleAdminApprove}
        onCancel={() => setShowApproveConfirm(false)}
        loading={approving}
        loadingText="Aprobando..."
        zIndex={90}
      />

      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="¿Cancelar esta solicitud?"
        message={
          <div className="space-y-3">
            <p className="text-gray-600">Estás a punto de cancelar la solicitud:</p>
            <p className="text-gray-900 font-semibold px-4 py-2 bg-gray-50 rounded-lg">
              {requestData?.name}
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 font-medium">⚠️ Esta acción no se puede deshacer</p>
              <p className="mt-1 text-sm text-amber-700">
                La solicitud será marcada como cancelada y no podrá ser procesada.
              </p>
            </div>
          </div>
        }
        confirmText="Sí, Cancelar"
        cancelText="No, Volver"
        confirmVariant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelConfirm(false)}
        loading={cancelling}
        loadingText="Cancelando..."
        zIndex={90}
      />

      <ConfirmDialog
        isOpen={showEditConfirm}
        title="Editar solicitud"
        message={
          <div className="space-y-3">
            <p className="text-gray-600">
              Para editar esta solicitud se cancelará la actual y se creará una nueva con los
              mismos datos.
            </p>
            <p className="text-gray-900 font-semibold px-4 py-2 bg-gray-50 rounded-lg">
              {requestData?.name}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium">Al proceder:</p>
              <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-0.5">
                <li>La solicitud actual será cancelada</li>
                <li>Se creará una nueva solicitud con los mismos datos</li>
                <li>Podrás editarla antes de enviarla</li>
              </ul>
            </div>
          </div>
        }
        confirmText="Proceder"
        cancelText="Volver"
        confirmVariant="primary"
        onConfirm={handleEditConfirm}
        onCancel={() => setShowEditConfirm(false)}
        loading={editProcessing}
        loadingText="Procesando..."
        zIndex={90}
      />

      {requestData?.marketingCampaignId && (
        <MarketingCampaignModal
          isOpen={showMarketingModal}
          onClose={() => setShowMarketingModal(false)}
          campaignId={requestData.marketingCampaignId}
          onSuccess={() => undefined}
        />
      )}
    </>
  )
}
