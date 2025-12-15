'use client'

import { memo } from 'react'
import { Input, Select, Textarea } from '@/components/ui'
import CategorySelect from './CategorySelect'
import type { FormFieldWithDefinition, BuiltinFieldDefinition } from '@/types'
import type { SelectOption } from '@/app/actions/custom-fields'

// Props for rendering category select
interface CategoryOption {
  id: string
  categoryKey?: string
  parentCategory: string
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

// Props for rendering user select
interface UserOption {
  clerkId: string
  name: string | null
  email: string | null
}

// Props for rendering business select
interface BusinessOption {
  id: string
  name: string
}

interface DynamicFormFieldProps {
  field: FormFieldWithDefinition
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
  // For special field types
  categories?: CategoryOption[]
  users?: UserOption[]
  businesses?: BusinessOption[]
  // Override props
  canEdit?: boolean // For fields like 'name' that have special edit rules
  // Is this an existing entity (edit mode)?
  isEditMode?: boolean
}

function DynamicFormField({
  field,
  value,
  onChange,
  disabled = false,
  categories = [],
  users = [],
  businesses = [],
  canEdit = true,
  isEditMode = false,
}: DynamicFormFieldProps) {
  const isRequired = field.isRequired
  const isReadonly = field.isReadonly || !canEdit
  const fieldDisabled = disabled || isReadonly

  // Get label
  const label = field.fieldSource === 'custom' 
    ? field.customFieldLabel || field.fieldKey
    : field.definition?.label || field.fieldKey

  // Get field type
  const fieldType = field.fieldSource === 'custom'
    ? field.customFieldType || 'text'
    : field.definition?.type || 'text'

  // Get placeholder and help text
  const placeholder = field.fieldSource === 'custom'
    ? field.customFieldPlaceholder
    : field.definition?.placeholder
  const helpText = field.fieldSource === 'custom'
    ? field.customFieldHelpText
    : field.definition?.helpText

  // Get options for select fields (check custom field options first, then built-in)
  const selectOptions: SelectOption[] = field.fieldSource === 'custom'
    ? (field.customFieldOptions || [])
    : (field.definition?.options?.map(o => ({
        value: o.value,
        label: o.label,
      })) || [])

  // Handle special field types
  switch (fieldType) {
    case 'category':
      // Category select - use shared CategorySelect component with search
      return (
        <CategorySelect
          value={value}
          onValueChange={onChange}
          categories={categories}
          label={label}
          required={isRequired}
          disabled={fieldDisabled}
          helpText={helpText}
          placeholder="Select a category"
          size="sm"
        />
      )

    case 'user-select':
      // User select - use custom Select component with portal for proper z-index
      const userSelectOptions = users.map((user) => ({
        value: user.clerkId,
        label: user.name || user.email || user.clerkId,
      }))
      return (
        <Select
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          size="sm"
          options={userSelectOptions}
          placeholder="Select a user"
          helperText={helpText}
        />
      )

    case 'business-select':
      // Business select - show name, locked in edit mode
      const selectedBusiness = businesses.find(b => b.id === value)
      const businessName = selectedBusiness?.name || ''
      
      // In edit mode with existing value, show locked readonly field
      if (isEditMode && value) {
        return (
          <div className="flex flex-col gap-1 w-full">
            <label className="block text-sm font-medium text-gray-700">
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={businessName}
                  readOnly
                  disabled
                  className="w-full border border-gray-200 rounded-lg shadow-sm bg-gray-50 text-gray-700 cursor-not-allowed transition-all duration-200 text-xs px-3 py-1.5 pr-8"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <p className="text-[10px] text-gray-400">Linked business cannot be changed</p>
          </div>
        )
      }
      
      // New mode - allow selection via dropdown
      const businessSelectOptions = businesses.map((b) => ({
        value: b.id,
        label: b.name,
      }))
      return (
        <Select
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          size="sm"
          options={businessSelectOptions}
          placeholder="Select a business"
          helperText={helpText}
        />
      )

    case 'stage-select':
    case 'select':
      // Generic select - use options prop
      return (
        <Select
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          size="sm"
          options={selectOptions}
          placeholder="Select an option"
        />
      )

    case 'textarea':
      return (
        <Textarea
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder}
          rows={3}
          size="sm"
        />
      )

    case 'checkbox':
      return (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              disabled={fieldDisabled}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">
              {label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
          {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
        </div>
      )

    case 'date':
      return (
        <Input
          type="date"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          size="sm"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder}
          size="sm"
        />
      )

    case 'email':
      return (
        <Input
          type="email"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder}
          size="sm"
        />
      )

    case 'phone':
      return (
        <Input
          type="tel"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder}
          size="sm"
        />
      )

    case 'url':
      // Auto-prepend https:// if user enters URL without protocol
      const handleUrlBlur = () => {
        if (value && typeof value === 'string' && value.trim()) {
          const trimmed = value.trim()
          if (!trimmed.match(/^https?:\/\//i)) {
            onChange(`https://${trimmed}`)
          }
        }
      }
      return (
        <Input
          type="url"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          onBlur={handleUrlBlur}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder || 'https://example.com'}
          size="sm"
        />
      )

    case 'text':
    default:
      return (
        <Input
          type="text"
          label={label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={fieldDisabled}
          required={isRequired}
          placeholder={placeholder}
          size="sm"
        />
      )
  }
}

// Memoize to prevent re-renders when other fields change
export default memo(DynamicFormField)
