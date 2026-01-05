'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import VerifiedIcon from '@mui/icons-material/Verified'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import InfoIcon from '@mui/icons-material/Info'
import BuildIcon from '@mui/icons-material/Build'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { BookingFormData, PricingOption } from '../types'
import { Button } from '@/components/ui'

interface AIRecommendation {
  id: string
  category: string
  issue: string
  field: string | null
  currentValue: unknown
  suggestedValue: unknown
  canAutoFix: boolean
  severity: 'error' | 'warning' | 'suggestion'
}

interface AIReviewResult {
  isApproved: boolean
  summary: string
  recommendations: AIRecommendation[]
  legacy?: boolean
  review?: string // For legacy text responses
}

interface ValidacionStepProps {
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
  updatePricingOption?: (index: number, field: string, value: string) => void
  isFieldRequired?: (fieldKey: string) => boolean
}

export default function ValidacionStep({ formData, errors, updateFormData, updatePricingOption, isFieldRequired = () => false }: ValidacionStepProps) {
  const [aiReviewLoading, setAiReviewLoading] = useState(false)
  const [aiReviewResult, setAiReviewResult] = useState<AIReviewResult | null>(null)
  const [aiReviewError, setAiReviewError] = useState<string | null>(null)
  const [aiSkipped, setAiSkipped] = useState<string | null>(null)
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set())
  const [hasAutoReviewed, setHasAutoReviewed] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Check if category is restaurant-related for showing AI review
  const parentCategory = (formData.parentCategory || '').toLowerCase()
  const category = (formData.category || '').toLowerCase()
  const isRestaurantCategory = 
    parentCategory.includes('restaurante') || 
    parentCategory.includes('restaurant') ||
    category.includes('restaurante') || 
    category.includes('restaurant') ||
    parentCategory.includes('comida') ||
    parentCategory.includes('food')

  const handleAiReview = useCallback(async () => {
    setAiReviewLoading(true)
    setAiReviewError(null)
    setAiSkipped(null)
    setAiReviewResult(null)
    setAppliedFixes(new Set())

    try {
      const response = await fetch('/api/ai/review-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('No se pudo realizar la revisión.')

      const data = await response.json()
      
      if (data.skipped) {
        setAiSkipped(data.message)
      } else {
        setAiReviewResult(data)
      }
    } catch (error) {
      console.error('AI review error', error)
      setAiReviewError('Error al realizar la revisión con AI. Por favor intente de nuevo.')
    } finally {
      setAiReviewLoading(false)
    }
  }, [formData])

  // Auto-trigger AI review on focus/mount for restaurant categories
  useEffect(() => {
    if (isRestaurantCategory && !hasAutoReviewed && !aiReviewResult && !aiReviewLoading && !aiSkipped) {
      setHasAutoReviewed(true)
      handleAiReview()
    }
  }, [isRestaurantCategory, hasAutoReviewed, aiReviewResult, aiReviewLoading, aiSkipped, handleAiReview])

  const handleApplyFix = (recommendation: AIRecommendation) => {
    if (!recommendation.canAutoFix || !recommendation.suggestedValue || !recommendation.field) return

    const field = recommendation.field
    const rawValue = recommendation.suggestedValue
    
    // Convert value to string if it's not already
    const value = typeof rawValue === 'string' ? rawValue : String(rawValue)

    // Handle pricing option fields (e.g., "pricingOptions[0].price")
    const pricingMatch = field.match(/^pricingOptions\[(\d+)\]\.(\w+)$/)
    if (pricingMatch && updatePricingOption) {
      const index = parseInt(pricingMatch[1])
      const optionField = pricingMatch[2]
      updatePricingOption(index, optionField, value)
    } else {
      // Regular form field
      updateFormData(field as keyof BookingFormData, value)
    }

    // Mark as applied
    setAppliedFixes(prev => new Set([...prev, recommendation.id]))
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ErrorIcon className="text-red-500" style={{ fontSize: 18 }} />
      case 'warning':
        return <WarningIcon className="text-amber-500" style={{ fontSize: 18 }} />
      case 'suggestion':
        return <LightbulbIcon className="text-blue-500" style={{ fontSize: 18 }} />
      default:
        return <InfoIcon className="text-gray-500" style={{ fontSize: 18 }} />
    }
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-amber-200 bg-amber-50'
      case 'suggestion':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getCategoryBadgeStyles = (category: string) => {
    const colors: Record<string, string> = {
      'Precios': 'bg-green-100 text-green-700',
      'Términos': 'bg-purple-100 text-purple-700',
      'Legal': 'bg-red-100 text-red-700',
      'Contenido': 'bg-blue-100 text-blue-700',
      'Marketing': 'bg-orange-100 text-orange-700',
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  // Helper to safely display a value that might be an object
  const formatDisplayValue = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return '[Object]'
      }
    }
    return String(value)
  }

  // Calculate summary stats
  const hasPricingOptions = formData.pricingOptions && formData.pricingOptions.length > 0
  const hasRequiredFields = formData.businessName && formData.partnerEmail && formData.startDate && formData.endDate

  return (
    <div className="space-y-8" ref={sectionRef}>
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Validación Final</h2>
        <p className="text-sm text-gray-500 mt-1">Revisa y confirma todos los detalles antes de enviar.</p>
      </div>

      {/* Quick Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircleIcon className="text-green-500" style={{ fontSize: 20 }} />
          Resumen de la Solicitud
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Negocio</p>
            <p className="font-medium text-gray-900">{formData.businessName || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{formData.partnerEmail || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Categoría</p>
            <p className="font-medium text-gray-900">
              {formData.parentCategory || '—'}
              {formData.subCategory1 && ` / ${formData.subCategory1}`}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Vigencia</p>
            <p className="font-medium text-gray-900">
              {formData.startDate && formData.endDate 
                ? `${formData.startDate} - ${formData.endDate}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Opciones de Precio</p>
            <p className="font-medium text-gray-900">
              {hasPricingOptions ? `${formData.pricingOptions.length} opción(es)` : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Estado</p>
            <p className={`font-medium ${hasRequiredFields ? 'text-green-600' : 'text-amber-600'}`}>
              {hasRequiredFields ? 'Listo para enviar' : 'Campos pendientes'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Contract Review Section */}
      {isRestaurantCategory && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full text-white mt-0.5">
                <AutoFixHighIcon fontSize="small" />
              </div>
              <div>
                <h3 className="font-bold text-purple-900 mb-1">Revisión AI del Contrato</h3>
                <p className="text-sm text-purple-700 leading-relaxed">
                  Inteligencia artificial verifica que tu oferta cumpla con los criterios de éxito.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={aiReviewLoading}
              onClick={handleAiReview}
              className="whitespace-nowrap bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:text-white focus-visible:ring-purple-500 shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {aiReviewLoading ? (
                <RefreshIcon fontSize="small" className="animate-spin" />
              ) : (
                <RefreshIcon fontSize="small" />
              )}
              {aiReviewLoading ? 'Revisando...' : 'Revisar de Nuevo'}
            </Button>
          </div>

          {/* AI Review Results */}
          {aiReviewError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700">
                <ErrorIcon fontSize="small" />
                <span className="text-sm font-medium">{aiReviewError}</span>
              </div>
            </div>
          )}

          {aiSkipped && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 text-gray-600">
                <InfoIcon fontSize="small" />
                <span className="text-sm">{aiSkipped}</span>
              </div>
            </div>
          )}

          {aiReviewLoading && !aiReviewResult && (
            <div className="mt-4 p-6 bg-white/50 border border-purple-100 rounded-xl text-center">
              <div className="inline-flex items-center gap-3 text-purple-700">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Analizando solicitud con IA...</span>
              </div>
            </div>
          )}

          {aiReviewResult && (
            <div className="mt-4 space-y-4">
              {/* Summary Header */}
              <div className={`p-4 rounded-xl border ${
                aiReviewResult.isApproved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {aiReviewResult.isApproved ? (
                    <CheckCircleIcon className="text-green-600" fontSize="small" />
                  ) : (
                    <WarningIcon className="text-amber-600" fontSize="small" />
                  )}
                  <span className={`font-semibold ${
                    aiReviewResult.isApproved ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    {aiReviewResult.isApproved ? 'Revisión Aprobada' : 'Revisión con Observaciones'}
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {formatDisplayValue(aiReviewResult.summary || aiReviewResult.review)}
                </p>
              </div>

              {/* Legacy text response fallback */}
              {aiReviewResult.legacy && aiReviewResult.review && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {aiReviewResult.review}
                  </div>
                </div>
              )}

              {/* Structured Recommendations */}
              {aiReviewResult.recommendations && aiReviewResult.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                    <BuildIcon style={{ fontSize: 16 }} />
                    Recomendaciones ({aiReviewResult.recommendations.length})
                  </h4>
                  
                  {aiReviewResult.recommendations.map((rec) => {
                    const isApplied = appliedFixes.has(rec.id)
                    
                    return (
                      <div 
                        key={rec.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          isApplied 
                            ? 'border-green-300 bg-green-50/50' 
                            : getSeverityStyles(rec.severity)
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {isApplied ? (
                              <CheckCircleIcon className="text-green-500 mt-0.5" style={{ fontSize: 18 }} />
                            ) : (
                              <span className="mt-0.5">{getSeverityIcon(rec.severity)}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryBadgeStyles(rec.category)}`}>
                                  {rec.category}
                                </span>
                                {rec.field && (
                                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                    Campo: {rec.field}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${isApplied ? 'text-green-700' : 'text-gray-700'}`}>
                                {rec.issue}
                              </p>
                              
                              {rec.suggestedValue != null && !isApplied && (
                                <div className="mt-2 p-2 bg-white/60 rounded-lg border border-gray-200">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Valor sugerido:</p>
                                  <p className="text-xs text-gray-800 font-medium break-all whitespace-pre-wrap">
                                    {(() => {
                                      const displayValue = formatDisplayValue(rec.suggestedValue)
                                      return displayValue.length > 150 
                                        ? displayValue.substring(0, 150) + '...' 
                                        : displayValue
                                    })()}
                                  </p>
                                </div>
                              )}
                              
                              {isApplied && (
                                <p className="text-xs text-green-600 mt-2 font-medium">
                                  ✓ Corrección aplicada
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {rec.canAutoFix && rec.suggestedValue != null && !isApplied && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleApplyFix(rec)}
                              className="whitespace-nowrap bg-white border-gray-300 hover:bg-gray-50 text-gray-700 shadow-sm flex items-center gap-1.5 py-1 px-3 text-xs"
                            >
                              <AutoFixHighIcon style={{ fontSize: 14 }} />
                              Aplicar
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {appliedFixes.size > 0 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      {appliedFixes.size} de {aiReviewResult.recommendations.filter(r => r.canAutoFix).length} correcciones aplicadas
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Non-restaurant info message */}
      {!isRestaurantCategory && formData.parentCategory && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <InfoIcon fontSize="small" />
            <span className="text-sm">La revisión AI está disponible actualmente solo para categorías de restaurantes.</span>
          </div>
        </div>
      )}

      {/* Confirmation Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-full text-blue-600 mt-1">
            <VerifiedIcon fontSize="small" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 mb-1">Confirmación de Envío</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              Revise toda la información antes de enviar. Una vez enviada, se creará la solicitud de booking 
              y se enviará un correo de aprobación al aliado.
            </p>
            {!hasRequiredFields && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <WarningIcon fontSize="small" />
                  <span>Faltan campos requeridos. Por favor complete el negocio, email, y fechas.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

