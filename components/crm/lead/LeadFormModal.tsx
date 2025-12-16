'use client'

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react'
import { createLead, updateLead, updateLeadStage, getLeadResponsibleUsers } from '@/app/actions/leads'
import { getCategories } from '@/app/actions/categories'
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS } from '@/lib/constants'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Lead, LeadStage } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import BusinessIcon from '@mui/icons-material/Business'
import { logger } from '@/lib/logger'
import { Button, Select, Alert } from '@/components/ui'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

interface LeadFormModalProps {
  isOpen: boolean
  onClose: () => void
  lead?: Lead | null
  onSuccess: (lead: Lead) => void
}

interface CategoryOption {
  id: string
  categoryKey: string
  parentCategory: string
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

interface ResponsibleUser {
  clerkId: string
  name: string | null
  email: string | null
  role: string
}

export default function LeadFormModal({ isOpen, onClose, lead, onSuccess }: LeadFormModalProps) {
  const { isAdmin } = useUserRole()
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  
  // React 19: useTransition for non-blocking UI during form actions
  const [isSubmitPending, startSubmitTransition] = useTransition()
  const [isStagePending, startStageTransition] = useTransition()
  
  // Combined loading state for UI
  const loading = isSubmitPending || isStagePending
  
  // Special fields not part of dynamic form
  const [responsibleId, setResponsibleId] = useState<string | null>(null)
  const [stage, setStage] = useState<LeadStage>('por_asignar')
  
  // Reference data
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [users, setUsers] = useState<ResponsibleUser[]>([])

  // Build initial values from lead entity
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!lead) return {}
    return {
      name: lead.name || null,
      contactName: lead.contactName || null,
      contactPhone: lead.contactPhone || null,
      contactEmail: lead.contactEmail || null,
      categoryId: lead.categoryId || null,
      website: lead.website || null,
      instagram: lead.instagram || null,
      description: lead.description || null,
      source: lead.source || null,
      notes: lead.notes || null,
    }
  }, [lead])

  // Dynamic form hook
  const dynamicForm = useDynamicForm({
    entityType: 'lead',
    entityId: lead?.id,
    initialValues,
  })

  const loadFormData = useCallback(async () => {
    setLoadingData(true)
    try {
      const [categoriesResult, usersResult] = await Promise.all([
        getCategories(),
        getLeadResponsibleUsers(),
      ])

      if (categoriesResult.success && categoriesResult.data) {
        setCategories(categoriesResult.data)
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data)
      }

      // Load lead specific data (stage, responsible)
      if (lead) {
        setResponsibleId(lead.responsibleId || null)
        setStage(lead.stage as LeadStage)
      } else {
        setResponsibleId(null)
        setStage('por_asignar')
      }
    } catch (error) {
      logger.error('Failed to load form data:', error)
    } finally {
      setLoadingData(false)
    }
  }, [lead])

  useEffect(() => {
    if (isOpen) {
      loadFormData()
    }
  }, [isOpen, loadFormData])

  // React 19: Form submit handler using useTransition
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const allValues = dynamicForm.getAllValues()
    
    // Validate required fields and extract validated values
    const name = allValues.name
    const contactName = allValues.contactName
    const contactPhone = allValues.contactPhone
    const contactEmail = allValues.contactEmail
    
    if (!name || !contactName || !contactPhone || !contactEmail) {
      setError('Please fill in all required fields')
      return
    }

    // Build data object with guaranteed non-null required fields
    const data = {
      name,
      contactName,
      contactPhone,
      contactEmail,
      categoryId: allValues.categoryId || null,
      responsibleId: responsibleId || null,
      website: allValues.website || null,
      instagram: allValues.instagram || null,
      description: allValues.description || null,
      source: allValues.source || null,
      notes: allValues.notes || null,
    }

    startSubmitTransition(async () => {
      try {
        const result = lead
          ? await updateLead(lead.id, data)
          : await createLead(data)

        if (result.success && result.data) {
          // Save custom field values
          const customFieldResult = await dynamicForm.saveCustomFields(result.data.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          onSuccess(result.data as Lead)
          onClose()
        } else {
          setError(result.error || 'Failed to save lead')
        }
      } catch (err) {
        setError('An error occurred')
      }
    })
  }

  // React 19: Stage change handler using useTransition
  function handleStageChange(newStage: LeadStage) {
    if (!lead) return

    setError('')
    
    const allValues = dynamicForm.getAllValues()
    
    // If moving to 'asignado', validate required fields and responsible
    if (newStage === 'asignado' && lead.stage === 'por_asignar') {
      if (!allValues.name || !allValues.contactName || !allValues.contactPhone || !allValues.contactEmail) {
        setError('Please fill in all required fields before converting')
        return
      }
      if (!responsibleId) {
        setError('Please assign a responsible user before converting')
        return
      }
    }

    startStageTransition(async () => {
      try {
        const result = await updateLeadStage(lead.id, newStage, responsibleId)

        if (result.success && result.data) {
          if ('business' in result.data && result.data.business) {
            onSuccess(result.data.lead as Lead)
          } else {
            onSuccess(result.data as Lead)
          }
          setStage(newStage)
        } else {
          setError(result.error || 'Failed to update stage')
        }
      } catch (err) {
        setError('An error occurred')
      }
    })
  }

  if (!isOpen) return null

  const isEditMode = !!lead
  const isConverted = lead?.stage === 'convertido'

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

  return (
    <>
      {/* Light backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/20 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        {/* Modal Panel */}
        <div className={`w-full max-w-4xl bg-white shadow-2xl rounded-2xl flex flex-col max-h-[90vh] pointer-events-auto transform transition-all duration-300 overflow-hidden ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg border border-orange-200">
                  <PersonAddIcon className="text-orange-600" fontSize="medium" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Lead</p>
                  <h2 className="text-xl font-bold text-gray-900">
                    {lead ? (lead.name || 'Edit Lead') : 'New Lead'}
                  </h2>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                className="p-2"
              >
                <CloseIcon fontSize="medium" />
              </Button>
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
              <FormModalSkeleton sections={3} fieldsPerSection={3} />
            ) : (
              <div className="p-4 space-y-4">
                {/* Stage and Responsible Bar */}
                {isEditMode && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
                    {/* Stage Badge & Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Stage:</span>
                      {isConverted ? (
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${LEAD_STAGE_COLORS[stage]}`}>
                          {LEAD_STAGE_LABELS[stage]}
                        </span>
                      ) : (
                        <Select
                          value={stage}
                          onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                          disabled={loading || isConverted}
                          options={Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => ({
                            value,
                            label,
                          }))}
                          size="sm"
                          fullWidth={false}
                          className="min-w-[150px]"
                        />
                      )}
                    </div>

                    {/* Converted Business Link */}
                    {lead?.businessId && (
                      <div className="flex items-center gap-2 text-sm">
                        <BusinessIcon fontSize="small" className="text-green-600" />
                        <span className="text-gray-600">Converted to Business</span>
                      </div>
                    )}

                    {/* Responsible Selector */}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-medium text-gray-500">Responsible:</span>
                      <Select
                        value={responsibleId || ''}
                        onChange={(e) => setResponsibleId(e.target.value || null)}
                        disabled={loading || isConverted}
                        placeholder="Unassigned"
                        options={users.map((user) => ({
                          value: user.clerkId,
                          label: user.name || user.email || 'Unknown',
                        }))}
                        size="sm"
                        fullWidth={false}
                        className="min-w-[150px]"
                      />
                    </div>
                  </div>
                )}

                {/* Dynamic Sections from Form Config */}
                {dynamicForm.initialized && dynamicForm.sections.map(section => (
                  <DynamicFormSection
                    key={section.id}
                    section={section}
                    values={dynamicForm.getAllValues()}
                    onChange={dynamicForm.setValue}
                    disabled={loading || isConverted}
                    categories={categoryOptions}
                    users={userOptions}
                    defaultExpanded={!section.isCollapsed}
                    collapsible={true}
                  />
                ))}

                {/* Fallback if form config not initialized */}
                {!dynamicForm.initialized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-medium">Form configuration not initialized</p>
                    <p className="text-xs mt-1">Go to Settings → Form Builder to initialize the lead form configuration.</p>
                  </div>
                )}

                {/* Assignment section for new leads (admin only) */}
                {!isEditMode && isAdmin && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Assignment</h3>
                    </div>
                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsible</label>
                      <Select
                        value={responsibleId || ''}
                        onChange={(e) => setResponsibleId(e.target.value || null)}
                        disabled={loading}
                        placeholder="Unassigned"
                        options={users.map((user) => ({
                          value: user.clerkId,
                          label: user.name || user.email || 'Unknown',
                        }))}
                        size="sm"
                      />
                    </div>
                  </div>
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
                {!isConverted && (
                  <Button
                    type="submit"
                    disabled={loading || loadingData || dynamicForm.loading}
                    loading={loading}
                  >
                    Save
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
