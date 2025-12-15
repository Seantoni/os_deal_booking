'use client'

import { useState, type ReactElement } from 'react'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DynamicFormField from './DynamicFormField'
import type { FormSectionWithDefinitions } from '@/types'

interface CategoryOption {
  id: string
  categoryKey: string
  parentCategory: string
  subCategory1: string | null
  subCategory2: string | null
  subCategory3: string | null
  subCategory4: string | null
}

interface UserOption {
  clerkId: string
  name: string | null
  email: string | null
}

interface BusinessOption {
  id: string
  name: string
}

interface DynamicFormSectionProps {
  section: FormSectionWithDefinitions
  values: Record<string, string | null>
  onChange: (fieldKey: string, value: string | null) => void
  disabled?: boolean
  // For special field types
  categories?: CategoryOption[]
  users?: UserOption[]
  businesses?: BusinessOption[]
  // Field-specific overrides
  fieldOverrides?: Record<string, { canEdit?: boolean }>
  // Field addons (custom elements to render next to specific fields)
  fieldAddons?: Record<string, ReactElement>
  // Collapsible
  defaultExpanded?: boolean
  collapsible?: boolean
  // Edit mode flag
  isEditMode?: boolean
}

export default function DynamicFormSection({
  section,
  values,
  onChange,
  disabled = false,
  categories = [],
  users = [],
  businesses = [],
  fieldOverrides = {},
  fieldAddons = {},
  defaultExpanded = true,
  collapsible = true,
  isEditMode = false,
}: DynamicFormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Filter to only visible fields
  const visibleFields = section.fields.filter(f => f.isVisible)

  if (visibleFields.length === 0) {
    return null
  }

  // Group fields by width for grid layout
  const renderFields = () => {
    const elements: ReactElement[] = []
    let i = 0

    while (i < visibleFields.length) {
      const field = visibleFields[i]
      const nextField = visibleFields[i + 1]
      const override = fieldOverrides[field.fieldKey] || {}
      const addon = fieldAddons[field.fieldKey]

      if (field.width === 'half' && nextField?.width === 'half') {
        // Two half-width fields side by side
        const nextOverride = fieldOverrides[nextField.fieldKey] || {}
        const nextAddon = fieldAddons[nextField.fieldKey]
        elements.push(
          <div key={`${field.id}-${nextField.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={addon ? 'flex items-end gap-2' : ''}>
              <div className={addon ? 'flex-1' : ''}>
                <DynamicFormField
                  field={field}
                  value={values[field.fieldKey]}
                  onChange={(value) => onChange(field.fieldKey, value)}
                  disabled={disabled}
                  categories={categories}
                  users={users}
                  businesses={businesses}
                  canEdit={override.canEdit}
                  isEditMode={isEditMode}
                />
              </div>
              {addon}
            </div>
            <div className={nextAddon ? 'flex items-end gap-2' : ''}>
              <div className={nextAddon ? 'flex-1' : ''}>
                <DynamicFormField
                  field={nextField}
                  value={values[nextField.fieldKey]}
                  onChange={(value) => onChange(nextField.fieldKey, value)}
                  disabled={disabled}
                  categories={categories}
                  users={users}
                  businesses={businesses}
                  canEdit={nextOverride.canEdit}
                  isEditMode={isEditMode}
                />
              </div>
              {nextAddon}
            </div>
          </div>
        )
        i += 2
      } else {
        // Full width field
        elements.push(
          <div key={field.id} className={`${field.width === 'half' ? 'md:w-1/2' : ''} ${addon ? 'flex items-end gap-2' : ''}`}>
            <div className={addon ? 'flex-1' : ''}>
              <DynamicFormField
                field={field}
                value={values[field.fieldKey]}
                onChange={(value) => onChange(field.fieldKey, value)}
                disabled={disabled}
                categories={categories}
                users={users}
                businesses={businesses}
                canEdit={override.canEdit}
                isEditMode={isEditMode}
              />
            </div>
            {addon}
          </div>
        )
        i += 1
      }
    }

    return elements
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between text-left"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {section.name}
          </h3>
          {isExpanded ? (
            <ExpandLessIcon fontSize="small" className="text-gray-500" />
          ) : (
            <ExpandMoreIcon fontSize="small" className="text-gray-500" />
          )}
        </button>
      ) : (
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {section.name}
          </h3>
        </div>
      )}

      {isExpanded && (
        <div className="p-4 space-y-3">
          {renderFields()}
        </div>
      )}
    </div>
  )
}
