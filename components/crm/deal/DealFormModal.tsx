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
import OpportunityResponsibleReference from './OpportunityResponsibleReference'
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
          setError(result.error || 'Failed to update deal status')
          setStatus(previousStatus)
        }
      } catch (err) {
        setError('An error occurred while updating status')
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
      setError('Deal not found')
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
          setError(responsibleResult.error || statusResult.error || 'Failed to update deal')
        }
      } catch (err) {
        setError('An error occurred')
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
      {/* Light backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity"
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
              <div className="p-2 bg-green-100 rounded-lg border border-green-200">
                <DescriptionIcon className="text-green-600" fontSize="medium" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Deal</p>
                <h2 className="text-xl font-bold text-gray-900">
                  {deal?.bookingRequest?.name || 'Deal Details'}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <CloseIcon fontSize="medium" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-gray-50">
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
              {deal && (
                <OpportunityResponsibleReference deal={deal} />
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

          {/* Footer */}
          <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-between items-center sticky bottom-0">
            <div className="text-xs text-gray-500">
              {isAdmin ? 'Assign a responsible user for this deal' : isSales ? 'View-only mode - You can view deals from your opportunities' : 'View-only mode'}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
              >
                {isAdmin ? 'Cancel' : 'Close'}
              </Button>
              {isAdmin && (
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
