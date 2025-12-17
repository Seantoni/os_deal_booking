'use client'

import { useState, useEffect, useCallback, useActionState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveBookingRequestDraft, sendBookingRequest, getBookingRequest } from '@/app/actions/booking'
import type { BookingFormData } from './types'
import { STEPS, INITIAL_FORM_DATA, getStepKeyByIndex, getStepIndexByKey, getStepIdByKey } from './constants'
import { validateStep, buildFormDataForSubmit } from './request_form_utils'
import ProgressBar from './components/ProgressBar'
import NavigationButtons from './components/NavigationButtons'
import CategoryAvailabilityList from './components/CategoryAvailabilityList'
import { Dropdown } from '@/components/ui'
import { getCategoryOptions } from '@/lib/categories'
import type { CategoryOption, RequestFormFieldsConfig } from '@/types'
import ConfiguracionStep from './steps/ConfiguracionStep'
import OperatividadStep from './steps/OperatividadStep'
import DirectorioStep from './steps/DirectorioStep'
import FiscalesStep from './steps/FiscalesStep'
import NegocioStep from './steps/NegocioStep'
import DescripcionStep from './steps/DescripcionStep'
import EstructuraStep from './steps/EstructuraStep'
import PoliticasStep from './steps/PoliticasStep'
import InformacionAdicionalStep from './steps/InformacionAdicionalStep'
import toast from 'react-hot-toast'

// Action state types for React 19 useActionState
type FormActionState = {
  success: boolean
  error: string | null
}

interface EnhancedBookingFormProps {
  requestId?: string
  initialFormData?: Partial<BookingFormData>
}

export default function EnhancedBookingForm({ requestId: propRequestId, initialFormData }: EnhancedBookingFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStepKey, setCurrentStepKey] = useState<string>('configuracion')
  const [formData, setFormData] = useState<BookingFormData>({ ...INITIAL_FORM_DATA, ...initialFormData })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [requiredFields, setRequiredFields] = useState<RequestFormFieldsConfig>({})
  const [loadingEdit, setLoadingEdit] = useState(false)
  
  // Get editId from URL (for continuing to edit a draft)
  const editIdFromUrl = searchParams.get('editId')
  const requestId = propRequestId || editIdFromUrl || undefined

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()

  // React 19: useActionState for save draft action
  const [draftState, saveDraftAction, isDraftPending] = useActionState<FormActionState, FormData>(
    async (_prevState, submittedFormData) => {
      try {
        const result = await saveBookingRequestDraft(submittedFormData, requestId)
        if (result.success) {
          toast.success(requestId ? 'Borrador actualizado exitosamente' : 'Borrador guardado exitosamente')
          if (requestId) {
            router.push('/booking-requests')
          }
          return { success: true, error: null }
        } else {
          toast.error('Error al guardar borrador: ' + result.error)
          return { success: false, error: result.error || 'Error desconocido' }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        toast.error('Error: ' + errorMsg)
        return { success: false, error: errorMsg }
      }
    },
    { success: false, error: null }
  )

  // React 19: useActionState for submit/send action
  const [submitState, submitAction, isSubmitPending] = useActionState<FormActionState, FormData>(
    async (_prevState, submittedFormData) => {
      try {
        const result = await sendBookingRequest(submittedFormData, requestId)
        if (result.success) {
          toast.success('Solicitud enviada exitosamente')
          router.push('/booking-requests')
          return { success: true, error: null }
        } else {
          toast.error('Error al enviar solicitud: ' + result.error)
          return { success: false, error: result.error || 'Error desconocido' }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        toast.error('Error: ' + errorMsg)
        return { success: false, error: errorMsg }
      }
    },
    { success: false, error: null }
  )

  // Combined saving state for UI feedback
  const saving = isDraftPending || isSubmitPending || isPending

  // Fetch request form field configuration from settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Add cache-busting param to prevent browser caching
        const response = await fetch('/api/settings?t=' + Date.now())
        if (response.ok) {
          const result = await response.json()
          console.log('[EnhancedBookingForm] Settings loaded:', {
            success: result.success,
            hasRequestFormFields: !!result.data?.requestFormFields,
            // Show actual required values
            businessName_required: result.data?.requestFormFields?.businessName?.required,
            partnerEmail_required: result.data?.requestFormFields?.partnerEmail?.required,
            category_required: result.data?.requestFormFields?.category?.required,
          })
          if (result.success && result.data?.requestFormFields) {
            setRequiredFields(result.data.requestFormFields)
          }
        }
      } catch (error) {
        console.error('Failed to load request form settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Helper to check if a field is required
  const isFieldRequired = useCallback((fieldKey: string): boolean => {
    return requiredFields[fieldKey]?.required ?? false
  }, [requiredFields])

  // Load existing request for editing (when editId is in URL)
  useEffect(() => {
    if (!editIdFromUrl) return
    
    const loadExistingRequest = async () => {
      setLoadingEdit(true)
      try {
        const result = await getBookingRequest(editIdFromUrl)
        if (result.success && result.data) {
          const data = result.data
          console.log('[EnhancedBookingForm] Loading existing request for editing:', data.id)
          
          // Map request data to form data
          setFormData(prev => {
            const updatedData = {
              ...prev,
              // Configuración
              businessName: data.name || data.merchant || '',
              partnerEmail: data.businessEmail || '',
              additionalEmails: Array.isArray(data.additionalEmails) ? data.additionalEmails : [],
              category: data.category || '',
              parentCategory: data.parentCategory || '',
              subCategory1: data.subCategory1 || '',
              subCategory2: data.subCategory2 || '',
              subCategory3: data.subCategory3 || '',
              startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
              endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
              campaignDuration: data.campaignDuration || '',
              opportunityId: data.opportunityId || '',
              
              // Operatividad
              redemptionMode: data.redemptionMode || '',
              isRecurring: data.isRecurring || '',
              recurringOfferLink: data.recurringOfferLink || '',
              paymentType: data.paymentType || '',
              paymentInstructions: data.paymentInstructions || '',
              
              // Directorio
              redemptionContactName: data.redemptionContactName || '',
              redemptionContactEmail: data.redemptionContactEmail || '',
              redemptionContactPhone: data.redemptionContactPhone || '',
              
              // Fiscales
              legalName: data.legalName || '',
              rucDv: data.rucDv || '',
              bankAccountName: data.bankAccountName || '',
              bank: data.bank || '',
              accountNumber: data.accountNumber || '',
              accountType: data.accountType || '',
              addressAndHours: data.addressAndHours || '',
              province: data.province || '',
              district: data.district || '',
              corregimiento: data.corregimiento || '',
              
              // Negocio
              includesTaxes: data.includesTaxes || '',
              validOnHolidays: data.validOnHolidays || '',
              hasExclusivity: data.hasExclusivity || '',
              blackoutDates: data.blackoutDates || '',
              exclusivityCondition: data.exclusivityCondition || '',
              giftVouchers: data.giftVouchers || '',
              hasOtherBranches: data.hasOtherBranches || '',
              vouchersPerPerson: data.vouchersPerPerson || '',
              commission: data.commission || '',
              
              // Descripción
              redemptionMethods: Array.isArray(data.redemptionMethods) ? data.redemptionMethods : [],
              contactDetails: data.contactDetails || '',
              socialMedia: data.socialMedia || '',
              businessReview: data.businessReview || '',
              offerDetails: data.offerDetails || '',
              
              // Estructura (Pricing)
              pricingOptions: Array.isArray(data.pricingOptions) ? data.pricingOptions : [],
              dealImages: Array.isArray(data.dealImages) ? data.dealImages : [],
              
              // Políticas
              cancellationPolicy: data.cancellationPolicy || '',
              marketValidation: data.marketValidation || '',
              additionalComments: data.additionalComments || '',
            }
            
            // Información Adicional - Unpack template-specific fields from additionalInfo JSON
            if (data.additionalInfo && typeof data.additionalInfo === 'object') {
              const additionalInfo = data.additionalInfo as { templateName?: string; fields?: Record<string, string> }
              if (additionalInfo.fields && typeof additionalInfo.fields === 'object') {
                Object.entries(additionalInfo.fields).forEach(([fieldKey, value]) => {
                  if (value !== undefined && value !== null && value !== '') {
                    (updatedData as any)[fieldKey] = value
                  }
                })
                console.log('[EnhancedBookingForm] Unpacked additionalInfo fields for editing:', Object.keys(additionalInfo.fields))
              }
            }
            
            return updatedData
          })
          
          toast.success('Solicitud cargada para continuar editando')
        } else {
          toast.error('Error al cargar la solicitud: ' + (result.error || 'No encontrada'))
          router.push('/booking-requests')
        }
      } catch (error) {
        console.error('Error loading request for edit:', error)
        toast.error('Error al cargar la solicitud')
        router.push('/booking-requests')
      } finally {
        setLoadingEdit(false)
      }
    }
    
    loadExistingRequest()
  }, [editIdFromUrl, router])

  // Pre-fill form from query parameters (from CRM opportunity, NewRequestModal, or Replicate)
  useEffect(() => {
    const isReplicate = searchParams.get('replicate') === 'true'
    const fromOpportunity = searchParams.get('fromOpportunity')
    const partnerEmail = searchParams.get('partnerEmail')
    const legalName = searchParams.get('legalName')
    const ruc = searchParams.get('ruc')
    const province = searchParams.get('province')
    const district = searchParams.get('district')
    const corregimiento = searchParams.get('corregimiento')
    const bank = searchParams.get('bank')
    const bankAccountName = searchParams.get('bankAccountName')
    const accountNumber = searchParams.get('accountNumber')
    const accountType = searchParams.get('accountType')
    const paymentPlan = searchParams.get('paymentPlan')
    const address = searchParams.get('address')
    const neighborhood = searchParams.get('neighborhood')
    // Note: description field has been removed from BookingRequest
    const website = searchParams.get('website')
    const instagram = searchParams.get('instagram')
    
    // Handle replication - pre-fill ALL fields from query parameters
    if (isReplicate) {
      console.log('[EnhancedBookingForm] Pre-filling from replicated request')
      
      setFormData(prev => {
        const newData = { ...prev }
        
        // Step 1: Configuración
        const businessName = searchParams.get('businessName')
        if (businessName) newData.businessName = businessName
        const partnerEmailParam = searchParams.get('partnerEmail')
        if (partnerEmailParam) newData.partnerEmail = partnerEmailParam
        const additionalEmailsParam = searchParams.get('additionalEmails')
        if (additionalEmailsParam) {
          try {
            newData.additionalEmails = JSON.parse(additionalEmailsParam)
          } catch (e) { /* ignore parse error */ }
        }
        const categoryParam = searchParams.get('category')
        if (categoryParam) newData.category = categoryParam
        const parentCategoryParam = searchParams.get('parentCategory')
        if (parentCategoryParam) newData.parentCategory = parentCategoryParam
        const subCategory1Param = searchParams.get('subCategory1')
        if (subCategory1Param) newData.subCategory1 = subCategory1Param
        const subCategory2Param = searchParams.get('subCategory2')
        if (subCategory2Param) newData.subCategory2 = subCategory2Param
        const subCategory3Param = searchParams.get('subCategory3')
        if (subCategory3Param) newData.subCategory3 = subCategory3Param
        const campaignDurationParam = searchParams.get('campaignDuration')
        if (campaignDurationParam) newData.campaignDuration = campaignDurationParam
        
        // Step 2: Operatividad
        const redemptionModeParam = searchParams.get('redemptionMode')
        if (redemptionModeParam) newData.redemptionMode = redemptionModeParam
        const isRecurringParam = searchParams.get('isRecurring')
        if (isRecurringParam) newData.isRecurring = isRecurringParam
        const recurringOfferLinkParam = searchParams.get('recurringOfferLink')
        if (recurringOfferLinkParam) newData.recurringOfferLink = recurringOfferLinkParam
        const paymentTypeParam = searchParams.get('paymentType')
        if (paymentTypeParam) newData.paymentType = paymentTypeParam
        const paymentInstructionsParam = searchParams.get('paymentInstructions')
        if (paymentInstructionsParam) newData.paymentInstructions = paymentInstructionsParam
        
        // Step 3: Directorio
        const redemptionContactNameParam = searchParams.get('redemptionContactName')
        if (redemptionContactNameParam) newData.redemptionContactName = redemptionContactNameParam
        const redemptionContactEmailParam = searchParams.get('redemptionContactEmail')
        if (redemptionContactEmailParam) newData.redemptionContactEmail = redemptionContactEmailParam
        const redemptionContactPhoneParam = searchParams.get('redemptionContactPhone')
        if (redemptionContactPhoneParam) newData.redemptionContactPhone = redemptionContactPhoneParam
        
        // Step 4: Fiscales
        const legalNameParam = searchParams.get('legalName')
        if (legalNameParam) newData.legalName = legalNameParam
        const rucDvParam = searchParams.get('rucDv')
        if (rucDvParam) newData.rucDv = rucDvParam
        const bankAccountNameParam = searchParams.get('bankAccountName')
        if (bankAccountNameParam) newData.bankAccountName = bankAccountNameParam
        const bankParam = searchParams.get('bank')
        if (bankParam) newData.bank = bankParam
        const accountNumberParam = searchParams.get('accountNumber')
        if (accountNumberParam) newData.accountNumber = accountNumberParam
        const accountTypeParam = searchParams.get('accountType')
        if (accountTypeParam) newData.accountType = accountTypeParam
        const addressAndHoursParam = searchParams.get('addressAndHours')
        if (addressAndHoursParam) newData.addressAndHours = addressAndHoursParam
        const provinceParam = searchParams.get('province')
        if (provinceParam) newData.province = provinceParam
        const districtParam = searchParams.get('district')
        if (districtParam) newData.district = districtParam
        const corregimientoParam = searchParams.get('corregimiento')
        if (corregimientoParam) newData.corregimiento = corregimientoParam
        
        // Step 5: Negocio
        const includesTaxesParam = searchParams.get('includesTaxes')
        if (includesTaxesParam) newData.includesTaxes = includesTaxesParam
        const validOnHolidaysParam = searchParams.get('validOnHolidays')
        if (validOnHolidaysParam) newData.validOnHolidays = validOnHolidaysParam
        const hasExclusivityParam = searchParams.get('hasExclusivity')
        if (hasExclusivityParam) newData.hasExclusivity = hasExclusivityParam
        const blackoutDatesParam = searchParams.get('blackoutDates')
        if (blackoutDatesParam) newData.blackoutDates = blackoutDatesParam
        const exclusivityConditionParam = searchParams.get('exclusivityCondition')
        if (exclusivityConditionParam) newData.exclusivityCondition = exclusivityConditionParam
        const giftVouchersParam = searchParams.get('giftVouchers')
        if (giftVouchersParam) newData.giftVouchers = giftVouchersParam
        const hasOtherBranchesParam = searchParams.get('hasOtherBranches')
        if (hasOtherBranchesParam) newData.hasOtherBranches = hasOtherBranchesParam
        const vouchersPerPersonParam = searchParams.get('vouchersPerPerson')
        if (vouchersPerPersonParam) newData.vouchersPerPerson = vouchersPerPersonParam
        const commissionParam = searchParams.get('commission')
        if (commissionParam) newData.commission = commissionParam
        
        // Step 6: Descripción
        const redemptionMethodsParam = searchParams.get('redemptionMethods')
        if (redemptionMethodsParam) {
          try {
            newData.redemptionMethods = JSON.parse(redemptionMethodsParam)
          } catch (e) { /* ignore parse error */ }
        }
        const contactDetailsParam = searchParams.get('contactDetails')
        if (contactDetailsParam) newData.contactDetails = contactDetailsParam
        const socialMediaParam = searchParams.get('socialMedia')
        if (socialMediaParam) newData.socialMedia = socialMediaParam
        const businessReviewParam = searchParams.get('businessReview')
        if (businessReviewParam) newData.businessReview = businessReviewParam
        const offerDetailsParam = searchParams.get('offerDetails')
        if (offerDetailsParam) newData.offerDetails = offerDetailsParam
        
        // Step 7: Estructura (Pricing Options + Deal Images)
        const pricingOptionsParam = searchParams.get('pricingOptions')
        if (pricingOptionsParam) {
          try {
            newData.pricingOptions = JSON.parse(pricingOptionsParam)
          } catch (e) { /* ignore parse error */ }
        }
        const dealImagesParam = searchParams.get('dealImages')
        if (dealImagesParam) {
          try {
            newData.dealImages = JSON.parse(dealImagesParam)
          } catch (e) { /* ignore parse error */ }
        }
        
        // Step 8: Políticas
        const cancellationPolicyParam = searchParams.get('cancellationPolicy')
        if (cancellationPolicyParam) newData.cancellationPolicy = cancellationPolicyParam
        const marketValidationParam = searchParams.get('marketValidation')
        if (marketValidationParam) newData.marketValidation = marketValidationParam
        const additionalCommentsParam = searchParams.get('additionalComments')
        if (additionalCommentsParam) newData.additionalComments = additionalCommentsParam
        
        // Step 9: Información Adicional - Unpack template-specific fields from additionalInfo JSON
        const additionalInfoParam = searchParams.get('additionalInfo')
        if (additionalInfoParam) {
          try {
            const additionalInfo = JSON.parse(additionalInfoParam)
            if (additionalInfo && additionalInfo.fields && typeof additionalInfo.fields === 'object') {
              // Unpack all template-specific fields back into formData
              Object.entries(additionalInfo.fields).forEach(([fieldKey, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                  (newData as any)[fieldKey] = value
                }
              })
              console.log('[EnhancedBookingForm] Unpacked additionalInfo fields:', Object.keys(additionalInfo.fields))
            }
          } catch (e) {
            console.warn('[EnhancedBookingForm] Failed to parse additionalInfo:', e)
          }
        }
        
        return newData
      })
      
      return // Don't process other pre-fill logic when replicating
    }
    
    if (fromOpportunity) {
      const businessName = searchParams.get('businessName')
      const businessEmail = searchParams.get('businessEmail')
      const contactName = searchParams.get('contactName')
      const contactPhone = searchParams.get('contactPhone')
      const parentCategory = searchParams.get('parentCategory')
      const subCategory1 = searchParams.get('subCategory1')
      const subCategory2 = searchParams.get('subCategory2')

      console.log('[EnhancedBookingForm] Pre-filling from opportunity:', {
        fromOpportunity,
        businessName,
        businessEmail,
        parentCategory,
        subCategory1,
        subCategory2,
      })

      // Build category value for compatibility with CategorySelect
      const categoryValue = parentCategory 
        ? `${parentCategory}${subCategory1 ? ' > ' + subCategory1 : ''}${subCategory2 ? ' > ' + subCategory2 : ''}`
        : ''

      setFormData(prev => {
        const addressAndHoursFromBusiness = [address, neighborhood].filter(Boolean).join(', ')
        const socialFromBusiness = [instagram, website].filter(Boolean).join(' | ')

        return {
        ...prev,
        businessName: businessName || prev.businessName,
        // Only use the primary contact email from business, don't auto-populate additional emails
        partnerEmail: businessEmail || partnerEmail || prev.partnerEmail,
        redemptionContactName: contactName || prev.redemptionContactName,
        redemptionContactPhone: contactPhone || prev.redemptionContactPhone,
        redemptionContactEmail: businessEmail || partnerEmail || prev.redemptionContactEmail,
        approverName: contactName || prev.approverName,
        approverEmail: businessEmail || partnerEmail || prev.approverEmail,
        category: categoryValue || prev.category,
        parentCategory: parentCategory || prev.parentCategory,
        subCategory1: subCategory1 || prev.subCategory1,
        subCategory2: subCategory2 || prev.subCategory2,
        // Only set opportunityId if it's a real opportunity ID (not the "business" flag)
        opportunityId: fromOpportunity !== 'business' ? fromOpportunity : '',
          legalName: legalName || prev.legalName,
          rucDv: ruc || prev.rucDv,
          province: province || prev.province,
          district: district || prev.district,
          corregimiento: corregimiento || prev.corregimiento,
          bank: bank || prev.bank,
          bankAccountName: bankAccountName || prev.bankAccountName,
          accountNumber: accountNumber || prev.accountNumber,
          accountType: accountType || prev.accountType,
          paymentInstructions: paymentPlan || prev.paymentInstructions,
          addressAndHours: addressAndHoursFromBusiness || prev.addressAndHours,
          socialMedia: socialFromBusiness || prev.socialMedia,
          contactDetails: website || prev.contactDetails,
          businessReview: prev.businessReview,
          approverBusinessName: legalName || businessName || prev.approverBusinessName,
        }
      })
    } else if (partnerEmail) {
      // Pre-fill from NewRequestModal (primary email only)
      console.log('[EnhancedBookingForm] Pre-filling email from NewRequestModal:', {
        partnerEmail,
      })
      
      setFormData(prev => {
        return {
        ...prev,
        partnerEmail: partnerEmail || prev.partnerEmail,
        }
      })
    }
  }, [searchParams])
  
  // Load category options (client-side)
  useEffect(() => {
    setCategoryOptions(getCategoryOptions())
  }, [])
  
  // All categories now have the "Información Adicional" step (dynamic templates handle content)
  const availableSteps = STEPS
  
  // Helper to get current step index for calculations (based on available steps)
  const currentStepIndex = availableSteps.findIndex(step => step.key === currentStepKey)
  const currentStepId = getStepIdByKey(currentStepKey) || 1

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

  const handleValidateStep = (stepKey: string): boolean => {
    const stepId = getStepIdByKey(stepKey) || 1
    const newErrors = validateStep(stepId, formData, requiredFields)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const totalSteps = availableSteps.length


  const handleNext = () => {
    if (handleValidateStep(currentStepKey)) {
      const nextIndex = currentStepIndex + 1
      if (nextIndex < availableSteps.length) {
        const nextStepKey = availableSteps[nextIndex].key
        setCurrentStepKey(nextStepKey)
      }
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      const prevStepKey = availableSteps[prevIndex].key
      setCurrentStepKey(prevStepKey)
    }
  }
  
  const handleStepClick = (stepKey: string) => {
    const clickedIndex = getStepIndexByKey(stepKey)
    // Only allow clicking on steps that are before the current step
    if (clickedIndex < currentStepIndex) {
      setCurrentStepKey(stepKey)
    }
  }

  const handleGoBack = () => {
    router.push('/booking-requests')
  }

  // React 19: Handler that triggers the save draft action
  const handleSaveDraft = () => {
    startTransition(() => {
      const formDataToSend = buildFormDataForSubmit(formData)
      saveDraftAction(formDataToSend)
    })
  }

  // React 19: Handler that triggers the submit action with validation
  const handleSubmit = () => {
    if (!formData.businessName || !formData.partnerEmail || !formData.startDate || !formData.endDate) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }
    
    startTransition(() => {
      const formDataToSend = buildFormDataForSubmit(formData)
      submitAction(formDataToSend)
    })
  }

  const addPricingOption = () => {
    setFormData(prev => ({
      ...prev,
      pricingOptions: [
        ...prev.pricingOptions,
        { title: '', description: '', price: '', realValue: '', quantity: 'Ilimitado' }
      ]
    }))
  }

  const removePricingOption = (index: number) => {
    setFormData(prev => {
      const currentOptions = Array.isArray(prev.pricingOptions) ? prev.pricingOptions : []
      return {
        ...prev,
        pricingOptions: currentOptions.filter((_, i) => i !== index)
      }
    })
  }

  const updatePricingOption = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const currentOptions = Array.isArray(prev.pricingOptions) ? prev.pricingOptions : []
      return {
        ...prev,
        pricingOptions: currentOptions.map((option, i) =>
          i === index ? { ...option, [field]: value } : option
        )
      }
    })
  }

  // Show loading state when loading existing request for editing
  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando solicitud...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-6">
          {/* Category Availability Sidebar - Only visible on Configuración */}
          {currentStepKey === 'configuracion' && (
            <div className="flex-shrink-0">
              <div className="mb-4 w-80">
                <p className="text-xs font-semibold text-gray-700 mb-1">Seleccionar categoría</p>
                <Dropdown
                  fullWidth
                  items={categoryOptions.map(opt => ({
                    value: opt.value,
                    label: opt.label,
                    description: opt.parent,
                  }))}
                  selectedLabel={
                    categoryOptions.find(opt => opt.value === formData.category)?.label || formData.category || ''
                  }
                  placeholder="Buscar y seleccionar categoría"
                  onSelect={(value) => {
                    const option = categoryOptions.find(o => o.value === value)
                    if (!option) return
                    updateFormData('category', option.value)
                    updateFormData('parentCategory', option.parent)
                    updateFormData('subCategory1', option.sub1 || '')
                    updateFormData('subCategory2', option.sub2 || '')
                  }}
                />
              </div>
              <CategoryAvailabilityList 
                onCategorySelect={(option) => {
                  // Update form data with selected category
                  updateFormData('category', option.value)
                  updateFormData('parentCategory', option.parent)
                  updateFormData('subCategory1', option.sub1 || '')
                  updateFormData('subCategory2', option.sub2 || '')
                }}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className={`flex-1 ${currentStepKey === 'configuracion' ? '' : 'max-w-5xl mx-auto'}`}>
            <ProgressBar 
              steps={availableSteps}
              currentStepKey={currentStepKey}
              onStepClick={handleStepClick}
            />

            {/* Form Content */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-visible mt-6">
              <div className="p-8 sm:p-10 overflow-visible">
                <div className="animate-fadeIn overflow-visible">
                {currentStepKey === 'configuracion' && (
                  <ConfiguracionStep 
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
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

              {currentStepKey === 'descripcion' && (
                <DescripcionStep 
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

              {currentStepKey === 'politicas' && (
                <PoliticasStep
                  formData={formData}
                  errors={errors}
                  updateFormData={updateFormData}
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
                />
              )}
                </div>
              </div>
            </div>

            <NavigationButtons
              currentStepIndex={currentStepIndex}
              totalSteps={totalSteps}
              saving={saving}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSaveDraft={handleSaveDraft}
              onSubmit={handleSubmit}
              onGoBack={handleGoBack}
            />

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-400 pb-8">
              OfertaSimple Booking System • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

