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
}

// AI field configuration
const AI_FIELDS = {
  shortTitle: {
    label: 'Título',
    placeholder: 'Ej: $14 por Rodizio todo incluido',
    rows: 1,
    maxLength: 100,
    isInput: true, // Use Input instead of Textarea
  },
  whatWeLike: {
    label: 'Lo que nos gusta',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 5,
    maxLength: 800,
  },
  aboutCompany: {
    label: 'La empresa',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 5,
    maxLength: 600,
  },
  aboutOffer: {
    label: 'Acerca de esta oferta',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 6,
    maxLength: 1200,
  },
  goodToKnow: {
    label: 'Lo que conviene saber',
    placeholder: 'Se generará automáticamente con IA...',
    rows: 8,
    maxLength: 1500,
  },
} as const

type AIFieldKey = keyof typeof AI_FIELDS

export default function ContenidoStep({ formData, errors, updateFormData, isFieldRequired = () => false }: ContenidoStepProps) {
  // AI generation state - single loading state for all fields
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate all AI fields at once
  const handleGenerateAll = async () => {
    if (!formData.businessName?.trim()) return
    
    setIsGenerating(true)
    
    try {
      // Send all form data to AI - it will use relevant fields for generation
      // This includes dynamic fields from InformacionAdicionalStep
      const response = await fetch('/api/ai/generate-booking-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formData: {
            // Basic info
            businessName: formData.businessName,
            partnerEmail: formData.partnerEmail,
            // Categories
            parentCategory: formData.parentCategory,
            subCategory1: formData.subCategory1,
            subCategory2: formData.subCategory2,
            // Dates
            startDate: formData.startDate,
            endDate: formData.endDate,
            // Description & content
            addressAndHours: formData.addressAndHours,
            socialMedia: formData.socialMedia,
            contactDetails: formData.contactDetails,
            // Pricing
            pricingOptions: formData.pricingOptions,
            // Operations
            redemptionMode: formData.redemptionMode,
            includesTaxes: formData.includesTaxes,
            validOnHolidays: formData.validOnHolidays,
            blackoutDates: formData.blackoutDates,
            vouchersPerPerson: formData.vouchersPerPerson,
            giftVouchers: formData.giftVouchers,
            hasOtherBranches: formData.hasOtherBranches,
            // Policies
            cancellationPolicy: formData.cancellationPolicy,
            // Contact
            redemptionContactName: formData.redemptionContactName,
            redemptionContactEmail: formData.redemptionContactEmail,
            redemptionContactPhone: formData.redemptionContactPhone,
            redemptionMethods: formData.redemptionMethods,
            // Additional Info (dynamic fields from InformacionAdicionalStep)
            // Pass entire formData to capture any category-specific fields
            ...Object.fromEntries(
              Object.entries(formData).filter(([key]) => 
                // Include any fields that might be from dynamic templates
                !['whatWeLike', 'aboutCompany', 'aboutOffer', 'goodToKnow'].includes(key)
              )
            ),
          },
        }),
      })
      if (!response.ok) throw new Error('No se pudo generar el contenido.')
      const data = await response.json()
      
      // Update all fields
      Object.keys(AI_FIELDS).forEach(key => {
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
            placeholder="Ej: @instagram_handle, www.sitio.com"
          />
        </div>

      </div>

      {/* AI-Generated Content Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Contenido para Página de Oferta</h3>
            <p className="text-xs text-gray-500 mt-0.5">Contenido que se mostrará en la página pública de la oferta</p>
          </div>
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
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-purple-600 font-medium p-4 bg-purple-50 rounded-lg">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Generando contenido con IA para todos los campos...</span>
          </div>
        )}

        {(Object.keys(AI_FIELDS) as AIFieldKey[]).map((fieldKey) => {
          const config = AI_FIELDS[fieldKey]
          const currentValue = formData[fieldKey] || ''
          
          // For shortTitle, show the lowest price option info
          const lowestPriceOption = fieldKey === 'shortTitle' && formData.pricingOptions?.length > 0
            ? formData.pricingOptions
                .filter(opt => opt.price && parseFloat(opt.price) > 0)
                .sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'))[0]
            : null
          
          return (
            <div key={fieldKey} className="group">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <span>{config.label}</span>
                <span className="text-xs text-purple-500 font-normal">(IA)</span>
              </label>
              {fieldKey === 'shortTitle' && lowestPriceOption && (
                <p className="text-xs text-gray-500 mb-2">
                  Basado en: <span className="font-medium text-blue-600">${lowestPriceOption.price}</span> - {lowestPriceOption.title || lowestPriceOption.description || 'Sin título'}
                </p>
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
        
        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Políticas de Cancelación</span>
            {isFieldRequired('cancellationPolicy') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Textarea
            value={formData.cancellationPolicy}
            onChange={(e) => updateFormData('cancellationPolicy', e.target.value)}
            rows={3}
            placeholder="Políticas de reservación y cancelación..."
            error={errors.cancellationPolicy}
          />
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Validación de Mercado</span>
            {isFieldRequired('marketValidation') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Dropdown
            fullWidth
            items={[
              { value: 'Sí', label: 'Sí (El paquete se ofrece regularmente por el Aliado)' },
              { value: 'No', label: 'No' },
            ]}
            selectedLabel={
              (
                [
                  { value: 'Sí', label: 'Sí (El paquete se ofrece regularmente por el Aliado)' },
                  { value: 'No', label: 'No' },
                ].find(o => o.value === formData.marketValidation)?.label
              ) || 'Seleccionar...'
            }
            placeholder="Seleccionar..."
            onSelect={(value) => updateFormData('marketValidation', value)}
          />
          {errors.marketValidation && <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.marketValidation}</p>}
        </div>

        <div className="group">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>Comentarios Finales</span>
            {isFieldRequired('additionalComments') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Opcional)</span>
            )}
          </label>
          <Textarea
            value={formData.additionalComments}
            onChange={(e) => updateFormData('additionalComments', e.target.value)}
            rows={4}
            placeholder="Comentarios adicionales del asesor comercial..."
            error={errors.additionalComments}
          />
        </div>
      </div>
    </div>
  )
}
