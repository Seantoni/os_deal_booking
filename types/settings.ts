/**
 * Settings and configuration type definitions
 */

import type { CategoryHierarchy } from './category'

export type CategoryDurations = {
  [category: string]: number
}

export type BusinessException = {
  id: string
  businessName: string
  exceptionType: 'duration' | 'repeatDays' | 'dailyLimitExempt'
  exceptionValue: number
  notes?: string
}

export type BookingSettings = {
  minDailyLaunches: number
  maxDailyLaunches: number
  categoryDurations: CategoryDurations
  merchantRepeatDays: number
  businessExceptions: BusinessException[]
  customCategories: CategoryHierarchy
}

