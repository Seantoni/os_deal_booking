'use client'

import { useState, useMemo } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import CampaignIcon from '@mui/icons-material/Campaign'
import InstagramIcon from '@mui/icons-material/Instagram'
import BusinessIcon from '@mui/icons-material/Business'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox'
import { Button } from '@/components/ui'
import { useModalEscape } from '@/hooks/useModalEscape'
import { MARKETING_OPTIONS_CONFIG } from '@/lib/constants/marketing'
import { batchUpdateMarketingOptions } from '@/app/actions/marketing'
import toast from 'react-hot-toast'

interface MarketingSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignName: string
  options: Array<{
    id: string
    platform: string
    optionType: string
    isPlanned: boolean
  }>
  onComplete: () => void // Called after saving to open the campaign modal
}

// Platform icon mapping
const PlatformIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon className="text-pink-500" style={{ fontSize: 20 }} />
    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 text-gray-900"
          fill="currentColor"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      )
    case 'ofertasimple':
      return <BusinessIcon className="text-orange-500" style={{ fontSize: 20 }} />
    default:
      return <CampaignIcon className="text-gray-500" style={{ fontSize: 20 }} />
  }
}

export default function MarketingSelectionModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  options,
  onComplete,
}: MarketingSelectionModalProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Group options by platform
  const optionsByPlatform = useMemo(() => {
    const grouped: Record<string, typeof options> = {}
    for (const option of options) {
      if (!grouped[option.platform]) {
        grouped[option.platform] = []
      }
      grouped[option.platform].push(option)
    }
    return grouped
  }, [options])

  // Check if all options in a platform are selected
  const isPlatformAllSelected = (platform: string) => {
    const platformOptions = optionsByPlatform[platform] || []
    return platformOptions.every(opt => selectedOptions.has(opt.id))
  }

  // Check if some (but not all) options in a platform are selected
  const isPlatformPartiallySelected = (platform: string) => {
    const platformOptions = optionsByPlatform[platform] || []
    const selectedCount = platformOptions.filter(opt => selectedOptions.has(opt.id)).length
    return selectedCount > 0 && selectedCount < platformOptions.length
  }

  // Toggle a single option
  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }

  // Toggle all options in a platform
  const togglePlatform = (platform: string) => {
    const platformOptions = optionsByPlatform[platform] || []
    const allSelected = isPlatformAllSelected(platform)
    
    setSelectedOptions(prev => {
      const next = new Set(prev)
      if (allSelected) {
        // Deselect all
        for (const opt of platformOptions) {
          next.delete(opt.id)
        }
      } else {
        // Select all
        for (const opt of platformOptions) {
          next.add(opt.id)
        }
      }
      return next
    })
  }

  // Handle save
  const handleSave = async () => {
    if (selectedOptions.size === 0) {
      toast.error('Selecciona al menos una opción')
      return
    }

    setSaving(true)
    try {
      const result = await batchUpdateMarketingOptions(
        Array.from(selectedOptions),
        { isPlanned: true }
      )

      if (result.success) {
        toast.success('Opciones guardadas correctamente')
        onComplete()
      } else {
        toast.error(result.error || 'Error al guardar las opciones')
      }
    } catch (error) {
      toast.error('Error al guardar las opciones')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none">
        <div
          className={`w-full max-w-lg bg-white shadow-2xl rounded-xl flex flex-col max-h-[85vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-3 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg border border-orange-200">
                  <CampaignIcon className="text-orange-600" style={{ fontSize: 20 }} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 leading-tight">
                    Seleccionar Opciones
                  </h2>
                  <p className="text-sm text-gray-500">{campaignName}</p>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Platform Sections */}
            {Object.entries(MARKETING_OPTIONS_CONFIG).map(([platform, config]) => {
              const platformOptions = optionsByPlatform[platform] || []
              const allSelected = isPlatformAllSelected(platform)
              const partiallySelected = isPlatformPartiallySelected(platform)

              return (
                <div
                  key={platform}
                  className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Platform Header */}
                  <button
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-gray-400">
                      {allSelected ? (
                        <CheckBoxIcon className="text-blue-600" style={{ fontSize: 20 }} />
                      ) : partiallySelected ? (
                        <IndeterminateCheckBoxIcon className="text-blue-600" style={{ fontSize: 20 }} />
                      ) : (
                        <CheckBoxOutlineBlankIcon style={{ fontSize: 20 }} />
                      )}
                    </div>
                    <PlatformIcon platform={platform} />
                    <span className="text-base font-semibold text-gray-800">{config.label}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {platformOptions.filter(opt => selectedOptions.has(opt.id)).length}/{platformOptions.length}
                    </span>
                  </button>

                  {/* Platform Options */}
                  <div className="border-t border-gray-200 bg-white">
                    {platformOptions.map(option => {
                      const optionConfig = config.options.find(o => o.type === option.optionType)
                      const isSelected = selectedOptions.has(option.id)

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(option.id)}
                          className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="w-4" /> {/* Spacer for alignment */}
                          <div className="text-gray-400">
                            {isSelected ? (
                              <CheckBoxIcon className="text-blue-600" style={{ fontSize: 18 }} />
                            ) : (
                              <CheckBoxOutlineBlankIcon style={{ fontSize: 18 }} />
                            )}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                            {optionConfig?.label || option.optionType}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white px-3 py-2 flex justify-between items-center flex-shrink-0">
            <span className="text-sm text-gray-500">
              {selectedOptions.size} seleccionada{selectedOptions.size !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} size="sm" disabled={saving} className="text-sm px-3 py-1.5 h-7">
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={saving || selectedOptions.size === 0}
                loading={saving}
                className="text-sm px-3 py-1.5 h-7"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

