-- Migration: Add text formatting attributes to layer_text table
-- This migration adds support for underline, text case, and enhanced font styles

-- Add new columns to layer_text table
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
