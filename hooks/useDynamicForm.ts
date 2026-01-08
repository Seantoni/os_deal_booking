'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFormConfiguration } from '@/app/actions/form-config'
import { getCustomFieldsWithValues, saveCustomFieldValues } from '@/app/actions/custom-fields'
import type { FormEntityType, FormSectionWithDefinitions, FormFieldWithDefinition } from '@/types'

interface UseDynamicFormOptions {
  entityType: FormEntityType
  entityId?: string | null
  initialValues?: Record<string, string | null>
  // Optional pre-loaded form config (from cache or server)
  preloadedSections?: FormSectionWithDefinitions[]
  preloadedInitialized?: boolean
}

export function useDynamicForm({ 
  entityType, 
  entityId, 
  initialValues = {},
  preloadedSections,
  preloadedInitialized,
}: UseDynamicFormOptions) {
  const [sections, setSections] = useState<FormSectionWithDefinitions[]>(preloadedSections || [])
  const [values, setValues] = useState<Record<string, string | null>>(initialValues)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(!preloadedSections)
  const [initialized, setInitialized] = useState(preloadedInitialized || false)
  
  // Track loaded entity to prevent redundant fetches
  const loadedEntityRef = useRef<string | null>(null)

  // Load form configuration (only if not preloaded)
  const loadConfiguration = useCallback(async () => {
    // Skip if already have preloaded sections
    if (preloadedSections && preloadedSections.length > 0) {
      setSections(preloadedSections)
      setInitialized(preloadedInitialized || false)
      setLoading(false)
      return
    }
    
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
  }, [entityType, preloadedSections, preloadedInitialized])

  // Load custom field values for existing entity
  const loadCustomFieldValues = useCallback(async (targetEntityId: string) => {
    if (loadedEntityRef.current === targetEntityId) return
    loadedEntityRef.current = targetEntityId
    
    try {
      const customResult = await getCustomFieldsWithValues(targetEntityId, entityType)
      if (customResult.success && customResult.data) {
        const cfValues: Record<string, string | null> = {}
        customResult.data.forEach((field: { fieldKey: string; value: string | null }) => {
          cfValues[field.fieldKey] = field.value
        })
        setCustomFieldValues(cfValues)
      }
    } catch (error) {
      console.error('Failed to load custom field values:', error)
    }
  }, [entityType])

  // Initial load
  useEffect(() => {
    loadConfiguration()
  }, [loadConfiguration])

  // Load custom field values when entity changes
  useEffect(() => {
    if (entityId) {
      loadCustomFieldValues(entityId)
    } else {
      // New entity - clear custom field values
      loadedEntityRef.current = null
      setCustomFieldValues({})
    }
  }, [entityId, loadCustomFieldValues])

  // Update initial values when they change (e.g., when editing an entity)
  useEffect(() => {
    setValues(initialValues)
  }, [JSON.stringify(initialValues)])

  // Get a value by field key (checks both built-in and custom)
  const getValue = useCallback((fieldKey: string): string | null => {
    // Check if it's a custom field
    if (fieldKey.startsWith('cf_')) {
      return customFieldValues[fieldKey] ?? null
    }
    return values[fieldKey] ?? null
  }, [values, customFieldValues])

  // Set a value by field key
  const setValue = useCallback((fieldKey: string, value: string | null) => {
    if (fieldKey.startsWith('cf_')) {
      setCustomFieldValues(prev => ({ ...prev, [fieldKey]: value }))
    } else {
      setValues(prev => ({ ...prev, [fieldKey]: value }))
    }
  }, [])

  // Get all values (merged)
  const getAllValues = useCallback((): Record<string, string | null> => {
    return { ...values, ...customFieldValues }
  }, [values, customFieldValues])

  // Save custom field values
  const saveCustomFields = useCallback(async (targetEntityId: string): Promise<{ success: boolean; error?: string }> => {
    if (Object.keys(customFieldValues).length === 0) {
      return { success: true }
    }
    return saveCustomFieldValues(targetEntityId, entityType, customFieldValues)
  }, [entityType, customFieldValues])

  // Get field config by key
  const getFieldConfig = useCallback((fieldKey: string): FormFieldWithDefinition | null => {
    for (const section of sections) {
      const field = section.fields.find(f => f.fieldKey === fieldKey)
      if (field) return field
    }
    return null
  }, [sections])

  // Check if field is visible
  const isFieldVisible = useCallback((fieldKey: string): boolean => {
    const config = getFieldConfig(fieldKey)
    return config ? config.isVisible : true
  }, [getFieldConfig])

  // Check if field is required
  const isFieldRequired = useCallback((fieldKey: string): boolean => {
    const config = getFieldConfig(fieldKey)
    return config?.isRequired || false
  }, [getFieldConfig])

  // Get all visible fields flat
  const getVisibleFields = useCallback((): FormFieldWithDefinition[] => {
    return sections.flatMap(s => s.fields.filter(f => f.isVisible))
  }, [sections])

  // Validate required fields
  const validateRequired = useCallback((): string[] => {
    const errors: string[] = []
    const allValues = getAllValues()
    
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.isVisible && field.isRequired) {
          const value = allValues[field.fieldKey]
          if (!value || value.trim() === '') {
            const label = field.fieldSource === 'custom' 
              ? field.customFieldLabel || field.fieldKey
              : field.definition?.label || field.fieldKey
            errors.push(`${label} is required`)
          }
        }
      }
    }
    
    return errors
  }, [sections, getAllValues])

  return {
    sections,
    loading,
    initialized,
    values,
    customFieldValues,
    getValue,
    setValue,
    setValues,
    setCustomFieldValues,
    getAllValues,
    saveCustomFields,
    getFieldConfig,
    isFieldVisible,
    isFieldRequired,
    getVisibleFields,
    validateRequired,
    reload: loadConfiguration,
  }
}
