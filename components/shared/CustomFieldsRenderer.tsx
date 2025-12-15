'use client'

import { useState, useEffect } from 'react'
import { getCustomFieldsWithValues, saveCustomFieldValues, type CustomField, type EntityType } from '@/app/actions/custom-fields'

interface CustomFieldWithValue extends CustomField {
  value: string | null
}

interface CustomFieldsRendererProps {
  entityId: string | null // null for new entities
  entityType: EntityType
  onChange?: (values: Record<string, string | null>) => void
  values?: Record<string, string | null> // For controlled mode
  disabled?: boolean
  className?: string
}

export default function CustomFieldsRenderer({
  entityId,
  entityType,
  onChange,
  values: controlledValues,
  disabled = false,
  className = '',
}: CustomFieldsRendererProps) {
  const [fields, setFields] = useState<CustomFieldWithValue[]>([])
  const [localValues, setLocalValues] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)

  // Use controlled values if provided, otherwise use local state
  const values = controlledValues ?? localValues

  useEffect(() => {
    loadFields()
  }, [entityId, entityType])

  async function loadFields() {
    setLoading(true)
    try {
      if (entityId) {
        // Load fields with values for existing entity
        const result = await getCustomFieldsWithValues(entityId, entityType)
        if (result.success && result.data) {
          setFields(result.data as CustomFieldWithValue[])
          // Initialize values from loaded data
          const initialValues: Record<string, string | null> = {}
          result.data.forEach((field: CustomFieldWithValue) => {
            initialValues[field.fieldKey] = field.value
          })
          if (!controlledValues) {
            setLocalValues(initialValues)
          }
        }
      } else {
        // Load fields without values for new entity (use defaults)
        const { getCustomFields } = await import('@/app/actions/custom-fields')
        const result = await getCustomFields(entityType)
        if (result.success && result.data) {
          const fieldsWithDefaults = result.data.map((field: CustomField) => ({
            ...field,
            value: field.defaultValue,
          }))
          setFields(fieldsWithDefaults)
          // Initialize values with defaults
          const initialValues: Record<string, string | null> = {}
          fieldsWithDefaults.forEach((field: CustomField) => {
            initialValues[field.fieldKey] = field.defaultValue
          })
          if (!controlledValues) {
            setLocalValues(initialValues)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load custom fields:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(fieldKey: string, value: string | null) {
    const newValues = { ...values, [fieldKey]: value }
    if (!controlledValues) {
      setLocalValues(newValues)
    }
    onChange?.(newValues)
  }

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (fields.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {fields.map(field => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {renderField(field, values[field.fieldKey] ?? '', handleChange, disabled)}
          
          {field.helpText && (
            <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function renderField(
  field: CustomFieldWithValue,
  value: string | null,
  onChange: (fieldKey: string, value: string | null) => void,
  disabled: boolean
) {
  const baseInputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"

  switch (field.fieldType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <input
          type={field.fieldType === 'email' ? 'email' : field.fieldType === 'phone' ? 'tel' : field.fieldType === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          className={baseInputClass}
        />
      )

    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          rows={3}
          className={baseInputClass}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          className={baseInputClass}
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          disabled={disabled}
          className={baseInputClass}
        />
      )

    case 'select':
      return (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          disabled={disabled}
          className={baseInputClass}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )

    case 'checkbox':
      return (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(field.fieldKey, e.target.checked ? 'true' : 'false')}
            disabled={disabled}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <span className="ml-2 text-sm text-gray-600">
            {field.placeholder || 'Yes'}
          </span>
        </div>
      )

    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value || null)}
          placeholder={field.placeholder || undefined}
          disabled={disabled}
          className={baseInputClass}
        />
      )
  }
}

/**
 * Hook for managing custom field values in forms
 */
export function useCustomFields(entityType: EntityType, entityId: string | null) {
  const [values, setValues] = useState<Record<string, string | null>>({})
  const [fields, setFields] = useState<CustomFieldWithValue[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFields()
  }, [entityId, entityType])

  async function loadFields() {
    setLoading(true)
    try {
      if (entityId) {
        const result = await getCustomFieldsWithValues(entityId, entityType)
        if (result.success && result.data) {
          setFields(result.data as CustomFieldWithValue[])
          const initialValues: Record<string, string | null> = {}
          result.data.forEach((field: CustomFieldWithValue) => {
            initialValues[field.fieldKey] = field.value
          })
          setValues(initialValues)
        }
      } else {
        const { getCustomFields } = await import('@/app/actions/custom-fields')
        const result = await getCustomFields(entityType)
        if (result.success && result.data) {
          const fieldsWithDefaults = result.data.map((field: CustomField) => ({
            ...field,
            value: field.defaultValue,
          }))
          setFields(fieldsWithDefaults)
          const initialValues: Record<string, string | null> = {}
          fieldsWithDefaults.forEach((field: CustomField) => {
            initialValues[field.fieldKey] = field.defaultValue
          })
          setValues(initialValues)
        }
      }
    } catch (error) {
      console.error('Failed to load custom fields:', error)
    } finally {
      setLoading(false)
    }
  }

  async function save(entityId: string): Promise<{ success: boolean; error?: string }> {
    setSaving(true)
    try {
      const result = await saveCustomFieldValues(entityId, entityType, values)
      return result
    } catch (error) {
      return { success: false, error: 'Failed to save custom fields' }
    } finally {
      setSaving(false)
    }
  }

  function updateValue(fieldKey: string, value: string | null) {
    setValues(prev => ({ ...prev, [fieldKey]: value }))
  }

  function getRequiredFieldErrors(): string[] {
    const errors: string[] = []
    fields.forEach(field => {
      if (field.isRequired) {
        const value = values[field.fieldKey]
        if (!value || value.trim() === '') {
          errors.push(`${field.label} is required`)
        }
      }
    })
    return errors
  }

  return {
    fields,
    values,
    loading,
    saving,
    updateValue,
    setValues,
    save,
    getRequiredFieldErrors,
    reload: loadFields,
  }
}

