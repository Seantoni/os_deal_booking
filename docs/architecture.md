# Architecture & Critical Areas

## ⚠️ Critical / Danger Zone

**⚠️ WARNING: These are critical areas that can break functionality if modified incorrectly. Read carefully before making changes!**

### 🔐 Security-Critical Components

#### Token Generation & Verification (`lib/tokens.ts`)
- **CRITICAL**: `TOKEN_SECRET_KEY` must be identical across environments (dev/prod)
- Token expiration: 1 year / 365 days (defined in `generateApprovalToken`)
- Token format: `base64(payload):signature` - splitting logic is sensitive
- **If changed**: All existing email links will break immediately
- **Location**: `lib/tokens.ts` - `generateApprovalToken()`, `verifyApprovalToken()`

#### Email Approval Endpoints (`app/api/booking-requests/`)
- **CRITICAL**: These routes are PUBLIC (bypass authentication)
- Routes: `/api/booking-requests/approve`, `/api/booking-requests/reject`
- Security relies entirely on token verification
- **If broken**: Users cannot approve/reject bookings via email
- **Location**: `app/api/booking-requests/approve/route.ts`, `app/api/booking-requests/reject/route.ts`

#### Middleware (`middleware.ts`)
- Public routes must be explicitly listed
- Approval/rejection routes excluded from Clerk protection
- **If broken**: Email links redirect to sign-in page
- **Key routes to exclude**:
  ```typescript
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/booking-requests/approved(.*)',
  '/booking-requests/rejected(.*)',
  '/booking-requests/error(.*)'
  ```

### 🌍 Timezone Handling - Critical for Date Bugs

#### Panama Timezone Utilities (`lib/timezone.ts`)
- **CRITICAL**: ALL date operations MUST use Panama timezone
- End date parsing: Uses `parseEndDateInPanamaTime()` (23:59:59.999 of day)
- Start date parsing: Uses `parseDateInPanamaTime()` (midnight of day)
- **Common bugs**:
  - Using `new Date()` directly causes UTC conversion issues
  - End dates adding extra day (if not using `parseEndDateInPanamaTime`)
  - Calendar span calculation using UTC methods instead of Panama
- **Key functions**:
  - `parseDateInPanamaTime(dateString)` - Parse YYYY-MM-DD to midnight Panama
  - `parseEndDateInPanamaTime(dateString)` - Parse to end of day Panama
  - `formatDateForPanama(date)` - Format to YYYY-MM-DD in Panama timezone
  - `getDateComponentsInPanama(date)` - Extract year/month/day in Panama

#### Date Display in Components
- Calendar span calculation: Must use `getDateComponentsInPanama()` 
- Event modal dates: Use `formatDate()` that respects Panama timezone
- **Location**: `components/CalendarView.tsx` (span calculation), `components/EventModal.tsx` (date display)

### 📧 Email System - Breaking Changes

#### Email Template Props
- **CRITICAL**: Template functions have specific prop interfaces
- Changing props breaks all email sending
- **Templates**:
  - `lib/email/templates/booking-request.ts` - Needs `approveUrl`, `rejectUrl`
  - `lib/email/templates/booking-confirmation.ts` - Needs formatted dates
  - `lib/email/templates/rejection.ts` - Needs `rejectionReason`

#### Email Configuration (`lib/email/config.ts`)
- Auto-detects dev vs prod based on `NEXT_PUBLIC_APP_URL`
- Falls back to `onboarding@resend.dev` if domain not verified
- **If changed**: All emails will fail in production

#### Resend Domain Verification
- **PRODUCTION CRITICAL**: Domain must be verified in Resend
- Without verification: All email sends fail with domain error
- Check: https://resend.com/domains

### 🔄 Status Transitions - State Machine Logic

#### Event Status Flow
```
pending → approved → booked
              ↓
          rejected
```

- **CRITICAL**: Only `approved` events can be booked
- Only `approved` events can be rejected
- Direct event creation: Status is `booked` (skips approval)
- **Location**: `app/actions/events.ts` - `bookEvent()`, `rejectEvent()`

#### Booking Request Status Flow
```
draft → pending → approved → booked
                 ↓
              rejected
```

- **CRITICAL**: When request approved, linked event becomes `approved`
- When event booked, request status becomes `booked`
- **Location**: `app/actions/booking-requests.ts` - `sendBookingRequest()`
- **Location**: `app/api/booking-requests/approve/route.ts`

### 🔗 Database Relationships - Critical Foreign Keys

#### Event ↔ BookingRequest Link
- `BookingRequest.eventId` - Links to Event when request sent
- `Event.bookingRequestId` - Reverse link (may not exist if created directly)
- **CRITICAL**: When updating request dates, must update linked event
- **Location**: `app/actions/booking-requests.ts` - `updateBookingRequest()`

#### User Ownership
- Events: `userId` - Owner tracking
- BookingRequests: `userId` - Requester tracking
- Role-based filtering uses `userId` for Sales users
- **Location**: `app/actions/events.ts` - `getEvents()`, `app/actions/booking-requests.ts` - `getBookingRequests()`

### 🎯 Role-Based Access Control

#### Admin Permissions
- View ALL events and requests (no filtering)
- Book/reject ANY event
- Create events directly (status: `booked`)
- **Location**: `app/actions/events.ts` - All functions check role

#### Sales Permissions
- View only OWN events and requests
- Cannot book events
- Cannot create events directly
- **Location**: `lib/roles.ts` - `getUserRole()`, used throughout actions

### 📅 Calendar Filtering Logic

#### Status Filtering
- **Categories sidebar active** (`!showPendingBooking`): Shows ONLY `booked` events
- **Pending requests sidebar active** (`showPendingBooking`): Shows ALL events
- **Category filter active**: Shows all events in category (booked + not booked)
- **Location**: `components/CalendarView.tsx` - `filteredEvents` useMemo

#### Event Counting
- Daily count: Only counts `booked` events
- Count based on START DATE (launch date), not spanning days
- **Location**: `lib/validation.ts` - `getEventsOnDate()`

### 🔢 Daily Launch Limits

#### Validation Logic (`lib/validation.ts`)
- Checks limit on START DATE only (not end date)
- Only counts `booked` events
- Uses Panama timezone for date comparison
- **Location**: `components/EventModal.tsx` - Daily limit check

#### Category Duration Rules
- **7-day categories**: HOTELES, RESTAURANTES, SHOWS Y EVENTOS
- **1-day categories**: All others
- **Location**: `lib/categories.ts` - `SEVEN_DAY_CATEGORIES`
- Used in: Drag-to-calendar logic, end date calculation

### 🎨 Category System

#### Category Hierarchy
- Structure: `Main > Sub1 > Sub2 > Leaf`
- Colors assigned per main category
- **CRITICAL**: Category matching for filtering uses hierarchical structure
- Event updates must preserve all category fields (`parentCategory`, `subCategory1`, `subCategory2`, `subCategory3`)
- **Location**: `lib/categories.ts` - `getCategoryHierarchy()`, `getCategoryColors()`
- **Common bug**: Dragging events loses category data if not all fields passed

### 🔄 Drag & Drop Logic

#### Event Resizing
- **Left handle**: Resizes start date (can shorten event)
- **Right handle**: Resizes end date (can extend event)
- **CRITICAL**: Must preserve all category fields on resize
- **Location**: `components/CalendarView.tsx` - `handleResizeStart()`, `handleResizeEnd()`

#### Request Drag to Calendar
- Updates request start/end dates
- Calculates duration based on category (7 days vs 1 day)
- Updates linked event if exists
- **Location**: `components/EventsPageClient.tsx` - `handleRequestDropOnDate()`

### 📝 Critical Environment Variables

#### Required for Production
These are centrally validated in `lib/config/env.ts`:
```env
DATABASE_URL              # Database connection (MUST be production URL)
TOKEN_SECRET_KEY          # MUST match local dev (or all links break)
NEXT_PUBLIC_APP_URL       # MUST be production URL (no trailing slash!)
RESEND_API_KEY            # Email service
CLERK_SECRET_KEY          # MUST be production keys (pk_live_, sk_live_)
OPENAI_API_KEY            # Optional, required for AI features
EMAIL_FROM                # Optional, overrides default from address
EMAIL_REPLY_TO            # Optional, overrides default reply-to
```

#### If Missing or Wrong
- `TOKEN_SECRET_KEY` wrong → All email approval links fail
- `NEXT_PUBLIC_APP_URL` wrong → Email links redirect to wrong domain
- `RESEND_API_KEY` missing → All emails fail
- Clerk keys wrong → Authentication fails

### 🐛 Common Bugs & Fixes

#### Dates Adding Extra Day
- **Cause**: Using UTC methods instead of Panama timezone
- **Fix**: Use `parseEndDateInPanamaTime()` for end dates
- **Location**: Check all date parsing in actions

#### Category Colors Not Matching
- **Cause**: Missing category fields when updating events
- **Fix**: Always pass `parentCategory`, `subCategory1`, `subCategory2`, `subCategory3`
- **Location**: `components/EventsPageClient.tsx` - `handleEventMove()`, `handleEventResize()`

#### Email Links Not Working
- **Cause**: `TOKEN_SECRET_KEY` mismatch or URL encoding issue
- **Fix**: Verify token secret, check URL in email template
- **Location**: `lib/email/templates/booking-request.ts` - Approval URLs

#### Events Not Showing in Calendar
- **Cause**: Status filtering (only booked in categories view) or category mismatch
- **Fix**: Check `filteredEvents` logic and category selection
- **Location**: `components/CalendarView.tsx` - `filteredEvents` useMemo

#### Calendar Spanning Wrong Days
- **Cause**: Using UTC date methods for span calculation
- **Fix**: Use `getDateComponentsInPanama()` for extracting date components
- **Location**: `components/CalendarView.tsx` - Span calculation

## 📁 Project Structure Details

See main README for full project structure. Key areas:

- **Server Actions**: All database operations in `app/actions/`
- **API Routes**: Public endpoints in `app/api/`
- **Components**: Organized by feature in `components/`
- **Utilities**: Shared logic in `lib/`
- **Types**: TypeScript definitions in `types/`

