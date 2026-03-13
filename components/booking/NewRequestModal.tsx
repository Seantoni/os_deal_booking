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
import { Button } from '@/components/ui'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import EditIcon from '@mui/icons-material/Edit'
import LinkIcon from '@mui/icons-material/Link'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
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
        <div className="w-full max-w-md bg-white shadow-2xl md:rounded-xl flex flex-col h-full md:h-auto md:max-h-[85vh] pointer-events-auto transform transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 flex-shrink-0">
                <AddIcon style={{ fontSize: 18 }} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                  Booking
                </span>
                <h2 className="text-sm font-bold text-gray-900 truncate leading-tight">
                  Nueva Solicitud
                </h2>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1"
              aria-label="Cerrar"
            >
              <CloseIcon style={{ fontSize: 20 }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!success ? (
              <>
                <p className="text-xs text-gray-500">
                  Elija cómo desea crear la solicitud de booking:
                </p>

                <button
                  onClick={handleInternalForm}
                  className="group w-full flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-blue-300 hover:shadow-[0_2px_8px_rgba(59,130,246,0.12)] active:scale-[0.99] transition-all duration-150 text-left"
                >
                  <div className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                    <EditIcon className="text-blue-600" style={{ fontSize: 18 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Crear Formulario Interno</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Complete el formulario de solicitud de booking usted mismo con todos los detalles.
                    </p>
                  </div>
                </button>

                <div className="relative my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 bg-white text-[11px] font-medium text-gray-400 uppercase tracking-wide">o</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md border border-green-200 bg-green-50 flex-shrink-0">
                      <LinkIcon className="text-green-600" style={{ fontSize: 14 }} />
                    </div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Generar Enlace Público</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">
                        Negocio
                      </label>
                      {hasLockedBusinessContext ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                          <p className="text-xs font-semibold text-gray-900">
                            {resolvedBusinessName || 'Negocio vinculado'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
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
                      <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2.5">
                        <EmailIcon className="text-gray-400 mt-0.5 flex-shrink-0" style={{ fontSize: 16 }} />
                        <div className="min-w-0">
                          <p className={`text-xs font-medium ${primaryEmail ? 'text-gray-900' : 'text-gray-400'}`}>
                            {primaryEmail || 'Seleccione un negocio con correo de contacto'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
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
                          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-700 hover:text-green-800 transition-colors"
                        >
                          <AddIcon style={{ fontSize: 14 }} />
                          Agregar
                        </button>
                      </div>

                      {additionalEmails.length === 0 ? (
                        <p className="text-[11px] text-gray-400">
                          Puede agregar correos opcionales para copiar el enlace.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {additionalEmails.map((email, index) => (
                            <div key={`${index}-${email}`} className="flex gap-1.5">
                              <div className="relative flex-1">
                                <EmailIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 14 }} />
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                                  placeholder="correo@adicional.com"
                                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200 bg-white hover:border-gray-300"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeEmailField(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar correo"
                              >
                                <CloseIcon style={{ fontSize: 14 }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleGenerateLink}
                      disabled={!resolvedBusinessName || !primaryEmail}
                      loading={isGenerating}
                      fullWidth
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300"
                    >
                      {`Enviar a ${recipientEmails.length || 0} destinatario${recipientEmails.length !== 1 ? 's' : ''}`}
                    </Button>

                    {error && (
                      <p className="text-xs text-red-600 font-medium">{error}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-2 animate-[slideUpSmall_300ms_ease-out]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircleOutlineIcon className="text-green-600" style={{ fontSize: 28 }} />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-gray-900">
                    ¡Enlace Enviado!
                  </h3>
                  <p className="text-xs text-gray-500">
                    El enlace público de solicitud fue enviado a:
                  </p>
                  <div className="mt-2 inline-flex flex-col gap-1.5">
                    {sentEmails.map((sentEmail, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-800"
                      >
                        <EmailIcon style={{ fontSize: 12 }} />
                        {sentEmail}
                      </span>
                    ))}
                  </div>
                </div>

                {generatedUrl && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2 text-left">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">URL del Enlace</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={generatedUrl}
                        readOnly
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <Button
                        onClick={handleCopyLink}
                        variant="secondary"
                        size="xs"
                        leftIcon={<ContentCopyIcon style={{ fontSize: 14 }} />}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={handleClose} fullWidth size="sm">
                  Hecho
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
