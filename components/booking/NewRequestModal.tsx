'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSendPublicLink } from '@/app/actions/booking'
import type { BusinessWithStatus } from '@/components/shared'
import { BusinessSelect } from '@/components/shared'
import {
  buildBookingRequestBusinessPrefillParams,
  getBusinessAdditionalContactEmails,
  getBusinessPrimaryContactEmail,
} from '@/lib/booking-requests/business-prefill'
import { useModalEscape } from '@/hooks/useModalEscape'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import AddIcon from '@mui/icons-material/Add'
import toast from 'react-hot-toast'

interface NewRequestModalProps {
  isOpen: boolean
  onClose: () => void
  queryParams?: Record<string, string>
}

function normalizeEmailList(values: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  values.forEach((value) => {
    const email = value.trim().toLowerCase()
    if (!email || seen.has(email)) return

    seen.add(email)
    normalized.push(email)
  })

  return normalized
}

function parseSerializedEmails(value?: string): string[] {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return normalizeEmailList(
      parsed.filter((item): item is string => typeof item === 'string')
    )
  } catch {
    return []
  }
}

function getPrefilledEmailState(queryParams?: Record<string, string>) {
  const extraEmails = parseSerializedEmails(queryParams?.additionalEmails || queryParams?.paymentEmails)
  const primaryEmail =
    normalizeEmailList([
      queryParams?.businessEmail || '',
      queryParams?.partnerEmail || '',
      extraEmails[0] || '',
    ])[0] || ''

  return {
    primaryEmail,
    additionalEmails: extraEmails.filter((email) => email !== primaryEmail),
  }
}

export default function NewRequestModal({ isOpen, onClose, queryParams }: NewRequestModalProps) {
  const router = useRouter()
  const initialBusinessName = queryParams?.businessName?.trim() || ''
  const hasLockedBusinessContext = Boolean(queryParams?.businessId || initialBusinessName || queryParams?.fromOpportunity)
  const prefilledEmailState = useMemo(() => getPrefilledEmailState(queryParams), [queryParams])
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithStatus | null>(null)
  const [selectedBusinessNameOverride, setSelectedBusinessNameOverride] = useState<string | null>(null)
  const [additionalEmailsOverride, setAdditionalEmailsOverride] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [sentEmails, setSentEmails] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const isGenerating = isPending

  const handleClose = () => {
    setSelectedBusiness(null)
    setSelectedBusinessNameOverride(null)
    setAdditionalEmailsOverride(null)
    setError(null)
    setSuccess(false)
    setGeneratedUrl(null)
    setSentEmails([])
    onClose()
  }

  useModalEscape(isOpen, handleClose)

  const resolvedBusinessName = selectedBusiness?.name || selectedBusinessNameOverride || initialBusinessName
  const additionalEmails = additionalEmailsOverride ||
    (selectedBusiness ? getBusinessAdditionalContactEmails(selectedBusiness) : prefilledEmailState.additionalEmails)
  const primaryEmail = selectedBusiness
    ? getBusinessPrimaryContactEmail(selectedBusiness)
    : prefilledEmailState.primaryEmail
  const normalizedAdditionalEmails = useMemo(() => {
    return normalizeEmailList(additionalEmails).filter((email) => email !== primaryEmail)
  }, [additionalEmails, primaryEmail])
  const recipientEmails = useMemo(() => {
    return normalizeEmailList([primaryEmail, ...normalizedAdditionalEmails])
  }, [normalizedAdditionalEmails, primaryEmail])

  if (!isOpen) return null

  const buildEffectiveQueryParams = (): Record<string, string> => {
    const params = queryParams ? { ...queryParams } : {}

    if (selectedBusiness) {
      Object.assign(
        params,
        buildBookingRequestBusinessPrefillParams(selectedBusiness, {
          fromOpportunity: queryParams?.fromOpportunity || 'business',
          includeBusinessId: true,
        })
      )
    }

    if (resolvedBusinessName) {
      params.businessName = resolvedBusinessName
    }

    if (primaryEmail) {
      params.businessEmail = primaryEmail
    }

    delete params.paymentEmails

    if (normalizedAdditionalEmails.length > 0) {
      params.additionalEmails = JSON.stringify(normalizedAdditionalEmails)
    } else {
      delete params.additionalEmails
    }

    return params
  }

  const handleInternalForm = () => {
    const params = new URLSearchParams()
    const effectiveQueryParams = buildEffectiveQueryParams()

    Object.entries(effectiveQueryParams).forEach(([key, value]) => {
      if (value) {
        params.append(key, value)
      }
    })

    const url = params.toString()
      ? `/booking-requests/new?${params.toString()}`
      : '/booking-requests/new'

    router.push(url)
    handleClose()
  }

  const handleGenerateLink = () => {
    if (!resolvedBusinessName) {
      setError('Seleccione un negocio antes de generar el enlace')
      return
    }

    if (!primaryEmail) {
      setError('El negocio seleccionado no tiene un correo de contacto vinculado')
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = await generateAndSendPublicLink(recipientEmails, buildEffectiveQueryParams())

        if (result.success && result.data) {
          setSuccess(true)
          setGeneratedUrl(result.data.url)
          setSentEmails(result.data.recipientEmails || recipientEmails)
        } else {
          setError(result.error || 'Error al generar el enlace')
        }
      } catch (err) {
        console.error('Error generating link:', err)
        setError('Ocurrió un error inesperado')
      }
    })
  }

  const updateAdditionalEmail = (index: number, value: string) => {
    setAdditionalEmailsOverride(() => {
      const nextEmails = [...additionalEmails]
      nextEmails[index] = value
      return nextEmails
    })
    setError(null)
  }

  const addEmailField = () => {
    setAdditionalEmailsOverride([...additionalEmails, ''])
  }

  const removeEmailField = (index: number) => {
    setAdditionalEmailsOverride(additionalEmails.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleBusinessChange = (businessName: string, business: BusinessWithStatus | null) => {
    setSelectedBusiness(business)
    setSelectedBusinessNameOverride(businessName || null)
    setAdditionalEmailsOverride(business ? getBusinessAdditionalContactEmails(business) : [])
    setError(null)
  }

  const handleCopyLink = async () => {
    if (generatedUrl) {
      try {
        await navigator.clipboard.writeText(generatedUrl)
        toast.success('¡Enlace copiado al portapapeles!')
      } catch (err) {
        console.error('Failed to copy link:', err)
        toast.error('Error al copiar el enlace')
      }
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
        onClick={handleClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center md:p-3 pointer-events-none">
        <div className="w-full max-w-md bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-auto md:max-h-[85vh] pointer-events-auto transform transition-all duration-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-sm font-bold text-gray-900">Nueva Solicitud de Booking</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1"
            >
              <CloseIcon style={{ fontSize: 20 }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!success ? (
              <>
                <p className="text-xs text-gray-600 mb-3">
                  Elija cómo desea crear la solicitud de booking:
                </p>

                <button
                  onClick={handleInternalForm}
                  className="w-full flex items-start gap-2 p-3 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                    <EditIcon className="text-blue-600" fontSize="small" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Crear Formulario Interno</h3>
                    <p className="text-xs text-gray-600">
                      Complete el formulario de solicitud de booking usted mismo con todos los detalles.
                    </p>
                  </div>
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-gray-500">O</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 border-2 border-gray-200 rounded-lg">
                    <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                      <LinkIcon className="text-green-600" fontSize="small" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Generar Enlace Público</h3>
                      <p className="text-xs text-gray-600">
                        Envíe un enlace a usuarios externos para que completen el formulario ellos mismos.
                      </p>
                    </div>
                  </div>

                  <div className="pl-9 space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Negocio
                      </label>
                      {hasLockedBusinessContext ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-900">
                            {resolvedBusinessName || 'Negocio vinculado'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Este enlace usará el negocio ya vinculado en el contexto actual.
                          </p>
                        </div>
                      ) : (
                        <BusinessSelect
                          value={resolvedBusinessName}
                          onChange={handleBusinessChange}
                          label=""
                          placeholder="Buscar y seleccionar negocio"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Correo vinculado del negocio
                      </label>
                      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <EmailIcon className="text-gray-400 w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${primaryEmail ? 'text-gray-900' : 'text-gray-400'}`}>
                            {primaryEmail || 'Seleccione un negocio con correo de contacto'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {primaryEmail
                              ? 'Este será el destinatario principal del enlace.'
                              : 'Usaremos el correo de contacto asociado al negocio seleccionado.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-gray-700">
                          Otros correos
                        </label>
                        <button
                          type="button"
                          onClick={addEmailField}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 hover:text-green-800"
                        >
                          <AddIcon className="w-3.5 h-3.5" />
                          Agregar
                        </button>
                      </div>

                      {additionalEmails.length === 0 ? (
                        <p className="text-[11px] text-gray-500">
                          Puede agregar correos opcionales para copiar el enlace.
                        </p>
                      ) : (
                        additionalEmails.map((email, index) => (
                          <div key={`${index}-${email}`} className="flex gap-2">
                            <div className="relative flex-1">
                              <EmailIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                                placeholder="correo@adicional.com"
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white hover:border-gray-300"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEmailField(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar correo"
                            >
                              <CloseIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <button
                      onClick={handleGenerateLink}
                      disabled={isGenerating || !resolvedBusinessName || !primaryEmail}
                      className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isGenerating ? 'Enviando...' : `Enviar a ${recipientEmails.length || 0} destinatario${recipientEmails.length !== 1 ? 's' : ''}`}
                    </button>

                    {error && (
                      <p className="mt-1 text-xs text-red-600">{error}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <EmailIcon className="text-green-600 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    ¡Enlace Enviado Exitosamente!
                  </h3>
                  <p className="text-xs text-gray-600">
                    El enlace público de solicitud de booking ha sido enviado a:
                  </p>
                  <div className="mt-2 space-y-1">
                    {sentEmails.map((sentEmail, index) => (
                      <p key={index} className="text-xs font-medium text-gray-900">{sentEmail}</p>
                    ))}
                  </div>
                </div>

                {generatedUrl && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">URL del Enlace:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedUrl}
                        readOnly
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-2.5 py-1.5 bg-gray-600 text-white text-xs rounded-md hover:bg-gray-700 transition-colors font-medium"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Hecho
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
