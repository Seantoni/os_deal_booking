'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import EmailIcon from '@mui/icons-material/Email'
import SendIcon from '@mui/icons-material/Send'
import RefreshIcon from '@mui/icons-material/Refresh'

type EmailTemplateType = 'booking-confirmation' | 'booking-request' | 'rejection' | 'task-reminder'

interface EmailPreviewTabProps {
  isAdmin: boolean
}

export default function EmailPreviewTab({ isAdmin }: EmailPreviewTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType>('booking-confirmation')
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  // Generate preview HTML based on selected template
  const generatePreview = async (template: EmailTemplateType) => {
    try {
      const response = await fetch('/api/email/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template }),
      })

      const result = await response.json()

      if (result.success && result.html) {
        setPreviewHtml(result.html)
      } else {
        toast.error(result.error || 'Error al generar vista previa')
      }
    } catch (error) {
      console.error('Error generating preview:', error)
      toast.error('Error al generar vista previa')
    }
  }

  // Generate preview on mount and when template changes
  useEffect(() => {
    generatePreview(selectedTemplate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate])

  const handleTemplateChange = (template: EmailTemplateType) => {
    setSelectedTemplate(template)
  }

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error('Por favor ingresa un email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      toast.error('Por favor ingresa un email válido')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: selectedTemplate,
          to: testEmail,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Email de prueba enviado a ${testEmail}`)
      } else {
        toast.error(result.error || 'Error al enviar email de prueba')
      }
    } catch (error) {
      toast.error('Error al enviar email de prueba')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Plantilla de Email
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'booking-confirmation' as const, label: 'Confirmación de Booking' },
            { id: 'booking-request' as const, label: 'Solicitud de Booking' },
            { id: 'rejection' as const, label: 'Rechazo' },
            { id: 'task-reminder' as const, label: 'Recordatorio de Tareas' },
          ].map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateChange(template.id)}
              className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                selectedTemplate === template.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Send Test Email */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enviar Email de Prueba
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="email@ejemplo.com"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSendTestEmail}
            disabled={sending || !testEmail.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <SendIcon fontSize="small" style={{ fontSize: 16 }} />
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ingresa un email para recibir una copia de prueba de esta plantilla
        </p>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EmailIcon fontSize="small" style={{ fontSize: 18 }} />
            <h3 className="text-sm font-medium text-gray-900">Vista Previa del Email</h3>
          </div>
          <button
            onClick={() => generatePreview(selectedTemplate)}
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <RefreshIcon fontSize="small" style={{ fontSize: 14 }} />
            Actualizar
          </button>
        </div>
        <div className="p-4 bg-gray-50">
          <div
            className="bg-white rounded border border-gray-200 mx-auto"
            style={{ maxWidth: '600px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
          >
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ height: '800px', minHeight: '600px' }}
              title="Email Preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

