/**
 * Expanded deals section for a business row
 * 
 * Shows a sub-table of deals when a business row is expanded.
 */

'use client'

import { useRouter } from 'next/navigation'
import type { SimplifiedDeal } from '@/app/actions/deal-metrics'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

interface BusinessExpandedDealsProps {
  businessId: string
  isLoading: boolean
  deals: SimplifiedDeal[]
  totalCount: number
}

export function BusinessExpandedDeals({
  businessId,
  isLoading,
  deals,
  totalCount,
}: BusinessExpandedDealsProps) {
  const router = useRouter()
  const remainingDeals = totalCount - deals.length

  if (isLoading) {
    return (
      <tr className="bg-slate-50/50">
        <td colSpan={13} className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 pl-8">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Cargando deals...
          </div>
        </td>
      </tr>
    )
  }

  if (deals.length === 0) {
    return (
      <tr className="bg-slate-50/50">
        <td colSpan={13} className="px-4 py-3">
          <div className="text-sm text-gray-500 pl-8">
            No hay deals para este negocio
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      {/* Deals Header */}
      <tr className="bg-slate-50 border-t border-slate-200">
        <td></td>
        <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Deal ID</td>
        <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right" colSpan={2}>Vendidos</td>
        <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right" colSpan={2}>Ing. Neto</td>
        <td className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500" colSpan={2}>Fechas</td>
        <td colSpan={5}></td>
      </tr>
      
      {/* Deal Rows */}
      {deals.map((deal, dealIndex) => (
        <tr
          key={deal.id}
          className={`bg-slate-50/50 ${dealIndex < deals.length - 1 ? 'border-b border-slate-100' : ''}`}
        >
          <td className="pl-4 pr-2 py-2">
            <span className="text-slate-300">├─</span>
          </td>
          <td className="px-4 py-2">
            <span className="text-[12px] font-medium text-slate-700">{deal.externalDealId}</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded ${
              deal.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {deal.isActive ? 'Activo' : 'Fin'}
            </span>
          </td>
          <td className="px-4 py-2 text-right" colSpan={2}>
            <span className="text-[12px] font-medium text-slate-700">{deal.quantitySold.toLocaleString()}</span>
          </td>
          <td className="px-4 py-2 text-right" colSpan={2}>
            <span className="text-[12px] font-medium text-emerald-600">${deal.netRevenue.toLocaleString()}</span>
          </td>
          <td className="px-4 py-2" colSpan={2}>
            <span className="text-[11px] text-slate-500">
              {deal.runAt ? new Date(deal.runAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
              {' → '}
              {deal.endAt ? new Date(deal.endAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
            </span>
          </td>
          <td className="px-4 py-2 text-right" colSpan={5}>
            {deal.dealUrl && (
              <a
                href={deal.dealUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors inline-flex"
                title="Ver oferta"
              >
                <OpenInNewIcon style={{ fontSize: 16 }} />
              </a>
            )}
          </td>
        </tr>
      ))}

      {/* "View more" link if there are remaining deals */}
      {remainingDeals > 0 && (
        <tr className="bg-slate-50/50 border-t border-slate-100">
          <td className="pl-4 pr-2 py-2">
            <span className="text-slate-300">└─</span>
          </td>
          <td colSpan={12} className="px-4 py-2">
            <button
              onClick={() => router.push(`/businesses/${businessId}?tab=metrics`)}
              className="text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
            >
              Ver los {remainingDeals} deals restantes →
            </button>
          </td>
        </tr>
      )}
    </>
  )
}
