'use client'

import { useState } from 'react'
import { DEAL_FIELD_MAPPINGS, type FieldMapping } from '@/lib/api/external-oferta/deal/mapper'

interface FetchResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  logId?: string
}

const CATEGORY_LABELS: Record<FieldMapping['category'], string> = {
  required: 'Campos Requeridos',
  vendor: 'Vendor',
  content: 'Contenido',
  media: 'Media / Imágenes',
  pricing: 'Opciones de Precio',
  dates: 'Fechas',
  booking: 'Booking',
  metadata: 'Metadata',
  flags: 'Flags / Configuración',
}

const CATEGORY_ORDER: FieldMapping['category'][] = [
  'required', 'vendor', 'content', 'dates', 'pricing', 'media', 'booking', 'metadata', 'flags',
]

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty array)'
    if (typeof value[0] === 'string') return value.join(', ')
    return JSON.stringify(value, null, 2)
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function truncate(text: string, max: number = 120): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function DealImportTestClient() {
  const [dealId, setDealId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FetchResult | null>(null)
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set())

  const handleFetch = async () => {
    const id = dealId.trim()
    if (!id) return

    setLoading(true)
    setResult(null)
    setExpandedValues(new Set())

    try {
      const response = await fetch(`/api/external-oferta/deals/${id}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (key: string) => {
    setExpandedValues(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const dealData = result?.data as Record<string, unknown> | undefined

  const groupedMappings = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    fields: DEAL_FIELD_MAPPINGS.filter(m => m.category === cat),
  }))

  const mappedCount = dealData
    ? DEAL_FIELD_MAPPINGS.filter(m => m.formField && dealData[m.apiField] != null).length
    : 0
  const totalWithValue = dealData
    ? DEAL_FIELD_MAPPINGS.filter(m => dealData[m.apiField] != null).length
    : 0

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Deal Import Test</h1>
      <p className="text-sm text-gray-500 mb-6">
        Fetch a deal from the external OfertaSimple API by ID and inspect all returned fields.
      </p>

      {/* Input */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal ID
            </label>
            <input
              type="text"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              placeholder="e.g. 12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={loading || !dealId.trim()}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Fetching...' : 'Fetch Deal'}
          </button>
        </div>
      </div>

      {/* Error */}
      {result && !result.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <span className="text-lg">✗</span>
            <span>{result.error}</span>
          </div>
          {result.logId && (
            <p className="text-xs text-red-500 mt-1">Log ID: {result.logId}</p>
          )}
        </div>
      )}

      {/* Success summary */}
      {result?.success && dealData && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
              <span className="text-lg">✓</span>
              <span>Deal fetched successfully</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-700">
              <div>
                <span className="text-gray-500">Fields with value:</span>
                <span className="ml-2 font-semibold">{totalWithValue}</span>
                <span className="text-gray-400"> / {DEAL_FIELD_MAPPINGS.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Mapped to form:</span>
                <span className="ml-2 font-semibold text-green-700">{mappedCount}</span>
              </div>
              <div>
                <span className="text-gray-500">No form mapping:</span>
                <span className="ml-2 font-semibold text-orange-600">{totalWithValue - mappedCount}</span>
              </div>
            </div>
            {result.logId && (
              <p className="text-xs text-gray-400 mt-2">Log ID: {result.logId}</p>
            )}
          </div>

          {/* Field tables by category */}
          <div className="space-y-6">
            {groupedMappings.map(({ category, label, fields }) => {
              const fieldsWithValue = fields.filter(f => dealData[f.apiField] != null)
              if (category !== 'required' && fieldsWithValue.length === 0) return null

              return (
                <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {label}
                      <span className="ml-2 text-xs font-normal text-gray-400">
                        {fieldsWithValue.length} / {fields.length} fields populated
                      </span>
                    </h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2 w-48">API Field</th>
                        <th className="px-4 py-2 w-48">Form Field</th>
                        <th className="px-4 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fields.map((mapping) => {
                        const rawValue = dealData[mapping.apiField]
                        const hasValue = rawValue != null
                        const formatted = formatValue(rawValue)
                        const isLong = formatted.length > 120
                        const isExpanded = expandedValues.has(mapping.apiField)

                        return (
                          <tr
                            key={mapping.apiField}
                            className={hasValue ? 'bg-white' : 'bg-gray-50/50'}
                          >
                            <td className="px-4 py-2 font-mono text-xs text-gray-600">
                              {mapping.apiField}
                            </td>
                            <td className="px-4 py-2">
                              {mapping.formField ? (
                                <span className="inline-flex items-center gap-1 text-xs font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                  {mapping.formField}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-800">
                              {!hasValue ? (
                                <span className="text-gray-300 italic">null</span>
                              ) : isLong ? (
                                <div>
                                  <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 rounded p-2 max-h-40 overflow-y-auto">
                                    {isExpanded ? formatted : truncate(formatted)}
                                  </pre>
                                  <button
                                    onClick={() => toggleExpand(mapping.apiField)}
                                    className="text-xs text-blue-600 hover:underline mt-1"
                                  >
                                    {isExpanded ? 'Collapse' : 'Expand'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs">{formatted}</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>

          {/* Raw JSON (collapsed) */}
          <details className="mt-6 bg-white rounded-lg shadow">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
              Raw API Response
            </summary>
            <pre className="p-4 text-xs font-mono bg-gray-50 rounded-b-lg overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(dealData, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
