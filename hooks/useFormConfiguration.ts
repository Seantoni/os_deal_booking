'use client'

import { useState, useEffect, useCallback } from 'react'
import { getFormConfiguration } from '@/app/actions/form-config'
import type { FormEntityType, FormSectionWithDefinitions, FormFieldWithDefinition } from '@/types'

export function useFormConfiguration(entityType: FormEntityType) {
  const [sections, setSections] = useState<FormSectionWithDefinitions[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const loadConfiguration = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getFormConfiguration(entityType)
      if (result.success && result.data) {
        setSections(result.data.sections)
        setInitialized(result.data.initialized)
      }
    } catch (error) {
      console.error('Failed to load form configuration:', error)
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => {
    loadConfiguration()
  }, [loadConfiguration])

  // Get field configuration by field key
  function getFieldConfig(fieldKey: string): FormFieldWithDefinition | null {
    for (const section of sections) {
      const field = section.fields.find(f => f.fieldKey === fieldKey)
      if (field) return field
    }
    return null
  }

  // Get field width (defaults to 'full' if not configured)
  function getFieldWidth(fieldKey: string): 'full' | 'half' {
    const config = getFieldConfig(fieldKey)
    return config?.width || 'full'
  }

  // Check if field is visible
  function isFieldVisible(fieldKey: string): boolean {
    const config = getFieldConfig(fieldKey)
    return config ? config.isVisible : true // Default to visible if not configured
  }

  // Check if field is required
  function isFieldRequired(fieldKey: string): boolean {
    const config = getFieldConfig(fieldKey)
    if (config) return config.isRequired
    // Fallback to built-in definition
    return false
  }

  // Check if field is readonly
  function isFieldReadonly(fieldKey: string): boolean {
    const config = getFieldConfig(fieldKey)
    return config?.isReadonly || false
  }

  return {
    sections,
    loading,
    initialized,
    getFieldConfig,
    getFieldWidth,
    isFieldVisible,
    isFieldRequired,
    isFieldReadonly,
    reload: loadConfiguration,
  }
}

