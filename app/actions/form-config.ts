'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, handleServerActionError } from '@/lib/utils/server-actions'
import type { 
  FormEntityType, 
  FormSection, 
  FormSectionWithDefinitions,
  FormFieldConfig, 
  FormFieldWithDefinition,
  FieldWidth,
} from '@/types'
import { 
  getBuiltinFieldsForEntity, 
  getBuiltinFieldDefinition,
  DEFAULT_SECTIONS,
} from '@/types'
import { invalidateEntity } from '@/lib/cache'

// ============================================================================
// GET FORM CONFIGURATION
// ============================================================================

interface GetFormConfigResult {
  sections: FormSectionWithDefinitions[]
  initialized: boolean
}

export async function getFormConfiguration(entityType: FormEntityType): Promise<{
  success: boolean
  data?: GetFormConfigResult
  error?: string
}> {
  try {
    await requireAuth()

    // Get sections with their field configs
    const sections = await prisma.formSection.findMany({
      where: { entityType, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        fields: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    // If no sections exist, return empty with initialized: false
    if (sections.length === 0) {
      return {
        success: true,
        data: { sections: [], initialized: false },
      }
    }

    // Get custom fields for this entity type to merge labels
    const customFields = await prisma.customField.findMany({
      where: { entityType, isActive: true },
    })

    // Merge field configs with their definitions
    const sectionsWithDefinitions = sections.map((section: typeof sections[number]) => ({
      ...section,
      fields: section.fields.map((field: typeof section.fields[number]) => {
        const builtinDef = getBuiltinFieldDefinition(entityType, field.fieldKey)
        const customField = customFields.find(cf => cf.fieldKey === field.fieldKey)
        
        return {
          ...field,
          entityType: field.entityType as FormEntityType,
          width: field.width as FieldWidth,
          fieldSource: field.fieldSource as 'builtin' | 'custom',
          definition: builtinDef,
          customFieldLabel: customField?.label,
          customFieldType: customField?.fieldType,
          customFieldOptions: customField?.options as { value: string; label: string }[] | undefined,
          customFieldPlaceholder: customField?.placeholder ?? undefined,
          customFieldHelpText: customField?.helpText ?? undefined,
        } as FormFieldWithDefinition
      }),
    }))

    return {
      success: true,
      data: { 
        sections: sectionsWithDefinitions as FormSectionWithDefinitions[],
        initialized: true,
      },
    }
  } catch (error) {
    return handleServerActionError(error, 'getFormConfiguration')
  }
}

// ============================================================================
// INITIALIZE FORM CONFIGURATION (Creates default sections and fields)
// ============================================================================

export async function initializeFormConfiguration(entityType: FormEntityType): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireAdmin()

    // Check if already initialized
    const existingSections = await prisma.formSection.count({
      where: { entityType },
    })

    if (existingSections > 0) {
      return { success: false, error: 'Form configuration already initialized for this entity type' }
    }

    // Get default sections and built-in fields
    const defaultSections = DEFAULT_SECTIONS[entityType]
    const builtinFields = getBuiltinFieldsForEntity(entityType)

    // Create sections and field configs in a transaction
    await prisma.$transaction(async (tx) => {
      let sectionOrder = 0
      
      for (const sectionDef of defaultSections) {
        // Create section
        const section = await tx.formSection.create({
          data: {
            entityType,
            name: sectionDef.name,
            displayOrder: sectionOrder++,
            isCollapsed: false,
            isActive: true,
          },
        })

        // Create field configs for this section
        let fieldOrder = 0
        for (const fieldKey of sectionDef.fields) {
          const builtinField = builtinFields.find(f => f.key === fieldKey)
          if (builtinField) {
            await tx.formFieldConfig.create({
              data: {
                entityType,
                sectionId: section.id,
                fieldKey,
                fieldSource: 'builtin',
                displayOrder: fieldOrder++,
                isVisible: true,
                isRequired: builtinField.defaultRequired,
                isReadonly: false,
                width: 'full',
              },
            })
          }
        }
      }

      // Also add custom fields to the last section (or create an "Other" section)
      const customFields = await tx.customField.findMany({
        where: { entityType, isActive: true },
        orderBy: { displayOrder: 'asc' },
      })

      if (customFields.length > 0) {
        // Get or create a section for custom fields
        let customSection = await tx.formSection.findFirst({
          where: { entityType, name: 'Custom Fields' },
        })

        if (!customSection) {
          customSection = await tx.formSection.create({
            data: {
              entityType,
              name: 'Custom Fields',
              displayOrder: sectionOrder++,
              isCollapsed: false,
              isActive: true,
            },
          })
        }

        let fieldOrder = 0
        for (const cf of customFields) {
          await tx.formFieldConfig.create({
            data: {
              entityType,
              sectionId: customSection.id,
              fieldKey: cf.fieldKey,
              fieldSource: 'custom',
              displayOrder: fieldOrder++,
              isVisible: true,
              isRequired: cf.isRequired,
              isReadonly: false,
              width: 'full',
            },
          })
        }
      }
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'initializeFormConfiguration')
  }
}

// ============================================================================
// SECTION CRUD OPERATIONS
// ============================================================================

export async function createFormSection(
  entityType: FormEntityType,
  name: string
): Promise<{ success: boolean; data?: FormSection; error?: string }> {
  try {
    await requireAdmin()

    // Get max display order
    const maxOrder = await prisma.formSection.aggregate({
      where: { entityType },
      _max: { displayOrder: true },
    })

    const section = await prisma.formSection.create({
      data: {
        entityType,
        name,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        isCollapsed: false,
        isActive: true,
      },
      include: { fields: true },
    })

    invalidateEntity('form-config')
    return { 
      success: true, 
      data: section as FormSection,
    }
  } catch (error) {
    return handleServerActionError(error, 'createFormSection')
  }
}

export async function updateFormSection(
  sectionId: string,
  data: { name?: string; isCollapsed?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    await prisma.formSection.update({
      where: { id: sectionId },
      data,
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'updateFormSection')
  }
}

export async function deleteFormSection(sectionId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireAdmin()

    // Get the section with its fields
    const section = await prisma.formSection.findUnique({
      where: { id: sectionId },
      include: { fields: true },
    })

    if (!section) {
      return { success: false, error: 'Section not found' }
    }

    // Check if there are other sections to move fields to
    const otherSections = await prisma.formSection.findMany({
      where: { 
        entityType: section.entityType, 
        id: { not: sectionId },
        isActive: true,
      },
      orderBy: { displayOrder: 'asc' },
    })

    if (otherSections.length === 0) {
      return { success: false, error: 'Cannot delete the only section. Create another section first.' }
    }

    // Move all fields to the first available section
    const targetSection = otherSections[0]
    const maxOrder = await prisma.formFieldConfig.aggregate({
      where: { sectionId: targetSection.id },
      _max: { displayOrder: true },
    })

    await prisma.$transaction(async (tx) => {
      // Move fields to target section
      let order = (maxOrder._max.displayOrder ?? -1) + 1
      for (const field of section.fields) {
        await tx.formFieldConfig.update({
          where: { id: field.id },
          data: { 
            sectionId: targetSection.id,
            displayOrder: order++,
          },
        })
      }

      // Delete the section
      await tx.formSection.delete({
        where: { id: sectionId },
      })
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteFormSection')
  }
}

export async function reorderSections(
  entityType: FormEntityType,
  sectionIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    await prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.formSection.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'reorderSections')
  }
}

// ============================================================================
// FIELD CONFIG OPERATIONS
// ============================================================================

export async function updateFormFieldConfig(
  fieldId: string,
  data: {
    isVisible?: boolean
    isRequired?: boolean
    isReadonly?: boolean
    width?: FieldWidth
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    // Get the field config to check constraints
    const fieldConfig = await prisma.formFieldConfig.findUnique({
      where: { id: fieldId },
    })

    if (!fieldConfig) {
      return { success: false, error: 'Field configuration not found' }
    }

    // Check if this is a built-in field with restrictions
    if (fieldConfig.fieldSource === 'builtin') {
      const builtinDef = getBuiltinFieldDefinition(
        fieldConfig.entityType as FormEntityType,
        fieldConfig.fieldKey
      )

      if (builtinDef) {
        // Check if trying to hide a field that can't be hidden
        if (data.isVisible === false && !builtinDef.canHide) {
          return { success: false, error: `The "${builtinDef.label}" field cannot be hidden` }
        }

        // Check if trying to change required status of a field that doesn't allow it
        if (data.isRequired !== undefined && !builtinDef.canSetRequired) {
          return { success: false, error: `The "${builtinDef.label}" field's required status cannot be changed` }
        }
      }
    }

    await prisma.formFieldConfig.update({
      where: { id: fieldId },
      data,
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'updateFormFieldConfig')
  }
}

export async function moveFieldToSection(
  fieldId: string,
  targetSectionId: string,
  displayOrder?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    // Get current max order in target section if not specified
    let newOrder = displayOrder
    if (newOrder === undefined) {
      const maxOrder = await prisma.formFieldConfig.aggregate({
        where: { sectionId: targetSectionId },
        _max: { displayOrder: true },
      })
      newOrder = (maxOrder._max.displayOrder ?? -1) + 1
    }

    await prisma.formFieldConfig.update({
      where: { id: fieldId },
      data: {
        sectionId: targetSectionId,
        displayOrder: newOrder,
      },
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'moveFieldToSection')
  }
}

export async function reorderFieldsInSection(
  sectionId: string,
  fieldIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    await prisma.$transaction(
      fieldIds.map((id, index) =>
        prisma.formFieldConfig.update({
          where: { id },
          data: { displayOrder: index },
        })
      )
    )

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'reorderFieldsInSection')
  }
}

// ============================================================================
// ADD CUSTOM FIELD TO FORM CONFIG (Called when a new custom field is created)
// ============================================================================

export async function addCustomFieldToFormConfig(
  entityType: FormEntityType,
  fieldKey: string,
  isRequired: boolean = false,
  targetSectionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if form config is initialized for this entity
    const existingSections = await prisma.formSection.findMany({
      where: { entityType, isActive: true },
      orderBy: { displayOrder: 'desc' },
    })

    if (existingSections.length === 0) {
      // Form config not initialized yet, skip adding to config
      return { success: true }
    }

    // Check if field already exists in config
    const existingConfig = await prisma.formFieldConfig.findUnique({
      where: { entityType_fieldKey: { entityType, fieldKey } },
    })

    if (existingConfig) {
      return { success: true } // Already exists
    }

    // Find target section or fallback to "Custom Fields"
    let customSection = targetSectionId
      ? existingSections.find((s) => s.id === targetSectionId)
      : undefined

    if (!customSection) {
      customSection = existingSections.find((s: typeof existingSections[number]) => s.name === 'Custom Fields')
    }
    
    if (!customSection) {
      customSection = await prisma.formSection.create({
        data: {
          entityType,
          name: 'Custom Fields',
          displayOrder: (existingSections[0]?.displayOrder ?? 0) + 1,
          isCollapsed: false,
          isActive: true,
        },
      })
    }

    // Get max order in the section
    const maxOrder = await prisma.formFieldConfig.aggregate({
      where: { sectionId: customSection.id },
      _max: { displayOrder: true },
    })

    // Add the field config
    await prisma.formFieldConfig.create({
      data: {
        entityType,
        sectionId: customSection.id,
        fieldKey,
        fieldSource: 'custom',
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        isVisible: true,
        isRequired,
        isReadonly: false,
        width: 'full',
      },
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'addCustomFieldToFormConfig')
  }
}

/**
 * Remove a custom field from form config (by fieldKey)
 */
export async function removeCustomFieldFromFormConfig(
  entityType: FormEntityType,
  fieldKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    await prisma.formFieldConfig.deleteMany({
      where: { entityType, fieldKey, fieldSource: 'custom' },
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'removeCustomFieldFromFormConfig')
  }
}

// ============================================================================
// SYNC CUSTOM FIELDS (Adds missing custom fields to form config)
// ============================================================================

export async function syncCustomFieldsToFormConfig(
  entityType: FormEntityType
): Promise<{ success: boolean; addedCount: number; error?: string }> {
  try {
    await requireAdmin()

    // Get all custom fields for this entity
    const customFields = await prisma.customField.findMany({
      where: { entityType, isActive: true },
    })

    // Get existing field configs
    const existingConfigs = await prisma.formFieldConfig.findMany({
      where: { entityType, fieldSource: 'custom' },
    })

    const existingKeys = new Set(existingConfigs.map((c: typeof existingConfigs[number]) => c.fieldKey))
    const missingFields = customFields.filter(cf => !existingKeys.has(cf.fieldKey))

    let addedCount = 0
    for (const cf of missingFields) {
      const result = await addCustomFieldToFormConfig(entityType, cf.fieldKey, cf.isRequired)
      if (result.success) addedCount++
    }

    return { success: true, addedCount }
  } catch (error) {
    const errorResult = handleServerActionError(error, 'syncCustomFieldsToFormConfig')
    return { ...errorResult, addedCount: 0 }
  }
}

// ============================================================================
// RESET FORM CONFIGURATION (Deletes existing and reinitializes from defaults)
// ============================================================================

export async function resetFormConfiguration(entityType: FormEntityType): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireAdmin()

    // Delete all existing sections and field configs for this entity type
    await prisma.$transaction(async (tx) => {
      // Delete field configs first (foreign key constraint)
      await tx.formFieldConfig.deleteMany({
        where: { entityType },
      })

      // Delete sections
      await tx.formSection.deleteMany({
        where: { entityType },
      })
    })

    // Now reinitialize using the same logic as initializeFormConfiguration
    const defaultSections = DEFAULT_SECTIONS[entityType]
    const builtinFields = getBuiltinFieldsForEntity(entityType)

    await prisma.$transaction(async (tx) => {
      let sectionOrder = 0
      
      for (const sectionDef of defaultSections) {
        const section = await tx.formSection.create({
          data: {
            entityType,
            name: sectionDef.name,
            displayOrder: sectionOrder++,
            isCollapsed: false,
            isActive: true,
          },
        })

        let fieldOrder = 0
        for (const fieldKey of sectionDef.fields) {
          const builtinField = builtinFields.find(f => f.key === fieldKey)
          if (builtinField) {
            await tx.formFieldConfig.create({
              data: {
                entityType,
                sectionId: section.id,
                fieldKey,
                fieldSource: 'builtin',
                displayOrder: fieldOrder++,
                isVisible: true,
                isRequired: builtinField.defaultRequired,
                isReadonly: false,
                width: 'full',
              },
            })
          }
        }
      }

      // Add custom fields back to "Custom Fields" section
      const customFields = await tx.customField.findMany({
        where: { entityType, isActive: true },
        orderBy: { displayOrder: 'asc' },
      })

      if (customFields.length > 0) {
        const customSection = await tx.formSection.create({
          data: {
            entityType,
            name: 'Custom Fields',
            displayOrder: sectionOrder++,
            isCollapsed: false,
            isActive: true,
          },
        })

        let fieldOrder = 0
        for (const cf of customFields) {
          await tx.formFieldConfig.create({
            data: {
              entityType,
              sectionId: customSection.id,
              fieldKey: cf.fieldKey,
              fieldSource: 'custom',
              displayOrder: fieldOrder++,
              isVisible: true,
              isRequired: cf.isRequired,
              isReadonly: false,
              width: 'full',
            },
          })
        }
      }
    })

    invalidateEntity('form-config')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'resetFormConfiguration')
  }
}

// ============================================================================
// SYNC BUILTIN FIELDS (Adds missing built-in fields to existing config)
// ============================================================================

export async function syncBuiltinFieldsToFormConfig(entityType: FormEntityType): Promise<{
  success: boolean
  addedCount: number
  error?: string
}> {
  try {
    await requireAdmin()

    // Get all built-in fields for this entity type
    const builtinFields = getBuiltinFieldsForEntity(entityType)
    const defaultSections = DEFAULT_SECTIONS[entityType]

    // Get existing sections
    const existingSections = await prisma.formSection.findMany({
      where: { entityType, isActive: true },
      orderBy: { displayOrder: 'asc' },
    })

    if (existingSections.length === 0) {
      return { success: false, error: 'Form configuration not initialized. Please initialize first.', addedCount: 0 }
    }

    // Get existing field configs
    const existingConfigs = await prisma.formFieldConfig.findMany({
      where: { entityType, fieldSource: 'builtin' },
    })

    const existingKeys = new Set(existingConfigs.map((c: typeof existingConfigs[number]) => c.fieldKey))

    // Find missing built-in fields and determine which section they should go to
    let addedCount = 0
    await prisma.$transaction(async (tx) => {
      for (const builtinField of builtinFields) {
        if (existingKeys.has(builtinField.key)) {
          continue // Field already exists
        }

        // Find the section this field should belong to based on DEFAULT_SECTIONS
        let targetSection = null
        for (const defaultSection of defaultSections) {
          if (defaultSection.fields.includes(builtinField.key)) {
            // Try to find an existing section with this name
            targetSection = existingSections.find((s: typeof existingSections[number]) => s.name === defaultSection.name)
            if (targetSection) break
          }
        }

        // If no matching section found, use the first section
        if (!targetSection && existingSections.length > 0) {
          targetSection = existingSections[0]
        }

        if (targetSection) {
          // Get max order in the section
          const maxOrder = await tx.formFieldConfig.aggregate({
            where: { sectionId: targetSection.id },
            _max: { displayOrder: true },
          })

          await tx.formFieldConfig.create({
            data: {
              entityType,
              sectionId: targetSection.id,
              fieldKey: builtinField.key,
              fieldSource: 'builtin',
              displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
              isVisible: true,
              isRequired: builtinField.defaultRequired,
              isReadonly: false,
              width: 'full',
            },
          })

          addedCount++
        }
      }
    })

    invalidateEntity('form-config')
    return { success: true, addedCount }
  } catch (error) {
    const errorResult = handleServerActionError(error, 'syncBuiltinFieldsToFormConfig')
    return { ...errorResult, addedCount: 0 }
  }
}

