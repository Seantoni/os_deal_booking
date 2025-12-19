'use client'

import { useState, useCallback } from 'react'
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
import { useMarketingCampaign } from './useMarketingCampaign'
import MarketingOptionCard from './MarketingOptionCard'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'
import ImageLightbox from '@/components/common/ImageLightbox'
import { useUserRole } from '@/hooks/useUserRole'
import toast from 'react-hot-toast'

interface MarketingCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string | null
  onSuccess?: () => void
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
}: MarketingCampaignModalProps) {
  const { isAdmin, isMarketing } = useUserRole()
  const canEdit = isAdmin || isMarketing

  const [skipReasonInput, setSkipReasonInput] = useState('')
  const [showSkipReason, setShowSkipReason] = useState(false)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({
    instagram: true,
    tiktok: true,
    ofertasimple: true,
  })
  const [copyInput, setCopyInput] = useState('')
  const [copyDirty, setCopyDirty] = useState(false)
  const [scriptInput, setScriptInput] = useState('')
  const [scriptDirty, setScriptDirty] = useState(false)
  const [draggingImage, setDraggingImage] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

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
    toggleDoMarketing,
    toggleOptionPlanned,
    toggleOptionCompleted,
    updateOptionDueDate,
    updateOptionNotes,
    addAttachment,
    removeAttachment,
    updateGeneratedCopy,
    generateAICopy,
    updateVideoScript,
    generateAIVideoScript,
  } = useMarketingCampaign({
    campaignId,
    isOpen,
    onSuccess,
  })

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

  const handleToggleDoMarketing = async (doMarketing: boolean) => {
    if (doMarketing) {
      await toggleDoMarketing(true)
      setShowSkipReason(false)
    } else {
      setShowSkipReason(true)
    }
  }

  const handleConfirmNoMarketing = async () => {
    await toggleDoMarketing(false, skipReasonInput || undefined)
    setShowSkipReason(false)
    setSkipReasonInput('')
  }

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('es-PA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`w-full ${hasMediaOrCopy ? 'max-w-6xl' : 'max-w-4xl'} bg-white shadow-2xl rounded-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-100 rounded-lg border border-orange-200">
                  <CampaignIcon className="text-orange-600" fontSize="medium" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                    Marketing Campaign
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {campaign?.bookingRequest?.merchant ||
                      campaign?.bookingRequest?.name ||
                      'Campaign Details'}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <CloseIcon fontSize="medium" />
              </button>
            </div>
          </div>

          {/* Content - Two Column Layout */}
          <div className="flex-1 flex overflow-hidden">
            {error && (
              <div className="absolute top-16 left-6 right-6 z-10 p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
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
                  <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto custom-scrollbar">
                    <div className="p-3 space-y-3">
                      {/* AI Generated Copy Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-purple-100 rounded">
                              <AutoFixHighIcon className="text-purple-600" style={{ fontSize: 14 }} />
                            </div>
                            <h3 className="text-xs font-bold text-gray-700">Marketing Copy</h3>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleGenerateCopy}
                          disabled={!canEdit || generatingCopy || saving}
                          className="w-full mb-2 h-7 text-xs whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white"
                        >
                          {generatingCopy ? (
                            <RefreshIcon style={{ fontSize: 14 }} className="animate-spin mr-1" />
                          ) : (
                            <AutoFixHighIcon style={{ fontSize: 14 }} className="mr-1" />
                          )}
                          {generatingCopy ? 'Generating...' : 'Generate with AI'}
                        </Button>

                        <div className="relative">
                          <Textarea
                            value={copyInput}
                            onChange={(e) => {
                              setCopyInput(e.target.value)
                              setCopyDirty(true)
                            }}
                            placeholder="Click 'Generate with AI' to create marketing copy..."
                            rows={9}
                            disabled={!canEdit || generatingCopy}
                            className="text-xs pr-6 min-h-[150px] resize-none"
                          />
                          {copyInput && (
                            <button
                              onClick={handleCopyToClipboard}
                              className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              <ContentCopyIcon style={{ fontSize: 14 }} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            {copyInput.length}/280
                          </span>
                          {copyDirty && canEdit && (
                            <Button
                              size="sm"
                              onClick={handleSaveCopy}
                              disabled={saving}
                              className="h-6 text-[10px] px-2"
                            >
                              <SaveIcon style={{ fontSize: 12 }} className="mr-1" />
                              Save
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Video Script Section */}
                      <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 bg-red-100 rounded">
                              <VideocamIcon className="text-red-600" style={{ fontSize: 14 }} />
                            </div>
                            <h3 className="text-xs font-bold text-gray-700">Video Script</h3>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleGenerateScript}
                          disabled={!canEdit || generatingScript || saving}
                          className="w-full mb-2 h-7 text-xs whitespace-nowrap bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 hover:text-white"
                        >
                          {generatingScript ? (
                            <RefreshIcon style={{ fontSize: 14 }} className="animate-spin mr-1" />
                          ) : (
                            <VideocamIcon style={{ fontSize: 14 }} className="mr-1" />
                          )}
                          {generatingScript ? 'Generating...' : 'Generate Script'}
                        </Button>

                        <div className="relative">
                          <Textarea
                            value={scriptInput}
                            onChange={(e) => {
                              setScriptInput(e.target.value)
                              setScriptDirty(true)
                            }}
                            placeholder="Click 'Generate Script' to create a 15-30 second video script..."
                            rows={12}
                            disabled={!canEdit || generatingScript}
                            className="text-xs pr-6 min-h-[200px] resize-none font-mono"
                          />
                          {scriptInput && (
                            <button
                              onClick={handleScriptToClipboard}
                              className="absolute top-1.5 right-1.5 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Copy to clipboard"
                            >
                              <ContentCopyIcon style={{ fontSize: 14 }} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-gray-400">
                            15-30 sec script
                          </span>
                          {scriptDirty && canEdit && (
                            <Button
                              size="sm"
                              onClick={handleSaveScript}
                              disabled={saving}
                              className="h-6 text-[10px] px-2"
                            >
                              <SaveIcon style={{ fontSize: 12 }} className="mr-1" />
                              Save
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Multimedia Gallery Section */}
                      {requestImages.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-2.5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="p-1 bg-blue-100 rounded">
                              <CollectionsIcon className="text-blue-600" style={{ fontSize: 14 }} />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-gray-700">Media Gallery</h3>
                              <p className="text-[9px] text-gray-500 leading-none mt-0.5">
                                Drag to options · {requestImages.length} image{requestImages.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
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
                                  sizes="80px"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleImageClick(idx)
                                    }}
                                    className="p-0.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm"
                                    title="View image"
                                  >
                                    <ZoomInIcon style={{ fontSize: 12 }} className="text-gray-700" />
                                  </button>
                                  <DragIndicatorIcon 
                                    className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg" 
                                    style={{ fontSize: 16 }}
                                  />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-0.5 py-px text-center truncate">
                                  {image.source}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No images message */}
                      {requestImages.length === 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                          <CollectionsIcon className="text-gray-300 mb-1" style={{ fontSize: 24 }} />
                          <p className="text-[10px] text-gray-500">No images available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Main Content - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                  <div className="p-4 space-y-3">
                    {/* Booking Request Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <BusinessIcon className="text-gray-400" fontSize="small" />
                          <div>
                            <p className="text-gray-500">Business</p>
                            <p className="font-medium truncate">
                              {campaign.bookingRequest.merchant || campaign.bookingRequest.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CategoryIcon className="text-gray-400" fontSize="small" />
                          <div>
                            <p className="text-gray-500">Category</p>
                            <p className="font-medium truncate">
                              {campaign.bookingRequest.parentCategory || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarTodayIcon className="text-gray-400" fontSize="small" />
                          <div>
                            <p className="text-gray-500">Booked</p>
                            <p className="font-medium">{formatDate(campaign.bookingRequest.processedAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs">
                          <CalendarTodayIcon className="text-orange-400" fontSize="small" />
                          <span className="text-gray-500">Start Date:</span>
                          <span className="font-medium text-orange-600">
                            {formatDate(campaign.bookingRequest.startDate)}
                          </span>
                      </div>
                    </div>

                    {/* Marketing Toggle */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700">Do Marketing?</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleDoMarketing(true)}
                          disabled={!canEdit || saving}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                            campaign.doMarketing
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleToggleDoMarketing(false)}
                          disabled={!canEdit || saving}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                            !campaign.doMarketing
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {/* Skip reason input/display */}
                    {showSkipReason && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800 mb-2">
                          Reason for skipping marketing (optional):
                        </p>
                        <Textarea
                          value={skipReasonInput}
                          onChange={(e) => setSkipReasonInput(e.target.value)}
                          placeholder="Enter reason..."
                          rows={2}
                          className="mb-2 text-xs"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleConfirmNoMarketing} disabled={saving} className="h-7 text-xs">
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowSkipReason(false)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {!campaign.doMarketing && campaign.skipReason && (
                      <div className="p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                        <span className="text-gray-500 mr-2">Reason:</span>
                        <span className="text-gray-700">{campaign.skipReason}</span>
                      </div>
                    )}

                    {/* Progress */}
                    {campaign.doMarketing && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-xs font-semibold text-gray-700">Progress</h3>
                          <span className="text-xs font-medium text-gray-600">
                            {progress.completed}/{progress.planned} completed
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                            style={{
                              width: `${progress.planned > 0 ? (progress.completed / progress.planned) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Marketing Options by Platform */}
                    {campaign.doMarketing && (
                      <div className="space-y-3">
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
                              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                            >
                              {/* Platform Header */}
                              <button
                                onClick={() => togglePlatform(platform)}
                                className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <PlatformIcon platform={platform} />
                                  <span className="font-bold text-gray-800 text-sm">{config.label}</span>
                                  {plannedCount > 0 && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                                      {completedCount}/{plannedCount} done
                                    </span>
                                  )}
                                </div>
                                {isExpanded ? (
                                  <ExpandLessIcon className="text-gray-400" fontSize="small" />
                                ) : (
                                  <ExpandMoreIcon className="text-gray-400" fontSize="small" />
                                )}
                              </button>

                              {/* Platform Options */}
                              {isExpanded && (
                                <div className="p-3 space-y-2">
                                  {platformOptions.map((option) => {
                                    const optionConfig = config.options.find(
                                      (o) => o.type === option.optionType
                                    )
                                    return (
                                      <MarketingOptionCard
                                        key={option.id}
                                        option={option}
                                        optionLabel={optionConfig?.label || option.optionType}
                                        canEdit={canEdit}
                                        saving={saving}
                                        draggingImage={draggingImage}
                                        onTogglePlanned={toggleOptionPlanned}
                                        onToggleCompleted={toggleOptionCompleted}
                                        onUpdateDueDate={updateOptionDueDate}
                                        onUpdateNotes={updateOptionNotes}
                                        onAddAttachment={addAttachment}
                                        onRemoveAttachment={removeAttachment}
                                        onImageDrop={handleImageDropOnOption}
                                      />
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* No Marketing Message */}
                    {!campaign.doMarketing && (
                      <div className="bg-gray-100 rounded-lg border border-gray-200 p-6 text-center">
                        <CampaignIcon className="text-gray-400 mb-2" style={{ fontSize: 36 }} />
                        <p className="text-gray-600 font-medium text-sm">Marketing is disabled</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Enable marketing above to plan and track activities
                        </p>
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
          <div className="border-t border-gray-200 bg-white px-5 py-3 flex justify-between items-center flex-shrink-0">
            <div className="text-[10px] text-gray-500">
              {canEdit
                ? 'You can edit this campaign'
                : 'View-only mode'}
            </div>
            <Button variant="secondary" onClick={onClose} size="sm" className="h-8">
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
