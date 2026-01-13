# OS Deals Booking - Complete Repository Guide

## Table of Contents

### Technical Documentation
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagram](#architecture-diagram)
4. [Directory Structure](#directory-structure)
5. [Database Schema](#database-schema)
6. [Authentication & Authorization](#authentication--authorization)
7. [Core Patterns](#core-patterns)
8. [Key Components](#key-components)
9. [Server Actions](#server-actions)
10. [Caching Strategy](#caching-strategy)
11. [Email System](#email-system)
12. [Feature Flags](#feature-flags)
13. [Observability](#observability)
14. [Critical Areas](#critical-areas)
15. [Common Pitfalls](#common-pitfalls)
16. [Best Practices](#best-practices)

### 🎓 Tutorial for Non-Technical Users
17. [Understanding the Basics](#understanding-the-basics)
18. [Understanding the Code Structure](#understanding-the-code-structure)
    - [Main Data Types](#-main-data-types-what-data-looks-like)
    - [Key Files and What They Do](#️-key-files-and-what-they-do)
19. [How Key Functions Work](#how-key-functions-work)
    - [Authentication](#-authentication-who-can-access-what)
    - [Creating a Booking Request](#-creating-a-booking-request-step-by-step)
    - [Approving/Rejecting](#-approvingrejectin-a-booking-email-links)
    - [Calendar & Events](#-calendar--events)
    - [Cache System](#-cache-system-why-data-updates)
    - [Email System](#-email-system-1)
    - [AI Content Generation](#-ai-content-generation)
    - [Search & Filters](#-search--filters)
20. [Important Patterns](#important-patterns-to-understand)
21. [Database Relationships](#database-relationships-explained)
22. [User Roles Explained](#user-roles-explained)
23. [Status Lifecycles](#status-lifecycles)
24. [Setting Up Your Computer](#setting-up-your-computer)
25. [Daily Operations](#daily-operations)
26. [Making Changes Safely](#making-changes-safely)
27. [Common Tasks Step-by-Step](#common-tasks-step-by-step)
28. [Troubleshooting Guide](#troubleshooting-guide)
29. [Emergency Procedures](#emergency-procedures)
30. [Useful Commands Cheat Sheet](#useful-commands-cheat-sheet)
31. [Maintenance Schedule](#maintenance-schedule)

---

## Project Overview

**OS Deals Booking** is an internal CRM and booking management system for OfertaSimple (Panama's deals platform). It manages:
- **CRM Pipeline**: Leads → Businesses → Opportunities → Booking Requests → Deals
- **Event Calendar**: Campaign scheduling with category-based duration rules
- **Marketing Campaigns**: Social media content planning (Instagram, TikTok, etc.)
- **Market Intelligence**: Competitor deal tracking and scraping

### Key Business Flows
```
Lead → Business → Opportunity → Booking Request → Event → Deal → Marketing Campaign
       ↑                            ↑
       └─ Can be created directly ──┘
```

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.x | App Router, Server Components, Server Actions |
| **React** | 19.x | UI with Suspense, useTransition, useOptimistic |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling |

### Database & ORM
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | - | Primary database |
| **Prisma** | 6.19.x | ORM with schema migrations |

### Authentication & Authorization
| Technology | Version | Purpose |
|------------|---------|---------|
| **Clerk** | 6.35.x | Authentication, user management |
| **Custom Roles** | - | admin, sales, editor, ere, marketing |

### External Services
| Service | Purpose |
|---------|---------|
| **Resend** | Transactional emails |
| **OpenAI** | AI content generation (marketing copy, video scripts) |
| **AWS S3** | Image storage |
| **Sentry** | Error tracking & monitoring |
| **Vercel** | Hosting, Analytics, Speed Insights |

### UI Libraries
| Library | Purpose |
|---------|---------|
| **MUI Icons** | Icon set |
| **react-hot-toast** | Toast notifications |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL HOSTING                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         NEXT.JS APP ROUTER                            │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   (app)     │  │   (auth)    │  │  (public)   │  │    api      │ │   │
│  │  │  Protected  │  │   Sign-in   │  │   Booking   │  │   Routes    │ │   │
│  │  │   Routes    │  │             │  │   Request   │  │             │ │   │
│  │  └──────┬──────┘  └─────────────┘  └─────────────┘  └──────┬──────┘ │   │
│  │         │                                                   │        │   │
│  │         ▼                                                   ▼        │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    MIDDLEWARE (Auth + Access)                 │   │   │
│  │  │  • Clerk authentication                                      │   │   │
│  │  │  • AllowedEmail whitelist check                              │   │   │
│  │  │  • Cookie-based access caching (5 min)                       │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                      SERVER ACTIONS                           │   │   │
│  │  │  app/actions/*.ts                                            │   │   │
│  │  │  • Role-based access control                                 │   │   │
│  │  │  • Prisma database operations                                │   │   │
│  │  │  • Cache invalidation                                        │   │   │
│  │  │  • Activity logging                                          │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                       CLIENT PROVIDERS                        │   │   │
│  │  │  • SharedDataContext (categories, users)                     │   │   │
│  │  │  • SidebarContext (UI state)                                 │   │   │
│  │  │  • FormConfigCacheProvider (form configs)                    │   │   │
│  │  │  • ClerkProvider (auth state)                                │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                           EXTERNAL SERVICES                                  │
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ Postgres│  │  Clerk  │  │ Resend  │  │ OpenAI  │  │ AWS S3  │          │
│  │   DB    │  │  Auth   │  │  Email  │  │   AI    │  │ Storage │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          SENTRY (Observability)                      │   │
│  │  • Error tracking (client + server + edge)                          │   │
│  │  • Session replay                                                    │   │
│  │  • Performance monitoring                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram
```
┌────────────────────────────────────────────────────────────────────────────┐
│                              CRM PIPELINE                                   │
│                                                                             │
│  ┌──────┐     ┌──────────┐     ┌─────────────┐     ┌───────────────────┐  │
│  │ Lead │ ──▶ │ Business │ ──▶ │ Opportunity │ ──▶ │ Booking Request   │  │
│  └──────┘     └──────────┘     └─────────────┘     └───────────────────┘  │
│                    │                  │                      │              │
│                    │                  │                      ▼              │
│                    │                  │              ┌───────────────┐      │
│                    │                  │              │    Event      │      │
│                    │                  │              │  (Calendar)   │      │
│                    │                  │              └───────┬───────┘      │
│                    │                  │                      │              │
│                    │                  ▼                      ▼              │
│                    │           ┌──────────┐          ┌────────────┐        │
│                    │           │  Tasks   │          │    Deal    │        │
│                    │           │(Activity)│          │  (Post-    │        │
│                    │           └──────────┘          │   Booking) │        │
│                    │                                 └─────┬──────┘        │
│                    │                                       │               │
│                    │                                       ▼               │
│                    │                              ┌─────────────────┐      │
│                    │                              │   Marketing     │      │
│                    │                              │   Campaign      │      │
│                    │                              └─────────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
os_deals_booking.nosync/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Protected routes (require auth)
│   │   ├── layout.tsx            # Server component - fetches shared data
│   │   ├── businesses/           # CRM: Businesses
│   │   ├── opportunities/        # CRM: Opportunities
│   │   ├── deals/                # CRM: Deals
│   │   ├── leads/                # CRM: Leads
│   │   ├── booking-requests/     # Booking requests management
│   │   ├── events/               # Calendar view
│   │   ├── marketing/            # Marketing campaigns
│   │   ├── pipeline/             # Kanban/pipeline views
│   │   ├── tasks/                # Tasks overview
│   │   ├── dashboard/            # Dashboard
│   │   ├── settings/             # Settings pages
│   │   ├── activity-log/         # Activity history
│   │   └── market-intelligence/  # Competitor tracking
│   ├── (auth)/                   # Auth routes
│   │   └── sign-in/
│   ├── (public)/                 # Public routes (no auth)
│   │   ├── booking-request/      # Public booking form
│   │   ├── no-access/
│   │   └── t-c/                  # Terms & conditions
│   ├── api/                      # API routes
│   │   ├── booking-requests/     # Approve/reject endpoints (PUBLIC)
│   │   ├── ai/                   # AI content generation
│   │   ├── upload/               # S3 image upload
│   │   ├── cron/                 # Scheduled tasks
│   │   ├── external-oferta/      # External API integration
│   │   └── market-intelligence/  # Competitor scraping
│   └── actions/                  # Server Actions
│       ├── crm.ts                # Barrel export for CRM actions
│       ├── businesses.ts
│       ├── opportunities.ts
│       ├── deals.ts
│       ├── leads.ts
│       ├── booking-requests.ts
│       ├── events.ts
│       ├── marketing.ts
│       ├── tasks.ts
│       ├── form-config.ts        # Dynamic form configuration
│       ├── custom-fields.ts      # Custom field values
│       ├── marketing-comments.ts # Marketing chat
│       ├── opportunity-comments.ts
│       └── ...
├── components/
│   ├── booking/                  # Booking request components
│   │   ├── request-view/         # View modal + content
│   │   └── ...
│   ├── calendar/                 # Calendar components
│   ├── common/                   # Shared UI components
│   │   ├── AppClientProviders.tsx # Global providers
│   │   ├── GlobalHeader.tsx
│   │   ├── HamburgerMenu.tsx
│   │   └── ...
│   ├── crm/                      # CRM entity components
│   │   ├── business/
│   │   ├── opportunity/
│   │   ├── deal/
│   │   └── lead/
│   ├── events/                   # Event components
│   ├── filters/                  # Advanced filter components
│   ├── marketing/                # Marketing campaign components
│   ├── shared/                   # Shared form components
│   │   ├── ModalShell.tsx        # Base modal wrapper
│   │   ├── DynamicFormSection.tsx
│   │   ├── DynamicFormField.tsx
│   │   └── ...
│   ├── RequestForm/              # Multi-step booking form
│   └── ui/                       # Base UI components (Button, Input, etc.)
├── hooks/                        # Custom React hooks
│   ├── useDynamicForm.ts         # Form config + custom fields
│   ├── useFormConfigCache.tsx    # Global form config cache
│   ├── useSharedData.tsx         # Categories + users context
│   ├── useUserRole.ts            # Client-side role check
│   ├── useAsyncAction.ts         # Server action wrapper
│   ├── useConfirmDialog.ts
│   └── ...
├── lib/                          # Utilities and services
│   ├── config/
│   │   └── env.ts                # Environment variable validation
│   ├── auth/
│   │   └── roles.ts              # User role management
│   ├── cache/
│   │   └── invalidation.ts       # Centralized cache invalidation
│   ├── constants/                # Application constants
│   │   ├── deal-statuses.ts
│   │   ├── opportunity-stages.ts
│   │   ├── lead-stages.ts
│   │   └── ...
│   ├── date/
│   │   └── timezone.ts           # Panama timezone utilities
│   ├── email/
│   │   ├── config.ts             # Email configuration + feature flags
│   │   ├── services/             # Email sending functions
│   │   └── templates/            # Email HTML templates
│   ├── tokens/                   # JWT token generation/verification
│   ├── utils/
│   │   └── server-actions.ts     # Server action helpers
│   ├── activity-log.ts           # Activity logging
│   ├── logger.ts                 # Centralized logger + Sentry
│   ├── prisma.ts                 # Prisma client singleton
│   └── openai.ts                 # OpenAI client
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Barrel export
│   ├── form-config.ts            # Form configuration types
│   └── ...
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration history
├── sentry.client.config.ts       # Sentry browser config
├── sentry.server.config.ts       # Sentry server config
├── sentry.edge.config.ts         # Sentry edge config
├── instrumentation.ts            # Next.js instrumentation
├── middleware.ts                 # Auth + access control middleware
└── next.config.ts                # Next.js configuration
```

---

## Database Schema

### Core Entities

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      Lead       │────▶│    Business     │◀────│   Opportunity   │
│ (por_asignar,   │     │  (CRM entity)   │     │ (iniciacion →   │
│  asignado,      │     │                 │     │  won/lost)      │
│  convertido)    │     └────────┬────────┘     └────────┬────────┘
└─────────────────┘              │                       │
                                 │                       │
                                 ▼                       ▼
                    ┌────────────────────┐     ┌─────────────────┐
                    │   BusinessSalesRep │     │      Task       │
                    │   (Many-to-Many)   │     │ (meeting/todo)  │
                    └────────────────────┘     └─────────────────┘
```

### Booking Flow
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ BookingRequest  │────▶│      Event      │────▶│      Deal       │
│ (draft →        │     │  (Calendar)     │     │ (Post-booking   │
│  booked)        │     │                 │     │  workflow)      │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ MarketingCampaign│───▶│ MarketingOption │
│ (per booked     │     │ (Instagram,     │
│  request)       │     │  TikTok, etc.)  │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌────────────────────┐
                        │MarketingOptionComment│
                        │ (Chat thread)       │
                        └────────────────────┘
```

### Key Relationships
- **Business** → hasMany **Opportunity** (via businessId)
- **Opportunity** → hasOne **Deal** (when won and booked)
- **BookingRequest** → hasOne **Event** (when sent)
- **BookingRequest** → hasOne **Deal** (when booked)
- **Deal** → belongsTo **BookingRequest** (one-to-one)
- **MarketingCampaign** → belongsTo **BookingRequest** (one-to-one)

### Dynamic Fields System
```
┌─────────────────┐     ┌─────────────────┐
│  FormSection    │────▶│ FormFieldConfig │
│ (Business,      │     │ (builtin or     │
│  Opportunity,   │     │  custom field)  │
│  Deal, Lead)    │     └────────┬────────┘
└─────────────────┘              │
                                 ▼
                        ┌─────────────────┐
                        │  CustomField    │───▶ CustomFieldValue
                        │ (cf_* keys)     │    (per entity instance)
                        └─────────────────┘
```

### Key Models Summary

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Lead** | Initial contact | name, contactName, stage, responsibleId |
| **Business** | Company entity | name, categoryId, ownerId, tier |
| **Opportunity** | Sales opportunity | businessId, stage, responsibleId |
| **Task** | Activity tracking | opportunityId, category, date, completed |
| **BookingRequest** | Deal submission | name, businessEmail, status, opportunityId |
| **Event** | Calendar event | name, startDate, endDate, status |
| **Deal** | Post-booking workflow | bookingRequestId, responsibleId, status |
| **MarketingCampaign** | Marketing plan | bookingRequestId, doMarketing |
| **MarketingOption** | Platform option | campaignId, platform, optionType |
| **UserProfile** | User data | clerkId, role, email |
| **Category** | Business categories | parentCategory, subCategory1-4 |
| **FormSection** | Form config | entityType, displayOrder |
| **CustomField** | Custom fields | fieldKey, entityType, fieldType |

---

## Authentication & Authorization

### Authentication Flow
```
1. User visits protected route
2. Middleware checks Clerk session
3. If no session → redirect to /sign-in
4. If session exists:
   a. Check access cookie (5-min cache)
   b. If no cookie → query AllowedEmail table
   c. If email not in whitelist → redirect to /no-access
   d. If allowed → set cookie, continue
```

### User Roles
| Role | Permissions |
|------|-------------|
| **admin** | Full access to all entities and settings |
| **sales** | Own businesses, opportunities, booking requests |
| **editor** | Assigned deals only |
| **ere** | Assigned deals only (ERE = specific editor role) |
| **marketing** | Marketing campaigns only |

### Role-Based Filtering Pattern
```typescript
// In server actions:
const role = await getUserRole()

// Admin sees all
if (role === 'admin') {
  whereClause = {}
}
// Sales sees own
else if (role === 'sales') {
  whereClause = { responsibleId: userId }
}
// Editor/ERE sees assigned
else if (role === 'editor' || role === 'ere') {
  whereClause = { responsibleId: userId }
}
```

### Access Control Files
- `middleware.ts` - Route-level auth check
- `lib/auth/roles.ts` - Role utilities (getUserRole, isAdmin)
- `lib/utils/server-actions.ts` - requireAuth, requireAdmin, buildRoleBasedWhereClause

---

## Core Patterns

### 1. Server Actions Pattern
```typescript
// app/actions/[entity].ts
'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, handleServerActionError } from '@/lib/utils/server-actions'
import { invalidateEntity } from '@/lib/cache'
import { logActivity } from '@/lib/activity-log'

export async function getEntities() {
  // 1. Auth check
  const authResult = await requireAuth()
  if (!('userId' in authResult)) {
    return authResult // Returns { success: false, error: '...' }
  }
  const { userId } = authResult

  try {
    // 2. Role-based filtering
    const role = await getUserRole()
    const whereClause = buildRoleBasedWhereClause(role, userId, 'entity')

    // 3. Database query (often cached)
    const data = await prisma.entity.findMany({ where: whereClause })

    return { success: true, data }
  } catch (error) {
    return handleServerActionError(error, 'getEntities')
  }
}

export async function updateEntity(id: string, formData: FormData) {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) return authResult

  try {
    // 1. Update database
    const updated = await prisma.entity.update({...})

    // 2. Invalidate cache
    invalidateEntity('entities')

    // 3. Log activity
    await logActivity({
      action: 'UPDATE',
      entityType: 'Entity',
      entityId: id,
      entityName: updated.name,
    })

    return { success: true, data: updated }
  } catch (error) {
    return handleServerActionError(error, 'updateEntity')
  }
}
```

### 2. Client Provider Pattern
```typescript
// Layout (Server Component)
export default async function AppGroupLayout({ children }) {
  const { userId } = await auth()
  
  // Fetch shared data on server
  const [categories, users, role] = await Promise.all([
    getCachedCategories(),
    getCachedUsers(),
    getUserRoleFromDb(userId),
  ])

  return (
    <AppClientProviders
      initialCategories={categories}
      initialUsers={users}
      initialRole={role}
    >
      {children}
    </AppClientProviders>
  )
}

// AppClientProviders (Client Component)
export default function AppClientProviders({ 
  children, 
  initialCategories, 
  initialUsers, 
  initialRole 
}) {
  return (
    <SharedDataContext.Provider value={{ categories, users }}>
      <SidebarContext.Provider value={{ isAdmin, role }}>
        <FormConfigCacheProvider>
          {children}
        </FormConfigCacheProvider>
      </SidebarContext.Provider>
    </SharedDataContext.Provider>
  )
}
```

### 3. Dynamic Form Pattern
```typescript
// In modal component
const dynamicForm = useDynamicForm({
  entityType: 'opportunity',
  entityId: opportunity?.id,
  initialValues,
  preloadedSections: cachedSections,  // From FormConfigCache
})

// Access values
const value = dynamicForm.getValue('fieldKey')
dynamicForm.setValue('fieldKey', newValue)

// Get all values for submission
const allValues = dynamicForm.getAllValues()

// Save custom field values after entity creation
await dynamicForm.saveCustomFields(entityId)
```

### 4. Cache Invalidation Pattern
```typescript
// After any mutation
import { invalidateEntity } from '@/lib/cache'

// Single entity
invalidateEntity('opportunities')

// With cascade (dashboard updates when deals change)
invalidateEntity('deals') // Auto-invalidates 'dashboard'

// User-specific cache
invalidateUserCache(clerkId) // After role change
```

### 5. useTransition Pattern (React 19)
```typescript
const [isPending, startTransition] = useTransition()

function handleSubmit() {
  startTransition(async () => {
    const result = await serverAction(data)
    if (result.success) {
      onSuccess(result.data)
    } else {
      setError(result.error)
    }
  })
}

// In UI
<Button disabled={isPending}>
  {isPending ? 'Saving...' : 'Save'}
</Button>
```

---

## Key Components

### Modal System
All modals should extend `ModalShell`:
```typescript
<ModalShell
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  icon={<IconComponent />}
  iconColor="orange"
  footer={<ModalFooter onCancel={onClose} submitLabel="Save" />}
>
  {/* Content */}
</ModalShell>
```

### Form Sections
Use `DynamicFormSection` for configurable forms:
```typescript
<DynamicFormSection
  section={section}
  values={dynamicForm.getAllValues()}
  onChange={dynamicForm.setValue}
  categories={categories}
  users={users}
  businesses={businesses}
  isEditMode={!!existingEntity}
/>
```

### Skeletons
Each modal has matching skeleton components:
- `OpportunityModalSkeleton` → `OpportunityPipelineSkeleton`, `OpportunityDetailsSkeleton`
- `FormModalSkeleton` → Generic loading state

---

## Caching Strategy

### Server-Side Caching (`unstable_cache`)
```typescript
const getCachedData = unstable_cache(
  async () => prisma.entity.findMany(),
  ['cache-key-unique-per-user'],
  {
    tags: ['entities'],        // For tag-based invalidation
    revalidate: 60,            // Seconds before stale
  }
)
```

### Cache Tags
| Tag | Entities |
|-----|----------|
| `opportunities` | Opportunities list |
| `businesses` | Businesses list |
| `deals` | Deals list |
| `events` | Calendar events |
| `categories` | Category hierarchy |
| `users` | User profiles |
| `form-config` | Form configurations |
| `tasks` | Tasks |
| `dashboard` | Dashboard aggregates |

### Client-Side Caching
- `FormConfigCacheProvider` - Caches form configurations (5-min TTL)
- `SharedDataContext` - Categories and users from server
- Cookie-based access verification (5-min)

### Prefetching Pattern
```typescript
const { prefetch } = useFormConfigCache()

// Prefetch on hover
<TableRow onMouseEnter={() => prefetch('opportunity')}>
```

---

## Email System

### Configuration (`lib/email/config.ts`)
```typescript
export const EMAIL_CONFIG = {
  from: getFromEmail(),  // Auto-detects dev vs prod
  replyTo: ENV.EMAIL_REPLY_TO,
}

// Feature flag
export const ENABLE_MENTION_NOTIFICATION_EMAILS = false
```

### Email Templates
| Template | Purpose |
|----------|---------|
| `booking-request.ts` | Initial booking request with approve/reject buttons |
| `booking-confirmation.ts` | Confirmation after booking |
| `rejection.ts` | Rejection notification |
| `mention-notification.ts` | When user is @mentioned |
| `task-reminder.ts` | Task due reminders |

### Email Services
```typescript
// lib/email/services/
import { sendBookingConfirmationEmail } from '@/lib/email/services/booking-confirmation'

await sendBookingConfirmationEmail(event, recipientEmails, {
  startDate: formatDateForEmail(startDate),
  endDate: formatDateForEmail(endDate),
})
```

---

## Feature Flags

### Current Flags
```typescript
// lib/email/config.ts
export const ENABLE_MENTION_NOTIFICATION_EMAILS = false
```

### Usage Pattern
```typescript
// In server action
const { ENABLE_MENTION_NOTIFICATION_EMAILS } = await import('@/lib/email/config')
if (ENABLE_MENTION_NOTIFICATION_EMAILS) {
  await sendNotificationEmail(...)
} else {
  logger.info('Email notifications disabled')
}
```

---

## Observability

### Sentry Integration
- **Client**: Browser errors, session replay
- **Server**: Node.js errors, unhandled rejections
- **Edge**: Edge runtime errors
- **Server Actions**: Automatic capture via `onRequestError`

### Logger (`lib/logger.ts`)
```typescript
logger.debug('Detailed info')  // LOG_LEVEL=debug only
logger.info('General info')    // LOG_LEVEL=info+
logger.warn('Warning')         // Adds Sentry breadcrumb
logger.error('Error', error)   // Always logged + Sentry capture
```

### Activity Logging
```typescript
await logActivity({
  action: 'CREATE',
  entityType: 'Opportunity',
  entityId: id,
  entityName: name,
  details: {
    statusChange: { from: 'nueva', to: 'won' },
    changedFields: ['stage'],
  },
})
```

### Vercel Analytics
- Page views tracking
- Web Vitals (LCP, FID, CLS)
- Included in root layout: `<Analytics />`, `<SpeedInsights />`

---

## Critical Areas

### ⚠️ DANGER ZONES

1. **Token Generation (`lib/tokens/`)**
   - `TOKEN_SECRET_KEY` must match across environments
   - If changed: ALL email approval links break

2. **Public API Routes (`app/api/booking-requests/approve|reject`)**
   - NO authentication (tokens only)
   - Security relies entirely on token verification

3. **Middleware (`middleware.ts`)**
   - Public routes must be explicitly listed
   - Breaking this = email links redirect to sign-in

4. **Panama Timezone (`lib/date/timezone.ts`)**
   - ALL date operations MUST use Panama time
   - Using `new Date()` directly causes bugs
   - End dates must use `parseEndDateInPanamaTime()`

5. **Email Templates**
   - Changing prop interfaces breaks all emails
   - `approveUrl`, `rejectUrl` required for booking emails

### Status State Machines

**Opportunity Stages:**
```
iniciacion → reunion → propuesta_enviada → propuesta_aprobada → won
                                                              ↘ lost
```

**Deal Statuses:**
```
pendiente_por_asignar → asignado → elaboracion → imagenes → borrador_enviado → borrador_aprobado
```

**Booking Request Statuses:**
```
draft → pending → approved → booked
                ↘ rejected
                ↘ cancelled
```

---

## Common Pitfalls

### 1. Date Bugs
```typescript
// ❌ WRONG - UTC issues
const date = new Date(dateString)

// ✅ CORRECT - Panama timezone
import { parseDateInPanamaTime, parseEndDateInPanamaTime } from '@/lib/date/timezone'
const startDate = parseDateInPanamaTime(dateString)
const endDate = parseEndDateInPanamaTime(dateString)
```

### 2. Missing Cache Invalidation
```typescript
// ❌ WRONG - Data appears stale
await prisma.opportunity.update(...)

// ✅ CORRECT - Invalidate cache
await prisma.opportunity.update(...)
invalidateEntity('opportunities')
```

### 3. Role Check Missing
```typescript
// ❌ WRONG - No auth
export async function getData() {
  return await prisma.entity.findMany()
}

// ✅ CORRECT - Auth + role check
export async function getData() {
  const authResult = await requireAuth()
  if (!('userId' in authResult)) return authResult
  
  const role = await getUserRole()
  // Apply role-based filtering
}
```

### 4. Form Config Not Loading
```typescript
// ❌ WRONG - Direct fetch every time
const { sections } = await getFormConfiguration('opportunity')

// ✅ CORRECT - Use cache
const { sections } = useCachedFormConfig('opportunity')
```

### 5. Custom Fields Not Saved
```typescript
// ❌ WRONG - Only saves built-in fields
await createOpportunity(formData)

// ✅ CORRECT - Save custom fields separately
const result = await createOpportunity(formData)
if (result.success) {
  await dynamicForm.saveCustomFields(result.data.id)
}
```

---

## Best Practices

### 1. Server Actions
- Always use `requireAuth()` at the start
- Use `handleServerActionError()` for consistent error handling
- Call `invalidateEntity()` after mutations
- Log significant actions with `logActivity()`

### 2. Components
- Use `useTransition` for non-blocking UI
- Implement loading skeletons for modals
- Use `lazy()` + `Suspense` for heavy components
- Extend `ModalShell` for consistent modal styling

### 3. Forms
- Use `useDynamicForm` for entity forms
- Prefetch form configs on hover
- Always call `saveCustomFields()` after entity creation

### 4. Caching
- Use `unstable_cache` with appropriate tags
- Invalidate related entities (cascade)
- Client-side: Use contexts for shared data

### 5. Error Handling
- Use `logger.error()` to capture in Sentry
- Return `{ success: false, error: '...' }` from server actions
- Display user-friendly errors in UI
- Implement error boundaries (`error.tsx`)

### 6. Types
- Import from `@/types` barrel export
- Define constants in `@/lib/constants`
- Use Prisma-generated types for database entities

---

## Environment Variables

### Required
```env
DATABASE_URL=postgresql://...
TOKEN_SECRET_KEY=...           # MUST match across environments
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
RESEND_API_KEY=re_...
OPENAI_API_KEY=sk-...
```

### Optional
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
EMAIL_FROM=notifications@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
LOG_LEVEL=warn  # debug|info|warn|error
```

---

## Quick Reference

### Add a New Entity
1. Add model in `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Create types in `types/[entity].ts`
4. Add constants in `lib/constants/[entity]-statuses.ts`
5. Create server actions in `app/actions/[entity].ts`
6. Add cache config in `lib/cache/invalidation.ts`
7. Create components in `components/[entity]/`
8. Add page in `app/(app)/[entity]/`
9. Update form config if using dynamic forms

### Add a New Server Action
1. Create in `app/actions/[domain].ts`
2. Use `requireAuth()` or `requireAdmin()`
3. Implement role-based filtering
4. Handle errors with `handleServerActionError()`
5. Invalidate cache with `invalidateEntity()`
6. Log with `logActivity()`

### Debug Tips
- Set `LOG_LEVEL=debug` for verbose logs
- Check Sentry for error traces
- Use React DevTools for component state
- Check Network tab for slow requests
- Verify cache tags are invalidated correctly

---

## File Reference Quick Links

| Purpose | Location |
|---------|----------|
| Database Schema | `prisma/schema.prisma` |
| Environment Config | `lib/config/env.ts` |
| Auth Middleware | `middleware.ts` |
| User Roles | `lib/auth/roles.ts` |
| Server Action Helpers | `lib/utils/server-actions.ts` |
| Cache Invalidation | `lib/cache/invalidation.ts` |
| Logger | `lib/logger.ts` |
| Activity Logging | `lib/activity-log.ts` |
| Email Config | `lib/email/config.ts` |
| Timezone Utils | `lib/date/timezone.ts` |
| Type Definitions | `types/index.ts` |
| Constants | `lib/constants/index.ts` |
| Client Providers | `components/common/AppClientProviders.tsx` |
| Form Config Cache | `hooks/useFormConfigCache.tsx` |
| Dynamic Form Hook | `hooks/useDynamicForm.ts` |

---

## Tutorial for Non-Technical Users

This section is designed for team members who need to manage and maintain this application without deep programming knowledge.

### 📋 Table of Contents (Tutorial)
1. [Understanding the Basics](#understanding-the-basics)
2. [Setting Up Your Computer](#setting-up-your-computer)
3. [Daily Operations](#daily-operations)
4. [Making Changes Safely](#making-changes-safely)
5. [Common Tasks Step-by-Step](#common-tasks-step-by-step)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Emergency Procedures](#emergency-procedures)

---

### Understanding the Basics

#### What is this application?
This is a **booking and CRM system** for OfertaSimple. Think of it as a digital office that helps the team:
- Track potential clients (Leads → Businesses → Opportunities)
- Manage booking requests from merchants
- Schedule deals on a calendar
- Coordinate marketing campaigns

#### Key Terms Explained
| Term | What it means |
|------|---------------|
| **Repository (Repo)** | The folder containing all the code, like a digital filing cabinet |
| **Deploy** | Sending your changes to the live website |
| **Production (Prod)** | The live website that users see |
| **Local** | Your own computer where you test changes |
| **Terminal** | The black/white text window where you type commands |
| **Git** | The system that tracks all changes to the code |
| **Branch** | A copy of the code where you can make changes safely |

#### The Application Flow (Simplified)
```
📧 Lead comes in
    ↓
🏢 Create Business profile
    ↓
💼 Open an Opportunity (sales chance)
    ↓
📝 Send Booking Request to merchant
    ↓
📅 Merchant approves → Event on Calendar
    ↓
✅ Deal is created and processed
    ↓
📱 Marketing campaign launched
```

---

### Understanding the Code Structure

This section explains the main building blocks of the application in simple terms.

#### 📦 Main Data Types (What Data Looks Like)

The application uses specific "shapes" for data. Think of these as templates:

| Type | What it represents | Key information it holds |
|------|-------------------|-------------------------|
| **Lead** | A potential client | Name, contact info, status (new/assigned/converted) |
| **Business** | A company profile | Name, category, owner, contact details |
| **Opportunity** | A sales chance | Which business, stage (meeting/proposal/won), who's responsible |
| **BookingRequest** | A deal submission | Business info, dates, pricing, images, status |
| **Event** | Calendar entry | Name, start/end dates, which category |
| **Deal** | Active deal being processed | Linked booking request, responsible person, status |
| **MarketingCampaign** | Social media plan | Which booking, platforms (Instagram, TikTok) |
| **UserProfile** | System user | Email, role (admin/sales/editor) |
| **Category** | Business category | Parent category, subcategories |

#### 🗂️ Key Files and What They Do

**Configuration Files (Settings)**
| File | Purpose | When you'd touch it |
|------|---------|---------------------|
| `.env.local` | Secret keys and settings | Adding new API keys |
| `prisma/schema.prisma` | Database structure | Adding new data fields |
| `middleware.ts` | Security gate | Changing which pages need login |
| `lib/email/config.ts` | Email settings | Changing email behavior |

**Main Action Files (Where Work Happens)**
| File | What it does |
|------|-------------|
| `app/actions/businesses.ts` | Create, update, delete businesses |
| `app/actions/opportunities.ts` | Manage sales opportunities |
| `app/actions/booking-requests.ts` | Handle booking submissions |
| `app/actions/deals.ts` | Process deals after booking |
| `app/actions/events.ts` | Manage calendar events |
| `app/actions/marketing.ts` | Handle marketing campaigns |

**Page Files (What Users See)**
| Folder | What it shows |
|--------|--------------|
| `app/(app)/businesses/` | Business list and details |
| `app/(app)/opportunities/` | Opportunity pipeline |
| `app/(app)/booking-requests/` | Booking request management |
| `app/(app)/events/` | Calendar view |
| `app/(app)/deals/` | Deal processing |
| `app/(app)/marketing/` | Marketing campaigns |
| `app/(app)/dashboard/` | Overview and stats |

---

### How Key Functions Work

#### 🔐 Authentication (Who Can Access What)

**The Login Check (`requireAuth`)**
```
When someone tries to do something:
1. Check: Are they logged in? 
   → No: Return error "Not authenticated"
   → Yes: Continue...
2. Check: Is their email in the allowed list?
   → No: Redirect to "No Access" page
   → Yes: Let them proceed
```

**Location:** `lib/utils/server-actions.ts`

**Role-Based Access:**
```
Admin     → Can see and edit EVERYTHING
Sales     → Can only see their OWN businesses/opportunities
Editor    → Can only see deals ASSIGNED to them
Marketing → Can only see marketing campaigns
```

---

#### 📝 Creating a Booking Request (Step by Step)

**What happens when a user submits a booking form:**

```
1. User fills out the multi-step form
   ↓
2. Form data is validated (all required fields filled?)
   ↓
3. Images are compressed and uploaded to S3
   ↓
4. BookingRequest is saved to database
   ↓
5. Email is sent to merchant with APPROVE/REJECT buttons
   ↓
6. Token is generated for secure email links
   ↓
7. User sees confirmation message
```

**Key functions involved:**
| Function | File | What it does |
|----------|------|-------------|
| `createBookingRequest` | `app/actions/booking-requests.ts` | Saves to database |
| `sendBookingRequestEmail` | `lib/email/services/booking-request.ts` | Sends email |
| `generateToken` | `lib/tokens/generate.ts` | Creates secure link |
| `uploadToS3` | `lib/s3/upload.ts` | Stores images |

---

#### ✅ Approving/Rejecting a Booking (Email Links)

**What happens when merchant clicks APPROVE:**

```
1. Merchant clicks link in email
   ↓
2. System verifies the token is valid and not expired
   ↓
3. BookingRequest status changes: "pending" → "approved"
   ↓
4. Event is created on the calendar
   ↓
5. Confirmation email is sent
   ↓
6. Deal is automatically created
   ↓
7. Merchant sees "Thank you" page
```

**Key files:**
- `app/api/booking-requests/approve/route.ts` - Handles the approval
- `app/api/booking-requests/reject/route.ts` - Handles rejection
- `lib/tokens/verify.ts` - Checks if link is valid

**⚠️ Important:** These routes are PUBLIC (no login required) because merchants click them from email.

---

#### 📅 Calendar & Events

**How events appear on the calendar:**

```
1. getEvents() fetches all events from database
   ↓
2. Events are filtered by date range (visible month)
   ↓
3. Events are colored by category
   ↓
4. Duration is calculated based on category rules:
   - "Restaurantes" → 3 weeks
   - "Viajes" → 2 weeks
   - Default → 10 days
```

**Key function:** `getEvents` in `app/actions/events.ts`

---

#### 🔄 Cache System (Why Data Updates)

**Problem:** Database queries are slow if done repeatedly.
**Solution:** Store results temporarily (cache) and refresh when data changes.

```
1. First request → Query database → Store in cache
   ↓
2. Second request → Return from cache (fast!)
   ↓
3. Data changes → Clear cache → Next request gets fresh data
```

**How it works in practice:**
```typescript
// When you update a business:
await updateBusiness(id, data)     // 1. Update database
invalidateEntity('businesses')      // 2. Clear the cache
// Next time someone views businesses, they get fresh data
```

**Key file:** `lib/cache/invalidation.ts`

**Cache tags (what gets cleared):**
| When this changes... | These caches are cleared... |
|---------------------|---------------------------|
| Business | businesses, dashboard |
| Opportunity | opportunities, businesses, dashboard |
| Deal | deals, dashboard |
| Event | events, dashboard |

---

#### 📧 Email System

**How emails are sent:**

```
1. Action triggers email (e.g., booking approved)
   ↓
2. Email template is selected (HTML with variables)
   ↓
3. Variables are filled in (name, dates, links)
   ↓
4. Resend API sends the email
   ↓
5. Email appears in recipient's inbox
```

**Email templates available:**
| Template | When it's sent |
|----------|---------------|
| `booking-request.ts` | New booking sent to merchant |
| `booking-confirmation.ts` | After merchant approves |
| `rejection.ts` | After merchant rejects |
| `mention-notification.ts` | When someone is @mentioned |
| `task-reminder.ts` | Task is due soon |

**Configuration:**
```typescript
// lib/email/config.ts
EMAIL_CONFIG = {
  from: 'notifications@yourdomain.com',
  replyTo: 'support@yourdomain.com'
}
```

---

#### 🤖 AI Content Generation

**How AI creates marketing content:**

```
1. User clicks "Generate with AI" button
   ↓
2. System sends booking info to OpenAI
   ↓
3. OpenAI returns suggested caption/script
   ↓
4. User can edit or accept the content
   ↓
5. Content is saved to marketing campaign
```

**Key file:** `app/api/ai/generate/route.ts`

**What AI can generate:**
- Instagram captions
- TikTok video scripts
- Marketing copy
- Deal descriptions

---

#### 🔍 Search & Filters

**How search works:**

```
1. User types in search box
   ↓
2. After 300ms delay (debounce), search executes
   ↓
3. Query searches multiple fields:
   - Business name
   - Contact name
   - Email
   - etc.
   ↓
4. Results are filtered by user's role
   ↓
5. Paginated results are displayed
```

**Key pattern used:** "Debounced search" - waits for user to stop typing before searching.

---

### Important Patterns to Understand

#### Pattern 1: Server Actions

**What:** Functions that run on the server (secure, can access database).

**Structure:**
```
Every server action follows this pattern:

1. Check authentication (is user logged in?)
2. Check authorization (can user do this action?)
3. Validate input data
4. Perform database operation
5. Clear relevant caches
6. Log the activity
7. Return result (success or error)
```

**Example flow:**
```typescript
async function updateBusiness(id, data) {
  // 1. Auth check
  const auth = await requireAuth()
  if (!auth.userId) return { error: 'Not logged in' }
  
  // 2. Role check  
  const canEdit = await canUserEditBusiness(auth.userId, id)
  if (!canEdit) return { error: 'Not authorized' }
  
  // 3. Update database
  const result = await prisma.business.update(...)
  
  // 4. Clear cache
  invalidateEntity('businesses')
  
  // 5. Log activity
  await logActivity({ action: 'UPDATE', entityType: 'Business' })
  
  // 6. Return success
  return { success: true, data: result }
}
```

---

#### Pattern 2: Dynamic Forms

**What:** Forms that can be customized without code changes.

**How it works:**
```
1. Admin configures form fields in Settings
   ↓
2. Configuration is stored in database (FormSection, FormFieldConfig)
   ↓
3. When form loads, it reads configuration
   ↓
4. Form renders fields dynamically
   ↓
5. Custom field values are stored separately (CustomFieldValue)
```

**Example:** Adding a "Website URL" field to Businesses
1. Go to Settings → Form Configuration
2. Add new field "Website URL" to Business form
3. Field automatically appears in all Business forms
4. No code changes needed!

---

#### Pattern 3: Activity Logging

**What:** Recording who did what and when.

**Logged actions:**
- CREATE: New entity created
- UPDATE: Entity modified
- DELETE: Entity removed
- STATUS_CHANGE: Status changed (e.g., opportunity won)

**Where to see logs:** Activity Log page in the application.

**Key file:** `lib/activity-log.ts`

---

### Database Relationships Explained

**How data connects:**

```
Lead
  └── Can become a → Business
                        └── Has many → Opportunities
                                          └── Has one → Booking Request
                                                          ├── Has one → Event (calendar)
                                                          ├── Has one → Deal
                                                          └── Has one → Marketing Campaign
                                                                          └── Has many → Marketing Options
                                                                                          └── Has many → Comments
```

**In simple terms:**
- A **Lead** can be converted to a **Business**
- A **Business** can have multiple **Opportunities** (sales chances)
- When an **Opportunity** is won, a **Booking Request** is created
- An approved **Booking Request** creates:
  - An **Event** (appears on calendar)
  - A **Deal** (for processing)
  - A **Marketing Campaign** (for social media)

---

### User Roles Explained

#### Admin 👑
- **Can do:** Everything
- **Sees:** All data from all users
- **Special powers:** Manage users, configure forms, change settings

#### Sales 💼
- **Can do:** Create and manage their own businesses/opportunities
- **Sees:** Only their own data
- **Limitation:** Cannot see other salespeople's clients

#### Editor ✏️
- **Can do:** Process deals assigned to them
- **Sees:** Only deals they're responsible for
- **Limitation:** Cannot create new businesses or opportunities

#### ERE 📋
- **Same as Editor:** Different title, same permissions
- **Used for:** Specific editorial role in the company

#### Marketing 📱
- **Can do:** Manage marketing campaigns
- **Sees:** Marketing data for all deals
- **Limitation:** Cannot modify deals or bookings

---

### Status Lifecycles

#### Opportunity Status Journey
```
iniciacion (New) 
    ↓
reunion (Meeting scheduled)
    ↓
propuesta_enviada (Proposal sent)
    ↓
propuesta_aprobada (Proposal approved)
    ↓
┌─────────────────┐
│ won (Success!)  │ → Creates Booking Request
└─────────────────┘
        OR
┌─────────────────┐
│ lost (Didn't close) │
└─────────────────┘
```

#### Booking Request Status Journey
```
draft (Being created)
    ↓
pending (Sent to merchant, waiting)
    ↓
┌─────────────────────────┐
│ approved (Merchant said yes!) │ → Creates Event + Deal
└─────────────────────────┘
        OR
┌─────────────────┐
│ rejected (Merchant said no) │
└─────────────────┘
        OR
┌─────────────────┐
│ cancelled (We cancelled it) │
└─────────────────┘
```

#### Deal Status Journey
```
pendiente_por_asignar (Needs assignment)
    ↓
asignado (Assigned to editor)
    ↓
elaboracion (Being worked on)
    ↓
imagenes (Images being prepared)
    ↓
borrador_enviado (Draft sent for review)
    ↓
borrador_aprobado (Draft approved - DONE!)
```

---

### Setting Up Your Computer

#### Step 1: Install Required Software

**On Mac:**
1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Install Homebrew (copy and paste this entire command):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
3. Install Node.js:
```bash
brew install node@20
```
4. Install Git (usually pre-installed on Mac):
```bash
git --version
```

**On Windows:**
1. Download and install [Node.js](https://nodejs.org/) (LTS version)
2. Download and install [Git](https://git-scm.com/download/win)

#### Step 2: Clone the Repository

1. Open Terminal
2. Navigate to where you want to store the project:
```bash
cd ~/Documents
```
3. Clone (download) the project:
```bash
git clone <repository-url>
cd os_deals_booking.nosync
```

#### Step 3: Install Dependencies

```bash
npm install
```
This downloads all the libraries the project needs. It may take 2-5 minutes.

#### Step 4: Set Up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```
2. Ask your administrator for the actual values to put in `.env.local`

#### Step 5: Start the Application Locally

```bash
npm run dev
```
Then open your browser and go to: `http://localhost:3000`

**To stop the application:** Press `Ctrl + C` in the terminal

---

### Daily Operations

#### Starting Your Workday

1. **Open Terminal** and navigate to the project:
```bash
cd ~/Documents/os_deals_booking.nosync
```

2. **Get the latest changes** (very important!):
```bash
git pull origin main
```

3. **Install any new dependencies**:
```bash
npm install
```

4. **Start the local server**:
```bash
npm run dev
```

#### Checking the Production Site
- **Production URL**: https://[your-domain].vercel.app
- If the site is down, check the [Vercel Dashboard](https://vercel.com)

#### Viewing Errors
- **Sentry Dashboard**: Shows all errors happening in production
- Check daily to catch issues before users report them

---

### Making Changes Safely

#### The Golden Rule
**NEVER** make changes directly to the `main` branch. Always:
1. Create a new branch
2. Make your changes
3. Test locally
4. Create a Pull Request
5. Get approval
6. Merge to main

#### Step-by-Step: Making a Safe Change

**1. Create a new branch:**
```bash
git checkout -b fix/my-change-description
```
Name your branch descriptively, like:
- `fix/email-typo`
- `feature/new-button`
- `update/readme-docs`

**2. Make your changes** (edit files)

**3. Check what you changed:**
```bash
git status
```

**4. Save your changes:**
```bash
git add .
git commit -m "Brief description of what you changed"
```

**5. Push to GitHub:**
```bash
git push origin fix/my-change-description
```

**6. Create a Pull Request:**
- Go to GitHub repository page
- Click "Compare & pull request"
- Write a description of your changes
- Request a review from a team member

**7. After approval, merge:**
- Click "Merge pull request" on GitHub
- The changes will automatically deploy to production

#### If Something Goes Wrong
```bash
# Undo changes you haven't committed yet
git checkout .

# Go back to main branch
git checkout main

# Get the latest stable version
git pull origin main
```

---

### Common Tasks Step-by-Step

#### Task 1: Add a New Allowed User

Users must be in the allowlist to access the system.

**Option A: Via Database (Recommended)**
1. Go to your database management tool (like Prisma Studio or direct SQL)
2. Add a new row to the `AllowedEmail` table:
   - `email`: The user's email address
   - `createdAt`: Current date/time

**Option B: Via Code**
1. Open `lib/clerk-allowlist.ts`
2. Add the email to the list (if hardcoded)
3. Commit and deploy

#### Task 2: Update Text/Labels in the Application

1. Search for the text you want to change:
```bash
grep -r "text to find" --include="*.tsx" --include="*.ts"
```

2. Open the file and edit the text

3. Test locally: `npm run dev`

4. Commit and deploy (following safe change steps above)

#### Task 3: Check Why Something Isn't Working

**Step 1: Check the browser console**
- Right-click on the page → "Inspect" → "Console" tab
- Look for red error messages

**Step 2: Check server logs**
- In Vercel Dashboard → Your Project → "Logs"
- Look for errors around the time the issue happened

**Step 3: Check Sentry**
- Go to your Sentry dashboard
- Look for recent errors

#### Task 4: Update the Database Schema

⚠️ **WARNING: This requires technical knowledge. Ask for help if unsure.**

1. Edit `prisma/schema.prisma`
2. Generate migration:
```bash
npm run db:migrate
```
3. Test locally
4. Commit and deploy

#### Task 5: Clear the Cache

If data seems stale or outdated:

**For development:**
```bash
npm run dev
```
(Restart the dev server)

**For production:**
- Redeploy via Vercel, OR
- The cache auto-clears when data is updated

#### Task 6: Run Database Migrations After Pulling Changes

If someone else changed the database structure:
```bash
npm run db:push
```

---

### Troubleshooting Guide

#### Problem: "npm install" fails

**Solution 1:** Clear npm cache
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

**Solution 2:** Update Node.js
```bash
brew upgrade node  # Mac
# Or download latest from nodejs.org
```

#### Problem: "git pull" shows conflicts

**Solution:** If you didn't make important changes:
```bash
git checkout .
git pull origin main
```

If you have important changes, ask a developer for help with merging.

#### Problem: Application won't start locally

**Check 1:** Is something already running on port 3000?
```bash
lsof -i :3000
# If something shows up, kill it:
kill -9 <PID>
```

**Check 2:** Are environment variables set?
```bash
cat .env.local  # Should show values, not be empty
```

**Check 3:** Reinstall dependencies
```bash
rm -rf node_modules
npm install
```

#### Problem: Changes deployed but not visible

**Wait 2-3 minutes** - Vercel deployments take time.

**Hard refresh the browser:**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + R`

**Check Vercel dashboard** for deployment status.

#### Problem: Emails not sending

1. Check `EMAIL_CONFIG` in `lib/email/config.ts`
2. Verify `RESEND_API_KEY` is set in environment
3. Check Resend dashboard for email logs
4. Look for errors in Sentry

#### Problem: Login not working

1. Check if user's email is in `AllowedEmail` table
2. Verify Clerk configuration
3. Clear browser cookies and try again

---

### Emergency Procedures

#### 🚨 Site is Completely Down

1. **Check Vercel Status:** https://www.vercel-status.com/
2. **Check Recent Deployments:** Vercel Dashboard → Deployments
3. **Rollback to Previous Version:**
   - Go to Vercel Dashboard
   - Find last working deployment
   - Click "..." → "Promote to Production"

#### 🚨 Data is Missing or Corrupted

1. **DO NOT** make more changes
2. Contact your database administrator
3. Check if there's a recent backup

#### 🚨 Security Incident (Unauthorized Access)

1. **Rotate all API keys** immediately:
   - Clerk
   - Resend
   - OpenAI
   - Database password
2. Check activity logs for suspicious activity
3. Review `AllowedEmail` table for unauthorized entries

#### 🚨 Accidentally Deployed Bad Code

**Quick Rollback:**
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Deployments"
4. Find the last working deployment
5. Click "..." → "Promote to Production"

This instantly reverts the site to the previous version.

---

### Useful Commands Cheat Sheet

| What you want to do | Command |
|---------------------|---------|
| Start local server | `npm run dev` |
| Stop local server | `Ctrl + C` |
| Get latest code | `git pull origin main` |
| See what files changed | `git status` |
| Save your changes | `git add . && git commit -m "message"` |
| Upload your changes | `git push origin branch-name` |
| Switch to main branch | `git checkout main` |
| Create new branch | `git checkout -b branch-name` |
| Install dependencies | `npm install` |
| Run database migrations | `npm run db:push` |
| Check for code errors | `npm run lint` |
| Build for production | `npm run build` |

---

### Getting Help

#### Documentation
- This guide: `docs/COMPREHENSIVE_GUIDE.md`
- Vercel: https://vercel.com/docs
- Clerk: https://clerk.com/docs

#### When to Ask for Help
- Database schema changes
- Security-related changes
- Complex feature requests
- Anything involving API keys or secrets

#### How to Report Issues
Include:
1. What were you trying to do?
2. What happened instead?
3. Screenshots of error messages
4. Browser console errors (if applicable)
5. Time when the issue occurred

---

### Maintenance Schedule

#### Daily
- [ ] Check Sentry for new errors
- [ ] Review any pending Pull Requests

#### Weekly
- [ ] Review activity logs for unusual behavior
- [ ] Check Vercel analytics for performance issues
- [ ] Verify email delivery rates in Resend

#### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review and rotate API keys if needed
- [ ] Check database storage usage
- [ ] Review user access list

---

*Last updated: January 2026*
