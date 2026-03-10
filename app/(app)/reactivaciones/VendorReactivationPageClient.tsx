'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ReplayCircleFilledIcon from '@mui/icons-material/ReplayCircleFilled'
import SendIcon from '@mui/icons-material/Send'
import StorefrontIcon from '@mui/icons-material/Storefront'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import { Input } from '@/components/ui'
import { FilterTabs, SortableTableHeader, type ColumnConfig } from '@/components/shared'
import { TableCell, TableRow } from '@/components/shared/table'
import { usePaginatedSearch } from '@/hooks/usePaginatedSearch'
import { useBusinessApprovedRequestAging } from '@/hooks/useBusinessApprovedRequestAging'
import { formatShortDate } from '@/lib/date'
import { getBusinessProjectionSummaryMap } from '@/app/actions/revenue-projections'
import {
  getVendorReactivationCounts,
  getVendorReactivationDealsPaginated,
  searchVendorReactivationDeals,
  sendVendorReactivationEmailNow,
  setVendorReactivationEligibility,
  type VendorReactivationDealRow,
} from '@/app/actions/vendor-reactivation'
import type { ProjectionEntitySummary } from '@/lib/projections/summary'
import toast from 'react-hot-toast'

type EligibilityTab = 'all' | 'eligible' | 'ineligible'
type StatusFilter = 'all' | 'active' | 'ended'

const COLUMNS: ColumnConfig[] = [
  { key: 'externalDealId', label: 'Deal', sortable: true },
  { key: 'businessName', label: 'Negocio', sortable: true },
  { key: 'quantitySold', label: 'Vendidos', sortable: true, align: 'right' },
  { key: 'netRevenue', label: 'Ingreso', sortable: true, align: 'right' },
  { key: 'margin', label: 'Comisión', sortable: true, align: 'right' },
  { key: 'daysSinceSent', label: 'Días desde envío', align: 'right' },
  { key: 'projectedRevenue', label: 'Proyección', align: 'right' },
  { key: 'runAt', label: 'Inicio', sortable: true },
  { key: 'endAt', label: 'Fin', sortable: true },
  { key: 'eligible', label: 'Pool', sortable: true },
  { key: 'actions', label: '', align: 'right' },
]

function getProjectionSourceLabel(source: ProjectionEntitySummary['projectionSource']) {
  switch (source) {
    case 'actual_deal':
      return 'Actual'
    case 'business_history':
      return 'Histórico'
    case 'category_benchmark':
      return 'Categoría'
    default:
      return 'Sin datos'
  }
}

function isDealActive(row: Pick<VendorReactivationDealRow, 'runAt' | 'endAt'>) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const started = row.runAt ? new Date(row.runAt) <= now : false
  const notEnded = row.endAt ? new Date(row.endAt) >= today : false
  return started && notEnded
}

interface VendorReactivationPageClientProps {
  initialDeals: VendorReactivationDealRow[]
  initialTotal: number
  initialCounts?: Record<string, number>
}

export default function VendorReactivationPageClient({
  initialDeals,
  initialTotal,
  initialCounts,
}: VendorReactivationPageClientProps) {
  const [eligibilityTab, setEligibilityTab] = useState<EligibilityTab>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [projectionSummaryMap, setProjectionSummaryMap] = useState<Record<string, ProjectionEntitySummary>>({})
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null)
  const [sendPendingBusinessId, setSendPendingBusinessId] = useState<string | null>(null)
  const [isToggling, startToggleTransition] = useTransition()

  const {
    data: deals,
    setData: setDeals,
    searchResults,
    loading,
    searchLoading,
    searchQuery,
    handleSearchChange,
    sortColumn,
    sortDirection,
    handleSort,
    updateFilter,
    counts,
    PaginationControls,
    SearchIndicator,
  } = usePaginatedSearch<VendorReactivationDealRow>({
    fetchPaginated: getVendorReactivationDealsPaginated,
    searchFn: searchVendorReactivationDeals,
    fetchCounts: getVendorReactivationCounts,
    initialData: initialDeals,
    initialTotal,
    initialCounts,
    pageSize: 50,
    defaultSortBy: 'netRevenue',
    defaultSortDirection: 'desc',
    entityName: 'deals de reactivacion',
  })

  useEffect(() => {
    updateFilter('eligibilityFilter', eligibilityTab === 'all' ? undefined : eligibilityTab)
  }, [eligibilityTab, updateFilter])

  useEffect(() => {
    updateFilter('statusFilter', statusFilter === 'all' ? undefined : statusFilter)
  }, [statusFilter, updateFilter])

  const displayDeals = searchResults !== null ? searchResults : deals
  const businessIds = useMemo(
    () => [...new Set(displayDeals.map((deal) => deal.businessId).filter(Boolean))] as string[],
    [displayDeals]
  )
  const { data: sentAgingMap } = useBusinessApprovedRequestAging(businessIds)

  useEffect(() => {
    let cancelled = false

    async function loadProjectionSummaries() {
      if (businessIds.length === 0) {
        setProjectionSummaryMap({})
        return
      }

      const result = await getBusinessProjectionSummaryMap(businessIds)
      if (cancelled) return

      if (result.success && result.data) {
        setProjectionSummaryMap(result.data)
      } else {
        setProjectionSummaryMap({})
      }
    }

    void loadProjectionSummaries()

    return () => {
      cancelled = true
    }
  }, [businessIds])

  const handleToggleEligibility = (deal: VendorReactivationDealRow) => {
    if (togglePendingId === deal.externalDealId) return

    const nextEligible = !deal.vendorReactivateEligible
    setTogglePendingId(deal.externalDealId)
    setDeals((currentDeals) =>
      currentDeals.map((currentDeal) =>
        currentDeal.externalDealId === deal.externalDealId
          ? {
              ...currentDeal,
              vendorReactivateEligible: nextEligible,
              vendorReactivateEligibleAt: nextEligible ? new Date() : null,
            }
          : currentDeal
      )
    )

    startToggleTransition(async () => {
      const result = await setVendorReactivationEligibility(deal.externalDealId, nextEligible)

      if (!result.success) {
        setDeals((currentDeals) =>
          currentDeals.map((currentDeal) =>
            currentDeal.externalDealId === deal.externalDealId
              ? { ...currentDeal, vendorReactivateEligible: deal.vendorReactivateEligible }
              : currentDeal
          )
        )
        toast.error(result.error || 'No se pudo actualizar el pool de reactivación')
      } else {
        toast.success(nextEligible ? 'Deal agregado al pool' : 'Deal removido del pool')
      }

      setTogglePendingId(null)
    })
  }

  const handleSendNow = (deal: VendorReactivationDealRow) => {
    if (!deal.businessId || sendPendingBusinessId === deal.businessId) return

    setSendPendingBusinessId(deal.businessId)

    startToggleTransition(async () => {
      const result = await sendVendorReactivationEmailNow(deal.businessId!)

      if (!result.success) {
        toast.error(result.error || 'No se pudo enviar la reactivación')
      } else {
        const dealsCount = result.data?.dealsCount || 0
        toast.success(
          dealsCount > 0
            ? `Email enviado ahora con ${dealsCount} ${dealsCount === 1 ? 'deal' : 'deals'}`
            : 'Email enviado ahora'
        )
      }

      setSendPendingBusinessId(null)
    })
  }

  const displayCounts = counts && Object.keys(counts).length > 0
    ? counts
    : {
        all: displayDeals.length,
        eligible: displayDeals.filter((deal) => deal.vendorReactivateEligible).length,
        ineligible: displayDeals.filter((deal) => !deal.vendorReactivateEligible).length,
      }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Buscar deal, negocio o vendor..."
                size="sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="ended">Finalizados</option>
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <FilterTabs
              items={[
                { id: 'all', label: 'Todos', count: displayCounts.all || 0 },
                { id: 'eligible', label: 'En Pool', count: displayCounts.eligible || 0 },
                { id: 'ineligible', label: 'Fuera', count: displayCounts.ineligible || 0 },
              ]}
              activeId={eligibilityTab}
              onChange={(id) => setEligibilityTab(id as EligibilityTab)}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading || searchLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-500 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            {searchLoading ? 'Buscando deals...' : 'Cargando deals...'}
          </div>
        ) : displayDeals.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
            <ReplayCircleFilledIcon className="mx-auto mb-3 text-gray-300" style={{ fontSize: 40 }} />
            <p className="text-sm font-medium text-gray-900">No se encontraron deals para reactivación</p>
            <p className="text-xs text-gray-500 mt-1">Ajusta la búsqueda o cambia los filtros.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <SearchIndicator />
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <SortableTableHeader
                  columns={COLUMNS}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
                <tbody className="divide-y divide-gray-100">
                  {displayDeals.map((deal, index) => {
                    const projection = deal.businessId ? projectionSummaryMap[deal.businessId] : null
                    const sentAging = deal.businessId ? sentAgingMap[deal.businessId] : null
                    const active = isDealActive(deal)

                    return (
                      <TableRow key={deal.id} index={index}>
                        <TableCell>
                          <div className="min-w-[220px]">
                            <p className="font-medium text-gray-900">
                              {deal.dealName ? `${deal.externalDealId} - ${deal.dealName}` : deal.externalDealId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {active ? 'Activo' : 'Finalizado'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {deal.businessId && deal.businessName ? (
                            <a
                              href={`/businesses/${deal.businessId}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <StorefrontIcon style={{ fontSize: 14 }} />
                              <span>{deal.businessName}</span>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">{deal.externalVendorId || 'Sin negocio'}</span>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <span className="font-medium">{deal.quantitySold.toLocaleString()}</span>
                        </TableCell>
                        <TableCell align="right">
                          <span className="font-medium text-emerald-700">
                            ${deal.netRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <span className="font-medium text-blue-700">
                            {deal.margin.toLocaleString('en-US', { maximumFractionDigits: 0 })}%
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          {sentAging?.daysSinceLastSent !== null && sentAging?.daysSinceLastSent !== undefined ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="font-medium text-gray-900">
                                {sentAging.daysSinceLastSent}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {sentAging.lastSentAt ? formatShortDate(sentAging.lastSentAt) : '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {projection ? (
                            <div className="flex flex-col items-end leading-tight">
                              <span className="font-semibold text-emerald-700">
                                ${Math.round(projection.totalProjectedRevenue).toLocaleString('en-US')}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {getProjectionSourceLabel(projection.projectionSource)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-gray-600">{formatShortDate(deal.runAt)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="whitespace-nowrap text-gray-600">{formatShortDate(deal.endAt)}</span>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleEligibility(deal)}
                            disabled={togglePendingId === deal.externalDealId || isToggling}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                              deal.vendorReactivateEligible
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } disabled:opacity-60`}
                            title={deal.vendorReactivateEligible ? 'Quitar del pool' : 'Agregar al pool'}
                          >
                            {deal.vendorReactivateEligible ? (
                              <ToggleOnIcon style={{ fontSize: 18 }} />
                            ) : (
                              <ToggleOffIcon style={{ fontSize: 18 }} />
                            )}
                            <span>{deal.vendorReactivateEligible ? 'En pool' : 'Fuera'}</span>
                          </button>
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex items-center justify-end gap-1">
                            {deal.businessId && (
                              <button
                                type="button"
                                onClick={() => handleSendNow(deal)}
                                disabled={sendPendingBusinessId === deal.businessId || isToggling}
                                title="Enviar ahora"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-60"
                              >
                                <SendIcon style={{ fontSize: 14 }} />
                                <span>{sendPendingBusinessId === deal.businessId ? 'Enviando...' : 'Enviar ahora'}</span>
                              </button>
                            )}
                            {deal.previewUrl && (
                              <a
                                href={deal.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver deal"
                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                              >
                                <OpenInNewIcon fontSize="small" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-100 p-3">
              <PaginationControls />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
