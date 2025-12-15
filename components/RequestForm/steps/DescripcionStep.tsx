import { useState } from 'react'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import type { BookingFormData } from '../types'
import { Input, Textarea, Button } from '@/components/ui'

interface DescripcionStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function DescripcionStep({ formData, errors, updateFormData, isFieldRequired = () => false }: DescripcionStepProps) {
  const [aiLoading, setAiLoading] = useState(false)

  const handleImproveWithAI = async () => {
    if (!formData.businessReview?.trim()) return
    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/improve-business-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.businessReview }),
      })
      if (!response.ok) throw new Error('No se pudo mejorar la reseña.')
      const data = await response.json()
      if (data?.text) {
        updateFormData('businessReview', data.text)
      }
    } catch (error) {
      console.error('AI improve error', error)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Descripción y Canales de Venta</h2>
        <p className="text-sm text-gray-500 mt-1">Información visible para el cliente.</p>
      </div>
      
      <div className="space-y-6">
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Número, correo electrónico y/o app específico
          </label>
          <Input
            value={formData.contactDetails}
            onChange={(e) => updateFormData('contactDetails', e.target.value)}
            placeholder="Detalles de contacto para canje"
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Redes Sociales y Web</label>
          <Input
            value={formData.socialMedia}
            onChange={(e) => updateFormData('socialMedia', e.target.value)}
            placeholder="Ej: @instagram_handle"
          />
        </div>

        <div className="group">
          <div className="flex items-center justify-between mb-2 gap-3">
            <label className="block text-sm font-semibold text-gray-700">Reseña del Negocio</label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={aiLoading || !formData.businessReview.trim()}
              onClick={handleImproveWithAI}
              className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white focus-visible:ring-purple-500 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <AutoFixHighIcon fontSize="small" />
              {aiLoading ? 'AI...' : 'AI'}
            </Button>
          </div>
          <div className="relative">
            <Textarea
              value={formData.businessReview}
              onChange={(e) => updateFormData('businessReview', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Máximo 500 caracteres..."
              error={errors.businessReview}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-1 rounded">
              {formData.businessReview.length}/500
            </div>
          </div>
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span>Detalle del Contenido (Temario/Sinopsis)</span>
            {isFieldRequired('offerDetails') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Textarea
            value={formData.offerDetails}
            onChange={(e) => updateFormData('offerDetails', e.target.value)}
            rows={4}
            placeholder="Temario o Sinopsis/Descripción completa de la oferta..."
            error={errors.offerDetails}
          />
        </div>
      </div>
    </div>
  )
}

