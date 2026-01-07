'use client'

import { useState, useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import { useModalEscape } from '@/hooks/useModalEscape'

interface ResendRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onResend: (emails: string[]) => Promise<void>
  currentEmail: string
  requestName: string
}

export default function ResendRequestModal({
  isOpen,
  onClose,
  onResend,
  currentEmail,
  requestName,
}: ResendRequestModalProps) {
  // Close modal on Escape key
  useModalEscape(isOpen, onClose)
  
  const [emailOption, setEmailOption] = useState<'same' | 'new' | 'multiple'>('same')
  const [newEmail, setNewEmail] = useState('')
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmailOption('same')
      setNewEmail('')
      setAdditionalEmails([])
      setError(null)
      setIsSending(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const validateEmail = (email: string): boolean => {
    return email.includes('@') && email.includes('.')
  }

  const handleSubmit = async () => {
    let targetEmails: string[] = []

    if (emailOption === 'same') {
      targetEmails = [currentEmail]
    } else if (emailOption === 'new') {
      if (!newEmail || !validateEmail(newEmail)) {
        setError('Por favor ingrese un correo válido')
        return
      }
      targetEmails = [newEmail]
    } else if (emailOption === 'multiple') {
      // Include original email plus all additional valid emails
      targetEmails = [currentEmail]
      const validAdditional = additionalEmails.filter(email => email && validateEmail(email))
      if (validAdditional.length === 0) {
        setError('Por favor agregue al menos un correo adicional válido')
        return
      }
      targetEmails = [...targetEmails, ...validAdditional]
    }

    setError(null)
    setIsSending(true)

    try {
      await onResend(targetEmails)
      onClose()
    } catch (err) {
      setError('Error al reenviar correo. Por favor intente de nuevo.')
    } finally {
      setIsSending(false)
    }
  }

  const addAdditionalEmail = () => {
    setAdditionalEmails([...additionalEmails, ''])
  }

  const removeAdditionalEmail = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index))
  }

  const updateAdditionalEmail = (index: number, value: string) => {
    const newEmails = [...additionalEmails]
    newEmails[index] = value
    setAdditionalEmails(newEmails)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Reenviar Solicitud</h2>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[280px]">{requestName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Elija dónde enviar el correo de la solicitud:
          </p>

          {/* Option 1: Same Email */}
          <label
            className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              emailOption === 'same'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="emailOption"
              value="same"
              checked={emailOption === 'same'}
              onChange={() => setEmailOption('same')}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <EmailIcon className="text-gray-400 w-4 h-4" />
                <span className="text-sm font-medium text-gray-900">Enviar al mismo correo</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 truncate">{currentEmail}</p>
            </div>
          </label>

          {/* Option 2: New Email */}
          <label
            className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              emailOption === 'new'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="emailOption"
              value="new"
              checked={emailOption === 'new'}
              onChange={() => setEmailOption('new')}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <EmailIcon className="text-gray-400 w-4 h-4" />
                <span className="text-sm font-medium text-gray-900">Enviar a otro correo</span>
              </div>
              {emailOption === 'new' && (
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value)
                    setError(null)
                  }}
                  placeholder="Ingrese nuevo correo"
                  className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              )}
            </div>
          </label>

          {/* Option 3: Multiple Emails */}
          <label
            className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
              emailOption === 'multiple'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="emailOption"
              value="multiple"
              checked={emailOption === 'multiple'}
              onChange={() => setEmailOption('multiple')}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <EmailIcon className="text-gray-400 w-4 h-4" />
                <span className="text-sm font-medium text-gray-900">Enviar a múltiples correos</span>
              </div>
              {emailOption === 'multiple' && (
                <div className="mt-3 space-y-2">
                  {/* Original email (always included) */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
                    <EmailIcon className="text-gray-400 w-4 h-4" />
                    <span className="text-sm text-gray-700 truncate flex-1">{currentEmail}</span>
                    <span className="text-xs text-gray-500">(original)</span>
                  </div>

                  {/* Additional emails */}
                  {additionalEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                        placeholder="correo@adicional.com"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => removeAdditionalEmail(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <CloseIcon fontSize="small" />
                      </button>
                    </div>
                  ))}

                  {/* Add email button */}
                  <button
                    type="button"
                    onClick={addAdditionalEmail}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    <AddIcon fontSize="small" />
                    <span>Agregar correo</span>
                  </button>
                </div>
              )}
            </div>
          </label>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-600 rounded-full"></span>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSending || (emailOption === 'new' && !newEmail) || (emailOption === 'multiple' && additionalEmails.length === 0)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <SendIcon fontSize="small" />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
