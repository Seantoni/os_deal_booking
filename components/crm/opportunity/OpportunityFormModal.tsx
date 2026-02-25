'use client'

import { useState, useMemo, useEffect, useTransition, lazy, Suspense, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { createOpportunity, updateOpportunity, createTask, updateTask, deleteTask } from '@/app/actions/crm'
import { useUserRole } from '@/hooks/useUserRole'
import { useDynamicForm } from '@/hooks/useDynamicForm'
import { useCachedFormConfig } from '@/hooks/useFormConfigCache'
import { getTodayInPanama, formatDateForPanama, addBusinessDaysInPanama } from '@/lib/date/timezone'
import type { Opportunity, OpportunityStage, Task, Business, UserData } from '@/types'
import type { Category } from '@prisma/client'
import HandshakeIcon from '@mui/icons-material/Handshake'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EventIcon from '@mui/icons-material/Event'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useTaskCompletionFollowUp } from '@/hooks/useTaskCompletionFollowUp'
import { useOpportunityForm } from './useOpportunityForm'
import OpportunityPipeline from './OpportunityPipeline'
import ReferenceInfoBar from '@/components/shared/ReferenceInfoBar'
import WonStageBanner from './WonStageBanner'
import LinkedBusinessSection from './LinkedBusinessSection'
import LinkedRequestSection from './LinkedRequestSection'
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
const BusinessFormModal = lazy(() => import('@/components/crm/business/BusinessFormModal'))

// Import for checking meeting data (non-lazy, small utility function)
import { parseMeetingData, type MeetingData } from './TaskModal'
import { useActivityDictation, type ClassifiedActivityFields } from './useActivityDictation'
import AiVoiceVisualizer from '@/components/shared/AiVoiceVisualizer'

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

type AgreementPipelineDecision = 'keep_reunion' | 'propuesta_enviada' | 'won'

const MEETING_AUTOMATION_LOG_PREFIX = '[OppMeetingAutomation]'

function normalizeAutomationStage(rawStage: string | null | undefined): OpportunityStage | 'unknown' {
  const stageValue = (rawStage || '').trim().toLowerCase()
  switch (stageValue) {
    case 'iniciacion':
    case 'iniciación':
      return 'iniciacion'
    case 'reunion':
    case 'reunión':
      return 'reunion'
    case 'propuesta_enviada':
    case 'propuesta enviada':
      return 'propuesta_enviada'
    case 'propuesta_aprobada':
    case 'propuesta aprobada':
      return 'propuesta_aprobada'
    case 'won':
      return 'won'
    case 'lost':
      return 'lost'
    default:
      return 'unknown'
  }
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
  const [businessModalOpen, setBusinessModalOpen] = useState(false)
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)

  const [taskPrefill, setTaskPrefill] = useState<ClassifiedActivityFields | null>(null)

  const activityDictation = useActivityDictation({
    onResult: (fields) => {
      setTaskPrefill(fields)
      setSelectedTask(null)
      setCompletingTaskId(null)
      setTaskModalOpen(true)
    },
  })

  const confirmDialog = useConfirmDialog()

  function logMeetingAutomation(event: string, payload?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    if (payload) {
      let serialized = ''
      try {
        serialized = JSON.stringify(payload)
      } catch {
        serialized = '[unserializable-payload]'
      }
      console.info(`${MEETING_AUTOMATION_LOG_PREFIX} ${timestamp} ${event} ${serialized}`)
      return
    }
    console.info(`${MEETING_AUTOMATION_LOG_PREFIX} ${timestamp} ${event}`)
  }

  const taskCompletionFollowUp = useTaskCompletionFollowUp<Task>({
    confirmDialog,
    onOpenNewTask: () => {
      setError('')
      openTaskModal()
    },
    onLog: (event, payload) => {
      logMeetingAutomation(`completionFollowUp:${event}`, payload)
    },
  })

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
  const stageRef = useRef<string>(stage)

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

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
      // Use opportunity-scoped values first, then fallback to linked business defaults.
      categoryId: opportunity.categoryId || business?.category?.parentCategory || null,
      tier: opportunity.tier?.toString() || business?.tier?.toString() || null,
      contactName: opportunity.contactName || business?.contactName || null,
      contactPhone: opportunity.contactPhone || business?.contactPhone || null,
      contactEmail: opportunity.contactEmail || business?.contactEmail || null,
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
        formData.append('categoryId', allValues.categoryId || '')
        formData.append('tier', allValues.tier || '')
        formData.append('contactName', allValues.contactName || '')
        formData.append('contactPhone', allValues.contactPhone || '')
        formData.append('contactEmail', allValues.contactEmail || '')
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

  async function createProposalFollowUpTask() {
    if (!opportunity) return

    const followUpDate = addBusinessDaysInPanama(getTodayInPanama(), 2)
    logMeetingAutomation('createProposalFollowUpTask:start', {
      opportunityId: opportunity.id,
      followUpDate,
    })

    const formData = new FormData()
    formData.append('opportunityId', opportunity.id)
    formData.append('category', 'todo')
    formData.append('title', 'Dar seguimiento a propuesta enviada')
    formData.append('date', followUpDate)
    formData.append('notes', 'Tarea creada automáticamente tras marcar la oportunidad en "Propuesta enviada".')

    const result = await createTask(formData)
    if (result.success && result.data) {
      logMeetingAutomation('createProposalFollowUpTask:success', {
        taskId: result.data.id,
        taskDate: String(result.data.date),
      })
      setTasks(prev => [...prev, result.data].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ))
    } else {
      logMeetingAutomation('createProposalFollowUpTask:failed', {
        error: result.error || 'unknown',
      })
      setError(result.error || 'No se pudo crear la tarea automática de seguimiento')
    }
  }

  function askStageDecision(opts: {
    title: string
    description: string
    options: Array<{ value: string; label: string; className: string }>
    cancelLabel: string
  }): Promise<string | null> {
    return new Promise((resolve) => {
      const buttons = (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center">{opts.description}</p>
          <div className="flex flex-col gap-2">
            {opts.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors ${opt.className}`}
                onClick={() => {
                  confirmDialog.handleCancel()
                  resolve(opt.value)
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )

      confirmDialog.confirm({
        title: opts.title,
        message: buttons,
        confirmText: '',
        cancelText: opts.cancelLabel,
        confirmVariant: 'primary',
      }).then(() => {
        resolve(null)
      }).catch(() => {
        resolve(null)
      })
    })
  }

  async function askIniciacionAgreementDecision(): Promise<'reunion' | 'propuesta_enviada' | 'won' | 'keep'> {
    logMeetingAutomation('askIniciacionAgreementDecision:start')

    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'reunion', label: 'Reunión', className: 'bg-blue-600 text-white hover:bg-blue-700' },
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Iniciación',
    })

    const result = (decision as 'reunion' | 'propuesta_enviada' | 'won') || 'keep'
    logMeetingAutomation('askIniciacionAgreementDecision:result', { result })
    return result
  }

  async function askAgreementPipelineDecision(): Promise<AgreementPipelineDecision> {
    logMeetingAutomation('askAgreementPipelineDecision:start')

    const decision = await askStageDecision({
      title: 'Acuerdo alcanzado',
      description: '¿A qué etapa desea mover esta oportunidad?',
      options: [
        { value: 'propuesta_enviada', label: 'Propuesta Enviada', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { value: 'won', label: 'Won (Ganada)', className: 'bg-green-600 text-white hover:bg-green-700' },
      ],
      cancelLabel: 'Mantener en Reunión',
    })

    const result = (decision as 'propuesta_enviada' | 'won') || 'keep_reunion'
    logMeetingAutomation('askAgreementPipelineDecision:result', { result })
    return result as AgreementPipelineDecision
  }

  async function handleWonPostActions() {
    logMeetingAutomation('handleWonPostActions:start')

    const createRequestNow = await confirmDialog.confirm({
      title: 'Oportunidad ganada',
      message: '¿Desea crear la solicitud/contrato ahora?',
      confirmText: 'Sí, crear solicitud',
      cancelText: 'No, después',
      confirmVariant: 'primary',
    })
    logMeetingAutomation('handleWonPostActions:result', {
      createRequestNow,
    })

    if (createRequestNow) {
      handleCreateRequest()
    }
  }

  async function handleMeetingCompletionPipelineAutomation(meetingData: MeetingData | null, capturedStage: string) {
    const normalizedStage = normalizeAutomationStage(capturedStage)

    logMeetingAutomation('handleMeetingCompletionPipelineAutomation:start', {
      capturedStage,
      normalizedStage,
      reachedAgreement: meetingData?.reachedAgreement || null,
      hasNextSteps: !!meetingData?.nextSteps?.trim(),
    })

    if (!meetingData?.nextSteps?.trim()) {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_no_next_steps')
      return
    }

    // Only automate from iniciacion or reunion stages
    if (normalizedStage !== 'iniciacion' && normalizedStage !== 'reunion') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_wrong_stage', {
        capturedStage,
        normalizedStage,
      })
      return
    }

    // --- FROM INICIACIÓN ---
    if (normalizedStage === 'iniciacion') {
      if (meetingData.reachedAgreement === 'no') {
        // No agreement from iniciacion → auto-move to reunion
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_no_agreement_auto_reunion')
        await handleStageChange('reunion')
        return
      }

      if (meetingData.reachedAgreement === 'si') {
        // Agreement from iniciacion → prompt: reunion / propuesta_enviada / won
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_agreement_prompt')
        const decision = await askIniciacionAgreementDecision()
        logMeetingAutomation('handleMeetingCompletionPipelineAutomation:iniciacion_decision', { decision })

        if (decision === 'reunion') {
          await handleStageChange('reunion')
        } else if (decision === 'propuesta_enviada') {
          await handleStageChange('propuesta_enviada')
          await createProposalFollowUpTask()
        } else if (decision === 'won') {
          await handleStageChange('won')
          await handleWonPostActions()
        }
        return
      }

      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_invalid_agreement', {
        reachedAgreement: meetingData.reachedAgreement,
      })
      return
    }

    // --- FROM REUNIÓN ---
    if (meetingData.reachedAgreement === 'no') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:reunion_no_agreement')
      return
    }

    if (meetingData.reachedAgreement !== 'si') {
      logMeetingAutomation('handleMeetingCompletionPipelineAutomation:exit_invalid_agreement', {
        reachedAgreement: meetingData.reachedAgreement,
      })
      return
    }

    const pipelineDecision = await askAgreementPipelineDecision()
    logMeetingAutomation('handleMeetingCompletionPipelineAutomation:reunion_decision', { pipelineDecision })

    if (pipelineDecision === 'propuesta_enviada') {
      await handleStageChange('propuesta_enviada')
      await createProposalFollowUpTask()
      return
    }

    if (pipelineDecision === 'won') {
      await handleStageChange('won')
      await handleWonPostActions()
    }
  }

  function shouldRunMeetingAutomation(params: {
    previousMeetingData: MeetingData | null
    currentMeetingData: MeetingData | null
    wasCompletedBefore: boolean
    isCompletedNow: boolean
  }): boolean {
    const { previousMeetingData, currentMeetingData, wasCompletedBefore, isCompletedNow } = params
    if (!currentMeetingData?.nextSteps?.trim()) {
      logMeetingAutomation('shouldRunMeetingAutomation:false_no_next_steps')
      return false
    }
    if (!currentMeetingData.reachedAgreement) {
      logMeetingAutomation('shouldRunMeetingAutomation:false_no_agreement_value')
      return false
    }

    const previousOutcomeRecorded = !!previousMeetingData?.nextSteps?.trim()
    const agreementChanged = previousMeetingData?.reachedAgreement !== currentMeetingData.reachedAgreement
    const completedDuringThisSave = !wasCompletedBefore && isCompletedNow
    const shouldRun = !previousOutcomeRecorded || agreementChanged || completedDuringThisSave

    logMeetingAutomation('shouldRunMeetingAutomation:evaluated', {
      previousOutcomeRecorded,
      agreementChanged,
      completedDuringThisSave,
      shouldRun,
      wasCompletedBefore,
      isCompletedNow,
      previousAgreement: previousMeetingData?.reachedAgreement || null,
      currentAgreement: currentMeetingData.reachedAgreement,
    })

    return shouldRun
  }

  function queueMeetingCompletionPipelineAutomation(meetingData: MeetingData | null, capturedStage: string) {
    if (!meetingData) {
      logMeetingAutomation('queueMeetingCompletionPipelineAutomation:skip_null_meeting_data')
      return
    }
    logMeetingAutomation('queueMeetingCompletionPipelineAutomation:queued', {
      capturedStage,
      reachedAgreement: meetingData.reachedAgreement,
      hasNextSteps: !!meetingData.nextSteps?.trim(),
    })
    void Promise.resolve().then(async () => {
      logMeetingAutomation('queueMeetingCompletionPipelineAutomation:executing')
      await handleMeetingCompletionPipelineAutomation(meetingData, capturedStage)
    })
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
        formData.append('categoryId', allValues.categoryId || '')
        formData.append('tier', allValues.tier || '')
        formData.append('contactName', allValues.contactName || '')
        formData.append('contactPhone', allValues.contactPhone || '')
        formData.append('contactEmail', allValues.contactEmail || '')

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
  }, options?: {
    markCompleted?: boolean
  }) {
    if (!opportunity) {
      setError('Por favor guarde la oportunidad primero antes de agregar tareas')
      return
    }

    logMeetingAutomation('handleTaskSubmit:start', {
      category: data.category,
      selectedTaskId: selectedTask?.id || null,
      completingTaskId: completingTaskId || null,
      stage,
      runtimeStage: stageRef.current,
      normalizedRuntimeStage: normalizeAutomationStage(stageRef.current),
      hasNotes: !!data.notes,
    })

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
          const wasCompletedBefore = !!selectedTask?.completed
          const previousMeetingData = selectedTask?.category === 'meeting'
            ? parseMeetingData(selectedTask.notes)
            : null
          const meetingData = data.category === 'meeting'
            ? parseMeetingData(data.notes)
            : null
          logMeetingAutomation('handleTaskSubmit:task_saved', {
            taskId,
            category: data.category,
            wasCompletedBefore,
            isCompletedAfterSave: updatedTask.completed,
            parsedMeetingData: !!meetingData,
            reachedAgreement: meetingData?.reachedAgreement || null,
            hasNextSteps: !!meetingData?.nextSteps?.trim(),
          })
          
          // For meetings, complete when meeting already happened or outcome is recorded.
          let shouldAutoComplete = !!options?.markCompleted
          
          // If nextSteps is filled, the meeting outcome is recorded - auto-complete.
          if (meetingData?.nextSteps?.trim()) {
            shouldAutoComplete = true
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

          const completedFromModal = selectedTask
            ? !selectedTask.completed && updatedTask.completed
            : updatedTask.completed

          const shouldRunAutomation = data.category === 'meeting' && shouldRunMeetingAutomation({
            previousMeetingData,
            currentMeetingData: meetingData,
            wasCompletedBefore,
            isCompletedNow: updatedTask.completed,
          })

          logMeetingAutomation('handleTaskSubmit:automation_decision', {
            shouldRunAutomation,
            category: data.category,
          })

          if (shouldRunAutomation) {
            queueMeetingCompletionPipelineAutomation(meetingData, stage)
          }

          if (completedFromModal) {
            await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(updatedTask, data.notes)
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
    const existingMeetingData = task.category === 'meeting' ? parseMeetingData(task.notes) : null
    logMeetingAutomation('handleToggleTaskComplete:start', {
      taskId: task.id,
      category: task.category,
      currentlyCompleted: task.completed,
      hasExistingMeetingData: !!existingMeetingData,
      reachedAgreement: existingMeetingData?.reachedAgreement || null,
      hasNextSteps: !!existingMeetingData?.nextSteps?.trim(),
      stage,
      runtimeStage: stageRef.current,
      normalizedRuntimeStage: normalizeAutomationStage(stageRef.current),
    })

    // If trying to complete a meeting, check if outcome fields are filled
    if (task.category === 'meeting' && !task.completed) {
      // Meeting outcome fields must be filled (nextSteps) before completing
      // Check for missing data, empty string, or whitespace-only
      const hasNextSteps = existingMeetingData?.nextSteps?.trim()
      if (!existingMeetingData || !hasNextSteps) {
        logMeetingAutomation('handleToggleTaskComplete:open_modal_for_completion', {
          taskId: task.id,
          reason: !existingMeetingData ? 'missing_meeting_data' : 'missing_next_steps',
        })
        // Open task modal for editing and track that we're completing it
        setCompletingTaskId(task.id)
        openTaskModal(task, true)
        return
      }
    }

    // Immediately update UI (optimistic)
    const newCompletedState = !task.completed
    const isCompleting = !task.completed
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
        logMeetingAutomation('handleToggleTaskComplete:update_success', {
          taskId: task.id,
          newCompletedState,
        })

        if (task.category === 'meeting' && isCompleting) {
          const completedMeetingData = parseMeetingData(result.data.notes)
          logMeetingAutomation('handleToggleTaskComplete:queue_automation', {
            taskId: task.id,
            reachedAgreement: completedMeetingData?.reachedAgreement || null,
            hasNextSteps: !!completedMeetingData?.nextSteps?.trim(),
          })
          queueMeetingCompletionPipelineAutomation(completedMeetingData, stage)
        }

        if (isCompleting) {
          await taskCompletionFollowUp.maybeOfferNewTaskAfterCompletion(result.data)
        }
      } else {
        logMeetingAutomation('handleToggleTaskComplete:update_failed', {
          taskId: task.id,
          error: result.error || 'unknown',
        })
        // Revert on failure
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t))
      }
    } catch (err) {
      logMeetingAutomation('handleToggleTaskComplete:exception', {
        taskId: task.id,
      })
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
    setTaskPrefill(null)
    if (!forCompletion) {
      setCompletingTaskId(null)
    }
    setTaskModalOpen(true)
  }

  function handleEditBusiness(business: Business) {
    setSelectedBusiness(business)
    setBusinessModalOpen(true)
  }

  function handleViewLinkedRequest() {
    if (!linkedBookingRequest) return
    setBookingRequestModalOpen(true)
  }

  function handleCreateRequest() {
    if (!linkedBusiness || !opportunity) {
      setError('No se puede crear la solicitud porque falta la empresa vinculada')
      return
    }

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
  const startDateDisplayValue = dynamicForm.getValue('startDate') || opportunity?.startDate || null
  const closeDateDisplayValue = dynamicForm.getValue('closeDate') || opportunity?.closeDate || null

  if (!isOpen) return null

  const isEditMode = !!opportunity

  // Determine if user can edit this opportunity
  // User can edit if they are admin, the responsible party, or the creator
  const canEdit = isAdmin || !opportunity || opportunity.responsibleId === user?.id || opportunity.userId === user?.id
  const isViewOnly = !canEdit

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
            submitLabel={isViewOnly ? undefined : "Guardar"}
            submitLoading={loading || loadingData || dynamicForm.loading}
            submitDisabled={isViewOnly || loading || loadingData || dynamicForm.loading || !responsibleId || responsibleId === '__unassigned__'}
            leftContent={isViewOnly ? "Solo lectura - No tiene permisos para editar" : "* Campos requeridos"}
            formId={isViewOnly ? undefined : "opportunity-modal-form"}
          />
        ) : activeTab === 'activity' ? (
          <ModalFooter
            onCancel={onClose}
            leftContent={isViewOnly ? "Solo lectura - No tiene permisos para editar" : "* Campos requeridos"}
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
          <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2">
            {loadingData ? (
              <OpportunityPipelineSkeleton />
            ) : (
              <OpportunityPipeline
                stage={stage}
                onStageChange={isViewOnly ? () => {} : handleStageChange}
                saving={savingStage}
              />
            )}
          </div>

          {/* Reference Info Bar - 2-line layout */}
          {!loadingData && (
            <div className="bg-gray-50 border-b border-gray-200 px-3 md:px-4 py-2 space-y-1.5">
              {/* Line 1: Action-oriented — scrollable on mobile */}
              <div className="flex items-center gap-3 md:gap-5 text-xs overflow-x-auto no-scrollbar pb-0.5">
                {/* Tasks */}
                {(activitySummary.nextTask || activitySummary.lastTask) && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tareas</span>
                    {activitySummary.nextTask && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-orange-600 whitespace-nowrap">
                          Próx: {new Date(activitySummary.nextTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                          activitySummary.nextTask.days <= 0 ? 'bg-red-100 text-red-700' : 
                          activitySummary.nextTask.days <= 2 ? 'bg-amber-100 text-amber-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {activitySummary.nextTask.daysText}
                        </span>
                      </span>
                    )}
                    {activitySummary.lastTask && (
                      <span className="hidden md:flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          Últ: {new Date(activitySummary.lastTask.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          {activitySummary.lastTask.daysText}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                
                {/* Meetings */}
                {(activitySummary.nextMeeting || activitySummary.lastMeeting) && (
                  <div className="flex items-center gap-2 pl-3 md:pl-5 border-l border-gray-300 flex-shrink-0">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reuniones</span>
                    {activitySummary.nextMeeting && (
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-blue-600 whitespace-nowrap">
                          Próx: {new Date(activitySummary.nextMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                          activitySummary.nextMeeting.days <= 0 ? 'bg-red-100 text-red-700' : 
                          activitySummary.nextMeeting.days <= 2 ? 'bg-amber-100 text-amber-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {activitySummary.nextMeeting.daysText}
                        </span>
                      </span>
                    )}
                    {activitySummary.lastMeeting && (
                      <span className="hidden md:flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          Últ: {new Date(activitySummary.lastMeeting.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 whitespace-nowrap">
                          {activitySummary.lastMeeting.daysText}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Line 2: Context (Timeline + Owner) — wraps on mobile */}
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-gray-500">
                {/* Timeline dates */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {opportunity?.createdAt && (
                    <span className="text-gray-400 whitespace-nowrap">
                      Creado: {new Date(opportunity.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {startDateDisplayValue && (
                    <span className="whitespace-nowrap">
                      Inicio: {new Date(startDateDisplayValue).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {closeDateDisplayValue && (
                    <span className="whitespace-nowrap">
                      Cierre: {new Date(closeDateDisplayValue).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {/* Separator */}
                <span className="text-gray-300 hidden sm:inline">|</span>

                {/* Owner (required) */}
                {isViewOnly ? (
                  <ReferenceInfoBar.UserDisplayItem
                    label="Responsable"
                    user={users.find(u => u.clerkId === responsibleId) || null}
                  />
                ) : (
                  <ReferenceInfoBar.UserSelectItem
                    label="Responsable *"
                    userId={responsibleId}
                    users={users}
                    isAdmin={isAdmin}
                    onChange={setResponsibleId}
                    placeholder="Seleccionar..."
                  />
                )}
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

          {/* Tabs — scrollable on mobile */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex px-3 md:px-4 pt-2 -mb-px overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px whitespace-nowrap flex-shrink-0 ${
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
                className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px whitespace-nowrap flex-shrink-0 ${
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
                className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px whitespace-nowrap flex-shrink-0 ${
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
                className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium transition-all border border-b-0 rounded-t-lg -mb-px whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'history'
                    ? 'bg-white text-gray-900 border-gray-200'
                    : 'bg-transparent text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Histórico
              </button>
            </div>
          </div>

      <form id="opportunity-modal-form" onSubmit={handleSubmit} className="bg-white min-h-[300px] md:min-h-[500px] flex flex-col">
            {error && (
              <div className="mx-3 md:mx-6 mt-3 md:mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
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
                    disabled={loading || isViewOnly}
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
                    projectionSummary={linkedBusinessProjection}
                    onEdit={handleEditBusiness}
                  />
                )}

                {linkedBookingRequest && (
                  <LinkedRequestSection
                    request={linkedBookingRequest}
                    projection={linkedBookingRequestProjection}
                    onView={handleViewLinkedRequest}
                  />
                )}
              </div>
            ) : null}

            {!loadingData && activeTab === 'activity' && (
              <div className="p-3 md:p-6">
                {!opportunity ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                    <EventIcon className="text-gray-400 mx-auto mb-3" style={{ fontSize: 48 }} />
                    <p className="text-sm text-gray-500 mb-2">Guarde la oportunidad primero para agregar tareas</p>
                    <p className="text-xs text-gray-400">Cree la oportunidad, luego regrese para agregar actividades</p>
                  </div>
                ) : (
                  <Suspense fallback={<OpportunityActivitySkeleton />}>
                    {isViewOnly ? (
                      <TaskManager
                        tasks={tasks}
                        onAddTask={() => {}}
                        onEditTask={() => {}}
                        onDeleteTask={() => {}}
                        onToggleComplete={() => {}}
                        isAdmin={isAdmin}
                        readOnly={true}
                      />
                    ) : (
                      <TaskManager
                        tasks={tasks}
                        onAddTask={() => openTaskModal()}
                        onDictateTask={() => activityDictation.toggle()}
                        onEditTask={(task) => openTaskModal(task)}
                        onDeleteTask={handleDeleteTask}
                        onToggleComplete={handleToggleTaskComplete}
                        isAdmin={isAdmin}
                        readOnly={false}
                        isDictating={activityDictation.state === 'recording' || activityDictation.state === 'processing'}
                      />
                    )}
                  </Suspense>
                )}
              </div>
            )}

            {!loadingData && activeTab === 'chat' && (
              <div className="p-3 md:p-6 bg-white h-full">
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
                      canEdit={canEdit}
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
              setCompletingTaskId(null)
              setTaskPrefill(null)
            }}
            task={selectedTask}
            onSubmit={handleTaskSubmit}
            loading={loading}
            error={error}
            businessName={linkedBusiness?.name || opportunity?.business?.name || ''}
            forCompletion={!!completingTaskId}
            responsibleName={opportunity?.responsible?.name || opportunity?.responsible?.email}
            prefillData={taskPrefill}
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
              setSelectedBusiness(updatedBusiness)
              setBusinessModalOpen(false)
              setSelectedBusiness(null)
            }}
            canEdit={!isViewOnly}
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

      {/* Activity Dictation Dialog */}
      {activityDictation.dialog.isOpen && (
        <Suspense fallback={null}>
          <ConfirmDialog
            isOpen={activityDictation.dialog.isOpen}
            title={activityDictation.dialog.mode === 'processing' ? 'Clasificando actividad' : 'Dictar Actividad'}
            message={(
              <div className="space-y-4 text-left">
                <AiVoiceVisualizer
                  mode={activityDictation.dialog.mode === 'recording' ? 'listening' : 'processing'}
                  className="mb-2"
                />

                {activityDictation.dialog.mode === 'recording' && (
                  <>
                    <p className="text-sm text-gray-600 text-center">
                      Describa la actividad. La IA detectará si es una tarea o reunión y completará los campos:
                    </p>
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                      <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700">
                        {activityDictation.dialog.items.map((item) => (
                          <li key={`activity-guide-${item.label}`}>
                            <span className="font-semibold">{item.label}:</span> {item.suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {activityDictation.dialog.mode === 'processing' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-indigo-700 text-center">
                      Clasificando la actividad y extrayendo los datos...
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      Esto puede tomar unos segundos.
                    </p>
                  </div>
                )}

                {activityDictation.error && (
                  <p className="text-xs text-red-600 text-center">{activityDictation.error}</p>
                )}
              </div>
            )}
            confirmText={activityDictation.dialog.mode === 'processing' ? 'Procesando...' : 'Detener dictado'}
            cancelText={activityDictation.dialog.mode === 'processing' ? '' : 'Ocultar guía'}
            confirmVariant="primary"
            loading={activityDictation.dialog.mode === 'processing'}
            loadingText="Procesando..."
            onConfirm={
              activityDictation.dialog.mode === 'processing'
                ? () => {}
                : activityDictation.handleDialogStop
            }
            onCancel={
              activityDictation.dialog.mode === 'processing'
                ? () => {}
                : activityDictation.handleDialogHide
            }
            zIndex={82}
          />
        </Suspense>
      )}

      {/* Activity Dictation - Missing Fields Dialog */}
      {activityDictation.missingDialog.isOpen && (
        <Suspense fallback={null}>
          <ConfirmDialog
            isOpen={activityDictation.missingDialog.isOpen}
            title={
              activityDictation.missingDialog.mode === 'recording'
                ? 'Escuchando...'
                : activityDictation.missingDialog.mode === 'processing'
                  ? 'Analizando...'
                  : 'Verificación de Datos'
            }
            message={(
              <>
                {(activityDictation.missingDialog.mode === 'recording' || activityDictation.missingDialog.mode === 'processing') && (
                  <div className="mb-4">
                    <AiVoiceVisualizer
                      mode={activityDictation.missingDialog.mode === 'recording' ? 'listening' : 'processing'}
                    />
                  </div>
                )}

                {activityDictation.missingDialog.mode === 'recording' && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 text-center">
                      El micrófono está activo. Presione <span className="font-semibold">Detener</span> cuando haya finalizado.
                    </p>
                    {(activityDictation.missingDialog.missingRequired.length > 0 || activityDictation.missingDialog.notDetected.length > 0) && (
                      <div className="text-left space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {activityDictation.missingDialog.missingRequired.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-rose-700 mb-1">Faltan para completar:</p>
                            <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                              {activityDictation.missingDialog.missingRequired.map((field) => (
                                <li key={`act-rec-missing-${field}`}>{field}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {activityDictation.missingDialog.notDetected.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-amber-700 mb-1">No detectados por IA:</p>
                            <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                              {activityDictation.missingDialog.notDetected.map((field) => (
                                <li key={`act-rec-notdet-${field}`}>{field}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activityDictation.missingDialog.mode === 'processing' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-indigo-700 text-center">
                      Procesando información adicional...
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      Esto puede tomar unos segundos.
                    </p>
                  </div>
                )}

                {activityDictation.missingDialog.mode === 'missing' && (
                  <div className="text-left space-y-3">
                    <p className="text-sm text-gray-600">
                      La IA ha completado la mayor parte, pero faltan algunos datos:
                    </p>
                    {activityDictation.missingDialog.missingRequired.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Faltan para completar:</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                          {activityDictation.missingDialog.missingRequired.map((field) => (
                            <li key={`act-missing-${field}`}>{field}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activityDictation.missingDialog.notDetected.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">No detectados por IA:</p>
                        <ul className="list-disc pl-5 space-y-0.5 text-xs text-gray-600">
                          {activityDictation.missingDialog.notDetected.map((field) => (
                            <li key={`act-notdet-${field}`}>{field}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Puede escribir estos datos en el formulario o volver a dictar.
                    </p>
                  </div>
                )}

                {activityDictation.error && (
                  <p className="mt-2 text-xs text-red-600 text-center">{activityDictation.error}</p>
                )}
              </>
            )}
            confirmText={
              activityDictation.missingDialog.mode === 'recording'
                ? 'Detener dictado'
                : activityDictation.missingDialog.mode === 'processing'
                  ? 'Procesando...'
                  : 'Dictar'
            }
            cancelText={
              activityDictation.missingDialog.mode === 'processing'
                ? ''
                : activityDictation.missingDialog.mode === 'recording'
                  ? 'Completar manualmente'
                  : 'Registrar manualmente'
            }
            confirmVariant="primary"
            loading={activityDictation.missingDialog.mode === 'processing'}
            loadingText="Procesando..."
            onConfirm={
              activityDictation.missingDialog.mode === 'recording'
                ? activityDictation.handleMissingStopDictation
                : activityDictation.missingDialog.mode === 'processing'
                  ? () => {}
                  : activityDictation.handleMissingDictate
            }
            onCancel={activityDictation.handleMissingManual}
            zIndex={84}
          />
        </Suspense>
      )}
    </>
  )
}
