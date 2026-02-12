'use client'

import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import type { BookingRequest } from '@/types'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'

interface LinkedRequestSectionProps {
  request: BookingRequest
  onView: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  booked: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-orange-100 text-orange-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobada',
  booked: 'Reservada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

function getRequestDisplayName(request: BookingRequest): string {
  if (request.name && request.name.trim()) {
    return request.name.length > 70 ? `${request.name.slice(0, 67)}...` : request.name
  }

  return request.merchant || request.businessEmail || 'Solicitud sin nombre'
}

export default function LinkedRequestSection({ request, onView }: LinkedRequestSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-1.5">
          <DescriptionIcon className="text-purple-600" style={{ fontSize: 16 }} />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Solicitud Vinculada</h3>
        </div>
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={onView}
          className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${
                  statusColors[request.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {statusLabels[request.status] || request.status}
              </span>

              <h4 className="font-medium text-gray-900 truncate">
                {getRequestDisplayName(request)}
              </h4>

              <span className="text-gray-400 flex-shrink-0">•</span>
              <div className="flex items-center gap-1 min-w-0 text-gray-500">
                <CalendarTodayIcon style={{ fontSize: 12 }} className="flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {new Date(request.startDate).toLocaleDateString('es-PA', {
                    timeZone: PANAMA_TIMEZONE,
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="text-gray-400">→</span>
                <span className="whitespace-nowrap">
                  {new Date(request.endDate).toLocaleDateString('es-PA', {
                    timeZone: PANAMA_TIMEZONE,
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <ArrowForwardIcon
              className="text-gray-400 group-hover:text-purple-600 flex-shrink-0 transition-colors"
              style={{ fontSize: 12 }}
            />
          </div>
        </button>
      </div>
    </div>
  )
}
