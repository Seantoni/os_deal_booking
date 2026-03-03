# Helpers Used in This Repo

This inventory lists helper modules and named helper imports currently used across the codebase (`app/`, `components/`, `hooks/`, and `lib/`).

## `@/lib/utils/server-actions`
- `buildRoleBasedWhereClause`
- `getUserRole`
- `handleServerActionError`
- `requireAdmin`
- `requireAdminOrThrow`
- `requireAuth`
- `requireAuthOrThrow`
- `ServerActionResponse` (type)

## `@/lib/cache`
- `invalidateDashboard`
- `invalidateEntities`
- `invalidateEntity`
- `invalidateEntityById`
- `invalidateUserCache`

## `@/lib/date`
- `PANAMA_TIMEZONE`
- `calculateDaysDifference`
- `daysSince`
- `daysUntil`
- `formatCompactDateTime`
- `formatDateForDisplay`
- `formatDateForPanama`
- `formatDateTime`
- `formatDateUTC`
- `formatFullDateWithWeekday`
- `formatISODateOnly`
- `formatRelativeTime`
- `formatRequestNameDate`
- `formatShortDate`
- `formatShortDateNoYear`
- `formatShortDateWithWeekday`
- `formatSpanishFullDate`
- `getTodayInPanama`
- `parseDateInPanamaTime`
- `parseEndDateInPanamaTime`

## `@/lib/tokens`
- `generateApprovalToken`
- `generatePublicLinkToken`
- `verifyApprovalToken`

## `@/lib/business`
- `findLinkedBusiness`
- `findLinkedBusinessFull`

## `@/lib/activity-log`
- `logActivities`
- `logActivity`

## `@/lib/category-utils`
- `buildCategoryKey`
- `getEventCategoryKey`

## `@/lib/event-validation`
- `calculateNextAvailableDate`
- `check30DayMerchantRule`
- `checkUniquenesViolation`
- `getDailyLimitStatus`
- `getEventsOnDate`

## `@/lib/settings`
- `DEFAULT_SETTINGS`
- `getBusinessException`
- `getSettings`
- `resetSettings`
- `saveSettings`
- `BookingSettings` (type)

## `@/lib/utils/form-data`
- `extractBookingRequestFromFormData`

## `@/lib/utils/validation`
- `isValidEmail`
- `isValidIsoCalendarDate`
- `validateDateRange`
- `validateRequiredFields`

## `@/lib/utils/category-display`
- `buildCategoryDisplayString`

## `@/lib/utils/request-naming`
- `countBusinessRequests`
- `generateRequestName`

## `@/lib/utils/request-name-parsing`
- `buildEventNameFromBookingRequest`
- `extractBusinessName`

## `@/lib/utils/csv-export`
- `downloadCsv`
- `formatDateForCsv`
- `generateCsv`
- `generateFilename`
- `parseCsv`
- `ParsedCsvRow` (type)

## `@/lib/utils/focus-period`
- `FOCUS_PERIOD_LABELS`
- `getActiveFocus`
- `getFocusInfo`
- `FocusPeriod` (type)

## `@/lib/utils/dateRangeFilter`
- `hasActiveDateRangeFilter`
- `isDateInRange`
- `DateRangeFilterValue` (type)

## `@/lib/utils/translations`
- `translatePipelineStage`
- `translateStatus`
