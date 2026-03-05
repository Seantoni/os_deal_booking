'use client'

import { REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS } from '@/lib/constants/booking-request-statuses'
import EventIcon from '@mui/icons-material/Event'
import HistoryIcon from '@mui/icons-material/History'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import type { BookingRequestViewData } from '@/types'
import { formatBookingRequestShortDate } from './bookingRequestView.utils'

interface BookingRequestHistoryBarProps {
  requestData: BookingRequestViewData
}

export function BookingRequestHistoryBar({ requestData }: BookingRequestHistoryBarProps) {
  const status = requestData.status || 'draft'
  const processedAt = requestData.processedAt
  const campaignStartDateSource = requestData.eventDates?.startDate ?? requestData.startDate
  const campaignEndDateSource = requestData.eventDates?.endDate ?? requestData.endDate
  const createdAt = requestData.createdAt
  const processedByName =
    requestData.processedByUser?.name ||
    requestData.processedByUser?.email ||
    requestData.processedBy ||
    ''
  const createdByName =
    requestData.createdByUser?.name ||
    requestData.createdByUser?.email ||
    requestData.userId ||
    ''
  const colors = REQUEST_STATUS_COLORS[status] || REQUEST_STATUS_COLORS.draft
  const statusLabel = REQUEST_STATUS_LABELS[status] || status

  return (
    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
        <div className="flex items-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {statusLabel}
          </span>
        </div>

        {(status === 'approved' || status === 'booked') && processedAt && (
          <div className="flex items-center gap-2 text-slate-600">
            {status === 'booked' ? (
              <EventIcon style={{ fontSize: 16 }} className="text-blue-500" />
            ) : (
              <CheckCircleIcon style={{ fontSize: 16 }} className="text-green-500" />
            )}
            <span>
              <span className="font-semibold text-slate-700">
                {status === 'booked' ? 'Reservado:' : 'Aprobado:'}
              </span>{' '}
              {formatBookingRequestShortDate(processedAt)}
              {processedByName && <span className="text-slate-500"> por {processedByName}</span>}
            </span>
          </div>
        )}

        {(campaignStartDateSource || campaignEndDateSource) && (
          <div className="flex items-center gap-2 text-slate-600">
            <PlayArrowIcon style={{ fontSize: 16 }} className="text-indigo-500" />
            <span>
              <span className="font-semibold text-slate-700">Campaña:</span>{' '}
              {campaignStartDateSource ? formatBookingRequestShortDate(campaignStartDateSource) : '—'}
              {campaignStartDateSource && campaignEndDateSource && ' → '}
              {campaignEndDateSource ? formatBookingRequestShortDate(campaignEndDateSource) : ''}
            </span>
          </div>
        )}

        {createdAt && (
          <div className="flex items-center gap-2 text-slate-500 ml-auto">
            <HistoryIcon style={{ fontSize: 16 }} />
            <span>
              Creado {formatBookingRequestShortDate(createdAt)}
              {createdByName && <span> por {createdByName}</span>}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
