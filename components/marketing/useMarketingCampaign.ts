'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getMarketingCampaign, 
  updateMarketingCampaign, 
  updateMarketingOption,
  addMarketingOptionAttachment,
  removeMarketingOptionAttachment,
} from '@/app/actions/marketing'
import { MARKETING_OPTIONS_CONFIG } from '@/lib/constants/marketing'
import toast from 'react-hot-toast'

// Define types inline to avoid Prisma client regeneration issues
interface MarketingOption {
  id: string
  campaignId: string
  platform: string
  optionType: string
  isPlanned: boolean
  isCompleted: boolean
  dueDate: Date | null
  completedAt: Date | null
  completedBy: string | null
  notes: string | null
  notesUpdatedBy: string | null
  notesUpdatedAt: Date | null
  mediaUrls: unknown
  createdAt: Date
  updatedAt: Date
}

interface MarketingCampaign {
  id: string
  bookingRequestId: string
  doMarketing: boolean
  skipReason: string | null
  generatedCopy: string | null
  videoScript: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
}

// Types for booking request images
interface PricingOption {
  title?: string
  description?: string
  price?: string
  realValue?: string
  quantity?: string
  imageUrl?: string
}

interface DealImage {
  url: string
  order: number
}

interface MarketingCampaignWithRelations extends MarketingCampaign {
  bookingRequest: {
    id: string
    name: string
    merchant: string | null
    businessEmail: string
    parentCategory: string | null
    subCategory1: string | null
    subCategory2: string | null
    startDate: Date
    endDate: Date
    status: string
    processedAt: Date | null
    userId: string
    whatWeLike: string | null
    aboutCompany: string | null
    aboutOffer: string | null
    goodToKnow: string | null
    socialMedia: string | null
    pricingOptions: PricingOption[] | null
    dealImages: DealImage[] | null
  }
  options: Array<MarketingOption & {
    completedByUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
    notesUpdatedByUser?: {
      clerkId: string
      name: string | null
      email: string | null
    } | null
  }>
}

interface UseMarketingCampaignOptions {
  campaignId: string | null
  isOpen: boolean
  onSuccess?: () => void
}

export function useMarketingCampaign({ campaignId, isOpen, onSuccess }: UseMarketingCampaignOptions) {
  const [campaign, setCampaign] = useState<MarketingCampaignWithRelations | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load campaign data
  const loadCampaign = useCallback(async () => {
    if (!campaignId || !isOpen) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await getMarketingCampaign(campaignId)
      if (result.success && result.data) {
        setCampaign(result.data as MarketingCampaignWithRelations)
      } else {
        setError(result.error || 'Failed to load campaign')
      }
    } catch (err) {
      setError('An error occurred loading the campaign')
    } finally {
      setLoading(false)
    }
  }, [campaignId, isOpen])

  useEffect(() => {
    if (isOpen && campaignId) {
      loadCampaign()
    } else {
      setCampaign(null)
      setError(null)
    }
  }, [isOpen, campaignId, loadCampaign])

  // State for AI generation
  const [generatingCopy, setGeneratingCopy] = useState(false)
  const [generatingScript, setGeneratingScript] = useState(false)

  // Toggle doMarketing
  const toggleDoMarketing = useCallback(async (doMarketing: boolean, skipReason?: string) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await updateMarketingCampaign(campaign.id, {
        doMarketing,
        skipReason: doMarketing ? null : skipReason,
      })
      
      if (result.success) {
        setCampaign(prev => prev ? { ...prev, doMarketing, skipReason: doMarketing ? null : skipReason || null } : null)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update campaign')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Update generated copy
  const updateGeneratedCopy = useCallback(async (generatedCopy: string | null) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await updateMarketingCampaign(campaign.id, { generatedCopy })
      
      if (result.success) {
        setCampaign(prev => prev ? { ...prev, generatedCopy } : null)
        toast.success('Copy saved')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save copy')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Generate AI copy
  const generateAICopy = useCallback(async () => {
    if (!campaign) return
    
    setGeneratingCopy(true)
    try {
      const { bookingRequest } = campaign
      const pricingOptions = bookingRequest.pricingOptions as PricingOption[] | null
      
      const response = await fetch('/api/ai/generate-marketing-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            businessName: bookingRequest.merchant || bookingRequest.name,
            category: [
              bookingRequest.parentCategory,
              bookingRequest.subCategory1,
              bookingRequest.subCategory2,
            ].filter(Boolean).join(' > '),
            whatWeLike: bookingRequest.whatWeLike,
            aboutCompany: bookingRequest.aboutCompany,
            aboutOffer: bookingRequest.aboutOffer,
            socialMedia: bookingRequest.socialMedia,
            pricingOptions: pricingOptions?.map(opt => ({
              title: opt.title,
              description: opt.description,
              price: opt.price,
              realValue: opt.realValue,
            })),
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate copy')
      
      const data = await response.json()
      
      if (data.copy) {
        // Save the generated copy
        await updateGeneratedCopy(data.copy)
      }
    } catch (err) {
      toast.error('Failed to generate copy')
    } finally {
      setGeneratingCopy(false)
    }
  }, [campaign, updateGeneratedCopy])

  // Update video script
  const updateVideoScript = useCallback(async (videoScript: string | null) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await updateMarketingCampaign(campaign.id, { videoScript })
      
      if (result.success) {
        setCampaign(prev => prev ? { ...prev, videoScript } : null)
        toast.success('Video script saved')
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save video script')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Generate AI video script
  const generateAIVideoScript = useCallback(async () => {
    if (!campaign) return
    
    setGeneratingScript(true)
    try {
      const { bookingRequest } = campaign
      const pricingOptions = bookingRequest.pricingOptions as PricingOption[] | null
      
      const response = await fetch('/api/ai/generate-video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            businessName: bookingRequest.merchant || bookingRequest.name,
            category: [
              bookingRequest.parentCategory,
              bookingRequest.subCategory1,
              bookingRequest.subCategory2,
            ].filter(Boolean).join(' > '),
            whatWeLike: bookingRequest.whatWeLike,
            aboutCompany: bookingRequest.aboutCompany,
            aboutOffer: bookingRequest.aboutOffer,
            goodToKnow: bookingRequest.goodToKnow,
            socialMedia: bookingRequest.socialMedia,
            pricingOptions: pricingOptions?.map(opt => ({
              title: opt.title,
              description: opt.description,
              price: opt.price,
              realValue: opt.realValue,
            })),
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to generate video script')
      
      const data = await response.json()
      
      if (data.script) {
        // Save the generated script
        await updateVideoScript(data.script)
      }
    } catch (err) {
      toast.error('Failed to generate video script')
    } finally {
      setGeneratingScript(false)
    }
  }, [campaign, updateVideoScript])

  // Toggle option planned status
  const toggleOptionPlanned = useCallback(async (optionId: string, isPlanned: boolean) => {
    if (!campaign) return
    
    // Optimistic update
    setCampaign(prev => {
      if (!prev) return null
      return {
        ...prev,
        options: prev.options.map(opt =>
          opt.id === optionId ? { ...opt, isPlanned } : opt
        ),
      }
    })
    
    try {
      const result = await updateMarketingOption(optionId, { isPlanned })
      if (!result.success) {
        // Revert optimistic update
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt =>
              opt.id === optionId ? { ...opt, isPlanned: !isPlanned } : opt
            ),
          }
        })
        toast.error(result.error || 'Failed to update option')
      } else {
        onSuccess?.()
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }, [campaign, onSuccess])

  // Toggle option completed status
  const toggleOptionCompleted = useCallback(async (optionId: string, isCompleted: boolean) => {
    if (!campaign) return
    
    // Optimistic update
    setCampaign(prev => {
      if (!prev) return null
      return {
        ...prev,
        options: prev.options.map(opt =>
          opt.id === optionId ? { ...opt, isCompleted, completedAt: isCompleted ? new Date() : null } : opt
        ),
      }
    })
    
    try {
      const result = await updateMarketingOption(optionId, { isCompleted })
      if (!result.success) {
        // Revert optimistic update
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt =>
              opt.id === optionId ? { ...opt, isCompleted: !isCompleted, completedAt: null } : opt
            ),
          }
        })
        toast.error(result.error || 'Failed to update option')
      } else {
        onSuccess?.()
      }
    } catch (err) {
      toast.error('An error occurred')
    }
  }, [campaign, onSuccess])

  // Update option due date
  const updateOptionDueDate = useCallback(async (optionId: string, dueDate: Date | null) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await updateMarketingOption(optionId, { dueDate })
      if (result.success) {
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt =>
              opt.id === optionId ? { ...opt, dueDate } : opt
            ),
          }
        })
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update due date')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Update option notes
  const updateOptionNotes = useCallback(async (optionId: string, notes: string | null) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await updateMarketingOption(optionId, { notes })
      if (result.success) {
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt =>
              opt.id === optionId ? { ...opt, notes } : opt
            ),
          }
        })
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update notes')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Add attachment to option
  const addAttachment = useCallback(async (optionId: string, url: string) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await addMarketingOptionAttachment(optionId, url)
      if (result.success) {
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt => {
              if (opt.id === optionId) {
                const currentUrls = (opt.mediaUrls as string[]) || []
                return { ...opt, mediaUrls: [...currentUrls, url] }
              }
              return opt
            }),
          }
        })
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to add attachment')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Remove attachment from option
  const removeAttachment = useCallback(async (optionId: string, url: string) => {
    if (!campaign) return
    
    setSaving(true)
    try {
      const result = await removeMarketingOptionAttachment(optionId, url)
      if (result.success) {
        setCampaign(prev => {
          if (!prev) return null
          return {
            ...prev,
            options: prev.options.map(opt => {
              if (opt.id === optionId) {
                const currentUrls = (opt.mediaUrls as string[]) || []
                return { ...opt, mediaUrls: currentUrls.filter(u => u !== url) }
              }
              return opt
            }),
          }
        })
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to remove attachment')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setSaving(false)
    }
  }, [campaign, onSuccess])

  // Group options by platform
  const optionsByPlatform = campaign?.options.reduce((acc, option) => {
    if (!acc[option.platform]) {
      acc[option.platform] = []
    }
    acc[option.platform].push(option)
    return acc
  }, {} as Record<string, typeof campaign.options>) || {}

  // Calculate progress
  const progress = campaign ? {
    planned: campaign.options.filter(o => o.isPlanned).length,
    completed: campaign.options.filter(o => o.isPlanned && o.isCompleted).length,
    total: campaign.options.length,
  } : { planned: 0, completed: 0, total: 0 }

  // Extract all images from booking request
  const requestImages = campaign ? (() => {
    const images: Array<{ url: string; source: string; order: number }> = []
    
    // Get images from pricing options
    const pricingOptions = campaign.bookingRequest.pricingOptions as PricingOption[] | null
    if (pricingOptions) {
      pricingOptions.forEach((opt, idx) => {
        if (opt.imageUrl) {
          images.push({
            url: opt.imageUrl,
            source: `Opción ${idx + 1}`,
            order: idx,
          })
        }
      })
    }
    
    // Get images from deal gallery
    const dealImages = campaign.bookingRequest.dealImages as DealImage[] | null
    if (dealImages) {
      dealImages.sort((a, b) => a.order - b.order).forEach((img, idx) => {
        images.push({
          url: img.url,
          source: 'Galería',
          order: 100 + idx, // Offset to keep gallery images after pricing options
        })
      })
    }
    
    return images
  })() : []

  return {
    campaign,
    loading,
    saving,
    error,
    optionsByPlatform,
    progress,
    platformConfig: MARKETING_OPTIONS_CONFIG,
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
    refresh: loadCampaign,
  }
}

