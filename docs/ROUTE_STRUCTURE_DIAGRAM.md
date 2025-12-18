# Route Structure Diagram

## Current Structure (Issues Highlighted)

```
app/
├── (app)/                          ✅ Good: Authenticated routes grouped
│   ├── dashboard/
│   ├── booking-requests/          ⚠️  Confusing: Same name as public routes
│   ├── deals/
│   └── ...
│
├── booking-requests/               ❌ Issue: Public routes, confusing name
│   ├── approved/
│   ├── rejected/
│   └── ...
│
├── public/                         ❌ Issue: Another location for public routes
│   └── booking-request/
│
├── sign-in/                        ❌ Issue: Not grouped
├── no-access/                      ❌ Issue: Not grouped
├── t-c/                            ❌ Issue: Not grouped
└── dealdraft/                      ❌ Issue: Inconsistent naming
```

## Proposed Structure (Organized)

```
app/
│
├── (auth)/                         🆕 Route Group: Authentication
│   └── sign-in/
│       └── [[...sign-in]]/
│
├── (public)/                       🆕 Route Group: Public Routes
│   ├── booking-request/            ✅ Consolidated public booking routes
│   │   ├── [token]/
│   │   ├── approved/
│   │   ├── rejected/
│   │   ├── cancelled/
│   │   ├── error/
│   │   └── confirmation/
│   ├── no-access/
│   └── t-c/
│
├── (app)/                          ✅ Keep: Authenticated routes
│   ├── layout.tsx                  ✅ App layout with sidebar
│   ├── dashboard/
│   ├── tasks/
│   ├── pipeline/
│   ├── booking-requests/           ✅ Clear: Authenticated management
│   ├── reservations/
│   ├── leads/
│   ├── opportunities/
│   ├── deals/
│   │   └── [id]/
│   │       └── draft/              ✅ Option: Move dealdraft here
│   ├── businesses/
│   ├── events/
│   ├── activity-log/
│   └── settings/
│
├── api/                            ✅ Well organized
│   ├── access/
│   ├── ai/
│   ├── booking-requests/
│   └── ...
│
└── actions/                        ⚠️  Proposed: Reorganize by domain
    ├── auth/
    ├── booking/
    ├── crm/
    └── ...
```

## Route Group Benefits

```
┌─────────────────────────────────────────────────────────┐
│  Route Groups: (folder) - Don't appear in URL          │
│  Purpose: Organize routes without changing URLs         │
└─────────────────────────────────────────────────────────┘

(auth)/          →  /sign-in (not /auth/sign-in)
(public)/        →  /booking-request/approved (not /public/booking-request/approved)
(app)/           →  /dashboard (not /app/dashboard)
```

## Route Access Flow

```
┌─────────────────┐
│   User Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Middleware    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Public │ │ Requires │
│ Route? │ │   Auth   │
└───┬────┘ └────┬─────┘
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │  (app)/      │
    │    │  Routes      │
    │    │  + Sidebar   │
    │    └──────────────┘
    │
    ▼
┌──────────────┐
│  (public)/   │
│  Routes      │
│  No Sidebar  │
└──────────────┘
```

## File Organization Pattern

```
Each Route Folder:
├── page.tsx           → Main route component
├── layout.tsx         → Route-specific layout (optional)
├── loading.tsx        → Loading UI
├── error.tsx          → Error UI (optional)
└── [id]/              → Dynamic route segment
    └── page.tsx
```

## Component Organization

```
components/
├── booking/           → Booking-related components
├── crm/              → CRM entity components
│   ├── business/
│   ├── deal/
│   ├── opportunity/
│   └── lead/
├── common/           → Shared UI components
├── shared/           → Reusable components
└── ui/              → Base UI primitives
```

## Actions Organization (Proposed)

```
app/actions/
├── auth/             → Authentication & access
├── booking/          → Booking & reservations
├── crm/              → CRM entities (businesses, deals, etc.)
├── events/           → Calendar & events
├── settings/         → App configuration
├── system/           → System features (dashboard, tasks, etc.)
└── ai/               → AI-related actions
```

## Benefits Summary

✅ **Clear Separation**: Public vs authenticated routes are obvious
✅ **No URL Changes**: Route groups don't affect actual URLs
✅ **Better Organization**: Related routes grouped together
✅ **Consistent Naming**: Standardized naming conventions
✅ **Easier Navigation**: Developers can find routes quickly
✅ **Scalable**: Structure supports future growth




