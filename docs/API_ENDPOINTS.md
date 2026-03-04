# API Endpoints

Purpose: document the API surface in `app/api/**/route.ts` with ownership, auth model, and behavior.

## Update Trigger

Update this file on any addition/removal/change under `app/api/**/route.ts`.

## Current Endpoints by Domain

### AI

- `/api/ai/classify-activity`
- `/api/ai/extract-meeting-fields`
- `/api/ai/extract-task-fields`
- `/api/ai/generate-booking-content`
- `/api/ai/generate-marketing-copy`
- `/api/ai/generate-offer-title`
- `/api/ai/generate-thread-resolution`
- `/api/ai/generate-video-script`
- `/api/ai/improve-business-review`
- `/api/ai/proofread-meeting-details`
- `/api/ai/proofread-task-notes`
- `/api/ai/review-contract`

### Cron/Internal jobs

- `/api/cron/bank-promos-sync`
- `/api/cron/daily-comment-summaries`
- `/api/cron/deal-metrics-sync`
- `/api/cron/event-leads-sync`
- `/api/cron/market-intelligence-scan`
- `/api/cron/restaurant-leads-sync`
- `/api/cron/sales-meeting-reminders`
- `/api/cron/task-reminders`
- `/api/cron/weekly-task-report`

### Integrations and domain APIs

- `/api/external-oferta/logs`
- `/api/external-oferta/resend`
- `/api/bank-promos/scan`
- `/api/event-leads/scan`
- `/api/restaurant-leads/scan`
- `/api/deal-metrics/sync`
- `/api/categories/sync`
- `/api/prov-dist-corr`
- `/api/upload/image`

### System, auth, and health

- `/api/access/check`
- `/api/booking-requests/approve`
- `/api/booking-requests/reject`
- `/api/email/preview`
- `/api/email/test`
- `/api/health/config`
- `/api/health/database`
- `/api/health/resend`
- `/api/presence`
- `/api/settings`
- `/api/settings/reset`
- `/api/user/role`
- `/api/webhooks/clerk`

## Endpoint Documentation Template

Use this table for each endpoint as it evolves:

| Endpoint | Methods | Auth model | Request shape | Response shape | Failure behavior | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/presence` | `GET`, `POST` | Clerk authenticated user | `POST { path?: string }` | online users list / success flag | `401`, `500` | Frontend + Platform |

## Known Concrete Behavior

- `/api/presence`
  - `GET`: returns online users from `userProfile.lastSeenAt` window.
  - `POST`: updates current user's `lastSeenAt` and optional `activePath`.
- `/api/external-oferta/logs`
  - `GET`: admin-only paginated request logs + summary stats.
- `/api/external-oferta/resend`
  - `POST`: admin-only repost for known external Oferta `POST` logs with rate limit.

## Quick Inventory Command

```bash
rg --files app/api | rg '/route\.ts$' | sed 's#app/api##' | sed 's#/route.ts##' | sort
```

## Related Docs

- [Realtime Presence](./REALTIME_PRESENCE.md)
- [External Oferta Integration](./EXTERNAL_OFERTA_INTEGRATION.md)
- [Prisma Changelog](./PRISMA_CHANGELOG.md)
