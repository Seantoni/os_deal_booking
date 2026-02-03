'use server'

/**
 * Business Bulk Operations (CSV Import/Export)
 * Separated from businesses.ts for better maintainability
 */

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { isAdmin } from '@/lib/auth/roles'
import { logActivity } from '@/lib/activity-log'

// ============================================
// Bulk Import Types
// ============================================

export interface BulkBusinessRow {
  // Core identification
  id?: string
  name: string
  // Contact info
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  // Category (supports both ID and parent name)
  category?: string
  // Ownership
  owner?: string // User name or email
  salesTeam?: string
  // Business info
  tier?: string
  accountManager?: string
  ere?: string
  salesType?: string
  isAsesor?: string
  osAsesor?: string
  // Online presence
  website?: string
  instagram?: string
  description?: string
  // Legal/Tax
  ruc?: string
  razonSocial?: string
  // Location
  provinceDistrictCorregimiento?: string
  address?: string
  neighborhood?: string
  // Payment
  paymentPlan?: string
  bank?: string
  beneficiaryName?: string
  accountNumber?: string
  accountType?: string
  emailPaymentContacts?: string
  // External IDs
  osAdminVendorId?: string
}

export interface BulkUpsertResult {
  created: number
  updated: number
  errors: string[]
}

// ============================================
// Bulk Upsert (CSV Import)
// ============================================

export async function bulkUpsertBusinesses(
  rows: BulkBusinessRow[]
): Promise<{ success: boolean; data?: BulkUpsertResult; error?: string }> {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult
  }

  // Check admin access
  if (!(await isAdmin())) {
    return { success: false, error: 'Admin access required' }
  }

  try {
    let created = 0
    let updated = 0
    const errors: string[] = []

    // Get all users for owner lookup
    const allUsers = await prisma.userProfile.findMany({
      select: { id: true, clerkId: true, name: true, email: true },
    })
    const userByName = new Map(allUsers.map(u => [(u.name || '').toLowerCase(), u]))
    const userByEmail = new Map(allUsers.map(u => [(u.email || '').toLowerCase(), u]))

    // Get all categories for lookup
    // Support both full path ("Parent > Sub1 > Sub2") and parent-only ("Parent") matching
    const allCategories = await prisma.category.findMany()
    const categoryByPath = new Map<string, string>()
    const categoryByParent = new Map<string, string>() // First category ID for each parent
    
    allCategories.forEach(cat => {
      // Full path lookup
      let path = cat.parentCategory
      if (cat.subCategory1) path += ` > ${cat.subCategory1}`
      if (cat.subCategory2) path += ` > ${cat.subCategory2}`
      categoryByPath.set(path.toLowerCase(), cat.id)
      
      // Parent-only lookup (first match wins)
      const parentLower = cat.parentCategory.toLowerCase()
      if (!categoryByParent.has(parentLower)) {
        categoryByParent.set(parentLower, cat.id)
      }
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 for 1-indexed and header row

      try {
        // Validate required fields for new records
        if (!row.id && !row.name) {
          errors.push(`Fila ${rowNum}: Nombre es requerido para nuevos registros`)
          continue
        }

        // Find owner by name or email
        let ownerId: string | null = null
        if (row.owner) {
          const ownerLower = row.owner.toLowerCase().trim()
          const ownerUser = userByName.get(ownerLower) || userByEmail.get(ownerLower)
          if (ownerUser) {
            ownerId = ownerUser.clerkId
          } else {
            errors.push(`Fila ${rowNum}: Usuario "${row.owner}" no encontrado para Owner`)
          }
        }

        // Find category by path or parent name
        // Supports both full path ("Parent > Sub1 > Sub2") and parent-only ("Parent")
        let categoryId: string | null = null
        if (row.category) {
          const categoryLower = row.category.toLowerCase().trim()
          // Try full path first, then parent-only
          categoryId = categoryByPath.get(categoryLower) || categoryByParent.get(categoryLower) || null
          if (!categoryId) {
            errors.push(`Fila ${rowNum}: Categoría "${row.category}" no encontrada`)
          }
        }

        // Build data object with all provided fields
        // For updates: track which fields are being set
        const isUpdate = !!row.id
        const data: Record<string, unknown> = {}
        const fieldsToUpdate: string[] = []

        // Helper to check if value is present (not undefined, not null, not empty string)
        const hasValue = (value: unknown): boolean => {
          return value !== undefined && value !== null && value !== ''
        }

        // Helper to add field and track it
        const addField = (dbKey: string, csvValue: unknown, fieldLabel: string, defaultValue: unknown = null) => {
          if (hasValue(csvValue)) {
            data[dbKey] = csvValue
            if (isUpdate) fieldsToUpdate.push(fieldLabel)
          } else if (!isUpdate) {
            // For creates: set default value
            data[dbKey] = defaultValue
          }
        }

        // Core fields - name is always set if provided
        if (hasValue(row.name)) {
          data.name = row.name
          if (isUpdate) fieldsToUpdate.push('Nombre')
        }

        // Contact info
        addField('contactName', row.contactName, 'Contacto', '')
        addField('contactEmail', row.contactEmail, 'Email', '')
        addField('contactPhone', row.contactPhone, 'Teléfono', '')
        
        // Sales
        addField('salesTeam', row.salesTeam, 'Equipo')
        
        // Location
        addField('provinceDistrictCorregimiento', row.provinceDistrictCorregimiento, 'Ubicación')
        addField('address', row.address, 'Dirección')
        addField('neighborhood', row.neighborhood, 'Barriada')
        
        // Legal/Tax
        addField('ruc', row.ruc, 'RUC')
        addField('razonSocial', row.razonSocial, 'Razón Social')
        
        // Online presence
        addField('website', row.website, 'Website')
        addField('instagram', row.instagram, 'Instagram')
        addField('description', row.description, 'Descripción')
        
        // Business info - tier needs special handling (parse to int)
        if (hasValue(row.tier)) {
          const tierNum = parseInt(row.tier as string, 10)
          if (!isNaN(tierNum)) {
            data.tier = tierNum
            if (isUpdate) fieldsToUpdate.push('Tier')
          }
        } else if (!isUpdate) {
          data.tier = null
        }
        addField('accountManager', row.accountManager, 'Account Manager')
        addField('ere', row.ere, 'ERE')
        addField('salesType', row.salesType, 'Tipo de Venta')
        addField('isAsesor', row.isAsesor, 'Es Asesor')
        addField('osAsesor', row.osAsesor, 'OS Asesor')
        
        // Payment
        addField('paymentPlan', row.paymentPlan, 'Plan de Pago')
        addField('bank', row.bank, 'Banco')
        addField('beneficiaryName', row.beneficiaryName, 'Beneficiario')
        addField('accountNumber', row.accountNumber, 'Número de Cuenta')
        addField('accountType', row.accountType, 'Tipo de Cuenta')
        addField('emailPaymentContacts', row.emailPaymentContacts, 'Emails de Pago')
        
        // External IDs
        addField('osAdminVendorId', row.osAdminVendorId, 'Vendor ID')

        // Add category relation if categoryId was found
        if (categoryId) {
          data.category = { connect: { id: categoryId } }
          if (isUpdate) fieldsToUpdate.push('Categoría')
        }

        // Add owner relation if ownerId was found
        if (ownerId) {
          data.owner = { connect: { clerkId: ownerId } }
          if (isUpdate) fieldsToUpdate.push('Owner')
        }

        if (row.id) {
          // Update existing
          const existing = await prisma.business.findUnique({ where: { id: row.id } })
          if (!existing) {
            errors.push(`Fila ${rowNum}: No se encontró negocio con ID ${row.id}`)
            continue
          }

          // Check if there are any fields to update
          if (Object.keys(data).length === 0) {
            errors.push(`Fila ${rowNum}: No hay campos para actualizar en "${row.name || row.id}"`)
            continue
          }

          await prisma.business.update({
            where: { id: row.id },
            data: data as Parameters<typeof prisma.business.update>[0]['data'],
          })
          updated++
          
          // Log which fields were updated (as info, not error)
          if (fieldsToUpdate.length > 0) {
            console.log(`[CSV Import] Fila ${rowNum} "${row.name}": Actualizados: ${fieldsToUpdate.join(', ')}`)
          }
        } else {
          // Create new - check for duplicate name
          const existingByName = await prisma.business.findFirst({
            where: { name: { equals: row.name, mode: 'insensitive' } },
          })
          
          if (existingByName) {
            errors.push(`Fila ${rowNum}: Ya existe un negocio con el nombre "${row.name}"`)
            continue
          }

          await prisma.business.create({ data: data as Parameters<typeof prisma.business.create>[0]['data'] })
          created++
        }
      } catch (err) {
        errors.push(`Fila ${rowNum}: ${err instanceof Error ? err.message : 'Error desconocido'}`)
      }
    }

    // Invalidate cache
    await invalidateEntity('businesses')

    // Log activity
    await logActivity({
      action: 'IMPORT',
      entityType: 'Business',
      entityId: 'bulk',
      details: { 
        newValues: { created, updated, errorCount: errors.length },
      },
    })

    return { success: true, data: { created, updated, errors } }
  } catch (error) {
    return handleServerActionError(error, 'bulkUpsertBusinesses')
  }
}
