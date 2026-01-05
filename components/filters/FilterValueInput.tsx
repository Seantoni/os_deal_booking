'use client'

import { useState } from 'react'
import type { FilterFieldDefinition, FieldType } from '@/lib/filters/filterConfig'
import { DATE_PRESETS } from '@/lib/filters/filterConfig'

// Type for filter values (can be string, number, boolean, or null)
type FilterValue = string | number | boolean | null

interface FilterValueInputProps {
  field: FilterFieldDefinition
  value: FilterValue
  onChange: (value: FilterValue) => void
  operator: string
  disabled?: boolean
}

export default function FilterValueInput({
  field,
  value,
  onChange,
  operator,
  disabled = false,
}: FilterValueInputProps) {
  const [useCustomDate, setUseCustomDate] = useState(false)

  // No value input needed for null checks
  if (operator === 'isNull' || operator === 'isNotNull') {
    return null
  }

  // Select field
  if (field.type === 'select' && field.options) {
    return (
      <select
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
      >
        <option value="">Select value...</option>
        {field.options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  // Boolean field
  if (field.type === 'boolean') {
    return (
      <select
        value={value === true || value === 'true' ? 'true' : value === false || value === 'false' ? 'false' : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex-1 min-w-[100px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
      >
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  // Date field
  if (field.type === 'date') {
    const isPreset = DATE_PRESETS.some(p => p.value === value)
    
    return (
      <div className="flex items-center gap-2 flex-1">
        {!useCustomDate ? (
          <>
            <select
              value={isPreset ? value : ''}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setUseCustomDate(true)
                  onChange('')
                } else {
                  onChange(e.target.value)
                }
              }}
              disabled={disabled}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
            >
              <option value="">Select date...</option>
              {DATE_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
              <option value="__custom__">Custom date...</option>
            </select>
          </>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="date"
              value={typeof value === 'string' || typeof value === 'number' ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => {
                setUseCustomDate(false)
                onChange('')
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Presets
            </button>
          </div>
        )}
      </div>
    )
  }

  // Number field
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Enter value..."
        className="flex-1 min-w-[100px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
      />
    )
  }

  // Text field (default)
  return (
    <input
      type="text"
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Enter value..."
      className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100"
    />
  )
}

