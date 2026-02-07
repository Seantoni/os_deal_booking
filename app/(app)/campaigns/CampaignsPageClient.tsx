'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAllCampaigns, getCampaignWithBusinesses, removeBusinessFromCampaign } from '@/app/actions/campaigns'
import type { SalesCampaign, BusinessCampaign } from '@/types'
import { getCampaignStatus } from '@/types/campaign'
import CampaignIcon from '@mui/icons-material/Campaign'
import RefreshIcon from '@mui/icons-material/Refresh'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SettingsIcon from '@mui/icons-material/Settings'
import toast from 'react-hot-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui'
import { EmptyTableState, SortableTableHeader, type ColumnConfig } from '@/components/shared'
import { TableRow, TableCell } from '@/components/shared/table'

const STATUS_CONFIG = {
  upcoming: { icon: ScheduleIcon, color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-200', label: 'Próxima' },
  active: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50', borderColor: 'border-green-200', label: 'Activa' },
  ended: { icon: HistoryIcon, color: 'text-gray-500', bg: 'bg-gray-100', borderColor: 'border-gray-200', label: 'Finalizada' },
}

// Table columns configuration
const COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Negocio' },
  { key: 'owner', label: 'Owner' },
  { key: 'assignedAt', label: 'Asignado' },
  { key: 'actions', label: '', width: 'w-20' },
]

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface CampaignsPageClientProps {
  initialCampaigns?: SalesCampaign[]
}

export default function CampaignsPageClient({ initialCampaigns = [] }: CampaignsPageClientProps) {
  const router = useRouter()
  const { role, isAdmin } = useUserRole()
  const confirmDialog = useConfirmDialog()
  
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>(initialCampaigns)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    initialCampaigns.length > 0 ? initialCampaigns[0].id : null
  )
  const [selectedCampaignData, setSelectedCampaignData] = useState<(SalesCampaign & { businesses: BusinessCampaign[] }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)

  // Load campaign list
  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAllCampaigns()
      if (result.success && result.data) {
        setCampaigns(result.data)
        // If no campaign selected and we have campaigns, select the first one
        if (!selectedCampaignId && result.data.length > 0) {
          setSelectedCampaignId(result.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
      toast.error('Error al cargar campañas')
    } finally {
      setLoading(false)
    }
  }, [selectedCampaignId])

  // Load selected campaign's businesses
  const loadCampaignBusinesses = useCallback(async (campaignId: string) => {
    setLoadingBusinesses(true)
    try {
      const result = await getCampaignWithBusinesses(campaignId)
      if (result.success && result.data) {
        setSelectedCampaignData(result.data)
      } else {
        toast.error(result.error || 'Error al cargar negocios')
      }
    } catch (error) {
      console.error('Failed to load campaign businesses:', error)
      toast.error('Error al cargar negocios')
    } finally {
      setLoadingBusinesses(false)
    }
  }, [])

  // Load businesses when campaign is selected
  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignBusinesses(selectedCampaignId)
    } else {
      setSelectedCampaignData(null)
    }
  }, [selectedCampaignId, loadCampaignBusinesses])

  // Handle removing a business from campaign
  const handleRemoveBusiness = async (businessCampaign: BusinessCampaign) => {
    if (!selectedCampaignId || !businessCampaign.business) return

    const confirmed = await confirmDialog.confirm({
      title: 'Remover de Campaña',
      message: `¿Está seguro que desea remover "${businessCampaign.business.name}" de esta campaña?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    try {
      const result = await removeBusinessFromCampaign(businessCampaign.businessId, selectedCampaignId)
      if (result.success) {
        toast.success('Negocio removido de la campaña')
        // Reload campaign data
        loadCampaignBusinesses(selectedCampaignId)
        loadCampaigns()
      } else {
        toast.error(result.error || 'Error al remover')
      }
    } catch (error) {
      console.error('Failed to remove business:', error)
      toast.error('Error al remover')
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={loadCampaigns}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} style={{ fontSize: 18 }} />
          </button>
          {isAdmin && (
            <Button
              onClick={() => router.push('/settings?tab=campaigns')}
              variant="secondary"
              size="sm"
              leftIcon={<SettingsIcon style={{ fontSize: 14 }} />}
            >
              Administrar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {campaigns.length > 0 && (
        <div className="bg-white border-b border-gray-200 px-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0.5 -mb-px">
            {campaigns.map((campaign) => {
              const status = getCampaignStatus(campaign)
              const statusConfig = STATUS_CONFIG[status]
              const isSelected = campaign.id === selectedCampaignId

              return (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                    isSelected
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    <statusConfig.icon style={{ fontSize: 12 }} />
                  </span>
                  <span>{campaign.name}</span>
                  <span
                    className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                      isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {campaign.businessCount ?? 0}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {campaigns.length === 0 ? (
          <EmptyTableState
            icon={<CampaignIcon className="w-full h-full" />}
            title="No hay campañas"
            description={isAdmin ? 'Cree campañas desde la configuración para comenzar' : 'No hay campañas disponibles'}
          />
        ) : !selectedCampaign ? (
          <div className="text-center text-gray-500 py-8">
            Seleccione una campaña de las pestañas
          </div>
        ) : (
          <div className="space-y-3">
            {/* Campaign Info Card */}
            <div className={`bg-white rounded-lg border ${STATUS_CONFIG[getCampaignStatus(selectedCampaign)].borderColor} px-3 py-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${STATUS_CONFIG[getCampaignStatus(selectedCampaign)].bg}`}>
                    {(() => {
                      const StatusIcon = STATUS_CONFIG[getCampaignStatus(selectedCampaign)].icon
                      return <StatusIcon className={STATUS_CONFIG[getCampaignStatus(selectedCampaign)].color} style={{ fontSize: 18 }} />
                    })()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">{selectedCampaign.name}</h2>
                    <p className="text-xs text-gray-500">
                      {formatDate(selectedCampaign.runAt)} → {formatDate(selectedCampaign.endAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-base font-semibold text-gray-900">{selectedCampaign.businessCount ?? 0}</div>
                    <div className="text-[10px] text-gray-500">Negocios</div>
                  </div>
                  {(selectedCampaign.minBusinesses || selectedCampaign.maxBusinesses) && (
                    <div className="text-center border-l border-gray-200 pl-3">
                      <div className="text-xs text-gray-700">
                        {selectedCampaign.minBusinesses ?? '-'} / {selectedCampaign.maxBusinesses ?? '-'}
                      </div>
                      <div className="text-[10px] text-gray-500">Mín / Máx</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-[13px] text-left">
                <SortableTableHeader
                  columns={isAdmin ? COLUMNS : COLUMNS.filter(c => c.key !== 'actions')}
                  sortColumn={null}
                  sortDirection="asc"
                  onSort={() => {}}
                />
                <tbody className="divide-y divide-slate-100">
                  {loadingBusinesses ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="px-4 py-6 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshIcon className="animate-spin" style={{ fontSize: 16 }} />
                          Cargando...
                        </div>
                      </td>
                    </tr>
                  ) : !selectedCampaignData?.businesses?.length ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="px-4 py-6 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <BusinessIcon className="text-gray-300" style={{ fontSize: 32 }} />
                          <p className="text-xs">No hay negocios en esta campaña</p>
                          {isAdmin && getCampaignStatus(selectedCampaign) === 'upcoming' && (
                            <Button
                              onClick={() => router.push('/businesses')}
                              size="sm"
                              variant="secondary"
                            >
                              Ir a Negocios
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    selectedCampaignData.businesses.map((bc, index) => (
                      <TableRow
                        key={bc.id}
                        index={index}
                        onClick={() => router.push(`/businesses/${bc.businessId}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <BusinessIcon className="text-gray-400" style={{ fontSize: 16 }} />
                            <span className="font-medium text-gray-900 text-[13px]">
                              {bc.business?.name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {bc.business?.owner ? (
                            <div className="flex items-center gap-1.5">
                              <PersonIcon className="text-gray-400" style={{ fontSize: 14 }} />
                              <span className="text-xs text-gray-600">
                                {bc.business.owner.name || bc.business.owner.email || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500">{formatDate(bc.assignedAt)}</span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => router.push(`/businesses/${bc.businessId}`)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Ver negocio"
                              >
                                <OpenInNewIcon style={{ fontSize: 16 }} />
                              </button>
                              <button
                                onClick={() => handleRemoveBusiness(bc)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remover"
                              >
                                <DeleteIcon style={{ fontSize: 16 }} />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </div>
  )
}
