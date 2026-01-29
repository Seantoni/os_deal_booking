import { useEffect, useState } from 'react'
import CategorySelect from '@/components/shared/CategorySelect'
import BusinessSelect, { type BusinessWithStatus } from '@/components/shared/BusinessSelect'
import MultiEmailInput from '@/components/shared/MultiEmailInput'
import { getMaxDuration } from '@/lib/categories'
import { calculateNextAvailableDate } from '@/lib/event-validation'
import { getAllBookedEvents } from '@/app/actions/events'
import { getSettings } from '@/lib/settings'
import { formatDateForDisplay } from '@/lib/date'
import { ONE_DAY_MS } from '@/lib/constants'
import type { BookingFormData } from '../types'
import { Input } from '@/components/ui'

interface ConfiguracionStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  isPublicForm?: boolean // If true, disable date calculation
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function ConfiguracionStep({ formData, errors, updateFormData, isPublicForm = false, isFieldRequired = () => false }: ConfiguracionStepProps) {
  const [daysUntilLaunch, setDaysUntilLaunch] = useState<number | null>(null)
  const [calculatingDate, setCalculatingDate] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessWithStatus | null>(null)
  
  // Format date string (YYYY-MM-DD) for display
  // Uses T00:00:00 suffix to create local date without timezone shifting
  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString + 'T00:00:00')
    return formatDateForDisplay(date, 'es-PA')
  }

  // Auto-calculate next available date when category is selected or changes
  // Skip for public forms (no date calculation)
  useEffect(() => {
    if (isPublicForm) return // Skip date calculation for public forms
    
    const calculateDate = async () => {
      if (formData.parentCategory && !calculatingDate) {
        setCalculatingDate(true)
        try {
          // Fetch ALL booked events (regardless of user) and settings
          // This ensures accurate date calculation based on all reserved dates
          const eventsResult = await getAllBookedEvents()
          const events = eventsResult.success ? eventsResult.data || [] : []
          const settings = getSettings()
          
          // Build standardized category key for matching
          // Import category utilities to build the key consistently
          const { buildCategoryKey } = await import('@/lib/category-utils')
          const categoryKey = buildCategoryKey(
            formData.parentCategory || null,
            formData.subCategory1 || null,
            formData.subCategory2 || null,
            formData.subCategory3 || null,
            formData.category || null
          )
          
          // Use the universal function directly
          // Pass the standardized key and parent for duration calculation
          const result = calculateNextAvailableDate(
            events,
            categoryKey, // Use standardized key for matching
            formData.parentCategory, // Parent for duration calculation
            formData.businessName || null,
            undefined, // duration - will be calculated from category
            undefined, // startFromDate - defaults to today
            undefined, // excludeEventId
            {
              minDailyLaunches: settings.minDailyLaunches,
              maxDailyLaunches: settings.maxDailyLaunches,
              merchantRepeatDays: settings.merchantRepeatDays,
              businessExceptions: settings.businessExceptions
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
              const duration = getMaxDuration(formData.parentCategory)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.parentCategory, formData.subCategory1, formData.subCategory2, formData.category, isPublicForm])

  const handleStartDateChange = (date: string) => {
    updateFormData('startDate', date)
    
    // Calculate days until launch
    if (date) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(date + 'T00:00:00')
      const { ONE_DAY_MS } = require('@/lib/constants')
      const days = Math.ceil((startDate.getTime() - today.getTime()) / ONE_DAY_MS)
      setDaysUntilLaunch(days)
    }
    
    // Auto-calculate end date based on category duration
    if (date && formData.parentCategory) {
      const duration = getMaxDuration(formData.parentCategory)
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
  
  // Calculate redemption validity date (end date + campaign duration in days or months)
  const calculateRedemptionDate = (): string => {
    if (!formData.endDate) return 'Z'
    const endDate = new Date(formData.endDate + 'T00:00:00')
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
    const { calculateDaysDifference } = require('@/lib/date/formatting')
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
          <BusinessSelect
            value={formData.businessName}
            onChange={(businessName, business) => {
              updateFormData('businessName', businessName)
              setSelectedBusiness(business)
              
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
                if (business.province) updateFormData('province', business.province)
                if (business.district) updateFormData('district', business.district)
                if (business.corregimiento) updateFormData('corregimiento', business.corregimiento)
                
                // Bank info
                if (business.bank) updateFormData('bank', business.bank)
                if (business.beneficiaryName) updateFormData('bankAccountName', business.beneficiaryName)
                if (business.accountNumber) updateFormData('accountNumber', business.accountNumber)
                if (business.accountType) updateFormData('accountType', business.accountType)
                if (business.paymentPlan) updateFormData('paymentInstructions', business.paymentPlan)
                
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
              }}
              error={errors.category}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Duración de Campaña {isFieldRequired('campaignDuration') && <span className="text-red-500">*</span>}
          </label>
          <div className="flex gap-2">
            <Input
              value={formData.campaignDuration}
              onChange={(e) => updateFormData('campaignDuration', e.target.value)}
              placeholder="3"
              type="number"
              min="1"
              className="flex-1"
            />
            <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => updateFormData('campaignDurationUnit', 'days')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  (formData.campaignDurationUnit || 'months') === 'days'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Días
              </button>
              <button
                type="button"
                onClick={() => updateFormData('campaignDurationUnit', 'months')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  (formData.campaignDurationUnit || 'months') === 'months'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Meses
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">Periodo de canje a publicar en campaña</p>
        </div>

        <div>
          <Input
            label="Fecha de lanzamiento estimada"
            required={isFieldRequired('startDate')}
            type="date"
            value={formData.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            disabled={calculatingDate}
            className={calculatingDate ? 'opacity-60 cursor-wait' : ''}
            error={errors.startDate}
            helperText={calculatingDate ? 'Calculando fecha disponible...' : undefined}
          />
        </div>

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

