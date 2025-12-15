'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { handleServerActionError, requireAuth, getUserRole } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'email' | 'phone' | 'url'
export type EntityType = 'business' | 'opportunity' | 'deal' | 'lead'

export interface SelectOption {
  value: string
  label: string
}

export interface CustomField {
  id: string
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  entityType: EntityType
  isRequired: boolean
  placeholder: string | null
  defaultValue: string | null
  helpText: string | null
  options: SelectOption[] | null
  displayOrder: number
  showInTable: boolean
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CustomFieldValue {
  id: string
  customFieldId: string
  entityId: string
  entityType: EntityType
  value: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Generate a unique field key from the label
 */
function generateFieldKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30)
  const suffix = Math.random().toString(36).substring(2, 8)
  return `cf_${slug}_${suffix}`
}

/**
 * Check if user is admin
 */
async function checkAdmin(): Promise<{ success: false; error: string } | { success: true; userId: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const role = await getUserRole()
  if (role !== 'admin') {
    return { success: false, error: 'Admin access required' }
  }
  
  return { success: true, userId: authResult.userId }
}

/**
 * Get all custom fields, optionally filtered by entity type
 */
export async function getCustomFields(entityType?: EntityType) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const whereClause = entityType 
      ? { entityType, isActive: true }
      : { isActive: true }

    const fields = await prisma.customField.findMany({
      where: whereClause,
      orderBy: [
        { entityType: 'asc' },
        { displayOrder: 'asc' },
        { label: 'asc' }
      ],
    })

    // Parse options JSON for select fields
    const parsedFields = fields.map((field: any) => ({
      ...field,
      options: field.options ? (field.options as unknown as SelectOption[]) : null,
    }))

    return { success: true, data: parsedFields as CustomField[] }
  } catch (error) {
    return handleServerActionError(error, 'getCustomFields')
  }
}

/**
 * Get all custom fields including inactive ones (admin only)
 */
export async function getAllCustomFields() {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  try {
    const fields = await prisma.customField.findMany({
      orderBy: [
        { entityType: 'asc' },
        { displayOrder: 'asc' },
        { label: 'asc' }
      ],
    })

    const parsedFields = fields.map((field: any) => ({
      ...field,
      options: field.options ? (field.options as unknown as SelectOption[]) : null,
    }))

    return { success: true, data: parsedFields as CustomField[] }
  } catch (error) {
    return handleServerActionError(error, 'getAllCustomFields')
  }
}

/**
 * Create a new custom field (admin only)
 */
export async function createCustomField(data: {
  label: string
  fieldType: CustomFieldType
  entityType: EntityType
  isRequired?: boolean
  placeholder?: string
  defaultValue?: string
  helpText?: string
  options?: SelectOption[]
  showInTable?: boolean
}) {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  const { userId } = adminCheck

  try {
    // Validate required fields
    if (!data.label?.trim()) {
      return { success: false, error: 'Label is required' }
    }

    if (!data.fieldType) {
      return { success: false, error: 'Field type is required' }
    }

    if (!data.entityType) {
      return { success: false, error: 'Entity type is required' }
    }

    // For select fields, validate options
    if (data.fieldType === 'select' && (!data.options || data.options.length === 0)) {
      return { success: false, error: 'Select fields require at least one option' }
    }

    // Get the max display order for this entity type
    const maxOrderField = await prisma.customField.findFirst({
      where: { entityType: data.entityType },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })
    const displayOrder = (maxOrderField?.displayOrder ?? -1) + 1

    const field = await prisma.customField.create({
      data: {
        fieldKey: generateFieldKey(data.label),
        label: data.label.trim(),
        fieldType: data.fieldType,
        entityType: data.entityType,
        isRequired: data.isRequired ?? false,
        placeholder: data.placeholder?.trim() || null,
        defaultValue: data.defaultValue?.trim() || null,
        helpText: data.helpText?.trim() || null,
        options: data.fieldType === 'select' && data.options 
          ? (data.options as unknown as Prisma.InputJsonValue) 
          : Prisma.JsonNull,
        displayOrder,
        showInTable: data.showInTable ?? false,
        createdBy: userId,
      },
    })

    invalidateEntity('custom-fields')
    return { 
      success: true, 
      data: {
        ...field,
        options: field.options ? (field.options as unknown as SelectOption[]) : null,
      } as CustomField 
    }
  } catch (error) {
    return handleServerActionError(error, 'createCustomField')
  }
}

/**
 * Update a custom field (admin only)
 */
export async function updateCustomField(id: string, data: {
  label?: string
  isRequired?: boolean
  placeholder?: string
  defaultValue?: string
  helpText?: string
  options?: SelectOption[]
  displayOrder?: number
  showInTable?: boolean
  isActive?: boolean
}) {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  try {
    const existingField = await prisma.customField.findUnique({
      where: { id },
    })

    if (!existingField) {
      return { success: false, error: 'Custom field not found' }
    }

    // For select fields, validate options if provided
    if (existingField.fieldType === 'select' && data.options !== undefined && data.options.length === 0) {
      return { success: false, error: 'Select fields require at least one option' }
    }

    const updateData: any = {}
    
    if (data.label !== undefined) updateData.label = data.label.trim()
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired
    if (data.placeholder !== undefined) updateData.placeholder = data.placeholder?.trim() || null
    if (data.defaultValue !== undefined) updateData.defaultValue = data.defaultValue?.trim() || null
    if (data.helpText !== undefined) updateData.helpText = data.helpText?.trim() || null
    if (data.options !== undefined && existingField.fieldType === 'select') updateData.options = data.options
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder
    if (data.showInTable !== undefined) updateData.showInTable = data.showInTable
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const field = await prisma.customField.update({
      where: { id },
      data: updateData,
    })

    invalidateEntity('custom-fields')
    return { 
      success: true, 
      data: {
        ...field,
        options: field.options ? (field.options as unknown as SelectOption[]) : null,
      } as CustomField 
    }
  } catch (error) {
    return handleServerActionError(error, 'updateCustomField')
  }
}

/**
 * Delete a custom field (admin only)
 * This will also delete all associated values
 */
export async function deleteCustomField(id: string) {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  try {
    await prisma.customField.delete({
      where: { id },
    })

    invalidateEntity('custom-fields')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteCustomField')
  }
}

/**
 * Delete a custom field by its fieldKey (admin only)
 * Useful when the client only knows the fieldKey from form-config
 */
export async function deleteCustomFieldByKey(fieldKey: string) {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  try {
    const existing = await prisma.customField.findUnique({ where: { fieldKey } })
    if (!existing) {
      return { success: false, error: 'Custom field not found' }
    }

    await prisma.customField.delete({
      where: { fieldKey },
    })

    invalidateEntity('custom-fields')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'deleteCustomFieldByKey')
  }
}

/**
 * Reorder custom fields (admin only)
 */
export async function reorderCustomFields(fieldOrders: { id: string; displayOrder: number }[]) {
  const adminCheck = await checkAdmin()
  if (!adminCheck.success) {
    return adminCheck
  }

  try {
    await prisma.$transaction(
      fieldOrders.map(({ id, displayOrder }) =>
        prisma.customField.update({
          where: { id },
          data: { displayOrder },
        })
      )
    )

    invalidateEntity('custom-fields')
    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'reorderCustomFields')
  }
}

/**
 * Get custom field values for an entity
 */
export async function getCustomFieldValues(entityId: string, entityType: EntityType) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const values = await prisma.customFieldValue.findMany({
      where: {
        entityId,
        entityType,
      },
      include: {
        customField: true,
      },
    })

    // Transform to a map of fieldKey -> value for easier access
    const valueMap: Record<string, string | null> = {}
    values.forEach((v: any) => {
      valueMap[v.customField.fieldKey] = v.value
    })

    return { success: true, data: valueMap }
  } catch (error) {
    return handleServerActionError(error, 'getCustomFieldValues')
  }
}

/**
 * Save custom field values for an entity
 */
export async function saveCustomFieldValues(
  entityId: string,
  entityType: EntityType,
  values: Record<string, string | null>
) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Get all custom fields for this entity type
    const fields = await prisma.customField.findMany({
      where: {
        entityType,
        isActive: true,
      },
    })

    // Create a map of fieldKey -> field
    const fieldMap = new Map(fields.map((f: any) => [f.fieldKey, f]))

    // Validate required fields
    for (const field of fields) {
      if (field.isRequired) {
        const value = values[field.fieldKey]
        if (!value || value.trim() === '') {
          return { success: false, error: `${field.label} is required` }
        }
      }
    }

    // Upsert each value
    const operations = Object.entries(values)
      .filter(([fieldKey]) => fieldMap.has(fieldKey))
      .map(([fieldKey, value]) => {
        const field = fieldMap.get(fieldKey)!
        return prisma.customFieldValue.upsert({
          where: {
            customFieldId_entityId: {
              customFieldId: field.id,
              entityId,
            },
          },
          create: {
            customFieldId: field.id,
            entityId,
            entityType,
            value: value?.trim() || null,
          },
          update: {
            value: value?.trim() || null,
          },
        })
      })

    await prisma.$transaction(operations)

    return { success: true }
  } catch (error) {
    return handleServerActionError(error, 'saveCustomFieldValues')
  }
}

/**
 * Get custom fields with their values for an entity (combined query)
 */
export async function getCustomFieldsWithValues(entityId: string, entityType: EntityType) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const fields = await prisma.customField.findMany({
      where: {
        entityType,
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { label: 'asc' }
      ],
      include: {
        values: {
          where: { entityId },
        },
      },
    })

    const result = fields.map((field: any) => ({
      ...field,
      options: field.options ? (field.options as unknown as SelectOption[]) : null,
      value: field.values[0]?.value ?? field.defaultValue ?? null,
    }))

    return { success: true, data: result }
  } catch (error) {
    return handleServerActionError(error, 'getCustomFieldsWithValues')
  }
}
