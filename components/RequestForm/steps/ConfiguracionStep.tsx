import { useEffect, useState } from 'react'
import CategorySelect from '@/components/shared/CategorySelect'
import BusinessSelect from '@/components/shared/BusinessSelect'
import MultiEmailInput from '@/components/shared/MultiEmailInput'
import { getMaxDuration } from '@/lib/categories'
import { calculateNextAvailableDate } from '@/lib/event-validation'
import { getAllBookedEvents } from '@/app/actions/events'
import { formatDateForDisplay, calculateDaysDifference } from '@/lib/date'
import { ONE_DAY_MS } from '@/lib/constants'
import type { EventForValidation } from '@/lib/event-validation'
import {
  BOOKING_START_DATE_EVENT_DAY_ERROR_ES,
  validateStartDateAgainstEventDays,
} from '@/lib/utils/validation'
import type { BookingSettings, CategoryOption } from '@/types'
import type { BookingFormData } from '../types'
import { Input } from '@/components/ui'

type DateValidationSettings = Pick<
  BookingSettings,
  'minDailyLaunches' | 'maxDailyLaunches' | 'merchantRepeatDays' | 'businessExceptions' | 'categoryDurations'
>

interface ConfiguracionStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isPublicForm?: boolean // If true, disable date calculation
  isFieldRequired?: (fieldKey: string) => boolean
  /** Callback when a business is selected (for backfill tracking) */
  onBusinessSelect?: (businessId: string | null) => void
  bookedEvents?: EventForValidation[] | null
  loadingBookedEvents?: boolean
  categoryOptions?: CategoryOption[]
  dateValidationSettings?: DateValidationSettings | null
}

export default function ConfiguracionStep({
  formData,
  errors,
  updateFormData,
  isPublicForm = false,
  isFieldRequired = () => false,
  onBusinessSelect,
  bookedEvents = null,
  loadingBookedEvents = false,
  categoryOptions,
  dateValidationSettings = null,
}: ConfiguracionStepProps) {
  const [daysUntilLaunch, setDaysUntilLaunch] = useState<number | null>(null)
  const [calculatingDate, setCalculatingDate] = useState(false)
  const isShowsCategory = formData.parentCategory === 'SHOWS Y EVENTOS'
  const eventDayRows =
    isShowsCategory && Array.isArray(formData.eventDays) && formData.eventDays.length > 0
      ? formData.eventDays
      : isShowsCategory
        ? ['']
        : []
  const hasActiveEventDays =
    isShowsCategory &&
    Array.isArray(formData.eventDays) &&
    formData.eventDays.some((date) => date.trim().length > 0)
  const isCampaignDurationDisabled = hasActiveEventDays

  // Format date string (YYYY-MM-DD) for display
  // Uses T00:00:00 suffix to create local date without timezone shifting
  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString + 'T00:00:00')
    if (isNaN(date.getTime())) return dateString
    return formatDateForDisplay(date, 'es-PA')
  }
  const startDateEventDayValidation = validateStartDateAgainstEventDays(
    formData.startDate,
    formData.eventDays
  )
  const earliestEventDay = startDateEventDayValidation.earliestEventDay
  const startDateError =
    errors.startDate === BOOKING_START_DATE_EVENT_DAY_ERROR_ES &&
    startDateEventDayValidation.valid
      ? undefined
      : errors.startDate ||
        (!startDateEventDayValidation.valid
          ? BOOKING_START_DATE_EVENT_DAY_ERROR_ES
          : undefined)
  const startDateHelperText = calculatingDate
    ? 'Calculando fecha disponible...'
    : earliestEventDay
      ? `Debe ser el ${formatDate(earliestEventDay)} o antes.`
      : undefined

  // Auto-calculate next available date when category is selected or changes
  // Skip for public forms (no date calculation)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isPublicForm) return // Skip date calculation for public forms
    
    const calculateDate = async () => {
      if (formData.parentCategory && !calculatingDate) {
        if (loadingBookedEvents && !bookedEvents) return

        setCalculatingDate(true)
        try {
          // Reuse booked events loaded by parent to avoid repeated server calls.
          let resolvedEvents = bookedEvents ?? []
          if (bookedEvents === null) {
            const eventsResult = await getAllBookedEvents()
            resolvedEvents = eventsResult.success ? eventsResult.data || [] : []
          }
          const settings = dateValidationSettings
          
          // Build standardized category key for matching
          // Import category utilities to build the key consistently
          const { buildCategoryKey } = await import('@/lib/category-utils')
          const categoryKey = buildCategoryKey(
            formData.parentCategory || null,
            formData.subCategory1 || null,
            formData.subCategory2 || null,
            formData.subCategory3 || null,
            null,
            formData.category || null
          )
          
          // Use the universal function directly
          // Pass the standardized key and parent for duration calculation
          const result = calculateNextAvailableDate(
            resolvedEvents,
            categoryKey, // Use standardized key for matching
            formData.parentCategory, // Parent for duration calculation
            formData.businessName || null,
            undefined, // duration - will be calculated from category
            undefined, // startFromDate - defaults to today
            undefined, // excludeEventId
            {
              minDailyLaunches: settings?.minDailyLaunches,
              maxDailyLaunches: settings?.maxDailyLaunches,
              merchantRepeatDays: settings?.merchantRepeatDays,
              businessExceptions: settings?.businessExceptions || [],
              categoryDurations: settings?.categoryDurations,
            }
          )
          
          if (result.success && result.date) {
            // Format date as YYYY-MM-DD for the input
            const dateString = result.date.toISOString().split('T')[0]
            updateFormData('startDate', dateString)
            if (result.daysUntilLaunch !== undefined) {
              setDaysUntilLaunch(result.daysUntilLaunch)
            }
            
            // Auto-calculate end date based on new category
            if (formData.parentCategory) {
              const duration = getMaxDuration(formData.parentCategory, dateValidationSettings)
              const startDate = new Date(result.date)
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + duration - 1)
              const endDateString = endDate.toISOString().split('T')[0]
              updateFormData('endDate', endDateString)
            }
          }
        } catch (error) {
          console.error('[ConfiguracionStep] Error calculating next available date:', error)
        } finally {
          setCalculatingDate(false)
        }
      }
    }
    
    calculateDate()
  }, [
    formData.parentCategory,
    formData.subCategory1,
    formData.subCategory2,
    formData.subCategory3,
    formData.category,
    isPublicForm,
    bookedEvents,
    loadingBookedEvents,
    dateValidationSettings,
  ])
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleStartDateChange = (date: string) => {
    updateFormData('startDate', date)
    
    // Calculate days until launch
    if (date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(date + 'T00:00:00')
      const days = Math.ceil((startDate.getTime() - today.getTime()) / ONE_DAY_MS)
      setDaysUntilLaunch(days)
    }
    
    // Auto-calculate end date based on category duration
    if (date && formData.parentCategory) {
      const duration = getMaxDuration(formData.parentCategory, dateValidationSettings)
      const startDate = new Date(date)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + duration - 1) // -1 because start date is day 1
      
      // Format as YYYY-MM-DD
      const endDateString = endDate.toISOString().split('T')[0]
      updateFormData('endDate', endDateString)
    }
  }

  const campaignDuration = formData.campaignDuration || '3'
  const campaignDurationUnit = formData.campaignDurationUnit || 'months'
  const startDateFormatted = formData.startDate ? formatDate(formData.startDate) : 'X'
  const endDateFormatted = formData.endDate ? formatDate(formData.endDate) : 'Y'

  const handleEventDayChange = (index: number, value: string) => {
    const nextEventDays = Array.isArray(formData.eventDays) ? [...formData.eventDays] : []
    nextEventDays[index] = value
    updateFormData('eventDays', nextEventDays)
  }

  const handleAddEventDay = () => {
    const nextEventDays = Array.isArray(formData.eventDays) ? [...formData.eventDays] : []
    if (nextEventDays.length === 0) {
      updateFormData('eventDays', ['', ''])
      return
    }
    updateFormData('eventDays', [...nextEventDays, ''])
  }

  const handleRemoveEventDay = (index: number) => {
    const nextEventDays = (Array.isArray(formData.eventDays) ? formData.eventDays : []).filter(
      (_, rowIndex) => rowIndex !== index
    )
    updateFormData('eventDays', nextEventDays)
  }
  
  // Calculate redemption validity date (end date + campaign duration in days or months)
  const calculateRedemptionDate = (): string => {
    if (isCampaignDurationDisabled) return '—'
    if (!formData.endDate) return 'Z'
    const endDate = new Date(formData.endDate + 'T00:00:00')
    if (isNaN(endDate.getTime())) return '—'
    const duration = parseInt(campaignDuration) || 3
    const redemptionDate = new Date(endDate)
    
    if (campaignDurationUnit === 'days') {
      redemptionDate.setDate(redemptionDate.getDate() + duration)
    } else {
      redemptionDate.setMonth(redemptionDate.getMonth() + duration)
    }
    return formatDate(redemptionDate.toISOString().split('T')[0])
  }
  
  const redemptionDateFormatted = calculateRedemptionDate()
  
  // Calculate total active days using utility
  const calculateTotalDays = (): number => {
    if (!formData.startDate || !formData.endDate) return 0
    return calculateDaysDifference(formData.startDate, formData.endDate)
  }
  
  const totalDays = calculateTotalDays()

  return (
    <div className="space-y-8">
        <div className="border-b border-gray-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Configuración General y Vigencia</h2>
          <p className="text-sm text-gray-500 mt-1">Datos iniciales para la clasificación, asignación del contrato y fechas críticas para la publicación.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="group">
          {isPublicForm ? (
            <Input
              label="Nombre del Negocio"
              required={isFieldRequired('businessName')}
              value={formData.businessName}
              onChange={(e) => updateFormData('businessName', e.target.value)}
              placeholder="Ingrese el nombre del negocio"
              error={errors.businessName}
            />
          ) : (
            <BusinessSelect
              value={formData.businessName}
              onChange={(businessName, business) => {
                updateFormData('businessName', businessName)

                // Notify parent of business selection for backfill tracking
                onBusinessSelect?.(business?.id || null)

                // Auto-fill related fields when a business is selected
                if (business) {
                  // Contact info
                  if (business.contactEmail) {
                    updateFormData('partnerEmail', business.contactEmail)
                    updateFormData('redemptionContactEmail', business.contactEmail)
                    updateFormData('approverEmail', business.contactEmail)
                  }
                  if (business.contactName) {
                    updateFormData('redemptionContactName', business.contactName)
                    updateFormData('approverName', business.contactName)
                  }
                  if (business.contactPhone) {
                    updateFormData('redemptionContactPhone', business.contactPhone)
                  }

                  // Category is NOT auto-filled - user must select manually

                  // Fiscal info
                  if (business.razonSocial) updateFormData('legalName', business.razonSocial)
                  if (business.ruc) updateFormData('rucDv', business.ruc)
                  if (business.provinceDistrictCorregimiento) updateFormData('provinceDistrictCorregimiento', business.provinceDistrictCorregimiento)

                  // Bank info
                  if (business.bank) updateFormData('bank', business.bank)
                  if (business.beneficiaryName) updateFormData('bankAccountName', business.beneficiaryName)
                  if (business.accountNumber) updateFormData('accountNumber', business.accountNumber)
                  if (business.accountType) updateFormData('accountType', business.accountType)
                  if (business.paymentPlan) updateFormData('paymentType', business.paymentPlan)

                  // Address
                  const addressParts = [business.address, business.neighborhood].filter(Boolean)
                  if (addressParts.length > 0) updateFormData('addressAndHours', addressParts.join(', '))

                  // Social / website
                  const socialParts = [business.instagram, business.website].filter(Boolean)
                  if (socialParts.length > 0) updateFormData('socialMedia', socialParts.join(' | '))
                  if (business.website) updateFormData('contactDetails', business.website)
                  if (business.description) updateFormData('businessReview', business.description)
                  if (business.razonSocial || businessName) updateFormData('approverBusinessName', business.razonSocial || businessName)
                }
              }}
              label="Nombre del Negocio"
              required={isFieldRequired('businessName')}
              placeholder="Buscar y seleccionar negocio"
              error={errors.businessName}
            />
          )}
        </div>

        <MultiEmailInput
          primaryEmail={formData.partnerEmail}
          additionalEmails={formData.additionalEmails || []}
          onPrimaryEmailChange={(email) => updateFormData('partnerEmail', email)}
          onAdditionalEmailsChange={(emails) => updateFormData('additionalEmails', emails)}
          label="Correo del Aliado"
          placeholder="aliado@negocio.com"
          required={isFieldRequired('partnerEmail')}
          error={errors.partnerEmail}
        />

        <div className="relative z-10">
          <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 relative">
            <CategorySelect
              label="Categoría"
              required={isFieldRequired('category')}
              options={categoryOptions}
              selectedOption={
                formData.category || formData.parentCategory
                  ? {
                      label: formData.category || `${formData.parentCategory}${formData.subCategory1 ? ' > ' + formData.subCategory1 : ''}${formData.subCategory2 ? ' > ' + formData.subCategory2 : ''}`,
                      value: formData.category || formData.parentCategory || '',
                      parent: formData.parentCategory || '',
                      sub1: formData.subCategory1 || null,
                      sub2: formData.subCategory2 || null,
                      sub3: null,
                      sub4: null,
                    }
                  : null
              }
              onChange={(option) => {
                updateFormData('category', option.value)
                updateFormData('parentCategory', option.parent)
                updateFormData('subCategory1', option.sub1 || '')
                updateFormData('subCategory2', option.sub2 || '')
                if (option.parent !== 'SHOWS Y EVENTOS' && Array.isArray(formData.eventDays) && formData.eventDays.length > 0) {
                  updateFormData('eventDays', [])
                }
              }}
              error={errors.category}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Duración de Campaña {isFieldRequired('campaignDuration') && !isCampaignDurationDisabled && <span className="text-red-500">*</span>}
          </label>
          <div className="flex gap-2">
            <Input
              value={formData.campaignDuration}
              onChange={(e) => updateFormData('campaignDuration', e.target.value)}
              placeholder="3"
              type="number"
              min="1"
              className="flex-1"
              disabled={isCampaignDurationDisabled}
            />
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => updateFormData('campaignDurationUnit', 'days')}
                disabled={isCampaignDurationDisabled}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  (formData.campaignDurationUnit || 'months') === 'days'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isCampaignDurationDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                Días
              </button>
              <button
                type="button"
                onClick={() => updateFormData('campaignDurationUnit', 'months')}
                disabled={isCampaignDurationDisabled}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  (formData.campaignDurationUnit || 'months') === 'months'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isCampaignDurationDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                Meses
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {isCampaignDurationDisabled
              ? 'Deshabilitado porque hay uno o más días específicos de evento.'
              : 'Periodo de canje a publicar en campaña'}
          </p>
        </div>

        <div>
          <Input
            label="Fecha de lanzamiento estimada"
            required={isFieldRequired('startDate')}
            name="startDate"
            data-field="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            disabled={calculatingDate}
            className={calculatingDate ? 'opacity-60 cursor-wait' : ''}
            max={earliestEventDay || undefined}
            error={startDateError}
            helperText={startDateHelperText}
          />
        </div>

        {isShowsCategory && (
          <div className="md:col-start-2">
            <div className="relative mb-2 pr-10">
              <label className="block text-sm font-semibold text-gray-700">
                Día del evento
              </label>
              <button
                type="button"
                onClick={handleAddEventDay}
                className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                aria-label="Agregar día de evento"
                title="Agregar día de evento"
              >
                +
              </button>
            </div>
            <div className="space-y-2">
              {eventDayRows.map((eventDay, index) => (
                <div key={`event-day-${index}`} className="flex items-center gap-2">
                  <Input
                    name={`eventDays.${index}`}
                    data-field="eventDays"
                    type="date"
                    value={eventDay}
                    onChange={(e) => handleEventDayChange(index, e.target.value)}
                    min={formData.startDate || undefined}
                    className="flex-1"
                  />
                  {Array.isArray(formData.eventDays) && formData.eventDays.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEventDay(index)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                      aria-label="Eliminar día de evento"
                      title="Eliminar día de evento"
                    >
                      -
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Agrega uno o más días específicos cuando la oferta es para funciones/eventos puntuales.
            </p>
            {formData.startDate && (
              <p
                className={`text-xs mt-1 ${
                  startDateEventDayValidation.valid ? 'text-gray-500' : 'text-red-600'
                }`}
              >
                {startDateEventDayValidation.valid
                  ? `Los días del evento deben ser el ${formatDate(formData.startDate)} o posteriores.`
                  : BOOKING_START_DATE_EVENT_DAY_ERROR_ES}
              </p>
            )}
          </div>
        )}

        <div className="group hidden">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Fecha Final (End At) {isFieldRequired('endDate') && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="date"
            value={formData.endDate}
            onChange={(e) => updateFormData('endDate', e.target.value)}
            disabled={!formData.startDate}
            className={!formData.startDate ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
            error={errors.endDate}
          />
          {!formData.startDate && (
            <p className="text-xs text-gray-500 mt-1.5 ml-1">Complete la fecha de inicio primero</p>
          )}
        </div>
      </div>

        {(formData.startDate || formData.endDate) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {daysUntilLaunch !== null && daysUntilLaunch >= 0 ? (
                <div className="bg-white/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Lanza en</p>
                  <p className="text-sm font-semibold text-blue-700">{daysUntilLaunch} {daysUntilLaunch === 1 ? 'día' : 'días'}</p>
                </div>
              ) : (
                <div className="bg-white/60 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Lanza en</p>
                  <p className="text-sm font-semibold text-gray-400">—</p>
                </div>
              )}
              <div className="bg-white/60 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Inicio</p>
                <p className="text-sm font-semibold text-gray-800">{startDateFormatted || '—'}</p>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Fin</p>
                <p className="text-sm font-semibold text-gray-800">{endDateFormatted || '—'}</p>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Días activos</p>
                <p className="text-sm font-semibold text-gray-800">{totalDays || '—'}</p>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Canje hasta</p>
                <p className="text-sm font-semibold text-green-700">{redemptionDateFormatted || '—'}</p>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
