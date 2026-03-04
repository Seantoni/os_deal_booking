# Comment Threads and Resolution

Purpose: explain opportunity comment thread lifecycle, resolution markers, AI one-liner generation, and notification behavior.

## Source of Truth

- `app/actions/opportunity-comments.ts`
- `app/actions/comments.ts`
- `lib/comments/thread-resolution.ts`
- `lib/ai/thread-resolution.ts`
- `app/api/ai/generate-thread-resolution/route.ts`
- `components/crm/opportunity/OpportunityChatThread.tsx`

## Thread Lifecycle

Status model:
- `OPEN`
- `RESOLVED`

Lifecycle behavior in `opportunity-comments.ts`:
- Legacy comments with `threadId = null` are normalized into thread structures.
- Only one open thread is allowed per opportunity at a time.
- Resolving a thread marks it resolved and creates the next open thread slot.

## Resolution Path

Primary action:
- `resolveOpportunityCommentThread(threadId)`

Resolution steps:
- Validates access and open status.
- Collects thread comments and generates one-line resolution text.
- Uses AI helper (`generateThreadResolutionOneLiner`) with deterministic fallback.
- Updates thread fields: `resolutionNote`, `resolvedBy`, `resolvedAt`, `status`.
- Applies dismissal marker to thread comments for inbox behavior.

## Marker-Based State

From `lib/comments/thread-resolution.ts`:
- `PENDING_COMMENT_CLOSED_MARKER = "__pending_comment_closed__"`
- `THREAD_RESOLVED_MARKER = "__thread_resolved__"`

`dismissedBy` arrays use these markers to represent system-driven dismissal states.

## AI One-Liner Generation

`lib/ai/thread-resolution.ts`:
- Uses `gpt-4.1`, low temperature (`0.2`), short output constraints.
- Enforces response format `"Decisión: ..."`.
- Falls back to deterministic summary when AI call fails or returns empty.

`POST /api/ai/generate-thread-resolution`:
- Authenticated and rate-limited.
- Validates title/comment count/length constraints.
- Returns `{ resolution, usedFallback }`.

## Mentions and Notifications

- Thread comments accept `mentions` user IDs.
- Mention emails are sent asynchronously for opportunity comments.
- Self-mentions are skipped during notification send loop.

## Update Trigger

Update this doc when changing:
- Opportunity comment actions/components
- Thread resolution markers or inbox dismissal logic
- AI resolution generation endpoint/prompt constraints
- Mention notification behavior

## Related Docs

- [API Endpoints](./API_ENDPOINTS.md)
- [Server Actions Map](./SERVER_ACTIONS_MAP.md)
