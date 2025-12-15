'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createBusiness, updateBusiness, createOpportunity } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Business, Opportunity } from '@/types'
import toast from 'react-hot-toast'
import CloseIcon from '@mui/icons-material/Close'
import BusinessIcon from '@mui/icons-material/Business'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import OpportunityFormModal from '../opportunity/OpportunityFormModal'
import { useBusinessForm } from './useBusinessForm'
import ReferenceInfoBar from './ReferenceInfoBar'
import OpportunitiesSection from './OpportunitiesSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import { Button, Alert } from '@/components/ui'

interface BusinessFormModalProps {
  isOpen: boolean
  onClose: () => void
  business?: Business | null
  onSuccess: (business: Business) => void
  // Pre-loaded data to skip fetching (passed from parent page)
  preloadedCategories?: any[]
  preloadedUsers?: any[]
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
    existingBusiness?: any
  }
  const router = useRouter()
  const { user } = useUser()
  const { isAdmin } = useUserRole()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [nameUnlocked, setNameUnlocked] = useState(false)

  // Load supporting data using existing hook
  const {
    ownerId,
    setOwnerId,
    salesTeam,
    setSalesTeam,
    categories,
    users,
    opportunities,
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

  // Clear stale errors and reset name lock whenever the modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setError('')
      setNameUnlocked(false)
    }
  }, [isOpen])

  function handleEditOpportunity(opportunity: Opportunity) {
    setSelectedOpportunity(opportunity)
    setOpportunityModalOpen(true)
  }

  function handleCreateNewOpportunity() {
    setSelectedOpportunity(null)
    setOpportunityModalOpen(true)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = buildFormData()

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
      } else {
        const existing = result.existingBusiness as Business | undefined
        if (existing) {
          setError(`Business already exists: ${existing.name}`)
        } else {
          setError(result.error || 'Failed to save business')
        }
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateBusinessAndOpportunity(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const allValues = dynamicForm.getAllValues()
      
      if (!allValues.name || !allValues.contactName || !allValues.contactPhone || !allValues.contactEmail) {
        setError('Please fill in all required fields')
        setLoading(false)
        return
      }

      const formData = buildFormData()
      const businessResult: CreateResult = await createBusiness(formData)

      if (!businessResult.success || !businessResult.data) {
        const existing = businessResult.existingBusiness as Business | undefined
        if (existing) {
          setError(`Business already exists: ${existing.name}`)
        } else {
          setError(businessResult.error || 'Failed to create business')
        }
        setLoading(false)
        return
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
        return
      } else {
        setError('Business created but failed to create opportunity: ' + (opportunityResult.error || 'Unknown error'))
      }
    } catch (err) {
      setError('An error occurred: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isEditMode = !!business
  // Name is editable when creating new business (by anyone)
  // Once saved (edit mode), only admin can edit by first unlocking
  const canEditName = !isEditMode || (isAdmin && nameUnlocked)

  // Prepare categories and users for dynamic fields
  const categoryOptions = categories.map(cat => ({
    id: cat.id,
    categoryKey: cat.categoryKey,
    parentCategory: cat.parentCategory,
    subCategory1: cat.subCategory1,
    subCategory2: cat.subCategory2,
    subCategory3: cat.subCategory3,
    subCategory4: cat.subCategory4,
  }))

  const userOptions = users.map(user => ({
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
  }))

  // Field overrides for special logic
  const fieldOverrides: Record<string, { canEdit?: boolean }> = {
    name: { canEdit: canEditName },
  }

  // Field addons (lock icon for name field in edit mode for admin)
  const fieldAddons: Record<string, React.ReactElement> = {}
  if (isEditMode && isAdmin) {
    fieldAddons.name = (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => setNameUnlocked(!nameUnlocked)}
          className={`p-2 rounded-md transition-colors ${
            nameUnlocked
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={nameUnlocked ? 'Bloqueado habilitado - click para bloquear' : 'Click para desbloquear edición'}
        >
          {nameUnlocked ? (
            <LockOpenIcon fontSize="small" />
          ) : (
            <LockIcon fontSize="small" />
          )}
        </button>
        {nameUnlocked && (
          <p className="text-[10px] text-red-600 font-medium max-w-[120px] leading-tight">
            Solo modificar si es necesario
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Light backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className={`fixed z-50 ${
        isEditMode 
          ? 'inset-y-0 right-0 h-full w-full max-w-2xl pointer-events-none' 
          : 'inset-0 flex items-center justify-center p-4 pointer-events-none'
      }`}>
        {/* Modal Panel */}
        <div className={`${
          isEditMode
            ? `h-full w-full bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`
            : `w-full max-w-2xl bg-white shadow-2xl rounded-xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`
        }`}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                  <BusinessIcon className="text-blue-600" fontSize="medium" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Business</p>
                  <h2 className="text-xl font-bold text-gray-900">
                    {business ? (business.name || 'Edit Business') : 'New Business'}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {business && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/businesses/${business.id}`)}
                    leftIcon={<OpenInNewIcon fontSize="small" />}
                  >
                    Open page
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="p-2"
                >
                  <CloseIcon fontSize="medium" />
                </Button>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-gray-50">
            {error && (
              <div className="mx-6 mt-4">
                <Alert variant="error" icon={<ErrorOutlineIcon fontSize="small" />}>
                  {error}
                </Alert>
              </div>
            )}

            {(loadingData || dynamicForm.loading) ? (
              <div className="p-4 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                    </div>
                    <div className="p-3 space-y-2.5">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center gap-3">
                          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                          <div className="flex-1 h-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Reference Info Bar (special section - not from form config) */}
                <ReferenceInfoBar
                  business={business}
                  ownerId={ownerId}
                  onOwnerChange={setOwnerId}
                  salesTeam={salesTeam}
                  onSalesTeamChange={setSalesTeam}
                  users={users}
                  isAdmin={isAdmin}
                />

                {/* Dynamic Sections from Form Config */}
                {dynamicForm.initialized && dynamicForm.sections.map(section => (
                  <DynamicFormSection
                    key={section.id}
                    section={section}
                    values={dynamicForm.getAllValues()}
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
                    <p className="font-medium">Form configuration not initialized</p>
                    <p className="text-xs mt-1">Go to Settings → Form Builder to initialize the business form configuration.</p>
                  </div>
                )}

                {/* Opportunities Section (special section - not from form config) */}
                {business && (
                  <OpportunitiesSection
                    opportunities={opportunities}
                    onEditOpportunity={handleEditOpportunity}
                    onCreateNew={handleCreateNewOpportunity}
                  />
                )}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-between items-center sticky bottom-0">
              <div className="text-xs text-gray-500">
                * Required fields
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                >
                  Cancel
                </Button>
                {!business && (
                  <Button
                    type="button"
                    onClick={handleCreateBusinessAndOpportunity}
                    disabled={loading || loadingData || dynamicForm.loading}
                    loading={loading}
                    className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300"
                  >
                    Create Business & Opp
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || loadingData || dynamicForm.loading}
                  loading={loading}
                >
                  Save
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

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
    </>
  )
}
