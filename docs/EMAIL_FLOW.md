# Email Flow Reference

Who gets each email and when.

---

## Booking Request & Confirmation

**Request sent** — `sendBookingRequest` → `renderBookingRequestEmail`
> **To:** business (primary + additional emails)
> Separate copy to requester (no action buttons)

**Request resent** — `resendBookingRequest` → `renderBookingRequestEmail`
> **To:** selected business email
> Copy to requester if available (no buttons)

**Booking confirmed** — `bookEvent` → `sendBookingConfirmationEmail`
> **To:** business
> **CC:** creator + booking operator (deduped, excluding business)

**Booking rejected (public)** — `rejectBookingRequestWithReason` → `sendRejectionEmail`
> **To:** business
> **CC:** request creator

**Booking rejected (internal)** — `rejectEvent` → `sendRejectionEmail`
> **To:** business
> **CC:** request creator

**Admin direct approval** — `adminApproveBookingRequest` → `renderAdminApprovalEmail`
> Email 1 → business
> Email 2 → creator (if different from business)
> Email 3 → booking operator (admin who approved)

**Public link invitation** — `generateAndSendPublicLink` → `renderPublicLinkEmail`
> **To:** provided recipients (deduped)
> **CC:** link creator

---

## Deals

**Deal ready to assign** — `createDeal` (no responsible) or `bookEvent` (auto-created deal) → `sendDealAssignmentReadyEmail`
> **To:** all active `editor_senior`

**Deal assigned to editor** — `updateDealResponsible` (responsible changed) → `sendDealEditorAssignedEmail`
> **To:** assigned editor

---

## Comments & Mentions

**Marketing comment mention** — mention helper → `sendMentionNotificationEmail`
> **To:** each mentioned user (author skipped)

**Opportunity comment mention** — mention helper → `sendOpportunityMentionNotificationEmail`
> **To:** each mentioned user (author skipped)

---

## Cron (Scheduled)

**Task reminders** — `/api/cron/task-reminders` → `sendAllTaskReminders`
> **To:** responsible user for tasks due today / overdue

**Sales meeting reminders** — `/api/cron/sales-meeting-reminders` → `sendSalesMeetingReminders`
> **To:** active sales users with 0 meetings today

**Daily comment summaries** — `/api/cron/daily-comment-summaries` → `sendDailyCommentsSummary`
> **To:** active users with inbox comment items

**Weekly task report** — `/api/cron/weekly-task-report` → `sendWeeklyTaskPerformanceReport`
> **To:** active admins

---

## Alerts

**Cron failure** — any cron using `sendCronFailureEmail` on failure
> **To:** `jose.paez@ofertasimple.com`

**External API failure** — `logApiCall` on failed external API response → `sendApiFailureEmail`
> **To:** `jose.paez@ofertasimple.com`

Cron routes that can trigger failure alerts:
`event-leads-sync` · `deal-metrics-sync` · `market-intelligence-scan` · `task-reminders` · `bank-promos-sync` · `sales-meeting-reminders` · `restaurant-leads-sync` · `weekly-task-report` · `daily-comment-summaries`

---

## Other

**Test endpoint** — `POST /api/email/test` (admin-only). Sends a selected template to a given address.

**Unused template** — `lib/email/templates/cancelled.ts` exists in preview tooling only; no production send path.
