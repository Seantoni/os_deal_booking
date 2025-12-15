'use client'

import type { Deal } from '@/types'
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
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between text-left"
        aria-label={open ? 'Collapse section' : 'Expand section'}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Booking Request</h3>
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
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {/* Row 1 */}
          <div>
            <span className="text-gray-500 text-xs">Negocio</span>
            <p className="text-gray-900 font-medium">{request.name}</p>
          </div>
          {request.merchant && (
            <div>
              <span className="text-gray-500 text-xs">Merchant</span>
              <p className="text-gray-900">{request.merchant}</p>
            </div>
          )}
          
          {/* Row 2 */}
          <div>
            <span className="text-gray-500 text-xs">Email del Comercio</span>
            <p className="text-gray-900">{request.businessEmail}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Fechas de Campaña</span>
            <p className="text-gray-900">
              {new Date(request.startDate).toLocaleDateString('es-PA', {
                month: 'short',
                day: 'numeric',
              })} — {new Date(request.endDate).toLocaleDateString('es-PA', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          
          {/* Row 3 */}
          {request.parentCategory && (
            <div className="col-span-2">
              <span className="text-gray-500 text-xs">Categoría</span>
              <p className="text-gray-900">
                {request.parentCategory}
                {request.subCategory1 && ` > ${request.subCategory1}`}
                {request.subCategory2 && ` > ${request.subCategory2}`}
              </p>
            </div>
          )}
          
          {/* Contact Info */}
          {request.redemptionContactName && (
            <div>
              <span className="text-gray-500 text-xs">Contacto de Canje</span>
              <p className="text-gray-900">{request.redemptionContactName}</p>
            </div>
          )}
          {request.redemptionContactPhone && (
            <div>
              <span className="text-gray-500 text-xs">Teléfono</span>
              <p className="text-gray-900">{request.redemptionContactPhone}</p>
            </div>
          )}
          
          {/* Legal Info */}
          {request.legalName && (
            <div>
              <span className="text-gray-500 text-xs">Razón Social</span>
              <p className="text-gray-900">{request.legalName}</p>
            </div>
          )}
          {request.rucDv && (
            <div>
              <span className="text-gray-500 text-xs">RUC / DV</span>
              <p className="text-gray-900">{request.rucDv}</p>
            </div>
          )}
          
          {/* Payment Info */}
          {request.commission && (
            <div>
              <span className="text-gray-500 text-xs">Comisión</span>
              <p className="text-gray-900 font-medium text-green-700">{request.commission}</p>
            </div>
          )}
          {request.paymentType && (
            <div>
              <span className="text-gray-500 text-xs">Tipo de Pago</span>
              <p className="text-gray-900">{request.paymentType}</p>
            </div>
          )}
        </div>
        
        {request.businessReview && (
            <div className="pt-3 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Reseña del Negocio</span>
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">{request.businessReview}</p>
          </div>
        )}
        
        {request.offerDetails && (
            <div className="pt-3 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Detalle de la Oferta</span>
            <p className="text-sm text-gray-700 mt-1 line-clamp-3">{request.offerDetails}</p>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
