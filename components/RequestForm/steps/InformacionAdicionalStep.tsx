import { useEffect } from 'react'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import MicIcon from '@mui/icons-material/Mic'
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { Button, Textarea } from '@/components/ui'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import AiVoiceVisualizer from '@/components/shared/AiVoiceVisualizer'
import { FIELD_TEMPLATES, getTemplateName } from '../config'
import { DynamicField } from '../fields'
import { useAdditionalInfoAiAssistant } from '../useAdditionalInfoAiAssistant'
import type { BookingFormData } from '../types'

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
export default function InformacionAdicionalStep({
  formData,
  errors,
  updateFormData,
  isFieldRequired = () => false,
}: InformacionAdicionalStepProps) {
  const { parentCategory, subCategory1, subCategory2, category } = formData

  const templateName = getTemplateName(parentCategory, subCategory1, subCategory2, category)
  const template = templateName ? FIELD_TEMPLATES[templateName] : null

  const assistant = useAdditionalInfoAiAssistant({
    formData,
    templateName,
    template,
    updateFormData,
  })
  const resetAssistantState = assistant.resetAssistantState

  useEffect(() => {
    resetAssistantState()
  }, [resetAssistantState, templateName])

  const getDisplayName = (): string => {
    if (template) return template.displayName
    if (subCategory1) return subCategory1
    return parentCategory || 'Categoría'
  }

  const assistantActionDisabled =
    assistant.assistantActionState === 'idle'
      ? !assistant.speechSupported || !assistant.canExtract
      : assistant.assistantActionState === 'completing'

  const canRunManualExtraction =
    assistant.assistantActionState === 'idle' &&
    assistant.canExtract &&
    Boolean(assistant.assistantInput.trim())

  const pendingFieldsPreview = assistant.pendingFields.slice(0, 6)
  const hiddenPendingCount = Math.max(assistant.pendingFieldCount - pendingFieldsPreview.length, 0)

  return (
    <div className="space-y-8">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Información Adicional</h2>
        <p className="mt-1 text-sm text-gray-500">
          Información específica para <span className="font-semibold text-gray-700">{getDisplayName()}</span>.
        </p>
      </div>

      {template ? (
        <>
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <SmartToyIcon style={{ fontSize: 20 }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-indigo-900">Asistente IA</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Describa o dicte la información y la IA completará solo los campos visibles que sigan vacíos.
                  </p>
                </div>
              </div>

              <div className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                {assistant.pendingFieldCount} campo{assistant.pendingFieldCount === 1 ? '' : 's'} pendiente{assistant.pendingFieldCount === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-4">
              <Textarea
                label="Cuénteme los detalles adicionales"
                value={assistant.assistantInput}
                onChange={(e) => assistant.handleAssistantInputChange(e.target.value)}
                rows={5}
                placeholder="Ej: Incluye desayuno buffet, check-in desde las 3pm, no aceptan mascotas, parking gratis y requiere reservación previa..."
                helperText={
                  assistant.canExtract
                    ? 'Puede escribir en este campo o usar el micrófono. La IA no sobrescribirá respuestas existentes.'
                    : 'Todos los campos visibles ya tienen valor. Si desea cambiar algo, edítelo manualmente.'
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="md"
                variant={assistant.assistantActionState === 'dictating' ? 'destructive' : 'secondary'}
                className={`min-w-[220px] justify-center ${
                  assistant.assistantActionState === 'dictating'
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    : 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 hover:from-emerald-100 hover:to-teal-100'
                }`}
                onClick={() => {
                  if (assistant.assistantActionState === 'idle' || assistant.assistantActionState === 'dictating') {
                    assistant.toggleDictation()
                  }
                }}
                disabled={assistantActionDisabled}
                leftIcon={
                  assistant.assistantActionState === 'dictating'
                    ? <RadioButtonCheckedIcon fontSize="small" />
                    : <MicIcon fontSize="small" />
                }
              >
                {assistant.assistantActionState === 'dictating' ? 'Detener dictado' : 'Dictar información'}
              </Button>

              <Button
                type="button"
                size="md"
                variant="secondary"
                className="min-w-[220px] justify-center border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
                onClick={() => {
                  void assistant.processAssistantInput()
                }}
                disabled={!canRunManualExtraction}
                leftIcon={<AutoFixHighIcon style={{ fontSize: 16 }} />}
              >
                {assistant.assistantActionState === 'completing' ? 'Analizando...' : 'Completar campos con IA'}
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {assistant.assistantActionState === 'completing' && (
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                  Analizando la descripción para completar los campos pendientes...
                </div>
              )}

              {assistant.assistantActionState === 'dictating' && assistant.showFirstDictationAnimation && (
                <p className="text-sm font-medium text-rose-600">
                  Mencione los datos de los campos pendientes y la IA los organizará automáticamente.
                </p>
              )}

              {!assistant.speechSupported && (
                <p className="text-xs text-slate-500">Dictado no disponible en este navegador.</p>
              )}

              {(assistant.extractError || assistant.dictationError) && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {assistant.extractError || assistant.dictationError}
                </div>
              )}

              {assistant.aiResult && (
                <p className="text-sm text-violet-700">
                  IA encontró {assistant.aiResult.found} de {assistant.aiResult.total} campos pendientes y aplicó {assistant.aiResult.applied}.
                </p>
              )}

              <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Campos que puede completar ahora
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingFieldsPreview.length > 0 ? (
                    pendingFieldsPreview.map((field) => (
                      <span
                        key={field.name}
                        className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {field.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No hay campos visibles pendientes.</span>
                  )}
                  {hiddenPendingCount > 0 && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      +{hiddenPendingCount} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> {template.infoNote}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">
            No hay información adicional configurada para la categoría seleccionada.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Categoría: {parentCategory || 'No seleccionada'}
            {subCategory1 && ` > ${subCategory1}`}
            {subCategory2 && ` > ${subCategory2}`}
          </p>
        </div>
      )}

      <ConfirmDialog
        isOpen={assistant.dictationGuideDialog.isOpen}
        title={assistant.dictationGuideDialog.mode === 'processing' ? 'Procesando información' : 'Asistente de Voz'}
        message={(
          <div className="space-y-4 text-left">
            {(assistant.dictationGuideDialog.mode === 'recording' || assistant.dictationGuideDialog.mode === 'processing') && (
              <AiVoiceVisualizer
                mode={assistant.dictationGuideDialog.mode === 'recording' ? 'listening' : 'processing'}
                className="mb-2"
              />
            )}

            {assistant.dictationGuideDialog.mode === 'recording' && (
              <>
                <p className="text-center text-sm text-gray-600">
                  Mencione la información para estos campos pendientes:
                </p>
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                  <ul className="list-disc space-y-1 pl-5 text-xs text-gray-700">
                    {assistant.dictationGuideDialog.items.map((item) => (
                      <li key={`additional-info-guide-${item.label}`}>
                        <span className="font-semibold">{item.label}:</span> {item.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {assistant.dictationGuideDialog.mode === 'processing' && (
              <div className="space-y-2">
                <p className="text-center text-sm font-medium text-indigo-700">
                  Analizando lo dictado y completando los campos...
                </p>
                <p className="text-center text-xs text-gray-500">
                  Esto puede tomar unos segundos.
                </p>
              </div>
            )}
          </div>
        )}
        confirmText={assistant.dictationGuideDialog.mode === 'processing' ? 'Procesando...' : 'Detener dictado'}
        cancelText={assistant.dictationGuideDialog.mode === 'processing' ? '' : 'Ocultar guía'}
        confirmVariant="primary"
        loading={assistant.dictationGuideDialog.mode === 'processing'}
        loadingText="Procesando..."
        onConfirm={
          assistant.dictationGuideDialog.mode === 'processing'
            ? () => {}
            : assistant.handleGuideStopDictation
        }
        onCancel={
          assistant.dictationGuideDialog.mode === 'processing'
            ? () => {}
            : assistant.handleGuideHide
        }
        zIndex={78}
      />
    </div>
  )
}
