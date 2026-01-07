'use client'

import { useState, memo, type ReactElement } from 'react'
import DynamicFormField from './DynamicFormField'
import type { FormSectionWithDefinitions, CategoryRecord } from '@/types'

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
  categories?: CategoryRecord[]
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

function DynamicFormSection({
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
          <div key={`${field.id}-${nextField.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
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
    <div className="rounded-lg overflow-hidden border border-slate-200/60 bg-white shadow-sm">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-100/80 transition-colors group"
          aria-label={isExpanded ? 'Contraer sección' : 'Expandir sección'}
        >
          <div className="flex items-center gap-2">
            <div className={`w-1 h-4 rounded-full transition-colors ${isExpanded ? 'bg-blue-500' : 'bg-slate-300 group-hover:bg-slate-400'}`} />
            <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            {section.name}
          </h3>
            <span className="text-[10px] text-slate-400 font-normal">
              ({visibleFields.length})
            </span>
          </div>
          <svg 
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-slate-100/50">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            {section.name}
          </h3>
            <span className="text-[10px] text-slate-400 font-normal">
              ({visibleFields.length})
            </span>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="px-3 py-3 space-y-2.5 bg-white">
          {renderFields()}
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders when sibling sections update
export default memo(DynamicFormSection)
