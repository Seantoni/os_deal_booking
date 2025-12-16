'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { createOpportunity, updateOpportunity, createTask, updateTask, deleteTask } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import type { Opportunity, OpportunityStage, Task, Business } from '@/types'
import CloseIcon from '@mui/icons-material/Close'
import HandshakeIcon from '@mui/icons-material/Handshake'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EventIcon from '@mui/icons-material/Event'
import { Button } from '@/components/ui'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import BusinessFormModal from '../business/BusinessFormModal'
import { BookingRequestViewModal } from '@/components/booking/request-view'
import NewRequestModal from '@/components/booking/NewRequestModal'
import { useOpportunityForm } from './useOpportunityForm'
import OpportunityPipeline from './OpportunityPipeline'
import ReferenceInfoBar from './ReferenceInfoBar'
import WonStageBanner from './WonStageBanner'
import LinkedBusinessSection from './LinkedBusinessSection'
import TaskManager from './TaskManager'
import TaskModal from './TaskModal'
import LostReasonModal from './LostReasonModal'
import LostReasonSection from './LostReasonSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import FormModalSkeleton from '@/components/common/FormModalSkeleton'

interface OpportunityFormModalProps {
  isOpen: boolean
  onClose: () => void
  opportunity?: Opportunity | null
  onSuccess: (opportunity: Opportunity) => void
  initialBusinessId?: string
  // Pre-loaded data to skip fetching (passed from parent page)
  preloadedBusinesses?: any[]
  preloadedCategories?: any[]
  preloadedUsers?: any[]
}

export default function OpportunityFormModal({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
  initialBusinessId,
  preloadedBusinesses,
  preloadedCategories,
  preloadedUsers,
}: OpportunityFormModalProps) {
  const { user } = useUser()
  const { isAdmin } = useUserRole()
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details')
  const [loading, setLoading] = useState(false)
  const [savingStage, setSavingStage] = useState(false)
  const [error, setError] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [newRequestQueryParams, setNewRequestQueryParams] = useState<Record<string, string>>({})
  const [lostReasonModalOpen, setLostReasonModalOpen] = useState(false)
  const [pendingLostStage, setPendingLostStage] = useState<OpportunityStage | null>(null)

  const confirmDialog = useConfirmDialog()

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
    loadingData,
    loadFormData,
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

  // Build initial values from opportunity entity
  // Note: categoryId, tier, contactName, contactPhone, contactEmail come from the linked business
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!opportunity) {
      // For new opportunities, look up business data from preloaded businesses
      const preloadedBusiness = initialBusinessId && preloadedBusinesses
        ? preloadedBusinesses.find((b: any) => b.id === initialBusinessId)
        : null
      
      return {
        businessId: initialBusinessId || null,
        startDate: new Date().toISOString().split('T')[0],
        // Include business data if available
        categoryId: preloadedBusiness?.categoryId || null,
        tier: preloadedBusiness?.tier?.toString() || null,
        contactName: preloadedBusiness?.contactName || null,
        contactPhone: preloadedBusiness?.contactPhone || null,
        contactEmail: preloadedBusiness?.contactEmail || null,
      }
    }
    const business = opportunity.business
    return {
      businessId: opportunity.businessId || null,
      startDate: opportunity.startDate ? new Date(opportunity.startDate).toISOString().split('T')[0] : null,
      closeDate: opportunity.closeDate ? new Date(opportunity.closeDate).toISOString().split('T')[0] : null,
      notes: opportunity.notes || null,
      // These come from the linked business
      categoryId: business?.categoryId || null,
      tier: business?.tier?.toString() || null,
      contactName: business?.contactName || null,
      contactPhone: business?.contactPhone || null,
      contactEmail: business?.contactEmail || null,
    }
  }, [opportunity, initialBusinessId, preloadedBusinesses])

  // Dynamic form hook
  const dynamicForm = useDynamicForm({
    entityType: 'opportunity',
    entityId: opportunity?.id,
    initialValues,
  })

  // Sync businessId from useOpportunityForm to dynamicForm when it changes
  // This handles the case where businessId is set from useOpportunityForm
  useEffect(() => {
    if (businessId && dynamicForm.getValue('businessId') !== businessId) {
      dynamicForm.setValue('businessId', businessId)
      
      // Also sync category and other business fields when business changes
      // Check both loaded businesses and preloaded businesses
      const allBusinesses = [...(businesses || []), ...(preloadedBusinesses || [])]
      const selectedBusiness = allBusinesses.find((b: any) => b.id === businessId)
      if (selectedBusiness) {
        if (selectedBusiness.categoryId) {
          dynamicForm.setValue('categoryId', selectedBusiness.categoryId)
        }
        if (selectedBusiness.tier) {
          dynamicForm.setValue('tier', selectedBusiness.tier.toString())
        }
        if (selectedBusiness.contactName) {
          dynamicForm.setValue('contactName', selectedBusiness.contactName)
        }
        if (selectedBusiness.contactPhone) {
          dynamicForm.setValue('contactPhone', selectedBusiness.contactPhone)
        }
        if (selectedBusiness.contactEmail) {
          dynamicForm.setValue('contactEmail', selectedBusiness.contactEmail)
        }
      }
    }
  }, [businessId, businesses, preloadedBusinesses, dynamicForm])

  // Auto-save when stage changes (only for existing opportunities)
  async function handleStageChange(newStage: OpportunityStage) {
    if (!opportunity) {
      setStage(newStage)
      return
    }

    if (savingStage) return

    if (newStage === 'lost' && stage !== 'lost') {
      setPendingLostStage(newStage)
      setLostReasonModalOpen(true)
      return
    }
    
    if (newStage === 'lost' && stage === 'lost') {
      setPendingLostStage(newStage)
      setLostReasonModalOpen(true)
      return
    }

    await saveStageChange(newStage)
  }

  async function saveStageChange(newStage: OpportunityStage, lostReason?: string) {
    if (!opportunity || savingStage) return

    const previousStage = stage
    setStage(newStage)
    setSavingStage(true)
    setError('')

    try {
      const allValues = dynamicForm.getAllValues()
      const formData = new FormData()
      formData.append('businessId', allValues.businessId || businessId)
      formData.append('stage', newStage)
      formData.append('startDate', allValues.startDate || '')
      if (allValues.closeDate) formData.append('closeDate', allValues.closeDate)
      if (allValues.notes) formData.append('notes', allValues.notes)
      // For existing opportunities, only admin can change responsible
      // For new opportunities, always send the responsible (defaults to creator)
      if (responsibleId) formData.append('responsibleId', responsibleId)
      if (allValues.categoryId) formData.append('categoryId', allValues.categoryId)
      if (allValues.tier) formData.append('tier', allValues.tier)
      if (allValues.contactName) formData.append('contactName', allValues.contactName)
      if (allValues.contactPhone) formData.append('contactPhone', allValues.contactPhone)
      if (allValues.contactEmail) formData.append('contactEmail', allValues.contactEmail)
      if (lostReason) formData.append('lostReason', lostReason)

      const result = await updateOpportunity(opportunity.id, formData)
      if (result.success && result.data) {
        onSuccess(result.data)
      } else {
        setError(result.error || 'Failed to update stage')
        setStage(previousStage)
      }
    } catch (err) {
      setError('An error occurred while updating stage')
      setStage(previousStage)
    } finally {
      setSavingStage(false)
    }
  }

  async function handleLostReasonConfirm(reason: string) {
    if (!pendingLostStage) return
    
    setLostReasonModalOpen(false)
    await saveStageChange(pendingLostStage, reason)
    setPendingLostStage(null)
  }

  function handleLostReasonCancel() {
    setLostReasonModalOpen(false)
    setPendingLostStage(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const allValues = dynamicForm.getAllValues()
      const formData = new FormData()
      formData.append('businessId', allValues.businessId || businessId)
      formData.append('stage', stage)
      formData.append('startDate', allValues.startDate || '')
      if (allValues.closeDate) formData.append('closeDate', allValues.closeDate)
      if (allValues.notes) formData.append('notes', allValues.notes)
      // For existing opportunities, only admin can change responsible
      // For new opportunities, always send the responsible (defaults to creator)
      if (responsibleId) formData.append('responsibleId', responsibleId)
      if (allValues.categoryId) formData.append('categoryId', allValues.categoryId)
      if (allValues.tier) formData.append('tier', allValues.tier)
      if (allValues.contactName) formData.append('contactName', allValues.contactName)
      if (allValues.contactPhone) formData.append('contactPhone', allValues.contactPhone)
      if (allValues.contactEmail) formData.append('contactEmail', allValues.contactEmail)

      const result = opportunity
        ? await updateOpportunity(opportunity.id, formData)
        : await createOpportunity(formData)

      if (result.success && result.data) {
        // Save custom field values
        const customFieldResult = await dynamicForm.saveCustomFields(result.data.id)
        if (!customFieldResult.success) {
          console.warn('Failed to save custom fields:', customFieldResult.error)
        }
        onSuccess(result.data)
        onClose()
      } else {
        setError(result.error || 'Failed to save opportunity')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleTaskSubmit(data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }) {
    if (!opportunity) {
      setError('Please save the opportunity first before adding tasks')
      return
    }

    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('opportunityId', opportunity.id)
      formData.append('category', data.category)
      formData.append('title', data.title)
      formData.append('date', data.date)
      if (data.notes) formData.append('notes', data.notes)

      const newTask: Task = {
        id: selectedTask?.id || 'temp-' + Date.now(),
        opportunityId: opportunity.id,
        category: data.category,
        title: data.title,
        date: new Date(data.date),
        completed: false,
        notes: data.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      if (selectedTask) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? newTask : t))
      } else {
        setTasks(prev => [...prev, newTask])
      }

      const result = selectedTask
        ? await updateTask(selectedTask.id, formData)
        : await createTask(formData)

      if (result.success && result.data) {
        if (selectedTask) {
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? result.data : t))
        } else {
          setTasks(prev => prev.map(t => t.id === newTask.id ? result.data : t))
        }
        setTaskModalOpen(false)
        setSelectedTask(null)
      } else {
        if (selectedTask) {
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t))
        } else {
          setTasks(prev => prev.filter(t => t.id !== newTask.id))
        }
        setError(result.error || 'Failed to save task')
      }
    } catch (err) {
      if (selectedTask) {
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t))
      } else {
        setTasks(prev => prev.filter(t => !t.id.startsWith('temp-')))
      }
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTask(taskId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    setLoading(true)
    
    const taskToDelete = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))

    try {
      const result = await deleteTask(taskId)
      if (!result.success) {
        if (taskToDelete) {
          setTasks(prev => [...prev, taskToDelete].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ))
        }
        setError(result.error || 'Failed to delete task')
      }
    } catch (err) {
      if (taskToDelete) {
        setTasks(prev => [...prev, taskToDelete].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        ))
      }
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleTaskComplete(task: Task) {
    const updatedTask = { ...task, completed: !task.completed }
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t))

    try {
      const formData = new FormData()
      formData.append('category', task.category)
      formData.append('title', task.title)
      formData.append('date', new Date(task.date).toISOString().split('T')[0])
      formData.append('completed', (!task.completed).toString())
      formData.append('notes', task.notes || '')

      const result = await updateTask(task.id, formData)
      if (result.success && result.data) {
        setTasks(prev => prev.map(t => t.id === task.id ? result.data : t))
      } else {
        setTasks(prev => prev.map(t => t.id === task.id ? task : t))
      }
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
    }
  }

  function openTaskModal(task?: Task) {
    setSelectedTask(task || null)
    setTaskModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
  }

  async function handleBusinessSuccess(business: Business) {
    setLinkedBusiness(business)
    if (opportunity) {
      await loadFormData(true)
    }
  }

  function handleCreateRequest() {
    if (!linkedBusiness || !opportunity) return

    const params: Record<string, string> = {}
    params.fromOpportunity = opportunity.id
    params.businessName = linkedBusiness.name
    params.businessEmail = linkedBusiness.contactEmail
    params.contactName = linkedBusiness.contactName
    params.contactPhone = linkedBusiness.contactPhone
    if (linkedBusiness.category) {
      params.categoryId = linkedBusiness.category.id
      params.parentCategory = linkedBusiness.category.parentCategory
      if (linkedBusiness.category.subCategory1) {
        params.subCategory1 = linkedBusiness.category.subCategory1
      }
      if (linkedBusiness.category.subCategory2) {
        params.subCategory2 = linkedBusiness.category.subCategory2
      }
    }
    if (linkedBusiness.razonSocial) params.legalName = linkedBusiness.razonSocial
    if (linkedBusiness.ruc) params.ruc = linkedBusiness.ruc
    if (linkedBusiness.province) params.province = linkedBusiness.province
    if (linkedBusiness.district) params.district = linkedBusiness.district
    if (linkedBusiness.corregimiento) params.corregimiento = linkedBusiness.corregimiento
    if (linkedBusiness.bank) params.bank = linkedBusiness.bank
    if (linkedBusiness.beneficiaryName) params.bankAccountName = linkedBusiness.beneficiaryName
    if (linkedBusiness.accountNumber) params.accountNumber = linkedBusiness.accountNumber
    if (linkedBusiness.accountType) params.accountType = linkedBusiness.accountType
    if (linkedBusiness.paymentPlan) params.paymentPlan = linkedBusiness.paymentPlan
    if (linkedBusiness.address) params.address = linkedBusiness.address
    if (linkedBusiness.neighborhood) params.neighborhood = linkedBusiness.neighborhood
    if (linkedBusiness.description) params.description = linkedBusiness.description
    if (linkedBusiness.website) params.website = linkedBusiness.website
    if (linkedBusiness.instagram) params.instagram = linkedBusiness.instagram
    if (linkedBusiness.emailPaymentContacts) {
      const paymentEmails = linkedBusiness.emailPaymentContacts.split(/[;,\\s]+/).filter(Boolean)
      if (paymentEmails.length > 0) {
        params.paymentEmails = JSON.stringify(paymentEmails)
      }
    }
    setNewRequestQueryParams(params)
    setShowNewRequestModal(true)
  }

  if (!isOpen) return null

  const isEditMode = !!opportunity

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
                  <HandshakeIcon className="text-orange-600" fontSize="medium" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Opportunity</p>
                  <h2 className="text-xl font-bold text-gray-900">
                    {opportunity ? (opportunity.business?.name || 'Edit Opportunity') : 'New Opportunity'}
                  </h2>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                aria-label="Close"
              >
                <CloseIcon fontSize="medium" />
              </Button>
            </div>
          </div>

          {/* Sales Path (Pipeline) */}
          {!loadingData && (
            <OpportunityPipeline stage={stage} onStageChange={handleStageChange} saving={savingStage} />
          )}

          {/* Reference Info Bar */}
          {!loadingData && (
            <ReferenceInfoBar
              opportunity={opportunity}
              responsibleId={responsibleId}
              onResponsibleChange={setResponsibleId}
              users={users}
              isAdmin={isAdmin}
              startDate={dynamicForm.getValue('startDate')}
              closeDate={dynamicForm.getValue('closeDate')}
              nextActivityDate={dynamicForm.getValue('nextActivityDate')}
            />
          )}

          {/* WON Stage Banner */}
          {!loadingData && stage === 'won' && linkedBusiness && (
            <WonStageBanner
              opportunity={opportunity}
              business={linkedBusiness}
              hasRequest={!!opportunity?.hasRequest}
              onCreateRequest={handleCreateRequest}
            />
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'details'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'activity'
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Activity
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
              <FormModalSkeleton sections={3} fieldsPerSection={3} />
            ) : activeTab === 'details' ? (
              <div className="p-4 space-y-4">
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
                    businesses={businesses}
                    defaultExpanded={!section.isCollapsed}
                    collapsible={true}
                    isEditMode={isEditMode}
                  />
                ))}

                {/* Fallback if form config not initialized */}
                {!dynamicForm.initialized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-medium">Form configuration not initialized</p>
                    <p className="text-xs mt-1">Go to Settings → Form Builder to initialize the opportunity form configuration.</p>
                  </div>
                )}

                {/* Lost Reason Section - Show when opportunity is lost */}
                {opportunity && stage === 'lost' && opportunity.lostReason && (
                  <LostReasonSection
                    lostReason={opportunity.lostReason}
                    onEdit={() => {
                      setPendingLostStage('lost')
                      setLostReasonModalOpen(true)
                    }}
                  />
                )}

                {opportunity && linkedBusiness && (
                  <LinkedBusinessSection
                    business={linkedBusiness}
                    onEdit={handleEditBusiness}
                  />
                )}
              </div>
            ) : null}

            {!loadingData && activeTab === 'activity' && (
              <div className="p-6">
                {!opportunity ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <EventIcon className="text-gray-300 mx-auto mb-3" style={{ fontSize: 48 }} />
                    <p className="text-sm text-gray-500 mb-2">Save the opportunity first to add tasks</p>
                    <p className="text-xs text-gray-400">Create the opportunity, then come back to add activities</p>
                  </div>
                ) : (
                  <TaskManager
                    tasks={tasks}
                    onAddTask={() => openTaskModal()}
                    onEditTask={(task) => openTaskModal(task)}
                    onDeleteTask={handleDeleteTask}
                    onToggleComplete={handleToggleTaskComplete}
                    isAdmin={isAdmin}
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
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                {activeTab === 'details' && (
                  <Button type="submit" disabled={loading || loadingData || dynamicForm.loading} loading={loading}>
                    Save
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false)
          setSelectedTask(null)
        }}
        task={selectedTask}
        onSubmit={handleTaskSubmit}
        loading={loading}
        error={error}
        businessName={linkedBusiness?.name || opportunity?.business?.name || ''}
      />

      {/* Business Modal */}
      <BusinessFormModal
        isOpen={businessModalOpen}
        onClose={() => {
          setBusinessModalOpen(false)
          setSelectedBusiness(null)
        }}
        business={selectedBusiness}
        onSuccess={handleBusinessSuccess}
      />

      {/* Booking Request Modal */}
      <BookingRequestViewModal
        isOpen={bookingRequestModalOpen}
        onClose={() => setBookingRequestModalOpen(false)}
        requestId={linkedBookingRequest?.id || null}
      />

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={showNewRequestModal}
        onClose={() => {
          setShowNewRequestModal(false)
          setNewRequestQueryParams({})
        }}
        queryParams={newRequestQueryParams}
      />

      {/* Lost Reason Modal */}
      <LostReasonModal
        isOpen={lostReasonModalOpen}
        onClose={handleLostReasonCancel}
        onConfirm={handleLostReasonConfirm}
        currentReason={opportunity?.lostReason || null}
        loading={savingStage}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.options.title}
        message={confirmDialog.options.message}
        confirmText={confirmDialog.options.confirmText}
        cancelText={confirmDialog.options.cancelText}
        confirmVariant={confirmDialog.options.confirmVariant}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
    </>
  )
}
