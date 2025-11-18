'use client'

import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CategorySelect from './CategorySelect'
import { getMaxDuration, getDaysDifference } from '@/lib/categories'
import { checkUniquenesViolation, check30DayMerchantRule, getDailyLimitStatus, MIN_DAILY_LAUNCHES, MAX_DAILY_LAUNCHES, getEventsOnDate } from '@/lib/validation'
import type { ParsedBookingData } from '@/app/actions/pdf-parse'

type Event = {
  id: string
  name: string
  description: string | null
  category: string | null
  merchant: string | null
  startDate: Date
  endDate: Date
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedEndDate?: Date
  eventToEdit?: Event | null
  allEvents?: Event[]
  pdfExtractedData?: ParsedBookingData | null
}

export default function EventModal({ isOpen, onClose, selectedDate, selectedEndDate, eventToEdit, allEvents = [], pdfExtractedData }: EventModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [merchant, setMerchant] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [durationWarning, setDurationWarning] = useState('')
  const [uniquenessWarning, setUniquenessWarning] = useState('')
  const [merchantWarning, setMerchantWarning] = useState('')
  const [dailyLimitWarnings, setDailyLimitWarnings] = useState<string[]>([])
  const [dateAdjustmentInfo, setDateAdjustmentInfo] = useState('')

  // Format date for date input (full day only) - use UTC to avoid timezone shifts
  const formatDate = (date: Date) => {
    const d = new Date(date)
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Pre-fill form when editing or creating with date or PDF data
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        // Editing mode - pre-fill with event data
        setName(eventToEdit.name)
        setDescription(eventToEdit.description || '')
        setCategory(eventToEdit.category || '')
        setMerchant(eventToEdit.merchant || '')
        setStartDate(formatDate(new Date(eventToEdit.startDate)))
        setEndDate(formatDate(new Date(eventToEdit.endDate)))
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
        setCategory(pdfExtractedData.category || '')
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
              // Get max duration for the category
              const maxDuration = getMaxDuration(pdfExtractedData.category)
              
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
              year: 'numeric', month: 'short', day: 'numeric' 
            })
            const newDateStr = startDateObj.toLocaleDateString('es-PA', { 
              year: 'numeric', month: 'short', day: 'numeric' 
            })
            setDateAdjustmentInfo(
              `📅 Fecha ajustada de ${originalDateStr} a ${newDateStr} (${adjustmentReasons.join(', ')})`
            )
          } else {
            setDateAdjustmentInfo('')
          }
          
          // Set the validated start date
          setStartDate(formatDate(startDateObj))
          
          // Calculate end date based on totalDays or category max duration
          const maxDuration = pdfExtractedData.category ? getMaxDuration(pdfExtractedData.category) : 5
          let totalDays = maxDuration
          
          if (pdfExtractedData.totalDays) {
            // Cap to category maximum
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
      setCategory('')
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
    
    // Duration validation
    if (category) {
      const duration = getDaysDifference(start, end)
      const maxDuration = getMaxDuration(category)
      
      if (duration > maxDuration) {
        setDurationWarning(`⚠️ Esta categoría tiene un máximo de ${maxDuration} días. Duración actual: ${duration} días.`)
      } else {
        setDurationWarning('')
      }
    }
    
    // Uniqueness validation
    if (category) {
      const uniqueCheck = checkUniquenesViolation(
        allEvents,
        { category, startDate: start, endDate: end },
        eventToEdit?.id
      )
      
      if (uniqueCheck.violated && uniqueCheck.conflictingEvent) {
        setUniquenessWarning(`⚠️ Ya existe otra oferta de "${category}" activa en estas fechas: "${uniqueCheck.conflictingEvent.name}"`)
      } else {
        setUniquenessWarning('')
      }
    }
    
    // 30-day merchant rule
    if (merchant) {
      const merchantCheck = check30DayMerchantRule(allEvents, merchant, start, eventToEdit?.id)
      
      if (merchantCheck.violated && merchantCheck.lastEvent) {
        setMerchantWarning(`⚠️ El aliado "${merchant}" tuvo una oferta hace menos de 30 días. Debe esperar ${merchantCheck.daysUntilAllowed} días más.`)
      } else {
        setMerchantWarning('')
      }
    } else {
      setMerchantWarning('')
    }
    
    // Daily limit check for all days in range
    const warnings: string[] = []
    const current = new Date(start)
    while (current <= end) {
      const eventsOnDay = getEventsOnDate(allEvents, current).filter(e => 
        e.id !== eventToEdit?.id // Exclude current event if editing
      )
      const count = eventsOnDay.length + 1 // +1 for the event we're creating/editing
      const status = getDailyLimitStatus(count)
      
      if (status === 'over') {
        const dateStr = current.toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })
        warnings.push(`${dateStr}: ${count} ofertas (máx ${MAX_DAILY_LAUNCHES})`)
      }
      
      current.setDate(current.getDate() + 1)
    }
    setDailyLimitWarnings(warnings)
    
  }, [startDate, endDate, category, merchant, allEvents, eventToEdit])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    if (category) {
      formData.set('category', category)
    }

    // Validate duration
    if (startDate && endDate && category) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const duration = getDaysDifference(start, end)
      const maxDuration = getMaxDuration(category)
      
      if (duration > maxDuration) {
        setError(`La duración excede el máximo permitido de ${maxDuration} días para esta categoría.`)
        setLoading(false)
        return
      }
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
      setCategory('')
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
              <div className="bg-cyan-50 border border-cyan-200 text-cyan-800 px-4 py-3 rounded text-sm">
                {dateAdjustmentInfo}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {durationWarning && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
                {durationWarning}
              </div>
            )}
            
            {uniquenessWarning && (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded text-sm">
                {uniquenessWarning}
              </div>
            )}
            
            {merchantWarning && (
              <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded text-sm">
                {merchantWarning}
              </div>
            )}
            
            {dailyLimitWarnings.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
                <strong>⚠️ Días que exceden el máximo de {MAX_DAILY_LAUNCHES} ofertas:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  {dailyLimitWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
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
                placeholder="Team Meeting"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <CategorySelect value={category} onChange={setCategory} />
            </div>

            <div>
              <label htmlFor="merchant" className="block text-sm font-medium text-gray-700 mb-1">
                Merchant / Aliado
              </label>
              <input
                type="text"
                id="merchant"
                name="merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del comercio o aliado"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional event description..."
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

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {eventToEdit && (
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
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (eventToEdit ? 'Updating...' : 'Creating...') : (eventToEdit ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

