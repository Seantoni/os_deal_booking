'use client'

const isDev = process.env.NODE_ENV === 'development'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { generateDealDraft, regenerateDraftSection, refreshDealDraft } from '@/app/actions/dealDraft'
import { DealDraftContent, SECTION_LABELS, SECTION_ORDER } from '@/lib/ai/dealDraftTypes'
import { formatShortDate } from '@/lib/date'

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import DescriptionIcon from '@mui/icons-material/Description'

interface DealDraftPageClientProps {
  deal: {
    id: string
    bookingRequestId: string
    status: string
    draftContent: DealDraftContent | null
    draftStatus: string
    draftError: string | null
    bookingRequest: {
      id: string
      name: string
      businessEmail: string
      startDate: Date
      endDate: Date
      parentCategory: string | null
      subCategory1: string | null
    }
  }
}

export default function DealDraftPageClient({ deal: initialDeal }: DealDraftPageClientProps) {
  const [deal, setDeal] = useState(initialDeal)
  const [generating, setGenerating] = useState(false)
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTION_ORDER))
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const draftContent = deal.draftContent as DealDraftContent | null

  // Generate full draft
  const handleGenerateDraft = useCallback(async () => {
    setGenerating(true)
    setError(null)

    try {
      const result = await generateDealDraft(deal.id)
      if (result.success && result.data) {
        setDeal(result.data as any)
        // Refresh deal data in background (fetches only deal data, NOT user data)
        const refreshResult = await refreshDealDraft(deal.id)
        if (refreshResult.success && refreshResult.data) {
          setDeal(refreshResult.data as any)
        }
      } else {
        setError(result.error || 'Failed to generate draft')
      }
    } catch (err) {
      setError('An error occurred while generating the draft')
    } finally {
      setGenerating(false)
    }
  }, [deal.id])

  // Regenerate a specific section
  const handleRegenerateSection = useCallback(async (sectionName: keyof DealDraftContent) => {
    setRegeneratingSection(sectionName)
    setError(null)

    try {
      const result = await regenerateDraftSection(deal.id, sectionName)
      if (result.success && result.data) {
        setDeal(result.data as any)
        // Refresh deal data in background (fetches only deal data, NOT user data)
        const refreshResult = await refreshDealDraft(deal.id)
        if (refreshResult.success && refreshResult.data) {
          setDeal(refreshResult.data as any)
        }
      } else {
        setError(result.error || `Failed to regenerate ${SECTION_LABELS[sectionName]}`)
      }
    } catch (err) {
      setError(`An error occurred while regenerating ${SECTION_LABELS[sectionName]}`)
    } finally {
      setRegeneratingSection(null)
    }
  }, [deal.id])

  // Toggle section expansion
  const toggleSection = useCallback((sectionName: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionName)) {
        next.delete(sectionName)
      } else {
        next.add(sectionName)
      }
      return next
    })
  }, [])

  // Copy section content
  const handleCopySection = useCallback(async (sectionName: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedSection(sectionName)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      if (isDev) console.error('Failed to copy:', err)
    }
  }, [])

  // Copy all content
  const handleCopyAll = useCallback(async () => {
    if (!draftContent) return

    const fullContent = SECTION_ORDER.map(section => {
      const content = draftContent[section]
      if (!content) return ''
      return `${SECTION_LABELS[section]}\n\n${content}`
    }).filter(Boolean).join('\n\n---\n\n')

    try {
      await navigator.clipboard.writeText(fullContent)
      setCopiedSection('all')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      if (isDev) console.error('Failed to copy:', err)
    }
  }, [draftContent])

  // Status badge
  const getStatusBadge = () => {
    switch (deal.draftStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <HourglassEmptyIcon className="w-3.5 h-3.5" />
            Pending
          </span>
        )
      case 'generating':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
            Generating...
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckIcon className="w-3.5 h-3.5" />
            Completed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ErrorOutlineIcon className="w-3.5 h-3.5" />
            Failed
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/deals"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowBackIcon fontSize="small" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                    <AutoAwesomeIcon className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-lg font-bold text-gray-900">Deal Draft</h1>
                  {getStatusBadge()}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {deal.bookingRequest.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {draftContent && (
                <button
                  onClick={handleCopyAll}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {copiedSection === 'all' ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ContentCopyIcon className="w-4 h-4" />
                      Copy All
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleGenerateDraft}
                disabled={generating || deal.draftStatus === 'generating'}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {generating || deal.draftStatus === 'generating' ? (
                  <>
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <AutoAwesomeIcon className="w-4 h-4" />
                    {draftContent ? 'Regenerate All' : 'Generate Draft'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {(error || deal.draftError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <ErrorOutlineIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error || deal.draftError}</p>
            </div>
          </div>
        )}

        {/* Business Info Card */}
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DescriptionIcon className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Request Information</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Business</p>
              <p className="font-medium text-gray-900">{deal.bookingRequest.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{deal.bookingRequest.businessEmail}</p>
            </div>
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium text-gray-900">
                {deal.bookingRequest.parentCategory || 'N/A'}
                {deal.bookingRequest.subCategory1 && ` / ${deal.bookingRequest.subCategory1}`}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Period</p>
              <p className="font-medium text-gray-900">
                {formatShortDate(deal.bookingRequest.startDate)} - {formatShortDate(deal.bookingRequest.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Draft Sections */}
        {!draftContent && deal.draftStatus !== 'generating' && !generating ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl mb-4">
              <AutoAwesomeIcon className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Draft Generated Yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Click the "Generate Draft" button to create an AI-powered promotional offer based on the booking request information.
            </p>
            <button
              onClick={handleGenerateDraft}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <AutoAwesomeIcon className="w-5 h-5" />
              Generate Draft with AI
            </button>
          </div>
        ) : generating || deal.draftStatus === 'generating' ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl mb-4 animate-pulse">
              <RefreshIcon className="w-8 h-8 text-violet-600 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Draft...</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              AI is creating your promotional offer. This may take a few moments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {SECTION_ORDER.map((sectionKey) => {
              const content = draftContent?.[sectionKey] || ''
              const isExpanded = expandedSections.has(sectionKey)
              const isRegenerating = regeneratingSection === sectionKey

              return (
                <div
                  key={sectionKey}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Section Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white cursor-pointer"
                    onClick={() => toggleSection(sectionKey)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 tracking-wide">
                        {SECTION_LABELS[sectionKey]}
                      </span>
                      {!content && (
                        <span className="text-xs text-gray-400">(Empty)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {content && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopySection(sectionKey, content)
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy section"
                          >
                            {copiedSection === sectionKey ? (
                              <CheckIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <ContentCopyIcon className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRegenerateSection(sectionKey)
                            }}
                            disabled={isRegenerating}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Regenerate section"
                          >
                            <RefreshIcon className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      )}
                      {isExpanded ? (
                        <ExpandLessIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ExpandMoreIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className="px-4 py-4 border-t border-gray-100">
                      {isRegenerating ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshIcon className="w-6 h-6 text-violet-600 animate-spin" />
                          <span className="ml-2 text-sm text-gray-500">Regenerating...</span>
                        </div>
                      ) : content ? (
                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {content}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-gray-400 mb-3">No content for this section</p>
                          <button
                            onClick={() => handleRegenerateSection(sectionKey)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                          >
                            <AutoAwesomeIcon className="w-3.5 h-3.5" />
                            Generate Section
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

