'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import type { BookingRequest } from '@/types'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import SendIcon from '@mui/icons-material/Send'
import BlockIcon from '@mui/icons-material/Block'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { translateStatus } from '@/lib/utils/translations'

interface BookingRequestMobileCardProps {
  request: BookingRequest
  daysSinceSent: number | null
  daysSinceCreated: number | null
  projectedRevenue?: number | null
  projectionSource?: 'actual_deal' | 'business_history' | 'category_benchmark' | 'none'
  isAdmin: boolean
  currentUserId: string | null
  onView: (id: string) => void
  onResend?: (request: BookingRequest) => void
  onCancel?: (request: BookingRequest) => void
  onDelete?: (id: string) => void
  onHover: (id: string) => void
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-blue-700',
  booked: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-orange-50 text-orange-700',
}

function getPendingStyle(daysSinceSent: number | null): string {
  if (daysSinceSent === null) return STATUS_STYLES.pending
  if (daysSinceSent <= 2) return 'bg-green-50 text-green-700'
  if (daysSinceSent <= 5) return 'bg-orange-50 text-orange-700'
  return 'bg-red-50 text-red-700'
}

function getPendingRowBg(daysSinceSent: number | null): string {
  if (daysSinceSent === null) return 'bg-white'
  if (daysSinceSent <= 2) return 'bg-green-50/20'
  if (daysSinceSent <= 5) return 'bg-orange-50/20'
  return 'bg-red-50/20'
}

export default function BookingRequestMobileCard({
  request,
  daysSinceSent,
  daysSinceCreated,
  projectedRevenue = null,
  projectionSource = 'none',
  isAdmin,
  currentUserId,
  onView,
  onResend,
  onCancel,
  onDelete,
  onHover,
}: BookingRequestMobileCardProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleTap = useCallback(() => {
    onView(request.id)
  }, [request.id, onView])

  const handleMenuTap = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setSheetOpen(true)
  }, [])

  const statusLabel = translateStatus(request.status.charAt(0).toUpperCase() + request.status.slice(1))
  const statusStyle = request.status === 'pending'
    ? getPendingStyle(daysSinceSent)
    : STATUS_STYLES[request.status] || STATUS_STYLES.draft

  const rowBg = request.status === 'pending'
    ? getPendingRowBg(daysSinceSent)
    : 'bg-white'

  const projectionSourceLabel = projectionSource === 'actual_deal'
    ? 'Actual'
    : projectionSource === 'business_history'
      ? 'Histórico'
      : projectionSource === 'category_benchmark'
        ? 'Categoría'
        : 'N/A'

  const startDate = new Date(request.startDate).toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
  })
  const endDate = new Date(request.endDate).toLocaleDateString('es-PA', {
    timeZone: PANAMA_TIMEZONE,
    month: 'short',
    day: 'numeric',
  })

  // Determine available actions
  const isCreator = request.userId === currentUserId
  const canCancel = (request.status === 'draft' || request.status === 'pending') && (isCreator || isAdmin)
  const canEdit = request.status === 'draft'
  const canResend = request.status === 'draft' || request.status === 'pending'
  const hasActions = canCancel || canEdit || canResend || isAdmin

  return (
    <>
      <div
        onClick={handleTap}
        onMouseEnter={() => onHover(request.id)}
        className={`px-4 py-3.5 border-b border-gray-100 active:bg-gray-50 transition-colors ${rowBg}`}
      >
        {/* Row 1: Name + Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold text-gray-900 leading-tight truncate">
              {request.name}
            </h3>
            {/* Email */}
            <p className="text-[12px] text-gray-400 truncate mt-0.5">
              {request.businessEmail}
            </p>
          </div>

          {hasActions && (
            <button
              onClick={handleMenuTap}
              className="p-1.5 -mr-1.5 -mt-0.5 rounded-full text-gray-400 active:bg-gray-100 flex-shrink-0 touch-target"
              aria-label="Acciones"
            >
              <MoreVertIcon style={{ fontSize: 20 }} />
            </button>
          )}
        </div>

        {/* Row 2: Status + Origin + Dates */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {/* Status */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${statusStyle}`}>
            {statusLabel}
          </span>

          {/* Origin */}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
            request.sourceType === 'public_link'
              ? 'bg-purple-50 text-purple-600'
              : 'bg-gray-50 text-gray-500'
          }`}>
            {request.sourceType === 'public_link' ? 'Enlace' : 'Interno'}
          </span>

          {/* Deal ID */}
          {request.dealId && (
            <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-mono font-medium">
              #{request.dealId}
            </span>
          )}

          {/* Days badge */}
          {daysSinceCreated !== null && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500">
              {daysSinceCreated}d
            </span>
          )}

          {/* Projected revenue */}
          {projectedRevenue !== null && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              Proy. ${projectedRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              {projectionSource !== 'none' ? ` · ${projectionSourceLabel}` : ''}
            </span>
          )}

          {/* Date range */}
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 ml-auto">
            <CalendarTodayIcon style={{ fontSize: 12 }} />
            {startDate} – {endDate}
          </span>
        </div>

        {/* Rejection reason */}
        {request.status === 'rejected' && request.rejectionReason && (
          <p className="mt-1.5 text-[11px] text-red-600 line-clamp-1">
            {request.rejectionReason}
          </p>
        )}
      </div>

      {/* Action Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-[fadeIn_150ms_ease-out]"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] animate-[slideUp_200ms_ease-out] pb-safe">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900 truncate">{request.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{request.businessEmail}</p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 ml-3 flex-shrink-0"
                aria-label="Cerrar"
              >
                <CloseIcon style={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Actions */}
            <div className="py-2">
              <button
                onClick={() => { onView(request.id); setSheetOpen(false) }}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left active:bg-gray-50"
              >
                <VisibilityIcon style={{ fontSize: 20 }} className="text-gray-500" />
                <span className="text-[14px] font-medium text-gray-800">Ver Solicitud</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => { router.push(`/booking-requests/edit/${request.id}`); setSheetOpen(false) }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left active:bg-gray-50"
                >
                  <EditIcon style={{ fontSize: 20 }} className="text-gray-500" />
                  <span className="text-[14px] font-medium text-gray-800">Editar</span>
                </button>
              )}

              {canResend && onResend && (
                <button
                  onClick={() => { onResend(request); setSheetOpen(false) }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left active:bg-gray-50"
                >
                  <SendIcon style={{ fontSize: 20 }} className="text-green-600" />
                  <span className="text-[14px] font-medium text-gray-800">Reenviar Correo</span>
                </button>
              )}

              {canCancel && onCancel && (
                <button
                  onClick={() => { onCancel(request); setSheetOpen(false) }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left active:bg-gray-50"
                >
                  <BlockIcon style={{ fontSize: 20 }} className="text-orange-500" />
                  <span className="text-[14px] font-medium text-gray-800">Cancelar Solicitud</span>
                </button>
              )}

              {isAdmin && onDelete && (
                <button
                  onClick={() => { onDelete(request.id); setSheetOpen(false) }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left active:bg-gray-50"
                >
                  <DeleteIcon style={{ fontSize: 20 }} className="text-red-500" />
                  <span className="text-[14px] font-medium text-red-600">Eliminar</span>
                </button>
              )}
            </div>

            {/* Cancel button */}
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={() => setSheetOpen(false)}
                className="w-full py-3 rounded-xl bg-gray-100 text-[14px] font-semibold text-gray-600 active:bg-gray-200 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
