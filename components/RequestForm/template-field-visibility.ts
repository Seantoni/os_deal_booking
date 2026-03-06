import type { FieldConfig } from './config/field-types'
import type { BookingFormData } from './types'

export function isTemplateFieldVisible(config: FieldConfig, formData: BookingFormData): boolean {
  if (config.showForSubCategories && config.showForSubCategories.length > 0) {
    const currentSubCategory = formData.subCategory1
    if (!currentSubCategory || !config.showForSubCategories.includes(currentSubCategory)) {
      return false
    }
  }

  if (config.showWhen) {
    const dependentValue = formData[config.showWhen.field as keyof BookingFormData]
    const requiredValue = config.showWhen.value

    const isVisible = Array.isArray(requiredValue)
      ? requiredValue.includes(dependentValue as string)
      : dependentValue === requiredValue

    if (!isVisible) {
      return false
    }
  }

  return true
}
