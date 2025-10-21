-- Database Migration: Add Legacy Format Support Columns
-- This migration adds columns needed for mobile legacy format support

-- Add flip columns to layers table if they don't exist
ALTER TABLE layers 
ADD COLUMN IF NOT EXISTS flip_horizontal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flip_vertical BOOLEAN DEFAULT FALSE;

-- Add legacy format support columns to logos table
ALTER TABLE logos 
ADD COLUMN IF NOT EXISTS legacy_format_supported BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS mobile_optimized BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS legacy_compatibility_version VARCHAR(10) DEFAULT '1.0';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_layers_flip_horizontal ON layers(flip_horizontal);
CREATE INDEX IF NOT EXISTS idx_layers_flip_vertical ON layers(flip_vertical);
CREATE INDEX IF NOT EXISTS idx_logos_legacy_format ON logos(legacy_format_supported);
CREATE INDEX IF NOT EXISTS idx_logos_mobile_optimized ON logos(mobile_optimized);

-- Add comments to document the new columns
COMMENT ON COLUMN layers.flip_horizontal IS 'Whether layer is flipped horizontally for mobile compatibility';
COMMENT ON COLUMN layers.flip_vertical IS 'Whether layer is flipped vertically for mobile compatibility';
COMMENT ON COLUMN logos.legacy_format_supported IS 'Whether this logo supports legacy mobile format';
COMMENT ON COLUMN logos.mobile_optimized IS 'Whether this logo is optimized for mobile display';
COMMENT ON COLUMN logos.legacy_compatibility_version IS 'Version of legacy format compatibility';

-- Update existing records to set default values
UPDATE layers 
SET 
    flip_horizontal = COALESCE(flip_horizontal, FALSE),
    flip_vertical = COALESCE(flip_vertical, FALSE)
WHERE flip_horizontal IS NULL OR flip_vertical IS NULL;

UPDATE logos 
SET 
    legacy_format_supported = COALESCE(legacy_format_supported, TRUE),
    mobile_optimized = COALESCE(mobile_optimized, TRUE),
    legacy_compatibility_version = COALESCE(legacy_compatibility_version, '1.0')
WHERE legacy_format_supported IS NULL OR mobile_optimized IS NULL OR legacy_compatibility_version IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'layers' 
AND column_name IN ('flip_horizontal', 'flip_vertical')
ORDER BY column_name;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'logos' 
AND column_name IN ('legacy_format_supported', 'mobile_optimized', 'legacy_compatibility_version')
ORDER BY column_name;
