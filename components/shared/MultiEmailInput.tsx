'use client'

import { useRef } from 'react'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import { Input } from '@/components/ui'

interface MultiEmailInputProps {
  primaryEmail: string
  additionalEmails: string[]
  onPrimaryEmailChange: (email: string) => void
  onAdditionalEmailsChange: (emails: string[]) => void
  error?: string
  label?: string
  placeholder?: string
  required?: boolean
}

export default function MultiEmailInput({
  primaryEmail,
  additionalEmails,
  onPrimaryEmailChange,
  onAdditionalEmailsChange,
  error,
  label = 'Correo del Aliado',
  placeholder = 'aliado@negocio.com',
  required = true,
}: MultiEmailInputProps) {
  const emailInputRef = useRef<HTMLInputElement>(null)
  const additionalInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>, index: number | null) => {
    const value = e.target.value
    // Update the appropriate email
    if (index === null) {
      onPrimaryEmailChange(value)
    } else {
      const newEmails = [...additionalEmails]
      newEmails[index] = value
      onAdditionalEmailsChange(newEmails)
    }
  }

  const addEmail = () => {
    onAdditionalEmailsChange([...additionalEmails, ''])
    // Focus the new input after render
    setTimeout(() => {
      const newIndex = additionalEmails.length
      additionalInputRefs.current[newIndex]?.focus()
    }, 50)
  }

  const removeEmail = (index: number) => {
    const newEmails = additionalEmails.filter((_, i) => i !== index)
    onAdditionalEmailsChange(newEmails)
  }


  return (
    <div className="space-y-3">
      {/* Primary Email */}
      <div className="group relative">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
          <span>{label}</span>
          {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={emailInputRef}
              type="email"
              value={primaryEmail}
              onChange={(e) => handleEmailChange(e, null)}
              placeholder={placeholder}
              error={error}
              size="md"
              fullWidth
            />
          </div>
          <button
            type="button"
            onClick={addEmail}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-colors"
            title="Agregar otro correo"
          >
            <AddIcon fontSize="small" />
          </button>
        </div>
      </div>

      {/* Additional Emails */}
      {additionalEmails.map((email, index) => (
        <div key={index} className="group relative">
          <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-2">
            <EmailIcon className="w-3.5 h-3.5" />
            Correo adicional {index + 1}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                ref={(el) => { additionalInputRefs.current[index] = el }}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e, index)}
                placeholder="correo@adicional.com"
                size="sm"
                fullWidth
              />
            </div>
            <button
              type="button"
              onClick={() => removeEmail(index)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 transition-colors"
              title="Eliminar correo"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>
      ))}

      {/* Helper text */}
      {additionalEmails.length > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <EmailIcon className="w-3.5 h-3.5" />
          La solicitud se enviará a {additionalEmails.length + 1} correos
        </p>
      )}
    </div>
  )
}

