'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getBookingRequest, getFieldComments, addFieldComment, updateFieldComment, deleteFieldComment } from '@/app/actions/booking'
import { parseFieldComments, getCommentsForField, getCommentCountsByField, type FieldComment } from '@/types'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

// Icons
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CommentIcon from '@mui/icons-material/Comment'
import AddCommentIcon from '@mui/icons-material/AddComment'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import HistoryIcon from '@mui/icons-material/History'
import PersonIcon from '@mui/icons-material/Person'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

// Field sections configuration (base)
const BASE_SECTIONS = [
  {
    title: 'General Information',
    fields: [
      { key: 'name', label: 'Business Name' },
      { key: 'businessEmail', label: 'Business Email' },
      { key: 'parentCategory', label: 'Category' },
      { key: 'subCategory1', label: 'Subcategory 1' },
      { key: 'subCategory2', label: 'Subcategory 2' },
      { key: 'subCategory3', label: 'Subcategory 3' },
      { key: 'description', label: 'Description', type: 'description' },
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

interface BookingRequestData {
  [key: string]: unknown
}

export default function BookingRequestViewModal({
  isOpen,
  onClose,
  requestId,
  hideBackdrop = false,
}: BookingRequestViewModalProps) {
  const { isAdmin } = useUserRole()
  const { user } = useUser()
  const userId = user?.id
  const [loading, setLoading] = useState(true)
  const [requestData, setRequestData] = useState<BookingRequestData | null>(null)
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
        setRequestData(requestResult.data as unknown as BookingRequestData)
        // Also parse comments from request data if server didn't return them
        const requestComments = parseFieldComments((requestResult.data as BookingRequestData).fieldComments)
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
  const additionalInfo = useMemo(() => {
    const info = (requestData as any)?.additionalInfo
    if (!info || typeof info !== 'object') return null
    const fields = Object.entries((info as any).fields || {}).map(([label, value]) => ({
      label,
      value: value as string,
    }))
    return {
      templateDisplayName: (info as any).templateDisplayName || (info as any).templateName || '',
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
  const allSections = useMemo(() => {
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

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 z-50 flex max-w-5xl w-full pointer-events-none">
        <div className="pointer-events-auto w-full bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                <DescriptionIcon className="text-blue-600" fontSize="medium" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Booking Request</p>
                <h2 className="text-xl font-bold text-gray-900">
                  {(requestData?.name as string) || 'Loading...'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-2 rounded-md transition-colors ${
                  showSidebar ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={showSidebar ? 'Hide comments sidebar' : 'Show comments sidebar'}
              >
                <CommentIcon fontSize="small" />
                {comments.length > 0 && (
                  <span className="ml-1 text-xs font-medium">{comments.length}</span>
                )}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <CloseIcon fontSize="medium" />
              </button>
            </div>
          </div>

          {/* Request History Reference */}
          {!loading && requestData && (() => {
            const status = String(requestData.status || 'draft')
            const processedAt = requestData.processedAt ? new Date(String(requestData.processedAt)) : null
            const startDate = requestData.startDate ? new Date(String(requestData.startDate)) : null
            const endDate = requestData.endDate ? new Date(String(requestData.endDate)) : null
            const createdAt = requestData.createdAt ? new Date(String(requestData.createdAt)) : null
            const processedByUser = requestData.processedByUser as { name?: string; email?: string } | null
            const createdByUser = requestData.createdByUser as { name?: string; email?: string } | null
            const processedByName = processedByUser?.name || processedByUser?.email || String(requestData.processedBy || '')
            const createdByName = createdByUser?.name || createdByUser?.email || String(requestData.userId || '')

            return (
              <div className="px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                      status === 'approved' ? 'bg-green-100 text-green-700' :
                      status === 'booked' ? 'bg-blue-100 text-blue-700' :
                      status === 'rejected' ? 'bg-red-100 text-red-700' :
                      status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  {/* Approved/Booked info */}
                  {(status === 'approved' || status === 'booked') && processedAt && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      {status === 'booked' ? (
                        <EventIcon style={{ fontSize: 14 }} className="text-blue-500" />
                      ) : (
                        <CheckCircleIcon style={{ fontSize: 14 }} className="text-green-500" />
                      )}
                      <span>
                        <span className="font-medium">{status === 'booked' ? 'Booked:' : 'Approved:'}</span>{' '}
                        {processedAt.toLocaleDateString('en-US', { 
                          month: 'short', day: 'numeric', year: 'numeric' 
                        })}
                        {processedByName && (
                          <span className="text-gray-500"> by {processedByName}</span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Campaign dates */}
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <PlayArrowIcon style={{ fontSize: 14 }} className="text-purple-500" />
                      <span>
                        <span className="font-medium">Campaign:</span>{' '}
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
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <HistoryIcon style={{ fontSize: 14 }} />
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
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <div className="relative">
              <SearchIcon 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
                style={{ fontSize: 18 }} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search fields (e.g., category, bank, contact...)"
                className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <ClearIcon style={{ fontSize: 18 }} />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-gray-500 mt-1.5">
                Showing {filteredSections.length} of {allSections.length} sections
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Main Content */}
            <div className={`flex-1 overflow-y-auto p-6 bg-gray-50 ${showSidebar ? 'pr-4' : ''}`}>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="mx-auto text-gray-300 mb-3" style={{ fontSize: 48 }} />
                  <p className="text-gray-500 text-sm">No fields match &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Información Adicional {additionalInfo?.templateDisplayName ? `(${additionalInfo.templateDisplayName})` : ''}
            </span>
          </div>
        </div>
        <div className="p-4">
          {additionalInfo && additionalInfo.fields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {additionalInfo.fields.map((f) => (
                <div key={f.label} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</p>
                  <p className="text-sm text-gray-900 mt-1 break-words whitespace-pre-wrap">{String(f.value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin información adicional.</p>
          )}
        </div>
      </div>
                  {filteredSections.map(section => {
                    const isExpanded = expandedSections.has(section.title)
                    const sectionHasComments = section.fields.some(f => commentCounts[f.key] > 0)
                    
                    return (
                      <div key={section.title} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.title)}
                          className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">{section.title}</span>
                            {sectionHasComments && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                <CommentIcon style={{ fontSize: 12 }} className="mr-0.5" />
                                {section.fields.reduce((acc, f) => acc + (commentCounts[f.key] || 0), 0)}
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </button>

                        {/* Section Content */}
                        {isExpanded && (
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {section.fields.map(field => {
                                const value =
                                  (additionalSection?.values && additionalSection.values[field.key]) ??
                                  requestData?.[field.key]
                                const fieldComments = getCommentsForField(comments, field.key)
                                const hasComments = fieldComments.length > 0
                                const isAddingComment = activeCommentField === field.key
                                const isFieldMatch = searchQuery && (
                                  field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  field.key.toLowerCase().includes(searchQuery.toLowerCase())
                                )

                                return (
                                  <div
                                    key={field.key}
                                    className={`p-3 rounded-lg border ${
                                      isFieldMatch 
                                        ? 'border-yellow-300 bg-yellow-50 ring-2 ring-yellow-200' 
                                        : hasComments 
                                          ? 'border-blue-200 bg-blue-50/30' 
                                          : 'border-gray-100 bg-gray-50'
                                    } relative group`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <label className={`text-xs font-medium uppercase tracking-wide ${
                                          isFieldMatch ? 'text-yellow-700' : 'text-gray-500'
                                        }`}>
                                          {field.label}
                                        </label>
                                        <p className="text-sm text-gray-900 mt-1 break-words">
                                          {formatFieldValue(
                                            value,
                                            'type' in field ? (field as { type?: string }).type : undefined
                                          )}
                                        </p>
                                      </div>
                                      
                                      {/* Comment indicator/button */}
                                      <div className="flex items-center gap-1">
                                        {hasComments && (
                                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs font-medium">
                                            {fieldComments.length}
                                          </span>
                                        )}
                                        <button
                                          onClick={() => {
                                            setActiveCommentField(isAddingComment ? null : field.key)
                                            setNewCommentText('')
                                          }}
                                          className={`p-1 rounded transition-colors ${
                                            isAddingComment
                                              ? 'bg-blue-100 text-blue-600'
                                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100'
                                          }`}
                                          title="Add comment"
                                        >
                                          <AddCommentIcon style={{ fontSize: 16 }} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Show field comments inline */}
                                    {hasComments && (
                                      <div className="mt-2 pt-2 border-t border-blue-200 space-y-2">
                                        {fieldComments.slice(0, 2).map(comment => (
                                          <div key={comment.id} className="text-xs text-gray-600">
                                            <div className="flex items-start gap-1">
                                              <CommentIcon style={{ fontSize: 12 }} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-700">
                                                  {comment.authorName || comment.authorEmail?.split('@')[0] || 'User'}:
                                                </span>
                                                <span className="ml-1 line-clamp-2">{comment.text}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {fieldComments.length > 2 && (
                                          <p className="text-xs text-blue-600">+{fieldComments.length - 2} more</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Add comment form */}
                                    {isAddingComment && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <textarea
                                          value={newCommentText}
                                          onChange={e => setNewCommentText(e.target.value)}
                                          placeholder="Add a comment..."
                                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                          rows={2}
                                          autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                          <button
                                            onClick={() => {
                                              setActiveCommentField(null)
                                              setNewCommentText('')
                                            }}
                                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={handleAddComment}
                                            disabled={!newCommentText.trim() || savingComment}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                          >
                                            {savingComment ? 'Saving...' : 'Add'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
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
              <div className="w-80 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">
                    All Comments ({comments.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No comments yet. Click the comment icon next to any field to add one.
                    </p>
                  ) : (
                    comments.map(comment => {
                      const isEditing = editingCommentId === comment.id
                      const canEdit = comment.authorId === userId || isAdmin
                      const canDelete = isAdmin
                      const fieldLabel = allSections
                        .flatMap(s => s.fields)
                        .find(f => f.key === comment.fieldKey)?.label || comment.fieldKey

                      return (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          {/* Comment header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-xs font-medium text-blue-600">{fieldLabel}</p>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                                <PersonIcon style={{ fontSize: 12 }} />
                                <span>{comment.authorName || comment.authorEmail || 'Unknown'}</span>
                                <span>•</span>
                                <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                                {comment.updatedAt && (
                                  <>
                                    <span>•</span>
                                    <span className="text-orange-600">edited</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {!isEditing && (canEdit || canDelete) && (
                              <div className="flex items-center gap-1">
                                {canEdit && (
                                  <button
                                    onClick={() => startEditComment(comment)}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Edit comment"
                                  >
                                    <EditIcon style={{ fontSize: 14 }} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
                            <div>
                              <textarea
                                value={editCommentText}
                                onChange={e => setEditCommentText(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(null)
                                    setEditCommentText('')
                                  }}
                                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditComment(comment.id)}
                                  disabled={!editCommentText.trim() || savingComment}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {savingComment ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                          )}

                          {/* Edit history */}
                          {comment.editHistory.length > 0 && !isEditing && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-1">
                                <HistoryIcon style={{ fontSize: 12 }} />
                                View edit history ({comment.editHistory.length})
                              </summary>
                              <div className="mt-2 pl-3 border-l-2 border-gray-200 space-y-2">
                                {comment.editHistory.map((edit, i) => (
                                  <div key={i} className="text-xs text-gray-500">
                                    <p className="text-gray-400">
                                      {new Date(edit.editedAt).toLocaleString()}
                                    </p>
                                    <p className="text-gray-600 line-through">{edit.text}</p>
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

