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



