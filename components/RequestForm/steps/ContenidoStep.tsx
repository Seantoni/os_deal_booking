'use client'

import { useState } from 'react'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { BookingFormData } from '../types'
import { Input, Textarea, Button, Dropdown } from '@/components/ui'

interface ContenidoStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
  aiFeaturesEnabled?: boolean
}

// AI field configuration — matches docs/ai-content-field-definitions.md
const AI_FIELDS = {
  nameEs: {
    label: 'Título de la oferta',
    placeholder: 'Ej: Paga $69 por micropigmentación de cejas en Studio Bel-Lash (Valor $250)',
    rows: 2,
    maxLength: 120,
    hint: '60–120 caracteres. Formato: Paga $[PRECIO] por [descripción] en [Negocio] (Valor $[VALOR]).',
  },
  shortTitle: {
    label: 'Título corto',
    placeholder: 'Ej: $14 por Rodizio todo incluido',
    rows: 1,
    maxLength: 60,
    isInput: true,
    hint: 'Máx 60 caracteres. Para tarjetas y móvil.',
  },
  emailTitle: {
    label: 'Título del email',
    placeholder: 'Ej: 50% OFF',
    rows: 1,
    maxLength: 30,
    isInput: true,
    hint: 'Máx 30 caracteres. Gancho para newsletter.',
  },
  aboutOffer: {
    label: 'Acerca de esta oferta',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 8,
    maxLength: 2000,
    hint: 'Intro del negocio, opciones de compra, detalles, y llamada a acción.',
  },
  whatWeLike: {
    label: 'Lo que nos gusta',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 6,
    maxLength: 800,
    hint: '4–8 puntos destacados. HTML <ul><li>.',
  },
  goodToKnow: {
    label: 'Lo que conviene saber',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 10,
    maxLength: 2500,
    hint: '5 secciones: Info General, Restricciones, Reservaciones, Método de Canje, Periodo de Validez.',
  },
  howToUseEs: {
    label: 'Cómo usar',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 6,
    maxLength: 1000,
    hint: 'Instrucciones paso a paso para canjear el voucher.',
  },
} as const

type AIFieldKey = keyof typeof AI_FIELDS

export default function ContenidoStep({
  formData,
  errors,
  updateFormData,
  isFieldRequired = () => false,
  aiFeaturesEnabled = true,
}: ContenidoStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateAll = async () => {
    if (!formData.businessName?.trim()) return
    
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/ai/generate-booking-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formData: {
            ...Object.fromEntries(
              Object.entries(formData).filter(([key]) => 
                !['nameEs', 'shortTitle', 'emailTitle', 'whatWeLike', 'aboutCompany', 'aboutOffer', 'goodToKnow', 'howToUseEs'].includes(key)
              )
            ),
          },
        }),
      })
      if (!response.ok) throw new Error('No se pudo generar el contenido.')
      const data = await response.json()
      
      ;(Object.keys(AI_FIELDS) as AIFieldKey[]).forEach(key => {
        if (data?.[key]) {
          updateFormData(key as keyof BookingFormData, data[key])
        }
      })
    } catch (error) {
      console.error('AI generate all error', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const firstPriceOption = formData.pricingOptions?.length > 0
    ? formData.pricingOptions
        .filter(opt => opt.price && parseFloat(opt.price) > 0)
        .sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'))[0]
    : null

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Contenido y Políticas</h2>
        <p className="text-sm text-gray-500 mt-1">Información visible para el cliente y términos de la oferta.</p>
      </div>
      
      {/* Contact & Social Media Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
          Información de Contacto
        </h3>
        
          <Input
          label="Número, correo electrónico y/o app específico"
          required={isFieldRequired('contactDetails')}
            value={formData.contactDetails}
            onChange={(e) => updateFormData('contactDetails', e.target.value)}
            placeholder="Detalles de contacto para canje"
          error={errors.contactDetails}
          />

          <Input
          label="Redes Sociales y Web"
          required={isFieldRequired('socialMedia')}
            value={formData.socialMedia}
            onChange={(e) => updateFormData('socialMedia', e.target.value)}
            placeholder="Ej: @instagram_handle, www.sitio.com"
          error={errors.socialMedia}
          />
      </div>

      {/* AI-Generated Content Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Contenido para Página de Oferta</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contenido que se mostrará en la página pública de la oferta</p>
          </div>
          {aiFeaturesEnabled && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isGenerating || !formData.businessName?.trim()}
              onClick={handleGenerateAll}
              className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white focus-visible:ring-purple-500 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {isGenerating ? (
                <RefreshIcon fontSize="small" className="animate-spin" />
              ) : (
                <AutoFixHighIcon fontSize="small" />
              )}
              {isGenerating ? 'Generando...' : 'Generar con IA'}
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-purple-600 font-medium p-4 bg-purple-50 rounded-lg">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Generando contenido con IA para todos los campos...</span>
          </div>
        )}

        {/* Price context helper */}
        {firstPriceOption && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            Referencia de precio: <span className="font-medium text-blue-600">${firstPriceOption.price}</span>
            {firstPriceOption.realValue && <> (Valor: <span className="font-medium">${firstPriceOption.realValue}</span>)</>}
            {' — '}{firstPriceOption.title || firstPriceOption.description || 'Sin título'}
          </div>
        )}

        {(Object.keys(AI_FIELDS) as AIFieldKey[]).map((fieldKey) => {
          const config = AI_FIELDS[fieldKey]
          const currentValue = formData[fieldKey] || ''
          
          return (
            <div key={fieldKey}>
              <label className="block text-xs font-medium text-slate-600 mb-0.5 flex items-center gap-1">
                <span>{config.label}</span>
                {aiFeaturesEnabled && (
                  <span className="text-xs text-purple-500 font-normal">(IA)</span>
                )}
              </label>
              {'hint' in config && (
                <p className="text-[11px] text-gray-400 mb-1.5">{config.hint}</p>
              )}
              {'isInput' in config && config.isInput ? (
                <Input
                  value={currentValue}
                  onChange={(e) => updateFormData(fieldKey, e.target.value)}
                  maxLength={config.maxLength}
                  placeholder={isGenerating ? 'Generando con IA...' : config.placeholder}
                  error={errors[fieldKey]}
                  disabled={isGenerating}
                />
              ) : (
                <Textarea
                  value={currentValue}
                  onChange={(e) => updateFormData(fieldKey, e.target.value)}
                  rows={config.rows}
                  maxLength={config.maxLength}
                  placeholder={isGenerating ? 'Generando con IA...' : config.placeholder}
                  error={errors[fieldKey]}
                  disabled={isGenerating}
                  helperText={!isGenerating ? `${currentValue.length}/${config.maxLength} caracteres` : undefined}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Policies Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-2">
          Políticas y Términos
        </h3>
        
          <Textarea
          label="Políticas de Cancelación"
          required={isFieldRequired('cancellationPolicy')}
            value={formData.cancellationPolicy}
            onChange={(e) => updateFormData('cancellationPolicy', e.target.value)}
            rows={3}
            placeholder="Políticas de reservación y cancelación..."
            error={errors.cancellationPolicy}
          />

          <Dropdown
          label="Validación de Mercado"
          required={isFieldRequired('marketValidation')}
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí (El paquete se ofrece regularmente por el Aliado)' },
              { value: 'No', label: 'No' },
            ]}
            value={formData.marketValidation}
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('marketValidation', value)}
          error={errors.marketValidation}
        />

          <Textarea
          label="Comentarios Finales"
          required={isFieldRequired('additionalComments')}
            value={formData.additionalComments}
            onChange={(e) => updateFormData('additionalComments', e.target.value)}
            rows={4}
            placeholder="Comentarios adicionales del asesor comercial..."
            error={errors.additionalComments}
          />
      </div>
    </div>
  )
}
