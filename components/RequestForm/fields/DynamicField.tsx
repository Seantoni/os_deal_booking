import type { FieldConfig } from '../config/field-types'
import type { BookingFormData } from '../types'
import TextField from './TextField'
import TextareaField from './TextareaField'
import SelectField from './SelectField'
import NumberField from './NumberField'
import DateField from './DateField'
import TimeField from './TimeField'
import CheckboxField from './CheckboxField'
import RadioField from './RadioField'

interface DynamicFieldProps {
  config: FieldConfig
  formData: BookingFormData
  errors: Record<string, string>
  updateFormData: (field: keyof BookingFormData, value: BookingFormData[keyof BookingFormData]) => void
}

/**
 * DynamicField - Renders the appropriate field component based on config type
 * 
 * Handles:
 * - Field type routing (text, select, textarea, etc.)
 * - Conditional visibility (showWhen)
 * - Subcategory filtering (showForSubCategories)
 * - Value binding
 */
export default function DynamicField({ config, formData, errors, updateFormData }: DynamicFieldProps) {
  // Check subcategory visibility filter
  if (config.showForSubCategories && config.showForSubCategories.length > 0) {
    const currentSubCategory = formData.subCategory1
    if (!currentSubCategory || !config.showForSubCategories.includes(currentSubCategory)) {
      return null
    }
  }

  // Check conditional visibility (showWhen)
  if (config.showWhen) {
    const dependentValue = formData[config.showWhen.field as keyof BookingFormData]
    const requiredValue = config.showWhen.value
    
    // Check if the condition is met
    const isVisible = Array.isArray(requiredValue)
      ? requiredValue.includes(dependentValue as string)
      : dependentValue === requiredValue
    
    if (!isVisible) {
      return null
    }
  }

  const value = formData[config.name as keyof BookingFormData] as string || ''
  const error = errors[config.name]
  
  const handleChange = (newValue: string) => {
    updateFormData(config.name as keyof BookingFormData, newValue)
  }

  // Route to the appropriate field component
  switch (config.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'currency':
      return (
        <TextField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'textarea':
      return (
        <TextareaField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'select':
      return (
        <SelectField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'number':
      return (
        <NumberField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'date':
      return (
        <DateField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'time':
      return (
        <TimeField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'checkbox':
      return (
        <CheckboxField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    case 'radio':
      return (
        <RadioField
          config={config}
          value={value}
          onChange={handleChange}
          error={error}
        />
      )

    default:
      console.warn(`Unknown field type: ${config.type}`)
      return null
  }
}
