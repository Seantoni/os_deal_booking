'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import CloseIcon from '@mui/icons-material/Close'
import CampaignIcon from '@mui/icons-material/Campaign'
import InstagramIcon from '@mui/icons-material/Instagram'
import BusinessIcon from '@mui/icons-material/Business'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CategoryIcon from '@mui/icons-material/Category'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RefreshIcon from '@mui/icons-material/Refresh'
import SaveIcon from '@mui/icons-material/Save'
import CollectionsIcon from '@mui/icons-material/Collections'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import VideocamIcon from '@mui/icons-material/Videocam'
import { Button, Textarea } from '@/components/ui'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useMarketingCampaign } from './useMarketingCampaign'
import MarketingOptionCard from './MarketingOptionCard'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'
import { formatShortDate } from '@/lib/date'
import ImageLightbox from '@/components/common/ImageLightbox'
import { useUserRole } from '@/hooks/useUserRole'
import { getUsersForMarketing } from '@/app/actions/marketing'
import toast from 'react-hot-toast'

// User type for responsible dropdown
interface UserOption {
  clerkId: string
  name: string | null
  email: string | null
}

interface MarketingCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string | null
  onSuccess?: () => void
  initialOptionId?: string | null // Option to highlight/scroll to (from inbox)
}

// Platform icon mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon className="text-pink-500" />
    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-gray-900"
          fill="currentColor"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      )
    case 'ofertasimple':
      return <BusinessIcon className="text-orange-500" />
    default:
      return <CampaignIcon className="text-gray-500" />
  }
}

export default function MarketingCampaignModal({
  isOpen,
  onClose,
  campaignId,
  onSuccess,
  initialOptionId,
}: MarketingCampaignModalProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  const { isAdmin, isMarketing } = useUserRole()
  const canEdit = isAdmin || isMarketing

  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({
    instagram: true,
    tiktok: true,
    ofertasimple: true,
  })
  const [highlightedOptionId, setHighlightedOptionId] = useState<string | null>(null)
  const optionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [copyInput, setCopyInput] = useState('')
  const [copyDirty, setCopyDirty] = useState(false)
  const [scriptInput, setScriptInput] = useState('')
  const [scriptDirty, setScriptDirty] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [users, setUsers] = useState<UserOption[]>([])
  const [mobileTab, setMobileTab] = useState<'details' | 'resources'>('details')

  const {
    campaign,
    loading,
    saving,
    error,
    optionsByPlatform,
    progress,
    platformConfig,
    requestImages,
    generatingCopy,
    generatingScript,
    toggleOptionPlanned,
    toggleOptionCompleted,
    updateOptionDueDate,
    updateOptionNotes,
    updateOptionResponsible,
    addAttachment,
    removeAttachment,
    updateGeneratedCopy,
    generateAICopy,
    updateVideoScript,
    generateAIVideoScript,
    refresh,
  } = useMarketingCampaign({
    campaignId,
    isOpen,
    onSuccess,
  })

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen && canEdit) {
      getUsersForMarketing().then(result => {
        if (result.success && result.data) {
          setUsers(result.data.map((u: { clerkId: string; name: string | null; email: string | null }) => ({
            clerkId: u.clerkId,
            name: u.name,
            email: u.email,
          })))
        }
      })
    }
  }, [isOpen, canEdit])

  // Handle initialOptionId - expand platform and scroll to option
  useEffect(() => {
    if (initialOptionId && !loading && optionsByPlatform) {
      // Find which platform contains this option
      for (const [platform, options] of Object.entries(optionsByPlatform)) {
        const option = options.find((o: { id: string }) => o.id === initialOptionId)
        if (option) {
          // Expand the platform
          setExpandedPlatforms(prev => ({ ...prev, [platform]: true }))
          // Set highlighted option
          setHighlightedOptionId(initialOptionId)
          
          // Scroll to option after a short delay to allow DOM to update
          setTimeout(() => {
            const optionElement = optionRefs.current[initialOptionId]
            if (optionElement) {
              optionElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 300)
          
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedOptionId(null)
          }, 3000)
          break
        }
      }
    }
  }, [initialOptionId, loading, optionsByPlatform])

  // Sync copy input with campaign data when it loads
  useState(() => {
    if (campaign?.generatedCopy && !copyDirty) {
      setCopyInput(campaign.generatedCopy)
    }
  })

  // Update copy input when campaign loads
  if (campaign?.generatedCopy && copyInput === '' && !copyDirty) {
    setCopyInput(campaign.generatedCopy)
  }

  // Update script input when campaign loads
  if (campaign?.videoScript && scriptInput === '' && !scriptDirty) {
    setScriptInput(campaign.videoScript)
  }

  const togglePlatform = (platform: string, event: React.MouseEvent) => {
    // Prevent scroll position from jumping when expanding/collapsing
    const scrollContainer = (event.target as HTMLElement).closest('.overflow-y-auto')
    const scrollTop = scrollContainer?.scrollTop || 0
    
    setExpandedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }))
    
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop
      }
    })
  }

const handleSaveCopy = async () => {
    await updateGeneratedCopy(copyInput || null)
    setCopyDirty(false)
  }

  const handleGenerateCopy = async () => {
    await generateAICopy()
    // The hook will update the campaign, we need to sync the input
    setCopyDirty(false)
  }

  const handleCopyToClipboard = () => {
    if (copyInput) {
      navigator.clipboard.writeText(copyInput)
      toast.success('Copy copied to clipboard!')
    }
  }

  const handleSaveScript = async () => {
    await updateVideoScript(scriptInput || null)
    setScriptDirty(false)
  }

  const handleGenerateScript = async () => {
    await generateAIVideoScript()
    setScriptDirty(false)
  }

  const handleScriptToClipboard = () => {
    if (scriptInput) {
      navigator.clipboard.writeText(scriptInput)
      toast.success('Script copied to clipboard!')
    }
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((imageUrl: string) => {
    setDraggingImage(imageUrl)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingImage(null)
  }, [])

  const handleImageDropOnOption = useCallback(async (optionId: string, imageUrl: string) => {
    await addAttachment(optionId, imageUrl)
    setDraggingImage(null)
  }, [addAttachment])

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  if (!isOpen) return null

  const hasMediaOrCopy = campaign?.doMarketing && (requestImages.length > 0 || true) // Always show side panel when marketing is enabled

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center md:p-3 pointer-events-none">
        <div
          className={`w-full ${hasMediaOrCopy ? 'max-w-5xl' : 'max-w-3xl'} bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-[85vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg border border-orange-200">
                  <CampaignIcon className="text-orange-600" style={{ fontSize: 20 }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">
                    {campaign?.bookingRequest?.merchant ||
                      campaign?.bookingRequest?.name ||
                      'Campaign Details'}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1"
              >
                <CloseIcon style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          {/* Content - Two Column Layout */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Mobile Tabs */}
            {hasMediaOrCopy && (
              <div className="md:hidden flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => setMobileTab('details')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === 'details'
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Detalles
                </button>
                <button
                  onClick={() => setMobileTab('resources')}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                    mobileTab === 'resources'
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Recursos
                </button>
              </div>
            )}

            {error && (
              <div className="absolute top-12 left-4 right-4 z-10 p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex-1 p-4">
                <FormModalSkeleton sections={3} fieldsPerSection={3} />
              </div>
            ) : campaign ? (
              <>
                {/* Left Side Panel - Sticky Copy & Media */}
                {hasMediaOrCopy && (
                  <div className={`${mobileTab === 'resources' ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50/50 overflow-y-auto custom-scrollbar`}>
                    <div className="p-2 space-y-2">
                      {/* AI Generated Copy Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-0.5 bg-purple-100 rounded">
                              <AutoFixHighIcon className="text-purple-600" style={{ fontSize: 12 }} />
                            </div>
                            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Copia de Marketing</h3>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleGenerateCopy}
                          disabled={!canEdit || generatingCopy || saving}
                          className="w-full mb-1.5 h-6 text-[10px] whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white"
                        >
                          {generatingCopy ? (
                            <RefreshIcon style={{ fontSize: 12 }} className="animate-spin mr-1" />
                          ) : (
                            <AutoFixHighIcon style={{ fontSize: 12 }} className="mr-1" />
                          )}
                          {generatingCopy ? 'Generando...' : 'Generar con IA'}
                        </Button>

                        <div className="relative">
                          <Textarea
                            value={copyInput}
                            onChange={(e) => {
                              setCopyInput(e.target.value)
                              setCopyDirty(true)
                            }}
                            placeholder="Haz clic en 'Generar con IA'..."
                            rows={7}
                            disabled={!canEdit || generatingCopy}
                            className="text-[10px] pr-5 min-h-[120px] resize-none leading-relaxed"
                          />
                          {copyInput && (
                            <button
                              onClick={handleCopyToClipboard}
                              className="absolute top-1.5 right-1.5 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copiar al portapapeles"
                            >
                              <ContentCopyIcon style={{ fontSize: 12 }} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-gray-400">
                            {copyInput.length}/280
                          </span>
                          {copyDirty && canEdit && (
                            <Button
                              size="sm"
                              onClick={handleSaveCopy}
                              disabled={saving}
                              className="h-5 text-[9px] px-1.5"
                            >
                              <SaveIcon style={{ fontSize: 10 }} className="mr-1" />
                              Guardar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Video Script Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-0.5 bg-red-100 rounded">
                              <VideocamIcon className="text-red-600" style={{ fontSize: 12 }} />
                            </div>
                            <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Guion de Video</h3>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleGenerateScript}
                          disabled={!canEdit || generatingScript || saving}
                          className="w-full mb-1.5 h-6 text-[10px] whitespace-nowrap bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 hover:text-white"
                        >
                          {generatingScript ? (
                            <RefreshIcon style={{ fontSize: 12 }} className="animate-spin mr-1" />
                          ) : (
                            <VideocamIcon style={{ fontSize: 12 }} className="mr-1" />
                          )}
                          {generatingScript ? 'Generando...' : 'Generar Guion'}
                        </Button>

                        <div className="relative">
                          <Textarea
                            value={scriptInput}
                            onChange={(e) => {
                              setScriptInput(e.target.value)
                              setScriptDirty(true)
                            }}
                            placeholder="Haz clic en 'Generar Guion'..."
                            rows={10}
                            disabled={!canEdit || generatingScript}
                            className="text-[10px] pr-5 min-h-[160px] resize-none font-mono leading-relaxed"
                          />
                          {scriptInput && (
                            <button
                              onClick={handleScriptToClipboard}
                              className="absolute top-1.5 right-1.5 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copiar al portapapeles"
                            >
                              <ContentCopyIcon style={{ fontSize: 12 }} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-gray-400">
                            Guion narrativo
                          </span>
                          {scriptDirty && canEdit && (
                            <Button
                              size="sm"
                              onClick={handleSaveScript}
                              disabled={saving}
                              className="h-5 text-[9px] px-1.5"
                            >
                              <SaveIcon style={{ fontSize: 10 }} className="mr-1" />
                              Guardar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Multimedia Gallery Section */}
                      {requestImages.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="p-0.5 bg-blue-100 rounded">
                              <CollectionsIcon className="text-blue-600" style={{ fontSize: 12 }} />
                            </div>
                            <div>
                              <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">Galería de Medios</h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1">
                            {requestImages.map((image, idx) => (
                              <div
                                key={image.url}
                                draggable
                                onDragStart={() => handleDragStart(image.url)}
                                onDragEnd={handleDragEnd}
                                className={`relative aspect-square rounded overflow-hidden border cursor-grab active:cursor-grabbing transition-all group ${
                                  draggingImage === image.url
                                    ? 'border-blue-500 ring-1 ring-blue-200 scale-95'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <Image
                                  src={image.url}
                                  alt={`Image ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="60px"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleImageClick(idx)
                                    }}
                                    className="p-0.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                    title="Ver imagen"
                                  >
                                    <ZoomInIcon style={{ fontSize: 10 }} className="text-gray-700" />
                                  </button>
                                  <DragIndicatorIcon 
                                    className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" 
                                    style={{ fontSize: 12 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-gray-400 text-center mt-1">
                            Arrastrar a opciones
                          </p>
                        </div>
                      )}

                      {/* No images message */}
                      {requestImages.length === 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-2 text-center">
                          <CollectionsIcon className="text-gray-300 mb-0.5" style={{ fontSize: 16 }} />
                          <p className="text-[9px] text-gray-500">No hay imágenes disponibles</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Main Content - Scrollable */}
                <div className={`${mobileTab === 'details' ? 'block' : 'hidden'} md:block flex-1 overflow-y-auto bg-gray-50`}>
                  <div className="p-3 space-y-3">
                    {/* Booking Request Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gray-100 rounded">
                            <BusinessIcon className="text-gray-500" style={{ fontSize: 16 }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Business</p>
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {campaign.bookingRequest.merchant || campaign.bookingRequest.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gray-100 rounded">
                            <CategoryIcon className="text-gray-500" style={{ fontSize: 16 }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Category</p>
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {campaign.bookingRequest.parentCategory || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-gray-100 rounded">
                            <CalendarTodayIcon className="text-gray-500" style={{ fontSize: 16 }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Start Date</p>
                            <p className="text-xs font-semibold text-gray-900">
                              {formatShortDate(campaign.bookingRequest.startDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {campaign.doMarketing && progress.planned > 0 && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Progress</span>
                          <span className="text-[10px] font-bold text-gray-700">
                            {progress.completed}/{progress.planned} tasks
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${(progress.completed / progress.planned) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Marketing Options by Platform */}
                    {campaign.doMarketing && (
                      <div className="space-y-2">
                        {Object.entries(platformConfig).map(([platform, config]) => {
                          const platformOptions = optionsByPlatform[platform] || []
                          const plannedCount = platformOptions.filter((o) => o.isPlanned).length
                          const completedCount = platformOptions.filter(
                            (o) => o.isPlanned && o.isCompleted
                          ).length
                          const isExpanded = expandedPlatforms[platform]

                          return (
                            <div
                              key={platform}
                              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
                            >
                              {/* Platform Header */}
                              <button
                                type="button"
                                onClick={(e) => togglePlatform(platform, e)}
                                className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <PlatformIcon platform={platform} />
                                  <span className="font-bold text-gray-800 text-xs">{config.label}</span>
                                  {plannedCount > 0 && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium ml-1">
                                      {completedCount}/{plannedCount}
                                    </span>
                                  )}
                                </div>
                                {isExpanded ? (
                                  <ExpandLessIcon className="text-gray-400" style={{ fontSize: 16 }} />
                                ) : (
                                  <ExpandMoreIcon className="text-gray-400" style={{ fontSize: 16 }} />
                                )}
                              </button>

                              {/* Platform Options */}
                              {isExpanded && (
                                <div className="p-2 space-y-2 bg-white">
                                  {platformOptions.map((option) => {
                                    const optionConfig = config.options.find(
                                      (o) => o.type === option.optionType
                                    )
                                    const isHighlighted = highlightedOptionId === option.id
                                    return (
                                      <div
                                        key={option.id}
                                        ref={(el) => { optionRefs.current[option.id] = el }}
                                        className={`transition-all duration-500 ${
                                          isHighlighted
                                            ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg bg-blue-50/50'
                                            : ''
                                        }`}
                                      >
                                        <MarketingOptionCard
                                          option={option}
                                          optionLabel={optionConfig?.label || option.optionType}
                                          canEdit={canEdit}
                                          saving={saving}
                                          draggingImage={draggingImage}
                                          users={users}
                                          onTogglePlanned={toggleOptionPlanned}
                                          onToggleCompleted={toggleOptionCompleted}
                                          onUpdateDueDate={updateOptionDueDate}
                                          onUpdateResponsible={updateOptionResponsible}
                                          onAddAttachment={addAttachment}
                                          onRemoveAttachment={removeAttachment}
                                          onImageDrop={handleImageDropOnOption}
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 p-8 text-center text-gray-500">Campaign not found</div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white px-4 py-2 flex justify-between items-center flex-shrink-0">
            <div className="text-[10px] text-gray-400 font-medium">
              {canEdit ? 'Editing Mode' : 'View Only'}
            </div>
            <Button variant="secondary" onClick={onClose} size="sm" className="h-7 text-xs px-3">
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={requestImages.map(img => img.url)}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
