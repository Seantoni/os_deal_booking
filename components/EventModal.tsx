'use client'

import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CategorySelect from './CategorySelect'
import { getMaxDuration, getDaysDifference, getCategoryOptions, CategoryOption } from '@/lib/categories'
import { checkUniquenesViolation, check30DayMerchantRule, getDailyLimitStatus, getEventsOnDate } from '@/lib/validation'
import type { ParsedBookingData } from '@/app/actions/pdf-parse'
import { getSettings, getBusinessException } from '@/lib/settings'
import WarningIcon from '@mui/icons-material/Warning'
import BlockIcon from '@mui/icons-material/Block'
import EventIcon from '@mui/icons-material/Event'

type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  parentCategory: string | null
  subCategory1: string | null
  subCategory2: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
  status: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedEndDate?: Date
  eventToEdit?: Event | null
  allEvents?: Event[]
  pdfExtractedData?: ParsedBookingData | null
  userRole?: string
}

export default function EventModal({ isOpen, onClose, selectedDate, selectedEndDate, eventToEdit, allEvents = [], pdfExtractedData, userRole = 'sales' }: EventModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryOption, setCategoryOption] = useState<CategoryOption | null>(null)
  const [merchant, setMerchant] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [durationWarning, setDurationWarning] = useState('')
  const [uniquenessWarning, setUniquenessWarning] = useState('')
  const [merchantWarning, setMerchantWarning] = useState('')
  const [dailyLimitWarnings, setDailyLimitWarnings] = useState<string[]>([])
  const [dateAdjustmentInfo, setDateAdjustmentInfo] = useState('')
  const [userSettings, setUserSettings] = useState(getSettings())
  const [showRejectionField, setShowRejectionField] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // Reload settings when modal opens (in case they changed)
  useEffect(() => {
    if (isOpen) {
      setUserSettings(getSettings())
    }
  }, [isOpen])

  // Format date for date input (full day only) - use Panama timezone for consistency
  const formatDate = (date: Date) => {
    const d = new Date(date)
    // Use Panama timezone to get the correct date
    return d.toLocaleDateString('en-CA', {
      timeZone: 'America/Panama', // Panama EST (UTC-5)
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }) // Returns YYYY-MM-DD format
  }

  // Pre-fill form when editing or creating with date or PDF data
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        // Editing mode - pre-fill with event data
        setName(eventToEdit.name)
        setDescription(eventToEdit.description || '')
        setMerchant(eventToEdit.merchant || '')
        setStartDate(formatDate(new Date(eventToEdit.startDate)))
        setEndDate(formatDate(new Date(eventToEdit.endDate)))

        // Find matching category option
        const options = getCategoryOptions();
        let match: CategoryOption | undefined;
        
        if (eventToEdit.parentCategory) {
            match = options.find(opt => 
                opt.parent === eventToEdit.parentCategory && 
                opt.sub1 === eventToEdit.subCategory1 && 
                opt.sub2 === eventToEdit.subCategory2
            );
        }
        
        // Fallback for legacy or if exact match fail
        if (!match && eventToEdit.category) {
            match = options.find(opt => opt.label === eventToEdit.category || opt.value === eventToEdit.category);
        }
        
        setCategoryOption(match || null)

      } else if (pdfExtractedData) {
        // PDF extraction mode - pre-fill with extracted data
        // Use businessName as the event name
        setName(pdfExtractedData.businessName || '')
        setDescription(
          [
            pdfExtractedData.serviceProduct ? `Servicio: ${pdfExtractedData.serviceProduct}` : '',
            pdfExtractedData.description,
            pdfExtractedData.discount ? `Descuento: ${pdfExtractedData.discount}` : '',
            pdfExtractedData.notes
          ]
            .filter(Boolean)
            .join('\n\n')
        )
        
        // Try to map PDF category string to an option
        if (pdfExtractedData.category) {
             const options = getCategoryOptions();
             const categoryStr = pdfExtractedData.category.trim();
             
             console.log('[EventModal] PDF Category received:', categoryStr);
             console.log('[EventModal] Available options count:', options.length);
             
             // Try exact match first
             let match = options.find(opt => opt.label === categoryStr || opt.value === categoryStr);
             
             // If no exact match, try case-insensitive exact match
             if (!match) {
               match = options.find(opt => 
                 opt.label.toLowerCase() === categoryStr.toLowerCase()
               );
             }
             
             // If still no match, try partial match (category contains option or vice versa)
             if (!match) {
               match = options.find(opt => 
                 opt.label.toLowerCase().includes(categoryStr.toLowerCase()) ||
                 categoryStr.toLowerCase().includes(opt.label.toLowerCase())
               );
             }
             
             // If still no match, try matching parts of the hierarchy
             if (!match && categoryStr.includes('>')) {
               const parts = categoryStr.split('>').map(p => p.trim());
               console.log('[EventModal] Category parts:', parts);
               
               if (parts.length >= 3) {
                 // Try matching as "MAIN > SUB > LEAF"
                 match = options.find(opt => 
                   opt.parent.toLowerCase() === parts[0].toLowerCase() && 
                   opt.sub1?.toLowerCase() === parts[1].toLowerCase() && 
                   opt.sub2?.toLowerCase() === parts[2].toLowerCase()
                 );
               }
               if (!match && parts.length >= 2) {
                 // Try matching as "MAIN > SUB"
                 match = options.find(opt => 
                   opt.parent.toLowerCase() === parts[0].toLowerCase() && 
                   opt.sub1?.toLowerCase() === parts[1].toLowerCase() && 
                   !opt.sub2
                 );
               }
               if (!match && parts.length >= 1) {
                 // Try matching as "MAIN" only
                 match = options.find(opt => 
                   opt.parent.toLowerCase() === parts[0].toLowerCase() && 
                   !opt.sub1
                 );
                 // Or any option with this main category
                 if (!match) {
                   match = options.find(opt => 
                     opt.parent.toLowerCase() === parts[0].toLowerCase()
                   );
                 }
               }
             }
             
             // Last resort: try matching any part of the category string
             if (!match) {
               // Split by spaces and common delimiters
               const searchTerms = categoryStr.split(/[\s>]+/).filter(t => t.length > 2);
               for (const term of searchTerms) {
                 match = options.find(opt => 
                   opt.label.toLowerCase().includes(term.toLowerCase()) ||
                   opt.parent.toLowerCase().includes(term.toLowerCase()) ||
                   opt.sub1?.toLowerCase().includes(term.toLowerCase()) ||
                   opt.sub2?.toLowerCase().includes(term.toLowerCase())
                 );
                 if (match) break;
               }
             }
             
             if (match) {
               console.log('[EventModal] Category matched:', match.label);
               setCategoryOption(match);
             } else {
               console.warn('[EventModal] Could not match category:', categoryStr);
               console.log('[EventModal] First 5 available options:', options.slice(0, 5).map(opt => opt.label));
             }
        } else {
          console.log('[EventModal] No category in PDF data');
        }
        
        setMerchant(pdfExtractedData.merchant || pdfExtractedData.businessName || '')
        
        // Auto-calculate dates based on PDF data with smart validation
        if (pdfExtractedData.suggestedStartDate) {
          let startDateObj = new Date(pdfExtractedData.suggestedStartDate + 'T12:00:00')
          const originalStartDate = new Date(startDateObj)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          let adjustmentReasons: string[] = []
          
          // Ensure start date is in the future
          if (startDateObj < today) {
            startDateObj = new Date(today)
            startDateObj.setDate(startDateObj.getDate() + 1) // Tomorrow
            adjustmentReasons.push('fecha estaba en el pasado')
          }
          
          // Check for conflicts with same category and find next available date
          if (pdfExtractedData.category) {
            let foundConflict = true
            let attempts = 0
            const maxAttempts = 90 // Check up to 90 days ahead
            
            while (foundConflict && attempts < maxAttempts) {
              // Get max duration for the category (with business exceptions)
              let categoryParent = pdfExtractedData.category;
              // Try to resolve parent if we can finding a match
              if (pdfExtractedData.category) {
                 const options = getCategoryOptions();
                 const match = options.find(opt => opt.label.includes(pdfExtractedData.category!) || opt.value.includes(pdfExtractedData.category!));
                 if (match) categoryParent = match.parent;
              }
              
              let maxDuration = getMaxDuration(categoryParent)
              if (pdfExtractedData.merchant) {
                const exceptionDuration = getBusinessException(
                  pdfExtractedData.merchant, 
                  'duration', 
                  userSettings.businessExceptions
                )
                if (exceptionDuration !== null) {
                  maxDuration = exceptionDuration
                }
              }
              
              // Calculate total days (respecting category max)
              let totalDays = maxDuration // Default to max
              if (pdfExtractedData.totalDays) {
                totalDays = Math.min(pdfExtractedData.totalDays, maxDuration)
              }
              
              const testEndDate = new Date(startDateObj)
              testEndDate.setDate(testEndDate.getDate() + (totalDays - 1))
              
              // Check for uniqueness violation
              const uniqueCheck = checkUniquenesViolation(
                allEvents,
                { 
                  category: pdfExtractedData.category, 
                  startDate: startDateObj, 
                  endDate: testEndDate 
                },
                undefined
              )
              
              if (uniqueCheck.violated) {
                // Move to next day and try again
                startDateObj.setDate(startDateObj.getDate() + 1)
                attempts++
                if (attempts === 1) {
                  adjustmentReasons.push(`conflicto con otra oferta de "${pdfExtractedData.category}"`)
                }
              } else {
                foundConflict = false
              }
            }
          }
          
          // Set adjustment info message if date was changed
          if (adjustmentReasons.length > 0) {
            const originalDateStr = originalStartDate.toLocaleDateString('es-PA', { 
              timeZone: 'America/Panama',
              year: 'numeric', month: 'short', day: 'numeric' 
            })
            const newDateStr = startDateObj.toLocaleDateString('es-PA', { 
              timeZone: 'America/Panama',
              year: 'numeric', month: 'short', day: 'numeric' 
            })
            setDateAdjustmentInfo(
              `Fecha ajustada de ${originalDateStr} a ${newDateStr} (${adjustmentReasons.join(', ')})`
            )
          } else {
            setDateAdjustmentInfo('')
          }
          
          // Set the validated start date
          setStartDate(formatDate(startDateObj))
          
          // Calculate end date based on totalDays or category max duration (with business exceptions)
          let parentCatForDuration = pdfExtractedData.category;
          if (pdfExtractedData.category) {
             const options = getCategoryOptions();
             const match = options.find(opt => opt.label.includes(pdfExtractedData.category!) || opt.value.includes(pdfExtractedData.category!));
             if (match) parentCatForDuration = match.parent;
          }

          let maxDuration = parentCatForDuration 
            ? getMaxDuration(parentCatForDuration) 
            : 5
          
          if (pdfExtractedData.merchant) {
            const exceptionDuration = getBusinessException(
              pdfExtractedData.merchant, 
              'duration', 
              userSettings.businessExceptions
            )
            if (exceptionDuration !== null) {
              maxDuration = exceptionDuration
            }
          }
          
          let totalDays = maxDuration
          
          if (pdfExtractedData.totalDays) {
            // Cap to category maximum (or exception)
            totalDays = Math.min(pdfExtractedData.totalDays, maxDuration)
            
            // Add info if days were capped
            if (pdfExtractedData.totalDays > maxDuration) {
              setDateAdjustmentInfo(prev => 
                prev + (prev ? ' | ' : '') + 
                `Duración reducida de ${pdfExtractedData.totalDays} a ${maxDuration} días (máximo permitido)`
              )
            }
          }
          
          const endDateObj = new Date(startDateObj)
          endDateObj.setDate(endDateObj.getDate() + (totalDays - 1))
          setEndDate(formatDate(endDateObj))
        } else if (selectedDate) {
          // Fallback: If dates were selected from calendar, use those
          const start = new Date(selectedDate)
          const end = selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)
          setStartDate(formatDate(start))
          setEndDate(formatDate(end))
        }
      } else if (selectedDate) {
        // Creating mode - pre-fill dates from calendar
        const start = new Date(selectedDate)
        const end = selectedEndDate ? new Date(selectedEndDate) : new Date(selectedDate)
        
        setStartDate(formatDate(start))
        setEndDate(formatDate(end))
      }
    } else {
      // Reset when modal closes
      setName('')
      setDescription('')
      setCategoryOption(null)
      setMerchant('')
      setStartDate('')
      setEndDate('')
      setDateAdjustmentInfo('')
    }
  }, [selectedDate, selectedEndDate, eventToEdit, isOpen, pdfExtractedData, allEvents])

  // Check all validations whenever relevant fields change
  useEffect(() => {
    if (!startDate || !endDate) {
      setDurationWarning('')
      setUniquenessWarning('')
      setMerchantWarning('')
      setDailyLimitWarnings([])
      return
    }

    const start = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate + 'T12:00:00')
    
    const categoryLabel = categoryOption ? categoryOption.label : ''
    const parentCategory = categoryOption ? categoryOption.parent : ''
    
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
        setDurationWarning(`Esta categoría principal (${parentCategory}) tiene un máximo de ${maxDuration} días. Duración actual: ${duration} días.`)
      } else {
        setDurationWarning('')
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
        setUniquenessWarning(`Ya existe otra oferta de "${categoryLabel}" activa en estas fechas: "${uniqueCheck.conflictingEvent.name}"`)
      } else {
        setUniquenessWarning('')
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
        setMerchantWarning(`El aliado "${merchant}" tuvo una oferta hace menos de ${requiredDays} días. Debe esperar ${merchantCheck.daysUntilAllowed} días más.`)
      } else {
        setMerchantWarning('')
      }
    } else {
      setMerchantWarning('')
    }
    
    // Daily limit check for all days in range (check for daily limit exemption)
    const warnings: string[] = []
    
    // Check if this merchant is exempt from daily limits
    const isDailyLimitExempt = merchant 
      ? getBusinessException(merchant, 'dailyLimitExempt', userSettings.businessExceptions) === 1
      : false
    
    if (!isDailyLimitExempt) {
      // Only check the launch date (start date) for daily limits
      // Daily count is based on launch date, not on all days in the event range
      // Only count events with 'booked' status (finalized bookings)
      const bookedEvents = allEvents.filter(event => event.status === 'booked')
      const launchDate = new Date(start)
      const eventsOnLaunchDay = getEventsOnDate(bookedEvents, launchDate).filter(e => 
        e.id !== eventToEdit?.id // Exclude current event if editing
      )
      const count = eventsOnLaunchDay.length + 1 // +1 for the event we're creating/editing
      const status = getDailyLimitStatus(count, userSettings.minDailyLaunches, userSettings.maxDailyLaunches)
      
      if (status === 'over') {
        const dateStr = launchDate.toLocaleDateString('es-PA', { timeZone: 'America/Panama', month: 'short', day: 'numeric' })
        warnings.push(`${dateStr}: ${count} ofertas (máx ${userSettings.maxDailyLaunches})`)
      }
    }
    setDailyLimitWarnings(warnings)
    
  }, [startDate, endDate, categoryOption, merchant, allEvents, eventToEdit, userSettings])

  // Check if all required fields are filled
  const hasEmptyRequiredFields = () => {
    return !name || !categoryOption || !merchant || !startDate || !endDate
  }

  // Check if there are any blocking validation errors
  const hasBlockingErrors = () => {
    return !!(
      hasEmptyRequiredFields() ||
      durationWarning ||
      uniquenessWarning ||
      merchantWarning ||
      dailyLimitWarnings.length > 0
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    // Check for empty required fields first
    if (hasEmptyRequiredFields()) {
      setError('Por favor completa todos los campos requeridos (*)')
      return
    }
    
    // Block submission if there are validation errors
    if (hasBlockingErrors()) {
      setError('No se puede guardar. Por favor corrige las advertencias de validación antes de continuar.')
      return
    }
    
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    if (categoryOption) {
      formData.set('category', categoryOption.label) // Store full path as category for display
      formData.set('parentCategory', categoryOption.parent)
      if (categoryOption.sub1) formData.set('subCategory1', categoryOption.sub1)
      if (categoryOption.sub2) formData.set('subCategory2', categoryOption.sub2)
    }

    try {
      if (eventToEdit) {
        // Update existing event
        await updateEvent(eventToEdit.id, formData)
      } else {
        // Create new event
        await createEvent(formData)
      }
      
      // Reset all form state manually
      setName('')
      setDescription('')
      setCategoryOption(null)
      setMerchant('')
      setStartDate('')
      setEndDate('')
      setDurationWarning('')
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${eventToEdit ? 'update' : 'create'} event`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!eventToEdit) return
    
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    setLoading(true)
    try {
      await deleteEvent(eventToEdit.id)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  async function handleBook() {
    if (!eventToEdit) return
    
    if (!confirm('Are you sure you want to book this event? It will be finalized.')) {
      return
    }

    setLoading(true)
    try {
      // Import the book function
      const { bookEvent } = await import('@/app/actions/events')
      await bookEvent(eventToEdit.id)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book event')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!eventToEdit) return
    
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      // Import the reject function
      const { rejectEvent } = await import('@/app/actions/events')
      await rejectEvent(eventToEdit.id, rejectionReason)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject event')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm transition-all"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              {eventToEdit ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {pdfExtractedData && !eventToEdit && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Formulario pre-llenado desde PDF. Revise y ajuste según sea necesario.</span>
              </div>
            )}
            
            {dateAdjustmentInfo && (
              <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 px-4 py-3 rounded text-sm flex items-start gap-2">
                <EventIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                <span>{dateAdjustmentInfo}</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {durationWarning && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm flex items-start gap-2">
                <WarningIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                <span>{durationWarning}</span>
              </div>
            )}
            
            {uniquenessWarning && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded text-sm flex items-start gap-2">
                <WarningIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                <span>{uniquenessWarning}</span>
              </div>
            )}
            
            {merchantWarning && (
              <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded text-sm flex items-start gap-2">
                <WarningIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                <span>{merchantWarning}</span>
              </div>
            )}
            
            {dailyLimitWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                <div className="flex items-start gap-2">
                  <WarningIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Días que exceden el máximo de {userSettings.maxDailyLaunches} ofertas:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {dailyLimitWarnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {hasBlockingErrors() && (
              <div className="bg-red-100 border border-red-300 text-red-900 px-4 py-3 rounded text-sm font-medium flex items-start gap-2">
                <BlockIcon fontSize="small" className="mt-0.5 flex-shrink-0" />
                <span>
                  {hasEmptyRequiredFields() 
                    ? 'Por favor completa todos los campos requeridos (*)' 
                    : 'No se puede guardar hasta que se corrijan todas las advertencias anteriores'}
                </span>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event Name"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <CategorySelect selectedOption={categoryOption} onChange={setCategoryOption} />
              {!categoryOption && (
                <p className="text-xs text-red-600 mt-1">Categoría es requerida</p>
              )}
            </div>

            <div>
              <label htmlFor="merchant" className="block text-sm font-medium text-gray-700 mb-1">
                Merchant / Aliado *
              </label>
              <input
                type="text"
                id="merchant"
                name="merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del comercio o aliado"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción del evento..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Rejection Reason Field - Only for approved events when rejecting */}
            {eventToEdit && eventToEdit.status === 'approved' && showRejectionField && userRole === 'admin' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-red-900 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Explain why this booking is being rejected..."
                />
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {eventToEdit && userRole === 'admin' && eventToEdit.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    Delete Event
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                
                {/* For approved events: Show Book and Reject buttons (admin only) */}
                {eventToEdit && eventToEdit.status === 'approved' && userRole === 'admin' ? (
                  <>
                    {!showRejectionField ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowRejectionField(true)}
                          disabled={loading}
                          className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={handleBook}
                          disabled={loading || hasBlockingErrors()}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                            loading || hasBlockingErrors()
                              ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {loading ? 'Booking...' : 'Book Event'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={loading || !rejectionReason.trim()}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          loading || !rejectionReason.trim()
                            ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {loading ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                    )}
                  </>
                ) : (
                  /* For booked events or new events: Show regular Save button */
                <button
                  type="submit"
                  disabled={loading || hasBlockingErrors()}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    loading || hasBlockingErrors()
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={hasBlockingErrors() ? 'Corrige las advertencias de validación para continuar' : ''}
                >
                    {loading ? (eventToEdit ? 'Updating...' : 'Creating...') : (eventToEdit ? 'Save Changes' : 'Create Event')}
                </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
