-- Migration: Add multilingual support for logos and categories
-- This migration adds English and Arabic language support for logos and categories

-- Add multilingual fields to logos table
ALTER TABLE logos 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS tags_en JSONB,
ADD COLUMN IF NOT EXISTS tags_ar JSONB;

-- Add multilingual fields to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Add multilingual fields to assets table (for icons, backgrounds, etc.)
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS tags_en JSONB,
ADD COLUMN IF NOT EXISTS tags_ar JSONB;

-- Add multilingual fields to templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Create indexes for better performance on multilingual queries
CREATE INDEX IF NOT EXISTS idx_logos_title_en ON logos(title_en);
CREATE INDEX IF NOT EXISTS idx_logos_title_ar ON logos(title_ar);
CREATE INDEX IF NOT EXISTS idx_categories_name_en ON categories(name_en);
CREATE INDEX IF NOT EXISTS idx_categories_name_ar ON categories(name_ar);
CREATE INDEX IF NOT EXISTS idx_assets_name_en ON assets(name_en);
CREATE INDEX IF NOT EXISTS idx_assets_name_ar ON assets(name_ar);

-- Add constraints to ensure at least one language is provided
-- For logos: either title or (title_en OR title_ar) must be provided
ALTER TABLE logos 
ADD CONSTRAINT check_logos_title_multilingual 
CHECK (
  title IS NOT NULL OR 
  (title_en IS NOT NULL AND title_en != '') OR 
  (title_ar IS NOT NULL AND title_ar != '')
);

-- For categories: either name or (name_en OR name_ar) must be provided
ALTER TABLE categories 
ADD CONSTRAINT check_categories_name_multilingual 
CHECK (
  name IS NOT NULL OR 
  (name_en IS NOT NULL AND name_en != '') OR 
  (name_ar IS NOT NULL AND name_ar != '')
);

-- For assets: either name or (name_en OR name_ar) must be provided
ALTER TABLE assets 
ADD CONSTRAINT check_assets_name_multilingual 
CHECK (
  name IS NOT NULL OR 
  (name_en IS NOT NULL AND name_en != '') OR 
  (name_ar IS NOT NULL AND name_ar != '')
);

-- For templates: either title or (title_en OR title_ar) must be provided
ALTER TABLE templates 
ADD CONSTRAINT check_templates_title_multilingual 
CHECK (
  title IS NOT NULL OR 
  (title_en IS NOT NULL AND title_en != '') OR 
  (title_ar IS NOT NULL AND title_ar != '')
);

-- Create a function to get localized content based on language
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

-- Create a view for localized logos
CREATE OR REPLACE VIEW localized_logos AS
SELECT 
  l.id,
  l.owner_id,
  l.canvas_w,
  l.canvas_h,
  l.dpi,
  l.thumbnail_url,
  l.is_template,
  l.template_id,
  l.category_id,
  l.colors_used,
  l.vertical_align,
  l.horizontal_align,
  l.responsive_version,
  l.responsive_description,
  l.scaling_method,
  l.position_method,
  l.fully_responsive,
  l.version,
  l.responsive,
  l.export_format,
  l.export_transparent_background,
  l.export_quality,
  l.export_scalable,
  l.export_maintain_aspect_ratio,
  l.canvas_background_type,
  l.canvas_background_solid_color,
  l.canvas_background_gradient,
  l.canvas_background_image_type,
  l.canvas_background_image_path,
  l.created_at,
  l.updated_at,
  -- Localized fields (will be populated by application logic)
  l.title,
  l.title_en,
  l.title_ar,
  l.description,
  l.description_en,
  l.description_ar,
  l.tags,
  l.tags_en,
  l.tags_ar,
  -- Category information
  c.name as category_name,
  c.name_en as category_name_en,
  c.name_ar as category_name_ar,
  c.description as category_description,
  c.description_en as category_description_en,
  c.description_ar as category_description_ar
FROM logos l
LEFT JOIN categories c ON c.id = l.category_id;

-- Create a view for localized categories
CREATE OR REPLACE VIEW localized_categories AS
SELECT 
  c.id,
  c.icon_asset_id,
  c.created_at,
  c.updated_at,
  -- Localized fields
  c.name,
  c.name_en,
  c.name_ar,
  c.description,
  c.description_en,
  c.description_ar
FROM categories c;

-- Create a view for localized assets
CREATE OR REPLACE VIEW localized_assets AS
SELECT 
  a.id,
  a.kind,
  a.storage,
  a.url,
  a.provider_id,
  a.mime_type,
  a.bytes_size,
  a.width,
  a.height,
  a.has_alpha,
  a.dominant_hex,
  a.palette,
  a.vector_svg,
  a.checksum_sha256,
  a.meta,
  a.created_by,
  a.created_at,
  a.updated_at,
  -- Localized fields
  a.name,
  a.name_en,
  a.name_ar,
  a.description_en,
  a.description_ar,
  a.tags_en,
  a.tags_ar
FROM assets a;

-- Create a view for localized templates
CREATE OR REPLACE VIEW localized_templates AS
SELECT 
  t.id,
  t.category_id,
  t.preview_url,
  t.base_logo_id,
  t.created_at,
  t.updated_at,
  -- Localized fields
  t.title,
  t.title_en,
  t.title_ar,
  t.description,
  t.description_en,
  t.description_ar
FROM templates t;

-- Add comments for documentation
COMMENT ON COLUMN logos.title_en IS 'English title of the logo';
COMMENT ON COLUMN logos.title_ar IS 'Arabic title of the logo';
COMMENT ON COLUMN logos.description_en IS 'English description of the logo';
COMMENT ON COLUMN logos.description_ar IS 'Arabic description of the logo';
COMMENT ON COLUMN logos.tags_en IS 'English tags for the logo';
COMMENT ON COLUMN logos.tags_ar IS 'Arabic tags for the logo';

COMMENT ON COLUMN categories.name_en IS 'English name of the category';
COMMENT ON COLUMN categories.name_ar IS 'Arabic name of the category';
COMMENT ON COLUMN categories.description_en IS 'English description of the category';
COMMENT ON COLUMN categories.description_ar IS 'Arabic description of the category';

COMMENT ON COLUMN assets.name_en IS 'English name of the asset';
COMMENT ON COLUMN assets.name_ar IS 'Arabic name of the asset';
COMMENT ON COLUMN assets.description_en IS 'English description of the asset';
COMMENT ON COLUMN assets.description_ar IS 'Arabic description of the asset';
COMMENT ON COLUMN assets.tags_en IS 'English tags for the asset';
COMMENT ON COLUMN assets.tags_ar IS 'Arabic tags for the asset';

COMMENT ON COLUMN templates.title_en IS 'English title of the template';
COMMENT ON COLUMN templates.title_ar IS 'Arabic title of the template';
COMMENT ON COLUMN templates.description_en IS 'English description of the template';
COMMENT ON COLUMN templates.description_ar IS 'Arabic description of the template';

COMMENT ON FUNCTION get_localized_text IS 'Returns localized text based on language preference';
COMMENT ON FUNCTION get_localized_tags IS 'Returns localized tags array based on language preference';
