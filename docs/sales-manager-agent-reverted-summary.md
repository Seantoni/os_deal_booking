# Sales Manager Agent Work Summary (Reverted)

## Context
This document summarizes the Sales Manager Agent implementation that was built and later reverted in code, plus the database cleanup script added to remove related DB artifacts if they were applied.

## What Was Implemented Before Revert
- Admin-only Sales Manager Agent flow with:
  - Manual trigger from dashboard.
  - Recommendation queue requiring per-recommendation admin approval.
  - 72-hour approval expiration.
  - Reasoning text shown in UI.
- Settings tab for agent approvals/policy:
  - Approval expiry, stale days, high-impact threshold, per-action toggles/caps.
- Backend recommendation engine:
  - Focus on Tier 1 / high-impact businesses.
  - Reassignment recommendation for businesses with no progress/activity for 30+ days.
  - Market intelligence signals included (bank promos + competitor pressure).
- Dashboard widget:
  - Run agent manually.
  - Approve/reject recommendations.
  - Execution history and latest run summary.

## Database Artifacts That May Have Been Added
- Table: `agent_runs`
- Table: `agent_recommendations`
- Column: `settings.agentApprovalPolicy`

## Current Status
- Code has been reverted per product decision.
- If DB migration was already applied in any environment, run the rollback script below.

## DB Rollback Script
- File: `prisma/manual/remove_sales_manager_agent.sql`
- NPM command:

```bash
npm run db:rollback:sales-agent
```

## What the Rollback Script Does
- Drops `agent_recommendations` (if exists).
- Drops `agent_runs` (if exists).
- Drops `settings.agentApprovalPolicy` (if exists).
- Safe to run multiple times (`IF EXISTS` guards included).
