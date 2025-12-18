# Unused Functions in Codebase

## Summary
This document lists functions that are defined but never used in the codebase.

---

## 1. `formatISODate` function
**File:** `lib/date/formatting.ts`  
**Status:** Exported but never imported or used  
**Action:** Can be removed if ISO date format is not needed elsewhere

```typescript
export function formatISODate(date: Date | string | null): string
```

---

## 2. `formatCategoryForDisplay` function
**File:** `lib/utils/category-display.ts` (line 10)  
**Status:** Exported but never imported or used  
**Action:** Can be removed - `buildCategoryDisplayString` is used instead for category formatting

```typescript
export function formatCategoryForDisplay(categoryKey: string | null | undefined): string
```

---

## Notes
- All listed functions are exported from their respective modules
- They may be kept for future use, but currently have no active usage
- Consider removing them to reduce code complexity and maintenance burden
- Before removing, verify they're not used in tests or documentation

