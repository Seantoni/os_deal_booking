-- Migration: Consolidate province, district, corregimiento into single field
-- Date: 2026-01-30
-- Description: 
--   1. Create new ProvDistCorr lookup table
--   2. Add provinceDistrictCorregimiento column to BookingRequest and Business tables
--   3. Remove old province, district, corregimiento columns from both tables
--   4. Update form configuration in database

-- ============================================
-- PART 1: Create new ProvDistCorr lookup table
-- ============================================

CREATE TABLE IF NOT EXISTS "prov_dist_corr" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prov_dist_corr_pkey" PRIMARY KEY ("id")
);

-- Create unique index on value
CREATE UNIQUE INDEX IF NOT EXISTS "prov_dist_corr_value_key" ON "prov_dist_corr"("value");

-- ============================================
-- PART 2: Add new column to BookingRequest
-- ============================================

ALTER TABLE "BookingRequest" 
ADD COLUMN IF NOT EXISTS "provinceDistrictCorregimiento" TEXT;

-- ============================================
-- PART 3: Add new column to businesses
-- ============================================

ALTER TABLE "businesses" 
ADD COLUMN IF NOT EXISTS "provinceDistrictCorregimiento" TEXT;

-- ============================================
-- PART 4: Drop old columns from BookingRequest
-- ============================================

ALTER TABLE "BookingRequest" 
DROP COLUMN IF EXISTS "province",
DROP COLUMN IF EXISTS "district",
DROP COLUMN IF EXISTS "corregimiento";

-- ============================================
-- PART 5: Drop old columns from businesses
-- ============================================

ALTER TABLE "businesses" 
DROP COLUMN IF EXISTS "province",
DROP COLUMN IF EXISTS "district",
DROP COLUMN IF EXISTS "corregimiento";

-- ============================================
-- PART 6: Update form configuration
-- Delete old field configs and add new one
-- ============================================

-- Delete old field configs for province, district, corregimiento
DELETE FROM "FormFieldConfig" 
WHERE "entityType" = 'business' 
AND "fieldKey" IN ('province', 'district', 'corregimiento');

-- Check if provinceDistrictCorregimiento already exists, if not add it
-- (Using a DO block for conditional insert)
DO $$
DECLARE
    ubicacion_section_id TEXT;
    max_order INT;
BEGIN
    -- Check if field already exists
    IF NOT EXISTS (
        SELECT 1 FROM "FormFieldConfig" 
        WHERE "entityType" = 'business' 
        AND "fieldKey" = 'provinceDistrictCorregimiento'
    ) THEN
        -- Find the Ubicación section (or any location-related section)
        SELECT id INTO ubicacion_section_id 
        FROM "FormSection" 
        WHERE "entityType" = 'business' 
        AND ("name" = 'Ubicación' OR "name" LIKE '%Ubicación%')
        LIMIT 1;
        
        -- If no Ubicación section, try Basic Information
        IF ubicacion_section_id IS NULL THEN
            SELECT id INTO ubicacion_section_id 
            FROM "FormSection" 
            WHERE "entityType" = 'business' 
            AND "name" = 'Basic Information'
            LIMIT 1;
        END IF;
        
        -- If we found a section, add the field
        IF ubicacion_section_id IS NOT NULL THEN
            -- Get max display order in section
            SELECT COALESCE(MAX("displayOrder"), -1) INTO max_order 
            FROM "FormFieldConfig" 
            WHERE "sectionId" = ubicacion_section_id;
            
            -- Insert new field config
            INSERT INTO "FormFieldConfig" (
                "id",
                "entityType",
                "sectionId",
                "fieldKey",
                "fieldSource",
                "displayOrder",
                "isVisible",
                "isRequired",
                "isReadonly",
                "canEditAfterCreation",
                "width",
                "createdAt",
                "updatedAt"
            ) VALUES (
                gen_random_uuid()::text,
                'business',
                ubicacion_section_id,
                'provinceDistrictCorregimiento',
                'builtin',
                max_order + 1,
                true,
                false,
                false,
                false,
                'full',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Added provinceDistrictCorregimiento field to section %', ubicacion_section_id;
        ELSE
            RAISE WARNING 'Could not find suitable section for provinceDistrictCorregimiento field';
        END IF;
    ELSE
        RAISE NOTICE 'provinceDistrictCorregimiento field already exists';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (run these to verify)
-- ============================================

-- Check new table exists:
-- SELECT COUNT(*) FROM "prov_dist_corr";

-- Check new columns exist:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'BookingRequest' AND column_name = 'provinceDistrictCorregimiento';

-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'Business' AND column_name = 'provinceDistrictCorregimiento';

-- Check old columns are gone:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'BookingRequest' AND column_name IN ('province', 'district', 'corregimiento');

-- Check form config:
-- SELECT * FROM "FormFieldConfig" WHERE "fieldKey" = 'provinceDistrictCorregimiento';
