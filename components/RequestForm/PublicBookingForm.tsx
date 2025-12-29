'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPublicBookingRequest } from '@/app/actions/booking'
import type { BookingFormData } from './types'
import { INITIAL_FORM_DATA } from './constants'
import ConfiguracionStep from './steps/ConfiguracionStep'
import OperatividadStep from './steps/OperatividadStep'

interface PublicBookingFormProps {
  token: string
}

// Only the first 2 steps for testing
const PUBLIC_STEPS = [
  { id: 1, key: 'configuracion', title: 'Configuración' },
  { id: 2, key: 'operatividad', title: 'Operatividad' },
]

export default function PublicBookingForm({ token }: PublicBookingFormProps) {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState<BookingFormData>({ ...INITIAL_FORM_DATA })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currentStep = PUBLIC_STEPS[currentStepIndex]

  const updateFormData = (field: keyof BookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleNext = () => {
    if (currentStepIndex < PUBLIC_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)

    try {
      // Build FormData from formData state
      const formDataToSubmit = new FormData()
      
      // Basic fields
      formDataToSubmit.append('name', formData.businessName || '')
      formDataToSubmit.append('category', formData.category || '')
      formDataToSubmit.append('parentCategory', formData.parentCategory || '')
      formDataToSubmit.append('subCategory1', formData.subCategory1 || '')
      formDataToSubmit.append('subCategory2', formData.subCategory2 || '')
      formDataToSubmit.append('merchant', formData.businessName || '')
      formDataToSubmit.append('businessEmail', formData.partnerEmail || '')
      formDataToSubmit.append('startDate', formData.startDate || '')
      formDataToSubmit.append('endDate', formData.endDate || '')

      // Configuración fields
      formDataToSubmit.append('campaignDuration', formData.campaignDuration || '')

      // Operatividad fields
      formDataToSubmit.append('redemptionMode', formData.redemptionMode || '')
      formDataToSubmit.append('isRecurring', formData.isRecurring || '')
      formDataToSubmit.append('recurringOfferLink', formData.recurringOfferLink || '')
      formDataToSubmit.append('paymentType', formData.paymentType || '')
      formDataToSubmit.append('paymentInstructions', formData.paymentInstructions || '')

      // Submit to public endpoint
      const result = await submitPublicBookingRequest(token, formDataToSubmit)

      if (result.success && result.data) {
        // Redirect to confirmation page
        router.push(`/booking-request/confirmation?token=${token}&requestId=${result.data.bookingRequestId}`)
      } else {
        setSubmitError(result.error || 'Error al enviar la solicitud de booking')
        setSubmitting(false)
      }
    } catch (error) {
      console.error('Error submitting public booking request:', error)
      setSubmitError('Ocurrió un error inesperado. Por favor intente nuevamente.')
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep.key) {
      case 'configuracion':
        return (
          <ConfiguracionStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
            isPublicForm={true} // Disable date calculation
          />
        )
      case 'operatividad':
        return (
          <OperatividadStep
            formData={formData}
            errors={errors}
            updateFormData={updateFormData}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete su Solicitud de Booking</h1>
        <p className="text-sm text-gray-600">
          Por favor complete todos los campos requeridos. Su solicitud será revisada después del envío.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {PUBLIC_STEPS.map((step, index) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex-1 flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index < currentStepIndex
                      ? 'bg-green-500 text-white'
                      : index === currentStepIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentStepIndex ? '✓' : step.id}
                </div>
                <div className="flex-1 h-0.5 mx-2 bg-gray-200">
                  {index < PUBLIC_STEPS.length - 1 && (
                    <div
                      className={`h-full ${
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                      style={{ width: index < currentStepIndex ? '100%' : '0%' }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{currentStep.title}</p>
        </div>
      </div>

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-md text-sm">
          {submitError}
        </div>
      )}

      {/* Step Content */}
      <div className="mb-6">{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0 || submitting}
          className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Anterior
        </button>

        <div className="text-sm text-gray-500">
          Paso {currentStepIndex + 1} de {PUBLIC_STEPS.length}
        </div>

        {currentStepIndex < PUBLIC_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        )}
      </div>
    </div>
  )
}

