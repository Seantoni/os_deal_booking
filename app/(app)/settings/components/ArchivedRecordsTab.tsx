'use client'

import { useCallback, useEffect, useState } from 'react'
import { getArchivedBusinesses, unarchiveBusiness } from '@/app/actions/businesses'
import type { Business } from '@/types'
import { Button, Input } from '@/components/ui'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RefreshIcon from '@mui/icons-material/Refresh'
import RestoreFromTrashIcon from '@mui/icons-material/RestoreFromTrash'
import SearchIcon from '@mui/icons-material/Search'
import toast from 'react-hot-toast'

const PAGE_SIZE = 25

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('es-PA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getOwnerLabel(business: Business): string {
  return business.owner?.name || business.owner?.email || 'Sin propietario'
}

export default function ArchivedRecordsTab() {
  const [archivedBusinesses, setArchivedBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const confirmDialog = useConfirmDialog()

  const loadArchivedBusinesses = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const result = await getArchivedBusinesses({
        page,
        pageSize: PAGE_SIZE,
        query,
      })

      if (result.success && 'data' in result && result.data) {
        setArchivedBusinesses(result.data)
        setTotal(('total' in result && typeof result.total === 'number') ? result.total : result.data.length)
        setTotalPages(('totalPages' in result && typeof result.totalPages === 'number') ? result.totalPages : 1)
      } else {
        const message = 'error' in result && result.error
          ? result.error
          : 'No se pudieron cargar los registros archivados'
        toast.error(message)
      }
    } catch (error) {
      console.error('Failed to load archived businesses:', error)
      toast.error('No se pudieron cargar los registros archivados')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, query])

  useEffect(() => {
    loadArchivedBusinesses()
  }, [loadArchivedBusinesses])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(0)
    setQuery(queryInput.trim())
  }

  const handleClearSearch = () => {
    setQueryInput('')
    setQuery('')
    setPage(0)
  }

  const handleUnarchive = async (business: Business) => {
    const confirmed = await confirmDialog.confirm({
      title: 'Restaurar negocio',
      message: `¿Desea restaurar "${business.name}"? Volverá a aparecer en los listados activos.`,
      confirmText: 'Restaurar',
      cancelText: 'Cancelar',
      confirmVariant: 'primary',
    })

    if (!confirmed) return

    setRestoringId(business.id)
    try {
      const result = await unarchiveBusiness(business.id)
      if (result.success) {
        toast.success('Negocio restaurado')
        if (archivedBusinesses.length === 1 && page > 0) {
          setPage(prev => prev - 1)
        } else {
          await loadArchivedBusinesses()
        }
      } else {
        const message = 'error' in result && result.error
          ? result.error
          : 'No se pudo restaurar el negocio'
        toast.error(message)
      }
    } catch (error) {
      console.error('Failed to unarchive business:', error)
      toast.error('No se pudo restaurar el negocio')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <p className="text-xs text-amber-900">
          Papelera de negocios archivados. Al restaurar un negocio vuelve a los listados activos sin perder historial.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <DeleteSweepIcon style={{ fontSize: 18 }} className="text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Registros Archivados</h3>
            <span className="text-xs text-gray-500">({total})</span>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Buscar negocio..."
                size="sm"
                leftIcon={<SearchIcon style={{ fontSize: 14 }} />}
                className="w-52"
              />
              <Button type="submit" size="sm" variant="secondary">
                Buscar
              </Button>
              {(query || queryInput) && (
                <Button type="button" size="sm" variant="ghost" onClick={handleClearSearch}>
                  Limpiar
                </Button>
              )}
            </form>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => loadArchivedBusinesses(true)}
              disabled={refreshing}
              leftIcon={<RefreshIcon style={{ fontSize: 16 }} className={refreshing ? 'animate-spin' : ''} />}
            >
              Actualizar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Negocio</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Propietario</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Equipo</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Archivado</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Archivado por</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    Cargando registros archivados...
                  </td>
                </tr>
              ) : archivedBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No hay negocios archivados
                  </td>
                </tr>
              ) : (
                archivedBusinesses.map((business) => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-[11px] text-gray-900 font-medium">{business.name}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-700">{getOwnerLabel(business)}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-700">{business.salesTeam || '-'}</td>
                    <td className="px-3 py-2 text-[11px] text-gray-500">
                      {formatDateTime(business.reassignmentRequestedAt || business.updatedAt)}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-gray-500">{business.reassignmentRequestedBy || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnarchive(business)}
                        disabled={restoringId === business.id}
                        leftIcon={<RestoreFromTrashIcon style={{ fontSize: 16 }} />}
                      >
                        Restaurar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              Página {page + 1} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0 || loading}
                onClick={() => setPage(prev => Math.max(0, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page + 1 >= totalPages || loading}
                onClick={() => setPage(prev => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

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
