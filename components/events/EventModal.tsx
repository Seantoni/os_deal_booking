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
  // Note: BookingRequest no longer has description field - use businessReview if needed
  useEffect(() => {
    // Only update if we're creating (not editing) and have a booking request
    if (!eventToEdit && linkedBookingRequest) {
      // Use businessReview as event description if available
      const desc = (linkedBookingRequest as { businessReview?: string })?.businessReview || ''
      if (desc) setField('description', desc)
    }
  }, [linkedBookingRequest, eventToEdit])

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
        // Use businessReview as fallback description
        const desc = (linkedBookingRequest as { businessReview?: string })?.businessReview || ''
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className={`flex min-h-screen p-4 transition-all duration-300 items-center ${
        showBookingRequestModal 
          ? 'justify-start' 
          : 'justify-center'
      }`}>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-all"
          onClick={onClose}
        ></div>

        {/* Modal - when side panel open, position in left half of screen */}
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300"
          style={showBookingRequestModal ? { 
            marginLeft: 'calc(25% - 320px)', // Center in left half (50% / 2 - half modal width)
            maxWidth: '640px' 
          } : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              {readOnly ? 'Ver Evento' : (eventToEdit ? 'Editar Evento' : 'Crear Nuevo Evento')}
            </h2>
            <Button
              onClick={onClose}
              variant="ghost"
              className="p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Show linked booking request info when editing an event or creating from sidebar */}
            {linkedBookingRequest && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                    <span className="font-semibold text-indigo-800">Solicitud de Booking Vinculada</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    linkedBookingRequest.sourceType === 'public_link' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                      {linkedBookingRequest.sourceType === 'public_link' ? 'Enlace Público' : 'Interno'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      linkedBookingRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                      linkedBookingRequest.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                      linkedBookingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {linkedBookingRequest.status?.charAt(0).toUpperCase() + linkedBookingRequest.status?.slice(1)}
                  </span>
                </div>
                  <Button
                    type="button"
                    onClick={() => setField('showBookingRequestModal', true)}
                    variant="primary"
                    size="sm"
                    leftIcon={<VisibilityIcon style={{ fontSize: 14 }} />}
                  >
                    Ver Solicitud Completa
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Negocio:</span>
                    <span className="ml-2 text-gray-900 font-medium">{linkedBookingRequest.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Correo:</span>
                    <span className="ml-2 text-gray-900 font-medium">{linkedBookingRequest.businessEmail}</span>
                  </div>
                  {linkedBookingRequest.merchant && (
                    <div>
                      <span className="text-gray-500">Comerciante:</span>
                      <span className="ml-2 text-gray-900 font-medium">{linkedBookingRequest.merchant}</span>
                    </div>
                  )}
                  {linkedBookingRequest.parentCategory && (
                    <div>
                      <span className="text-gray-500">Categoría:</span>
                      <span className="ml-2 text-gray-900 font-medium">{linkedBookingRequest.parentCategory}</span>
                    </div>
                  )}
                    </div>
              </div>
            )}
            
            {dateAdjustmentInfo && (
              <Alert variant="info" icon={<EventIcon fontSize="small" />}>
                {dateAdjustmentInfo}
              </Alert>
            )}
            
            {error && <Alert variant="error">{error}</Alert>}
            
            {durationWarning && (
              <Alert variant="warning" icon={<WarningIcon fontSize="small" />}>
                {durationWarning}
              </Alert>
            )}
            
            {uniquenessWarning && (
              <Alert variant="warning" className="bg-orange-50 border-orange-200 text-orange-800">
                {uniquenessWarning}
              </Alert>
            )}
            
            {merchantWarning && (
              <Alert variant="warning" className="bg-purple-50 border-purple-200 text-purple-800">
                {merchantWarning}
              </Alert>
            )}
            
            {dailyLimitWarnings.length > 0 && (
              <Alert variant="error" icon={<WarningIcon fontSize="small" />}>
                  <div>
                    <strong>Días que exceden el máximo de {userSettings.maxDailyLaunches} ofertas:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {dailyLimitWarnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
              </Alert>
            )}
            
            {hasEmptyRequiredFields() && (
              <Alert variant="error" icon={<BlockIcon fontSize="small" />} className="bg-red-100 border-red-300 text-red-900 font-medium">
                  Por favor completa todos los campos requeridos (*)
              </Alert>
            )}

            <Input
                id="name"
                name="name"
              type="text"
              label={`Nombre del Evento ${!readOnly ? '*' : ''}`}
              required={!readOnly}
                value={name}
              onChange={(e) => !readOnly && setField('name', e.target.value)}
              readOnly={readOnly}
                placeholder="Nombre del evento"
              />

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría {!readOnly && '*'}
              </label>
              {readOnly ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {categoryOption?.label || 'No hay categoría seleccionada'}
                </div>
              ) : (
                <>
              <CategorySelect selectedOption={categoryOption} onChange={(opt) => setField('categoryOption', opt)} />
              {!categoryOption && (
                <p className="text-xs text-red-600 mt-1">Categoría es requerida</p>
                  )}
                </>
              )}
            </div>

            {readOnly ? (
              <Input
                id="merchant"
                name="merchant"
                type="text"
                label="Negocio"
                value={merchant}
                readOnly={true}
              />
            ) : (
              <BusinessSelect
                value={merchant}
                onChange={(businessName) => setField('merchant', businessName)}
                label="Negocio"
                required
                error={!merchant ? 'El negocio es requerido' : undefined}
              />
            )}
            {/* Hidden input for form submission */}
            <input type="hidden" name="merchant" value={merchant} />

            <Textarea
                id="description"
                name="description"
              label={`Descripción ${!readOnly ? '*' : ''}`}
                rows={3}
                value={description}
              onChange={(e) => !readOnly && setField('description', e.target.value)}
              readOnly={readOnly}
              required={!readOnly}
                placeholder="Descripción del evento..."
              />

            <div className="grid grid-cols-2 gap-4">
              <Input
                  id="startDate"
                  name="startDate"
                type="date"
                label={`Fecha de Inicio ${!readOnly ? '*' : ''}`}
                required={!readOnly}
                  value={startDate}
                onChange={(e) => !readOnly && setField('startDate', e.target.value)}
                readOnly={readOnly}
              />

              <Input
                  id="endDate"
                  name="endDate"
                type="date"
                label={`Fecha de Fin ${!readOnly ? '*' : ''}`}
                required={!readOnly}
                  value={endDate}
                onChange={(e) => !readOnly && setField('endDate', e.target.value)}
                readOnly={readOnly}
                />
            </div>

            {/* Rejection Reason Field - Only for approved events when rejecting */}
            {eventToEdit && eventToEdit.status === 'approved' && showRejectionField && userRole === 'admin' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <Textarea
                  id="rejectionReason"
                  label="Razón de Rechazo *"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setField('rejectionReason', e.target.value)}
                  className="border-red-300 focus:ring-red-500"
                  placeholder="Explique por qué se está rechazando esta reserva..."
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {!readOnly && eventToEdit && userRole === 'admin' && eventToEdit.status !== 'approved' && (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    variant="destructive"
                    size="sm"
                    disabled={loading}
                  >
                    Eliminar Evento
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {readOnly ? (
                  /* Read-only mode: Only show Close button */
                  <Button
                  type="button"
                  onClick={onClose}
                    className="bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-500 disabled:bg-gray-300"
                  >
                    Cerrar
                  </Button>
                ) : (
                  <>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                >
                  Cancelar
                </Button>
                
                {/* For pending/approved events: Show Book and Reject buttons (admin only) */}
                {eventToEdit && (eventToEdit.status === 'approved' || eventToEdit.status === 'pending') && userRole === 'admin' ? (
                  <>
                    {!showRejectionField ? (
                      <>
                        <Button
                          type="button"
                          onClick={() => setField('showRejectionField', true)}
                          variant="destructive"
                          disabled={loading}
                        >
                          Rechazar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleBook}
                          disabled={loading || hasEmptyRequiredFields()}
                          loading={loading}
                          className="bg-green-600 hover:bg-green-700 focus-visible:ring-green-500 disabled:bg-green-300"
                        >
                          Reservar Evento
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleReject}
                        variant="destructive"
                        disabled={loading || !rejectionReason.trim()}
                        loading={loading}
                      >
                        Confirmar Rechazo
                      </Button>
                    )}
                  </>
                ) : (
                  /* For booked events or new events: Show regular Save button */
                <Button
                  type="submit"
                  disabled={loading || hasEmptyRequiredFields()}
                  loading={loading}
                  title={hasEmptyRequiredFields() ? 'Completa los campos requeridos para continuar' : ''}
                >
                  {eventToEdit ? 'Guardar Cambios' : 'Crear Evento'}
                </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

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

      {/* Booking Request View Modal */}
      <BookingRequestViewModal
        isOpen={showBookingRequestModal}
        onClose={() => setField('showBookingRequestModal', false)}
        requestId={linkedBookingRequest?.id || null}
        hideBackdrop={true}
      />
    </div>
  )
}
