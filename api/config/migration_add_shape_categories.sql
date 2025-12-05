-- Migration: Add Shape Categories System
-- This migration adds shape categories and many-to-many relationship between shapes and categories
-- Date: 2024

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- SHAPE CATEGORIES TABLE
-- ==============================================

-- Shape Categories table (separate from logo categories)
CREATE TABLE IF NOT EXISTS shape_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  description_en TEXT,
  description_ar TEXT,
  shape_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,  -- Category shape/image
  slug TEXT UNIQUE,  -- URL-friendly identifier
  parent_id UUID REFERENCES shape_categories(id) ON DELETE SET NULL,  -- For nested categories
  sort_order INTEGER DEFAULT 0,  -- For custom sorting
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB,  -- Additional metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- SHAPE-CATEGORY JUNCTION TABLE (Many-to-Many)
-- ==============================================

-- Junction table for shape-category assignments
CREATE TABLE IF NOT EXISTS shape_category_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shape_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES shape_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shape_id, category_id)  -- Prevent duplicate assignments
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Shape categories indexes
CREATE INDEX IF NOT EXISTS idx_shape_categories_name ON shape_categories(name);
CREATE INDEX IF NOT EXISTS idx_shape_categories_slug ON shape_categories(slug);
CREATE INDEX IF NOT EXISTS idx_shape_categories_parent_id ON shape_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_shape_categories_is_active ON shape_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_shape_categories_sort_order ON shape_categories(sort_order);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_shape_category_assignments_shape_id ON shape_category_assignments(shape_id);
CREATE INDEX IF NOT EXISTS idx_shape_category_assignments_category_id ON shape_category_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_shape_category_assignments_composite ON shape_category_assignments(shape_id, category_id);

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

-- Create trigger for shape_categories updated_at
DROP TRIGGER IF EXISTS update_shape_categories_updated_at ON shape_categories;
CREATE TRIGGER update_shape_categories_updated_at
  BEFORE UPDATE ON shape_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to get shape categories with shape count
CREATE OR REPLACE FUNCTION get_shape_categories_with_counts()
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_en TEXT,
  name_ar TEXT,
  description TEXT,
  description_en TEXT,
  description_ar TEXT,
  shape_asset_id UUID,
  slug TEXT,
  parent_id UUID,
  sort_order INTEGER,
  is_active BOOLEAN,
  meta JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  shape_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.name,
    sc.name_en,
    sc.name_ar,
    sc.description,
    sc.description_en,
    sc.description_ar,
    sc.shape_asset_id,
    sc.slug,
    sc.parent_id,
    sc.sort_order,
    sc.is_active,
    sc.meta,
    sc.created_at,
    sc.updated_at,
    COUNT(sca.shape_id)::BIGINT as shape_count
  FROM shape_categories sc
  LEFT JOIN shape_category_assignments sca ON sca.category_id = sc.id
  WHERE sc.is_active = TRUE
  GROUP BY sc.id
  ORDER BY sc.sort_order ASC, sc.name ASC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- SAMPLE DATA (Optional - for testing)
-- ==============================================

-- Insert some common shape categories
INSERT INTO shape_categories (name, name_en, name_ar, description, slug, sort_order)
VALUES 
  ('Geometric', 'Geometric', 'هندسي', 'Geometric shapes like circles, squares, triangles', 'geometric', 1),
  ('Abstract', 'Abstract', 'مجرد', 'Abstract and artistic shapes', 'abstract', 2),
  ('Minimal', 'Minimal', 'بسيط', 'Minimal and simple shapes', 'minimal', 3),
  ('Badges', 'Badges', 'شارات', 'Badge and label shapes', 'badges', 4),
  ('Outlines', 'Outlines', 'خطوط', 'Outline and border shapes', 'outlines', 5),
  ('Filled', 'Filled', 'مملوء', 'Filled solid shapes', 'filled', 6),
  ('Decorative', 'Decorative', 'زخرفي', 'Decorative and ornamental shapes', 'decorative', 7),
  ('Frames', 'Frames', 'إطارات', 'Frame and border shapes', 'frames', 8),
  ('Banners', 'Banners', 'لافتات', 'Banner and ribbon shapes', 'banners', 9),
  ('Patterns', 'Patterns', 'أنماط', 'Pattern and texture shapes', 'patterns', 10)
ON CONFLICT (name) DO NOTHING;






















