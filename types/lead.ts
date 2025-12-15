/**
 * Lead type definitions
 */

import type { LeadStage } from '@/lib/constants'

export type Lead = {
  id: string
  name: string
  contactName: string
  contactPhone: string
  contactEmail: string
  categoryId: string | null
  responsibleId: string | null
  stage: LeadStage
  website: string | null
  instagram: string | null
  description: string | null
  source: string | null
  notes: string | null
  businessId: string | null
  convertedAt: Date | null
  createdAt: Date
  updatedAt: Date
  // Relations
  category?: {
    id: string
    categoryKey: string
    parentCategory: string
    subCategory1: string | null
    subCategory2: string | null
  } | null
  responsible?: {
    clerkId: string
    name: string | null
    email: string | null
  } | null
  business?: {
    id: string
    name: string
  } | null
}

