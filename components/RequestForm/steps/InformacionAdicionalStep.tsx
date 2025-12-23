import type { BookingFormData } from '../types'
import { FIELD_TEMPLATES, getTemplateName } from '../config'
import { DynamicField } from '../fields'

interface InformacionAdicionalStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: any) => void
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

  // Get the template name for this category combination (including raw category key fallback)
  const templateName = getTemplateName(parentCategory, subCategory1, subCategory2, category)
  const template = templateName ? FIELD_TEMPLATES[templateName] : null

  // Get display name for header
  const getDisplayName = (): string => {
    if (template) {
      return template.displayName
    }

    // Fallback to category names
    if (subCategory1) {
      return subCategory1
    }
    return parentCategory || 'Categoría'
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Información Adicional</h2>
        <p className="text-sm text-gray-500 mt-1">
          Información específica para <span className="font-semibold text-gray-700">{getDisplayName()}</span>.
        </p>
      </div>
      
      {template ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {template.fields.map((fieldConfig) => (
              <DynamicField
                key={fieldConfig.name}
                config={{
                  ...fieldConfig,
                  // Sync required/optional with settings
                  required: isFieldRequired(fieldConfig.name),
                }}
                formData={formData}
                errors={errors}
                updateFormData={updateFormData}
              />
            ))}
          </div>

          {/* Info note if present */}
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
