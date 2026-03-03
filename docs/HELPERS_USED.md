# Helpers Used in This Repo

Inventory of helper modules and named exports across `app/`, `components/`, `hooks/`, `lib/`, and `types/`.

---

## Auth — `@/lib/auth`

**`@/lib/auth/roles`**
- `getUserProfile`
- `isAdmin`
- `isSales`
- `isEditor`
- `isEditorOrERE`
- `isEditorSenior`
- `getUserRole`
- `requireAdmin`

**`@/lib/auth/page-access`**
- `PAGE_ACCESS`
- `getDefaultPageForRole`
- `canAccessPage`
- `requirePageAccess`

**`@/lib/auth/entity-access`**
- `canAccessEntity`
- `getAccessibleIds`
- `buildAccessFilter`
- `canEditBusiness`
- `getEditableBusinessIds`
- `EntityType` (type)
- `AccessLevel` (type)

**`@/lib/auth/booking-request-visibility`**
- `getSalesBookingRequestVisibilityWhere`
- `canSalesAccessBookingRequest`

**`@/lib/auth/user-display`**
- `extractDisplayName`
- `extractUserEmail`
- `getUserDisplayInfo`
- `getDisplayNameByClerkId`
- `getBatchUserDisplayInfo`
- `ClerkUserLike` (interface)

**`@/lib/auth/email-validation`**
- `normalizeEmail`
- `validateAndNormalizeEmail`

**`@/lib/auth/middleware-check`**
- `checkEmailAccessMiddleware`

---

## Server Actions — `@/lib/utils/server-actions`

- `buildRoleBasedWhereClause`
- `getUserRole`
- `handleServerActionError`
- `requireAdmin`
- `requireAdminOrThrow`
- `requireAuth`
- `requireAuthOrThrow`
- `ServerActionResponse` (type)

---

## Cache — `@/lib/cache`

- `invalidateDashboard`
- `invalidateEntities`
- `invalidateEntity`
- `invalidateEntityById`
- `invalidateUserCache`

---

## Date — `@/lib/date`

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

**`@/lib/dateUtils`** (legacy, separate from `@/lib/date`)
- `formatEventDate`
- `formatDateForInput`
- `formatDateTimeForDisplay`
- `formatShortDate`
- `isSameDayInPanama`

---

## Categories — `@/lib/categories`

- `CATEGORY_HIERARCHY`
- `MAIN_CATEGORIES`
- `SEVEN_DAY_CATEGORIES`
- `CATEGORIES`
- `getCategoryHierarchy`
- `getFullCategoryHierarchy`
- `getMainCategories`
- `getAllCategories`
- `getCategoryOptions`
- `getMaxDuration`
- `getDaysDifference`
- `getCategoryColors`
- `CategoryHierarchy` (type)
- `CategoryOption` (type)
- `CategoryColors` (type)
- `CategoryRecord` (type)

**`@/lib/initial-categories`**
- `INITIAL_CATEGORY_HIERARCHY`
- `getInitialFlatCategories`
- `CategoryHierarchy` (type)

**`@/lib/category-utils`**
- `buildCategoryKey`
- `getEventCategoryKey`

---

## Constants — `@/lib/constants`

**`@/lib/constants/deal-statuses`**
- `DEAL_STATUSES`, `DealStatus`, `DEAL_STATUS_VALUES`, `DEAL_STATUS_LABELS`, `DEAL_STATUS_OPTIONS`

**`@/lib/constants/opportunity-stages`**
- `OPPORTUNITY_STAGES`, `OpportunityStage`, `OPPORTUNITY_STAGE_VALUES`, `OPPORTUNITY_STAGE_LABELS`, `OPPORTUNITY_STAGE_OPTIONS`

**`@/lib/constants/lead-stages`**
- `LEAD_STAGES`, `LeadStage`, `LEAD_STAGE_VALUES`, `LEAD_STAGE_LABELS`, `LEAD_STAGE_LABELS_MAP`, `LEAD_STAGE_OPTIONS`, `LEAD_STAGE_COLORS`

**`@/lib/constants/booking-request-statuses`**
- `BOOKING_REQUEST_STATUSES`, `BookingRequestStatus`, `BOOKING_REQUEST_STATUS_VALUES`, `BOOKING_REQUEST_STATUS_LABELS`, `BOOKING_REQUEST_STATUS_OPTIONS`, `REQUEST_STATUS_LABELS`, `REQUEST_STATUS_COLORS`

**`@/lib/constants/user-roles`**
- `USER_ROLES`, `UserRole`, `USER_ROLE_VALUES`, `USER_ROLE_LABELS`, `USER_ROLE_OPTIONS`

**`@/lib/constants/time`**
- `ONE_SECOND_MS`, `ONE_MINUTE_MS`, `ONE_HOUR_MS`, `ONE_DAY_MS`, `ONE_WEEK_MS`, `ONE_YEAR_MS`, `TOKEN_EXPIRY_MS`

**`@/lib/constants/limits`**
- `MAX_DATE_SEARCH_DAYS`, `DEFAULT_PAGE_SIZE`

**`@/lib/constants/cache`**
- `CACHE_REVALIDATE_SECONDS`, `CACHE_REVALIDATE_CATEGORIES_SECONDS`, `CACHE_REVALIDATE_DASHBOARD_SECONDS`, `CACHE_CLIENT_FORM_CONFIG_MS`, `CACHE_CLIENT_USER_ROLE_MS`, `CACHE_CLIENT_USER_ROLE_REVALIDATE_MS`, `CACHE_ACCESS_CHECK_SECONDS`, `CACHE_SERVER_BUSINESS_PROJECTION_SUMMARY_MS`

**`@/lib/constants/marketing`** (standalone, not in barrel)
- `MARKETING_PLATFORMS`, `MarketingPlatform` (type)
- `MARKETING_OPTION_TYPES`, `MarketingOptionType` (type)
- `MARKETING_OPTIONS_CONFIG`

---

## Filters — `@/lib/filters`

**`@/lib/filters/filterConfig`**
- `FILTER_OPERATORS`
- `getOperatorsForFieldType`
- `DATE_PRESETS`
- `resolveDatePreset`
- `DEAL_STATUS_OPTIONS`, `OPPORTUNITY_STAGE_OPTIONS`, `BUSINESS_TIER_OPTIONS`, `ACCOUNT_TYPE_OPTIONS`, `PAYMENT_PLAN_OPTIONS`, `FOCUS_PERIOD_OPTIONS`, `SALES_TYPE_OPTIONS`, `IS_ASESOR_OPTIONS`, `LEAD_STAGE_OPTIONS`, `SALES_TEAM_OPTIONS`, `BUSINESS_LIFECYCLE_OPTIONS`
- `DEAL_FIELDS`, `OPPORTUNITY_FIELDS`, `BUSINESS_FIELDS`, `LEAD_FIELDS`
- `getFieldsForEntity`
- `getFieldDefinition`
- `mapCustomFieldTypeToFilterType`
- `mapCustomFieldEntityType`
- `FieldType` (type)
- `FilterFieldDefinition` (type)

**`@/lib/filters/applyFilters`**
- `matchesFilters`
- `applyFilters`

**`@/lib/filters/buildPrismaWhere`**
- `buildPrismaWhere`
- `parseAdvancedFilters`

---

## Event Validation — `@/lib/event-validation`

- `calculateNextAvailableDate`
- `check30DayMerchantRule`
- `checkUniquenesViolation`
- `getDailyLimitStatus`
- `getEventsOnDate`

---

## Settings — `@/lib/settings`

- `DEFAULT_SETTINGS`
- `getBusinessException`
- `getSettings`
- `resetSettings`
- `saveSettings`
- `BookingSettings` (type)

---

## Tokens — `@/lib/tokens`

- `generateApprovalToken`
- `generatePublicLinkToken`
- `verifyApprovalToken`

---

## Business — `@/lib/business`

- `findLinkedBusiness`
- `findLinkedBusinessFull`

---

## Activity Log — `@/lib/activity-log`

- `logActivities`
- `logActivity`

---

## Infrastructure

**`@/lib/prisma`**
- `prisma`

**`@/lib/openai`**
- `getOpenAIClient`

**`@/lib/s3`**
- `s3Client`
- `S3_BUCKET`
- `isS3Configured`
- `uploadFileToS3`
- `generateFileKey`
- `validateImageFile`
- `UploadFileOptions` (interface)
- `UploadResult` (interface)

**`@/lib/logger`**
- `logger`
- `getLogLevel`
- `isDebugEnabled`
- `logServerActionError`

**`@/lib/sentry`**
- `captureError`
- `captureMessage`
- `traceAction`
- `traceApiCall`
- `traceServerAction`
- `traceDbQuery`
- `sentryLogger`
- `setUser`
- `clearUser`
- `setContext`
- `setTag`
- `Sentry`

**`@/lib/rate-limit`**
- `isRateLimitConfigured`
- `generalLimiter`, `aiLimiter`, `externalApiLimiter`, `publicLimiter`, `uploadLimiter`
- `checkRateLimit`
- `rateLimitResponse`
- `getClientIp`
- `applyRateLimit`
- `applyPublicRateLimit`
- `RateLimitResult` (interface)

**`@/lib/clerk-allowlist`**
- `addToClerkAllowlist`
- `removeFromClerkAllowlist`
- `syncAllToClerkAllowlist`

**`@/lib/cron/verify-secret`**
- `verifyCronSecret`

---

## Config

**`@/lib/config/env`**
- `ENV`
- `getAppBaseUrl`

**`@/lib/config/request-form-fields`**
- `REQUEST_FORM_STEPS`
- `getTemplates`
- `getDefaultRequestFormFieldsConfig`
- `isFieldRequired`
- `RequestFormFieldDefinition` (type)
- `RequestFormStep` (type)

---

## Utilities — `@/lib/utils/*`

**`@/lib/utils/validation`**
- `isValidEmail`
- `isValidIsoCalendarDate`
- `validateDateRange`
- `validateRequiredFields`

**`@/lib/utils/form-data`**
- `extractBookingRequestFromFormData`

**`@/lib/utils/category-display`**
- `buildCategoryDisplayString`

**`@/lib/utils/request-naming`**
- `countBusinessRequests`
- `generateRequestName`

**`@/lib/utils/request-name-parsing`**
- `buildEventNameFromBookingRequest`
- `extractBusinessName`

**`@/lib/utils/csv-export`**
- `downloadCsv`
- `formatDateForCsv`
- `generateCsv`
- `generateFilename`
- `parseCsv`
- `ParsedCsvRow` (type)

**`@/lib/utils/focus-period`**
- `FOCUS_PERIOD_LABELS`
- `getActiveFocus`
- `getFocusInfo`
- `FocusPeriod` (type)

**`@/lib/utils/dateRangeFilter`**
- `hasActiveDateRangeFilter`
- `isDateInRange`
- `DateRangeFilterValue` (type)

**`@/lib/utils/translations`**
- `translatePipelineStage`
- `translateStatus`

**`@/lib/utils/debounce`**
- `debounce`

**`@/lib/utils/image-compression`**
- `compressImage`
- `compressImages`
- `CompressionOptions` (interface)

---

## Hooks — `@/hooks/*`

**`useAsyncAction`**
- `useAsyncAction`
- `useMultipleAsyncActions`

**`useConfirmDialog`**
- `useConfirmDialog`

**`useDebouncedSearch`**
- `useDebouncedSearch`
- `useDebouncedValue`
- `useDebouncedCallback`

**`useEntityPage`**
- `useEntityPage`
- `sortEntities`
- `SortDirection` (type)
- `EntityPageConfig` (interface)
- `EntityPageReturn` (interface)

**`usePaginatedSearch`**
- `usePaginatedSearch`
- `FilterParams` (type)

**`useAdvancedFilters`**
- `useAdvancedFilters`

**`useResizableColumns`**
- `useResizableColumns`

**`useModalEscape`**
- `useModalEscape`

**`useUserRole`**
- `useUserRole`

**`useBusinessMatching`**
- `useBusinessMatching`
- `BusinessMatchingSource` (type)
- `UseBusinessMatchingOptions` (interface)
- `BusinessMatchingResult` (interface)

**`useTaskCompletionFollowUp`**
- `useTaskCompletionFollowUp`

**`useDynamicForm`**
- `useDynamicForm`

**`useFormConfiguration`**
- `useFormConfiguration`

**`useFormConfigCache`**
- `FormConfigCacheProvider`
- `useFormConfigCache`
- `useCachedFormConfig`

**`useSharedData`**
- `SharedDataProvider`
- `useSharedData`
- `clearSharedDataCache`

**`useCommandPalette`**
- `CommandPaletteProvider`
- `useCommandPalette`

---

## Types with Helper Functions

**`@/types/field-comment`**
- `isFieldCommentArray`
- `parseFieldComments`
- `getCommentsForField`
- `getCommentCountsByField`
- `FieldCommentEdit` (interface)
- `FieldComment` (interface)

**`@/types/form-config`**
- `getBuiltinFieldsForEntity`
- `getBuiltinFieldDefinition`
- `DEFAULT_SECTIONS`
- `BUSINESS_BUILTIN_FIELDS`, `OPPORTUNITY_BUILTIN_FIELDS`, `DEAL_BUILTIN_FIELDS`, `LEAD_BUILTIN_FIELDS`
- `FormEntityType` (type)
- `FieldWidth` (type)
- `FieldSource` (type)
- `BuiltinFieldDefinition`, `FormSection`, `FormFieldConfig` (interfaces)

**`@/types/campaign`**
- `getCampaignStatus`
- `isCampaignSelectable`
- `SalesCampaign`, `BusinessCampaign`, `CampaignStatus` (types)

**`@/types/booking-fields`**
- `formatDateForInput`
- `mapBookingRequestToEventData`
- `buildCategoryDisplayString`
- `hasCategoryData`
- `extractCategoryFields`
- `REQUIRED_BOOKING_FIELDS`, `CATEGORY_FIELDS`, `EVENT_MODAL_FIELDS`

---

## Component-Level Utilities

**`@/components/crm/opportunity/opportunityAutomationLogic`**
- `normalizeAutomationStage`
- `shouldRunMeetingAutomation`
- `shouldRequireMeetingOutcomeBeforeCompletion`
- `shouldAutoCompleteTask`
- `NormalizedAutomationStage` (type)

**`@/components/crm/opportunity/opportunityFormPayload`**
- `buildOpportunityFormData`
- `OpportunityFormValues` (type)

**`@/components/crm/opportunity/TaskModal`**
- `parseMeetingData`
- `MeetingData` (interface)

**`@/components/shared/BusinessLifecycleBadge`**
- `getBusinessLifecycleDisplay`
- `BusinessLifecycle` (type)

**`@/components/RequestForm/request_form_utils`**
- `getFieldLabel`
- `getErrorFieldLabels`
- `validateStep`
- `buildFormDataForSubmit`

**`@/components/RequestForm/constants`**
- `STEPS`
- `INITIAL_FORM_DATA`
- `getStepByKey`
- `getStepKeyById`
- `getStepIdByKey`
- `getStepIndexByKey`
- `getStepKeyByIndex`
- `StepConfig` (type)

**`@/components/RequestForm/config/template-mapping`**
- `CATEGORY_TEMPLATE_MAP`
- `getTemplateName`
- `hasTemplate`

**`@/components/RequestForm/config/field-types`**
- `COMMON_OPTIONS`
- `FieldType` (type)
- `SelectOption`, `FieldConfig`, `CategoryFieldsConfig` (interfaces)

**`@/components/RequestForm/config/category-fields`**
- `CATEGORY_FIELDS`
- `getCategoryFields`
- `hasCategoryFields`
- `getAllCategoryKeys`

**`@/components/RequestForm/config/field-templates`**
- `FIELD_TEMPLATES`
- `FieldTemplate` (interface)
- 34 category-specific templates (`EVENTOS_TEMPLATE`, `HOTEL_TEMPLATE`, `RESTAURANTE_TEMPLATE`, etc.)

---

## TODO — Helpers to Build

**1. `getErrorMessage(error: unknown, fallback?: string): string`** — 87+ files
> Every `catch` block repeats `error instanceof Error ? error.message : 'fallback'`. One shared extractor replaces them all. `handleServerActionError` only covers server action return shapes.

**2. `formatCurrency(amount)` / `formatNumber(n)`** — 35+ files
> Inconsistent `toLocaleString`, `Intl.NumberFormat`, `$` + `.toFixed()` across the app. Two helpers ensure consistent USD formatting everywhere.

**3. `safeParseJson<T>(str: string, fallback: T): T`** — 30 files
> `JSON.parse` in try/catch repeated in actions, API routes, components, scraping. A generic safe parser eliminates the boilerplate.

**4. Prisma select constants** — 20+ files, 60+ repetitions
> Same select shapes repeated everywhere:
> - `USER_PROFILE_SELECT` — `{ clerkId, name, email }` (~20 uses)
> - `BUSINESS_BASIC_SELECT` — `{ id, name }` (~10 uses)
> - `CATEGORY_SELECT` — `{ id, categoryKey, parentCategory, subCategory1, subCategory2 }` (~6 uses)

**5. `truncate(str: string, maxLen: number, suffix?: string): string`** — 25+ files
> String truncation with `...` reimplemented in 10+ places plus local `truncateContent` helpers in DashboardClient, InboxDropdown, and email templates.

**Honorable mentions:**
- `copyToClipboard(text)` — 3 files, same `navigator.clipboard.writeText` + toast pattern
- `paginationParams(page, pageSize)` — 20+ files manually compute `skip`/`take`, sometimes inconsistently
