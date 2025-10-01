-- Add missing fields to support mobile-compatible JSON structure
-- This migration adds the necessary columns to support the expected JSON format

-- Add flip support to layers table
ALTER TABLE layers ADD COLUMN IF NOT EXISTS flip_horizontal BOOLEAN DEFAULT FALSE;
ALTER TABLE layers ADD COLUMN IF NOT EXISTS flip_vertical BOOLEAN DEFAULT FALSE;

-- Add colors used tracking to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS colors_used JSONB DEFAULT '[]'::jsonb;

-- Add alignments to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS vertical_align TEXT DEFAULT 'center';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS horizontal_align TEXT DEFAULT 'center';

-- Add responsive settings to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS responsive_version TEXT DEFAULT '3.0';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS responsive_description TEXT DEFAULT 'Fully responsive logo data - no absolute sizes stored';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS scaling_method TEXT DEFAULT 'scaleFactor';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS position_method TEXT DEFAULT 'relative';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS fully_responsive BOOLEAN DEFAULT TRUE;

-- Add metadata to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '["logo", "design", "responsive"]'::jsonb;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 3;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS responsive BOOLEAN DEFAULT TRUE;

-- Add export settings to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS export_format TEXT DEFAULT 'png';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS export_transparent_background BOOLEAN DEFAULT TRUE;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS export_quality INTEGER DEFAULT 100;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS export_scalable BOOLEAN DEFAULT TRUE;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS export_maintain_aspect_ratio BOOLEAN DEFAULT TRUE;

-- Add canvas background support to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS canvas_background_type TEXT DEFAULT 'solid';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS canvas_background_solid_color TEXT DEFAULT '#ffffff';
ALTER TABLE logos ADD COLUMN IF NOT EXISTS canvas_background_gradient JSONB;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS canvas_background_image_type TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS canvas_background_image_path TEXT;

-- Add description field to logos table
ALTER TABLE logos ADD COLUMN IF NOT EXISTS description TEXT;

-- Add template_id field to logos table for better template support
ALTER TABLE logos ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES logos(id);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_logos_template_id ON logos(template_id);
CREATE INDEX IF NOT EXISTS idx_logos_colors_used_gin ON logos USING GIN (colors_used);
CREATE INDEX IF NOT EXISTS idx_logos_tags_gin ON logos USING GIN (tags);

-- Update the get_logo_with_layers function to include new fields
CREATE OR REPLACE FUNCTION get_logo_with_layers(p_logo_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', l.id,
    'title', l.title,
    'description', l.description,
    'canvas_w', l.canvas_w,
    'canvas_h', l.canvas_h,
    'canvas_background_type', l.canvas_background_type,
    'canvas_background_solid_color', l.canvas_background_solid_color,
    'canvas_background_gradient', l.canvas_background_gradient,
    'canvas_background_image_type', l.canvas_background_image_type,
    'canvas_background_image_path', l.canvas_background_image_path,
    'thumbnail_url', l.thumbnail_url,
    'colors_used', l.colors_used,
    'vertical_align', l.vertical_align,
    'horizontal_align', l.horizontal_align,
    'responsive_version', l.responsive_version,
    'responsive_description', l.responsive_description,
    'scaling_method', l.scaling_method,
    'position_method', l.position_method,
    'fully_responsive', l.fully_responsive,
    'tags', l.tags,
    'version', l.version,
    'responsive', l.responsive,
    'export_format', l.export_format,
    'export_transparent_background', l.export_transparent_background,
    'export_quality', l.export_quality,
    'export_scalable', l.export_scalable,
    'export_maintain_aspect_ratio', l.export_maintain_aspect_ratio,
    'template_id', l.template_id,
    'created_at', l.created_at,
    'updated_at', l.updated_at,
    'layers', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', lay.id,
          'type', lay.type,
          'name', lay.name,
          'z_index', lay.z_index,
          'x_norm', lay.x_norm,
          'y_norm', lay.y_norm,
          'scale', lay.scale,
          'rotation_deg', lay.rotation_deg,
          'opacity', lay.opacity,
          'blend_mode', lay.blend_mode,
          'is_visible', lay.is_visible,
          'is_locked', lay.is_locked,
          'flip_horizontal', lay.flip_horizontal,
          'flip_vertical', lay.flip_vertical,
          'common_style', lay.common_style
        ) ORDER BY lay.z_index
      )
      FROM layers lay WHERE lay.logo_id = l.id),
      '[]'::jsonb
    )
  )
  INTO result
  FROM logos l
  WHERE l.id = p_logo_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;


