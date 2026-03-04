# Prisma Changelog

Purpose: track migration intent and rollout implications beyond raw SQL in `prisma/migrations/**`.

## Update Trigger

Update this file every time a new migration folder is created.

## Recent Migrations (Current Focus)

| Date key | Migration folder | Summary | Rollout notes |
| --- | --- | --- | --- |
| 2026-03-03 | `20260303170000_add_user_presence_columns` | Adds user presence fields. | Coordinate with presence heartbeat/poll logic. |
| 2026-03-03 | `20260303152000_add_opportunity_comment_threads` | Introduces thread model for opportunity comments. | Verify migration of legacy comments and open thread bootstrap behavior. |
| 2026-03-03 | `20260303110000_add_booking_request_event_days` | Adds booking request event-day modeling support. | Check form and API serialization compatibility. |
| 2026-03-02 | `20260302100000_add_lifecycle_milestone_timestamps` | Adds lifecycle milestone timestamps. | Confirm reporting and dashboard readers handle null/partial data. |
| 2026-02-27 | `20260227180000_bank_promo_business_matching` | Adds bank promo to business matching structures. | Verify matching jobs and scan routes after deploy. |
| 2026-02-27 | `20260227173000_add_business_contact_role` | Adds role metadata for business contacts. | Confirm forms and API mappers include role semantics. |
| 2026-02-27 | `20260227170000_add_bank_promos` | Adds bank promo entities. | Ensure scans, filters, and access controls are aligned. |
| 2026-02-27 | `20260227170000_add_business_additional_contacts` | Adds additional business contacts. | Validate dedupe/ownership logic for contact operations. |
| 2026-02-27 | `20260227160000_add_business_lifecycle` | Adds business lifecycle structure. | Confirm lifecycle badge and stage computations. |
| 2026-02-25 | `20260225000000_add_deal_metrics_categories` | Extends deal metrics with category dimensions. | Re-run metrics sync verification after deployment. |

## Additional Migration Inventory

For full migration listing, inspect:

```bash
rg --files prisma/migrations | rg 'migration\.sql$' | sort
```

Manual SQL scripts are under `prisma/migrations/manual/` and should be explicitly referenced in rollout notes when used.

## Per-Migration Entry Template

When adding a migration, include:
- Models/tables/columns added/changed
- Backfill requirement (yes/no + method)
- App/code dependencies that must deploy together
- Any feature flags or staged rollout guardrails
- Operational verification query (or check path)

## Related Docs

- [Database Schema](./DATABASE_SCHEMA.md)
- [API Endpoints](./API_ENDPOINTS.md)
- [Documentation Index](./README.md)
