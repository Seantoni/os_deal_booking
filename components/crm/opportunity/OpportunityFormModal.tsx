'use client'

import { useState, useMemo, useEffect, useTransition, lazy, Suspense, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createOpportunity, updateOpportunity } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import { useCachedFormConfig } from '@/hooks/useFormConfigCache'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import type { Opportunity, Business, UserData } from '@/types'
import type { Category } from '@prisma/client'
import HandshakeIcon from '@mui/icons-material/Handshake'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useOpportunityForm } from './useOpportunityForm'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import {
  OpportunityActivitySkeleton,
  OpportunityChatSkeleton,
} from './OpportunityModalSkeleton'
import OpportunityModalHeader from './OpportunityModalHeader'
import OpportunityTabNav, { type OpportunityTab } from './OpportunityTabNav'
import { buildOpportunityFormData } from './opportunityFormPayload'
import { useActivityDictation } from './useActivityDictation'
import { useOpportunityStageManager } from './useOpportunityStageManager'
import { useOpportunityMeetingAutomation } from './useOpportunityMeetingAutomation'
import { useOpportunityTaskActions } from './useOpportunityTaskActions'
import { useOpportunityActivitySummary } from './useOpportunityActivitySummary'
import type { OpportunityModalSuccessMeta } from './opportunityModalTypes'

const BookingRequestViewModal = lazy(() => import('@/components/booking/request-view/BookingRequestViewModal'))
const TaskModal = lazy(() => import('./TaskModal'))
const LostReasonModal = lazy(() => import('./LostReasonModal'))
const ConfirmDialog = lazy(() => import('@/components/common/ConfirmDialog'))
const BusinessFormModal = lazy(() => import('@/components/crm/business/BusinessFormModal'))
const OpportunityDetailsTab = lazy(() => import('./OpportunityDetailsTab'))
const OpportunityActivityTab = lazy(() => import('./OpportunityActivityTab'))
const OpportunityChatTab = lazy(() => import('./OpportunityChatTab'))
const OpportunityHistoryTab = lazy(() => import('./OpportunityHistoryTab'))
const OpportunityActivityDictationDialogs = lazy(() => import('./OpportunityActivityDictationDialogs'))

function TabLoadingFallback() {
  return (
    <div className="p-6 flex items-center justify-center">
      <div className="animate-pulse flex items-center gap-2 text-gray-400">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  )
}

interface OpportunityFormModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity?: Opportunity | null
  onSuccess: (opportunity: Opportunity, meta?: OpportunityModalSuccessMeta) => void
  initialBusinessId?: string
  initialTab?: OpportunityTab
  preloadedBusinesses?: Business[]
  preloadedCategories?: Category[]
  preloadedUsers?: UserData[]
}

export default function OpportunityFormModal({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
  initialBusinessId,
  initialTab = 'details',
  preloadedBusinesses,
  preloadedCategories,
  preloadedUsers,
}: OpportunityFormModalProps) {
  const router = useRouter()
  const { user } = useUser()
  const { isAdmin } = useUserRole()
  const confirmDialog = useConfirmDialog()

  const [activeTab, setActiveTab] = useState<OpportunityTab>(initialTab)
  const [error, setError] = useState('')
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [isSubmitPending, startSubmitTransition] = useTransition()

  const { sections: cachedSections, initialized: cachedInitialized } = useCachedFormConfig('opportunity')

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  const {
    businessId,
    setBusinessId,
    stage,
    setStage,
    responsibleId,
    setResponsibleId,
    businesses,
    categories,
    users,
    tasks,
    setTasks,
    linkedBusiness,
    setLinkedBusiness,
    linkedBookingRequest,
    linkedBusinessProjection,
    linkedBookingRequestProjection,
    loadingData,
  } = useOpportunityForm({
    isOpen,
    opportunity,
    initialBusinessId,
    isAdmin,
    currentUserId: user?.id,
    preloadedBusinesses,
    preloadedCategories,
    preloadedUsers,
  })

  const stageRef = useRef<string>(stage)
  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  const initialValues = useMemo((): Record<string, string | null> => {
    if (!opportunity) {
      const preloadedBusiness = initialBusinessId && preloadedBusinesses
        ? preloadedBusinesses.find((b) => b.id === initialBusinessId)
        : null

      return {
        businessId: initialBusinessId || null,
        startDate: getTodayInPanama(),
        categoryId: preloadedBusiness?.category?.parentCategory || null,
        tier: preloadedBusiness?.tier?.toString() || null,
        contactName: preloadedBusiness?.contactName || null,
        contactPhone: preloadedBusiness?.contactPhone || null,
        contactEmail: preloadedBusiness?.contactEmail || null,
      }
    }

    const business = opportunity.business
    return {
      businessId: opportunity.businessId || null,
      startDate: opportunity.startDate ? formatDateForPanama(new Date(opportunity.startDate)) : null,
      closeDate: opportunity.closeDate ? formatDateForPanama(new Date(opportunity.closeDate)) : null,
      notes: opportunity.notes || null,
      categoryId: opportunity.categoryId || business?.category?.parentCategory || null,
      tier: opportunity.tier?.toString() || business?.tier?.toString() || null,
      contactName: opportunity.contactName || business?.contactName || null,
      contactPhone: opportunity.contactPhone || business?.contactPhone || null,
      contactEmail: opportunity.contactEmail || business?.contactEmail || null,
    }
  }, [opportunity, initialBusinessId, preloadedBusinesses])

  const dynamicForm = useDynamicForm({
    entityType: 'opportunity',
    entityId: opportunity?.id,
    initialValues,
    preloadedSections: cachedSections.length > 0 ? cachedSections : undefined,
    preloadedInitialized: cachedInitialized,
  })

  useEffect(() => {
    if (businessId && dynamicForm.getValue('businessId') !== businessId) {
      dynamicForm.setValue('businessId', businessId)

      const allKnownBusinesses = [...(businesses || []), ...(preloadedBusinesses || [])]
      const selected = allKnownBusinesses.find((b) => b.id === businessId)
      if (selected) {
        if (selected.category?.parentCategory) {
          dynamicForm.setValue('categoryId', selected.category.parentCategory)
        }
        if (selected.tier) {
          dynamicForm.setValue('tier', selected.tier.toString())
        }
        if (selected.contactName) {
          dynamicForm.setValue('contactName', selected.contactName)
        }
        if (selected.contactPhone) {
          dynamicForm.setValue('contactPhone', selected.contactPhone)
        }
        if (selected.contactEmail) {
          dynamicForm.setValue('contactEmail', selected.contactEmail)
        }
      }
    }
  }, [businessId, businesses, preloadedBusinesses, dynamicForm])

  const activitySummary = useOpportunityActivitySummary(tasks)

  const handleCreateRequest = useCallback(() => {
    if (!linkedBusiness || !opportunity) {
      setError('No se puede crear la solicitud porque falta la empresa vinculada')
      return
    }

    const params = new URLSearchParams()
    params.set('fromOpportunity', opportunity.id)
    params.set('businessId', linkedBusiness.id)
    params.set('businessName', linkedBusiness.name || '')
    if (linkedBusiness.contactEmail) params.set('businessEmail', linkedBusiness.contactEmail)
    if (linkedBusiness.contactName) params.set('contactName', linkedBusiness.contactName)
    if (linkedBusiness.contactPhone) params.set('contactPhone', linkedBusiness.contactPhone)

    if (linkedBusiness.category) {
      if (linkedBusiness.category.parentCategory) params.set('parentCategory', linkedBusiness.category.parentCategory)
      if (linkedBusiness.category.subCategory1) params.set('subCategory1', linkedBusiness.category.subCategory1)
      if (linkedBusiness.category.subCategory2) params.set('subCategory2', linkedBusiness.category.subCategory2)
    }

    if (linkedBusiness.razonSocial) params.set('legalName', linkedBusiness.razonSocial)
    if (linkedBusiness.ruc) params.set('ruc', linkedBusiness.ruc)

    if (linkedBusiness.provinceDistrictCorregimiento) params.set('provinceDistrictCorregimiento', linkedBusiness.provinceDistrictCorregimiento)
    if (linkedBusiness.address) params.set('address', linkedBusiness.address)
    if (linkedBusiness.neighborhood) params.set('neighborhood', linkedBusiness.neighborhood)

    if (linkedBusiness.bank) params.set('bank', linkedBusiness.bank)
    if (linkedBusiness.beneficiaryName) params.set('bankAccountName', linkedBusiness.beneficiaryName)
    if (linkedBusiness.accountNumber) params.set('accountNumber', linkedBusiness.accountNumber)
    if (linkedBusiness.accountType) params.set('accountType', linkedBusiness.accountType)
    if (linkedBusiness.paymentPlan) params.set('paymentPlan', linkedBusiness.paymentPlan)

    if (linkedBusiness.website) params.set('website', linkedBusiness.website)
    if (linkedBusiness.instagram) params.set('instagram', linkedBusiness.instagram)

    onClose()
    router.push(`/booking-requests/new?${params.toString()}`)
  }, [linkedBusiness, onClose, opportunity, router])

  const stageManager = useOpportunityStageManager({
    opportunity,
    stage,
    setStage,
    businessId,
    responsibleId,
    getFormValues: dynamicForm.getAllValues,
    onSuccess,
    setError,
  })

  const meetingAutomation = useOpportunityMeetingAutomation({
    opportunity,
    confirmDialog,
    setTasks,
    setError,
    handleStageChange: stageManager.handleStageChange,
    onCreateRequest: handleCreateRequest,
  })

  const taskActions = useOpportunityTaskActions({
    opportunity,
    stage,
    stageRef,
    tasks,
    setTasks,
    setError,
    confirmDialog,
    onLog: meetingAutomation.logMeetingAutomation,
    evaluateShouldRunMeetingAutomation: meetingAutomation.evaluateShouldRunMeetingAutomation,
    queueMeetingCompletionPipelineAutomation: meetingAutomation.queueMeetingCompletionPipelineAutomation,
  })

  const activityDictation = useActivityDictation({
    onResult: (fields) => {
      setError('')
      taskActions.openTaskModal()
      taskActions.setTaskPrefill(fields)
    },
  })

  const categoryOptions = useMemo(() => categories.map((cat) => ({
    id: cat.id,
    categoryKey: cat.categoryKey,
    parentCategory: cat.parentCategory,
    subCategory1: cat.subCategory1,
    subCategory2: cat.subCategory2,
    subCategory3: cat.subCategory3,
    subCategory4: cat.subCategory4,
  })), [categories])

  const userOptions = useMemo(() => users.map((u) => ({
    clerkId: u.clerkId,
    name: u.name,
    email: u.email,
  })), [users])

  const allBusinesses = useMemo(() => {
    const combined = [...(businesses || []), ...(preloadedBusinesses || [])]
    return combined.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i)
  }, [businesses, preloadedBusinesses])

  const startDateDisplayValue = dynamicForm.getValue('startDate') || opportunity?.startDate || null
  const closeDateDisplayValue = dynamicForm.getValue('closeDate') || opportunity?.closeDate || null

  if (!isOpen) return null

  const isEditMode = !!opportunity
  const canEdit = isAdmin || !opportunity || opportunity.responsibleId === user?.id || opportunity.userId === user?.id
  const isViewOnly = !canEdit
  const loading = isSubmitPending || taskActions.isTaskPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!responsibleId || responsibleId === '__unassigned__') {
      setError('Debe seleccionar un responsable para la oportunidad')
      return
    }

    startSubmitTransition(async () => {
      try {
        const formData = buildOpportunityFormData({
          values: dynamicForm.getAllValues(),
          fallbackBusinessId: businessId,
          stage,
          responsibleId,
          responsibleMode: 'always',
        })

        const result = opportunity
          ? await updateOpportunity(opportunity.id, formData)
          : await createOpportunity(formData)

        if (result.success && result.data) {
          const customFieldResult = await dynamicForm.saveCustomFields(result.data.id)
          if (!customFieldResult.success) {
            console.warn('Failed to save custom fields:', customFieldResult.error)
          }
          onSuccess(result.data, { source: 'submit' })
          onClose()
        } else {
          setError(result.error || 'Error al guardar la oportunidad')
        }
      } catch {
        setError('An error occurred')
      }
    })
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
  }

  function handleViewLinkedRequest() {
    if (!linkedBookingRequest) return
    setBookingRequestModalOpen(true)
  }

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={opportunity ? (opportunity.business?.name || 'Editar Oportunidad') : (linkedBusiness?.name || 'Nueva Oportunidad')}
        subtitle="Oportunidad"
        icon={<HandshakeIcon fontSize="medium" />}
        iconColor="orange"
        footer={
          activeTab === 'details' ? (
            <ModalFooter
              onCancel={onClose}
              submitLabel={isViewOnly ? undefined : 'Guardar'}
              submitLoading={loading || loadingData || dynamicForm.loading}
              submitDisabled={isViewOnly || loading || loadingData || dynamicForm.loading || !responsibleId || responsibleId === '__unassigned__'}
              leftContent={isViewOnly ? 'Solo lectura - No tiene permisos para editar' : '* Campos requeridos'}
              formId={isViewOnly ? undefined : 'opportunity-modal-form'}
            />
          ) : (
            <ModalFooter
              onCancel={onClose}
              leftContent={activeTab === 'activity' && isViewOnly ? 'Solo lectura - No tiene permisos para editar' : undefined}
            />
          )
        }
      >
        <OpportunityModalHeader
          loadingData={loadingData}
          stage={stage}
          savingStage={stageManager.savingStage}
          onStageChange={stageManager.handleStageChange}
          activitySummary={activitySummary}
          opportunity={opportunity}
          users={users}
          responsibleId={responsibleId}
          isAdmin={isAdmin}
          isViewOnly={isViewOnly}
          onResponsibleChange={setResponsibleId}
          startDateDisplayValue={startDateDisplayValue}
          closeDateDisplayValue={closeDateDisplayValue}
          linkedBusiness={linkedBusiness}
          onCreateRequest={handleCreateRequest}
        />

        <OpportunityTabNav activeTab={activeTab} onChange={setActiveTab} />

        <form id="opportunity-modal-form" onSubmit={handleSubmit} className="bg-white min-h-[300px] md:min-h-[500px] flex flex-col">
          {error && (
            <div className="mx-3 md:mx-6 mt-3 md:mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {activeTab === 'details' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <OpportunityDetailsTab
                isLoading={loadingData || dynamicForm.loading}
                loading={loading}
                isViewOnly={isViewOnly}
                dynamicForm={dynamicForm}
                categoryOptions={categoryOptions}
                userOptions={userOptions}
                allBusinesses={allBusinesses}
                isEditMode={isEditMode}
                opportunity={opportunity}
                stage={stage}
                linkedBusiness={linkedBusiness}
                linkedBusinessProjection={linkedBusinessProjection}
                linkedBookingRequest={linkedBookingRequest}
                linkedBookingRequestProjection={linkedBookingRequestProjection}
                onEditBusiness={handleEditBusiness}
                onViewLinkedRequest={handleViewLinkedRequest}
                onOpenLostReasonEditor={stageManager.openLostReasonEditor}
              />
            </Suspense>
          )}

          {!loadingData && activeTab === 'activity' && (
            <Suspense fallback={<OpportunityActivitySkeleton />}>
              <OpportunityActivityTab
                opportunity={opportunity}
                tasks={tasks}
                isAdmin={isAdmin}
                isViewOnly={isViewOnly}
                isDictating={activityDictation.state === 'recording' || activityDictation.state === 'processing'}
                onAddTask={() => taskActions.openTaskModal()}
                onDictateTask={() => activityDictation.toggle()}
                onEditTask={(task) => taskActions.openTaskModal(task)}
                onDeleteTask={taskActions.handleDeleteTask}
                onToggleComplete={taskActions.handleToggleTaskComplete}
              />
            </Suspense>
          )}

          {!loadingData && activeTab === 'chat' && (
            <Suspense fallback={<OpportunityChatSkeleton />}>
              <OpportunityChatTab
                opportunity={opportunity}
                canEdit={canEdit}
              />
            </Suspense>
          )}

          {!loadingData && activeTab === 'history' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <OpportunityHistoryTab opportunity={opportunity} />
            </Suspense>
          )}
        </form>
      </ModalShell>

      {taskActions.taskModalOpen && (
        <Suspense fallback={null}>
          <TaskModal
            isOpen={taskActions.taskModalOpen}
            onClose={taskActions.closeTaskModal}
            task={taskActions.selectedTask}
            onSubmit={taskActions.handleTaskSubmit}
            loading={loading}
            error={error}
            businessName={linkedBusiness?.name || opportunity?.business?.name || ''}
            forCompletion={!!taskActions.completingTaskId}
            responsibleName={opportunity?.responsible?.name || opportunity?.responsible?.email}
            prefillData={taskActions.taskPrefill}
          />
        </Suspense>
      )}

      {bookingRequestModalOpen && (
        <Suspense fallback={null}>
          <BookingRequestViewModal
            isOpen={bookingRequestModalOpen}
            onClose={() => setBookingRequestModalOpen(false)}
            requestId={linkedBookingRequest?.id || null}
          />
        </Suspense>
      )}

      {stageManager.lostReasonModalOpen && (
        <Suspense fallback={null}>
          <LostReasonModal
            isOpen={stageManager.lostReasonModalOpen}
            onClose={stageManager.handleLostReasonCancel}
            onConfirm={stageManager.handleLostReasonConfirm}
            currentReason={opportunity?.lostReason || null}
            loading={stageManager.savingStage}
          />
        </Suspense>
      )}

      {businessModalOpen && selectedBusiness && (
        <Suspense fallback={null}>
          <BusinessFormModal
            isOpen={businessModalOpen}
            onClose={() => {
              setBusinessModalOpen(false)
              setSelectedBusiness(null)
            }}
            business={selectedBusiness}
            onSuccess={(updatedBusiness) => {
              setLinkedBusiness(updatedBusiness)
              setSelectedBusiness(updatedBusiness)
              setBusinessModalOpen(false)
              setSelectedBusiness(null)
            }}
            canEdit={!isViewOnly}
          />
        </Suspense>
      )}

      {confirmDialog.isOpen && (
        <Suspense fallback={null}>
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title={confirmDialog.options.title}
            message={confirmDialog.options.message}
            confirmText={confirmDialog.options.confirmText}
            cancelText={confirmDialog.options.cancelText}
            confirmVariant={confirmDialog.options.confirmVariant}
            onConfirm={confirmDialog.handleConfirm}
            onCancel={confirmDialog.handleCancel}
            zIndex={80}
          />
        </Suspense>
      )}

      {(activityDictation.dialog.isOpen || activityDictation.missingDialog.isOpen) && (
        <Suspense fallback={null}>
          <OpportunityActivityDictationDialogs activityDictation={activityDictation} />
        </Suspense>
      )}
    </>
  )
}
