# Calendar Clone

A Google Calendar clone built with modern web technologies.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS 4
- **Authentication:** Clerk
- **Database:** Neon (Serverless PostgreSQL)
- **ORM:** Prisma
- **Hosting:** Vercel

## Getting Started

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Neon Database URL
DATABASE_URL="your_neon_database_connection_string"

# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key

# Clerk URLs (optional)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Event Model

The initial Event model includes:

- `id` - Unique identifier
- `name` - Event name
- `description` - Optional event description
- `startDate` - Event start date and time
- `endDate` - Event end date and time
- `userId` - ID of the user who created the event
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Project Structure

```
os_deals_booking/
├── app/
│   ├── layout.tsx          # Root layout with ClerkProvider
│   ├── page.tsx            # Test dashboard page
│   └── globals.css         # Global styles
├── lib/
│   └── prisma.ts           # Prisma client instance
├── prisma/
│   └── schema.prisma       # Database schema
├── middleware.ts           # Clerk authentication middleware
└── package.json
```

## Testing Connections

The test dashboard at `/` shows:

- **Clerk Authentication Status** - Verifies Clerk is properly configured
- **Database Connection Status** - Tests connection to Neon PostgreSQL
- **User Information** - Displays current authenticated user details

Both indicators should show "Connected" when everything is set up correctly.

## Next Steps

1. Verify all connections on the test dashboard
2. Create calendar UI components
3. Implement event creation functionality
4. Add event listing and management features
5. Build calendar view

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
