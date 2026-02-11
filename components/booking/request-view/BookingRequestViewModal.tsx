'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getBookingRequest, getFieldComments, addFieldComment, updateFieldComment, deleteFieldComment, cancelBookingRequest, getUsersForFieldCommentMention } from '@/app/actions/booking'
import { getDealByBookingRequestId, getDealPublicSlug } from '@/app/actions/deals'
import type { Deal } from '@/types'
import { 
  parseFieldComments, 
  getCommentsForField, 
  getCommentCountsByField, 
  type FieldComment,
  type BookingRequestViewData,
  type SectionDefinition,
  type FieldDefinition,
  type AdditionalInfo,
} from '@/types'
import { useUserRole } from '@/hooks/useUserRole'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useUser } from '@clerk/nextjs'
import { FIELD_TEMPLATES } from '@/components/RequestForm/config/field-templates'
import { FieldWithComments } from './FieldWithComments'
import toast from 'react-hot-toast'

// Icons
import Image from 'next/image'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CommentIcon from '@mui/icons-material/Comment'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HistoryIcon from '@mui/icons-material/History'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EditNoteIcon from '@mui/icons-material/EditNote'
import BlockIcon from '@mui/icons-material/Block'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CampaignIcon from '@mui/icons-material/Campaign'
import ListAltIcon from '@mui/icons-material/ListAlt'
import AddCommentIcon from '@mui/icons-material/AddComment'
import MentionInput from '@/components/marketing/MentionInput'
import ImageLightbox from '@/components/common/ImageLightbox'
import DealFormModal from '@/components/crm/deal/DealFormModal'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import MarketingCampaignModal from '@/components/marketing/MarketingCampaignModal'
import { adminApproveBookingRequest } from '@/app/actions/booking-requests'
import { formatShortDate } from '@/lib/date'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import type { BookingFormData } from '@/components/RequestForm/types'

// Helper to get field value from requestData using dynamic key access
function getFieldValue(data: BookingRequestViewData | null, key: string): unknown {
  if (!data) return undefined
  return (data as unknown as Record<string, unknown>)[key]
}

// Field sections configuration (base)
const BASE_SECTIONS: SectionDefinition[] = [
  {
    title: 'Información General',
    fields: [
      { key: 'name', label: 'Nombre del Negocio' },
      { key: 'businessEmail', label: 'Email del Negocio' },
      { key: 'parentCategory', label: 'Categoría' },
      { key: 'subCategory1', label: 'Subcategoría 1' },
      { key: 'subCategory2', label: 'Subcategoría 2' },
      { key: 'subCategory3', label: 'Subcategoría 3' },
      { key: 'merchant', label: 'Merchant/Aliado' },
    ],
  },
  {
    title: 'Detalles de la Campaña',
    fields: [
      { key: 'startDate', label: 'Fecha de Inicio', type: 'date' },
      { key: 'endDate', label: 'Fecha de Fin', type: 'date' },
      { key: 'campaignDuration', label: 'Duración de la Campaña' },
    ],
  },
  {
    title: 'Operaciones y Pagos',
    fields: [
      { key: 'redemptionMode', label: 'Modalidad de Canje' },
      { key: 'isRecurring', label: 'Es Recurrente' },
      { key: 'recurringOfferLink', label: 'Enlace de Oferta Recurrente' },
      { key: 'paymentType', label: 'Tipo de Pago' },
      { key: 'paymentInstructions', label: 'Instrucciones de Pago' },
    ],
  },
  {
    title: 'Directorio de Contactos',
    fields: [
      { key: 'redemptionContactName', label: 'Nombre del Contacto de Canje' },
      { key: 'redemptionContactEmail', label: 'Email del Contacto de Canje' },
      { key: 'redemptionContactPhone', label: 'Teléfono del Contacto de Canje' },
    ],
  },
  {
    title: 'Información Fiscal y Bancaria',
    fields: [
      { key: 'legalName', label: 'Razón Social' },
      { key: 'rucDv', label: 'RUC y DV' },
      { key: 'bankAccountName', label: 'Nombre en Cuenta Bancaria' },
      { key: 'bank', label: 'Banco' },
      { key: 'accountNumber', label: 'Número de Cuenta' },
      { key: 'accountType', label: 'Tipo de Cuenta' },
    ],
  },
  {
    title: 'Ubicación',
    fields: [
      { key: 'addressAndHours', label: 'Dirección y Horario' },
      { key: 'provinceDistrictCorregimiento', label: 'Provincia, Distrito, Corregimiento' },
    ],
  },
  {
    title: 'Reglas de Negocio y Restricciones',
    fields: [
      { key: 'includesTaxes', label: 'Incluye Impuestos' },
      { key: 'validOnHolidays', label: 'Válido en Feriados' },
      { key: 'hasExclusivity', label: 'Tiene Exclusividad' },
      { key: 'exclusivityCondition', label: 'Condición de Exclusividad' },
      { key: 'blackoutDates', label: 'Fechas Blackout' },
      { key: 'hasOtherBranches', label: 'Tiene Otras Sucursales' },
    ],
  },
  {
    title: 'Descripción y Canales de Venta',
    fields: [
      { key: 'redemptionMethods', label: 'Métodos de Canje', type: 'json' },
      { key: 'contactDetails', label: 'Detalles de Contacto' },
      { key: 'socialMedia', label: 'Redes Sociales' },
    ],
  },
  {
    title: 'Contenido (IA)',
    fields: [
      { key: 'shortTitle', label: 'Título' },
      { key: 'whatWeLike', label: 'Lo que nos gusta' },
      { key: 'aboutOffer', label: 'Acerca de esta oferta' },
      { key: 'goodToKnow', label: 'Lo que conviene saber' },
    ],
  },
  {
    title: 'Opciones de Precio',
    fields: [
      { key: 'offerMargin', label: 'Comisión OfertaSimple (%)' },
      { key: 'pricingOptions', label: 'Opciones de Precio', type: 'pricing' },
      { key: 'dealImages', label: 'Galería de Imágenes', type: 'gallery' },
    ],
  },
  {
    title: 'Políticas Generales',
    fields: [
      { key: 'cancellationPolicy', label: 'Política de Cancelación' },
      { key: 'marketValidation', label: 'Validación de Mercado' },
      { key: 'additionalComments', label: 'Comentarios Adicionales' },
    ],
  },
  {
    title: 'Estado de la Solicitud',
    fields: [
      { key: 'status', label: 'Estado' },
      { key: 'sourceType', label: 'Tipo de Origen' },
      { key: 'processedAt', label: 'Procesado En', type: 'date' },
      { key: 'processedBy', label: 'Procesado Por' },
      { key: 'rejectionReason', label: 'Razón del Rechazo' },
    ],
  },
]

interface BookingRequestViewModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string | null
  hideBackdrop?: boolean // Hide backdrop when used alongside another modal
}

export default function BookingRequestViewModal({
  isOpen,
  onClose,
  requestId,
  hideBackdrop = false,
}: BookingRequestViewModalProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  const router = useRouter()
  const { isAdmin } = useUserRole()
  const { user } = useUser()
  const userId = user?.id
  const [loading, setLoading] = useState(true)
  const [requestData, setRequestData] = useState<BookingRequestViewData | null>(null)
  const [comments, setComments] = useState<FieldComment[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  // Comment UI state
  const [activeCommentField, setActiveCommentField] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
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
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0)

  const openLightbox = (images: string[], initialIndex: number = 0) => {
    setLightboxImages(images)
    setLightboxInitialIndex(initialIndex)
    setLightboxOpen(true)
  }

  const renderCommentText = useCallback((content: string) => {
    const mentionRegex = /@[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,3}/gu
    const parts: Array<{ text: string; isMention: boolean }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: content.slice(lastIndex, match.index), isMention: false })
      }
      parts.push({ text: match[0], isMention: true })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), isMention: false })
    }

    return parts.map((part, index) =>
      part.isMention ? (
        <span key={index} className="text-blue-600 font-semibold">
          {part.text}
        </span>
      ) : (
        <span key={index}>{part.text}</span>
      )
    )
  }, [])

  const renderFieldCommentControls = (fieldKey: string, label: string) => {
    const fieldComments = getCommentsForField(comments, fieldKey)
    const hasComments = fieldComments.length > 0
    const isAddingComment = activeCommentField === fieldKey

    return (
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1">
          {hasComments && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold ring-1 ring-blue-200">
              {fieldComments.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleComment(isAddingComment ? null : fieldKey)
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isAddingComment
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Add comment"
            aria-label={`Add comment to ${label}`}
          >
            <AddCommentIcon style={{ fontSize: 16 }} />
          </button>
        </div>
      </div>
    )
  }

  const renderInlineComments = (fieldKey: string) => {
    const fieldComments = getCommentsForField(comments, fieldKey)
    const isAddingComment = activeCommentField === fieldKey

    return (
      <>
        {fieldComments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-100/50 space-y-2">
            {fieldComments.slice(0, 2).map((comment) => (
              <div
                key={comment.id}
                className="text-xs text-slate-600 bg-white/50 p-2 rounded border border-slate-100"
              >
                <div className="flex items-start gap-2">
                <CommentIcon style={{ fontSize: 12 }} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">
                    {comment.authorName || comment.authorEmail?.split('@')[0] || 'User'}:
                  </span>
                  <span className="ml-1 line-clamp-2">{renderCommentText(comment.text)}</span>
                </div>
              </div>
            </div>
          ))}
            {fieldComments.length > 2 && (
              <p className="text-[10px] font-medium text-blue-600 pl-1 hover:underline cursor-pointer">
                +{fieldComments.length - 2} more comments
              </p>
            )}
          </div>
        )}

        {isAddingComment && (
          <div className="mt-3 pt-3 border-t border-blue-100 relative z-10">
            <MentionInput
              onSubmit={async (content, mentions) => {
                await handleAddComment(fieldKey, content, mentions)
              }}
              disabled={savingComment}
              showAttachments={false}
              getUsersAction={getUsersForFieldCommentMention}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleComment(null)
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Load request data and comments
  const loadData = useCallback(async () => {
    if (!requestId) return
    
    setLoading(true)
    try {
      const [requestResult, commentsResult] = await Promise.all([
        getBookingRequest(requestId),
        getFieldComments(requestId),
      ])

      if (requestResult.success && requestResult.data) {
        setRequestData(requestResult.data as BookingRequestViewData)
        // Also parse comments from request data if server didn't return them
        const requestComments = parseFieldComments(requestResult.data.fieldComments)
        setComments(commentsResult.success && commentsResult.data ? commentsResult.data : requestComments)
      }

      // Expand first few sections by default (base sections)
      setExpandedSections(new Set(BASE_SECTIONS.slice(0, 3).map(s => s.title)))
    } catch (error) {
      toast.error('Error al cargar los datos de la solicitud')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    if (isOpen && requestId) {
      loadData()
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
    getDealByBookingRequestId(requestData.id)
      .then(result => {
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
    getDealPublicSlug(requestData.id)
      .then(result => {
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

  // Get comment counts by field
  const commentCounts = getCommentCountsByField(comments)

  // Additional Info (dynamic templates)
  const additionalInfo = useMemo((): { templateDisplayName: string; fields: { label: string; value: string }[] } | null => {
    const info = requestData?.additionalInfo as AdditionalInfo | null
    if (!info || typeof info !== 'object') return null
    
    const templateName = info.templateName || info.templateDisplayName || ''
    const template = templateName ? FIELD_TEMPLATES[templateName] : null
    
    // Create a map of field names to labels from the template
    const fieldLabelMap = new Map<string, string>()
    if (template) {
      template.fields.forEach(field => {
        fieldLabelMap.set(field.name, field.label)
      })
    }
    
    // Map fields using labels from template if available, otherwise use field name as fallback
    const fields = Object.entries(info.fields || {}).map(([fieldName, value]) => ({
      label: fieldLabelMap.get(fieldName) || fieldName,
      value: String(value),
    }))
    
    return {
      templateDisplayName: info.templateDisplayName || templateName || '',
      fields,
    }
  }, [requestData])

  // Build dynamic "Información Adicional" section with unique keys for comments
  const additionalSection = useMemo(() => {
    if (!additionalInfo || !additionalInfo.fields?.length) return null
    const slugify = (label: string) =>
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'field'

    const fields = additionalInfo.fields.map((f) => ({
      key: `additional_${slugify(f.label)}`,
      label: f.label,
      fromAdditional: true,
    }))

    const values: Record<string, string> = {}
    fields.forEach((f, idx) => {
      values[f.key] = String(additionalInfo.fields[idx].value ?? '')
    })

    return {
      section: {
        title: 'Información Adicional' + (additionalInfo.templateDisplayName ? ` (${additionalInfo.templateDisplayName})` : ''),
        fields,
      },
      values,
    }
  }, [additionalInfo])

  // Combine base sections with optional additional info section
  // Insert "Información Adicional" after "Pricing Options" section
  const allSections = useMemo((): SectionDefinition[] => {
    if (additionalSection?.section) {
      // Find the index of "Pricing Options" section
      const pricingOptionsIndex = BASE_SECTIONS.findIndex(s => s.title === 'Pricing Options')
      if (pricingOptionsIndex >= 0) {
        // Insert after Pricing Options
        return [
          ...BASE_SECTIONS.slice(0, pricingOptionsIndex + 1),
          additionalSection.section,
          ...BASE_SECTIONS.slice(pricingOptionsIndex + 1),
        ]
      }
      // Fallback: if Pricing Options not found, append at end
      return [...BASE_SECTIONS, additionalSection.section]
    }
    return BASE_SECTIONS
  }, [additionalSection])

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return allSections
    }
    
    const query = searchQuery.toLowerCase()
    return allSections.filter(section => {
      // Check if section title matches
      if (section.title.toLowerCase().includes(query)) {
        return true
      }
      // Check if any field label or key matches
      return section.fields.some(field => 
        field.label.toLowerCase().includes(query) || 
        field.key.toLowerCase().includes(query)
      )
    })
  }, [searchQuery, allSections])

  // Auto-expand all filtered sections when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedSections(new Set(filteredSections.map(s => s.title)))
    }
  }, [searchQuery, filteredSections])

  // Toggle section expansion
  function toggleSection(title: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) {
        next.delete(title)
      } else {
        next.add(title)
      }
      return next
    })
  }

  // Format field value for display
  function formatFieldValue(value: unknown, type?: string): string {
    if (value === null || value === undefined || value === '') {
      return '-'
    }
    if (type === 'date' && (value instanceof Date || typeof value === 'string')) {
      const date = value instanceof Date ? value : new Date(value)
      return date.toLocaleDateString('es-ES', {
        timeZone: PANAMA_TIMEZONE,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    if (type === 'json' && Array.isArray(value)) {
      return value.join(', ')
    }
    if (type === 'pricing' && Array.isArray(value)) {
      return value.map((opt: { title?: string; price?: number }) => 
        `${opt.title || 'Option'}: $${opt.price || 0}`
      ).join(' | ')
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    const str = String(value)
    if (type === 'description') {
      // Strip any legacy additional info blocks from description
      const withoutAdditional = str.split('=== INFORMACIÓN ADICIONAL')[0]?.trim()
      return withoutAdditional || str
    }
    return str
  }

  // Add comment handler
  async function handleAddComment(fieldKey: string, text: string, mentions: string[]) {
    if (!requestId || !fieldKey || !text.trim()) return
    
    setSavingComment(true)
    try {
      const result = await addFieldComment(requestId, fieldKey, text, mentions)
      if (result.success && result.data) {
        setComments(prev => [...prev, result.data!])
        setActiveCommentField(null)
        toast.success('Comentario agregado')
      } else {
        toast.error(result.error || 'Error al agregar comentario')
      }
    } finally {
      setSavingComment(false)
    }
  }

  // Edit comment handler
  async function handleEditComment(commentId: string) {
    if (!requestId || !editCommentText.trim()) return
    
    setSavingComment(true)
    try {
      const result = await updateFieldComment(requestId, commentId, editCommentText)
      if (result.success && result.data) {
        setComments(prev => prev.map(c => c.id === commentId ? result.data! : c))
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

  // Delete comment handler
  async function handleDeleteComment(commentId: string) {
    if (!requestId) return
    
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return
    
    setSavingComment(true)
    try {
      const result = await deleteFieldComment(requestId, commentId)
      if (result.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        toast.success('Comentario eliminado')
      } else {
        toast.error(result.error || 'Error al eliminar comentario')
      }
    } finally {
      setSavingComment(false)
    }
  }

  // Start editing a comment
  function startEditComment(comment: FieldComment) {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.text)
  }

  // Toggle comment field - used by FieldWithComments
  const handleToggleComment = useCallback((fieldKey: string | null) => {
    setActiveCommentField(fieldKey)
  }, [])

  // Continue editing draft request
  function handleContinueEditing() {
    if (!requestId) return
    onClose()
    router.push(`/booking-requests/new?editId=${requestId}`)
  }

  // Cancel request - show confirmation dialog
  function handleCancelClick() {
    if (!requestId || !requestData) return

    // Check permissions: only creator or admin can cancel
    const isCreator = requestData.userId === userId
    if (!isCreator && !isAdmin) {
      toast.error('No tienes permiso para cancelar esta solicitud')
      return
    }

    // Check if request can be cancelled (only draft or pending)
    if (requestData.status !== 'draft' && requestData.status !== 'pending') {
      toast.error('Solo se pueden cancelar solicitudes en estado borrador o pendiente')
      return
    }

    // Show confirmation dialog
    setShowCancelConfirm(true)
  }

  // Execute cancel after confirmation
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

  // Admin approve request
  async function handleAdminApprove() {
    if (!requestId || !requestData) return

    // Check permissions: only admin can approve
    if (!isAdmin) {
      toast.error('Solo los administradores pueden aprobar solicitudes')
      return
    }

    // Check if request can be approved (only pending)
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

  // Replicate request - navigate to form with pre-filled data
  function handleReplicate() {
    if (!requestData) return

    // INP optimization: avoid building huge query strings in the click handler.
    // Store replicate payload in sessionStorage and pass a small key in the URL.
    setReplicating(true)

    // Let the UI update (paint) before doing heavier work.
    setTimeout(() => {
      try {
        const businessName = requestData.name ? String(requestData.name).split(' | ')[0].trim() : ''

        const payload: Partial<BookingFormData> & { linkedBusinessId?: string } = {
          businessName: businessName || '',
          partnerEmail: requestData.businessEmail ? String(requestData.businessEmail) : '',
          additionalEmails: Array.isArray(requestData.additionalEmails) ? (requestData.additionalEmails as string[]) : [],
          category: requestData.category ? String(requestData.category) : '',
          parentCategory: requestData.parentCategory ? String(requestData.parentCategory) : '',
          subCategory1: requestData.subCategory1 ? String(requestData.subCategory1) : '',
          subCategory2: requestData.subCategory2 ? String(requestData.subCategory2) : '',
          subCategory3: requestData.subCategory3 ? String(requestData.subCategory3) : '',
          campaignDuration: requestData.campaignDuration ? String(requestData.campaignDuration) : '',
          campaignDurationUnit: (requestData.campaignDurationUnit as 'days' | 'months') || 'months',
          // Pass businessId for backfill tracking (standardized approach)
          linkedBusinessId: requestData.linkedBusiness?.id || undefined,

          redemptionMode: requestData.redemptionMode ? String(requestData.redemptionMode) : undefined,
          isRecurring: requestData.isRecurring ? String(requestData.isRecurring) : undefined,
          recurringOfferLink: requestData.recurringOfferLink ? String(requestData.recurringOfferLink) : undefined,
          paymentType: requestData.paymentType ? String(requestData.paymentType) : undefined,
          paymentInstructions: requestData.paymentInstructions ? String(requestData.paymentInstructions) : undefined,

          redemptionContactName: requestData.redemptionContactName ? String(requestData.redemptionContactName) : undefined,
          redemptionContactEmail: requestData.redemptionContactEmail ? String(requestData.redemptionContactEmail) : undefined,
          redemptionContactPhone: requestData.redemptionContactPhone ? String(requestData.redemptionContactPhone) : undefined,

          legalName: requestData.legalName ? String(requestData.legalName) : undefined,
          rucDv: requestData.rucDv ? String(requestData.rucDv) : undefined,
          bankAccountName: requestData.bankAccountName ? String(requestData.bankAccountName) : undefined,
          bank: requestData.bank ? String(requestData.bank) : undefined,
          accountNumber: requestData.accountNumber ? String(requestData.accountNumber) : undefined,
          accountType: requestData.accountType ? String(requestData.accountType) : undefined,
          addressAndHours: requestData.addressAndHours ? String(requestData.addressAndHours) : undefined,
          provinceDistrictCorregimiento: requestData.provinceDistrictCorregimiento ? String(requestData.provinceDistrictCorregimiento) : undefined,

          includesTaxes: requestData.includesTaxes ? String(requestData.includesTaxes) : undefined,
          validOnHolidays: requestData.validOnHolidays ? String(requestData.validOnHolidays) : undefined,
          hasExclusivity: requestData.hasExclusivity ? String(requestData.hasExclusivity) : undefined,
          blackoutDates: requestData.blackoutDates ? String(requestData.blackoutDates) : undefined,
          exclusivityCondition: requestData.exclusivityCondition ? String(requestData.exclusivityCondition) : undefined,
          hasOtherBranches: requestData.hasOtherBranches ? String(requestData.hasOtherBranches) : undefined,

          redemptionMethods: Array.isArray(requestData.redemptionMethods) ? requestData.redemptionMethods : undefined,
          contactDetails: requestData.contactDetails ? String(requestData.contactDetails) : undefined,
          socialMedia: requestData.socialMedia ? String(requestData.socialMedia) : undefined,

          shortTitle: requestData.shortTitle ? String(requestData.shortTitle) : undefined,
          whatWeLike: requestData.whatWeLike ? String(requestData.whatWeLike) : undefined,
          aboutCompany: requestData.aboutCompany ? String(requestData.aboutCompany) : undefined,
          aboutOffer: requestData.aboutOffer ? String(requestData.aboutOffer) : undefined,
          goodToKnow: requestData.goodToKnow ? String(requestData.goodToKnow) : undefined,

          offerMargin: requestData.offerMargin ? String(requestData.offerMargin) : undefined,
          pricingOptions: Array.isArray(requestData.pricingOptions) 
            ? requestData.pricingOptions.map(opt => ({
                title: opt.title,
                description: opt.description ?? '',
                price: String(opt.price ?? ''),
                realValue: String(opt.realValue ?? ''),
                quantity: String(opt.quantity ?? ''),
              }))
            : undefined,
          dealImages: Array.isArray(requestData.dealImages) ? requestData.dealImages : undefined,

          cancellationPolicy: requestData.cancellationPolicy ? String(requestData.cancellationPolicy) : undefined,
          marketValidation: requestData.marketValidation ? String(requestData.marketValidation) : undefined,
          additionalComments: requestData.additionalComments ? String(requestData.additionalComments) : undefined,
        }

        // Keep additionalInfo in query string? It's often large; keep in sessionStorage too via payload? (we don't have a field for it in BookingFormData)
        // We store it separately and let EnhancedBookingForm legacy parser handle if needed later.
        const additionalInfo = requestData.additionalInfo && typeof requestData.additionalInfo === 'object'
          ? requestData.additionalInfo
          : null

        const replicateKey = `${Date.now()}_${Math.random().toString(16).slice(2)}`
        sessionStorage.setItem(`replicate:${replicateKey}`, JSON.stringify(payload))
        if (additionalInfo) {
          sessionStorage.setItem(`replicate:${replicateKey}:additionalInfo`, JSON.stringify(additionalInfo))
        }

        onClose()
        router.push(`/booking-requests/new?replicateKey=${encodeURIComponent(replicateKey)}`)
      } catch (e) {
        console.error('Failed to replicate request', e)
        toast.error('No se pudo replicar la solicitud')
      } finally {
        setReplicating(false)
      }
    }, 0)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop - hidden when used alongside another modal */}
      {!hideBackdrop && (
        <div
          className="fixed inset-0 bg-gray-900/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Modal Container */}
      {/* Mobile: full screen, Desktop: centered with padding */}
      {/* z-[80] to appear above ModalShell (z-[70]) when opened from EventModal */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center md:p-3 pointer-events-none">
        {/* Modal Panel */}
        {/* Mobile: full height, no rounded. Desktop: 85vh max, rounded */}
        <div className={`w-full max-w-5xl bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-[85vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header */}
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
            <div className="flex items-center gap-1.5">
              {publicDealSlug && (
                <button
                  onClick={() => window.open(`https://ofertasimple.com/ofertas/panama/${publicDealSlug}`, '_blank', 'noopener,noreferrer')}
                  disabled={loading || loadingPublicDealLink}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ver Deal Externo"
                >
                  <VisibilityIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {internalDealId && (
                <button
                  onClick={async () => {
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
                  }}
                  disabled={loading || loadingDealLink}
                  className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ver Deal Interno"
                >
                  <ListAltIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Admin Approve Button - Only for pending status, admin only */}
              {requestData?.status === 'pending' && isAdmin && (
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={loading || approving}
                  className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Aprobar solicitud"
                >
                  <CheckCircleOutlineIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Continue Editing Button - Only for drafts */}
              {requestData?.status === 'draft' && (
                <button
                  onClick={handleContinueEditing}
                  disabled={loading}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Editar borrador"
                >
                  <EditNoteIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Cancel Button - Only for draft/pending, creator or admin */}
              {(requestData?.status === 'draft' || requestData?.status === 'pending') && 
               (requestData?.userId === userId || isAdmin) && (
                <button
                  onClick={handleCancelClick}
                  disabled={loading || cancelling}
                  className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={cancelling ? 'Cancelando...' : 'Cancelar solicitud'}
                >
                  <BlockIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Divider */}
              <div className="w-px h-6 bg-slate-200 mx-1" />
              {/* Replicate Button */}
              <button
                onClick={handleReplicate}
                disabled={loading || !requestData || replicating}
                className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replicar"
              >
                <ContentCopyIcon style={{ fontSize: 20 }} />
              </button>
              {/* View Deal Draft Button */}
              {!publicDealSlug && (
                <button
                  onClick={() => {
                    if (requestId) {
                      window.open(`/deals/draft/${requestId}`, '_blank')
                    }
                  }}
                  disabled={loading || !requestData}
                  className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ver Deal Draft"
                >
                  <VisibilityIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Marketing Campaign Button - Only for booked requests */}
              {requestData?.status === 'booked' && requestData.marketingCampaignId && (
                <button
                  onClick={() => setShowMarketingModal(true)}
                  disabled={loading}
                  className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ver Campaña de Marketing"
                >
                  <CampaignIcon style={{ fontSize: 20 }} />
                </button>
              )}
              {/* Comments Toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg transition-all ${
                  showSidebar 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
                title={showSidebar ? 'Ocultar comentarios' : 'Ver comentarios'}
              >
                <CommentIcon style={{ fontSize: 20 }} />
                {comments.length > 0 && (
                  <span className="ml-1 text-xs font-bold">{comments.length}</span>
                )}
              </button>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Cerrar"
              >
                <CloseIcon style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          {/* Request History Reference */}
          {!loading && requestData && (() => {
            const status = requestData.status || 'draft'
            const processedAt = requestData.processedAt ? new Date(requestData.processedAt) : null
            const startDate = requestData.startDate ? new Date(requestData.startDate) : null
            const endDate = requestData.endDate ? new Date(requestData.endDate) : null
            const createdAt = requestData.createdAt ? new Date(requestData.createdAt) : null
            const processedByUser = requestData.processedByUser
            const createdByUser = requestData.createdByUser
            const processedByName = processedByUser?.name || processedByUser?.email || requestData.processedBy || ''
            const createdByName = createdByUser?.name || createdByUser?.email || requestData.userId || ''

            return (
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
                  {/* Status badge */}
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-semibold border ${
                      status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                      status === 'booked' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  {/* Approved/Booked info */}
                  {(status === 'approved' || status === 'booked') && processedAt && (
                    <div className="flex items-center gap-2 text-slate-600">
                      {status === 'booked' ? (
                        <EventIcon style={{ fontSize: 16 }} className="text-blue-500" />
                      ) : (
                        <CheckCircleIcon style={{ fontSize: 16 }} className="text-green-500" />
                      )}
                      <span>
                        <span className="font-semibold text-slate-700">{status === 'booked' ? 'Reservado:' : 'Aprobado:'}</span>{' '}
                        {processedAt.toLocaleDateString('es-ES', { 
                          timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                        {processedByName && (
                          <span className="text-slate-500"> por {processedByName}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Campaign dates */}
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <PlayArrowIcon style={{ fontSize: 16 }} className="text-indigo-500" />
                      <span>
                        <span className="font-semibold text-slate-700">Campaña:</span>{' '}
                        {startDate && startDate.toLocaleDateString('es-ES', { 
                          timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric' 
                        })}
                        {startDate && endDate && ' → '}
                        {endDate && endDate.toLocaleDateString('es-ES', { 
                          timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}

                  {/* Created info */}
                  {createdAt && (
                    <div className="flex items-center gap-2 text-slate-500 ml-auto">
                      <HistoryIcon style={{ fontSize: 16 }} />
                      <span>
                        Creado {createdAt.toLocaleDateString('es-ES', { 
                          timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                        {createdByName && (
                          <span> por {createdByName}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-white">
            <div className="relative">
              <SearchIcon 
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" 
                style={{ fontSize: 20 }} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar campos (ej: categoría, banco, contacto...)"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <ClearIcon style={{ fontSize: 16 }} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-slate-500 mt-2 font-medium ml-1">
                Mostrando {filteredSections.length} de {allSections.length} secciones
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex bg-slate-50">
            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto p-6 md:p-8 ${showSidebar ? 'pr-6' : ''}`}>
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse shadow-sm">
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
                  <p className="text-slate-500 text-sm mb-4">Ningún campo coincide con &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredSections.map(section => {

                    const isExpanded = expandedSections.has(section.title)
                    const sectionHasComments = section.fields.some(f => commentCounts[f.key] > 0)
                    
                    return (
                      <div key={section.title} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.title)}
                          className="w-full px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between hover:bg-slate-50/80 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-800 uppercase tracking-wide group-hover:text-blue-700 transition-colors">{section.title}</span>
                            {sectionHasComments && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold ring-1 ring-blue-100">
                                <CommentIcon style={{ fontSize: 12 }} className="mr-1" />
                                {section.fields.reduce((acc, f) => acc + (commentCounts[f.key] || 0), 0)}
                              </span>
                            )}
                          </div>
                          <div className={`text-slate-400 group-hover:text-blue-600 transition-colors transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ExpandMoreIcon fontSize="small" />
                          </div>
                        </button>

                        {/* Section Content */}
                        {isExpanded && (
                          <div className="p-6 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              {section.fields.map(field => {
                                const rawValue =
                                  (additionalSection?.values && additionalSection.values[field.key]) ??
                                  getFieldValue(requestData, field.key)
                                const isFieldMatch = searchQuery && (
                                  field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  field.key.toLowerCase().includes(searchQuery.toLowerCase())
                                )

                                // Special rendering for pricing options with images
                                if (field.type === 'pricing' && Array.isArray(rawValue) && rawValue.length > 0) {
                                  const pricingImages = (rawValue as Array<{ imageUrl?: string }>)
                                    .filter(opt => opt.imageUrl)
                                    .map(opt => opt.imageUrl!)
                                  
                                  return (
                                    <div key={field.key} className="md:col-span-2">
                                      {renderFieldCommentControls(field.key, field.label)}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(rawValue as Array<{ title?: string; description?: string; price?: string; realValue?: string; quantity?: string; imageUrl?: string; limitByUser?: string; maxGiftsPerUser?: string; endAt?: string; expiresIn?: string }>).map((opt, idx) => (
                                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            {opt.imageUrl && (
                                              <button
                                                type="button"
                                                onClick={() => openLightbox(pricingImages, pricingImages.indexOf(opt.imageUrl!))}
                                                className="relative w-full h-32 rounded-lg overflow-hidden mb-3 cursor-zoom-in group"
                                              >
                                                <Image
                                                  src={opt.imageUrl}
                                                  alt={opt.title || `Opción ${idx + 1}`}
                                                  fill
                                                  className="object-cover"
                                                  sizes="(max-width: 640px) 100vw, 33vw"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                  <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" style={{ fontSize: 28 }} />
                                                </div>
                                              </button>
                                            )}
                                            <p className="font-semibold text-slate-800 text-sm mb-1">{opt.title || `Opción ${idx + 1}`}</p>
                                            {opt.description && (
                                              <p className="text-xs text-slate-500 mb-2 line-clamp-2">{opt.description}</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                              <span className="text-lg font-bold text-blue-600">${opt.price || '0'}</span>
                                              {opt.realValue && parseFloat(opt.realValue) > 0 && (
                                                <span className="text-sm text-slate-400 line-through">${opt.realValue}</span>
                                              )}
                                            </div>
                                            {/* Quantity and limits */}
                                            <div className="mt-2 space-y-1">
                                              {opt.quantity && opt.quantity !== 'Ilimitado' && (
                                                <p className="text-xs text-slate-500">Cantidad: {opt.quantity}</p>
                                              )}
                                              {opt.limitByUser && (
                                                <p className="text-xs text-slate-500">Max Usuario: {opt.limitByUser}</p>
                                              )}
                                              {opt.maxGiftsPerUser && (
                                                <p className="text-xs text-slate-500">Max Regalo: {opt.maxGiftsPerUser}</p>
                                              )}
                                              {opt.endAt && (
                                                <p className="text-xs text-slate-500">Fecha fin: {new Date(opt.endAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                              )}
                                              {opt.expiresIn && (
                                                <p className="text-xs text-slate-500">Vence en: {opt.expiresIn} días</p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {renderInlineComments(field.key)}
                                    </div>
                                  )
                                }

                                // Special rendering for gallery images
                                if (field.type === 'gallery' && Array.isArray(rawValue) && rawValue.length > 0) {
                                  const sortedImages = (rawValue as Array<{ url: string; order: number }>)
                                    .sort((a, b) => a.order - b.order)
                                  const galleryUrls = sortedImages.map(img => img.url)
                                  
                                  return (
                                    <div key={field.key} className="md:col-span-2">
                                      {renderFieldCommentControls(field.key, field.label)}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {sortedImages.map((img, idx) => (
                                          <button
                                            key={img.url}
                                            type="button"
                                            onClick={() => openLightbox(galleryUrls, idx)}
                                            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-zoom-in group"
                                          >
                                            <Image
                                              src={img.url}
                                              alt={`Imagen ${idx + 1}`}
                                              fill
                                              className="object-cover"
                                              sizes="(max-width: 640px) 50vw, 20vw"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                              <ZoomInIcon className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" style={{ fontSize: 24 }} />
                                            </div>
                                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded">
                                              {idx + 1}
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                      {renderInlineComments(field.key)}
                                    </div>
                                  )
                                }

                                // Skip empty gallery/pricing fields
                                if ((field.type === 'gallery' || field.type === 'pricing') && (!rawValue || (Array.isArray(rawValue) && rawValue.length === 0))) {
                                  return null
                                }

                                return (
                                  <FieldWithComments
                                    key={field.key}
                                    fieldKey={field.key}
                                    label={field.label}
                                    value={formatFieldValue(rawValue, field.type)}
                                    comments={getCommentsForField(comments, field.key)}
                                    isHighlighted={!!isFieldMatch}
                                    activeCommentField={activeCommentField}
                                    savingComment={savingComment}
                                    onToggleComment={handleToggleComment}
                                    onAddComment={(text, mentions) => handleAddComment(field.key, text, mentions)}
                                    getUsersAction={getUsersForFieldCommentMention}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Comments Sidebar */}
            {showSidebar && (
              <div className="w-80 border-l border-slate-200 bg-white flex flex-col flex-shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Comentarios ({comments.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CommentIcon className="text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Aún no hay comentarios</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Haz clic en el icono de comentario junto a cualquier campo para iniciar una discusión.
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const mentioned = comments.filter(c => (c.mentions || []).includes(userId || ''))
                      const others = comments.filter(c => !(c.mentions || []).includes(userId || ''))
                      const renderComment = (comment: FieldComment) => {
                        const isEditing = editingCommentId === comment.id
                        const canEdit = comment.authorId === userId || isAdmin
                        const canDelete = isAdmin
                        const fieldLabel = allSections
                          .flatMap(s => s.fields as Array<{ key: string; label: string }>)
                          .find(f => f.key === comment.fieldKey)?.label || comment.fieldKey

                        return (
                          <div key={comment.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            {/* Comment header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">{fieldLabel}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="font-semibold text-slate-900">{comment.authorName || comment.authorEmail?.split('@')[0] || 'Desconocido'}</span>
                                  <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                                  <span>{formatShortDate(comment.createdAt)}</span>
                                  {comment.updatedAt && (
                                    <>
                                      <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                                      <span className="text-amber-600 font-medium text-[10px] bg-amber-50 px-1 rounded">edited</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {!isEditing && (canEdit || canDelete) && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canEdit && (
                                    <button
                                      onClick={() => startEditComment(comment)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                      title="Editar comentario"
                                    >
                                      <EditIcon style={{ fontSize: 14 }} />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      title="Eliminar comentario"
                                    >
                                      <DeleteIcon style={{ fontSize: 14 }} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Comment content */}
                            {isEditing ? (
                              <div className="mt-2">
                                <textarea
                                  value={editCommentText}
                                  onChange={e => setEditCommentText(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(null)
                                      setEditCommentText('')
                                    }}
                                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    disabled={!editCommentText.trim() || savingComment}
                                    className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                  >
                                    {savingComment ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                                {renderCommentText(comment.text)}
                              </div>
                            )}

                            {/* Edit history */}
                            {comment.editHistory.length > 0 && !isEditing && (
                              <details className="mt-3 pt-2 border-t border-slate-100">
                                <summary className="text-[10px] font-medium text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1 select-none">
                                  <HistoryIcon style={{ fontSize: 12 }} />
                                  Ver historial de ediciones ({comment.editHistory.length})
                                </summary>
                                <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-2">
                                  {comment.editHistory.map((edit, i) => (
                                    <div key={i} className="text-xs text-slate-500">
                                      <p className="text-[10px] font-medium text-slate-400 mb-0.5">
                                        {new Date(edit.editedAt).toLocaleString()}
                                      </p>
                                      <p className="text-slate-600 line-through bg-slate-50 px-1 py-0.5 rounded inline-block">{edit.text}</p>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        )
                      }

                      return (
                        <>
                          {mentioned.length > 0 && (
                            <div className="space-y-4">
                              {mentioned.map(renderComment)}
                            </div>
                          )}
                          {mentioned.length > 0 && others.length > 0 && (
                            <div className="border-t border-slate-200 my-4"></div>
                          )}
                          {others.length > 0 && (
                            <div className="space-y-4">
                              {others.map(renderComment)}
                            </div>
                          )}
                        </>
                      )
                    })()
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxInitialIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
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

      {/* Admin Approval Confirmation Modal */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        title="¿Aprobar esta solicitud?"
        message={
          <div className="space-y-3">
            <p className="text-gray-600">
              Estás a punto de aprobar la solicitud:
            </p>
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

      {/* Cancel Request Confirmation Modal */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="¿Cancelar esta solicitud?"
        message={
          <div className="space-y-3">
            <p className="text-gray-600">
              Estás a punto de cancelar la solicitud:
            </p>
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

      {/* Marketing Campaign Modal */}
      {requestData?.marketingCampaignId && (
        <MarketingCampaignModal
          isOpen={showMarketingModal}
          onClose={() => setShowMarketingModal(false)}
          campaignId={requestData.marketingCampaignId}
          onSuccess={() => {
            // Optionally refresh data
          }}
        />
      )}
    </>
  )
}
