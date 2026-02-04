/**
 * Lead type definitions
 */

import type { LeadStage } from '@/lib/constants'
import type { BusinessRef, CategoryRef, Nullable, UserBaseRef } from './shared'

export type Lead = {
  id: string
  name: string
  contactName: string
  contactPhone: string
  contactEmail: string
  categoryId: Nullable<string>
  responsibleId: Nullable<string>
  stage: LeadStage
  website: Nullable<string>
  instagram: Nullable<string>
  description: Nullable<string>
  source: Nullable<string>
  notes: Nullable<string>
  businessId: Nullable<string>
  convertedAt: Nullable<Date>
  createdAt: Date
  updatedAt: Date
  // Relations
  category?: Nullable<CategoryRef>
  responsible?: Nullable<UserBaseRef>
  business?: Nullable<BusinessRef>
}
