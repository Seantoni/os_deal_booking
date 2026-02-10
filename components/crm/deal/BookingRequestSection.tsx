'use client'

import type { Deal } from '@/types'
import { ONE_DAY_MS } from '@/lib/constants/time'
import { formatDateForPanama, getTodayInPanama, PANAMA_TIMEZONE, parseDateInPanamaTime } from '@/lib/date/timezone'
import { REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS } from '@/lib/constants/booking-request-statuses'
import { useState } from 'react'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

interface BookingRequestSectionProps {
  deal: Deal
  onViewRequest: () => void
}

export default function BookingRequestSection({ deal, onViewRequest }: BookingRequestSectionProps) {
  const request = deal.bookingRequest
  const [open, setOpen] = useState(true)

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

  const statusKey = request.status as keyof typeof REQUEST_STATUS_LABELS
  const statusLabel = REQUEST_STATUS_LABELS[statusKey] || request.status
  const statusColors = REQUEST_STATUS_COLORS[request.status] || { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }

  const pricingOptionsCount = Array.isArray(request.pricingOptions) ? request.pricingOptions.length : 0
  const accountLast4 = request.accountNumber ? request.accountNumber.slice(-4) : ''
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between text-left"
        aria-label={open ? 'Contraer sección' : 'Expandir sección'}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Solicitud de Booking</h3>
          {request.status && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
              {statusLabel}
            </span>
          )}
          {request.sourceType && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              request.sourceType === 'public_link' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {request.sourceType === 'public_link' ? (
                <><PublicIcon style={{ fontSize: 10 }} /> Público</>
              ) : (
                <><LockIcon style={{ fontSize: 10 }} /> Interno</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewRequest()
            }}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver Detalles Completos
        </button>
          {open ? <ExpandLessIcon fontSize="small" className="text-gray-500" /> : <ExpandMoreIcon fontSize="small" className="text-gray-500" />}
      </div>
      </button>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Negocio</span>
              <p className="text-sm font-semibold text-slate-900 mt-1">{request.name}</p>
              {request.merchant && (
                <p className="text-xs text-slate-600 mt-0.5">Comerciante: {request.merchant}</p>
              )}
              <p className="text-xs text-slate-600 mt-0.5">{request.businessEmail}</p>
            </div>

            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Lanzamiento</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${countdownStyles}`}>
                  {countdownLabel}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {startDate.toLocaleDateString('es-PA', {
                  timeZone: PANAMA_TIMEZONE,
                  month: 'short',
                  day: 'numeric',
                })} — {endDate.toLocaleDateString('es-PA', {
                  timeZone: PANAMA_TIMEZONE,
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Faltan
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
                <span className="text-[10px] text-slate-500">
                  hasta lanzamiento
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {request.parentCategory && (
              <div className="rounded-lg border border-slate-200/60 bg-white p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Categoría</span>
                <p className="text-sm font-medium text-slate-900 mt-1">
                  {request.parentCategory}
                  {request.subCategory1 && ` > ${request.subCategory1}`}
                  {request.subCategory2 && ` > ${request.subCategory2}`}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {request.redemptionMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Canje: {request.redemptionMode}
                    </span>
                  )}
                  {request.paymentType && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Pago: {request.paymentType}
                    </span>
                  )}
                  {request.campaignDuration && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Duración: {request.campaignDuration}
                    </span>
                  )}
                  {pricingOptionsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      Opciones: {pricingOptionsCount}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-slate-200/60 bg-white p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contacto de Canje</span>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {request.redemptionContactName || '—'}
              </p>
              <div className="text-xs text-slate-600 mt-0.5 space-y-0.5">
                {request.redemptionContactEmail && <p>{request.redemptionContactEmail}</p>}
                {request.redemptionContactPhone && <p>{request.redemptionContactPhone}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(request.legalName || request.rucDv) && (
              <div className="rounded-lg border border-slate-200/60 bg-white p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Fiscal</span>
                {request.legalName && (
                  <p className="text-sm font-medium text-slate-900 mt-1">{request.legalName}</p>
                )}
                {request.rucDv && (
                  <p className="text-xs text-slate-600 mt-0.5">RUC/DV: {request.rucDv}</p>
                )}
              </div>
            )}

            {(request.bank || request.accountNumber) && (
              <div className="rounded-lg border border-slate-200/60 bg-white p-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Pago</span>
                {request.bank && (
                  <p className="text-sm font-medium text-slate-900 mt-1">{request.bank}</p>
                )}
                {request.accountNumber && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cuenta **** {accountLast4}
                  </p>
                )}
              </div>
            )}
          </div>

          {request.addressAndHours && (
            <div className="rounded-lg border border-slate-200/60 bg-white p-3">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Dirección y Horarios</span>
              <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">{request.addressAndHours}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
