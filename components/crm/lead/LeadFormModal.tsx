'use client'

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react'
import { createLead, updateLead, updateLeadStage, getLeadResponsibleUsers } from '@/app/actions/leads'
import { getCategories } from '@/app/actions/categories'
import { LEAD_STAGE_LABELS, LEAD_STAGE_COLORS } from '@/lib/constants'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Lead, LeadStage, CategoryRecord } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import BusinessIcon from '@mui/icons-material/Business'
import { logger } from '@/lib/logger'
import { Button, Select, Alert } from '@/components/ui'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

interface LeadFormModalProps {
  isOpen: boolean
  onClose: () => void
  lead?: Lead | null
  onSuccess: (lead: Lead) => void
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
  const [categories, setCategories] = useState<CategoryRecord[]>([])
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
      setError('Por favor complete todos los campos requeridos')
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
          setError(result.error || 'Error al guardar el lead')
        }
      } catch (err) {
        setError('Ocurrió un error')
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
        setError('Por favor complete todos los campos requeridos antes de convertir')
        return
      }
      if (!responsibleId) {
        setError('Por favor asigne un usuario responsable antes de convertir')
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
          setError(result.error || 'Error al actualizar la etapa')
        }
      } catch (err) {
        setError('Ocurrió un error')
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? (lead.name || 'Editar Lead') : 'Nuevo Lead'}
      subtitle="Lead"
      icon={<PersonAddIcon fontSize="medium" />}
      iconColor="orange"
      footer={
        !isConverted ? (
          <ModalFooter
            onCancel={onClose}
            submitLabel="Guardar"
            submitLoading={loading || loadingData || dynamicForm.loading}
            submitDisabled={loading || loadingData || dynamicForm.loading}
            leftContent="* Campos requeridos"
          />
        ) : (
          <ModalFooter
            onCancel={onClose}
            leftContent="* Campos requeridos"
          />
        )
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
                {/* Stage and Responsible Bar */}
                {isEditMode && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap">
                    {/* Stage Badge & Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Etapa:</span>
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
                        <span className="text-gray-600">Convertido a Negocio</span>
                      </div>
                    )}

                    {/* Responsible Selector */}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-medium text-gray-500">Responsable:</span>
                      <Select
                        value={responsibleId || ''}
                        onChange={(e) => setResponsibleId(e.target.value || null)}
                        disabled={loading || isConverted}
                        placeholder="Sin asignar"
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
                    <p className="font-medium">Configuración del formulario no inicializada</p>
                    <p className="text-xs mt-1">Vaya a Configuración → Constructor de Formularios para inicializar la configuración del formulario de lead.</p>
                  </div>
                )}

                {/* Assignment section for new leads (admin only) */}
                {!isEditMode && isAdmin && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Asignación</h3>
                    </div>
                    <div className="p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                      <Select
                        value={responsibleId || ''}
                        onChange={(e) => setResponsibleId(e.target.value || null)}
                        disabled={loading}
                        placeholder="Sin asignar"
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

      </form>
    </ModalShell>
    </>
  )
}
