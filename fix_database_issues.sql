-- Database Fix Migration: Resolve All Current Issues
-- This migration fixes all the database problems identified in the error logs
-- Date: 2025-01-21

-- ==============================================
-- 1. FIX LAYER_TYPE ENUM ISSUE
-- ==============================================

-- The issue is that the code is sending 'text' but the enum expects 'TEXT'
-- We need to add 'text' as a valid enum value or modify the enum to be case-insensitive
-- Let's add 'text' as a valid value to maintain backward compatibility

-- First, check if the enum exists and add 'text' if it doesn't exist
DO $$ 
BEGIN
    -- Add 'text' to the layer_type enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'text' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'layer_type')
    ) THEN
        ALTER TYPE layer_type ADD VALUE 'text';
    END IF;
END $$;

-- ==============================================
-- 2. FIX MISSING UNDERLINE COLUMN IN LAYER_TEXT
-- ==============================================

-- Add the missing underline column and related text formatting columns
ALTER TABLE layer_text 
ADD COLUMN IF NOT EXISTS underline BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS underline_direction VARCHAR(20) DEFAULT 'horizontal' CHECK (underline_direction IN ('horizontal', 'vertical', 'diagonal')),
ADD COLUMN IF NOT EXISTS text_case VARCHAR(20) DEFAULT 'normal' CHECK (text_case IN ('normal', 'uppercase', 'lowercase', 'capitalize')),
ADD COLUMN IF NOT EXISTS font_style VARCHAR(20) DEFAULT 'normal' CHECK (font_style IN ('normal', 'italic', 'oblique')),
ADD COLUMN IF NOT EXISTS font_weight VARCHAR(20) DEFAULT 'normal' CHECK (font_weight IN ('normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900')),
ADD COLUMN IF NOT EXISTS text_decoration VARCHAR(50) DEFAULT 'none' CHECK (text_decoration IN ('none', 'underline', 'overline', 'line-through', 'underline overline', 'underline line-through', 'overline line-through', 'underline overline line-through')),
ADD COLUMN IF NOT EXISTS text_transform VARCHAR(20) DEFAULT 'none' CHECK (text_transform IN ('none', 'uppercase', 'lowercase', 'capitalize', 'full-width')),
ADD COLUMN IF NOT EXISTS font_variant VARCHAR(20) DEFAULT 'normal' CHECK (font_variant IN ('normal', 'small-caps', 'all-small-caps', 'petite-caps', 'all-petite-caps', 'unicase', 'titling-caps'));

-- Add comments for documentation
COMMENT ON COLUMN layer_text.underline IS 'Whether text has underline decoration';
COMMENT ON COLUMN layer_text.underline_direction IS 'Direction of underline: horizontal, vertical, or diagonal';
COMMENT ON COLUMN layer_text.text_case IS 'Text case transformation: normal, uppercase, lowercase, capitalize';
COMMENT ON COLUMN layer_text.font_style IS 'Font style: normal, italic, oblique';
COMMENT ON COLUMN layer_text.font_weight IS 'Font weight: normal, bold, or numeric values 100-900';
COMMENT ON COLUMN layer_text.text_decoration IS 'Text decoration: none, underline, overline, line-through, or combinations';
COMMENT ON COLUMN layer_text.text_transform IS 'Text transformation: none, uppercase, lowercase, capitalize, full-width';
COMMENT ON COLUMN layer_text.font_variant IS 'Font variant: normal, small-caps, all-small-caps, etc.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_layer_text_formatting ON layer_text (underline, text_case, font_style, font_weight);

-- Update existing records to have default values
UPDATE layer_text 
SET 
    underline = FALSE,
    underline_direction = 'horizontal',
    text_case = 'normal',
    font_style = COALESCE(font_style, 'normal'),
    font_weight = COALESCE(font_weight, 'normal'),
    text_decoration = 'none',
    text_transform = 'none',
    font_variant = 'normal'
WHERE 
    underline IS NULL 
    OR underline_direction IS NULL 
    OR text_case IS NULL 
    OR font_style IS NULL 
    OR font_weight IS NULL 
    OR text_decoration IS NULL 
    OR text_transform IS NULL 
    OR font_variant IS NULL;

-- ==============================================
-- 3. FIX MISSING MULTILINGUAL COLUMNS IN CATEGORIES
-- ==============================================

-- Add multilingual fields to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Add multilingual fields to logos table (if not already present)
ALTER TABLE logos 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS tags_en JSONB,
ADD COLUMN IF NOT EXISTS tags_ar JSONB;

-- Add multilingual fields to assets table (if not already present)
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS tags_en JSONB,
ADD COLUMN IF NOT EXISTS tags_ar JSONB;

-- Add multilingual fields to templates table (if not already present)
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- ==============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Create indexes for better performance on multilingual queries
CREATE INDEX IF NOT EXISTS idx_logos_title_en ON logos(title_en);
CREATE INDEX IF NOT EXISTS idx_logos_title_ar ON logos(title_ar);
CREATE INDEX IF NOT EXISTS idx_logos_description_en ON logos(description_en);
CREATE INDEX IF NOT EXISTS idx_logos_description_ar ON logos(description_ar);
CREATE INDEX IF NOT EXISTS idx_categories_name_en ON categories(name_en);
CREATE INDEX IF NOT EXISTS idx_categories_name_ar ON categories(name_ar);
CREATE INDEX IF NOT EXISTS idx_categories_description_en ON categories(description_en);
CREATE INDEX IF NOT EXISTS idx_categories_description_ar ON categories(description_ar);
CREATE INDEX IF NOT EXISTS idx_assets_name_en ON assets(name_en);
CREATE INDEX IF NOT EXISTS idx_assets_name_ar ON assets(name_ar);
CREATE INDEX IF NOT EXISTS idx_templates_title_en ON templates(title_en);
CREATE INDEX IF NOT EXISTS idx_templates_title_ar ON templates(title_ar);

-- ==============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ==============================================

-- Comments for logos multilingual columns
COMMENT ON COLUMN logos.title_en IS 'English title for multilingual support';
COMMENT ON COLUMN logos.title_ar IS 'Arabic title for multilingual support';
COMMENT ON COLUMN logos.description_en IS 'English description for multilingual support';
COMMENT ON COLUMN logos.description_ar IS 'Arabic description for multilingual support';
COMMENT ON COLUMN logos.tags_en IS 'English tags array for multilingual support';
COMMENT ON COLUMN logos.tags_ar IS 'Arabic tags array for multilingual support';

-- Comments for categories multilingual columns
COMMENT ON COLUMN categories.name_en IS 'English name of the category';
COMMENT ON COLUMN categories.name_ar IS 'Arabic name of the category';
COMMENT ON COLUMN categories.description_en IS 'English description of the category';
COMMENT ON COLUMN categories.description_ar IS 'Arabic description of the category';

-- Comments for assets multilingual columns
COMMENT ON COLUMN assets.name_en IS 'English name of the asset';
COMMENT ON COLUMN assets.name_ar IS 'Arabic name of the asset';
COMMENT ON COLUMN assets.description_en IS 'English description of the asset';
COMMENT ON COLUMN assets.description_ar IS 'Arabic description of the asset';
COMMENT ON COLUMN assets.tags_en IS 'English tags for the asset';
COMMENT ON COLUMN assets.tags_ar IS 'Arabic tags for the asset';

-- Comments for templates multilingual columns
COMMENT ON COLUMN templates.title_en IS 'English title of the template';
COMMENT ON COLUMN templates.title_ar IS 'Arabic title of the template';
COMMENT ON COLUMN templates.description_en IS 'English description of the template';
COMMENT ON COLUMN templates.description_ar IS 'Arabic description of the template';

-- ==============================================
-- 6. UPDATE EXISTING DATA FOR BACKWARD COMPATIBILITY
-- ==============================================

-- Update existing logos to populate multilingual fields from existing data
UPDATE logos 
SET 
    title_en = COALESCE(title_en, title),
    title_ar = COALESCE(title_ar, title),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description),
    tags_en = COALESCE(tags_en, tags),
    tags_ar = COALESCE(tags_ar, tags)
WHERE title_en IS NULL OR title_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;

-- Update existing categories to populate multilingual fields from existing data
UPDATE categories 
SET 
    name_en = COALESCE(name_en, name),
    name_ar = COALESCE(name_ar, name),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description)
WHERE name_en IS NULL OR name_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;

-- Update existing assets to populate multilingual fields from existing data
UPDATE assets 
SET 
    name_en = COALESCE(name_en, name),
    name_ar = COALESCE(name_ar, name),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description),
    tags_en = COALESCE(tags_en, tags),
    tags_ar = COALESCE(tags_ar, tags)
WHERE name_en IS NULL OR name_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;

-- Update existing templates to populate multilingual fields from existing data
UPDATE templates 
SET 
    title_en = COALESCE(title_en, title),
    title_ar = COALESCE(title_ar, title),
    description_en = COALESCE(description_en, description),
    description_ar = COALESCE(description_ar, description)
WHERE title_en IS NULL OR title_ar IS NULL OR description_en IS NULL OR description_ar IS NULL;

-- ==============================================
-- 7. CREATE HELPER FUNCTIONS FOR LOCALIZATION
-- ==============================================

-- Create a function to get localized text based on language
CREATE OR REPLACE FUNCTION get_localized_text(
  text_en TEXT,
  text_ar TEXT,
  fallback TEXT,
  language TEXT DEFAULT 'en'
) RETURNS TEXT AS $$
BEGIN
  -- If language is Arabic, prefer Arabic text, then English, then fallback
  IF language = 'ar' THEN
    RETURN COALESCE(NULLIF(text_ar, ''), NULLIF(text_en, ''), fallback);
  ELSE
    -- For English or any other language, prefer English text, then fallback
    RETURN COALESCE(NULLIF(text_en, ''), fallback);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get localized JSON array (for tags)
CREATE OR REPLACE FUNCTION get_localized_tags(
  tags_en JSONB,
  tags_ar JSONB,
  fallback JSONB,
  language TEXT DEFAULT 'en'
) RETURNS JSONB AS $$
BEGIN
  -- If language is Arabic, prefer Arabic tags, then English, then fallback
  IF language = 'ar' THEN
    RETURN COALESCE(
      CASE WHEN tags_ar IS NOT NULL AND jsonb_array_length(tags_ar) > 0 THEN tags_ar ELSE NULL END,
      CASE WHEN tags_en IS NOT NULL AND jsonb_array_length(tags_en) > 0 THEN tags_en ELSE NULL END,
      fallback
    );
  ELSE
    -- For English or any other language, prefer English tags, then fallback
    RETURN COALESCE(
      CASE WHEN tags_en IS NOT NULL AND jsonb_array_length(tags_en) > 0 THEN tags_en ELSE NULL END,
      fallback
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the functions
COMMENT ON FUNCTION get_localized_text IS 'Returns localized text based on language preference';
COMMENT ON FUNCTION get_localized_tags IS 'Returns localized tags array based on language preference';

-- ==============================================
-- 8. VERIFICATION QUERIES
-- ==============================================

-- Verify that all required columns exist
SELECT 
    'layer_text' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'layer_text' 
AND column_name IN ('underline', 'underline_direction', 'text_case', 'font_style', 'font_weight', 'text_decoration', 'text_transform', 'font_variant')
ORDER BY column_name;

SELECT 
    'categories' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'categories' 
AND column_name IN ('name_en', 'name_ar', 'description_en', 'description_ar')
ORDER BY column_name;

SELECT 
    'logos' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'logos' 
AND column_name IN ('title_en', 'title_ar', 'description_en', 'description_ar', 'tags_en', 'tags_ar')
ORDER BY column_name;

-- Verify that the layer_type enum includes 'text'
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'layer_type')
ORDER BY enumlabel;

-- ==============================================
-- MIGRATION COMPLETE
-- ==============================================

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE 'Database fix migration completed successfully!';
    RAISE NOTICE 'Fixed issues:';
    RAISE NOTICE '1. Added "text" to layer_type enum';
    RAISE NOTICE '2. Added underline and text formatting columns to layer_text table';
    RAISE NOTICE '3. Added multilingual columns to categories, logos, assets, and templates tables';
    RAISE NOTICE '4. Created indexes for better performance';
    RAISE NOTICE '5. Updated existing data for backward compatibility';
    RAISE NOTICE '6. Created helper functions for localization';
END $$;

