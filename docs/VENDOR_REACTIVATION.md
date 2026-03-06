# Vendor Reactivation

## Overview

Vendor reactivation is a flow that lets OfertaSimple re-contact businesses with previously successful historical deals and invite them to replicate those deals again.

The implementation has four main parts:

1. A historical deals pool managed by admins
2. Eligibility and cooldown logic
3. Vendor email delivery plus public replicate links
4. Internal booking request creation and review

This document describes the current implementation in detail.

## Main User Flow

1. Admin marks one or more historical deals as part of the reactivation pool.
2. The system checks which businesses are eligible to be contacted again.
3. A reactivation email is sent to the business contact email with:
   - `Ver deal`
   - `Replicar`
4. If the vendor clicks `Replicar`, a pending booking request is created immediately.
5. The request is labeled as `vendor_reactivation` and appears in `Solicitudes > Reactivaciones`.
6. Sales/admin review it using the existing booking request workflow.

## Main Routes

### Admin

- Reactivation page:
  [app/(app)/reactivaciones/page.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/reactivaciones/page.tsx)
- Reactivation page client:
  [app/(app)/reactivaciones/VendorReactivationPageClient.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/reactivaciones/VendorReactivationPageClient.tsx)
- Settings page:
  [app/(app)/settings/SettingsPageClient.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/settings/SettingsPageClient.tsx)
- Reactivation settings tab:
  [app/(app)/settings/components/VendorReactivationTab.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/settings/components/VendorReactivationTab.tsx)

### Public

- Replicate endpoint:
  [app/api/vendor-reactivation/replicate/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/vendor-reactivation/replicate/route.ts)
- Public success page:
  [app/(public)/vendor-reactivation/success/page.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(public)/vendor-reactivation/success/page.tsx)

### Cron

- Reactivation cron:
  [app/api/cron/vendor-reactivation-scan/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/cron/vendor-reactivation-scan/route.ts)
- Deployment schedule:
  [vercel.json](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/vercel.json)

## Data Model

### DealMetrics

Historical external deals are stored in `DealMetrics`.

Relevant fields:

- `externalDealId`
- `externalVendorId`
- `businessId`
- `dealName`
- `previewUrl`
- `dealUrl`
- `runAt`
- `endAt`
- `quantitySold`
- `netRevenue`
- `margin`
- `vendorReactivateEligible`
- `vendorReactivateEligibleAt`
- `vendorReactivateEligibleBy`

Schema:
[prisma/schema.prisma](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/prisma/schema.prisma)

This is the source of truth for the reactivation pool.

### BookingRequest

Vendor reactivation creates normal booking requests with extra origin fields.

Relevant fields:

- `sourceType = 'vendor_reactivation'`
- `businessId`
- `originExternalDealId`
- `originExternalDealName`

Type:
[types/booking-request.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/types/booking-request.ts)

### VendorReactivationState

This table stores the most recent time a reactivation email was sent for a business.

Relevant field:

- `lastTriggerEmailSentAt`

Purpose:

- prevent repeated sends inside the cooldown window
- let the system compare `last approved request` vs `last reactivation email sent`

### Settings

The reactivation flow currently uses one dedicated setting:

- `vendorReactivationCooldownDays`

This value controls how many days must pass before a business becomes eligible again.

Relevant files:

- [types/settings.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/types/settings.ts)
- [lib/settings.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/settings.ts)
- [app/actions/settings.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/actions/settings.ts)

## Admin Reactivation Page

The admin management list is implemented in:
[app/(app)/reactivaciones/VendorReactivationPageClient.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/reactivaciones/VendorReactivationPageClient.tsx)

Important detail:

- this page is a management list of historical deals
- it is not only the “ready to email now” list

The page is backed by:
[app/actions/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/actions/vendor-reactivation.ts)

Current filters:

- search
- pool filter: `Todos`, `En Pool`, `Fuera`
- status filter: `Todos`, `Activos`, `Finalizados`

Displayed data includes:

- deal identifier and name
- business
- sold quantity
- net revenue
- margin
- days since last approved request
- projection
- run date
- end date
- pool toggle
- actions

Current actions:

- toggle pool membership
- open preview URL
- `Enviar ahora`

### `Enviar ahora`

This action manually sends the vendor reactivation email immediately for the selected business.

Behavior:

1. Resolve the business
2. Collect all `DealMetrics` rows for that business or fallback vendor mapping where:
   - `vendorReactivateEligible = true`
3. Deduplicate by `externalDealId`
4. If none exist, return:
   - `No hay deals en pool`
5. Send one grouped vendor email with all pooled deals
6. Update `lastTriggerEmailSentAt`

The server action is:
[app/actions/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/actions/vendor-reactivation.ts)

## Business Resolution

The system links a historical deal to a business using this order:

1. direct `dealMetrics.business`
2. fallback mapping:
   - `business.osAdminVendorId = dealMetrics.externalVendorId`

This logic exists both in the admin page list and the automatic targeting logic.

## Last Approved Date Logic

There is no dedicated stored `lastApprovedAt` field on the business.

Instead, it is computed on demand in:
[lib/business/approved-request-aging.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/business/approved-request-aging.ts)

This helper scans approved booking requests and links them to businesses using:

1. direct `bookingRequest.businessId`
2. `opportunityId -> opportunity.businessId`
3. `event.bookingRequestId -> event.businessId`
4. merchant name match
5. business email match

It returns, per business:

- `lastApprovedAt`
- `daysSinceLastApproved`
- `hasApprovedRequest`

The React hook wrapper is:
[hooks/useBusinessApprovedRequestAging.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/hooks/useBusinessApprovedRequestAging.ts)

## Cooldown Logic

The eligibility logic for automatic sends is in:
[lib/vendor-reactivation/service.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/vendor-reactivation/service.ts)

The system computes:

- `lastApprovedAt`
- `lastTriggerEmailSentAt`

Then it builds:

- `referenceDate = max(lastApprovedAt, lastTriggerEmailSentAt)`

Then it checks:

- send if `daysSince(referenceDate) >= vendorReactivationCooldownDays`
- or send if both values are missing

This means:

- a business in the pool does not automatically get emailed immediately
- it becomes eligible for the next cron run only if the cooldown rule passes

Examples:

- business in pool, no approved request, no prior trigger email:
  eligible
- business in pool, approved request 90 days ago, no trigger email:
  eligible if cooldown is less than or equal to 90
- business in pool, approved request 90 days ago, trigger email 5 days ago:
  not eligible

## Automatic Daily Cron

The cron route is:
[app/api/cron/vendor-reactivation-scan/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/cron/vendor-reactivation-scan/route.ts)

The deployment schedule is in:
[vercel.json](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/vercel.json)

Current schedule:

- every day at `15:00 UTC`
- equivalent to `10:00 AM Panama`

What the cron does:

1. verify cron secret
2. load eligible targets from `getVendorReactivationTargets`
3. for each target:
   - send the grouped reactivation email
   - update `lastTriggerEmailSentAt`
4. log results in cron logs

### Important

The route existing does not schedule itself.

The actual daily execution happens because it is listed in `vercel.json`.

## Cron Authentication

The reactivation cron currently uses:

1. `CRON_SECRET_REACTIVATION` if present
2. otherwise fallback to `CRON_SECRET`

The shared helper is:
[lib/cron/verify-secret.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/cron/verify-secret.ts)

The reactivation route uses:

- `verifyCronSecretWithFallback(request, 'CRON_SECRET_REACTIVATION')`

## Vendor Email

### Service

[lib/email/services/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/email/services/vendor-reactivation.ts)

### Template

[lib/email/templates/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/email/templates/vendor-reactivation.ts)

Each email contains a list of pooled historical deals for that business.

Per deal:

- `Ver deal`
- `Replicar`

The `Ver deal` link uses the preview URL when available.

The `Replicar` link points to:

- `/api/vendor-reactivation/replicate?token=...`

### Settings Preview

This template is available in:

- `Settings > Email Templates`

Relevant files:

- [app/(app)/settings/components/EmailPreviewTab.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/settings/components/EmailPreviewTab.tsx)
- [app/api/email/preview/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/email/preview/route.ts)
- [app/api/email/test/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/email/test/route.ts)

## Public Replicate Flow

### Token

The public replicate link uses a signed token generated by:
[lib/tokens/index.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/tokens/index.ts)

Relevant helpers:

- `generateVendorReactivationToken`
- `verifyVendorReactivationToken`

### Endpoint

The endpoint is:
[app/api/vendor-reactivation/replicate/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/vendor-reactivation/replicate/route.ts)

Flow:

1. rate-limit the public request
2. verify the token
3. create a vendor reactivation booking request
4. notify internal owner or admins
5. redirect to public success page

### Success Page

[app/(public)/vendor-reactivation/success/page.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(public)/vendor-reactivation/success/page.tsx)

Two variants:

- normal success
- duplicate request already exists

## Booking Request Creation

Creation logic is in:
[lib/vendor-reactivation/service.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/vendor-reactivation/service.ts)

When a vendor clicks `Replicar`:

1. resolve business
2. block duplicates where there is already an open request for:
   - same `businessId`
   - same `originExternalDealId`
   - `sourceType = 'vendor_reactivation'`
   - status in `draft`, `pending`, `approved`
3. assign request owner
   - business owner if present
   - otherwise first admin as fallback
4. fetch external deal data from Oferta
5. map external deal into booking request data
6. create a pending booking request
7. create a linked pending event
8. write activity log
9. invalidate caches

### Duplicate Rule

The business can only have one open reactivation request for the same historical deal at a time.

If the vendor clicks the link again while that open request exists:

- no second request is created
- the public success page shows the duplicate variant

## Internal Review UI

Vendor reactivation requests are normal booking requests with a special source type.

The requests UI adds tabs:

- `Interno`
- `Reactivaciones`

Relevant file:
[components/booking/BookingRequestsClient.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/components/booking/BookingRequestsClient.tsx)

Other UI surfaces also display `Reactivación` badges, including:

- booking request modal
- pending requests sidebar
- mobile cards
- event modal
- calendar

## Manual vs Automatic Sends

### Automatic

Runs daily at 10:00 AM Panama through Vercel cron.

Uses:

- pool membership
- contact email
- business resolution
- cooldown rules

### Manual

`Enviar ahora` on the admin page:

- ignores the cooldown filter
- still requires pooled deals
- still requires contact email
- updates `lastTriggerEmailSentAt`

So after a manual send, the business is blocked again until cooldown expires.

## Migrations

Main vendor reactivation migration:
[prisma/migrations/20260306170000_add_vendor_reactivation/migration.sql](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/prisma/migrations/20260306170000_add_vendor_reactivation/migration.sql)

Reactivation settings migration:
[prisma/migrations/20260306213000_add_vendor_reactivation_settings/migration.sql](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/prisma/migrations/20260306213000_add_vendor_reactivation_settings/migration.sql)

Important note:

`BookingRequest` is stored in the `"BookingRequest"` table, not `"booking_requests"`.

That matters for manual SQL changes and migrations.

## Testing Checklist

### Basic Setup

1. Apply migrations
2. Ensure a business has `contactEmail`
3. Ensure at least one historical `DealMetrics` row exists
4. Ensure the business can be resolved from that deal
5. Mark at least one deal as `En Pool`

### Settings

1. Open `Settings > Reactivaciones`
2. Change cooldown days
3. Save
4. Refresh and verify persistence

### Email Templates

1. Open `Settings > Email Templates`
2. Select `Reactivación Vendor`
3. Confirm preview renders
4. Send test email

### Admin Page

1. Open `/reactivaciones`
2. Toggle a deal into the pool
3. Confirm state persists
4. Confirm preview action opens preview URL

### Manual Send

1. Click `Enviar ahora`
2. Confirm email arrives
3. Confirm `lastTriggerEmailSentAt` updates
4. Remove all pooled deals and try again
5. Confirm toast:
   - `No hay deals en pool`

### Automatic Cron

1. Trigger `/api/cron/vendor-reactivation-scan` manually or wait for scheduled run
2. Confirm only eligible businesses are emailed
3. Confirm businesses inside cooldown are skipped

### Replicate Flow

1. Open received email
2. Click `Replicar`
3. Confirm success page loads
4. Confirm a pending request is created
5. Confirm request appears under `Solicitudes > Reactivaciones`

### Duplicate Flow

1. Click the same replicate link again
2. Confirm no second open request is created
3. Confirm duplicate success page variant appears

## Operational Notes

If settings fail to save with a message like:

- `The column vendorReactivationCooldownDays does not exist in the current database`

then the DB migration for settings has not been applied yet.

If reactivation emails are not sending automatically:

1. confirm the cron exists in `vercel.json`
2. confirm `CRON_SECRET_REACTIVATION` or `CRON_SECRET` is configured
3. confirm businesses have `contactEmail`
4. confirm deals are actually in pool
5. confirm cooldown is not blocking them

## Relevant Files Summary

- [app/(app)/reactivaciones/VendorReactivationPageClient.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/reactivaciones/VendorReactivationPageClient.tsx)
- [app/actions/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/actions/vendor-reactivation.ts)
- [lib/vendor-reactivation/service.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/vendor-reactivation/service.ts)
- [lib/business/approved-request-aging.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/business/approved-request-aging.ts)
- [app/api/cron/vendor-reactivation-scan/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/cron/vendor-reactivation-scan/route.ts)
- [app/api/vendor-reactivation/replicate/route.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/api/vendor-reactivation/replicate/route.ts)
- [lib/email/services/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/email/services/vendor-reactivation.ts)
- [lib/email/templates/vendor-reactivation.ts](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/lib/email/templates/vendor-reactivation.ts)
- [app/(app)/settings/components/VendorReactivationTab.tsx](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/app/(app)/settings/components/VendorReactivationTab.tsx)
- [vercel.json](/Users/josep/Documents/Dev%202025/os_deals_booking.nosync/vercel.json)
