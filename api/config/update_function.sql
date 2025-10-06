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



