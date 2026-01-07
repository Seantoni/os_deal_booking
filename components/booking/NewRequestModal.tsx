'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSendPublicLink } from '@/app/actions/booking'
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
  queryParams?: Record<string, string> // Optional query params for pre-filling (e.g., from opportunity)
}

export default function NewRequestModal({ isOpen, onClose, queryParams }: NewRequestModalProps) {
  const router = useRouter()
  const [emails, setEmails] = useState<string[]>(['']) // Array of emails
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [sentEmails, setSentEmails] = useState<string[]>([])

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const isGenerating = isPending

  // Close modal on Escape key
  useModalEscape(isOpen, onClose)

  if (!isOpen) return null

  const handleInternalForm = () => {
    let url = '/booking-requests/new'
    const params = new URLSearchParams()
    
    // Add existing query params (e.g., from opportunity)
    if (queryParams && Object.keys(queryParams).length > 0) {
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value)
      })
    }
    
    // Add emails from the modal if any were entered
    const validEmails = emails.filter(e => e && e.includes('@'))
    if (validEmails.length > 0) {
      // First email becomes the primary email (partnerEmail)
      params.append('partnerEmail', validEmails[0])
      // Remaining emails become additional emails
      if (validEmails.length > 1) {
        params.append('additionalEmails', JSON.stringify(validEmails.slice(1)))
      }
    }
    
    if (params.toString()) {
      url = `${url}?${params.toString()}`
    }
    router.push(url)
    onClose()
  }

  // React 19: Generate link handler using useTransition
  const handleGenerateLink = () => {
    // Filter valid emails
    const validEmails = emails.filter(e => e && e.includes('@'))
    
    if (validEmails.length === 0) {
      setError('Por favor ingrese al menos una dirección de correo válida')
      return
    }

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const result = await generateAndSendPublicLink(validEmails)
        
        if (result.success && result.data) {
          setSuccess(true)
          setGeneratedUrl(result.data.url)
          setSentEmails(validEmails)
          setEmails(['']) // Clear email fields
        } else {
          setError(result.error || 'Error al generar el enlace')
        }
      } catch (err) {
        console.error('Error generating link:', err)
        setError('Ocurrió un error inesperado')
      }
    })
  }

  const addEmailField = () => {
    setEmails([...emails, ''])
  }

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
    setError(null)
  }

  const hasValidEmail = emails.some(e => e && e.includes('@'))

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

  const handleClose = () => {
    setEmails([''])
    setError(null)
    setSuccess(false)
    setGeneratedUrl(null)
    setSentEmails([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Nueva Solicitud de Booking</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!success ? (
            <>
              <p className="text-xs text-gray-600 mb-3">
                Elija cómo desea crear la solicitud de booking:
              </p>

              {/* Option 1: Internal Form */}
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

              {/* Divider */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">O</span>
                </div>
              </div>

              {/* Option 2: Generate Link */}
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

                {/* Email Inputs */}
                <div className="pl-9 space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                    Correo{emails.length > 1 ? 's' : ''} del Destinatario{emails.length > 1 ? 's' : ''}
                  </label>
                  
                  {emails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <EmailIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          placeholder="negocio@ejemplo.com"
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200 bg-white hover:border-gray-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && hasValidEmail) {
                              handleGenerateLink()
                            }
                          }}
                        />
                      </div>
                      {index === 0 ? (
                        <button
                          type="button"
                          onClick={addEmailField}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors border border-green-200"
                          title="Agregar otro correo"
                        >
                          <AddIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeEmailField(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar correo"
                        >
                          <CloseIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={handleGenerateLink}
                    disabled={isGenerating || !hasValidEmail}
                    className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isGenerating ? 'Enviando...' : `Enviar a ${emails.filter(e => e && e.includes('@')).length || 0} destinatario${emails.filter(e => e && e.includes('@')).length !== 1 ? 's' : ''}`}
                  </button>
                  
                  {error && (
                    <p className="mt-1 text-xs text-red-600">{error}</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Success State */
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
  )
}

