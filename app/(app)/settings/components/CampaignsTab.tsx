'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllCampaigns, createCampaign, updateCampaign, deleteCampaign } from '@/app/actions/campaigns'
import type { SalesCampaign } from '@/types'
import { getCampaignStatus } from '@/types/campaign'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CampaignIcon from '@mui/icons-material/Campaign'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import HistoryIcon from '@mui/icons-material/History'
import BusinessIcon from '@mui/icons-material/Business'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui'

const STATUS_CONFIG = {
  upcoming: { icon: ScheduleIcon, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Próxima' },
  active: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50', label: 'Activa' },
  ended: { icon: HistoryIcon, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Finalizada' },
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

interface CampaignFormData {
  name: string
  runAt: string
  endAt: string
  minBusinesses: string
  maxBusinesses: string
}

const EMPTY_FORM: CampaignFormData = {
  name: '',
  runAt: '',
  endAt: '',
  minBusinesses: '',
  maxBusinesses: '',
}

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<SalesCampaign | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const confirmDialog = useConfirmDialog()

  const loadCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAllCampaigns()
      if (result.success && result.data) {
        setCampaigns(result.data)
      } else {
        toast.error(result.error || 'Error al cargar campañas')
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error)
      toast.error('Error al cargar campañas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  const handleOpenCreate = () => {
    setEditingCampaign(null)
    setFormData(EMPTY_FORM)
    setShowForm(true)
  }

  const handleOpenEdit = (campaign: SalesCampaign) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.name,
      runAt: formatDateForInput(campaign.runAt),
      endAt: formatDateForInput(campaign.endAt),
      minBusinesses: campaign.minBusinesses?.toString() || '',
      maxBusinesses: campaign.maxBusinesses?.toString() || '',
    })
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingCampaign(null)
    setFormData(EMPTY_FORM)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!formData.runAt) {
      toast.error('La fecha de inicio es requerida')
      return
    }
    if (!formData.endAt) {
      toast.error('La fecha de fin es requerida')
      return
    }

    setSaving(true)
    try {
      const data = {
        name: formData.name.trim(),
        runAt: new Date(formData.runAt),
        endAt: new Date(formData.endAt),
        minBusinesses: formData.minBusinesses ? parseInt(formData.minBusinesses, 10) : null,
        maxBusinesses: formData.maxBusinesses ? parseInt(formData.maxBusinesses, 10) : null,
      }

      if (editingCampaign) {
        const result = await updateCampaign(editingCampaign.id, data)
        if (result.success) {
          toast.success('Campaña actualizada')
          handleCloseForm()
          loadCampaigns()
        } else {
          toast.error(result.error || 'Error al actualizar')
        }
      } else {
        const result = await createCampaign(data)
        if (result.success) {
          toast.success('Campaña creada')
          handleCloseForm()
          loadCampaigns()
        } else {
          toast.error(result.error || 'Error al crear')
        }
      }
    } catch (error) {
      console.error('Failed to save campaign:', error)
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (campaign: SalesCampaign) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Campaña',
      message: `¿Está seguro que desea eliminar la campaña "${campaign.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    try {
      const result = await deleteCampaign(campaign.id)
      if (result.success) {
        toast.success('Campaña eliminada')
        loadCampaigns()
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error)
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CampaignIcon className="text-blue-600" />
            Campañas de Ventas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestione campañas para agrupar y organizar negocios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCampaigns}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} style={{ fontSize: 20 }} />
          </button>
          <Button onClick={handleOpenCreate} size="sm" leftIcon={<AddIcon style={{ fontSize: 18 }} />}>
            Nueva Campaña
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CampaignIcon className="text-blue-600" />
                {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Ej: Campaña Febrero 2026"
                    required
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.runAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, runAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, endAt: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Business Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mín. Negocios
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minBusinesses}
                      onChange={(e) => setFormData(prev => ({ ...prev, minBusinesses: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máx. Negocios
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxBusinesses}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxBusinesses: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : editingCampaign ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaigns Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campaña
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fechas
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Negocios
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Límites
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshIcon className="animate-spin" style={{ fontSize: 18 }} />
                    Cargando...
                  </div>
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <CampaignIcon className="text-gray-300" style={{ fontSize: 40 }} />
                    <p>No hay campañas creadas</p>
                    <Button onClick={handleOpenCreate} size="sm" variant="secondary">
                      Crear primera campaña
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const status = getCampaignStatus(campaign)
                const statusConfig = STATUS_CONFIG[status]
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.color}`}
                      >
                        <StatusIcon style={{ fontSize: 14 }} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(campaign.runAt)} → {formatDate(campaign.endAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <BusinessIcon style={{ fontSize: 16 }} className="text-gray-400" />
                        {campaign.businessCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {campaign.minBusinesses || campaign.maxBusinesses ? (
                        <span>
                          {campaign.minBusinesses ?? '-'} / {campaign.maxBusinesses ?? '-'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(campaign)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <EditIcon style={{ fontSize: 18 }} />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign)}
                          disabled={(campaign.businessCount ?? 0) > 0}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={(campaign.businessCount ?? 0) > 0 ? 'No se puede eliminar con negocios asignados' : 'Eliminar'}
                        >
                          <DeleteIcon style={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <strong>Notas:</strong>
        <ul className="mt-1 ml-4 list-disc">
          <li>Las campañas <strong>Próximas</strong> pueden recibir negocios asignados desde la página de Negocios.</li>
          <li>Una campaña no puede eliminarse si tiene negocios asignados.</li>
          <li>Los límites mínimo y máximo de negocios son opcionales.</li>
        </ul>
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
