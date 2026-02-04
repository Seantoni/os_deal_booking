/**
 * Shared primitives and entity reference types
 */

export type Nullable<T> = T | null
export type DateLike = Date | string
export type DecimalLike = number | string

export type CategoryRef = {
  id: string
  categoryKey: string
  parentCategory: string
  subCategory1: Nullable<string>
  subCategory2: Nullable<string>
}

export type UserBaseRef = {
  clerkId: string
  name: Nullable<string>
  email: Nullable<string>
}

export type UserRef = UserBaseRef & {
  id: string
}

export type BusinessRef = {
  id: string
  name: string
}
