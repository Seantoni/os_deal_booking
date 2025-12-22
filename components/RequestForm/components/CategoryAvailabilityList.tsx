'use client'

import { useEffect, useState } from 'react'
import { getCategoryOptions } from '@/lib/categories'
import { calculateNextAvailableDate } from '@/lib/event-validation'
import { getAllBookedEvents } from '@/app/actions/events'
import { getSettings } from '@/lib/settings'
import { formatShortDate } from '@/lib/date'
import { buildCategoryKey } from '@/lib/category-utils'
import type { CategoryOption } from '@/types'

interface CategoryAvailability {
  label: string
  categoryKey: string
  parentCategory: string
  nextAvailableDate: Date | null
  daysUntilLaunch: number | null
  error?: string
  option: CategoryOption // Store original option for category selection
}

interface CategoryAvailabilityListProps {
  onCategorySelect?: (option: CategoryOption) => void
}

export default function CategoryAvailabilityList({ onCategorySelect }: CategoryAvailabilityListProps) {
  const [availabilities, setAvailabilities] = useState<CategoryAvailability[]>([])
  const [filteredAvailabilities, setFilteredAvailabilities] = useState<CategoryAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const calculateAvailabilities = async () => {
      setLoading(true)
      try {
        const events = await getAllBookedEvents()
        const settings = getSettings()
        const categoryOptions = getCategoryOptions()

        const results = await Promise.all(
          categoryOptions.map(async (option) => {
            const categoryKey = buildCategoryKey(
              option.parent,
              option.sub1 || null,
              option.sub2 || null,
              null, // subCategory3
              option.value
            )

            if (!categoryKey) {
              return {
                label: option.label,
                categoryKey: '',
                parentCategory: option.parent,
                nextAvailableDate: null,
                daysUntilLaunch: null,
                error: 'Invalid category',
                option // Store original option
              }
            }

            const result = calculateNextAvailableDate(
              events,
              categoryKey,
              option.parent,
              null, // merchant
              undefined, // duration
              undefined, // startFromDate
              undefined, // excludeEventId
              {
                minDailyLaunches: settings.minDailyLaunches,
                maxDailyLaunches: settings.maxDailyLaunches,
                merchantRepeatDays: settings.merchantRepeatDays,
                businessExceptions: settings.businessExceptions
              }
            )

            return {
              label: option.label,
              categoryKey,
              parentCategory: option.parent,
              nextAvailableDate: result.success && result.date ? result.date : null,
              daysUntilLaunch: result.daysUntilLaunch ?? null,
              error: result.error,
              option // Store original option for category selection
            }
          })
        )

        // Sort by next available date (earliest first), then by category name
        const sorted = results
          .filter(r => r.nextAvailableDate !== null)
          .sort((a, b) => {
            if (!a.nextAvailableDate || !b.nextAvailableDate) return 0
            const dateDiff = a.nextAvailableDate.getTime() - b.nextAvailableDate.getTime()
            if (dateDiff !== 0) return dateDiff
            return a.label.localeCompare(b.label)
          })

        setAvailabilities(sorted)
        setFilteredAvailabilities(sorted)
      } catch (error) {
        console.error('Error calculating category availabilities:', error)
      } finally {
        setLoading(false)
      }
    }

    calculateAvailabilities()
  }, [])

  // Filter availabilities based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAvailabilities(availabilities)
    } else {
      const query = searchQuery.toLowerCase().trim()
      const filtered = availabilities.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.parentCategory.toLowerCase().includes(query)
      )
      setFilteredAvailabilities(filtered)
    }
  }, [searchQuery, availabilities])

if (loading) {
    return (
      <div className="w-80 bg-white rounded-xl shadow-md border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Disponibilidad por Categoría</h3>
        <div className="text-sm text-gray-500 text-center py-4">Calculando...</div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white rounded-xl shadow-md border border-gray-200 p-4 max-h-[calc(100vh-200px)] flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Disponibilidad por Categoría</h3>
      
      {/* Search Input */}
      <div className="mb-3 sticky top-0 bg-white pb-2 z-10">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar categoría..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredAvailabilities.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {searchQuery ? 'No se encontraron categorías' : 'No hay categorías disponibles'}
          </div>
        ) : (
          filteredAvailabilities.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                if (onCategorySelect && item.option) {
                  onCategorySelect(item.option)
                }
              }}
              className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-gray-900 mb-1.5 line-clamp-2">
                {item.label}
              </div>
              {item.nextAvailableDate && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Puede lanzar en:</span>
                    <span className="font-semibold text-blue-600">
                      {item.daysUntilLaunch !== null 
                        ? `${item.daysUntilLaunch} ${item.daysUntilLaunch === 1 ? 'día' : 'días'}`
                        : '—'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium text-gray-900">
                      {formatShortDate(item.nextAvailableDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

