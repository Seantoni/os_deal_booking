'use client'

import { useState, useMemo, useEffect, useTransition, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createOpportunity, updateOpportunity, createTask, updateTask, deleteTask } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import { useCachedFormConfig } from '@/hooks/useFormConfigCache'
import { getTodayInPanama, formatDateForPanama } from '@/lib/date/timezone'
import type { Opportunity, OpportunityStage, Task, Business, UserData } from '@/types'
import type { Category } from '@prisma/client'
import HandshakeIcon from '@mui/icons-material/Handshake'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EventIcon from '@mui/icons-material/Event'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useOpportunityForm } from './useOpportunityForm'
import OpportunityPipeline from './OpportunityPipeline'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import WonStageBanner from './WonStageBanner'
import LinkedBusinessSection from './LinkedBusinessSection'
import LostReasonSection from './LostReasonSection'
import DynamicFormSection from '@/components/shared/DynamicFormSection'
import ModalShell, { ModalFooter } from '@/components/shared/ModalShell'
import {
  OpportunityDetailsSkeleton,
  OpportunityActivitySkeleton,
  OpportunityChatSkeleton,
  OpportunityPipelineSkeleton,
} from './OpportunityModalSkeleton'

// Lazy load nested modals - only loaded when opened
const BookingRequestViewModal = lazy(() => import('@/components/booking/request-view/BookingRequestViewModal'))
const TaskModal = lazy(() => import('./TaskModal'))
const LostReasonModal = lazy(() => import('./LostReasonModal'))
const ConfirmDialog = lazy(() => import('@/components/common/ConfirmDialog'))

// Import for checking meeting data (non-lazy, small utility function)
import { parseMeetingData } from './TaskModal'

// Lazy load tab content - only loaded when tab is active
const TaskManager = lazy(() => import('./TaskManager'))
const OpportunityChatThread = lazy(() => import('./OpportunityChatThread'))
const OpportunityHistory = lazy(() => import('./OpportunityHistory'))

// Simple loading fallback for lazy components
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
  onSuccess: (opportunity: Opportunity) => void
  initialBusinessId?: string
  initialTab?: 'details' | 'activity' | 'chat' | 'history'
  // Pre-loaded data to skip fetching (passed from parent page)
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
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'chat' | 'history'>(initialTab)
  
  // Get cached form configuration (instant if already prefetched)
  const { sections: cachedSections, initialized: cachedInitialized } = useCachedFormConfig('opportunity')

  // Update active tab when initialTab changes (e.g., opening from inbox)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])
  const [error, setError] = useState('')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null) // Track if we're completing a meeting

  // React 19: useTransition for non-blocking UI during form actions
  const [isSubmitPending, startSubmitTransition] = useTransition()
  const [isStagePending, startStageTransition] = useTransition()
  const [isTaskPending, startTaskTransition] = useTransition()
  
  // Combined loading states for UI
  const loading = isSubmitPending || isTaskPending
  const savingStage = isStagePending
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [bookingRequestModalOpen, setBookingRequestModalOpen] = useState(false)
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

  // Track tasks being toggled for loading state
  const [togglingTaskIds, setTogglingTaskIds] = useState<Set<string>>(new Set())

  // Build initial values from opportunity entity
  // Note: categoryId, tier, contactName, contactPhone, contactEmail come from the linked business
  // categoryId uses parent category string for parentOnly display mode
  const initialValues = useMemo((): Record<string, string | null> => {
    if (!opportunity) {
      // For new opportunities, look up business data from preloaded businesses
      const preloadedBusiness = initialBusinessId && preloadedBusinesses
        ? preloadedBusinesses.find((b) => b.id === initialBusinessId)
        : null
      
      return {
        businessId: initialBusinessId || null,
        startDate: getTodayInPanama(),
        // Include business data if available - use parent category for parentOnly mode
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
      // Use Panama timezone for date display
      startDate: opportunity.startDate ? formatDateForPanama(new Date(opportunity.startDate)) : null,
      closeDate: opportunity.closeDate ? formatDateForPanama(new Date(opportunity.closeDate)) : null,
      notes: opportunity.notes || null,
      // These come from the linked business - use parent category for parentOnly mode
      categoryId: business?.category?.parentCategory || null,
      tier: business?.tier?.toString() || null,
      contactName: business?.contactName || null,
      contactPhone: business?.contactPhone || null,
      contactEmail: business?.contactEmail || null,
    }
  }, [opportunity, initialBusinessId, preloadedBusinesses])

  // Dynamic form hook - pass preloaded sections from cache
  const dynamicForm = useDynamicForm({
    entityType: 'opportunity',
    entityId: opportunity?.id,
    initialValues,
    // Use cached form config if available (instant load)
    preloadedSections: cachedSections.length > 0 ? cachedSections : undefined,
    preloadedInitialized: cachedInitialized,
  })

  // Calculate activity summaries (Next/Last Task/Meeting) with days difference
  const activitySummary = useMemo(() => {
    if (!tasks.length) return { nextTask: null, lastTask: null, nextMeeting: null, lastMeeting: null }

    // Use Panama timezone for date comparisons
    const getTaskDateStr = (date: Date | string) => {
      return formatDateForPanama(new Date(date))
    }
    const todayStr = getTodayInPanama()

    // Helper to calculate days difference (using Panama timezone)
    const getDaysDiff = (date: Date | string) => {
      const taskDateStr = formatDateForPanama(new Date(date))
      const taskParts = taskDateStr.split('-').map(Number)
      const todayParts = todayStr.split('-').map(Number)
      
      // Create dates at midnight for comparison
      const taskDate = new Date(taskParts[0], taskParts[1] - 1, taskParts[2])
      const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2])
      
      const diffTime = taskDate.getTime() - todayDate.getTime()
      return Math.round(diffTime / (1000 * 60 * 60 * 24))
    }

    // Helper to format days text
    const formatDays = (days: number) => {
      if (days === 0) return 'hoy'
      if (days === 1) return 'mañana'
      if (days === -1) return 'ayer'
      if (days > 0) return `en ${days}d`
      return `hace ${Math.abs(days)}d`
    }

    // Helper to sort by date
    const sortByDateAsc = (a: Task, b: Task) => new Date(a.date).getTime() - new Date(b.date).getTime()
    const sortByDateDesc = (a: Task, b: Task) => new Date(b.date).getTime() - new Date(a.date).getTime()

    // Filter tasks by type
    const regularTasks = tasks.filter(t => t.category !== 'meeting')
    const meetingTasks = tasks.filter(t => t.category === 'meeting')

    // Find Next Task (first pending in future/today)
    const nextTask = regularTasks
      .filter(t => !t.completed)
      .sort(sortByDateAsc)[0]

    // Find Last Task (most recent completed or past)
    const lastTask = regularTasks
      .filter(t => {
        const dateStr = getTaskDateStr(t.date)
        return t.completed || dateStr < todayStr
      })
      .sort(sortByDateDesc)[0]

    // Find Next Meeting
    const nextMeeting = meetingTasks
      .filter(t => !t.completed)
      .sort(sortByDateAsc)[0]

    // Find Last Meeting
    const lastMeeting = meetingTasks
      .filter(t => {
        const dateStr = getTaskDateStr(t.date)
        return t.completed || dateStr < todayStr
      })
      .sort(sortByDateDesc)[0]

    return {
      nextTask: nextTask ? { date: nextTask.date, days: getDaysDiff(nextTask.date), daysText: formatDays(getDaysDiff(nextTask.date)) } : null,
      lastTask: lastTask ? { date: lastTask.date, days: getDaysDiff(lastTask.date), daysText: formatDays(getDaysDiff(lastTask.date)) } : null,
      nextMeeting: nextMeeting ? { date: nextMeeting.date, days: getDaysDiff(nextMeeting.date), daysText: formatDays(getDaysDiff(nextMeeting.date)) } : null,
      lastMeeting: lastMeeting ? { date: lastMeeting.date, days: getDaysDiff(lastMeeting.date), daysText: formatDays(getDaysDiff(lastMeeting.date)) } : null,
    }
  }, [tasks])

  // Sync businessId from useOpportunityForm to dynamicForm when it changes
  // This handles the case where businessId is set from useOpportunityForm
  useEffect(() => {
    if (businessId && dynamicForm.getValue('businessId') !== businessId) {
      dynamicForm.setValue('businessId', businessId)
      
      // Also sync category and other business fields when business changes
      // Check both loaded businesses and preloaded businesses
      const allBusinesses = [...(businesses || []), ...(preloadedBusinesses || [])]
      const selectedBusiness = allBusinesses.find((b) => b.id === businessId)
      if (selectedBusiness) {
        // Use parent category for parentOnly mode
        if (selectedBusiness.category?.parentCategory) {
          dynamicForm.setValue('categoryId', selectedBusiness.category.parentCategory)
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

  // React 19: Stage change handler using useTransition
  function saveStageChange(newStage: OpportunityStage, lostReason?: string) {
    if (!opportunity || savingStage) return

    const previousStage = stage
    setStage(newStage)
    setError('')

    startStageTransition(async () => {
      try {
        const allValues = dynamicForm.getAllValues()
        const formData = new FormData()
        formData.append('businessId', allValues.businessId || businessId)
        formData.append('stage', newStage)
        formData.append('startDate', allValues.startDate || '')
        if (allValues.closeDate) formData.append('closeDate', allValues.closeDate)
        if (allValues.notes) formData.append('notes', allValues.notes)
        // Responsible is required
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
          setError(result.error || 'Error al actualizar la etapa')
          setStage(previousStage)
        }
      } catch (err) {
        setError('Ocurrió un error al actualizar la etapa')
        setStage(previousStage)
      }
    })
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

  // React 19: Form submit handler using useTransition
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate required fields
    // Check for empty or '__unassigned__' value (from UserSelectItem)
    if (!responsibleId || responsibleId === '__unassigned__') {
      setError('Debe seleccionar un responsable para la oportunidad')
      return
    }

    startSubmitTransition(async () => {
      try {
        const allValues = dynamicForm.getAllValues()
        const formData = new FormData()
        formData.append('businessId', allValues.businessId || businessId)
        formData.append('stage', stage)
        formData.append('startDate', allValues.startDate || '')
        if (allValues.closeDate) formData.append('closeDate', allValues.closeDate)
        if (allValues.notes) formData.append('notes', allValues.notes)
        // Responsible is required
        formData.append('responsibleId', responsibleId)
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
          setError(result.error || 'Error al guardar la oportunidad')
        }
      } catch (err) {
        setError('An error occurred')
      }
    })
  }

  // React 19: Task submit handler using useTransition
  function handleTaskSubmit(data: {
    category: 'meeting' | 'todo'
    title: string
    date: string
    notes: string
  }) {
    if (!opportunity) {
      setError('Por favor guarde la oportunidad primero antes de agregar tareas')
      return
    }

    setError('')

    startTaskTransition(async () => {
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
          let updatedTask = result.data
          const taskId = selectedTask?.id || result.data.id
          
          // For meetings, check if outcome fields are filled to auto-complete
          let shouldAutoComplete = false
          let shouldAskWon = false
          
          if (data.category === 'meeting') {
            const meetingData = parseMeetingData(data.notes)
            // If nextSteps is filled, the meeting outcome is recorded - auto-complete
            if (meetingData?.nextSteps?.trim()) {
              shouldAutoComplete = true
              // If agreement reached, ask about Won stage
              if (meetingData.reachedAgreement === 'si' && stage !== 'won') {
                shouldAskWon = true
              }
            }
          }
          
          // Auto-complete if outcome fields are filled OR if we were explicitly completing
          if (shouldAutoComplete || (completingTaskId && selectedTask?.id === completingTaskId)) {
            if (!updatedTask.completed) {
              const completeFormData = new FormData()
              completeFormData.append('category', data.category)
              completeFormData.append('title', data.title)
              completeFormData.append('date', data.date)
              completeFormData.append('completed', 'true')
              completeFormData.append('notes', data.notes || '')
              
              const completeResult = await updateTask(taskId, completeFormData)
              if (completeResult.success && completeResult.data) {
                updatedTask = completeResult.data
              }
            }
            setCompletingTaskId(null)
          }
          
          // Update tasks state
          if (selectedTask) {
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t))
          } else {
            setTasks(prev => prev.map(t => t.id === newTask.id ? updatedTask : t))
          }
          
          // Close modal
          setTaskModalOpen(false)
          setSelectedTask(null)
          
          // Ask about Won stage if agreement was reached
          if (shouldAskWon) {
            const wantToWin = await confirmDialog.confirm({
              title: '¡Acuerdo Alcanzado!',
              message: 'Se llegó a un acuerdo en esta reunión. ¿Desea marcar esta oportunidad como Ganada (Won)?',
              confirmText: 'Sí, marcar como Ganada',
              cancelText: 'No, mantener estado actual',
              confirmVariant: 'success',
            })
            
            if (wantToWin) {
              handleStageChange('won')
            }
          }
        } else {
          if (selectedTask) {
            setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t))
          } else {
            setTasks(prev => prev.filter(t => t.id !== newTask.id))
          }
          setCompletingTaskId(null)
          setError(result.error || 'Error al guardar la tarea')
        }
      } catch (err) {
        if (selectedTask) {
          setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t))
        } else {
          setTasks(prev => prev.filter(t => !t.id.startsWith('temp-')))
        }
        setCompletingTaskId(null)
        setError('An error occurred')
      }
    })
  }

  // React 19: Task delete handler using useTransition
  async function handleDeleteTask(taskId: string) {
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Tarea',
      message: '¿Está seguro de que desea eliminar esta tarea? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    const taskToDelete = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))

    startTaskTransition(async () => {
      try {
        const result = await deleteTask(taskId)
        if (!result.success) {
          if (taskToDelete) {
            setTasks(prev => [...prev, taskToDelete].sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            ))
          }
          setError(result.error || 'Error al eliminar la tarea')
        }
      } catch (err) {
        if (taskToDelete) {
          setTasks(prev => [...prev, taskToDelete].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          ))
        }
        setError('An error occurred')
      }
    })
  }

  // Toggle task completion with immediate optimistic update
  async function handleToggleTaskComplete(task: Task) {
    // If trying to complete a meeting, check if outcome fields are filled
    if (task.category === 'meeting' && !task.completed) {
      const meetingData = parseMeetingData(task.notes)
      // Meeting outcome fields must be filled (nextSteps) before completing
      // Check for missing data, empty string, or whitespace-only
      const hasNextSteps = meetingData?.nextSteps?.trim()
      if (!meetingData || !hasNextSteps) {
        // Open task modal for editing and track that we're completing it
        setCompletingTaskId(task.id)
        openTaskModal(task, true)
        return
      }
    }

    // Immediately update UI (optimistic)
    const newCompletedState = !task.completed
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompletedState } : t))
    setTogglingTaskIds(prev => new Set(prev).add(task.id))

    try {
      const formData = new FormData()
      formData.append('category', task.category)
      formData.append('title', task.title)
      // Use Panama timezone for task date
      formData.append('date', formatDateForPanama(new Date(task.date)))
      formData.append('completed', newCompletedState.toString())
      formData.append('notes', task.notes || '')

      const result = await updateTask(task.id, formData)
      if (result.success && result.data) {
        // Confirm with server data
        setTasks(prev => prev.map(t => t.id === task.id ? result.data : t))
      } else {
        // Revert on failure
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t))
      }
    } catch (err) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t))
    } finally {
      setTogglingTaskIds(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }

  function openTaskModal(task?: Task, forCompletion = false) {
    setSelectedTask(task || null)
    // Only keep completingTaskId if explicitly opening for completion
    if (!forCompletion) {
      setCompletingTaskId(null)
    }
    setTaskModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    // Close opportunity modal and navigate to businesses page with modal open
    sessionStorage.setItem('openBusinessId', business.id)
    onClose()
    router.push('/businesses')
  }

  function handleCreateRequest() {
    if (!linkedBusiness || !opportunity) return

    // Build query parameters with business data for pre-filling the booking form
    const params = new URLSearchParams()
    params.set('fromOpportunity', opportunity.id)
    params.set('businessId', linkedBusiness.id) // Pass businessId for backfill tracking
    params.set('businessName', linkedBusiness.name || '')
    if (linkedBusiness.contactEmail) params.set('businessEmail', linkedBusiness.contactEmail)
    if (linkedBusiness.contactName) params.set('contactName', linkedBusiness.contactName)
    if (linkedBusiness.contactPhone) params.set('contactPhone', linkedBusiness.contactPhone)
    
    // Category info
    if (linkedBusiness.category) {
      if (linkedBusiness.category.parentCategory) params.set('parentCategory', linkedBusiness.category.parentCategory)
      if (linkedBusiness.category.subCategory1) params.set('subCategory1', linkedBusiness.category.subCategory1)
      if (linkedBusiness.category.subCategory2) params.set('subCategory2', linkedBusiness.category.subCategory2)
    }
    
    // Legal/Tax info
    if (linkedBusiness.razonSocial) params.set('legalName', linkedBusiness.razonSocial)
    if (linkedBusiness.ruc) params.set('ruc', linkedBusiness.ruc)
    
    // Location info
    if (linkedBusiness.provinceDistrictCorregimiento) params.set('provinceDistrictCorregimiento', linkedBusiness.provinceDistrictCorregimiento)
    if (linkedBusiness.address) params.set('address', linkedBusiness.address)
    if (linkedBusiness.neighborhood) params.set('neighborhood', linkedBusiness.neighborhood)
    
    // Bank/Payment info
    if (linkedBusiness.bank) params.set('bank', linkedBusiness.bank)
    if (linkedBusiness.beneficiaryName) params.set('bankAccountName', linkedBusiness.beneficiaryName)
    if (linkedBusiness.accountNumber) params.set('accountNumber', linkedBusiness.accountNumber)
    if (linkedBusiness.accountType) params.set('accountType', linkedBusiness.accountType)
    if (linkedBusiness.paymentPlan) params.set('paymentPlan', linkedBusiness.paymentPlan)
    
    // Additional info
    if (linkedBusiness.website) params.set('website', linkedBusiness.website)
    if (linkedBusiness.instagram) params.set('instagram', linkedBusiness.instagram)
    
    // Close the opportunity modal and navigate to booking request form
    onClose()
    router.push(`/booking-requests/new?${params.toString()}`)
  }

  // Memoize category options to prevent recalculation on every render
  const categoryOptions = useMemo(() => categories.map(cat => ({
    id: cat.id,
    categoryKey: cat.categoryKey,
    parentCategory: cat.parentCategory,
    subCategory1: cat.subCategory1,
    subCategory2: cat.subCategory2,
    subCategory3: cat.subCategory3,
    subCategory4: cat.subCategory4,
  })), [categories])

  // Memoize user options to prevent recalculation on every render
  const userOptions = useMemo(() => users.map(u => ({
    clerkId: u.clerkId,
    name: u.name,
    email: u.email,
  })), [users])

  // Combine loaded businesses with preloaded businesses (deduplicated)
  const allBusinesses = useMemo(() => {
    const combined = [...(businesses || []), ...(preloadedBusinesses || [])]
    return combined.filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
  }, [businesses, preloadedBusinesses])

  if (!isOpen) return null

  const isEditMode = !!opportunity

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
            submitLabel="Guardar"
            submitLoading={loading || loadingData || dynamicForm.loading}
            submitDisabled={loading || loadingData || dynamicForm.loading || !responsibleId || responsibleId === '__unassigned__'}
            leftContent="* Campos requeridos"
            formId="opportunity-modal-form"
          />
        ) : activeTab === 'activity' ? (
          <ModalFooter
            onCancel={onClose}
            leftContent="* Campos requeridos"
          />
        ) : activeTab === 'chat' ? (
          <ModalFooter
            onCancel={onClose}
          />
        ) : (
          <ModalFooter
            onCancel={onClose}
          />
        )
      }
    >

          {/* Sales Path (Pipeline) */}
          {loadingData ? (
            <OpportunityPipelineSkeleton />
          ) : (
            <OpportunityPipeline stage={stage} onStageChange={handleStageChange} saving={savingStage} />
          )}

          {/* Reference Info Bar - 2-line layout */}
          {!loadingData && (
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 space-y-1.5">
              {/* Line 1: Action-oriented (What do I need to do?) */}
              <div className="flex flex-wrap items-center gap-5 text-xs">
                {/* Tasks */}
                {(activitySummary.nextTask || activitySummary.lastTask) && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tareas</span>
                    {activitySummary.nextTask && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-orange-600">
                          Próx: {new Date(activitySummary.nextTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          activitySummary.nextTask.days <= 0 ? 'bg-red-100 text-red-700' : 
                          activitySummary.nextTask.days <= 2 ? 'bg-amber-100 text-amber-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {activitySummary.nextTask.daysText}
                        </span>
                      </span>
                    )}
                    {activitySummary.lastTask && (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">
                          Últ: {new Date(activitySummary.lastTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {activitySummary.lastTask.daysText}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                
                {/* Meetings */}
                {(activitySummary.nextMeeting || activitySummary.lastMeeting) && (
                  <div className="flex items-center gap-2 pl-5 border-l border-gray-300">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reuniones</span>
                    {activitySummary.nextMeeting && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-blue-600">
                          Próx: {new Date(activitySummary.nextMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          activitySummary.nextMeeting.days <= 0 ? 'bg-red-100 text-red-700' : 
                          activitySummary.nextMeeting.days <= 2 ? 'bg-amber-100 text-amber-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {activitySummary.nextMeeting.daysText}
                        </span>
                      </span>
                    )}
                    {activitySummary.lastMeeting && (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">
                          Últ: {new Date(activitySummary.lastMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {activitySummary.lastMeeting.daysText}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Line 2: Context (Timeline + Owner) */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                {/* Timeline dates */}
                <div className="flex items-center gap-2">
                  {opportunity?.createdAt && (
                    <span className="text-gray-400">
                      Creado: {new Date(opportunity.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {(dynamicForm.getValue('startDate') || opportunity?.startDate) && (
                    <span>
                      Inicio: {new Date(dynamicForm.getValue('startDate') || opportunity?.startDate!).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {(dynamicForm.getValue('closeDate') || opportunity?.closeDate) && (
                    <span>
                      Cierre: {new Date(dynamicForm.getValue('closeDate') || opportunity?.closeDate!).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Separator */}
                <span className="text-gray-300">|</span>

                {/* Owner (required) */}
                <ReferenceInfoBar.UserSelectItem
                  label="Responsable *"
                  userId={responsibleId}
                  users={users}
                  isAdmin={isAdmin}
                  onChange={setResponsibleId}
                  placeholder="Seleccionar..."
                />
              </div>
            </div>
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
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex px-4 pt-2 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2.5 text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px ${
                  activeTab === 'details'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Detalles
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-2.5 text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px ${
                  activeTab === 'activity'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Actividad
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2.5 text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px ${
                  activeTab === 'chat'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2.5 text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px ${
                  activeTab === 'history'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Histórico
              </button>
            </div>
          </div>

      <form id="opportunity-modal-form" onSubmit={handleSubmit} className="bg-white min-h-[500px] flex flex-col">
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <ErrorOutlineIcon className="text-red-600 flex-shrink-0 mt-0.5" fontSize="small" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Loading state - show skeleton for details tab only (other tabs lazy load their own content) */}
            {(loadingData || dynamicForm.loading) ? (
              <OpportunityDetailsSkeleton />
            ) : activeTab === 'details' ? (
              <div className="p-3 space-y-3">
                {/* Dynamic Sections from Form Config */}
                {dynamicForm.initialized && dynamicForm.sections.map((section) => {
                  // Collapse sections with many fields (10+) by default for better UX
                  const visibleFieldCount = section.fields.filter(f => f.isVisible).length
                  const shouldCollapse = section.isCollapsed || visibleFieldCount >= 10
                  return (
                  <DynamicFormSection
                    key={section.id}
                    section={section}
                    values={dynamicForm.getAllValues()}
                    onChange={dynamicForm.setValue}
                    disabled={loading}
                    categories={categoryOptions}
                    users={userOptions}
                    businesses={allBusinesses}
                    categoryDisplayMode="parentOnly"
                      defaultExpanded={!shouldCollapse}
                    collapsible={true}
                    isEditMode={isEditMode}
                    hiddenFieldTypes={['business-select']}
                  />
                  )
                })}

                {/* Fallback if form config not initialized */}
                {!dynamicForm.initialized && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    <p className="font-medium">Configuración del formulario no inicializada</p>
                    <p className="text-xs mt-1">Vaya a Configuración → Constructor de Formularios para inicializar la configuración del formulario de oportunidad.</p>
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

                {linkedBusiness && (
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
                    <EventIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
                    <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para agregar tareas</p>
                    <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para agregar actividades</p>
                  </div>
                ) : (
                  <Suspense fallback={<OpportunityActivitySkeleton />}>
                    <TaskManager
                      tasks={tasks}
                      onAddTask={() => openTaskModal()}
                      onEditTask={(task) => openTaskModal(task)}
                      onDeleteTask={handleDeleteTask}
                      onToggleComplete={handleToggleTaskComplete}
                      isAdmin={isAdmin}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {!loadingData && activeTab === 'chat' && (
              <div className="p-6 bg-white h-full">
                {!opportunity ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <span className="text-4xl mb-3 block">💬</span>
                    <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para usar el chat</p>
                    <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para chatear</p>
                  </div>
                ) : (
                  <Suspense fallback={<OpportunityChatSkeleton />}>
                    <OpportunityChatThread
                      opportunityId={opportunity.id}
                      canEdit={isAdmin || opportunity.responsibleId === user?.id || opportunity.userId === user?.id}
                    />
                  </Suspense>
                )}
              </div>
            )}

            {!loadingData && activeTab === 'history' && (
              <div className="bg-white h-full">
                {!opportunity ? (
                  <div className="p-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                      <span className="text-4xl mb-3 block">📋</span>
                      <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para ver el historial</p>
                      <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para ver las actividades</p>
                    </div>
                  </div>
                ) : (
                  <Suspense fallback={<TabLoadingFallback />}>
                    <OpportunityHistory opportunityId={opportunity.id} />
                  </Suspense>
                )}
              </div>
            )}

      </form>
    </ModalShell>

      {/* Lazy-loaded modals - only rendered when open */}
      {taskModalOpen && (
        <Suspense fallback={null}>
          <TaskModal
            isOpen={taskModalOpen}
            onClose={() => {
              setTaskModalOpen(false)
              setSelectedTask(null)
              setCompletingTaskId(null) // Clear completing state on close
            }}
            task={selectedTask}
            onSubmit={handleTaskSubmit}
            loading={loading}
            error={error}
            businessName={linkedBusiness?.name || opportunity?.business?.name || ''}
            forCompletion={!!completingTaskId}
            responsibleName={opportunity?.responsible?.name || opportunity?.responsible?.email}
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

      {lostReasonModalOpen && (
        <Suspense fallback={null}>
          <LostReasonModal
            isOpen={lostReasonModalOpen}
            onClose={handleLostReasonCancel}
            onConfirm={handleLostReasonConfirm}
            currentReason={opportunity?.lostReason || null}
            loading={savingStage}
          />
        </Suspense>
      )}

      {/* ConfirmDialog - z-index 80 to appear above ModalShell (z-70) */}
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
    </>
  )
}
