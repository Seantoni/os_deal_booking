'use client'

import { useState, useEffect } from 'react'
import { getBookingRequest } from '@/app/actions/booking-requests'
import { useModalEscape } from '@/hooks/useModalEscape'
import { PANAMA_TIMEZONE } from '@/lib/date/timezone'
import type { BookingRequestViewData, PricingOption } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EmailIcon from '@mui/icons-material/Email'
import BusinessIcon from '@mui/icons-material/Business'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import ReceiptIcon from '@mui/icons-material/Receipt'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'

interface BookingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
}

export default function BookingRequestModal({ isOpen, onClose, requestId }: BookingRequestModalProps) {
  const [request, setRequest] = useState<BookingRequestViewData | null>(null)
  const [loading, setLoading] = useState(false)

  // Close modal on Escape key
  useModalEscape(isOpen, onClose)

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequest()
    }
  }, [isOpen, requestId])

  async function loadRequest() {
    setLoading(true)
    try {
      const result = await getBookingRequest(requestId)
      if (result.success && result.data) {
        setRequest(result.data)
      }
    } catch (error) {
      console.error('Failed to load booking request:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800 border border-gray-300',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border border-blue-300',
      booked: 'bg-green-100 text-green-800 border border-green-300',
      rejected: 'bg-red-100 text-red-800 border border-red-300',
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getSourceBadge = (sourceType: string) => {
    if (sourceType === 'public_link') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
          <PublicIcon style={{ fontSize: 12 }} />
          Enlace Público
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
        <LockIcon style={{ fontSize: 12 }} />
        Interno
      </span>
    )
  }

  return (
    <>
      {/* Light backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Right Side Panel */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-2xl z-50 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                <DescriptionIcon className="text-blue-600" fontSize="medium" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Booking Request</p>
                  {request?.sourceType && getSourceBadge(request.sourceType)}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {request?.name || 'Loading...'}
                </h2>
                {request?.merchant && (
                  <p className="text-sm text-gray-600">{request.merchant}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <CloseIcon fontSize="medium" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">Loading...</div>
            </div>
          ) : request ? (
            <div className="space-y-4">
              {/* Status & Source */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Status</span>
                  {getStatusBadge(request.status)}
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Información Básica</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <BusinessIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600">Nombre del Negocio</p>
                      <p className="text-sm text-gray-900 mt-0.5">{request.name}</p>
                    </div>
                  </div>
                  {request.merchant && (
                    <div className="flex items-start gap-3">
                      <BusinessIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-600">Merchant</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.merchant}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <EmailIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600">Email del Comercio</p>
                      <p className="text-sm text-gray-900 mt-0.5">{request.businessEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarTodayIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600">Fechas de Campaña</p>
                      <p className="text-sm text-gray-900 mt-0.5">
                        {new Date(request.startDate).toLocaleDateString('es-PA', {
                          timeZone: PANAMA_TIMEZONE,
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })} — {new Date(request.endDate).toLocaleDateString('es-PA', {
                          timeZone: PANAMA_TIMEZONE,
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  {request.parentCategory && (
                    <div className="flex items-start gap-3 col-span-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-600">Categoría</p>
                        <p className="text-sm text-gray-900 mt-0.5">
                          {request.parentCategory}
                          {request.subCategory1 && ` > ${request.subCategory1}`}
                          {request.subCategory2 && ` > ${request.subCategory2}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {request.campaignDuration && (
                    <div>
                      <p className="text-xs font-medium text-gray-600">Duración de Campaña</p>
                      <p className="text-sm text-gray-900 mt-0.5">{request.campaignDuration}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              {(request.redemptionContactName || request.redemptionContactEmail || request.redemptionContactPhone) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Contacto de Canje</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {request.redemptionContactName && (
                      <div className="flex items-start gap-3">
                        <PersonIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Nombre</p>
                          <p className="text-sm text-gray-900 mt-0.5">{request.redemptionContactName}</p>
                        </div>
                      </div>
                    )}
                    {request.redemptionContactEmail && (
                      <div className="flex items-start gap-3">
                        <EmailIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Email</p>
                          <p className="text-sm text-gray-900 mt-0.5">{request.redemptionContactEmail}</p>
                        </div>
                      </div>
                    )}
                    {request.redemptionContactPhone && (
                      <div className="flex items-start gap-3">
                        <PhoneIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Teléfono</p>
                          <p className="text-sm text-gray-900 mt-0.5">{request.redemptionContactPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legal & Banking */}
              {(request.legalName || request.rucDv || request.bank || request.accountNumber) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Datos Fiscales y Bancarios</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {request.legalName && (
                      <div className="flex items-start gap-3">
                        <ReceiptIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Razón Social</p>
                          <p className="text-sm text-gray-900 mt-0.5">{request.legalName}</p>
                        </div>
                      </div>
                    )}
                    {request.rucDv && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">RUC / DV</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.rucDv}</p>
                      </div>
                    )}
                    {request.bank && (
                      <div className="flex items-start gap-3">
                        <AccountBalanceIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Banco</p>
                          <p className="text-sm text-gray-900 mt-0.5">{request.bank}</p>
                        </div>
                      </div>
                    )}
                    {request.accountNumber && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Número de Cuenta</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.accountNumber}</p>
                      </div>
                    )}
                    {request.accountType && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Tipo de Cuenta</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.accountType}</p>
                      </div>
                    )}
                    {request.bankAccountName && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Nombre en Cuenta</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.bankAccountName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {(request.addressAndHours || request.province || request.district) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Ubicación</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {request.addressAndHours && (
                      <div className="flex items-start gap-3 col-span-2">
                        <LocationOnIcon className="text-gray-400 mt-0.5" style={{ fontSize: 16 }} />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600">Dirección y Horario</p>
                          <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{request.addressAndHours}</p>
                        </div>
                      </div>
                    )}
                    {request.province && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Provincia</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.province}</p>
                      </div>
                    )}
                    {request.district && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Distrito</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.district}</p>
                      </div>
                    )}
                    {request.corregimiento && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Corregimiento</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.corregimiento}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Operations & Payments */}
              {(request.redemptionMode || request.paymentType) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Operatividad y Pagos</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {request.redemptionMode && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Modalidad de Canje</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.redemptionMode}</p>
                      </div>
                    )}
                    {request.paymentType && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Tipo de Pago</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.paymentType}</p>
                      </div>
                    )}
                    {request.isRecurring && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">¿Es Recurrente?</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.isRecurring}</p>
                      </div>
                    )}
                    {request.paymentInstructions && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-600">Instrucciones de Pago</p>
                        <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{request.paymentInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business Rules */}
              {(request.includesTaxes || request.validOnHolidays || request.hasExclusivity) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Reglas de Negocio</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    {request.includesTaxes && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Incluye Impuestos</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.includesTaxes}</p>
                      </div>
                    )}
                    {request.validOnHolidays && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Válido en Feriados</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.validOnHolidays}</p>
                      </div>
                    )}
                    {request.hasExclusivity && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Acuerdo de Exclusividad</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.hasExclusivity}</p>
                      </div>
                    )}
                    {request.exclusivityCondition && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-600">Condición de Exclusividad</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.exclusivityCondition}</p>
                      </div>
                    )}
                    {request.blackoutDates && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-gray-600">Fechas Blackout</p>
                        <p className="text-sm text-gray-900 mt-0.5">{request.blackoutDates}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Options */}
              {request.pricingOptions && Array.isArray(request.pricingOptions) && request.pricingOptions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Opciones de Compra</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {(request.pricingOptions as PricingOption[]).map((option, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{option.title || `Opción ${idx + 1}`}</p>
                            {option.description && (
                              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {option.price && (
                              <p className="font-bold text-green-600">${option.price}</p>
                            )}
                            {option.realValue && (
                              <p className="text-xs text-gray-500 line-through">${option.realValue}</p>
                            )}
                          </div>
                        </div>
                        {option.quantity && (
                          <p className="text-xs text-gray-500 mt-2">Cantidad: {option.quantity}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* Cancellation Policy */}
              {request.cancellationPolicy && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Política de Cancelación</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.cancellationPolicy}</p>
                  </div>
                </div>
              )}

              {/* Additional Comments */}
              {request.additionalComments && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Comentarios Adicionales</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.additionalComments}</p>
                  </div>
                </div>
              )}

              {/* Social Media & Contact */}
              {(request.socialMedia || request.contactDetails) && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Redes y Contacto</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {request.socialMedia && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Redes Sociales y Web</p>
                        <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{request.socialMedia}</p>
                      </div>
                    )}
                    {request.contactDetails && (
                      <div>
                        <p className="text-xs font-medium text-gray-600">Detalles de Contacto</p>
                        <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{request.contactDetails}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Request not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

