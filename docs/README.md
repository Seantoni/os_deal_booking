# OS Deals Booking

Internal CRM and booking management system for OfertaSimple.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Email**: Resend
- **AI**: OpenAI (for deal draft generation)
- **Styling**: Tailwind CSS
- **Icons**: Material UI Icons

## Project Structure

```
app/
├── (app)/              # Authenticated routes (with sidebar)
│   ├── businesses/     # Business management
│   ├── opportunities/  # Opportunity pipeline
│   ├── deals/          # Deal management
│   ├── leads/          # Lead tracking
│   ├── booking-requests/  # Booking request management
│   ├── events/         # Calendar & events
│   ├── reservations/   # Reservation management
│   ├── pipeline/       # Kanban pipeline view
│   ├── dashboard/      # Analytics dashboard
│   └── settings/       # App settings & form builder
├── api/                # API routes
├── booking-requests/   # Public booking request pages (no auth)
│   ├── approved/
│   ├── rejected/
│   └── error/
└── public/             # Public booking form

components/
├── booking/            # Booking-related components
├── calendar/           # Calendar view components
├── common/             # Shared UI components
├── crm/                # CRM entity modals & forms
│   ├── business/
│   ├── opportunity/
│   ├── deal/
│   └── lead/
├── events/             # Event management
├── filters/            # Advanced filtering
├── RequestForm/        # Multi-step booking form
├── shared/             # Shared components (tables, inputs)
└── ui/                 # Base UI components (Button, Input, etc.)

hooks/
├── useCommandPalette.ts   # Global search (Cmd+K)
├── useConfirmDialog.ts    # Confirmation dialogs
├── useDynamicForm.ts      # Dynamic form configuration
├── useEntityPage.ts       # Entity list page logic
├── useFormConfiguration.ts # Form builder integration
├── useSharedData.tsx      # Shared data context
└── useUserRole.ts         # User role management

lib/
├── auth/               # Authentication utilities
├── cache/              # Caching utilities
├── config/             # Environment configuration
├── constants/          # App constants
├── email/              # Email templates & services
├── filters/            # Filter utilities
└── tokens/             # Token generation/verification
```

## Key Features

### CRM System
- **Businesses**: Company profiles with extended fields
- **Opportunities**: Sales pipeline with stage tracking
- **Deals**: Closed deals with AI-generated drafts
- **Leads**: Lead capture and conversion

### Booking System
- Multi-step booking request form
- Email approval/rejection workflow
- Calendar view with drag-and-drop
- Public booking links

### Dynamic Form Builder
- Configure form sections and fields per entity
- Add custom fields via Settings
- Control field visibility, required status, width

### Access Control
- Role-based access (Admin, Sales, Editor, ERE)
- Email allowlist for sign-ups
- Audit logging

## Environment Variables

```env
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
TOKEN_SECRET_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
EMAIL_FROM=
OPENAI_API_KEY=  # Optional
```

## Development

```bash
npm install
npm run dev
```

## Database

```bash
npx prisma generate   # Generate client
npx prisma db push    # Push schema changes
npx prisma studio     # Open database UI
```
