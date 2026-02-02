'use client'

import { useEffect, useState, useMemo, useCallback, useActionState, useTransition, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createBusiness, updateBusiness, createOpportunity } from '@/app/actions/crm'
import { previewVendorSync, syncVendorToExternal } from '@/app/actions/businesses'
import { formatValueForDisplay } from '@/lib/api/external-oferta/vendor/mapper'
import type { VendorFieldChange } from '@/lib/api/external-oferta/vendor/types'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import { useCachedFormConfig } from '@/hooks/useFormConfigCache'
import type { Business, Opportunity, BookingRequest, UserData } from '@/types'
import type { Category } from '@prisma/client'

// Action state types for React 19 useActionState
type FormActionState = {
  success: boolean
  error: string | null
}
import BusinessIcon from '@mui/icons-material/Business'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import { getActiveFocus, getFocusInfo, FOCUS_PERIOD_LABELS, type FocusPeriod } from '@/lib/utils/focus-period'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { useBusinessForm } from './useBusinessForm'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import { Button, Alert } from '@/components/ui'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

// Lazy load nested modals - only loaded when opened
const OpportunityFormModal = lazy(() => import('../opportunity/OpportunityFormModal'))
const BookingRequestViewModal = lazy(() => import('@/components/booking/request-view/BookingRequestViewModal'))
const FocusPeriodModal = lazy(() => import('./FocusPeriodModal'))

// Lazy load sections only shown for existing businesses
const OpportunitiesSection = lazy(() => import('./OpportunitiesSection'))
const RequestsSection = lazy(() => import('./RequestsSection'))

// Simple loading fallback for lazy sections
function SectionLoadingFallback() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    </div>
  )
}

interface BusinessFormModalProps {
  isOpen: boolean
  onClose: () => void
  business?: Business | null
  onSuccess: (business: Business) => void
  // Pre-loaded data to skip fetching (passed from parent page)
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
  // Read-only mode for viewing without edit permission
  // Sales users can VIEW all businesses but only EDIT assigned ones
  canEdit?: boolean
}

export default function BusinessFormModal({ 
  isOpen, 
  onClose, 
  business, 
  onSuccess,
  preloadedCategories,
  preloadedUsers,
  canEdit = true, // Default to true for backwards compatibility
}: BusinessFormModalProps) {
  // CreateResult type - existingBusiness uses Record for flexibility with Prisma's return type
  type CreateResult = {
    success: boolean
    data?: Business
    error?: string
    existingBusiness?: Record<string, unknown> & { name: string; owner?: { name: string | null; email: string | null } | null }
    vendorApiResult?: {
      success: boolean
      externalVendorId?: number
      error?: string
      logId?: string
    }
  }
  
  // Confirm dialog for pre-confirmation and vendor API result
  const vendorConfirmDialog = useConfirmDialog()
  const vendorResultDialog = useConfirmDialog()
  
  // Sync dialog for PATCH updates
  const syncConfirmDialog = useConfirmDialog()
  const syncResultDialog = useConfirmDialog()
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncChanges, setSyncChanges] = useState<VendorFieldChange[]>([])
  const [syncVendorId, setSyncVendorId] = useState<string | null>(null)
  
  // Show pre-confirmation dialog before creating vendor
  const confirmVendorCreation = async (): Promise<boolean> => {
    return await vendorConfirmDialog.confirm({
      title: 'Crear Vendor en OfertaSimple',
      message: 'Al crear este negocio, se enviará automáticamente un nuevo vendor a OfertaSimple.\n\n¿Desea continuar?',
      confirmText: 'Sí, crear negocio y vendor',
      cancelText: 'Cancelar',
      confirmVariant: 'primary',
    })
  }
  
  // Show vendor API result dialog (awaited before closing modal)
  const showVendorResultDialog = async (vendorResult: CreateResult['vendorApiResult']) => {
    if (!vendorResult) return
    
    const isOk = vendorResult.success === true
    
    // Build message as JSX for proper line breaks
    const messageContent = (
      <div className="text-left space-y-2">
        <p className={isOk ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
          {isOk 
            ? '✅ Vendor creado exitosamente en OfertaSimple.' 
            : '❌ Error al crear vendor en OfertaSimple.'}
        </p>
        
        {vendorResult.success && vendorResult.externalVendorId && (
          <p className="text-gray-700">
            <span className="font-medium">ID del Vendor:</span> {vendorResult.externalVendorId}
          </p>
        )}
        
        {!vendorResult.success && vendorResult.error && (
          <p className="text-gray-700 text-sm">
            <span className="font-medium">Error:</span> {vendorResult.error}
          </p>
        )}
        
        {vendorResult.logId && (
          <p className="text-gray-500 text-xs">
            ID de Log: {vendorResult.logId}
          </p>
        )}
        
        <p className="text-gray-500 text-xs pt-2 border-t border-gray-200">
          Puede ver más detalles en Settings → API Logs.
        </p>
      </div>
    )
    
    await vendorResultDialog.confirm({
      title: isOk ? 'Vendor Creado' : 'Error al Crear Vendor',
      message: messageContent,
      confirmText: 'Entendido',
      cancelText: '',
      confirmVariant: isOk ? 'success' : 'danger',
    })
  }

  // Handle sync to OfertaSimple (PATCH)
  const handleSyncToOfertaSimple = async () => {
    if (!business?.id || !business?.osAdminVendorId) return
    
    setError('')
    setSyncLoading(true)
    
    try {
      // Step 1: Preview changes
      const allValues = dynamicForm.getAllValues()
      const previewResult = await previewVendorSync(business.id, allValues)
      
      if (!previewResult.success || !previewResult.data) {
        setError(previewResult.error || 'Error al obtener cambios')
        setSyncLoading(false)
        return
      }
      
      const { changes, vendorId } = previewResult.data
      
      // If no API-syncable changes, offer to save locally only
      if (changes.length === 0) {
        setSyncLoading(false)
        
        const saveLocallyContent = (
          <div className="text-left space-y-3">
            <p className="text-gray-700 text-sm">
              No se detectaron cambios en campos sincronizables con OfertaSimple.
            </p>
            <p className="text-gray-600 text-sm">
              Si realizó cambios en otros campos (como notas, equipo, etc.), estos se guardarán localmente sin sincronizar con la API.
            </p>
          </div>
        )
        
        const confirmed = await syncConfirmDialog.confirm({
          title: 'Sin cambios para API',
          message: saveLocallyContent,
          confirmText: 'Guardar Localmente',
          cancelText: 'Cancelar',
          confirmVariant: 'primary',
        })
        
        if (!confirmed) return
        
        // Save locally without API sync
        setSyncLoading(true)
        const formData = buildFormData()
        const updateResult = await updateBusiness(business.id, formData)
        setSyncLoading(false)
        
        if (updateResult.success && updateResult.data) {
          // Show success confirmation
          const successContent = (
            <div className="text-left space-y-2">
              <p className="text-green-700 font-medium">
                ✅ Cambios guardados localmente.
              </p>
              <p className="text-gray-600 text-sm">
                Los cambios se guardaron en el sistema pero no se sincronizaron con OfertaSimple (no había cambios en campos sincronizables).
              </p>
            </div>
          )
          
          await syncResultDialog.confirm({
            title: 'Guardado Exitoso',
            message: successContent,
            confirmText: 'Entendido',
            cancelText: '',
            confirmVariant: 'success',
          })
          
          onSuccess(updateResult.data)
          onClose()
        } else {
          setError(updateResult.error || 'Error al guardar')
        }
        return
      }
      
      setSyncChanges(changes)
      setSyncVendorId(vendorId)
      setSyncLoading(false)
      
      // Step 2: Show confirmation dialog with changes
      const changesContent = (
        <div className="text-left space-y-3">
          <p className="text-gray-700 text-sm">
            Se enviarán los siguientes cambios a OfertaSimple:
          </p>
          <ul className="space-y-1.5 text-sm">
            {changes.map((change) => (
              <li key={change.fieldKey} className="flex items-start gap-2">
                {change.isNew ? (
                  <span className="text-green-600 font-medium">+</span>
                ) : (
                  <span className="text-amber-600 font-medium">●</span>
                )}
                <span className="text-gray-700">
                  <span className="font-medium">{change.label}:</span>{' '}
                  {change.isNew ? (
                    <span className="text-green-700">{formatValueForDisplay(change.newValue)}</span>
                  ) : (
                    <>
                      <span className="text-gray-400 line-through">{formatValueForDisplay(change.oldValue)}</span>
                      <span className="mx-1">→</span>
                      <span className="text-amber-700">{formatValueForDisplay(change.newValue)}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-gray-500 text-xs pt-2 border-t border-gray-200">
            Vendor ID: {vendorId}
          </p>
        </div>
      )
      
      const confirmed = await syncConfirmDialog.confirm({
        title: 'Sincronizar con OfertaSimple',
        message: changesContent,
        confirmText: 'Sincronizar',
        cancelText: 'Cancelar',
        confirmVariant: 'primary',
      })
      
      if (!confirmed) return
      
      // Step 3: Execute sync (auto-saves locally + PATCH to API)
      setSyncLoading(true)
      const formData = buildFormData()
      const syncResult = await syncVendorToExternal(business.id, formData)
      setSyncLoading(false)
      
      // Step 4: Show result dialog
      const isOk = syncResult.success
      const resultContent = (
        <div className="text-left space-y-2">
          <p className={isOk ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
            {isOk 
              ? `✅ ${syncResult.data?.fieldsUpdated} campo(s) sincronizado(s) exitosamente.` 
              : '❌ Error al sincronizar con OfertaSimple.'}
          </p>
          
          {!isOk && syncResult.error && (
            <p className="text-gray-700 text-sm">
              <span className="font-medium">Error:</span> {syncResult.error}
            </p>
          )}
          
          <p className="text-gray-500 text-xs pt-2 border-t border-gray-200">
            Puede ver más detalles en Settings → API Logs.
          </p>
        </div>
      )
      
      await syncResultDialog.confirm({
        title: isOk ? 'Sincronización Exitosa' : 'Error de Sincronización',
        message: resultContent,
        confirmText: 'Entendido',
        cancelText: '',
        confirmVariant: isOk ? 'success' : 'danger',
      })
      
      // If successful, refresh the business data
      if (isOk && syncResult.data?.business) {
        onSuccess(syncResult.data.business)
      }
      
    } catch (err) {
      setError('Error inesperado al sincronizar')
      setSyncLoading(false)
    }
  }

  const router = useRouter()
  const { user } = useUser()
  const { isAdmin } = useUserRole()
  const [error, setError] = useState('')
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [focusModalOpen, setFocusModalOpen] = useState(false)

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [requestViewModalOpen, setRequestViewModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  // Track local focus state for immediate UI updates
  const [localFocusPeriod, setLocalFocusPeriod] = useState<FocusPeriod | null>(null)
  const [localFocusSetAt, setLocalFocusSetAt] = useState<Date | string | null>(null)
  // Track unlocked state for fields with canEditAfterCreation
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({})

  // Get cached form configuration (instant if already prefetched)
  const { sections: cachedSections, initialized: cachedInitialized, loading: configLoading } = useCachedFormConfig('business')

  // Load supporting data using existing hook
  const {
    ownerId,
    setOwnerId,
    salesTeam,
    setSalesTeam,
    categories,
    users,
    opportunities,
    requests,
    loadingData,
    loadFormData,
  } = useBusinessForm({
    isOpen,
    business,
    isAdmin,
    currentUserId: user?.id,
    preloadedCategories,
    preloadedUsers,
  })

  // Build initial values from business entity
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!business) return {}
    return {
      name: business.name || null,
      contactName: business.contactName || null,
      contactPhone: business.contactPhone || null,
      contactEmail: business.contactEmail || null,
      categoryId: business.categoryId || null,
      salesTeam: business.salesTeam || null,
      website: business.website || null,
      instagram: business.instagram || null,
      description: business.description || null,
      tier: business.tier?.toString() || null,
      ruc: business.ruc || null,
      razonSocial: business.razonSocial || null,
      provinceDistrictCorregimiento: business.provinceDistrictCorregimiento || null,
      accountManager: business.accountManager || null,
      ere: business.ere || null,
      salesType: business.salesType || null,
      isAsesor: business.isAsesor || null,
      osAsesor: business.osAsesor || null,
      paymentPlan: business.paymentPlan || null,
      bank: business.bank || null,
      beneficiaryName: business.beneficiaryName || null,
      accountNumber: business.accountNumber || null,
      accountType: business.accountType || null,
      emailPaymentContacts: business.emailPaymentContacts || null,
      address: business.address || null,
      neighborhood: business.neighborhood || null,
      osAdminVendorId: business.osAdminVendorId || null,
    }
  }, [business])

  // Get current focus info (either from local state or business prop)
  const currentFocusPeriod = localFocusPeriod !== null ? localFocusPeriod : (business?.focusPeriod as FocusPeriod | null)
  const currentFocusSetAt = localFocusSetAt !== null ? localFocusSetAt : business?.focusSetAt
  const focusInfo = getFocusInfo({ focusPeriod: currentFocusPeriod, focusSetAt: currentFocusSetAt })

  // Dynamic form hook - pass preloaded sections from cache
  const dynamicForm = useDynamicForm({
    entityType: 'business',
    entityId: business?.id,
    initialValues,
    // Use cached form config if available (instant load)
    preloadedSections: cachedSections.length > 0 ? cachedSections : undefined,
    preloadedInitialized: cachedInitialized,
  })

  // State to track pending vendor result for showing dialog after action completes
  const [pendingVendorResult, setPendingVendorResult] = useState<CreateResult['vendorApiResult'] | null>(null)
  
  // React 19: useActionState for save/update business action
  const [saveState, saveAction, isSavePending] = useActionState<FormActionState, FormData>(
    async (_prevState, formData) => {
      try {
        const isNewBusiness = !business
        
        const result: CreateResult = business
          ? await updateBusiness(business.id, formData)
          : await createBusiness(formData)

        if (result.success && result.data) {
          // Save custom field values
          const customFieldResult = await dynamicForm.saveCustomFields(result.data.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          
          // Store vendor result to show dialog after action completes
          if (isNewBusiness && result.vendorApiResult) {
            setPendingVendorResult(result.vendorApiResult)
          }
          
          onSuccess(result.data)
          onClose()
          return { success: true, error: null }
        } else {
          const existing = result.existingBusiness
          if (existing) {
            const ownerInfo = existing.owner?.name || existing.owner?.email || 'Desconocido'
            const errorMsg = `El negocio ya existe: "${existing.name}" (Propietario: ${ownerInfo})`
            setError(errorMsg)
            return { success: false, error: errorMsg }
          } else {
            const errorMsg = result.error || 'Error al guardar el negocio'
            setError(errorMsg)
            return { success: false, error: errorMsg }
          }
        }
      } catch (err) {
        const errorMsg = 'Ocurrió un error'
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
    },
    { success: false, error: null }
  )
  
  // Show vendor result dialog when pendingVendorResult is set
  useEffect(() => {
    if (pendingVendorResult) {
      showVendorResultDialog(pendingVendorResult).then(() => {
        setPendingVendorResult(null)
      })
    }
  }, [pendingVendorResult])

  // State to hold the newly created business for opening opportunity modal
  const [createdBusiness, setCreatedBusiness] = useState<Business | null>(null)

  // React 19: useActionState for create business & opportunity action
  const [createWithOppState, createWithOppAction, isCreateWithOppPending] = useActionState<FormActionState, FormData>(
    async (_prevState, formData) => {
      try {
        const allValues = dynamicForm.getAllValues()
        
        if (!allValues.name || !allValues.contactName || !allValues.contactPhone || !allValues.contactEmail) {
          const errorMsg = 'Por favor complete todos los campos requeridos'
          setError(errorMsg)
          return { success: false, error: errorMsg }
        }

        const businessResult: CreateResult = await createBusiness(formData)

        if (!businessResult.success || !businessResult.data) {
          const existing = businessResult.existingBusiness as (Business & { owner?: { name: string | null; email: string | null } }) | undefined
          if (existing) {
            const ownerInfo = existing.owner?.name || existing.owner?.email || 'Desconocido'
            const errorMsg = `El negocio ya existe: "${existing.name}" (Propietario: ${ownerInfo})`
            setError(errorMsg)
            return { success: false, error: errorMsg }
          } else {
            const errorMsg = businessResult.error || 'Error al crear el negocio'
            setError(errorMsg)
            return { success: false, error: errorMsg }
          }
        }

        // Save custom field values
        const customFieldResult = await dynamicForm.saveCustomFields(businessResult.data.id)
        if (!customFieldResult.success) {
          console.warn('Failed to save custom fields:', customFieldResult.error)
        }
        
        // Store vendor result to show dialog after action completes
        if (businessResult.vendorApiResult) {
          setPendingVendorResult(businessResult.vendorApiResult)
        }

        const opportunityFormData = new FormData()
        opportunityFormData.append('businessId', businessResult.data.id)
        opportunityFormData.append('stage', 'iniciacion')
        opportunityFormData.append('startDate', new Date().toISOString().split('T')[0])

        const opportunityResult = await createOpportunity(opportunityFormData)

        if (opportunityResult.success && businessResult.data && opportunityResult.data) {
          // Store the created business and open opportunity modal
          setCreatedBusiness(businessResult.data)
          setSelectedOpportunity(opportunityResult.data)
          setOpportunityModalOpen(true)
          return { success: true, error: null }
        } else {
          const errorMsg = 'Negocio creado pero falló al crear la oportunidad: ' + (opportunityResult.error || 'Error desconocido')
          setError(errorMsg)
          return { success: false, error: errorMsg }
        }
      } catch (err) {
        const errorMsg = 'Ocurrió un error: ' + (err instanceof Error ? err.message : 'Error desconocido')
        setError(errorMsg)
        return { success: false, error: errorMsg }
      }
    },
    { success: false, error: null }
  )

  // Combined loading state for UI feedback
  const loading = isSavePending || isCreateWithOppPending || isPending

  // Clear stale errors and reset field locks whenever the modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setError('')
      setUnlockedFields({})
    }
  }, [isOpen])

  // Helper to toggle unlock state for a field
  const toggleFieldUnlock = useCallback((fieldKey: string) => {
    setUnlockedFields(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }))
  }, [])

  function handleEditOpportunity(opportunity: Opportunity) {
    // Close business modal and navigate to opportunities page with this opportunity
    sessionStorage.setItem('openOpportunityId', opportunity.id)
    onClose()
    router.push('/opportunities')
  }

  function handleCreateNewOpportunity() {
    // Open opportunity modal to create a new opportunity for this business
    setSelectedOpportunity(null)
    setOpportunityModalOpen(true)
  }

  function handleViewRequest(request: BookingRequest) {
    setSelectedRequestId(request.id)
    setRequestViewModalOpen(true)
  }

  function handleCreateRequest() {
    if (!business) return
    
    // Build query parameters with business data for pre-filling
    const params = new URLSearchParams()
    
    // Flag to trigger pre-fill logic in EnhancedBookingForm
    params.set('fromOpportunity', 'business')
    
    // Basic business info
    params.set('businessName', business.name)
    params.set('businessEmail', business.contactEmail || '')
    params.set('contactName', business.contactName || '')
    params.set('contactPhone', business.contactPhone || '')
    
    // Category info
    if (business.category) {
      if (business.category.parentCategory) params.set('parentCategory', business.category.parentCategory)
      if (business.category.subCategory1) params.set('subCategory1', business.category.subCategory1)
      if (business.category.subCategory2) params.set('subCategory2', business.category.subCategory2)
    }
    
    // Legal/Tax info
    if (business.razonSocial) params.set('legalName', business.razonSocial)
    if (business.ruc) params.set('ruc', business.ruc)
    
    // Location info
    if (business.provinceDistrictCorregimiento) params.set('provinceDistrictCorregimiento', business.provinceDistrictCorregimiento)
    if (business.address) params.set('address', business.address)
    if (business.neighborhood) params.set('neighborhood', business.neighborhood)
    
    // Bank/Payment info
    if (business.bank) params.set('bank', business.bank)
    if (business.beneficiaryName) params.set('bankAccountName', business.beneficiaryName)
    if (business.accountNumber) params.set('accountNumber', business.accountNumber)
    if (business.accountType) params.set('accountType', business.accountType)
    if (business.paymentPlan) params.set('paymentPlan', business.paymentPlan)
    
    // Additional info
    if (business.website) params.set('website', business.website)
    if (business.instagram) params.set('instagram', business.instagram)
    if (business.description) params.set('description', business.description)
    
    // Email payment contacts
    if (business.emailPaymentContacts) {
      const paymentEmails = (business.emailPaymentContacts as string).split(/[;,\\s]+/).filter(Boolean)
      if (paymentEmails.length > 0) {
        params.set('paymentEmails', JSON.stringify(paymentEmails))
      }
    }
    
    // Navigate to new request form with pre-filled data
    router.push(`/booking-requests/new?${params.toString()}`)
    onClose() // Close the business modal
  }

  async function handleOpportunitySuccess(opportunity: Opportunity) {
    // Close the opportunity modal
    setOpportunityModalOpen(false)
    setSelectedOpportunity(null)
    
    if (business) {
      // Editing existing business - refresh data and stay in business modal
      await loadFormData()
      onSuccess(business)
    } else if (createdBusiness) {
      // New business was just created - notify parent, close modal, and redirect to opportunity
      onSuccess(createdBusiness)
      setCreatedBusiness(null)
      onClose()
      
      // Redirect to opportunities page with the new opportunity open
      sessionStorage.setItem('openOpportunityId', opportunity.id)
      router.push('/opportunities')
    }
  }

  // Build form data from dynamic form values
  function buildFormData(): FormData {
    const formData = new FormData()
    const allValues = dynamicForm.getAllValues()

    // Built-in fields
    formData.append('name', allValues.name || '')
    formData.append('contactName', allValues.contactName || '')
    formData.append('contactPhone', allValues.contactPhone || '')
    formData.append('contactEmail', allValues.contactEmail || '')
    
    if (allValues.categoryId) formData.append('categoryId', allValues.categoryId)
    // For existing businesses, only admin can change owner
    // For new businesses, always send the owner (defaults to creator)
    if (ownerId) formData.append('ownerId', ownerId)
    if (salesTeam) formData.append('salesTeam', salesTeam)
    if (allValues.website) formData.append('website', allValues.website)
    if (allValues.instagram) formData.append('instagram', allValues.instagram)
    if (allValues.description) formData.append('description', allValues.description)
    if (allValues.tier) formData.append('tier', allValues.tier)
    if (allValues.ruc) formData.append('ruc', allValues.ruc)
    if (allValues.razonSocial) formData.append('razonSocial', allValues.razonSocial)
    if (allValues.provinceDistrictCorregimiento) formData.append('provinceDistrictCorregimiento', allValues.provinceDistrictCorregimiento)
    if (allValues.accountManager) formData.append('accountManager', allValues.accountManager)
    if (allValues.ere) formData.append('ere', allValues.ere)
    if (allValues.salesType) formData.append('salesType', allValues.salesType)
    if (allValues.isAsesor) formData.append('isAsesor', allValues.isAsesor)
    if (allValues.osAsesor) formData.append('osAsesor', allValues.osAsesor)
    if (allValues.paymentPlan) formData.append('paymentPlan', allValues.paymentPlan)
    if (allValues.bank) formData.append('bank', allValues.bank)
    if (allValues.beneficiaryName) formData.append('beneficiaryName', allValues.beneficiaryName)
    if (allValues.accountNumber) formData.append('accountNumber', allValues.accountNumber)
    if (allValues.accountType) formData.append('accountType', allValues.accountType)
    if (allValues.emailPaymentContacts) formData.append('emailPaymentContacts', allValues.emailPaymentContacts)
    if (allValues.address) formData.append('address', allValues.address)
    if (allValues.neighborhood) formData.append('neighborhood', allValues.neighborhood)
    if (allValues.osAdminVendorId) formData.append('osAdminVendorId', allValues.osAdminVendorId)

    return formData
  }

  // React 19: Handler that triggers the save action
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    // For existing businesses with vendor ID (admin only) - use sync flow
    const usesSyncFlow = !!business && isAdmin && !!business.osAdminVendorId
    if (usesSyncFlow) {
      await handleSyncToOfertaSimple()
      return
    }
    
    // For new businesses, ask confirmation before creating vendor
    const isNewBusiness = !business
    if (isNewBusiness) {
      const confirmed = await confirmVendorCreation()
      if (!confirmed) {
        return // User cancelled
      }
    }
    
    startTransition(() => {
      const formData = buildFormData()
      saveAction(formData)
    })
  }

  // React 19: Handler that triggers the create business & opportunity action
  async function handleCreateBusinessAndOpportunity(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    
    // Ask confirmation before creating vendor (always new business in this flow)
    const confirmed = await confirmVendorCreation()
    if (!confirmed) {
      return // User cancelled
    }
    
    startTransition(() => {
      const formData = buildFormData()
      createWithOppAction(formData)
    })
  }

  const isEditMode = !!business
  
  // Show "Guardar y Sincronizar" for admin + existing business with vendor ID
  const shouldShowSyncButton = isEditMode && isAdmin && !!business?.osAdminVendorId

  // Prepare categories and users for dynamic fields
  const categoryOptions = useMemo(() => categories.map(cat => ({
    id: cat.id,
    categoryKey: cat.categoryKey,
    parentCategory: cat.parentCategory,
    subCategory1: cat.subCategory1,
    subCategory2: cat.subCategory2,
    subCategory3: cat.subCategory3,
    subCategory4: cat.subCategory4,
  })), [categories])

  const userOptions = useMemo(() => users.map(user => ({
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
  })), [users])

  // Memoize form values to prevent DynamicFormSection re-renders
  const allFormValues = useMemo(() => {
    return { ...dynamicForm.values, ...dynamicForm.customFieldValues }
  }, [dynamicForm.values, dynamicForm.customFieldValues])

  // Get locked field keys once (stable across renders)
  const lockedFieldKeys = useMemo(() => {
    const keys = new Set<string>(['name']) // Business name is always locked
    if (dynamicForm.initialized) {
      for (const section of dynamicForm.sections) {
        for (const field of section.fields) {
          if (field.canEditAfterCreation) {
            keys.add(field.fieldKey)
          }
        }
      }
    }
    return keys
  }, [dynamicForm.initialized, dynamicForm.sections])

  // Extract only INITIAL locked field values as a stable string for comparison
  // Use initialValues (not current values) to determine which fields had data when modal opened
  // This prevents fields from getting locked when user starts typing in empty fields
  const lockedFieldValuesKey = useMemo(() => {
    const entries: string[] = []
    for (const key of lockedFieldKeys) {
      entries.push(`${key}:${initialValues[key] || ''}`)
    }
    return entries.join('|')
  }, [lockedFieldKeys, initialValues])

  // Build field overrides based on INITIAL values only
  // Fields that had data when modal opened should be locked; empty fields stay editable
  const fieldOverrides: Record<string, { canEdit?: boolean }> = useMemo(() => {
    const overrides: Record<string, { canEdit?: boolean }> = {}
    
    for (const fieldKey of lockedFieldKeys) {
      // Use INITIAL value to determine if field should be locked
      const initialValue = initialValues[fieldKey]
      const hadInitialValue = initialValue && initialValue.trim() !== ''
      
      if (isEditMode && hadInitialValue) {
        // Field had data when modal opened - lock it unless admin unlocks
        const canEdit = isAdmin && unlockedFields[fieldKey] === true
        overrides[fieldKey] = { canEdit }
      } else {
        // Field was empty initially - keep it editable
        overrides[fieldKey] = { canEdit: true }
      }
    }
    
    return overrides
  }, [lockedFieldKeys, initialValues, isEditMode, isAdmin, unlockedFields])

  // Field addons (lock icons for fields with canEditAfterCreation in edit mode for admin)
  const fieldAddons: Record<string, React.ReactElement> = useMemo(() => {
    const addons: Record<string, React.ReactElement> = {}
    
    if (!isEditMode || !isAdmin) return addons
    
    for (const fieldKey of lockedFieldKeys) {
      // Use INITIAL value to determine if lock icon should show
      const initialValue = initialValues[fieldKey]
      const hadInitialValue = initialValue && initialValue.trim() !== ''
      
      if (hadInitialValue) {
        const isUnlocked = unlockedFields[fieldKey] || false
        addons[fieldKey] = (
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => toggleFieldUnlock(fieldKey)}
              className={`p-2 rounded-md transition-colors ${
                isUnlocked
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={isUnlocked ? 'Bloqueado habilitado - click para bloquear' : 'Click para desbloquear edición'}
            >
              {isUnlocked ? (
                <LockOpenIcon fontSize="small" />
              ) : (
                <LockIcon fontSize="small" />
              )}
            </button>
            {isUnlocked && (
              <p className="text-[10px] text-red-600 font-medium max-w-[120px] leading-tight">
                Solo modificar si es necesario
              </p>
            )}
          </div>
        )
      }
    }
    
    return addons
  }, [isEditMode, isAdmin, lockedFieldKeys, initialValues, unlockedFields, toggleFieldUnlock])

  // Early return if modal is not open - saves rendering work
  if (!isOpen) return null

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={business ? (business.name || 'Editar Negocio') : 'Nuevo Negocio'}
      subtitle="Negocio"
      icon={<BusinessIcon fontSize="medium" />}
      iconColor="blue"
      headerActions={
        business ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/businesses/${business.id}`)}
            leftIcon={<OpenInNewIcon fontSize="small" />}
          >
            Abrir página
          </Button>
        ) : undefined
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel={canEdit ? 'Cancelar' : 'Cerrar'}
          submitLabel={canEdit ? (shouldShowSyncButton ? 'Guardar y Sincronizar' : 'Guardar') : undefined}
          submitLoading={loading || loadingData || dynamicForm.loading || (shouldShowSyncButton && syncLoading)}
          submitDisabled={loading || loadingData || dynamicForm.loading || (shouldShowSyncButton && syncLoading)}
          leftContent={canEdit ? '* Campos requeridos' : undefined}
          formId="business-modal-form"
          additionalActions={
            canEdit && !business ? (
              <Button
                type="button"
                onClick={handleCreateBusinessAndOpportunity}
                disabled={loading || loadingData || dynamicForm.loading}
                loading={loading}
                className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300"
              >
                Crear Negocio y Opp
              </Button>
            ) : undefined
          }
        />
      }
    >
      <form id="business-modal-form" onSubmit={handleSubmit} className="bg-gray-50 min-h-[500px] flex flex-col">
            {/* Read-only mode banner */}
            {!canEdit && business && (
              <div className="mx-6 mt-4">
                <Alert variant="info" icon={<LockIcon fontSize="small" />}>
                  <span className="font-medium">Modo de solo lectura.</span> Solo puedes ver este negocio porque no está asignado a ti.
                </Alert>
              </div>
            )}

            {error && (
              <div className="mx-6 mt-4">
                <Alert variant="error" icon={<ErrorOutlineIcon fontSize="small" />}>
                  {error}
                </Alert>
              </div>
            )}

            {(loadingData || dynamicForm.loading) ? (
              <FormModalSkeleton sections={3} fieldsPerSection={3} />
            ) : (
              <div className="p-3 space-y-3">
                {/* Reference Info Bar (special section - not from form config) */}
                <ReferenceInfoBar>
                  <ReferenceInfoBar.CreatedDateItem entity={business} />
                  <ReferenceInfoBar.TextItem
                    label="Vendor ID"
                    value={allFormValues.osAdminVendorId || ''}
                    placeholder="OS Admin ID"
                    readOnly
                  />
                  <ReferenceInfoBar.UserSelectItem
                    label="Propietario"
                    userId={ownerId}
                    users={users}
                    isAdmin={isAdmin}
                    onChange={setOwnerId}
                    placeholder="Seleccionar propietario..."
                  />
                  <ReferenceInfoBar.TeamSelectItem
                    label="Equipo"
                    team={salesTeam}
                    onChange={setSalesTeam}
                    placeholder="Seleccionar equipo..."
                  />
                  {/* Focus Period - only show for existing businesses */}
                  {business && (
                    <ReferenceInfoBar.Item
                      icon={<CenterFocusStrongIcon style={{ fontSize: 14 }} className={focusInfo.isActive ? 'text-amber-500' : 'text-gray-400'} />}
                      label="Foco"
                    >
                      <button
                        type="button"
                        onClick={() => setFocusModalOpen(true)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                          focusInfo.isActive
                            ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {focusInfo.isActive ? focusInfo.label : 'Sin foco'}
                      </button>
                    </ReferenceInfoBar.Item>
                  )}
                </ReferenceInfoBar>

                {/* Dynamic Sections from Form Config */}
                {dynamicForm.initialized && dynamicForm.sections.map((section) => {
                  // Collapse sections with many fields (10+) by default for better UX
                  const visibleFieldCount = section.fields.filter(f => f.isVisible).length
                  const shouldCollapse = section.isCollapsed || visibleFieldCount >= 10
                  return (
                  <DynamicFormSection
                    key={section.id}
                    section={section}
                    values={allFormValues}
                    onChange={dynamicForm.setValue}
                    disabled={loading || !canEdit}
                    categories={categoryOptions}
                    users={userOptions}
                    categoryDisplayMode="parentOnly"
                    fieldOverrides={canEdit ? fieldOverrides : undefined}
                    fieldAddons={canEdit ? fieldAddons : undefined}
                      defaultExpanded={!shouldCollapse}
                    collapsible={true}
                  />
                  )
                })}

                {/* Fallback if form config not initialized */}
                {!dynamicForm.initialized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-medium">Configuración del formulario no inicializada</p>
                    <p className="text-xs mt-1">Vaya a Configuración → Constructor de Formularios para inicializar la configuración del formulario de negocio.</p>
                  </div>
                )}

                {/* Opportunities Section (lazy loaded - only for existing businesses) */}
                {business && (
                  <Suspense fallback={<SectionLoadingFallback />}>
                    <OpportunitiesSection
                      opportunities={opportunities}
                      onEditOpportunity={handleEditOpportunity}
                      onCreateNew={handleCreateNewOpportunity}
                      businessName={business.name}
                    />
                  </Suspense>
                )}

                {/* Requests Section (lazy loaded - only for existing businesses) */}
                {business && (
                  <Suspense fallback={<SectionLoadingFallback />}>
                    <RequestsSection
                      requests={requests}
                      onViewRequest={handleViewRequest}
                      onCreateRequest={handleCreateRequest}
                      businessName={business.name}
                    />
                  </Suspense>
                )}
              </div>
            )}
      </form>
    </ModalShell>

    {/* Lazy-loaded modals - only rendered when open */}
    {opportunityModalOpen && (
      <Suspense fallback={null}>
        <OpportunityFormModal
          isOpen={opportunityModalOpen}
          onClose={() => {
            setOpportunityModalOpen(false)
            setSelectedOpportunity(null)
            setCreatedBusiness(null)
          }}
          opportunity={selectedOpportunity}
          onSuccess={handleOpportunitySuccess}
          initialBusinessId={selectedOpportunity?.businessId || createdBusiness?.id || business?.id}
          preloadedBusinesses={[
            ...(business ? [business] : []),
            ...(createdBusiness && createdBusiness.id !== business?.id ? [createdBusiness] : []),
          ].filter(Boolean)}
          preloadedCategories={categories}
          preloadedUsers={users}
        />
      </Suspense>
    )}

    {requestViewModalOpen && (
      <Suspense fallback={null}>
        <BookingRequestViewModal
          isOpen={requestViewModalOpen}
          onClose={() => {
            setRequestViewModalOpen(false)
            setSelectedRequestId(null)
          }}
          requestId={selectedRequestId}
          hideBackdrop={true}
        />
      </Suspense>
    )}

    {/* Focus Period Modal */}
    {focusModalOpen && business && (
      <Suspense fallback={null}>
        <FocusPeriodModal
          isOpen={focusModalOpen}
          onClose={() => setFocusModalOpen(false)}
          businessId={business.id}
          businessName={business.name}
          currentFocusPeriod={currentFocusPeriod}
          currentFocusSetAt={currentFocusSetAt}
          onSuccess={(updatedFocus) => {
            // Update local state for immediate UI feedback
            setLocalFocusPeriod(updatedFocus)
            setLocalFocusSetAt(updatedFocus ? new Date() : null)
            setFocusModalOpen(false)
          }}
        />
      </Suspense>
    )}

    {/* Pre-confirmation dialog for vendor creation - z-80 to be above ModalShell (z-70) */}
    <ConfirmDialog
      isOpen={vendorConfirmDialog.isOpen}
      title={vendorConfirmDialog.options.title}
      message={vendorConfirmDialog.options.message}
      confirmText={vendorConfirmDialog.options.confirmText}
      cancelText={vendorConfirmDialog.options.cancelText}
      confirmVariant={vendorConfirmDialog.options.confirmVariant}
      onConfirm={vendorConfirmDialog.handleConfirm}
      onCancel={vendorConfirmDialog.handleCancel}
      zIndex={80}
    />
    
    {/* Vendor API result dialog - z-80 to be above ModalShell (z-70) */}
    <ConfirmDialog
      isOpen={vendorResultDialog.isOpen}
      title={vendorResultDialog.options.title}
      message={vendorResultDialog.options.message}
      confirmText={vendorResultDialog.options.confirmText}
      cancelText={vendorResultDialog.options.cancelText}
      confirmVariant={vendorResultDialog.options.confirmVariant}
      onConfirm={vendorResultDialog.handleConfirm}
      onCancel={vendorResultDialog.handleCancel}
      zIndex={80}
    />

    {/* Sync confirmation dialog - z-80 to be above ModalShell (z-70) */}
    <ConfirmDialog
      isOpen={syncConfirmDialog.isOpen}
      title={syncConfirmDialog.options.title}
      message={syncConfirmDialog.options.message}
      confirmText={syncConfirmDialog.options.confirmText}
      cancelText={syncConfirmDialog.options.cancelText}
      confirmVariant={syncConfirmDialog.options.confirmVariant}
      onConfirm={syncConfirmDialog.handleConfirm}
      onCancel={syncConfirmDialog.handleCancel}
      zIndex={80}
    />

    {/* Sync result dialog - z-80 to be above ModalShell (z-70) */}
    <ConfirmDialog
      isOpen={syncResultDialog.isOpen}
      title={syncResultDialog.options.title}
      message={syncResultDialog.options.message}
      confirmText={syncResultDialog.options.confirmText}
      cancelText={syncResultDialog.options.cancelText}
      confirmVariant={syncResultDialog.options.confirmVariant}
      onConfirm={syncResultDialog.handleConfirm}
      onCancel={syncResultDialog.handleCancel}
      zIndex={80}
    />
  </>
  )
}

