# Route Quick Reference Guide

> ✅ **Migration Complete** - Route reorganization implemented on Dec 17, 2025

## Route Structure Overview

### Authentication Routes - `(auth)`
| Route | File Path | Notes |
|-------|-----------|-------|
| `/sign-in` | `app/(auth)/sign-in/[[...sign-in]]/` | Clerk authentication |

### Public Routes - `(public)` (No Auth Required)
| Route | File Path | Notes |
|-------|-----------|-------|
| `/booking-request/[token]` | `app/(public)/booking-request/[token]/` | Public booking form |
| `/booking-request/approved` | `app/(public)/booking-request/approved/` | Status page |
| `/booking-request/rejected` | `app/(public)/booking-request/rejected/` | Status + rejection form |
| `/booking-request/cancelled` | `app/(public)/booking-request/cancelled/` | Cancelled status |
| `/booking-request/already-processed` | `app/(public)/booking-request/already-processed/` | Already processed |
| `/booking-request/error` | `app/(public)/booking-request/error/` | General error |
| `/booking-request/form-error` | `app/(public)/booking-request/form-error/` | Form-specific errors |
| `/booking-request/confirmation` | `app/(public)/booking-request/confirmation/` | Submission confirmation |
| `/no-access` | `app/(public)/no-access/` | Access denied page |
| `/t-c` | `app/(public)/t-c/` | Terms & conditions |

### Authenticated App Routes - `(app)`
| Route | File Path | Notes |
|-------|-----------|-------|
| `/dashboard` | `app/(app)/dashboard/` | Main dashboard |
| `/tasks` | `app/(app)/tasks/` | Task management |
| `/pipeline` | `app/(app)/pipeline/` | Pipeline view |
| `/booking-requests` | `app/(app)/booking-requests/` | Request list |
| `/booking-requests/new` | `app/(app)/booking-requests/new/` | Create request |
| `/booking-requests/edit/[id]` | `app/(app)/booking-requests/edit/[id]/` | Edit request |
| `/reservations` | `app/(app)/reservations/` | Reservations |
| `/leads` | `app/(app)/leads/` | CRM leads |
| `/opportunities` | `app/(app)/opportunities/` | CRM opportunities |
| `/deals` | `app/(app)/deals/` | CRM deals |
| `/deals/[id]/draft` | `app/(app)/deals/[id]/draft/` | Deal draft |
| `/businesses` | `app/(app)/businesses/` | Business list |
| `/businesses/[id]` | `app/(app)/businesses/[id]/` | Business detail |
| `/events` | `app/(app)/events/` | Event calendar |
| `/activity-log` | `app/(app)/activity-log/` | Activity log |
| `/settings` | `app/(app)/settings/` | App settings |

### API Routes
| Route | File Path | Notes |
|-------|-----------|-------|
| `/api/booking-requests/approve` | `app/api/booking-requests/approve/` | Email approval |
| `/api/booking-requests/reject` | `app/api/booking-requests/reject/` | Email rejection |
| `/api/access/check` | `app/api/access/check/` | Access validation |
| `/api/health/database` | `app/api/health/database/` | Health check |
| `/api/email/*` | `app/api/email/` | Email preview/test |
| `/api/ai/*` | `app/api/ai/` | AI features |
| `/api/settings/*` | `app/api/settings/` | Settings API |

## Route Group Purposes

### `(auth)` - Authentication Routes
- **Purpose**: User authentication (sign in, sign up)
- **Auth Required**: No
- **Layout**: Minimal (no sidebar)

### `(public)` - Public Routes
- **Purpose**: Public-facing pages accessible without authentication
- **Auth Required**: No
- **Layout**: Public (no sidebar, minimal branding)
- **Examples**: Booking request status pages, public booking forms, terms & conditions

### `(app)` - Application Routes
- **Purpose**: Main application functionality
- **Auth Required**: Yes
- **Layout**: Full app layout with sidebar and navigation
- **Examples**: Dashboard, CRM, booking management

## URL Patterns

### Public Booking Request URLs
```
/booking-request/[token]              # Public booking form
/booking-request/approved             # Status: Approved
/booking-request/rejected             # Status: Rejected
/booking-request/cancelled            # Status: Cancelled
/booking-request/already-processed    # Status: Already processed
/booking-request/error                # Error page
/booking-request/form-error           # Form error page
/booking-request/confirmation         # Confirmation page
```

### Authenticated Booking Request URLs
```
/booking-requests                     # List all requests
/booking-requests/new                 # Create new request
/booking-requests/edit/[id]           # Edit existing request
```

## Key Design Decisions

1. **Route Groups**: Use Next.js route groups `(auth)`, `(public)`, `(app)` to organize routes without affecting URLs
2. **Naming Consistency**: 
   - Public booking routes use singular `booking-request`
   - Authenticated routes use plural `booking-requests`
3. **Clear Separation**: Public and authenticated routes are clearly separated by route groups
4. **No URL Changes**: Route groups don't affect actual URLs, only organization

## Middleware Configuration

Public routes defined in `middleware.ts`:
```typescript
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/booking-requests/approve(.*)',
  '/api/booking-requests/reject(.*)',
  '/api/health/(.*)',
  '/api/access/check(.*)',
  '/booking-request/(.*)',  // All public booking pages
  '/no-access(.*)',
  '/t-c(.*)',
])
```
