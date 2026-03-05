import { useState } from 'react'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import type { BookingFormData } from '../types'
import { FIELD_TEMPLATES, getTemplateName } from '../config'
import { DynamicField } from '../fields'
import toast from 'react-hot-toast'

interface InformacionAdicionalStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

/**
 * InformacionAdicionalStep - Dynamic category-specific additional information
 * 
 * Uses template-based system to render fields dynamically based on category selection.
 * Templates are defined in config/field-templates.ts
 * Mapping is defined in config/template-mapping.ts
 *
 * Matching priority:
 * 1. parentCategory:subCategory1:subCategory2 (most specific)
 * 2. parentCategory:subCategory1
 * 3. parentCategory (least specific)
 * 4. categoryKey (raw key if provided)
 */
export default function InformacionAdicionalStep({ formData, errors, updateFormData, isFieldRequired = () => false }: InformacionAdicionalStepProps) {
  const { parentCategory, subCategory1, subCategory2, category } = formData
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ found: number; total: number } | null>(null)

  const templateName = getTemplateName(parentCategory, subCategory1, subCategory2, category)
  const template = templateName ? FIELD_TEMPLATES[templateName] : null

  const hasTextContent =
    !!formData.aboutOffer || !!formData.goodToKnow || !!formData.whatWeLike ||
    !!formData.howToUseEs || !!formData.businessReview || !!formData.addressAndHours

  const handleAiExtract = async () => {
    if (!template || aiLoading) return

    setAiLoading(true)
    setAiResult(null)

    try {
      const response = await fetch('/api/ai/extract-template-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent: {
            aboutOffer: formData.aboutOffer || '',
            goodToKnow: formData.goodToKnow || '',
            whatWeLike: formData.whatWeLike || '',
            howToUseEs: formData.howToUseEs || '',
            businessReview: formData.businessReview || '',
            addressAndHours: formData.addressAndHours || '',
            paymentInstructions: formData.paymentInstructions || '',
          },
          fields: template.fields.map(f => ({
            name: f.name,
            label: f.label,
            type: f.type,
            options: f.options || undefined,
          })),
          templateName,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Error al extraer información')
        return
      }

      const extracted = data.extracted as Record<string, string>
      let applied = 0
      for (const [fieldName, value] of Object.entries(extracted)) {
        if (value && fieldName in formData) {
          const currentValue = (formData as Record<string, unknown>)[fieldName]
          if (!currentValue || currentValue === '') {
            updateFormData(fieldName as keyof BookingFormData, value)
            applied++
          }
        }
      }

      setAiResult({ found: data.fieldsFound, total: data.fieldsTotal })

      if (applied > 0) {
        toast.success(`${applied} campo${applied > 1 ? 's' : ''} completado${applied > 1 ? 's' : ''} con IA`)
      } else if (data.fieldsFound > 0) {
        toast.success('Los campos extraídos ya tenían valores, no se sobrescribieron')
      } else {
        toast('No se encontró información relevante en el texto', { icon: '🔍' })
      }
    } catch (error) {
      console.error('AI extraction error:', error)
      toast.error('Error al procesar con IA')
    } finally {
      setAiLoading(false)
    }
  }

  const getDisplayName = (): string => {
    if (template) return template.displayName
    if (subCategory1) return subCategory1
    return parentCategory || 'Categoría'
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Información Adicional</h2>
            <p className="text-sm text-gray-500 mt-1">
              Información específica para <span className="font-semibold text-gray-700">{getDisplayName()}</span>.
            </p>
          </div>

          {template && hasTextContent && (
            <button
              type="button"
              onClick={handleAiExtract}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <AutoFixHighIcon style={{ fontSize: 14 }} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'Analizando...' : 'Auto-completar con IA'}
            </button>
          )}
        </div>

        {aiResult && (
          <p className="text-xs text-violet-600 mt-2">
            IA encontró {aiResult.found} de {aiResult.total} campos en el texto existente.
          </p>
        )}
      </div>
      
      {template ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {template.fields.map((fieldConfig) => (
              <DynamicField
                key={fieldConfig.name}
                config={{
                  ...fieldConfig,
                  required: isFieldRequired(fieldConfig.name),
                }}
                formData={formData}
                errors={errors}
                updateFormData={updateFormData}
              />
            ))}
          </div>

          {template.infoNote && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> {template.infoNote}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No hay información adicional configurada para la categoría seleccionada.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Categoría: {parentCategory || 'No seleccionada'}
            {subCategory1 && ` > ${subCategory1}`}
            {subCategory2 && ` > ${subCategory2}`}
          </p>
        </div>
      )}
    </div>
  )
}
