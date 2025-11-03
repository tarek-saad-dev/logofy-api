-- Migration: Add Icon Categories System
-- This migration adds icon categories and many-to-many relationship between icons and categories
-- Date: 2024

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- ICON CATEGORIES TABLE
-- ==============================================

-- Icon Categories table (separate from logo categories)
CREATE TABLE IF NOT EXISTS icon_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  description_en TEXT,
  description_ar TEXT,
  icon_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- Category icon/image
  slug TEXT UNIQUE,  -- URL-friendly identifier
  parent_id UUID REFERENCES icon_categories(id) ON DELETE SET NULL,  -- For nested categories
  sort_order INTEGER DEFAULT 0,  -- For custom sorting
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB,  -- Additional metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- ICON-CATEGORY JUNCTION TABLE (Many-to-Many)
-- ==============================================

-- Junction table for icon-category assignments
CREATE TABLE IF NOT EXISTS icon_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES icon_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(icon_id, category_id)  -- Prevent duplicate assignments
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Icon categories indexes
CREATE INDEX IF NOT EXISTS idx_icon_categories_name ON icon_categories(name);
CREATE INDEX IF NOT EXISTS idx_icon_categories_slug ON icon_categories(slug);
CREATE INDEX IF NOT EXISTS idx_icon_categories_parent_id ON icon_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_icon_categories_is_active ON icon_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_icon_categories_sort_order ON icon_categories(sort_order);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_icon_category_assignments_icon_id ON icon_category_assignments(icon_id);
CREATE INDEX IF NOT EXISTS idx_icon_category_assignments_category_id ON icon_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_icon_category_assignments_composite ON icon_category_assignments(icon_id, category_id);

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Create or replace the update_updated_at_column function (in case it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for icon_categories updated_at
DROP TRIGGER IF EXISTS update_icon_categories_updated_at ON icon_categories;
CREATE TRIGGER update_icon_categories_updated_at
  BEFORE UPDATE ON icon_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get icon categories with icon count
CREATE OR REPLACE FUNCTION get_icon_categories_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  description_en TEXT,
  description_ar TEXT,
  icon_asset_id UUID,
  slug TEXT,
  parent_id UUID,
  sort_order INTEGER,
  is_active BOOLEAN,
  meta JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  icon_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.name,
    ic.name_en,
    ic.name_ar,
    ic.description,
    ic.description_en,
    ic.description_ar,
    ic.icon_asset_id,
    ic.slug,
    ic.parent_id,
    ic.sort_order,
    ic.is_active,
    ic.meta,
    ic.created_at,
    ic.updated_at,
    COUNT(ica.icon_id)::BIGINT as icon_count
  FROM icon_categories ic
  LEFT JOIN icon_category_assignments ica ON ica.category_id = ic.id
  WHERE ic.is_active = TRUE
  GROUP BY ic.id
  ORDER BY ic.sort_order ASC, ic.name ASC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================

-- Insert some common icon categories
INSERT INTO icon_categories (name, name_en, name_ar, description, slug, sort_order)
VALUES 
  ('Business', 'Business', 'أعمال', 'Business and professional icons', 'business', 1),
  ('Technology', 'Technology', 'تقنية', 'Technology and IT icons', 'technology', 2),
  ('Social Media', 'Social Media', 'وسائل التواصل الاجتماعي', 'Social media platform icons', 'social-media', 3),
  ('Communication', 'Communication', 'اتصال', 'Communication and messaging icons', 'communication', 4),
  ('Finance', 'Finance', 'مالية', 'Finance and money icons', 'finance', 5),
  ('Healthcare', 'Healthcare', 'رعاية صحية', 'Healthcare and medical icons', 'healthcare', 6),
  ('Education', 'Education', 'تعليم', 'Education and learning icons', 'education', 7),
  ('Transportation', 'Transportation', 'نقل', 'Transportation and vehicle icons', 'transportation', 8),
  ('Food & Drink', 'Food & Drink', 'طعام وشراب', 'Food and beverage icons', 'food-drink', 9),
  ('Sports', 'Sports', 'رياضة', 'Sports and fitness icons', 'sports', 10)
ON CONFLICT (name) DO NOTHING;

