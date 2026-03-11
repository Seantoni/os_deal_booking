'use client'

import { useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useSpeechDictationAssistant, type DictationGuideItem } from '@/components/shared/useSpeechDictationAssistant'
import type { CategoryFieldsConfig, FieldConfig } from './config/field-types'
import { isTemplateFieldVisible } from './template-field-visibility'
import type { BookingFormData } from './types'

interface UseAdditionalInfoAiAssistantArgs {
  formData: BookingFormData
  templateName: string | null
  template: CategoryFieldsConfig[string] | null
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
}

interface AdditionalInfoAiResult {
  applied: number
  found: number
  total: number
}

type ExtractTextContent = {
  assistantInput?: string
  nameEs?: string
  shortTitle?: string
  emailTitle?: string
  aboutCompany?: string
  aboutOffer?: string
  goodToKnow?: string
  whatWeLike?: string
  howToUseEs?: string
  businessReview?: string
  addressAndHours?: string
  paymentInstructions?: string
  contactDetails?: string
  socialMedia?: string
}

function isBlank(value: BookingFormData[keyof BookingFormData]): boolean {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'string') return value.trim().length === 0
  return value === undefined || value === null
}

function buildGuideItems(fields: FieldConfig[]): DictationGuideItem[] {
  if (fields.length === 0) {
    return [
      {
        label: 'Campos completos',
        suggestion: 'Los campos visibles ya tienen valor. El asistente no sobrescribirá datos existentes.',
      },
    ]
  }

  return fields.slice(0, 6).map((field) => ({
    label: field.label,
    suggestion: field.placeholder || field.helpText || 'Mencione este dato si lo conoce.',
  }))
}

export function useAdditionalInfoAiAssistant({
  formData,
  templateName,
  template,
  updateFormData,
}: UseAdditionalInfoAiAssistantArgs) {
  const [assistantInput, setAssistantInput] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AdditionalInfoAiResult | null>(null)

  const relevantFields = useMemo(() => (
    template
      ? template.fields.filter((field) => (
        isTemplateFieldVisible(field, formData) &&
        isBlank(formData[field.name as keyof BookingFormData])
      ))
      : []
  ), [formData, template])

  const contenidoTextContent = useMemo<ExtractTextContent>(() => ({
    nameEs: formData.nameEs.trim() || undefined,
    shortTitle: formData.shortTitle.trim() || undefined,
    emailTitle: formData.emailTitle.trim() || undefined,
    aboutCompany: formData.aboutCompany.trim() || undefined,
    aboutOffer: formData.aboutOffer.trim() || undefined,
    goodToKnow: formData.goodToKnow.trim() || undefined,
    whatWeLike: formData.whatWeLike.trim() || undefined,
    howToUseEs: formData.howToUseEs.trim() || undefined,
    businessReview: formData.businessReview.trim() || undefined,
    addressAndHours: formData.addressAndHours.trim() || undefined,
    paymentInstructions: formData.paymentInstructions.trim() || undefined,
    contactDetails: formData.contactDetails.trim() || undefined,
    socialMedia: formData.socialMedia.trim() || undefined,
  }), [
    formData.aboutCompany,
    formData.aboutOffer,
    formData.addressAndHours,
    formData.businessReview,
    formData.contactDetails,
    formData.emailTitle,
    formData.goodToKnow,
    formData.howToUseEs,
    formData.nameEs,
    formData.paymentInstructions,
    formData.shortTitle,
    formData.socialMedia,
    formData.whatWeLike,
  ])

  const runExtraction = useCallback(async (textContent: ExtractTextContent, emptyStateMessage: string) => {
    if (!template || !templateName || relevantFields.length === 0) return
    const hasText = Object.values(textContent).some((value) => typeof value === 'string' && value.trim().length > 0)
    if (!hasText) return

    setIsExtracting(true)
    setExtractError(null)
    setAiResult(null)

    try {
      const response = await fetch('/api/ai/extract-template-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textContent,
          fields: relevantFields.map((field) => ({
            name: field.name,
            label: field.label,
            type: field.type,
            options: field.options || undefined,
          })),
          templateName,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        const message = data?.error && typeof data.error === 'string'
          ? data.error
          : 'Error al extraer información'
        throw new Error(message)
      }

      const extracted = data.extracted as Record<string, string>
      let applied = 0

      for (const [fieldName, value] of Object.entries(extracted)) {
        if (!value || !(fieldName in formData)) continue

        const currentValue = formData[fieldName as keyof BookingFormData]
        if (!isBlank(currentValue)) continue

        updateFormData(fieldName as keyof BookingFormData, value)
        applied += 1
      }

      setAiResult({
        applied,
        found: data.fieldsFound,
        total: relevantFields.length,
      })

      if (applied > 0) {
        toast.success(`${applied} campo${applied > 1 ? 's' : ''} completado${applied > 1 ? 's' : ''} con IA`)
      } else if (data.fieldsFound > 0) {
        toast.success('La IA detectó datos, pero esos campos ya tenían valor y no se sobrescribieron')
      } else {
        toast(emptyStateMessage, { icon: '🔍' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar con IA'
      setExtractError(message)
      toast.error(message)
    } finally {
      setIsExtracting(false)
    }
  }, [formData, relevantFields, template, templateName, updateFormData])

  const processAssistantInput = useCallback(async (textToProcess?: string) => {
    const sourceText = (textToProcess ?? assistantInput).trim()
    if (!sourceText) return

    await runExtraction(
      { assistantInput: sourceText },
      'No se encontró información relevante para los campos pendientes'
    )
  }, [assistantInput, runExtraction])

  const processContenidoStepInput = useCallback(async () => {
    await runExtraction(
      contenidoTextContent,
      'No se encontró información útil en el contenido replicado para los campos pendientes'
    )
  }, [contenidoTextContent, runExtraction])

  const dictation = useSpeechDictationAssistant({
    currentText: assistantInput,
    setText: setAssistantInput,
    buildGuideItems: () => buildGuideItems(relevantFields),
    processText: async (text) => {
      await processAssistantInput(text)
    },
    onBeforeStart: () => {
      setExtractError(null)
      setAiResult(null)
    },
  })

  const clearDictationError = dictation.clearDictationError
  const dictationError = dictation.dictationError
  const resetDictationState = dictation.resetDictationState
  const dictationGuideDialog = dictation.dictationGuideDialog
  const handleGuideHide = dictation.handleGuideHide
  const handleGuideStopDictation = dictation.handleGuideStopDictation
  const showFirstDictationAnimation = dictation.showFirstDictationAnimation
  const speechSupported = dictation.speechSupported
  const toggleDictation = dictation.toggleDictation

  const handleAssistantInputChange = useCallback((value: string) => {
    setAssistantInput(value)
    if (extractError) setExtractError(null)
    if (aiResult) setAiResult(null)
    if (dictationError) {
      clearDictationError()
    }
  }, [aiResult, clearDictationError, dictationError, extractError])

  const resetAssistantState = useCallback(() => {
    setAssistantInput('')
    setIsExtracting(false)
    setExtractError(null)
    setAiResult(null)
    resetDictationState()
  }, [resetDictationState])

  const assistantActionState: 'idle' | 'dictating' | 'completing' =
    dictation.isDictating
      ? 'dictating'
      : isExtracting
        ? 'completing'
        : 'idle'

  return {
    aiResult,
    assistantActionState,
    assistantInput,
    canExtract: relevantFields.length > 0,
    canExtractFromContenido: Object.values(contenidoTextContent).some(
      (value) => typeof value === 'string' && value.trim().length > 0
    ),
    dictationError,
    dictationGuideDialog,
    extractError,
    handleAssistantInputChange,
    handleGuideHide,
    handleGuideStopDictation,
    pendingFieldCount: relevantFields.length,
    pendingFields: relevantFields,
    processContenidoStepInput,
    processAssistantInput,
    resetAssistantState,
    showFirstDictationAnimation,
    speechSupported,
    toggleDictation,
  }
}
