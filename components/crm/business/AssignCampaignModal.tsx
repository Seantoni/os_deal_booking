'use client'

import { useState, useEffect, useTransition } from 'react'
import CampaignIcon from '@mui/icons-material/Campaign'
import ScheduleIcon from '@mui/icons-material/Schedule'
import BusinessIcon from '@mui/icons-material/Business'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { Button } from '@/components/ui'
import { getUpcomingCampaigns, assignBusinessToCampaigns, getBusinessCampaigns, removeBusinessFromCampaign } from '@/app/actions/campaigns'
import type { SalesCampaign, BusinessCampaign } from '@/types'
import toast from 'react-hot-toast'

interface AssignCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  businessName: string
  onSuccess?: () => void
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AssignCampaignModal({
  isOpen,
  onClose,
  businessId,
  businessName,
  onSuccess,
}: AssignCampaignModalProps) {
  const [isPending, startTransition] = useTransition()
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [existingAssignments, setExistingAssignments] = useState<(BusinessCampaign & { campaign: SalesCampaign })[]>([])
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set())
  const [campaignsToRemove, setCampaignsToRemove] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Load campaigns on open
  useEffect(() => {
    if (!isOpen) return

    async function loadData() {
      setLoading(true)
      try {
        const [campaignsResult, businessCampaignsResult] = await Promise.all([
          getUpcomingCampaigns(),
          getBusinessCampaigns(businessId),
        ])

        if (campaignsResult.success && campaignsResult.data) {
          setCampaigns(campaignsResult.data)
        }

        if (businessCampaignsResult.success && businessCampaignsResult.data) {
          setExistingAssignments(businessCampaignsResult.data as (BusinessCampaign & { campaign: SalesCampaign })[])
        }
      } catch (error) {
        console.error('Failed to load campaigns:', error)
        toast.error('Error al cargar campañas')
      } finally {
        setLoading(false)
      }
    }

    loadData()
    setSelectedCampaignIds(new Set())
    setCampaignsToRemove(new Set())
  }, [isOpen, businessId])

  const handleToggleCampaign = (campaignId: string) => {
    setSelectedCampaignIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }

  const handleToggleRemove = (campaignId: string) => {
    setCampaignsToRemove((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId)
      } else {
        newSet.add(campaignId)
      }
      return newSet
    })
  }

  const handleSave = () => {
    if (selectedCampaignIds.size === 0 && campaignsToRemove.size === 0) {
      toast.error('Seleccione campañas para asignar o remover')
      return
    }

    startTransition(async () => {
      let hasError = false
      let assignedCount = 0
      let removedCount = 0

      // First, remove from campaigns
      for (const campaignId of campaignsToRemove) {
        const result = await removeBusinessFromCampaign(businessId, campaignId)
        if (result.success) {
          removedCount++
        } else {
          hasError = true
          toast.error(result.error || 'Error al remover de campaña')
        }
      }

      // Then, assign to new campaigns
      if (selectedCampaignIds.size > 0) {
        const result = await assignBusinessToCampaigns(businessId, Array.from(selectedCampaignIds))
        if (result.success) {
          assignedCount = selectedCampaignIds.size
        } else {
          hasError = true
          toast.error(result.error || 'Error al asignar')
        }
      }

      if (!hasError || assignedCount > 0 || removedCount > 0) {
        const messages: string[] = []
        if (assignedCount > 0) messages.push(`Asignado a ${assignedCount} campaña(s)`)
        if (removedCount > 0) messages.push(`Removido de ${removedCount} campaña(s)`)
        if (messages.length > 0) toast.success(messages.join('. '))
        onSuccess?.()
        onClose()
      }
    })
  }

  if (!isOpen) return null

  // Get existing campaign IDs for filtering available campaigns
  const existingCampaignIds = new Set(existingAssignments.map((a) => a.campaign.id))
  
  // Filter out campaigns the business is already assigned to
  const availableCampaigns = campaigns.filter((c) => !existingCampaignIds.has(c.id))
  
  // Check if there are any changes to save
  const hasChanges = selectedCampaignIds.size > 0 || campaignsToRemove.size > 0

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <CampaignIcon />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Asignar a Campaña</h3>
              <p className="text-sm text-gray-500 truncate max-w-[280px]">{businessName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-500">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Cargando campañas...</p>
            </div>
          ) : (
            <>
              {/* Existing Assignments Section */}
              {existingAssignments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Campañas asignadas ({existingAssignments.length})
                  </p>
                  <div className="space-y-2">
                    {existingAssignments.map((assignment) => {
                      const isMarkedForRemoval = campaignsToRemove.has(assignment.campaign.id)

                      return (
                        <button
                          key={assignment.id}
                          type="button"
                          onClick={() => handleToggleRemove(assignment.campaign.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                            isMarkedForRemoval
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-green-200 bg-green-50 text-green-700 hover:border-red-200 hover:bg-red-50/50'
                          }`}
                        >
                          {/* Remove indicator */}
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                              isMarkedForRemoval
                                ? 'bg-red-500'
                                : 'bg-green-500'
                            }`}
                          >
                            {isMarkedForRemoval ? (
                              <RemoveCircleIcon className="text-white" style={{ fontSize: 14 }} />
                            ) : (
                              <CheckCircleIcon className="text-white" style={{ fontSize: 14 }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {assignment.campaign.name}
                              {isMarkedForRemoval && (
                                <span className="text-[10px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded">
                                  Remover
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs opacity-75">
                              <span className="flex items-center gap-1">
                                <ScheduleIcon style={{ fontSize: 14 }} />
                                {formatDate(assignment.campaign.runAt)} - {formatDate(assignment.campaign.endAt)}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Campaigns Section */}
              {availableCampaigns.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Campañas disponibles ({availableCampaigns.length})
                  </p>
                  <div className="space-y-2">
                    {availableCampaigns.map((campaign) => {
                      const isSelected = selectedCampaignIds.has(campaign.id)
                      const isAtMax = !!(campaign.maxBusinesses && (campaign.businessCount ?? 0) >= campaign.maxBusinesses)

                      return (
                        <button
                          key={campaign.id}
                          type="button"
                          onClick={() => !isAtMax && handleToggleCampaign(campaign.id)}
                          disabled={isAtMax}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                            isSelected
                              ? 'border-blue-400 bg-blue-50 text-blue-700'
                              : isAtMax
                              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {/* Checkbox indicator */}
                          <div
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : isAtMax
                                ? 'border-gray-300'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <CheckCircleIcon className="text-white" style={{ fontSize: 14 }} />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{campaign.name}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <ScheduleIcon style={{ fontSize: 14 }} />
                                {formatDate(campaign.runAt)} - {formatDate(campaign.endAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <BusinessIcon style={{ fontSize: 14 }} />
                                {campaign.businessCount ?? 0}
                                {campaign.maxBusinesses && ` / ${campaign.maxBusinesses}`}
                              </span>
                            </div>
                            {isAtMax && (
                              <div className="text-xs text-red-500 mt-1">Límite máximo alcanzado</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : existingAssignments.length === 0 ? (
                <div className="py-8 text-center">
                  <CampaignIcon className="text-gray-300 mx-auto mb-2" style={{ fontSize: 40 }} />
                  <p className="text-sm text-gray-500">No hay campañas próximas disponibles</p>
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-gray-500">
                  No hay más campañas disponibles para asignar
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges || loading}
          >
            {isPending ? 'Guardando...' : hasChanges 
              ? `Guardar${selectedCampaignIds.size > 0 ? ` +${selectedCampaignIds.size}` : ''}${campaignsToRemove.size > 0 ? ` -${campaignsToRemove.size}` : ''}`
              : 'Guardar'
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
