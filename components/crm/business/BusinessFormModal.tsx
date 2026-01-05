'use client'

import { useEffect, useState, useMemo, useCallback, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createBusiness, updateBusiness, createOpportunity } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Business, Opportunity, BookingRequest } from '@/types'
import type { Category } from '@prisma/client'

// User data type matching what's passed from shared context
type UserData = {
  id: string
  clerkId: string
  name: string | null
  email: string | null
  role: string
}
import toast from 'react-hot-toast'

// Action state types for React 19 useActionState
type FormActionState = {
  success: boolean
  error: string | null
}
import CloseIcon from '@mui/icons-material/Close'
import BusinessIcon from '@mui/icons-material/Business'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import OpportunityFormModal from '../opportunity/OpportunityFormModal'
import BookingRequestViewModal from '@/components/booking/request-view/BookingRequestViewModal'
import { useBusinessForm } from './useBusinessForm'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import OpportunitiesSection from './OpportunitiesSection'
import RequestsSection from './RequestsSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import { Button, Alert } from '@/components/ui'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

interface BusinessFormModalProps {
  isOpen: boolean
  onClose: () => void
  business?: Business | null
  onSuccess: (business: Business) => void
  // Pre-loaded data to skip fetching (passed from parent page)
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
}

export default function BusinessFormModal({ 
  isOpen, 
  onClose, 
  business, 
  onSuccess,
  preloadedCategories,
  preloadedUsers,
}: BusinessFormModalProps) {
  type CreateResult = {
    success: boolean
    data?: Business
    error?: string
    existingBusiness?: Business
  }
  const router = useRouter()
  const { user } = useUser()
  const { isAdmin } = useUserRole()
  const [error, setError] = useState('')
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [requestViewModalOpen, setRequestViewModalOpen] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  // Track unlocked state for fields with canEditAfterCreation
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({})

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
      province: business.province || null,
      district: business.district || null,
      corregimiento: business.corregimiento || null,
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
    }
  }, [business])

  // Dynamic form hook
  const dynamicForm = useDynamicForm({
    entityType: 'business',
    entityId: business?.id,
    initialValues,
  })

  // React 19: useActionState for save/update business action
  const [saveState, saveAction, isSavePending] = useActionState<FormActionState, FormData>(
    async (_prevState, formData) => {
      try {
        const result: CreateResult = business
          ? await updateBusiness(business.id, formData)
          : await createBusiness(formData)

        if (result.success && result.data) {
          // Save custom field values
          const customFieldResult = await dynamicForm.saveCustomFields(result.data.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          onSuccess(result.data)
          onClose()
          return { success: true, error: null }
        } else {
          const existing = result.existingBusiness as (Business & { owner?: { name: string | null; email: string | null } }) | undefined
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

        const opportunityFormData = new FormData()
        opportunityFormData.append('businessId', businessResult.data.id)
        opportunityFormData.append('stage', 'iniciacion')
        opportunityFormData.append('startDate', new Date().toISOString().split('T')[0])

        const opportunityResult = await createOpportunity(opportunityFormData)

        if (opportunityResult.success && businessResult.data && opportunityResult.data) {
          sessionStorage.setItem('openOpportunityId', opportunityResult.data.id)
          onClose()
          router.push('/opportunities')
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
    setSelectedOpportunity(opportunity)
    setOpportunityModalOpen(true)
  }

  function handleCreateNewOpportunity() {
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
    if (business.province) params.set('province', business.province)
    if (business.district) params.set('district', business.district)
    if (business.corregimiento) params.set('corregimiento', business.corregimiento)
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
    if (business) {
      await loadFormData()
      onSuccess(business)
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
    if (allValues.province) formData.append('province', allValues.province)
    if (allValues.district) formData.append('district', allValues.district)
    if (allValues.corregimiento) formData.append('corregimiento', allValues.corregimiento)
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

    return formData
  }

  // React 19: Handler that triggers the save action
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(() => {
      const formData = buildFormData()
      saveAction(formData)
    })
  }

  // React 19: Handler that triggers the create business & opportunity action
  function handleCreateBusinessAndOpportunity(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(() => {
      const formData = buildFormData()
      createWithOppAction(formData)
    })
  }

  const isEditMode = !!business

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

  // Memoize all values separately to avoid recalculating on every render
  const allFormValues = useMemo(() => {
    return { ...dynamicForm.values, ...dynamicForm.customFieldValues }
  }, [dynamicForm.values, dynamicForm.customFieldValues])

  // Build field overrides and addons based on form configuration
  // Fields with canEditAfterCreation=true are locked after first save (only admin can unlock)
  // Business name is ALWAYS locked after creation (hardcoded requirement)
  const fieldOverrides: Record<string, { canEdit?: boolean }> = useMemo(() => {
    const overrides: Record<string, { canEdit?: boolean }> = {}
    
    // Business name is always locked after creation (hardcoded requirement)
    const lockedFieldKeys = new Set<string>(['name'])
    
    // Add fields from form config that have canEditAfterCreation enabled
    if (dynamicForm.initialized) {
      for (const section of dynamicForm.sections) {
        for (const field of section.fields) {
          if (field.canEditAfterCreation) {
            lockedFieldKeys.add(field.fieldKey)
          }
        }
      }
    }
    
    // Apply lock logic to all locked fields
    for (const fieldKey of lockedFieldKeys) {
      const currentValue = allFormValues[fieldKey]
      const hasValue = currentValue && currentValue.trim() !== ''
      
      // In edit mode with a value: locked by default for EVERYONE (including admin)
      // Admin must explicitly click unlock to edit
      // In create mode or empty field: anyone can edit
      if (isEditMode && hasValue) {
        // Only allow edit if admin AND explicitly unlocked
        const canEdit = isAdmin && unlockedFields[fieldKey] === true
        overrides[fieldKey] = { canEdit }
      } else {
        // Creating new or field is empty - anyone can edit
        overrides[fieldKey] = { canEdit: true }
      }
    }
    
    return overrides
  }, [dynamicForm.initialized, dynamicForm.sections, isEditMode, isAdmin, unlockedFields, allFormValues])

  // Field addons (lock icons for fields with canEditAfterCreation in edit mode for admin)
  // Business name always shows lock icon for admin in edit mode
  const fieldAddons: Record<string, React.ReactElement> = useMemo(() => {
    const addons: Record<string, React.ReactElement> = {}
    
    if (!isEditMode || !isAdmin) return addons
    
    // Business name is always locked after creation (hardcoded requirement)
    const lockedFieldKeys = new Set<string>(['name'])
    
    // Add fields from form config that have canEditAfterCreation enabled
    if (dynamicForm.initialized) {
      for (const section of dynamicForm.sections) {
        for (const field of section.fields) {
          if (field.canEditAfterCreation) {
            lockedFieldKeys.add(field.fieldKey)
          }
        }
      }
    }
    
    // Create lock icons for all locked fields that have values
    for (const fieldKey of lockedFieldKeys) {
      const currentValue = allFormValues[fieldKey]
      const hasValue = currentValue && currentValue.trim() !== ''
      
      // Only show lock icon if field has a value (i.e., has been filled before)
      if (hasValue) {
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
  }, [isEditMode, isAdmin, dynamicForm.initialized, dynamicForm.sections, unlockedFields, allFormValues, toggleFieldUnlock])

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
          submitLabel="Guardar"
          submitLoading={loading || loadingData || dynamicForm.loading}
          submitDisabled={loading || loadingData || dynamicForm.loading}
          leftContent="* Campos requeridos"
          additionalActions={
            !business ? (
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
      <form id="modal-form" onSubmit={handleSubmit} className="bg-gray-50 h-full flex flex-col">
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
              <div className="p-4 space-y-4">
                {/* Reference Info Bar (special section - not from form config) */}
                <ReferenceInfoBar>
                  <ReferenceInfoBar.CreatedDateItem entity={business} />
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
                </ReferenceInfoBar>

                {/* Dynamic Sections from Form Config */}
                {dynamicForm.initialized && dynamicForm.sections.map(section => (
                  <DynamicFormSection
                    key={section.id}
                    section={section}
                    values={allFormValues}
                    onChange={dynamicForm.setValue}
                    disabled={loading}
                    categories={categoryOptions}
                    users={userOptions}
                    fieldOverrides={fieldOverrides}
                    fieldAddons={fieldAddons}
                    defaultExpanded={!section.isCollapsed}
                    collapsible={true}
                  />
                ))}

                {/* Fallback if form config not initialized */}
                {!dynamicForm.initialized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-medium">Configuración del formulario no inicializada</p>
                    <p className="text-xs mt-1">Vaya a Configuración → Constructor de Formularios para inicializar la configuración del formulario de negocio.</p>
                  </div>
                )}

                {/* Opportunities Section (special section - not from form config) */}
                {business && (
                  <OpportunitiesSection
                    opportunities={opportunities}
                    onEditOpportunity={handleEditOpportunity}
                    onCreateNew={handleCreateNewOpportunity}
                    businessName={business.name}
                  />
                )}

                {/* Requests Section (special section - not from form config) */}
                {business && (
                  <RequestsSection
                    requests={requests}
                    onViewRequest={handleViewRequest}
                    onCreateRequest={handleCreateRequest}
                    businessName={business.name}
                  />
                )}
              </div>
            )}
      </form>
    </ModalShell>

    {/* Opportunity Modal */}
    <OpportunityFormModal
      isOpen={opportunityModalOpen}
      onClose={() => {
        setOpportunityModalOpen(false)
        setSelectedOpportunity(null)
      }}
      opportunity={selectedOpportunity}
      onSuccess={handleOpportunitySuccess}
      initialBusinessId={business?.id}
      preloadedBusinesses={business ? [business] : undefined}
      preloadedCategories={categories}
      preloadedUsers={users}
    />

    {/* Request View Modal */}
    <BookingRequestViewModal
      isOpen={requestViewModalOpen}
      onClose={() => {
        setRequestViewModalOpen(false)
        setSelectedRequestId(null)
      }}
      requestId={selectedRequestId}
      hideBackdrop={true}
    />
  </>
  )
}
