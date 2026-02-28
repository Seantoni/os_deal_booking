-- Sales Manager Agent DB rollback
-- Safe to run multiple times.

BEGIN;

-- Drop child table first due to FK relationship.
DROP TABLE IF EXISTS "agent_recommendations" CASCADE;
DROP TABLE IF EXISTS "agent_runs" CASCADE;

-- Remove settings policy column if it was added.
ALTER TABLE IF EXISTS "settings"
DROP COLUMN IF EXISTS "agentApprovalPolicy";

COMMIT;
