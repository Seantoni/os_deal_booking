# External Oferta Integration

Purpose: document external Oferta deal/vendor integration, logging, and resend semantics.

## Source of Truth

- API routes:
  - `app/api/external-oferta/resend/route.ts`
  - `app/api/external-oferta/logs/route.ts`
- Integration library:
  - `lib/api/external-oferta/index.ts`
  - `lib/api/external-oferta/vendor/*`
  - `lib/api/external-oferta/shared/*`

## Architecture Overview

`lib/api/external-oferta/` is organized by domain:
- `shared/`: constants, logging, shared helpers
- `deal/`: deal mapping + client
- `vendor/`: vendor mapping + client

Requests are logged to `ExternalApiRequest` with payload and result metadata for observability and replay.

## Endpoints

### `GET /api/external-oferta/logs`

- Access: admin-only (`requireAdmin`).
- Behavior:
  - Supports pagination (`page`, `limit`).
  - Filters: `bookingRequestId`, `successOnly`, `failedOnly`.
  - Returns paginated logs + aggregated stats.

### `POST /api/external-oferta/resend`

- Access: admin-only (`requireAdmin`).
- Rate limit: strict per-user limiter for external API actions.
- Input: `{ logId: string }`.
- Guardrails:
  - log must exist
  - only `POST` logs can be reposted
  - endpoint must match known deal/vendor endpoints
- Trigger metadata includes `triggeredBy: 'repost'` and source log linkage.

## Mapping and Trigger Semantics

- Deal payloads: booking request domain mapped to external deal schema.
- Vendor payloads: business domain mapped to external vendor schema.
- Trigger mode examples:
  - `manual`
  - `repost`

## Observability Checklist

When touching this integration, confirm:
- Request/response bodies are logged without secrets.
- External status codes and failures are persisted and queryable.
- Repost attempts preserve linkage to original failed log.
- Admin-only access remains enforced on logs/resend endpoints.

## Update Trigger

Update this doc for changes under:
- `lib/api/external-oferta/**`
- `app/api/external-oferta/**`

## Related Docs

- [API Endpoints](./API_ENDPOINTS.md)
- [Server Actions Map](./SERVER_ACTIONS_MAP.md)
