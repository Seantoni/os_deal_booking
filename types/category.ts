/**
 * Category type definitions
 */

export type Category = string

export type CategoryHierarchy = {
  [mainCategory: string]: {
    [subCategory: string]: string[]
  }
}

export type CategoryOption = {
  label: string
  value: string
  parent: string
  sub1: string | null
  sub2: string | null
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

