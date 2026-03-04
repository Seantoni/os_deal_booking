# Server Actions Map

Purpose: maintain a single reference for `app/actions/**` modules, key exports, and operational side effects.

## Update Trigger

Update this file whenever:
- A new file is added under `app/actions/**`
- An exported action signature changes
- Side effects change (email, cache invalidation, logs, external API calls)

## Current Action Modules

### Root modules (`app/actions/*.ts`)

- `access-control.ts`
- `activity-log.ts`
- `assignments.ts`
- `bank-promos.ts`
- `booking-requests.ts`
- `business-bulk.ts`
- `campaigns.ts`
- `categories.ts`
- `comments.ts`
- `competitor-deals.ts`
- `cron-logs.ts`
- `crm.ts`
- `custom-fields.ts`
- `dashboard.ts`
- `deal-metrics.ts`
- `deals.ts`
- `event-leads.ts`
- `events.ts`
- `field-comments.ts`
- `filters.ts`
- `form-config.ts`
- `inbox.ts`
- `leads.ts`
- `marketing-comments.ts`
- `marketing.ts`
- `openai.ts`
- `opportunities.ts`
- `opportunity-comments.ts`
- `pipeline.ts`
- `public-request-links.ts`
- `restaurant-leads.ts`
- `revenue-projections.ts`
- `sales-users.ts`
- `search.ts`
- `tasks.ts`
- `users.ts`

### Nested modules

- `booking/index.ts`
- `businesses/index.ts`
- `businesses/list.ts`
- `businesses/detail.ts`
- `businesses/mutations.ts`
- `businesses/archive.ts`
- `businesses/counts.ts`
- `businesses/vendor-sync.ts`
- `settings/index.ts`

## High-Impact Action Domains

- `opportunity-comments.ts`
  - Thread lifecycle (`OPEN` -> `RESOLVED`), marker updates (`__thread_resolved__`), AI one-liner generation fallback, mention email notifications.
- `booking-requests.ts`
  - Booking workflow and external effects tied to approvals/rejections and follow-up operations.
- `businesses/vendor-sync.ts`
  - Vendor sync path associated with external Oferta integration behavior.
- `events.ts`
  - Calendar/event operations with booking-related coupling.
- `marketing-comments.ts` and `comments.ts`
  - Inbox visibility and mention-oriented comment surfaces.

## Side-Effect Checklist (Per File)

When documenting or changing an action module, capture:
- Exported actions (name + input + return shape)
- Authorization gate (`auth`, role checks, ownership checks)
- Database writes (models touched)
- Cache behavior (`revalidatePath`, tag invalidation)
- Async effects (emails, external APIs, webhooks)
- Logging/observability (`logger`, activity logs)
- Rate limiting (if present)

## Quick Regeneration Commands

```bash
# List action files
rg --files app/actions | sort

# List exported server actions by file
rg -n "^export async function" app/actions
```

## Related Docs

- [API Endpoints](./API_ENDPOINTS.md)
- [Comment Threads and Resolution](./COMMENT_THREADS_AND_RESOLUTION.md)
- [External Oferta Integration](./EXTERNAL_OFERTA_INTEGRATION.md)
