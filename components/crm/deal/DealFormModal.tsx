'use client'

import { useState, useMemo, useTransition } from 'react'
import { updateDealResponsible, updateDealStatus } from '@/app/actions/deals'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Deal } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Button } from '@/components/ui'
import { BookingRequestViewModal } from '@/components/booking/request-view'
import { useDealForm } from './useDealForm'
import DealStatusPipeline from './DealStatusPipeline'
import ResponsibleUserSection from './ResponsibleUserSection'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import BookingRequestSection from './BookingRequestSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

interface DealFormModalProps {
  isOpen: boolean
  onClose: () => void
  deal: Deal | null
  onSuccess: () => void
}

export default function DealFormModal({
  isOpen,
  onClose,
  deal,
  onSuccess,
}: DealFormModalProps) {
  const { isAdmin, isSales } = useUserRole()
  const [error, setError] = useState('')
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)

  // React 19: useTransition for non-blocking UI during form actions
  const [isSubmitPending, startSubmitTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  
  // Combined loading states for UI
  const loading = isSubmitPending
  const savingStatus = isStatusPending

  const {
    responsibleId,
    setResponsibleId,
    ereResponsibleId,
    setEreResponsibleId,
    status,
    setStatus,
    users,
    editorUsers,
    ereUsers,
    loadingData,
  } = useDealForm({
    isOpen,
    deal,
    isAdmin,
  })

  // Build initial values from deal entity
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!deal) return {}
    return {
      bookingRequestId: deal.bookingRequestId || null,
      status: deal.status || null,
      responsibleId: deal.responsibleId || null,
      ereResponsibleId: deal.ereResponsibleId || null,
    }
  }, [deal])

  // Dynamic form hook for custom fields
  const dynamicForm = useDynamicForm({
    entityType: 'deal',
    entityId: deal?.id,
    initialValues,
  })

  // React 19: Status change handler using useTransition
  function handleStatusChange(newStatus: string) {
    if (!deal || !isAdmin || savingStatus) return
    
    const previousStatus = status
    setStatus(newStatus)
    setError('')
    
    startStatusTransition(async () => {
      try {
        const result = await updateDealStatus(deal.id, newStatus)
        if (result.success) {
          onSuccess()
        } else {
          setError(result.error || 'Error al actualizar el estado de la oferta')
          setStatus(previousStatus)
        }
      } catch (err) {
        setError('Ocurrió un error al actualizar el estado')
        setStatus(previousStatus)
      }
    })
  }

  // React 19: Form submit handler using useTransition
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!isAdmin) {
      return
    }
    
    if (!deal) {
      setError('Oferta no encontrada')
      return
    }
    
    setError('')

    startSubmitTransition(async () => {
      try {
        // Update both responsibles and status
        const [responsibleResult, statusResult] = await Promise.all([
          updateDealResponsible(deal.id, responsibleId || null, ereResponsibleId || null),
          updateDealStatus(deal.id, status),
        ])

        if (responsibleResult.success && statusResult.success) {
          // Save custom field values
          const customFieldResult = await dynamicForm.saveCustomFields(deal.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          onSuccess()
          onClose()
        } else {
          setError(responsibleResult.error || statusResult.error || 'Error al actualizar la oferta')
        }
      } catch (err) {
        setError('Ocurrió un error')
      }
    })
  }

  if (!isOpen) return null

  // Prepare users for dynamic fields
  const userOptions = users.map(user => ({
    clerkId: user.clerkId,
    name: user.name,
    email: user.email,
  }))

  // Filter sections to only show custom fields sections (deal built-in fields are handled specially)
  const customFieldsSections = dynamicForm.sections.filter(section => 
    section.fields.some(f => f.fieldSource === 'custom')
  )

  return (
    <>
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={deal?.bookingRequest?.name || 'Detalles de la Oferta'}
      subtitle="Oferta"
      icon={<DescriptionIcon fontSize="medium" />}
      iconColor="green"
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel={isAdmin ? 'Cancelar' : 'Cerrar'}
          submitLabel="Guardar"
          submitLoading={loading || loadingData || dynamicForm.loading}
          submitDisabled={loading || loadingData || dynamicForm.loading || !isAdmin}
          leftContent={isAdmin ? 'Asignar un usuario responsable para esta oferta' : isSales ? 'Modo solo lectura - Puede ver ofertas de sus oportunidades' : 'Modo solo lectura'}
        />
      }
    >

      <form id="modal-form" onSubmit={handleSubmit} className="bg-gray-50 h-full flex flex-col">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {(loadingData || dynamicForm.loading) ? (
            <FormModalSkeleton sections={2} fieldsPerSection={2} />
          ) : (
            <div className="p-4 space-y-4">
              {/* Opportunity Responsible Reference */}
              {deal?.opportunityResponsible && (
                <ReferenceInfoBar>
                  <ReferenceInfoBar.UserDisplayItem
                    label="Representante de Ventas"
                    user={deal.opportunityResponsible}
                  />
                </ReferenceInfoBar>
              )}

              {/* Deal Status Pipeline */}
              <DealStatusPipeline
                status={status}
                onStatusChange={handleStatusChange}
                isAdmin={isAdmin}
                saving={savingStatus}
              />

              {/* Responsible User Section */}
              <ResponsibleUserSection
                responsibleId={responsibleId}
                onResponsibleChange={setResponsibleId}
                ereResponsibleId={ereResponsibleId}
                onEreResponsibleChange={setEreResponsibleId}
                editorUsers={editorUsers}
                ereUsers={ereUsers}
                isAdmin={isAdmin}
              />

              {/* Booking Request Section */}
              {deal && (
                <BookingRequestSection
                  deal={deal}
                  onViewRequest={() => setBookingRequestModalOpen(true)}
                />
              )}

              {/* Dynamic Custom Fields Sections */}
              {dynamicForm.initialized && customFieldsSections.map(section => (
                <DynamicFormSection
                  key={section.id}
                  section={{
                    ...section,
                    fields: section.fields.filter(f => f.fieldSource === 'custom'),
                  }}
                  values={dynamicForm.getAllValues()}
                  onChange={dynamicForm.setValue}
                  disabled={loading || !isAdmin}
                  users={userOptions}
                  defaultExpanded={!section.isCollapsed}
                  collapsible={true}
                />
              ))}
            </div>
          )}

      </form>
    </ModalShell>

      {/* Booking Request Modal */}
      {deal && (
        <BookingRequestViewModal
          isOpen={bookingRequestModalOpen}
          onClose={() => setBookingRequestModalOpen(false)}
          requestId={deal.bookingRequestId}
        />
      )}
    </>
  )
}
