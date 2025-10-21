-- Database Migration: Add Multilingual Columns to Logos Table
-- This migration adds support for English and Arabic localization

-- Add multilingual columns to the logos table
ALTER TABLE logos 
ADD COLUMN IF NOT EXISTS title_en VARCHAR(255),
ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255),
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS tags_en JSONB,
ADD COLUMN IF NOT EXISTS tags_ar JSONB;

-- Add indexes for better performance on multilingual searches
CREATE INDEX IF NOT EXISTS idx_logos_title_en ON logos(title_en);
CREATE INDEX IF NOT EXISTS idx_logos_title_ar ON logos(title_ar);
CREATE INDEX IF NOT EXISTS idx_logos_description_en ON logos(description_en);
CREATE INDEX IF NOT EXISTS idx_logos_description_ar ON logos(description_ar);

-- Add comments to document the new columns
COMMENT ON COLUMN logos.title_en IS 'English title for multilingual support';
COMMENT ON COLUMN logos.title_ar IS 'Arabic title for multilingual support';
COMMENT ON COLUMN logos.description_en IS 'English description for multilingual support';
COMMENT ON COLUMN logos.description_ar IS 'Arabic description for multilingual support';
COMMENT ON COLUMN logos.tags_en IS 'English tags array for multilingual support';
COMMENT ON COLUMN logos.tags_ar IS 'Arabic tags array for multilingual support';

-- Update existing records to populate multilingual fields from existing data
-- This ensures backward compatibility
UPDATE logos 
SET 
    title_en = COALESCE(title_en, title),
    title_ar = COALESCE(title_ar, title),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description),
    tags_en = COALESCE(tags_en, tags),
    tags_ar = COALESCE(tags_ar, tags)
WHERE title_en IS NULL OR title_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'logos' 
AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
ORDER BY column_name;
