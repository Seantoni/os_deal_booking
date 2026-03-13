'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { submitPublicBookingRequest } from '@/app/actions/booking'
import { getCategoryOptions } from '@/lib/categories'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import type { BookingSettings, CategoryOption, RequestFormFieldsConfig } from '@/types'
import type { BookingFormData } from './types'
import { INITIAL_FORM_DATA, STEPS, getStepIdByKey, getStepIndexByKey } from './constants'
import { buildFormDataForSubmit, getErrorFieldLabels, validateStep } from './request_form_utils'
import ProgressBar from './components/ProgressBar'
import NavigationButtons from './components/NavigationButtons'
import ConfiguracionStep from './steps/ConfiguracionStep'
import OperatividadStep from './steps/OperatividadStep'
import DirectorioStep from './steps/DirectorioStep'
import FiscalesStep from './steps/FiscalesStep'
import NegocioStep from './steps/NegocioStep'
import EstructuraStep from './steps/EstructuraStep'
import InformacionAdicionalStep from './steps/InformacionAdicionalStep'
import ContenidoStep from './steps/ContenidoStep'
import ValidacionStep from './steps/ValidacionStep'
import { useAutoScroll } from '@/hooks/useAutoScroll'

type DateValidationSettings = Pick<
  BookingSettings,
  'minDailyLaunches' | 'maxDailyLaunches' | 'merchantRepeatDays' | 'businessExceptions' | 'categoryDurations'
>

interface PublicBookingFormProps {
  token: string
  initialFormData?: Partial<BookingFormData>
  settings?: BookingSettings
}

export default function PublicBookingForm({
  token,
  initialFormData,
  settings,
}: PublicBookingFormProps) {
  const router = useRouter()
  const formContainerRef = useRef<HTMLDivElement>(null)
  const resolvedSettings = settings ?? DEFAULT_SETTINGS

  const [currentStepKey, setCurrentStepKey] = useState<string>('configuracion')
  const [formData, setFormData] = useState<BookingFormData>({ ...INITIAL_FORM_DATA, ...initialFormData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requiredFields] = useState<RequestFormFieldsConfig>(resolvedSettings.requestFormFields ?? {})
  const [runtimeCategoryOptions] = useState<CategoryOption[]>(() =>
    getCategoryOptions({
      customCategories: resolvedSettings.customCategories ?? DEFAULT_SETTINGS.customCategories,
      hiddenCategoryPaths: resolvedSettings.hiddenCategoryPaths ?? DEFAULT_SETTINGS.hiddenCategoryPaths,
    })
  )
  const [dateValidationSettings] = useState<DateValidationSettings>({
    minDailyLaunches: resolvedSettings.minDailyLaunches ?? DEFAULT_SETTINGS.minDailyLaunches,
    maxDailyLaunches: resolvedSettings.maxDailyLaunches ?? DEFAULT_SETTINGS.maxDailyLaunches,
    merchantRepeatDays: resolvedSettings.merchantRepeatDays ?? DEFAULT_SETTINGS.merchantRepeatDays,
    businessExceptions: resolvedSettings.businessExceptions ?? DEFAULT_SETTINGS.businessExceptions,
    categoryDurations: resolvedSettings.categoryDurations ?? DEFAULT_SETTINGS.categoryDurations,
  })
  const [additionalInfoMappings] = useState<NonNullable<BookingSettings['additionalInfoMappings']>>(
    resolvedSettings.additionalInfoMappings ?? DEFAULT_SETTINGS.additionalInfoMappings ?? {}
  )

  const availableSteps = STEPS
  const currentStepIndex = availableSteps.findIndex((step) => step.key === currentStepKey)
  const totalSteps = availableSteps.length

  const isFieldRequired = useCallback((fieldKey: string): boolean => {
    return requiredFields[fieldKey]?.required ?? false
  }, [requiredFields])

  const scrollToTop = useAutoScroll({
    mode: 'top',
    containerRef: formContainerRef,
    delay: 50,
    includeOverflowContainers: true,
    includeWindow: true,
  })

  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return

    setTimeout(() => {
      for (const key of errorKeys) {
        const sanitizedKey = key.replace(/\./g, '-')
        const selectors = [
          `[name="${key}"]`,
          `[data-field="${key}"]`,
          `[id="${key}"]`,
          `[name="${sanitizedKey}"]`,
          `[data-field="${sanitizedKey}"]`,
          `[id="${sanitizedKey}"]`,
        ]

        for (const selector of selectors) {
          const element = document.querySelector(selector)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement ||
              element instanceof HTMLSelectElement
            ) {
              element.focus()
            }
            return
          }
        }
      }

      const errorElement = document.querySelector('.border-red-500, .ring-red-500, [aria-invalid="true"]')
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [])

  const updateFormData = (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSubmitError(null)
    setErrors((prev) => {
      const nextErrors = { ...prev }
      let changed = false

      Object.keys(nextErrors).forEach((key) => {
        if (key === field || key.startsWith(`${field}.`)) {
          delete nextErrors[key]
          changed = true
        }
      })

      return changed ? nextErrors : prev
    })
  }

  const updatePricingOption = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const nextPricingOptions = Array.isArray(prev.pricingOptions) ? [...prev.pricingOptions] : []
      const currentOption = nextPricingOptions[index]
      if (!currentOption) return prev

      nextPricingOptions[index] = {
        ...currentOption,
        [field]: value,
      }

      return {
        ...prev,
        pricingOptions: nextPricingOptions,
      }
    })
    setSubmitError(null)
    setErrors((prev) => {
      const nextErrors = { ...prev }
      const exactKey = `pricingOptions.${index}.${field}`
      if (nextErrors[exactKey]) {
        delete nextErrors[exactKey]
        return nextErrors
      }
      return prev
    })
  }

  const addPricingOption = () => {
    setFormData((prev) => ({
      ...prev,
      pricingOptions: [
        ...prev.pricingOptions,
        {
          title: '',
          description: '',
          price: '',
          realValue: '',
          quantity: '',
          limitByUser: '',
          maxGiftsPerUser: '',
          endAt: '',
          expiresIn: '',
        },
      ],
    }))
  }

  const removePricingOption = (index: number) => {
    setFormData((prev) => {
      const nextPricingOptions = Array.isArray(prev.pricingOptions) ? [...prev.pricingOptions] : []
      nextPricingOptions.splice(index, 1)
      return {
        ...prev,
        pricingOptions: nextPricingOptions.length > 0 ? nextPricingOptions : prev.pricingOptions,
      }
    })
  }

  const handleValidateStep = useCallback((stepKey: string): Record<string, string> => {
    const stepId = getStepIdByKey(stepKey) || 1
    const validationErrors = validateStep(
      stepId,
      formData,
      requiredFields,
      stepKey,
      additionalInfoMappings
    )
    setErrors(validationErrors)
    return validationErrors
  }, [additionalInfoMappings, formData, requiredFields])

  const goToStep = (stepKey: string) => {
    setCurrentStepKey(stepKey)
    scrollToTop()
  }

  const handleStepClick = (stepKey: string) => {
    const clickedIndex = getStepIndexByKey(stepKey)
    if (clickedIndex < currentStepIndex) {
      goToStep(stepKey)
    }
  }

  const handleNext = () => {
    const validationErrors = handleValidateStep(currentStepKey)
    const errorKeys = Object.keys(validationErrors)

    if (errorKeys.length > 0) {
      const fieldLabels = getErrorFieldLabels(validationErrors)
      const maxLabelsToShow = 3
      const displayLabels = fieldLabels.slice(0, maxLabelsToShow)
      const remaining = fieldLabels.length - maxLabelsToShow

      let message = `Campos faltantes: ${displayLabels.join(', ')}`
      if (remaining > 0) {
        message += ` y ${remaining} más`
      }

      toast.error(message, { duration: 5000 })
      scrollToFirstError(errorKeys)
      return
    }

    const nextStep = availableSteps[currentStepIndex + 1]
    if (!nextStep) return

    goToStep(nextStep.key)
  }

  const handlePrevious = () => {
    const previousStep = availableSteps[currentStepIndex - 1]
    if (!previousStep) return
    goToStep(previousStep.key)
  }

  const validateEntireForm = (): { errors: Record<string, string>; firstErrorStepKey: string | null } => {
    const mergedErrors: Record<string, string> = {}
    let firstErrorStepKey: string | null = null

    availableSteps.forEach((step) => {
      const stepId = getStepIdByKey(step.key) || 1
      const stepErrors = validateStep(
        stepId,
        formData,
        requiredFields,
        step.key,
        additionalInfoMappings
      )

      if (Object.keys(stepErrors).length > 0 && !firstErrorStepKey) {
        firstErrorStepKey = step.key
      }

      Object.assign(mergedErrors, stepErrors)
    })

    const essentialFieldLabels: Record<string, string> = {
      businessName: 'Requerido',
      partnerEmail: 'Requerido',
      startDate: 'Requerido',
      endDate: 'Requerido',
    }

    const essentialFieldsOrder = [
      'businessName',
      'partnerEmail',
      'startDate',
      'endDate',
    ] as const

    essentialFieldsOrder.forEach((fieldKey) => {
      const fieldValue = formData[fieldKey]
      if (typeof fieldValue !== 'string' || fieldValue.trim().length === 0) {
        mergedErrors[fieldKey] = essentialFieldLabels[fieldKey]
        if (!firstErrorStepKey) {
          firstErrorStepKey = 'configuracion'
        }
      }
    })

    return { errors: mergedErrors, firstErrorStepKey }
  }

  const handleSubmit = async () => {
    const { errors: validationErrors, firstErrorStepKey } = validateEntireForm()
    const errorKeys = Object.keys(validationErrors)

    if (errorKeys.length > 0) {
      setErrors(validationErrors)

      if (firstErrorStepKey) {
        setCurrentStepKey(firstErrorStepKey)
      }

      const fieldLabels = getErrorFieldLabels(validationErrors)
      const maxLabelsToShow = 4
      const displayLabels = fieldLabels.slice(0, maxLabelsToShow)
      const remaining = fieldLabels.length - maxLabelsToShow

      let message = `Campos faltantes: ${displayLabels.join(', ')}`
      if (remaining > 0) {
        message += ` y ${remaining} más`
      }

      toast.error(message, { duration: 5000 })
      scrollToFirstError(errorKeys)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const formDataToSubmit = buildFormDataForSubmit(formData, additionalInfoMappings)
      const result = await submitPublicBookingRequest(token, formDataToSubmit)

      if (result.success && result.data) {
        router.push(`/booking-request/confirmation?token=${token}&requestId=${result.data.bookingRequestId}`)
        return
      }

      const errorMessage = result.error || 'Error al enviar la solicitud de booking'
      setSubmitError(errorMessage)
      toast.error(errorMessage)
    } catch (error) {
      console.error('Error submitting public booking request:', error)
      const errorMessage = 'Ocurrió un error inesperado. Por favor intente nuevamente.'
      setSubmitError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={formContainerRef}
      className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100 pb-28 md:pb-0"
    >
      <div className="max-w-7xl mx-auto px-0 md:px-4 pt-4 md:pt-8">
        <div className="px-3 md:px-0 max-w-5xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Complete su Solicitud de Booking</h1>
            <p className="mt-2 text-sm md:text-base text-gray-600">
              Complete el mismo formulario de solicitud de booking usado internamente. Su solicitud se enviará al equipo para procesamiento.
            </p>
          </div>

          <ProgressBar
            steps={availableSteps}
            currentStepKey={currentStepKey}
            onStepClick={handleStepClick}
          />

          {submitError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-xl border border-gray-100 overflow-visible mt-3 md:mt-6">
            <div className="p-4 sm:p-6 md:p-10 overflow-visible">
              <div className="animate-fadeIn overflow-visible">
                {currentStepKey === 'configuracion' && (
                  <ConfiguracionStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isPublicForm={true}
                    isFieldRequired={isFieldRequired}
                    categoryOptions={runtimeCategoryOptions}
                    dateValidationSettings={dateValidationSettings}
                  />
                )}

                {currentStepKey === 'operatividad' && (
                  <OperatividadStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                  />
                )}

                {currentStepKey === 'directorio' && (
                  <DirectorioStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                  />
                )}

                {currentStepKey === 'fiscales' && (
                  <FiscalesStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                  />
                )}

                {currentStepKey === 'negocio' && (
                  <NegocioStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                  />
                )}

                {currentStepKey === 'estructura' && (
                  <EstructuraStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    addPricingOption={addPricingOption}
                    removePricingOption={removePricingOption}
                    updatePricingOption={updatePricingOption}
                    isFieldRequired={isFieldRequired}
                  />
                )}

                {currentStepKey === 'informacion-adicional' && (
                  <InformacionAdicionalStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                    additionalInfoMappings={additionalInfoMappings}
                  />
                )}

                {currentStepKey === 'contenido' && (
                  <ContenidoStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                    aiFeaturesEnabled={false}
                  />
                )}

                {currentStepKey === 'validacion' && (
                  <ValidacionStep
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    updatePricingOption={updatePricingOption}
                    isFieldRequired={isFieldRequired}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:block mt-4 md:mt-6">
            <NavigationButtons
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              saving={submitting}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleSubmit}
              hasErrors={Object.keys(errors).length > 0}
              showSaveDraft={false}
            />
          </div>

          <div className="hidden md:block mt-8 text-center text-sm text-gray-400 pb-8">
            OfertaSimple Booking System • {new Date().getFullYear()}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
        <NavigationButtons
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          saving={submitting}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSubmit={handleSubmit}
          hasErrors={Object.keys(errors).length > 0}
          showSaveDraft={false}
        />
      </div>
    </div>
  )
}
