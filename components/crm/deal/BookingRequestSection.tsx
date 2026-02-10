'use client'

import type { Deal } from '@/types'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { formatDateForPanama, getTodayInPanama, PANAMA_TIMEZONE, parseDateInPanamaTime } from '@/lib/date/timezone'
import { Button } from '@/components/ui'

interface BookingRequestSectionProps {
  deal: Deal
  onViewRequest: () => void
}

export default function BookingRequestSection({ deal, onViewRequest }: BookingRequestSectionProps) {
  const request = deal.bookingRequest

  const startDate = new Date(request.startDate)
  const endDate = new Date(request.endDate)
  const startDateKey = formatDateForPanama(startDate)
  const endDateKey = formatDateForPanama(endDate)
  const startDatePanama = parseDateInPanamaTime(startDateKey)
  const endDatePanama = parseDateInPanamaTime(endDateKey)
  const todayPanama = parseDateInPanamaTime(getTodayInPanama())

  const daysUntilLaunch = Math.round((startDatePanama.getTime() - todayPanama.getTime()) / ONE_DAY_MS)
  const campaignDurationDays = Math.round((endDatePanama.getTime() - startDatePanama.getTime()) / ONE_DAY_MS) + 1

  const countdownLabel = daysUntilLaunch === 0
    ? 'Hoy'
    : daysUntilLaunch > 0
    ? `En ${daysUntilLaunch} día${daysUntilLaunch === 1 ? '' : 's'}`
    : `Hace ${Math.abs(daysUntilLaunch)} día${Math.abs(daysUntilLaunch) === 1 ? '' : 's'}`

  const countdownStyles = daysUntilLaunch === 0
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : daysUntilLaunch > 0 && daysUntilLaunch <= 7
    ? 'bg-amber-100 text-amber-700 border-amber-200'
    : daysUntilLaunch > 7
    ? 'bg-slate-100 text-slate-600 border-slate-200'
    : 'bg-slate-100 text-slate-500 border-slate-200'

  const pricingOptionsCount = Array.isArray(request.pricingOptions) ? request.pricingOptions.length : 0
  const accountLast4 = request.accountNumber ? request.accountNumber.slice(-4) : ''
  
  return (
    <div className="px-1">
      <div className="mt-1.5 flex flex-wrap items-start gap-x-4 gap-y-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lanzamiento</span>
            <span className="text-slate-900 font-semibold">
              {startDate.toLocaleDateString('es-PA', {
                timeZone: PANAMA_TIMEZONE,
                month: 'short',
                day: 'numeric',
              })} — {endDate.toLocaleDateString('es-PA', {
                timeZone: PANAMA_TIMEZONE,
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${countdownStyles}`}>
              {countdownLabel}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-sm ${
              daysUntilLaunch < 0
                ? 'bg-red-600 text-white border-red-600'
                : daysUntilLaunch === 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : daysUntilLaunch <= 7
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-indigo-600 text-white border-indigo-600'
            }`}>
              {Math.abs(daysUntilLaunch)} día{Math.abs(daysUntilLaunch) === 1 ? '' : 's'}
            </span>
          </div>

        {request.redemptionContactName || request.redemptionContactEmail || request.redemptionContactPhone ? (
          <>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contacto de Canje</span>
              {request.redemptionContactName && (
                <span className="text-slate-900 font-semibold">{request.redemptionContactName}</span>
              )}
              {request.redemptionContactEmail && <span className="text-slate-600">{request.redemptionContactEmail}</span>}
              {request.redemptionContactPhone && <span className="text-slate-600">{request.redemptionContactPhone}</span>}
            </div>
          </>
        ) : null}

        {(request.legalName || request.rucDv) && (
          <>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Fiscal</span>
              {request.legalName && <span className="text-slate-900 font-semibold">{request.legalName}</span>}
              {request.rucDv && <span className="text-slate-600">RUC/DV: {request.rucDv}</span>}
            </div>
          </>
        )}

        {(request.bank || request.accountNumber) && (
          <>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pago</span>
              {request.bank && <span className="text-slate-900 font-semibold">{request.bank}</span>}
              {request.accountNumber && (
                <span className="text-slate-600">Cuenta **** {accountLast4}</span>
              )}
            </div>
          </>
        )}
      </div>
      {request.addressAndHours && (
        <div className="mt-2 text-[11px] text-slate-600">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Dirección y Horarios</span>
          <div className="text-slate-700 mt-0.5 whitespace-pre-line">
            {request.addressAndHours}
          </div>
        </div>
      )}
    </div>
  )
}
