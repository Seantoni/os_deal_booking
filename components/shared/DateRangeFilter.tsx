'use client'

import { Input, Select } from '@/components/ui'
import type { DateRangeFilterValue, DateRangePreset } from '@/lib/utils/dateRangeFilter'
import { hasActiveDateRangeFilter } from '@/lib/utils/dateRangeFilter'

interface DateRangeFilterProps {
  value: DateRangeFilterValue
  onChange: (nextValue: DateRangeFilterValue) => void
  className?: string
}

const PRESET_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: 'all', label: 'Todas las fechas' },
  { value: 'today', label: 'Hoy' },
  { value: 'this-week', label: 'Esta semana' },
  { value: 'this-month', label: 'Este mes' },
  { value: 'custom', label: 'Rango personalizado' },
]

export default function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const onPresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({
        preset,
        startDate: value.startDate,
        endDate: value.endDate,
      })
      return
    }

    onChange({ preset })
  }

  const updateStartDate = (startDate: string) => {
    onChange({
      preset: 'custom',
      startDate: startDate || undefined,
      endDate: value.endDate,
    })
  }

  const updateEndDate = (endDate: string) => {
    onChange({
      preset: 'custom',
      startDate: value.startDate,
      endDate: endDate || undefined,
    })
  }

  return (
    <div className={`flex items-center gap-2 flex-shrink-0 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
        Fecha
      </span>

      <div className="w-[170px]">
        <Select
          value={value.preset}
          onChange={(event) => onPresetChange(event.target.value as DateRangePreset)}
          options={PRESET_OPTIONS}
          size="sm"
        />
      </div>

      {value.preset === 'custom' && (
        <>
          <div className="w-[145px]">
            <Input
              type="date"
              size="sm"
              value={value.startDate || ''}
              onChange={(event) => updateStartDate(event.target.value)}
              max={value.endDate || undefined}
            />
          </div>
          <span className="text-xs text-gray-500">a</span>
          <div className="w-[145px]">
            <Input
              type="date"
              size="sm"
              value={value.endDate || ''}
              onChange={(event) => updateEndDate(event.target.value)}
              min={value.startDate || undefined}
            />
          </div>
        </>
      )}

      {hasActiveDateRangeFilter(value) && (
        <button
          type="button"
          onClick={() => onChange({ preset: 'all' })}
          className="text-[11px] font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
