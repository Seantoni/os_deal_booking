'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getBookingRequest, getFieldComments, addFieldComment, updateFieldComment, deleteFieldComment } from '@/app/actions/booking'
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
import { useUser } from '@clerk/nextjs'
import { FIELD_TEMPLATES } from '@/components/RequestForm/config/field-templates'
import { FieldWithComments } from './FieldWithComments'
import toast from 'react-hot-toast'

// Icons
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

// Helper to get field value from requestData using dynamic key access
function getFieldValue(data: BookingRequestViewData | null, key: string): unknown {
  if (!data) return undefined
  return (data as unknown as Record<string, unknown>)[key]
}

// Field sections configuration (base)
const BASE_SECTIONS: SectionDefinition[] = [
  {
    title: 'General Information',
    fields: [
      { key: 'name', label: 'Business Name' },
      { key: 'businessEmail', label: 'Business Email' },
      { key: 'parentCategory', label: 'Category' },
      { key: 'subCategory1', label: 'Subcategory 1' },
      { key: 'subCategory2', label: 'Subcategory 2' },
      { key: 'subCategory3', label: 'Subcategory 3' },
      { key: 'merchant', label: 'Merchant/Aliado' },
    ],
  },
  {
    title: 'Campaign Details',
    fields: [
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'campaignDuration', label: 'Campaign Duration' },
    ],
  },
  {
    title: 'Operations & Payments',
    fields: [
      { key: 'redemptionMode', label: 'Redemption Mode' },
      { key: 'isRecurring', label: 'Is Recurring' },
      { key: 'recurringOfferLink', label: 'Recurring Offer Link' },
      { key: 'paymentType', label: 'Payment Type' },
      { key: 'paymentInstructions', label: 'Payment Instructions' },
    ],
  },
  {
    title: 'Contact Directory',
    fields: [
      { key: 'redemptionContactName', label: 'Redemption Contact Name' },
      { key: 'redemptionContactEmail', label: 'Redemption Contact Email' },
      { key: 'redemptionContactPhone', label: 'Redemption Contact Phone' },
    ],
  },
  {
    title: 'Fiscal & Banking Information',
    fields: [
      { key: 'legalName', label: 'Legal Name (Razón Social)' },
      { key: 'rucDv', label: 'RUC y DV' },
      { key: 'bankAccountName', label: 'Bank Account Name' },
      { key: 'bank', label: 'Bank' },
      { key: 'accountNumber', label: 'Account Number' },
      { key: 'accountType', label: 'Account Type' },
    ],
  },
  {
    title: 'Location',
    fields: [
      { key: 'addressAndHours', label: 'Address & Hours' },
      { key: 'province', label: 'Province' },
      { key: 'district', label: 'District' },
      { key: 'corregimiento', label: 'Corregimiento' },
    ],
  },
  {
    title: 'Business Rules & Restrictions',
    fields: [
      { key: 'includesTaxes', label: 'Includes Taxes' },
      { key: 'validOnHolidays', label: 'Valid on Holidays' },
      { key: 'hasExclusivity', label: 'Has Exclusivity' },
      { key: 'exclusivityCondition', label: 'Exclusivity Condition' },
      { key: 'blackoutDates', label: 'Blackout Dates' },
      { key: 'giftVouchers', label: 'Gift Vouchers' },
      { key: 'hasOtherBranches', label: 'Has Other Branches' },
      { key: 'vouchersPerPerson', label: 'Vouchers Per Person' },
      { key: 'commission', label: 'Commission' },
    ],
  },
  {
    title: 'Description & Sales Channels',
    fields: [
      { key: 'redemptionMethods', label: 'Redemption Methods', type: 'json' },
      { key: 'contactDetails', label: 'Contact Details' },
      { key: 'socialMedia', label: 'Social Media' },
      { key: 'businessReview', label: 'Business Review' },
      { key: 'offerDetails', label: 'Offer Details' },
    ],
  },
  {
    title: 'Pricing Options',
    fields: [
      { key: 'pricingOptions', label: 'Pricing Options', type: 'pricing' },
    ],
  },
  {
    title: 'General Policies',
    fields: [
      { key: 'cancellationPolicy', label: 'Cancellation Policy' },
      { key: 'marketValidation', label: 'Market Validation' },
      { key: 'additionalComments', label: 'Additional Comments' },
    ],
  },
  {
    title: 'Request Status',
    fields: [
      { key: 'status', label: 'Status' },
      { key: 'sourceType', label: 'Source Type' },
      { key: 'processedAt', label: 'Processed At', type: 'date' },
      { key: 'processedBy', label: 'Processed By' },
      { key: 'rejectionReason', label: 'Rejection Reason' },
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
  const [newCommentText, setNewCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [savingComment, setSavingComment] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

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
      toast.error('Failed to load request data')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    if (isOpen && requestId) {
      loadData()
    }
  }, [isOpen, requestId, loadData])

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
  const allSections = useMemo((): SectionDefinition[] => {
    if (additionalSection?.section) {
      return [additionalSection.section, ...BASE_SECTIONS]
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
      return date.toLocaleDateString('en-US', {
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
  async function handleAddComment() {
    if (!requestId || !activeCommentField || !newCommentText.trim()) return
    
    setSavingComment(true)
    try {
      const result = await addFieldComment(requestId, activeCommentField, newCommentText)
      if (result.success && result.data) {
        setComments(prev => [...prev, result.data!])
        setNewCommentText('')
        setActiveCommentField(null)
        toast.success('Comment added')
      } else {
        toast.error(result.error || 'Failed to add comment')
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
        toast.success('Comment updated')
      } else {
        toast.error(result.error || 'Failed to update comment')
      }
    } finally {
      setSavingComment(false)
    }
  }

  // Delete comment handler
  async function handleDeleteComment(commentId: string) {
    if (!requestId) return
    
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    setSavingComment(true)
    try {
      const result = await deleteFieldComment(requestId, commentId)
      if (result.success) {
        setComments(prev => prev.filter(c => c.id !== commentId))
        toast.success('Comment deleted')
      } else {
        toast.error(result.error || 'Failed to delete comment')
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
    setNewCommentText('')
  }, [])

  // Replicate request - navigate to form with pre-filled data
  function handleReplicate() {
    if (!requestData) return

    // Build query parameters with all replicable fields
    const params = new URLSearchParams()
    
    // Flag to indicate this is a replication
    params.set('replicate', 'true')
    
    // Step 1: Configuración
    // Extract business name from formatted request name (format: "Business Name | Date | #Number")
    // Only use the part before the first "|" to avoid duplicate formatting
    if (requestData.name) {
      const businessName = requestData.name.split(' | ')[0].trim()
      params.set('businessName', businessName)
    }
    if (requestData.businessEmail) params.set('partnerEmail', String(requestData.businessEmail))
    if (requestData.additionalEmails) {
      const emails = Array.isArray(requestData.additionalEmails) 
        ? requestData.additionalEmails 
        : []
      if (emails.length > 0) params.set('additionalEmails', JSON.stringify(emails))
    }
    if (requestData.merchant) params.set('merchant', String(requestData.merchant))
    if (requestData.category) params.set('category', String(requestData.category))
    if (requestData.parentCategory) params.set('parentCategory', String(requestData.parentCategory))
    if (requestData.subCategory1) params.set('subCategory1', String(requestData.subCategory1))
    if (requestData.subCategory2) params.set('subCategory2', String(requestData.subCategory2))
    if (requestData.subCategory3) params.set('subCategory3', String(requestData.subCategory3))
    if (requestData.campaignDuration) params.set('campaignDuration', String(requestData.campaignDuration))
    
    // Step 2: Operatividad
    if (requestData.redemptionMode) params.set('redemptionMode', String(requestData.redemptionMode))
    if (requestData.isRecurring) params.set('isRecurring', String(requestData.isRecurring))
    if (requestData.recurringOfferLink) params.set('recurringOfferLink', String(requestData.recurringOfferLink))
    if (requestData.paymentType) params.set('paymentType', String(requestData.paymentType))
    if (requestData.paymentInstructions) params.set('paymentInstructions', String(requestData.paymentInstructions))
    
    // Step 3: Directorio
    if (requestData.redemptionContactName) params.set('redemptionContactName', String(requestData.redemptionContactName))
    if (requestData.redemptionContactEmail) params.set('redemptionContactEmail', String(requestData.redemptionContactEmail))
    if (requestData.redemptionContactPhone) params.set('redemptionContactPhone', String(requestData.redemptionContactPhone))
    
    // Step 4: Fiscales
    if (requestData.legalName) params.set('legalName', String(requestData.legalName))
    if (requestData.rucDv) params.set('rucDv', String(requestData.rucDv))
    if (requestData.bankAccountName) params.set('bankAccountName', String(requestData.bankAccountName))
    if (requestData.bank) params.set('bank', String(requestData.bank))
    if (requestData.accountNumber) params.set('accountNumber', String(requestData.accountNumber))
    if (requestData.accountType) params.set('accountType', String(requestData.accountType))
    if (requestData.addressAndHours) params.set('addressAndHours', String(requestData.addressAndHours))
    if (requestData.province) params.set('province', String(requestData.province))
    if (requestData.district) params.set('district', String(requestData.district))
    if (requestData.corregimiento) params.set('corregimiento', String(requestData.corregimiento))
    
    // Step 5: Negocio
    if (requestData.includesTaxes) params.set('includesTaxes', String(requestData.includesTaxes))
    if (requestData.validOnHolidays) params.set('validOnHolidays', String(requestData.validOnHolidays))
    if (requestData.hasExclusivity) params.set('hasExclusivity', String(requestData.hasExclusivity))
    if (requestData.blackoutDates) params.set('blackoutDates', String(requestData.blackoutDates))
    if (requestData.exclusivityCondition) params.set('exclusivityCondition', String(requestData.exclusivityCondition))
    if (requestData.giftVouchers) params.set('giftVouchers', String(requestData.giftVouchers))
    if (requestData.hasOtherBranches) params.set('hasOtherBranches', String(requestData.hasOtherBranches))
    if (requestData.vouchersPerPerson) params.set('vouchersPerPerson', String(requestData.vouchersPerPerson))
    if (requestData.commission) params.set('commission', String(requestData.commission))
    
    // Step 6: Descripción
    if (requestData.redemptionMethods) {
      const methods = Array.isArray(requestData.redemptionMethods) 
        ? requestData.redemptionMethods 
        : []
      if (methods.length > 0) params.set('redemptionMethods', JSON.stringify(methods))
    }
    if (requestData.contactDetails) params.set('contactDetails', String(requestData.contactDetails))
    if (requestData.socialMedia) params.set('socialMedia', String(requestData.socialMedia))
    if (requestData.businessReview) params.set('businessReview', String(requestData.businessReview))
    if (requestData.offerDetails) params.set('offerDetails', String(requestData.offerDetails))
    
    // Step 7: Estructura (Pricing Options)
    if (requestData.pricingOptions) {
      const pricing = Array.isArray(requestData.pricingOptions) 
        ? requestData.pricingOptions 
        : []
      if (pricing.length > 0) params.set('pricingOptions', JSON.stringify(pricing))
    }
    
    // Step 8: Políticas
    if (requestData.cancellationPolicy) params.set('cancellationPolicy', String(requestData.cancellationPolicy))
    if (requestData.marketValidation) params.set('marketValidation', String(requestData.marketValidation))
    if (requestData.additionalComments) params.set('additionalComments', String(requestData.additionalComments))
    
    // Step 9: Información Adicional (template-specific fields)
    if (requestData.additionalInfo && typeof requestData.additionalInfo === 'object') {
      params.set('additionalInfo', JSON.stringify(requestData.additionalInfo))
    }

    // Navigate to the booking request form with pre-filled data
    onClose()
    router.push(`/booking-requests/new?${params.toString()}`)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Panel */}
        <div className={`w-full max-w-5xl bg-white shadow-2xl rounded-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm text-white">
                <DescriptionIcon fontSize="medium" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Booking Request</p>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {(requestData?.name as string) || 'Loading...'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Replicate Button */}
              <button
                onClick={handleReplicate}
                disabled={loading || !requestData}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replicate this request"
              >
                <ContentCopyIcon style={{ fontSize: 16 }} />
                <span>Replicar</span>
              </button>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-lg transition-all ${
                  showSidebar 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
                title={showSidebar ? 'Hide comments sidebar' : 'Show comments sidebar'}
              >
                <CommentIcon fontSize="small" />
                {comments.length > 0 && (
                  <span className="ml-1.5 text-xs font-bold">{comments.length}</span>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <CloseIcon fontSize="medium" />
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
                        <span className="font-semibold text-slate-700">{status === 'booked' ? 'Booked:' : 'Approved:'}</span>{' '}
                        {processedAt.toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                        {processedByName && (
                          <span className="text-slate-500"> by {processedByName}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Campaign dates */}
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <PlayArrowIcon style={{ fontSize: 16 }} className="text-indigo-500" />
                      <span>
                        <span className="font-semibold text-slate-700">Campaign:</span>{' '}
                        {startDate && startDate.toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric' 
                        })}
                        {startDate && endDate && ' → '}
                        {endDate && endDate.toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}

                  {/* Created info */}
                  {createdAt && (
                    <div className="flex items-center gap-2 text-slate-500 ml-auto">
                      <HistoryIcon style={{ fontSize: 16 }} />
                      <span>
                        Created {createdAt.toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                        {createdByName && (
                          <span> by {createdByName}</span>
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
                placeholder="Search fields (e.g., category, bank, contact...)"
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
                Showing {filteredSections.length} of {allSections.length} sections
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
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No matches found</h3>
                  <p className="text-slate-500 text-sm mb-4">No fields match &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Additional Info Section (if exists) */}
                  {additionalInfo && additionalInfo.fields.length > 0 && additionalSection && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="w-full px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            Información Adicional {additionalInfo.templateDisplayName ? `(${additionalInfo.templateDisplayName})` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                          {additionalSection.section.fields.map((field) => (
                            <FieldWithComments
                              key={field.key}
                              fieldKey={field.key}
                              label={field.label}
                              value={additionalSection.values[field.key] ?? ''}
                              comments={getCommentsForField(comments, field.key)}
                              activeCommentField={activeCommentField}
                              newCommentText={newCommentText}
                              savingComment={savingComment}
                              onToggleComment={handleToggleComment}
                              onCommentTextChange={setNewCommentText}
                              onAddComment={handleAddComment}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredSections.map(section => {
                    // Skip rendering Additional Info section here if we rendered it above
                    if (section.title.startsWith('Información Adicional') && additionalInfo) return null

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

                                return (
                                  <FieldWithComments
                                    key={field.key}
                                    fieldKey={field.key}
                                    label={field.label}
                                    value={formatFieldValue(rawValue, field.type)}
                                    comments={getCommentsForField(comments, field.key)}
                                    isHighlighted={!!isFieldMatch}
                                    activeCommentField={activeCommentField}
                                    newCommentText={newCommentText}
                                    savingComment={savingComment}
                                    onToggleComment={handleToggleComment}
                                    onCommentTextChange={setNewCommentText}
                                    onAddComment={handleAddComment}
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
                    Comments ({comments.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CommentIcon className="text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">No comments yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Click the comment icon next to any field to start a discussion.
                      </p>
                    </div>
                  ) : (
                    comments.map(comment => {
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
                                <span className="font-semibold text-slate-900">{comment.authorName || comment.authorEmail?.split('@')[0] || 'Unknown'}</span>
                                <span className="w-0.5 h-0.5 bg-slate-300 rounded-full"></span>
                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
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
                                    title="Edit comment"
                                  >
                                    <EditIcon style={{ fontSize: 14 }} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete comment"
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
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={!editCommentText.trim() || savingComment}
                                  className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                  {savingComment ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{comment.text}</div>
                          )}

                          {/* Edit history */}
                          {comment.editHistory.length > 0 && !isEditing && (
                            <details className="mt-3 pt-2 border-t border-slate-100">
                              <summary className="text-[10px] font-medium text-slate-400 cursor-pointer hover:text-slate-600 flex items-center gap-1 select-none">
                                <HistoryIcon style={{ fontSize: 12 }} />
                                View edit history ({comment.editHistory.length})
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
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

