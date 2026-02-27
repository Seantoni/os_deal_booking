'use client'

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import SyncIcon from '@mui/icons-material/Sync'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { useState, useEffect, useCallback, useActionState, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveBookingRequestDraft, sendBookingRequest, getBookingRequest } from '@/app/actions/booking'
import { 
  previewBusinessBackfill, 
  sendBookingRequestWithBackfill,
} from '@/app/actions/booking-requests'
import type { BackfillChange } from '@/lib/business-backfill'
import type { BookingFormData } from './types'
import { STEPS, INITIAL_FORM_DATA, getStepKeyByIndex, getStepIndexByKey, getStepIdByKey } from './constants'
import { validateStep, buildFormDataForSubmit, getErrorFieldLabels } from './request_form_utils'
import { extractBusinessName } from '@/lib/utils/request-name-parsing'
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
import EstructuraStep from './steps/EstructuraStep'
import InformacionAdicionalStep from './steps/InformacionAdicionalStep'
import ContenidoStep from './steps/ContenidoStep'
import ValidacionStep from './steps/ValidacionStep'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import FullScreenLoader from '@/components/common/FullScreenLoader'
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // Business backfill state
  const [backfillPreview, setBackfillPreview] = useState<{
    businessName?: string
    hasVendorId?: boolean
    changes: BackfillChange[]
    formattedChanges?: Array<{ label: string; value: string; oldValue?: string | null; isUpdate?: boolean }>
  } | null>(null)
  const [showBackfillDialog, setShowBackfillDialog] = useState(false)
  const [showBackfillResultDialog, setShowBackfillResultDialog] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{
    success: boolean
    fieldsUpdated?: string[]
    vendorSynced?: boolean
    error?: string
  } | null>(null)
  const [loadingBackfillPreview, setLoadingBackfillPreview] = useState(false)
  // Vendor auto-creation result dialog (shown after direct send without backfill)
  const [showVendorResultDialog, setShowVendorResultDialog] = useState(false)
  const [vendorCreateResult, setVendorCreateResult] = useState<{
    success?: boolean
    externalVendorId?: number
    error?: string
    businessName?: string
  } | null>(null)
  // Track linked business ID for backfill (from URL params when creating from Business)
  const [linkedBusinessId, setLinkedBusinessId] = useState<string | null>(null)
  
  // Ref for the scrollable form container
  const formContainerRef = useRef<HTMLDivElement>(null)
  
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
          // Always redirect to booking requests page after saving
          router.push('/booking-requests')
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
          // If vendor was auto-created (or failed), show result dialog before redirecting
          const vr = 'vendorResult' in result ? result.vendorResult : undefined
          if (vr?.attempted) {
            setVendorCreateResult({
              success: vr.success,
              externalVendorId: vr.externalVendorId,
              error: vr.error,
              businessName: vr.businessName,
            })
            setShowVendorResultDialog(true)
            // Don't redirect yet — dialog close handler will redirect
            return { success: true, error: null }
          }
          toast.success('Solicitud enviada exitosamente')
          router.push('/booking-requests')
          return { success: true, error: null }
        } else {
          const errMsg = 'error' in result ? result.error : 'Error desconocido'
          toast.error('Error al enviar solicitud: ' + errMsg)
          return { success: false, error: errMsg || 'Error desconocido' }
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
          
          // Map request data to form data
          setFormData(prev => {
            const updatedData = {
              ...prev,
              // Configuración
              businessName: data.merchant || (data.name ? extractBusinessName(data.name) : ''),
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
              campaignDurationUnit: (data.campaignDurationUnit as 'days' | 'months') || 'months',
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
              provinceDistrictCorregimiento: data.provinceDistrictCorregimiento || '',
              
              // Negocio
              includesTaxes: data.includesTaxes || '',
              validOnHolidays: data.validOnHolidays || '',
              hasExclusivity: data.hasExclusivity || '',
              blackoutDates: data.blackoutDates || '',
              exclusivityCondition: data.exclusivityCondition || '',
              hasOtherBranches: data.hasOtherBranches || '',
              
              // Descripción
              redemptionMethods: Array.isArray(data.redemptionMethods) ? data.redemptionMethods : [],
              contactDetails: data.contactDetails || '',
              socialMedia: data.socialMedia || '',
              
              // Contenido (AI-Generated)
              shortTitle: data.shortTitle || '',
              whatWeLike: data.whatWeLike || '',
              aboutCompany: data.aboutCompany || '',
              aboutOffer: data.aboutOffer || '',
              goodToKnow: data.goodToKnow || '',
              
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
                    // Dynamic field assignment for template-specific fields
                    (updatedData as Record<string, unknown>)[fieldKey] = value
                  }
                })
              }
            }
            
            return updatedData
          })
          
          // Set linkedBusinessId for backfill tracking when editing existing request
          if (data.linkedBusiness?.id) {
            setLinkedBusinessId(data.linkedBusiness.id)
          }
          
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
    const replicateKey = searchParams.get('replicateKey')
    const fromOpportunity = searchParams.get('fromOpportunity')
    const businessIdParam = searchParams.get('businessId') // Direct business link for backfill
    const partnerEmail = searchParams.get('partnerEmail')
    const legalName = searchParams.get('legalName')
    const ruc = searchParams.get('ruc')
    const provinceDistrictCorregimiento = searchParams.get('provinceDistrictCorregimiento')
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
    
    // Track linked business ID for backfill
    if (businessIdParam) {
      setLinkedBusinessId(businessIdParam)
    }
    
    // Handle replication (fast path) - load payload from sessionStorage to avoid huge URLs
    if (replicateKey) {
      const raw = sessionStorage.getItem(`replicate:${replicateKey}`)
      // If payload is missing, it may have been consumed by a previous render (React Strict Mode)
      // or the session expired - silently skip in this case
      if (!raw) {
        return
      }
      
      try {
        const payload = JSON.parse(raw) as Partial<BookingFormData> & { linkedBusinessId?: string }
        
        // Extract linkedBusinessId for backfill tracking
        if (payload.linkedBusinessId) {
          setLinkedBusinessId(payload.linkedBusinessId)
        }
        
        // Also load additionalInfo if available (contains template-specific fields)
        // Structure: { templateName, templateDisplayName, fields: { fieldName: value, ... } }
        const additionalInfoRaw = sessionStorage.getItem(`replicate:${replicateKey}:additionalInfo`)
        const additionalInfo = additionalInfoRaw 
          ? JSON.parse(additionalInfoRaw) as { templateName?: string; templateDisplayName?: string; fields?: Record<string, string> } 
          : null
        
        // One-time use - clean up storage BEFORE updating state to prevent double processing
        sessionStorage.removeItem(`replicate:${replicateKey}`)
        if (additionalInfoRaw) {
          sessionStorage.removeItem(`replicate:${replicateKey}:additionalInfo`)
        }
        
        // Remove linkedBusinessId from payload before spreading (it's not a form field)
        const formPayload = { ...payload }
        delete (formPayload as Record<string, unknown>).linkedBusinessId
        
        // Merge payload and additionalInfo.fields into form data
        setFormData(prev => ({
          ...prev,
          ...formPayload as Partial<BookingFormData>,
          // Spread additionalInfo.fields (the template-specific fields like eventStartTime, restaurantValidDineIn, etc.)
          ...(additionalInfo?.fields && typeof additionalInfo.fields === 'object'
            ? Object.fromEntries(
                Object.entries(additionalInfo.fields).map(([key, value]) => [key, value ?? ''])
              )
            : {}),
        }))
        
        toast.success('Solicitud replicada (desde memoria)')
      } catch (e) {
        console.error('Failed to load replicate payload', e)
        toast.error('No se pudo replicar la solicitud (payload inválido)')
      }
      return
    }

    // Handle replication (legacy) - pre-fill ALL fields from query parameters
    if (isReplicate) {
      
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
        const campaignDurationUnitParam = searchParams.get('campaignDurationUnit')
        if (campaignDurationUnitParam === 'days' || campaignDurationUnitParam === 'months') {
          newData.campaignDurationUnit = campaignDurationUnitParam
        }
        
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
        const provinceDistrictCorregimientoParam = searchParams.get('provinceDistrictCorregimiento')
        if (provinceDistrictCorregimientoParam) newData.provinceDistrictCorregimiento = provinceDistrictCorregimientoParam
        
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
        const hasOtherBranchesParam = searchParams.get('hasOtherBranches')
        if (hasOtherBranchesParam) newData.hasOtherBranches = hasOtherBranchesParam
        
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
        
        // Contenido (AI-Generated)
        const whatWeLikeParam = searchParams.get('whatWeLike')
        if (whatWeLikeParam) newData.whatWeLike = whatWeLikeParam
        const aboutCompanyParam = searchParams.get('aboutCompany')
        if (aboutCompanyParam) newData.aboutCompany = aboutCompanyParam
        const aboutOfferParam = searchParams.get('aboutOffer')
        if (aboutOfferParam) newData.aboutOffer = aboutOfferParam
        const goodToKnowParam = searchParams.get('goodToKnow')
        if (goodToKnowParam) newData.goodToKnow = goodToKnowParam
        
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
            const additionalInfo = JSON.parse(additionalInfoParam) as { fields?: Record<string, string> }
            if (additionalInfo && additionalInfo.fields && typeof additionalInfo.fields === 'object') {
              // Unpack all template-specific fields back into formData
              Object.entries(additionalInfo.fields).forEach(([fieldKey, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                  // Dynamic field assignment for template-specific fields
                  (newData as Record<string, unknown>)[fieldKey] = value
                }
              })
            }
          } catch {
            // Failed to parse additionalInfo
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
      // Category is NOT pre-filled - user must select manually

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
        // Category fields not pre-filled - user must select
        // Only set opportunityId if it's a real opportunity ID (not the "business" flag)
        opportunityId: fromOpportunity !== 'business' ? fromOpportunity : '',
          legalName: legalName || prev.legalName,
          rucDv: ruc || prev.rucDv,
          provinceDistrictCorregimiento: provinceDistrictCorregimiento || prev.provinceDistrictCorregimiento,
          bank: bank || prev.bank,
          bankAccountName: bankAccountName || prev.bankAccountName,
          accountNumber: accountNumber || prev.accountNumber,
          accountType: accountType || prev.accountType,
          paymentType: paymentPlan || prev.paymentType,
          addressAndHours: addressAndHoursFromBusiness || prev.addressAndHours,
          socialMedia: socialFromBusiness || prev.socialMedia,
          contactDetails: website || prev.contactDetails,
          businessReview: prev.businessReview,
          approverBusinessName: legalName || businessName || prev.approverBusinessName,
        }
      })
    } else if (partnerEmail) {
      // Pre-fill from NewRequestModal (primary email only)
      
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

  const updateFormData = (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => {
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

  const handleValidateStep = (stepKey: string): Record<string, string> => {
    const stepId = getStepIdByKey(stepKey) || 1
    const newErrors = validateStep(stepId, formData, requiredFields, stepKey)
    setErrors(newErrors)
    return newErrors
  }

  const totalSteps = availableSteps.length

  // Scroll to top of the form when changing steps
  const scrollToTop = useCallback(() => {
    // Use setTimeout to ensure scroll happens after React state update and re-render
    setTimeout(() => {
      // First, scroll the form container ref if available
      if (formContainerRef.current) {
        formContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
      
      // Also scroll all parent scroll containers (PageContent, etc.)
      const scrollContainers = document.querySelectorAll('.overflow-auto')
      scrollContainers.forEach((container) => {
        container.scrollTo({ top: 0, behavior: 'smooth' })
      })
      
      // Also try window scroll as final fallback
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 50)
  }, [])

  // Scroll to the first field with an error
  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return
    
    setTimeout(() => {
      // Try to find the first error field by name attribute or data-field attribute
      for (const key of errorKeys) {
        // Handle indexed keys like pricingOptions.0.title -> pricingOptions-0-title
        const sanitizedKey = key.replace(/\./g, '-')
        
        // Try multiple selectors to find the field
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
            // Focus the element if it's focusable
            if (element instanceof HTMLInputElement || 
                element instanceof HTMLTextAreaElement || 
                element instanceof HTMLSelectElement) {
              element.focus()
            }
            return
          }
        }
      }
      
      // Fallback: scroll to first element with error styling
      const errorElement = document.querySelector('.border-red-500, .ring-red-500, [aria-invalid="true"]')
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [])

  const handleNext = () => {
    const validationErrors = handleValidateStep(currentStepKey)
    const errorKeys = Object.keys(validationErrors)
    
    if (errorKeys.length === 0) {
      const nextIndex = currentStepIndex + 1
      if (nextIndex < availableSteps.length) {
        const nextStepKey = availableSteps[nextIndex].key
        setCurrentStepKey(nextStepKey)
        scrollToTop()
      }
    } else {
      // Show toast with specific field names
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
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      const prevStepKey = availableSteps[prevIndex].key
      setCurrentStepKey(prevStepKey)
      scrollToTop()
    }
  }
  
  const handleStepClick = (stepKey: string) => {
    const clickedIndex = getStepIndexByKey(stepKey)
    // Only allow clicking on steps that are before the current step
    if (clickedIndex < currentStepIndex) {
      setCurrentStepKey(stepKey)
      scrollToTop()
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

  // React 19: Handler that shows confirmation dialog before submit
  // Now includes backfill preview check
  const handleSubmit = async () => {
    // Check essential fields before submission
    const missingFields: string[] = []
    if (!formData.businessName) missingFields.push('businessName')
    if (!formData.partnerEmail) missingFields.push('partnerEmail')
    if (!formData.startDate) missingFields.push('startDate')
    if (!formData.endDate) missingFields.push('endDate')
    
    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(key => {
        const labels: Record<string, string> = {
          businessName: 'Nombre del Negocio',
          partnerEmail: 'Correo del Aliado',
          startDate: 'Fecha de Inicio (Tentativa)',
          endDate: 'Fecha Final (Tentativa)'
        }
        return labels[key] || key
      })
      
      toast.error(`Campos faltantes: ${fieldLabels.join(', ')}`, { duration: 5000 })
      scrollToFirstError(missingFields)
      return
    }
    
    // Check for business backfill changes if there's a linkedBusinessId
    // This is now the standardized approach - all entry points pass businessId
    if (linkedBusinessId) {
      setLoadingBackfillPreview(true)
      try {
        const formDataToSend = buildFormDataForSubmit(formData)
        formDataToSend.append('linkedBusinessId', linkedBusinessId)
        const preview = await previewBusinessBackfill(formDataToSend, requestId)
        
        if (preview.success && preview.data?.hasLinkedBusiness && preview.data.changes.length > 0) {
          // Store preview and show backfill confirmation dialog
          setBackfillPreview({
            businessName: preview.data.businessName,
            hasVendorId: preview.data.hasVendorId,
            changes: preview.data.changes,
            formattedChanges: preview.data.formattedChanges,
          })
          setShowBackfillDialog(true)
          setLoadingBackfillPreview(false)
          return
        }
      } catch (error) {
        console.error('Error previewing backfill:', error)
        // Continue with regular submit on error
      }
      setLoadingBackfillPreview(false)
    }
    
    // No backfill needed - show regular confirmation dialog
    setShowConfirmDialog(true)
  }

  // Handle confirmed submit WITH backfill
  const handleConfirmedSubmitWithBackfill = async () => {
    setShowBackfillDialog(false)
    
    if (!backfillPreview) {
      // Fallback to regular submit
      handleConfirmedSubmitRegular()
      return
    }
    
    startTransition(async () => {
      const formDataToSend = buildFormDataForSubmit(formData)
      // If we have a direct businessId link, add it for backfill execution
      if (linkedBusinessId) {
        formDataToSend.append('linkedBusinessId', linkedBusinessId)
      }
      
      try {
        const result = await sendBookingRequestWithBackfill(
          formDataToSend,
          requestId,
          backfillPreview.changes
        )
        
        if (result.success) {
          // Show result dialog with backfill info
          setBackfillResult({
            success: true,
            fieldsUpdated: result.backfillResult?.updatedFields,
            vendorSynced: result.backfillResult?.vendorSyncResult?.success,
          })
          setShowBackfillResultDialog(true)
        } else {
          toast.error('Error al enviar solicitud: ' + result.error)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        toast.error('Error: ' + errorMsg)
      }
      
      // Clear backfill preview
      setBackfillPreview(null)
    })
  }

  // Handle skip backfill (send without updating business)
  const handleSkipBackfill = () => {
    setShowBackfillDialog(false)
    setBackfillPreview(null)
    // Show regular confirmation dialog
    setShowConfirmDialog(true)
  }

  // Handle backfill result dialog close
  const handleBackfillResultClose = () => {
    setShowBackfillResultDialog(false)
    setBackfillResult(null)
    toast.success('Solicitud enviada exitosamente')
    router.push('/booking-requests')
  }

  // Handle vendor auto-creation result dialog close
  const handleVendorResultClose = () => {
    setShowVendorResultDialog(false)
    setVendorCreateResult(null)
    toast.success('Solicitud enviada exitosamente')
    router.push('/booking-requests')
  }

  // Regular submit (without backfill)
  const handleConfirmedSubmitRegular = () => {
    setShowConfirmDialog(false)
    startTransition(() => {
      const formDataToSend = buildFormDataForSubmit(formData)
      submitAction(formDataToSend)
    })
  }

  // Actually execute the submit after confirmation (legacy, now calls regular)
  const handleConfirmedSubmit = () => {
    handleConfirmedSubmitRegular()
  }

  const addPricingOption = () => {
    setFormData(prev => ({
      ...prev,
      pricingOptions: [
        ...prev.pricingOptions,
        { title: '', description: '', price: '', realValue: '', quantity: '', limitByUser: '', maxGiftsPerUser: '', endAt: '', expiresIn: '' }
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
      <div className="h-full min-h-screen overflow-auto bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 px-4 font-sans flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 md:h-10 md:w-10 border-3 md:border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-600 font-medium text-sm md:text-base">Cargando solicitud...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={formContainerRef}
      className="h-full min-h-screen overflow-auto bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 pb-24 md:pb-12 font-sans"
    >
      {/* Mobile: Full bleed, Desktop: padded */}
      <div className="max-w-7xl mx-auto px-0 md:px-4 pt-4 md:pt-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Category Availability Sidebar - Only visible on Configuración */}
          {currentStepKey === 'configuracion' && (
            <div className="flex-shrink-0 w-full lg:w-80 order-1 px-3 md:px-0">
              <div className="mb-3 w-full">
                <p className="text-xs font-semibold text-gray-700 mb-1">Seleccionar categoría</p>
                <Dropdown
                  fullWidth
                  items={categoryOptions.map(opt => ({
                    value: opt.value,
                    label: opt.label,
                    description: opt.parent,
                  }))}
                  value={formData.category || ''}
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
              
              {/* Desktop: Always show list */}
              <div className="hidden lg:block">
                <CategoryAvailabilityList 
                  onCategorySelect={(option) => {
                    updateFormData('category', option.value)
                    updateFormData('parentCategory', option.parent)
                    updateFormData('subCategory1', option.sub1 || '')
                    updateFormData('subCategory2', option.sub2 || '')
                  }}
                />
              </div>

              {/* Mobile: Collapsible list */}
              <div className="lg:hidden mb-3">
                <details className="group bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <summary className="flex items-center justify-between p-3 font-medium cursor-pointer text-sm text-gray-700 hover:bg-gray-50 transition-colors select-none">
                    <span>Ver Disponibilidad de Categorías</span>
                    <span className="transition-transform group-open:rotate-180">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <div className="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                    <CategoryAvailabilityList 
                      onCategorySelect={(option) => {
                        updateFormData('category', option.value)
                        updateFormData('parentCategory', option.parent)
                        updateFormData('subCategory1', option.sub1 || '')
                        updateFormData('subCategory2', option.sub2 || '')
                        // Close details on select (optional, but good UX)
                        const details = document.querySelector('details.group')
                        if (details) details.removeAttribute('open')
                      }}
                    />
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className={`flex-1 order-2 px-3 md:px-0 ${currentStepKey === 'configuracion' ? '' : 'max-w-5xl mx-auto'}`}>
            <ProgressBar 
              steps={availableSteps}
              currentStepKey={currentStepKey}
              onStepClick={handleStepClick}
            />

            {/* Form Content */}
            <div className="bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-xl border border-gray-100 overflow-visible mt-3 md:mt-6">
              <div className="p-4 sm:p-6 md:p-10 overflow-visible">
                <div className="animate-fadeIn overflow-visible">
                {currentStepKey === 'configuracion' && (
                  <ConfiguracionStep 
                    formData={formData}
                    errors={errors}
                    updateFormData={updateFormData}
                    isFieldRequired={isFieldRequired}
                    onBusinessSelect={(businessId) => setLinkedBusinessId(businessId)}
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
                />
              )}

              {currentStepKey === 'contenido' && (
                <ContenidoStep
                  formData={formData}
                  errors={errors}
                  updateFormData={updateFormData}
                  isFieldRequired={isFieldRequired}
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

            {/* Desktop: Inline navigation */}
            <div className="hidden md:block mt-4 md:mt-6">
              <NavigationButtons
                currentStepIndex={currentStepIndex}
                totalSteps={totalSteps}
                saving={saving}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSaveDraft={handleSaveDraft}
                onSubmit={handleSubmit}
                onGoBack={handleGoBack}
                hasErrors={Object.keys(errors).length > 0}
              />
            </div>

            {/* Footer - Desktop only */}
            <div className="hidden md:block mt-8 text-center text-sm text-gray-400 pb-8">
              OfertaSimple Booking System • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile: Fixed bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
        <NavigationButtons
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          saving={saving}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          onGoBack={handleGoBack}
          hasErrors={Object.keys(errors).length > 0}
        />
      </div>

      {/* Submit Confirmation Dialog (no backfill) */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirmar Envío"
        message="¿Estás seguro de enviar esta solicitud? Se enviará un correo de aprobación al aliado y no podrás editar esta solicitud una vez enviada."
        confirmText="Enviar Solicitud"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={handleConfirmedSubmit}
        onCancel={() => setShowConfirmDialog(false)}
        loading={isSubmitPending}
        loadingText="Enviando..."
      />

      {/* Backfill Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBackfillDialog}
        title="Actualizar Datos del Negocio"
        message={
          <div className="text-left space-y-3">
            <p className="text-gray-700 text-sm">
              Se detectaron cambios en esta solicitud que pueden actualizar el negocio <strong>{backfillPreview?.businessName}</strong>.
            </p>
            
            {backfillPreview?.formattedChanges && backfillPreview.formattedChanges.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">Campos a actualizar:</p>
                <ul className="space-y-1.5 text-sm">
                  {backfillPreview.formattedChanges.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      {change.isUpdate ? (
                        <>
                          <span className="text-amber-600 font-medium">~</span>
                          <span className="text-gray-700">
                            <span className="font-medium">{change.label}:</span>{' '}
                            <span className="text-red-500 line-through">{change.oldValue}</span>
                            {' → '}
                            <span className="text-green-700">{change.value}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-green-600 font-medium">+</span>
                          <span className="text-gray-700">
                            <span className="font-medium">{change.label}:</span>{' '}
                            <span className="text-green-700">{change.value}</span>
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* OfertaSimple sync info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <SyncIcon style={{ fontSize: 14 }} className="text-gray-500" />
                <p className="text-xs font-semibold text-gray-700">OfertaSimple Admin</p>
              </div>
              {backfillPreview?.hasVendorId ? (
                <p className="text-xs text-gray-600">
                  Los campos actualizados se sincronizarán automáticamente con el Vendor en OfertaSimple.
                </p>
              ) : (
                <p className="text-xs text-gray-600">
                  Se creará un nuevo Vendor en OfertaSimple con los datos de este negocio.
                </p>
              )}
            </div>
            
            <p className="text-gray-500 text-xs pt-2 border-t border-gray-200">
              ¿Desea actualizar el negocio con estos datos y enviar la solicitud?
            </p>
          </div>
        }
        confirmText="Actualizar y Enviar"
        cancelText="Solo Enviar"
        confirmVariant="primary"
        onConfirm={handleConfirmedSubmitWithBackfill}
        onCancel={handleSkipBackfill}
        loading={isSubmitPending || isPending}
        loadingText="Enviando..."
      />

      {/* Backfill Result Dialog */}
      <ConfirmDialog
        isOpen={showBackfillResultDialog}
        title={backfillResult?.success ? "Solicitud Enviada" : "Error"}
        message={
          <div className="text-left space-y-3">
            {backfillResult?.success ? (
              <>
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircleOutlineIcon style={{ fontSize: 18 }} />
                  <span>Solicitud enviada exitosamente.</span>
                </div>
                
                {backfillResult.fieldsUpdated && backfillResult.fieldsUpdated.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">
                      Negocio actualizado ({backfillResult.fieldsUpdated.length} campo{backfillResult.fieldsUpdated.length > 1 ? 's' : ''}):
                    </p>
                    <p className="text-sm text-green-700">
                      {backfillResult.fieldsUpdated.join(', ')}
                    </p>
                  </div>
                )}
                
                {backfillResult.vendorSynced && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                    <SyncIcon style={{ fontSize: 14 }} />
                    <span>Sincronizado con OfertaSimple (Vendor API)</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <ErrorOutlineIcon style={{ fontSize: 18 }} />
                <span>{backfillResult?.error || 'Error desconocido'}</span>
              </div>
            )}
          </div>
        }
        confirmText="Entendido"
        cancelText=""
        confirmVariant={backfillResult?.success ? "success" : "danger"}
        onConfirm={handleBackfillResultClose}
        onCancel={handleBackfillResultClose}
      />

      {/* Vendor Auto-Creation Result Dialog */}
      <ConfirmDialog
        isOpen={showVendorResultDialog}
        title="Solicitud Enviada"
        message={
          <div className="text-left space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircleOutlineIcon style={{ fontSize: 18 }} />
              <span>Solicitud enviada exitosamente.</span>
            </div>
            
            {vendorCreateResult?.success ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <StorefrontIcon style={{ fontSize: 14 }} className="text-blue-600" />
                  <p className="text-xs font-semibold text-blue-800">
                    Vendor creado en OfertaSimple
                  </p>
                </div>
                <p className="text-sm text-blue-700">
                  {vendorCreateResult.businessName && (
                    <span className="font-medium">{vendorCreateResult.businessName}</span>
                  )}
                  {vendorCreateResult.externalVendorId && (
                    <span className="text-blue-500 ml-1">(ID: {vendorCreateResult.externalVendorId})</span>
                  )}
                </p>
              </div>
            ) : vendorCreateResult?.error ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <WarningAmberIcon style={{ fontSize: 14 }} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-800">
                    No se pudo crear el Vendor en OfertaSimple
                  </p>
                </div>
                <p className="text-sm text-amber-700">
                  {vendorCreateResult.error}
                </p>
                {vendorCreateResult.businessName && (
                  <p className="text-xs text-amber-600 mt-1">
                    Negocio: {vendorCreateResult.businessName}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        }
        confirmText="Entendido"
        cancelText=""
        confirmVariant="success"
        onConfirm={handleVendorResultClose}
        onCancel={handleVendorResultClose}
      />

      {/* Loading overlay for backfill preview */}
      {loadingBackfillPreview && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-gray-700 font-medium">Verificando datos del negocio...</span>
          </div>
        </div>
      )}

      <FullScreenLoader
        isLoading={isSubmitPending || isPending}
        message="Enviando solicitud..."
        subtitle="Procesando email y sincronizando datos"
      />
    </div>
  )
}
