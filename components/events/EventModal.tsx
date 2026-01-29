'use client'

import { createEvent, updateEvent, deleteEvent, bookEvent, rejectEvent, refreshCalendarData } from '@/app/actions/events'
import { useState, useEffect, useCallback, useTransition, useReducer } from 'react'
import dynamic from 'next/dynamic'
import CategorySelect from '@/components/shared/CategorySelect'
import BusinessSelect, { type BusinessWithStatus } from '@/components/shared/BusinessSelect'
import { getMaxDuration, getDaysDifference, getCategoryOptions, getCategoryColors, SEVEN_DAY_CATEGORIES } from '@/lib/categories'
import type { CategoryOption } from '@/lib/categories'
import { checkUniquenesViolation, check30DayMerchantRule, getDailyLimitStatus, getEventsOnDate, calculateNextAvailableDate } from '@/lib/event-validation'
import { formatDateForPanama, PANAMA_TIMEZONE } from '@/lib/date/timezone'
import type { Event, UserRole, EventModalPrefillData, BookingRequest } from '@/types'

// Extended type for linked booking request with user info
type LinkedBookingRequest = BookingRequest & {
  processedByUser?: { name: string | null; email: string | null } | null
  createdByUser?: { name: string | null; email: string | null } | null
  marketingCampaignId?: string | null
}
import { hasCategoryData } from '@/types'
import { getSettings, getBusinessException } from '@/lib/settings'
import WarningIcon from '@mui/icons-material/Warning'
import BlockIcon from '@mui/icons-material/Block'
import EventIcon from '@mui/icons-material/Event'
import VisibilityIcon from '@mui/icons-material/Visibility'
import toast from 'react-hot-toast'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import ModalShell from '@/components/shared/ModalShell'
import { Button, Input, Textarea, Alert } from '@/components/ui'

// ============================================================================
// useReducer: Consolidated form state management
// ============================================================================
type FormState = {
  // Form fields
  name: string
  description: string
  merchant: string
  startDate: string
  endDate: string
  categoryOption: CategoryOption | null
  // UI state
  showRejectionField: boolean
  rejectionReason: string
  showBookingRequestModal: boolean
  // Validation/warnings
  error: string
  durationWarning: string
  uniquenessWarning: string
  merchantWarning: string
  dailyLimitWarnings: string[]
  dateAdjustmentInfo: string
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: FormState[keyof FormState] }
  | { type: 'SET_FORM_DATA'; payload: Partial<FormState> }
  | { type: 'SET_WARNINGS'; payload: Pick<FormState, 'durationWarning' | 'uniquenessWarning' | 'merchantWarning' | 'dailyLimitWarnings' | 'dateAdjustmentInfo'> }
  | { type: 'CLEAR_WARNINGS' }
  | { type: 'RESET_FORM' }

const initialFormState: FormState = {
  name: '',
  description: '',
  merchant: '',
  startDate: '',
  endDate: '',
  categoryOption: null,
  showRejectionField: false,
  rejectionReason: '',
  showBookingRequestModal: false,
  error: '',
  durationWarning: '',
  uniquenessWarning: '',
  merchantWarning: '',
  dailyLimitWarnings: [],
  dateAdjustmentInfo: '',
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_FORM_DATA':
      return { ...state, ...action.payload }
    case 'SET_WARNINGS':
      return { ...state, ...action.payload }
    case 'CLEAR_WARNINGS':
      return {
        ...state,
        error: '',
        durationWarning: '',
        uniquenessWarning: '',
        merchantWarning: '',
        dailyLimitWarnings: [],
        dateAdjustmentInfo: '',
      }
    case 'RESET_FORM':
      return initialFormState
    default:
      return state
  }
}

// Lazy load the booking request view modal
const BookingRequestViewModal = dynamic(() => import('@/components/booking/request-view/BookingRequestViewModal'), {
  loading: () => null,
  ssr: false,
})


interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedEndDate?: Date
  eventToEdit?: Event | null
  bookingRequestId?: string // For creating events from booking requests
  allEvents?: Event[]
  userRole?: UserRole
  readOnly?: boolean // For sales users to view events without editing
  onSuccess?: (event: Event, action: 'create' | 'update' | 'delete' | 'book' | 'reject') => void
}

export default function EventModal({ isOpen, onClose, selectedDate, selectedEndDate, eventToEdit, bookingRequestId, allEvents = [], userRole = 'sales', readOnly = false, onSuccess }: EventModalProps) {
  const confirmDialog = useConfirmDialog()

  // React 19: useTransition for non-blocking UI during form actions
  const [isPending, startTransition] = useTransition()
  const loading = isPending
  
  // React 19: useReducer for consolidated form state management
  const [formState, dispatch] = useReducer(formReducer, initialFormState)
  const {
    name, description, merchant, startDate, endDate, categoryOption,
    showRejectionField, rejectionReason, showBookingRequestModal,
    error, durationWarning, uniquenessWarning, merchantWarning, dailyLimitWarnings, dateAdjustmentInfo,
  } = formState
  
  // Separate state for data that doesn't fit the form pattern
  const [userSettings, setUserSettings] = useState(getSettings())
  const [linkedBookingRequest, setLinkedBookingRequest] = useState<LinkedBookingRequest | null>(null)
  
  // Helper functions to dispatch common actions
  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])
  
  const setFormData = useCallback((data: Partial<FormState>) => {
    dispatch({ type: 'SET_FORM_DATA', payload: data })
  }, [])
  
  const setError = useCallback((value: string) => setField('error', value), [setField])

  // Helper to generate event name from business and date
  const generateEventName = useCallback((businessName: string, dateStr: string) => {
    if (!businessName || !dateStr) return ''
    const date = new Date(dateStr + 'T12:00:00')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const formatted = `${monthNames[date.getMonth()]}-${date.getDate()}-${date.getFullYear()}`
    return `${businessName} | ${formatted}`
  }, [])

  // Reload settings when modal opens (in case they changed)
  useEffect(() => {
    if (isOpen) {
      setUserSettings(getSettings())
    }
  }, [isOpen])

  // Fetch linked booking request when editing an event or when clicking from sidebar
  useEffect(() => {
    async function fetchLinkedBookingRequest() {
      // Get booking request ID from event or prop
      const requestId = eventToEdit?.bookingRequestId || bookingRequestId
      
      if (isOpen && requestId) {
        try {
          const { getBookingRequest } = await import('@/app/actions/booking-requests')
          const result = await getBookingRequest(requestId)
          if (result.success && result.data) {
            setLinkedBookingRequest(result.data)
          }
        } catch (err) {
          console.error('Failed to fetch linked booking request:', err)
        }
      } else {
        setLinkedBookingRequest(null)
      }
    }
    fetchLinkedBookingRequest()
  }, [isOpen, eventToEdit, bookingRequestId])

  // Update description when linkedBookingRequest is loaded (for creating from booking request)
  useEffect(() => {
    // Only update if we're creating (not editing) and have a booking request
    if (!eventToEdit && linkedBookingRequest) {
      // Use aboutOffer as primary description, fall back to whatWeLike or additionalComments
      const req = linkedBookingRequest as { aboutOffer?: string; whatWeLike?: string; additionalComments?: string }
      const desc = req?.aboutOffer || req?.whatWeLike || req?.additionalComments || ''
      if (desc) setField('description', desc)
    }
  }, [linkedBookingRequest, eventToEdit, setField])

// Pre-fill form when editing or creating with date or PDF data
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        // Editing mode - pre-fill with event data
        const descriptionToUse = eventToEdit.description || ''
        
        setFormData({
          name: eventToEdit.name,
          description: descriptionToUse,
          merchant: linkedBookingRequest?.merchant || eventToEdit.merchant || '',
          startDate: formatDateForPanama(new Date(eventToEdit.startDate)),
          endDate: formatDateForPanama(new Date(eventToEdit.endDate)),
        })

        // Find matching category option - prefer booking request category data
        const options = getCategoryOptions();
        let match: CategoryOption | undefined;
        
        const parentCat = linkedBookingRequest?.parentCategory || eventToEdit.parentCategory
        const sub1Cat = linkedBookingRequest?.subCategory1 || eventToEdit.subCategory1
        const sub2Cat = linkedBookingRequest?.subCategory2 || eventToEdit.subCategory2
        
        if (parentCat) {
            match = options.find(opt => {
                // Normalize values to null for comparison
                const optSub1 = opt.sub1 || null;
                const optSub2 = opt.sub2 || null;
                const targetSub1 = sub1Cat || null;
                const targetSub2 = sub2Cat || null;
                
                return (
                    opt.parent === parentCat && 
                    optSub1 === targetSub1 && 
                    optSub2 === targetSub2
                );
            });
            
            // If exact match not found, try matching just parent category
             if (!match) {
              match = options.find(opt => opt.parent === parentCat && !opt.sub1)
             }
             
            // If still no match, try any option with this parent
             if (!match) {
              match = options.find(opt => opt.parent === parentCat)
            }
        }
        
        // Fallback for legacy or if exact match fail
        if (!match && eventToEdit.category) {
            match = options.find(opt => opt.label === eventToEdit.category || opt.value === eventToEdit.category);
        }
        
        setField('categoryOption', match || null)

      } else if (linkedBookingRequest && !eventToEdit) {
        // Creating from booking request - pre-fill with booking request data
        // Use aboutOffer as primary description, fall back to whatWeLike or additionalComments
        const req = linkedBookingRequest as { aboutOffer?: string; whatWeLike?: string; additionalComments?: string }
        const desc = req?.aboutOffer || req?.whatWeLike || req?.additionalComments || ''
        setFormData({
          name: linkedBookingRequest.name || '',
          description: desc,
          merchant: linkedBookingRequest.merchant || '',
        })
        
        // Set category from booking request
        const options = getCategoryOptions()
        let match: CategoryOption | undefined
        
        if (linkedBookingRequest.parentCategory) {
          match = options.find(opt => {
            const optSub1 = opt.sub1 || null
            const optSub2 = opt.sub2 || null
            const targetSub1 = linkedBookingRequest.subCategory1 || null
            const targetSub2 = linkedBookingRequest.subCategory2 || null
            
            return (
              opt.parent === linkedBookingRequest.parentCategory &&
              optSub1 === targetSub1 &&
              optSub2 === targetSub2
            )
          })
          
          if (!match) {
            match = options.find(opt => opt.parent === linkedBookingRequest.parentCategory && !opt.sub1)
          }
          
          if (!match) {
            match = options.find(opt => opt.parent === linkedBookingRequest.parentCategory)
          }
        }
        
        setField('categoryOption', match || null)
        
        // Set dates if available from booking request
        if (linkedBookingRequest.startDate) {
          setField('startDate', formatDateForPanama(new Date(linkedBookingRequest.startDate)))
        }
        if (linkedBookingRequest.endDate) {
          setField('endDate', formatDateForPanama(new Date(linkedBookingRequest.endDate)))
        } else if (selectedDate) {
          // Fallback to selected date if no end date
          const start = new Date(selectedDate)
          const end = selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)
          setFormData({
            startDate: formatDateForPanama(start),
            endDate: formatDateForPanama(end),
          })
        }
      } else if (selectedDate) {
        // Creating mode - pre-fill dates from calendar
        const start = new Date(selectedDate)
        const end = selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)
        
        setFormData({
          startDate: formatDateForPanama(start),
          endDate: formatDateForPanama(end),
        })
      }
    } else {
      // Reset when modal closes
      dispatch({ type: 'RESET_FORM' })
    }
  }, [selectedDate, selectedEndDate, eventToEdit, isOpen, allEvents, linkedBookingRequest, setFormData, setField])

  // Check all validations whenever relevant fields change
  useEffect(() => {
    if (!startDate || !endDate) {
      dispatch({ type: 'CLEAR_WARNINGS' })
      return
    }

    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    
    const categoryLabel = categoryOption ? categoryOption.label : ''
    const parentCategory = categoryOption ? categoryOption.parent : ''
    
    // Compute all warnings together
    let newDurationWarning = ''
    let newUniquenessWarning = ''
    let newMerchantWarning = ''
    const newDailyLimitWarnings: string[] = []
    
    // Duration validation (check business exceptions first)
    if (parentCategory) {
      const duration = getDaysDifference(start, end)
      
      // Check for business exception on duration
      let maxDuration = getMaxDuration(parentCategory)
      if (merchant) {
        const exceptionDuration = getBusinessException(merchant, 'duration', userSettings.businessExceptions)
        if (exceptionDuration !== null) {
          maxDuration = exceptionDuration
        }
      }
      
      if (duration > maxDuration) {
        newDurationWarning = `Esta categoría principal (${parentCategory}) tiene un máximo de ${maxDuration} días. Duración actual: ${duration} días.`
      }
    }
    
    // Uniqueness validation
    if (categoryLabel) {
      const uniqueCheck = checkUniquenesViolation(
        allEvents,
        { category: categoryLabel, startDate: start, endDate: end },
        eventToEdit?.id
      )
      
      if (uniqueCheck.violated && uniqueCheck.conflictingEvent) {
        newUniquenessWarning = `Ya existe otra oferta de "${categoryLabel}" activa en estas fechas: "${uniqueCheck.conflictingEvent.name}"`
      }
    }
    
    // 30-day merchant rule (with business exceptions)
    if (merchant) {
      const merchantCheck = check30DayMerchantRule(
        allEvents, 
        merchant, 
        start, 
        eventToEdit?.id,
        userSettings.merchantRepeatDays,
        userSettings.businessExceptions
      )
      
      if (merchantCheck.violated && merchantCheck.lastEvent) {
        const requiredDays = merchantCheck.daysUntilAllowed! + Math.floor((start.getTime() - new Date(merchantCheck.lastEvent.endDate).getTime()) / (1000 * 60 * 60 * 24))
        newMerchantWarning = `El negocio "${merchant}" tuvo una oferta hace menos de ${requiredDays} días. Debe esperar ${merchantCheck.daysUntilAllowed} días más.`
      }
    }
    
    // Daily limit check for all days in range (check for daily limit exemption)
    // Check if this merchant is exempt from daily limits
    const isDailyLimitExempt = merchant 
      ? getBusinessException(merchant, 'dailyLimitExempt', userSettings.businessExceptions) === 1
      : false
    
    if (!isDailyLimitExempt) {
      // Only check the launch date (start date) for daily limits
      // Daily count is based on launch date, not on all days in the event range
      // Count events with 'booked' or 'pre-booked' status (both count for restrictions)
      const bookedEvents = allEvents.filter(event => event.status === 'booked' || event.status === 'pre-booked')
      const launchDate = new Date(start)
      const eventsOnLaunchDay = getEventsOnDate(bookedEvents, launchDate).filter(e => 
        e.id !== eventToEdit?.id // Exclude current event if editing
      )
      const count = eventsOnLaunchDay.length + 1 // +1 for the event we're creating/editing
      const status = getDailyLimitStatus(count, userSettings.minDailyLaunches, userSettings.maxDailyLaunches)
      
      if (status === 'over') {
        const dateStr = launchDate.toLocaleDateString('es-PA', { timeZone: PANAMA_TIMEZONE, month: 'short', day: 'numeric' })
        newDailyLimitWarnings.push(`${dateStr}: ${count} ofertas (máx ${userSettings.maxDailyLaunches})`)
      }
    }
    
    // Batch update all warnings at once
    dispatch({
      type: 'SET_WARNINGS',
      payload: {
        durationWarning: newDurationWarning,
        uniquenessWarning: newUniquenessWarning,
        merchantWarning: newMerchantWarning,
        dailyLimitWarnings: newDailyLimitWarnings,
        dateAdjustmentInfo: '',
      },
    })
    
  }, [startDate, endDate, categoryOption, merchant, allEvents, eventToEdit, userSettings])

  // Check if all required fields are filled
  const hasEmptyRequiredFields = () => {
    return !name || !categoryOption || !merchant || !startDate || !endDate
  }

  // Only required fields block guardado; advertencias no bloquean
  const hasBlockingErrors = () => {
    return !!hasEmptyRequiredFields()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    // Check for empty required fields first
    if (hasEmptyRequiredFields()) {
      setError('Por favor completa todos los campos requeridos (*)')
      return
    }
    
    setError('')

    const formData = new FormData(event.currentTarget)
    if (categoryOption) {
      formData.set('category', categoryOption.label) // Store full path as category for display
      formData.set('parentCategory', categoryOption.parent)
      if (categoryOption.sub1) formData.set('subCategory1', categoryOption.sub1)
      if (categoryOption.sub2) formData.set('subCategory2', categoryOption.sub2)
    }
    
    // If creating from a booking request, include the booking request ID
    if (!eventToEdit && linkedBookingRequest) {
      formData.set('bookingRequestId', linkedBookingRequest.id)
    }

    const warningMessages: string[] = []
    if (durationWarning) warningMessages.push(durationWarning)
    if (uniquenessWarning) warningMessages.push(uniquenessWarning)
    if (merchantWarning) warningMessages.push(merchantWarning)
    if (dailyLimitWarnings.length > 0) warningMessages.push(...dailyLimitWarnings)

    // React 19: Wrap async save in startTransition
    const proceedSave = () => {
      startTransition(async () => {
        try {
          let result: Event
          if (eventToEdit) {
            result = await updateEvent(eventToEdit.id, formData)
            if (onSuccess) {
              onSuccess(result, 'update')
            }
          } else {
            result = await createEvent(formData)
            if (onSuccess) {
              onSuccess(result, 'create')
            }
          }
          
          dispatch({ type: 'RESET_FORM' })
          onClose()
        } catch (err) {
          setField('error', err instanceof Error ? err.message : `Error al ${eventToEdit ? 'actualizar' : 'crear'} el evento`)
        }
      })
    }

    if (warningMessages.length > 0) {
      const confirmed = await confirmDialog.confirm({
        title: '¿Guardar con advertencias?',
        message: `Se detectaron las siguientes advertencias:\n- ${warningMessages.join('\n- ')}\n\n¿Seguro que deseas guardar de todas formas?`,
        confirmText: 'Sí, guardar de todas formas',
        cancelText: 'Cancelar',
        confirmVariant: 'primary',
      })
      if (!confirmed) return
    }

    proceedSave()
  }

  // React 19: Delete handler using useTransition
  async function handleDelete() {
    if (!eventToEdit) return
    
    const confirmed = await confirmDialog.confirm({
      title: 'Eliminar Evento',
      message: '¿Está seguro de que desea eliminar este evento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmVariant: 'danger',
    })

    if (!confirmed) return

    // Optimistic update: remove from UI immediately
    if (onSuccess) {
      onSuccess(eventToEdit, 'delete')
    }

    startTransition(async () => {
      try {
        await deleteEvent(eventToEdit.id)
        toast.success('Evento eliminado exitosamente')
        // onSuccess callback already called for optimistic update
        onClose()
      } catch (err) {
        // Optimistic update already rolled back via onSuccess
        const errorMsg = err instanceof Error ? err.message : 'Error al eliminar el evento'
        setField('error', errorMsg)
        toast.error(errorMsg)
      }
    })
  }

  // React 19: Book handler using useTransition
  async function handleBook() {
    if (!eventToEdit) return
    
    const confirmed = await confirmDialog.confirm({
      title: 'Reservar Evento',
      message: '¿Está seguro de que desea reservar este evento? Se finalizará.',
      confirmText: 'Reservar',
      cancelText: 'Cancelar',
      confirmVariant: 'primary',
    })

    if (!confirmed) return

    // Optimistic update: update status immediately
    const updatedEvent = { ...eventToEdit, status: 'booked' as const }
    if (onSuccess) {
      onSuccess(updatedEvent, 'book')
    }

    startTransition(async () => {
      try {
        // Import the book function
        const { bookEvent } = await import('@/app/actions/events')
        const result = await bookEvent(eventToEdit.id) as {
          event?: unknown
          externalApi?: {
            success: boolean
            externalId?: number
            error?: string
            logId?: string
          } | null
        }
        toast.success('Evento reservado exitosamente')

        const externalApi = result?.externalApi ?? null

        // Show external API result (success/failure) after booking
        if (externalApi) {
          const isOk = externalApi.success === true
          const lines: string[] = []
          lines.push(isOk ? 'Deal was sent to OfertaSimple successfully.' : 'Deal FAILED to send to OfertaSimple.')
          if (externalApi.success && externalApi.externalId) {
            lines.push(`OfertaSimple Deal ID: ${externalApi.externalId}`)
          }
          if (!externalApi.success && externalApi.error) lines.push(`Error: ${externalApi.error}`)
          if (externalApi.logId) lines.push(`Log ID: ${externalApi.logId}`)
          lines.push('Check Settings → API Logs for full request/response details.')

          await confirmDialog.confirm({
            title: isOk ? 'OfertaSimple: Success' : 'OfertaSimple: Failed',
            message: lines.join('\n'),
            confirmText: 'OK',
            cancelText: 'Close',
            confirmVariant: isOk ? 'success' : 'danger',
          })
        } else {
          // No external API call was attempted (e.g. no booking request linked)
          await confirmDialog.confirm({
            title: 'OfertaSimple',
            message: 'No external API call was made for this booking (no linked booking request or missing data).',
            confirmText: 'OK',
            cancelText: 'Close',
            confirmVariant: 'primary',
          })
        }

        // onSuccess callback already called for optimistic update
        onClose()
      } catch (err) {
        // Optimistic update already rolled back via onSuccess
        const errorMsg = err instanceof Error ? err.message : 'Error al reservar el evento'
        setField('error', errorMsg)
        toast.error(errorMsg)
      }
    })
  }

  // React 19: Reject handler using useTransition
  function handleReject() {
    if (!eventToEdit) return
    
    if (!rejectionReason.trim()) {
      setField('error', 'Please provide a reason for rejection')
      return
    }

    // Optimistic update: update status immediately
    const updatedEvent = { ...eventToEdit, status: 'rejected' as const }
    if (onSuccess) {
      onSuccess(updatedEvent, 'reject')
    }

    startTransition(async () => {
      try {
        // Import the reject function
        const { rejectEvent } = await import('@/app/actions/events')
        await rejectEvent(eventToEdit.id, rejectionReason)
        // onSuccess callback already called for optimistic update
        onClose()
      } catch (err) {
        // Optimistic update already rolled back via onSuccess
        setField('error', err instanceof Error ? err.message : 'Failed to reject event')
      }
    })
  }

  if (!isOpen) return null

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={readOnly ? 'Ver Evento' : (eventToEdit ? 'Editar Evento' : 'Crear Evento')}
        icon={<EventIcon fontSize="small" />}
        iconColor="blue"
        maxWidth="2xl"
        autoHeight={true}
        backdropClassName={showBookingRequestModal ? 'md:justify-start' : ''}
      >
        {/* Form - Scrollable content */}
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
            {/* Linked Booking Request - Top Banner */}
            {linkedBookingRequest && (
              <button
                type="button"
                onClick={() => setField('showBookingRequestModal', true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 hover:from-indigo-100 hover:via-purple-100 hover:to-indigo-100 transition-all group"
              >
                <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                <span className="text-xs font-medium text-indigo-800 truncate">{linkedBookingRequest.name}</span>
                <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    linkedBookingRequest.sourceType === 'public_link' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {linkedBookingRequest.sourceType === 'public_link' ? 'Público' : 'Interno'}
                    </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                    linkedBookingRequest.status === 'approved' ? 'bg-green-100 text-green-700' :
                    linkedBookingRequest.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                    linkedBookingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                    }`}>
                      {linkedBookingRequest.status?.charAt(0).toUpperCase() + linkedBookingRequest.status?.slice(1)}
                  </span>
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )}

            {/* Warnings Section - Collapsed */}
            {(error || durationWarning || uniquenessWarning || merchantWarning || dailyLimitWarnings.length > 0 || dateAdjustmentInfo || hasEmptyRequiredFields()) && (
              <div className="px-4 py-2 space-y-1.5 bg-gray-50">
                {hasEmptyRequiredFields() && (
                  <Alert variant="error" icon={<BlockIcon fontSize="small" />}>
                    Completa los campos requeridos (*)
              </Alert>
            )}
            {error && <Alert variant="error">{error}</Alert>}
                {durationWarning && <Alert variant="warning">{durationWarning}</Alert>}
                {uniquenessWarning && <Alert variant="warning">{uniquenessWarning}</Alert>}
                {merchantWarning && <Alert variant="warning">{merchantWarning}</Alert>}
                {dateAdjustmentInfo && <Alert variant="info">{dateAdjustmentInfo}</Alert>}
                {dailyLimitWarnings.length > 0 && (
                  <Alert variant="error">
                    Excede máx. {userSettings.maxDailyLaunches}/día: {dailyLimitWarnings.join(', ')}
              </Alert>
            )}
              </div>
            )}

            {/* Business Selection */}
            <div className="px-4 py-3">
              {readOnly ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Negocio</span>
                  <span className="text-sm font-semibold text-gray-900">{merchant}</span>
                  </div>
              ) : (
                <BusinessSelect
                  value={merchant}
                  onChange={(businessName) => {
                    setField('merchant', businessName)
                    if (!eventToEdit && startDate) {
                      setField('name', generateEventName(businessName, startDate))
                    }
                  }}
                  label="Negocio *"
                  required
                  error={!merchant ? 'Requerido' : undefined}
                />
              )}
            </div>

            {/* Event Details Section */}
            <div className="px-4 py-3 space-y-3">
              {/* Name & Category Row */}
              <div className="grid grid-cols-2 gap-3">
            <Input
                id="name"
                name="name"
              type="text"
                  label={readOnly ? 'Nombre' : 'Nombre *'}
              required={!readOnly}
                value={name}
              onChange={(e) => !readOnly && setField('name', e.target.value)}
              readOnly={readOnly}
                placeholder="Nombre del evento"
              />
            <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {readOnly ? 'Categoría' : 'Categoría *'}
              </label>
              {readOnly ? (
                    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50">
                      {categoryOption?.label || '-'}
                </div>
              ) : (
                <>
              <CategorySelect selectedOption={categoryOption} onChange={(opt) => setField('categoryOption', opt)} />
                      {!categoryOption && <p className="text-[10px] text-red-500 mt-0.5">Requerido</p>}
                </>
              )}
            </div>
              </div>
            <input type="hidden" name="merchant" value={merchant} />

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
              <Input
                  id="startDate"
                  name="startDate"
                type="date"
                  label={readOnly ? 'Inicio' : 'Inicio *'}
                required={!readOnly}
                  value={startDate}
                  onChange={(e) => {
                    if (readOnly) return
                    const newDate = e.target.value
                    setField('startDate', newDate)
                    if (!eventToEdit && merchant) {
                      setField('name', generateEventName(merchant, newDate))
                    }
                  }}
                readOnly={readOnly}
              />
              <Input
                  id="endDate"
                  name="endDate"
                type="date"
                  label={readOnly ? 'Fin' : 'Fin *'}
                required={!readOnly}
                  value={endDate}
                onChange={(e) => !readOnly && setField('endDate', e.target.value)}
                readOnly={readOnly}
                />
            </div>

              {/* Description */}
              <Textarea
                id="description"
                name="description"
                label={readOnly ? 'Descripción' : 'Descripción *'}
                rows={2}
                value={description}
                onChange={(e) => !readOnly && setField('description', e.target.value)}
                readOnly={readOnly}
                required={!readOnly}
                placeholder="Descripción del evento..."
              />
            </div>

            {/* Rejection Reason Field */}
            {eventToEdit && eventToEdit.status === 'approved' && showRejectionField && userRole === 'admin' && (
              <div className="px-4 py-3 bg-red-50">
                <Textarea
                  id="rejectionReason"
                  label="Razón de Rechazo *"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setField('rejectionReason', e.target.value)}
                  className="border-red-300 focus:ring-red-500"
                  placeholder="Explique por qué se está rechazando..."
                />
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
              <div>
                {!readOnly && eventToEdit && userRole === 'admin' && eventToEdit.status !== 'approved' && (
                  <Button type="button" onClick={handleDelete} variant="ghost" size="sm" disabled={loading} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    Eliminar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {readOnly ? (
                  <Button type="button" onClick={onClose} variant="secondary" size="sm">Cerrar</Button>
                ) : (
                  <>
                    <Button type="button" onClick={onClose} variant="ghost" size="sm">Cancelar</Button>
                {eventToEdit && (eventToEdit.status === 'approved' || eventToEdit.status === 'pending') && userRole === 'admin' ? (
                      !showRejectionField ? (
                      <>
                          <Button type="button" onClick={() => setField('showRejectionField', true)} variant="destructive" size="sm" disabled={loading}>
                          Rechazar
                        </Button>
                          <Button type="button" onClick={handleBook} disabled={loading || hasEmptyRequiredFields()} loading={loading} size="sm" className="bg-green-600 hover:bg-green-700">
                            Reservar
                        </Button>
                      </>
                    ) : (
                        <Button type="button" onClick={handleReject} variant="destructive" size="sm" disabled={loading || !rejectionReason.trim()} loading={loading}>
                        Confirmar Rechazo
                      </Button>
                      )
                ) : (
                      <Button type="submit" disabled={loading || hasEmptyRequiredFields()} loading={loading} size="sm">
                        {eventToEdit ? 'Guardar' : 'Crear'}
                </Button>
                    )}
                  </>
                )}
              </div>
            </div>
        </form>
      </ModalShell>

      {/* Confirm Dialog - z-index 80 to appear above ModalShell (z-70) */}
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

      {/* Booking Request View Modal */}
      <BookingRequestViewModal
        isOpen={showBookingRequestModal}
        onClose={() => setField('showBookingRequestModal', false)}
        requestId={linkedBookingRequest?.id || null}
        hideBackdrop={true}
      />
    </>
  )
}
