'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { submitPublicBookingRequest } from '@/app/actions/booking'
import { getCategoryOptions } from '@/lib/categories'
import { DEFAULT_SETTINGS } from '@/lib/settings'
import type { BookingSettings, CategoryOption, RequestFormFieldsConfig } from '@/types'
import type { BookingFormData } from './types'
import { INITIAL_FORM_DATA, STEPS, getStepIdByKey, getStepIndexByKey } from './constants'
import { buildFormDataForSubmit, getErrorFieldLabels, validateStep } from './request_form_utils'
import { Button } from '@/components/ui'
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LockIcon from '@mui/icons-material/Lock'

const OS_HERO_IMAGE = 'https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2074.png?_t=1743086513'
const OS_ICON = 'https://oferta-uploads-prod.s3.us-east-1.amazonaws.com/pictures/others/OfertaSimple%20Assets/Asset%2076.png?_t=1743086513'

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

  const [showWelcome, setShowWelcome] = useState(true)
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

  const businessName = formData.businessName || 'su negocio'

  if (showWelcome) {
    return (
      <div className="relative min-h-[100dvh] bg-[#f8f9fb] overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-slate-100/60 via-blue-50/20 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-5 py-10">
          {/* Hero illustration */}
          <div className="animate-[slideUpSmall_500ms_ease-out] mb-8">
            <Image
              src={OS_HERO_IMAGE}
              alt="OfertaSimple"
              width={300}
              height={190}
              className="object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              priority
            />
          </div>

          {/* Main content */}
          <div className="w-full max-w-md animate-[slideUpSmall_600ms_ease-out]">
            <div className="text-center mb-6">
              <h1 className="text-[22px] md:text-[26px] font-bold text-gray-900 leading-[1.2] tracking-[-0.01em]">
                ¡Hola, {businessName}!
              </h1>
              <p className="mt-2.5 text-[13px] md:text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                Nos emociona que quieras ser parte de <span className="font-semibold text-gray-700">OfertaSimple</span>. Solo necesitamos algunos datos para armar tu oferta.
              </p>
            </div>

            {/* Steps overview */}
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.05)] border border-gray-100/80 p-5 mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3.5">Así funciona</p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold flex-shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.3)]">1</div>
                  <div className="pt-0.5">
                    <p className="text-[13px] font-semibold text-gray-900">Completa el formulario paso a paso</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Info de tu negocio, oferta, datos fiscales y bancarios.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold flex-shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.3)]">2</div>
                  <div className="pt-0.5">
                    <p className="text-[13px] font-semibold text-gray-900">Ten a mano tus documentos</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      RUC, cuenta bancaria y los detalles de lo que quieres ofrecer.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] font-bold flex-shrink-0 shadow-[0_2px_6px_rgba(59,130,246,0.3)]">3</div>
                  <div className="pt-0.5">
                    <p className="text-[13px] font-semibold text-gray-900">Envía y nosotros nos encargamos</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      Nuestro equipo revisa todo y te contacta para los próximos pasos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => {
                setShowWelcome(false)
                scrollToTop()
              }}
              fullWidth
              size="lg"
              rightIcon={<ArrowForwardIcon style={{ fontSize: 20 }} />}
            >
              ¡Vamos!
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <LockIcon style={{ fontSize: 12 }} />
              <span>Conexión segura · Tus datos están protegidos</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-[10px] text-gray-300 tracking-wide">
            OfertaSimple Booking System • {new Date().getFullYear()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={formContainerRef}
      className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100 pb-28 md:pb-0"
    >
      <div className="max-w-7xl mx-auto px-0 md:px-4 pt-4 md:pt-8">
        <div className="px-3 md:px-0 max-w-5xl mx-auto">
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

          <div className="relative bg-white rounded-xl md:rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_16px_rgba(0,0,0,0.06),0_16px_36px_rgba(0,0,0,0.04)] border border-gray-100 overflow-visible mt-4 md:mt-5">
            {/* Brand watermark */}
            <div className="absolute top-3 right-3 md:top-4 md:right-5 opacity-[0.10] pointer-events-none select-none z-0">
              <Image
                src={OS_ICON}
                alt=""
                width={100}
                height={40}
                className="w-auto h-6 md:h-7 object-contain"
                aria-hidden="true"
              />
            </div>

            <div className="relative z-[1] p-4 sm:p-6 md:p-10 overflow-visible">
              <div className="animate-[slideUpSmall_250ms_ease-out] overflow-visible">
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

          <div className="hidden md:block mt-6 text-center text-[10px] text-gray-300 pb-6 tracking-wide">
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
