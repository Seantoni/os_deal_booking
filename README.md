# OS Deals Booking System

A comprehensive booking and calendar management system for OfertaSimple, built with Next.js 16, featuring email approvals, drag-and-drop calendar functionality, and role-based access control.

## 🚀 Features

### Core Functionality
- **📅 Interactive Calendar**: Day, Week, and Month views with Launch/Live modes
- **📧 Email Approval System**: Secure token-based approval/rejection via email links
- **🎯 Category Management**: Hierarchical category system with color coding
- **👥 Role-Based Access**: Admin and Sales user roles with different permissions
- **📄 PDF Upload & Parsing**: AI-powered PDF parsing for quick event creation
- **🔍 Event Search**: Full-text search with table view results
- **📊 Pending Requests Management**: Drag-and-drop booking requests to calendar
- **⏰ Timezone Handling**: Consistent Panama timezone (EST) across all dates
- **📈 Daily Launch Limits**: Configurable limits per category and business
- **🎨 Modern UI**: Tailwind CSS with Material Design icons

### Email System
- **Booking Request Emails**: Sent to businesses for approval/rejection
- **Booking Confirmation Emails**: Sent when events are confirmed
- **Rejection Emails**: Sent with reason when requests are rejected
- **Secure Token Links**: 1-year (365 days) expiration for approval actions

### Calendar Views
- **Launch View**: Shows events based on launch date (start date only)
- **Live View**: Shows events spanning their full duration
- **Visual Indicators**: 
  - Booked events: Solid colors, no border
  - Approved/Pending events: Transparent with bright yellow border

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: Clerk
- **Email Service**: Resend
- **AI/ML**: OpenAI (for PDF parsing)
- **Styling**: Tailwind CSS
- **Icons**: Material Design Icons (@mui/icons-material)

## 📁 Project Structure

```
os_deals_booking/
├── app/
│   ├── actions/              # Server actions
│   │   ├── booking-requests.ts
│   │   ├── events.ts
│   │   ├── pdf-parse.ts
│   │   └── openai.ts
│   ├── api/                  # API routes
│   │   ├── booking-requests/ # Approval/rejection endpoints
│   │   ├── health/           # Health checks
│   │   └── user/             # User role endpoint
│   ├── booking-requests/     # Booking request pages
│   ├── events/               # Calendar/events page
│   ├── reservations/         # Reservations view
│   └── settings/             # Settings & system status
│
├── components/
│   ├── calendar/             # Calendar-related components
│   │   ├── CalendarView.tsx
│   │   ├── DayEventsModal.tsx
│   │   └── EventSearchResults.tsx
│   ├── booking-requests/     # Booking request components
│   │   ├── BookingRequestForm.tsx
│   │   ├── BookingRequestsClient.tsx
│   │   └── PendingRequestsSidebar.tsx
│   ├── events/               # Event management
│   │   ├── EventModal.tsx
│   │   ├── EventForm.tsx
│   │   ├── EventsPageClient.tsx
│   │   └── EventsHeaderActions.tsx
│   └── layout/               # Layout components
│       ├── HamburgerMenu.tsx
│       └── CategoriesSidebar.tsx
│
├── lib/
│   ├── email/                # Email system (modular)
│   │   ├── config.ts         # Resend configuration
│   │   ├── index.ts          # Central exports
│   │   ├── services/         # Email sending logic
│   │   │   ├── booking-confirmation.ts
│   │   │   └── rejection.ts
│   │   └── templates/        # HTML email templates
│   │       ├── booking-request.ts
│   │       ├── booking-confirmation.ts
│   │       └── rejection.ts
│   ├── categories.ts         # Category hierarchy & colors
│   ├── timezone.ts           # Panama timezone utilities
│   ├── validation.ts         # Event validation & limits
│   ├── tokens.ts             # Secure token generation
│   ├── roles.ts              # User role management
│   └── settings.ts           # Application settings
│
├── hooks/
│   └── useUserRole.ts        # Client-side role hook
│
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Database migrations
│
└── types/                     # Shared TypeScript types (TODO)
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Clerk account for authentication
- Resend account for emails
- OpenAI API key (optional, for PDF parsing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd os_deals_booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:port/database"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."

   # Token Security (generate a secure random string)
   TOKEN_SECRET_KEY="your-secure-random-hex-string"

   # Resend Email
   RESEND_API_KEY="re_..."

   # App URL (no trailing slash!)
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Email Configuration (optional)
   EMAIL_FROM="onboarding@resend.dev"  # For development
   EMAIL_REPLY_TO="your-email@example.com"

   # OpenAI (optional, for PDF parsing)
   OPENAI_API_KEY="sk-..."
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 User Roles

### Admin
- ✅ Create, edit, and delete any event
- ✅ View all events and booking requests
- ✅ Book and reject approved events
- ✅ Access system settings
- ✅ Upload and parse PDFs

### Sales
- ✅ Create booking requests
- ✅ View only their own events and requests
- ✅ Edit/delete only their own events
- ❌ Cannot book events directly
- ❌ Cannot access settings

## 📧 Email System

The email system is organized into modular components:

### Templates (`lib/email/templates/`)
- `booking-request.ts`: Approval request email with approve/reject buttons
- `booking-confirmation.ts`: Confirmation email when event is booked
- `rejection.ts`: Rejection email with reason

### Services (`lib/email/services/`)
- `booking-confirmation.ts`: Sends confirmation emails
- `rejection.ts`: Sends rejection emails

### Configuration (`lib/email/config.ts`)
- Resend client initialization
- Email sender configuration (auto-detects dev/prod)

### Usage
```typescript
import { sendBookingConfirmationEmail } from '@/lib/email/services/booking-confirmation'
import { renderBookingRequestEmail } from '@/lib/email/templates/booking-request'
```

## 🌍 Timezone Handling

All dates are consistently handled in **Panama timezone (America/Panama, EST)**:

- Date parsing: `parseDateInPanamaTime()` and `parseEndDateInPanamaTime()`
- Date formatting: `formatDateForPanama()` and `formatDateTimeForPanama()`
- Display: All dates shown in Panama timezone

This ensures consistency regardless of user's local timezone.

## 📅 Calendar Features

### View Modes
- **Launch View**: Shows events only on their start date (launch date)
- **Live View**: Shows events spanning their full duration across days

### Calendar Views
- **Day View**: Single day with hourly breakdown
- **Week View**: 7-day week view
- **Month View**: Full month calendar

### Event States
- **Pending**: Initial state for booking requests
- **Approved**: Approved by business, waiting to be booked
- **Booked**: Finalized and confirmed
- **Rejected**: Rejected by business

### Visual Indicators
- **Booked events**: Solid colors, full opacity
- **Approved/Pending events**: 70% opacity with bright yellow border (`ring-2 ring-yellow-400`)

## 🔄 Workflow

### Booking Request Flow
1. Sales user creates a booking request
2. Email sent to business with approve/reject buttons
3. Business clicks approve → Event status: `approved`
4. Admin reviews in calendar (shows with yellow border)
5. Admin books event → Event status: `booked`
6. Confirmation email sent to business and requester

### Direct Event Creation
- Admin can create events directly (status: `booked`)
- Events created via calendar click or "Create Event" button
- No approval needed for direct creation

## 🎨 Category System

### Hierarchical Structure
```
Main Category
  └─ Sub Category 1
      └─ Sub Category 2
          └─ Leaf Category
```

### Category Colors
Each main category has assigned colors:
- HOTELES: Blue
- RESTAURANTES: Red
- SHOWS Y EVENTOS: Purple
- SERVICIOS: Gray
- BIENESTAR Y BELLEZA: Pink
- ACTIVIDADES: Green
- CURSOS: Yellow
- PRODUCTOS: Orange
- And more...

### Duration Rules
- **7-day categories**: HOTELES, RESTAURANTES, SHOWS Y EVENTOS
- **1-day categories**: All others

## 🔒 Security

- **Token-based approvals**: Secure tokens with 1-year (365 days) expiration
- **Role-based access**: Clerk integration for user roles
- **HTTPS required**: All production URLs use HTTPS
- **Email verification**: Resend domain verification for production

## 📊 Daily Launch Limits

Configurable limits per category:
- Minimum launches per day
- Maximum launches per day
- Business-specific exceptions
- Merchant repeat restrictions (30-day cooldown)

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env` file
   - **Important**: Use production Clerk keys (`pk_live_...`, `sk_live_...`)

3. **Verify Resend Domain**
   - Go to [resend.com/domains](https://resend.com/domains)
   - Add and verify your domain
   - Update `EMAIL_FROM` to use verified domain

4. **Deploy**
   - Vercel auto-deploys on push to main
   - Or manually: `vercel --prod`

See `PRODUCTION_CHECKLIST.md` for detailed deployment steps.

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management

```bash
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev  # Create new migration
npx prisma generate  # Regenerate Prisma client
```

## 📝 Key Concepts

### Event Statuses
- `pending`: Initial booking request state
- `approved`: Approved by business, awaiting booking
- `booked`: Finalized and confirmed
- `rejected`: Rejected by business

### Booking Request Statuses
- `draft`: Saved but not sent
- `pending`: Sent, awaiting approval
- `approved`: Approved by business
- `booked`: Converted to booked event
- `rejected`: Rejected by business

### Date Handling
- All dates stored in UTC in database
- All parsing/display uses Panama timezone
- End dates represent end of day (23:59:59.999)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Proprietary - OfertaSimple

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
```env
DATABASE_URL              # Database connection (MUST be production URL)
TOKEN_SECRET_KEY          # MUST match local dev (or all links break)
NEXT_PUBLIC_APP_URL       # MUST be production URL (no trailing slash!)
RESEND_API_KEY            # Email service
CLERK_SECRET_KEY          # MUST be production keys (pk_live_, sk_live_)
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

## 🔌 API Endpoints

### Public Endpoints (No Authentication)

#### `/api/booking-requests/approve`
- **Method**: GET
- **Purpose**: Approve a booking request via email token
- **Query Params**: `token` (base64url encoded approval token)
- **Response**: Redirects to success or error page
- **Security**: Token-based verification (1-year expiration)

#### `/api/booking-requests/reject`
- **Method**: GET
- **Purpose**: Reject a booking request via email token
- **Query Params**: `token` (base64url encoded approval token)
- **Response**: Redirects to success or error page
- **Security**: Token-based verification (1-year expiration)

#### `/api/health/database`
- **Method**: GET
- **Purpose**: Health check for database connection
- **Response**: `{ connected: true }` or `{ connected: false, error: string }`
- **Use**: Monitoring and system status checks

### Authenticated Endpoints

#### `/api/user/role`
- **Method**: GET
- **Purpose**: Get current user's role (admin/sales)
- **Authentication**: Required (Clerk)
- **Response**: `{ role: 'admin' | 'sales' | null }`
- **Use**: Client-side role checks

## 📊 Database Schema

### Models

#### Event
```prisma
- id: String (CUID)
- name: String
- description: String?
- category: String?
- parentCategory: String?
- subCategory1: String?
- subCategory2: String?
- subCategory3: String?
- merchant: String? (for 30-day tracking)
- startDate: DateTime
- endDate: DateTime
- status: String (pending | approved | booked | rejected)
- userId: String (Clerk user ID)
- bookingRequestId: String? (links to BookingRequest)
- createdAt: DateTime
- updatedAt: DateTime

Indexes: userId, status, category, parentCategory, subCategory1-3, merchant, bookingRequestId
```

#### BookingRequest
```prisma
- id: String (CUID)
- name: String
- description: String?
- category: String?
- parentCategory: String?
- subCategory1: String?
- subCategory2: String?
- subCategory3: String?
- merchant: String?
- businessEmail: String (Email del Comercio)
- startDate: DateTime
- endDate: DateTime
- status: String (draft | pending | approved | booked | rejected)
- eventId: String? (links to created Event)
- userId: String (requester)
- processedAt: DateTime? (when approved/rejected/booked)
- processedBy: String? (email of processor)
- rejectionReason: String?
- createdAt: DateTime
- updatedAt: DateTime

Indexes: userId, status, eventId, businessEmail, parentCategory
```

#### UserProfile
```prisma
- id: String (CUID)
- clerkId: String (unique, Clerk user ID)
- email: String?
- name: String?
- role: String (admin | sales, default: sales)
- createdAt: DateTime
- updatedAt: DateTime

Indexes: clerkId, role, email
```

### Relationships
- `Event.bookingRequestId` ↔ `BookingRequest.eventId` (one-to-one)
- `Event.userId` → Clerk user (owner/creator)
- `BookingRequest.userId` → Clerk user (requester)

## 🔧 Server Actions

### Event Actions (`app/actions/events.ts`)

#### `getEvents()`
- Fetches events based on user role
- Admin: All events with status `approved` or `booked`
- Sales: Only own events with status `approved` or `booked`
- Returns: `Event[]`

#### `createEvent(formData: FormData)`
- Creates new event with status `booked`
- Requires: name, startDate, endDate
- Validates daily launch limits
- Returns: Created event

#### `updateEvent(eventId: string, formData: FormData)`
- Updates existing event
- Role-based: Admin can update any, Sales only own
- Preserves category hierarchy
- Returns: Updated event

#### `deleteEvent(eventId: string)`
- Deletes event
- Role-based: Admin can delete any, Sales only own
- Returns: Success boolean

#### `bookEvent(eventId: string)`
- Changes event status from `approved` to `booked`
- Updates linked booking request
- Sends confirmation email
- Admin only

#### `rejectEvent(eventId: string, rejectionReason: string)`
- Rejects approved event with reason
- Updates linked booking request
- Sends rejection email
- Admin only

### Booking Request Actions (`app/actions/booking-requests.ts`)

#### `getBookingRequests()`
- Fetches booking requests
- Admin: All requests
- Sales: Only own requests
- Returns: `BookingRequest[]`

#### `saveBookingRequestDraft(formData, requestId?)`
- Saves booking request as draft
- Creates or updates request with status `draft`
- Returns: `{ success: boolean, data?: BookingRequest }`

#### `sendBookingRequest(formData, requestId?)`
- Sends booking request (status: `pending`)
- Creates linked event (status: `pending`)
- Generates approval/rejection tokens
- Sends approval email to business
- Returns: `{ success: boolean, data?: BookingRequest }`

#### `updateBookingRequest(requestId, formData)`
- Updates booking request dates and details
- Also updates linked event if exists
- Returns: `{ success: boolean, data?: BookingRequest }`

#### `deleteBookingRequest(requestId)`
- Deletes booking request
- Sales: Only own requests
- Returns: `{ success: boolean }`

### PDF Parsing (`app/actions/pdf-parse.ts`)

#### `parsePDFBooking(blob: Blob)`
- Parses PDF file using OpenAI
- Extracts booking information
- Matches categories using AI
- Returns: `ParsedBookingData`

## 📋 Development Workflow

### Adding a New Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Update types if needed
   - Add error handling

3. **Test locally**
   ```bash
   npm run dev
   ```

4. **Update documentation**
   - Update README if adding new features
   - Update Danger Zone if critical

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **Server Actions**: Use `'use server'` directive
- **Components**: Use `'use client'` directive
- **Types**: Define types at top of file or in separate types file
- **Error Handling**: Always return `{ success: boolean, error?: string }` format
- **Dates**: Always use Panama timezone utilities from `lib/timezone.ts`

## 🧪 Testing

### Manual Testing Checklist

Before deploying, test:
- [ ] Create booking request
- [ ] Receive approval email
- [ ] Click approve link (works without login)
- [ ] Event appears in calendar with yellow border
- [ ] Admin can book event
- [ ] Confirmation email sent
- [ ] Event border changes to solid (booked)
- [ ] Search functionality works
- [ ] Category filtering works
- [ ] Drag-and-drop works
- [ ] Date selection uses correct timezone
- [ ] Daily limits enforced correctly

### Test Data Setup

For testing, you can:
1. Create test booking requests via UI
2. Use test emails (Gmail works fine for testing)
3. Test with both admin and sales user roles

## 🔍 Troubleshooting Guide

### Issue: Events Not Showing
**Possible causes:**
- Status filtering (check if `showPendingBooking` is active)
- Category filtering (check selected categories)
- User role (Sales only see own events)
- Date range (check calendar view scope)

**Debug steps:**
1. Check browser console for errors
2. Verify user role (`/api/user/role`)
3. Check event status in database
4. Verify category matching

### Issue: Dates Showing Wrong
**Possible causes:**
- Timezone conversion issue
- Using UTC methods instead of Panama timezone

**Fix:**
- Use `parseDateInPanamaTime()` for parsing
- Use `formatDateForPanama()` for display
- Check `lib/timezone.ts` for correct utilities

### Issue: Email Not Sending
**Possible causes:**
- Resend domain not verified (production)
- Wrong `RESEND_API_KEY`
- `EMAIL_FROM` not set correctly

**Debug steps:**
1. Check Resend dashboard for failed sends
2. Verify domain verification status
3. Check environment variables
4. Review email service logs in console

### Issue: Token Links Not Working
**Possible causes:**
- `TOKEN_SECRET_KEY` mismatch
- Token expired (1-year window)
- URL encoding issue

**Debug steps:**
1. Verify `TOKEN_SECRET_KEY` matches across environments
2. Check token in URL (should be base64url)
3. Create new booking request with fresh token
4. Check server logs for token verification errors

## 📚 Additional Resources

- **Production Deployment**: See `PRODUCTION_CHECKLIST.md`
- **Database Migrations**: Run with `npx prisma migrate dev`
- **Prisma Studio**: `npx prisma studio` (database GUI)
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Clerk Docs**: https://clerk.com/docs
- **Resend Docs**: https://resend.com/docs

## 🔄 Changelog

### Recent Changes
- ✅ Token expiration extended to 1 year (365 days)
- ✅ Email system refactored into modular structure
- ✅ Pending requests sidebar with drag-to-calendar
- ✅ Event search with table view
- ✅ Category filtering improvements
- ✅ Timezone handling fixes (Panama EST)
- ✅ Visual indicators for non-booked events (yellow border)
- ✅ Daily launch limits validation

## 🆘 Support

For issues or questions:
- Check `PRODUCTION_CHECKLIST.md` for deployment help
- Review environment variables setup
- Check Resend domain verification status
- **For critical bugs**: Check the Danger Zone section above first
- Review Troubleshooting Guide above
- Check API endpoint documentation above

---

**Built with ❤️ for OfertaSimple**
