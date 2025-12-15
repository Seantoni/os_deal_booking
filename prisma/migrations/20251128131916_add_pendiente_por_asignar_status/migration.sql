-- AlterTable: Update default value for Deal.status
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'pendiente_por_asignar';

-- Data migration: Update existing deals with status "asignado" to "pendiente_por_asignar"
-- This moves existing unassigned deals to the new initial stage
UPDATE "deals" SET "status" = 'pendiente_por_asignar' WHERE "status" = 'asignado';

