/**
 * Category type definitions
 */

export type Category = string

// Recursive type for category hierarchy
// Can be an array of strings (leaf nodes) or nested objects
export type CategoryNode = string[] | { [key: string]: CategoryNode }

export type CategoryHierarchy = {
  [mainCategory: string]: CategoryNode
}

export type CategoryOption = {
  label: string
  value: string
  parent: string
  sub1: string | null
  sub2: string | null
  sub3: string | null
  sub4: string | null
}

export type CategoryColors = {
  bg: string
  text: string
  border: string
  indicator: string
}

export type CategoryDurations = {
  [category: string]: number
}

