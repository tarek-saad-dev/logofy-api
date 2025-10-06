const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

// ==============================================
// LOGO CRUD OPERATIONS
// ==============================================

// GET /api/logo/:id - Get logo by ID with all layers and their properties
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format } = req.query;
    
    // If mobile format is requested, redirect to mobile endpoint
    if (format === 'mobile') {
      return res.redirect(`/api/logo/${id}/mobile`);
    }

    // Fetch logo basic info with all new fields
    const logoRes = await query(`
      SELECT 
        l.id, l.owner_id, l.title, l.description, l.canvas_w, l.canvas_h, l.dpi,
        l.thumbnail_url, l.is_template, l.category_id, l.template_id,
        l.colors_used, l.vertical_align, l.horizontal_align,
        l.responsive_version, l.responsive_description, l.scaling_method, l.position_method,
        l.fully_responsive, l.tags, l.version, l.responsive,
        l.export_format, l.export_transparent_background, l.export_quality,
        l.export_scalable, l.export_maintain_aspect_ratio,
        l.canvas_background_type, l.canvas_background_solid_color, l.canvas_background_gradient,
        l.canvas_background_image_type, l.canvas_background_image_path,
        l.created_at, l.updated_at,
        c.name as category_name
      FROM logos l
      LEFT JOIN categories c ON c.id = l.category_id
      WHERE l.id = $1
    `, [id]);

    if (logoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }

    const logo = logoRes.rows[0];

    // Fetch all layers with their type-specific data
    const layersRes = await query(`
      SELECT 
        lay.id, lay.logo_id, lay.type, lay.name, lay.z_index,
        lay.x_norm, lay.y_norm, lay.scale, lay.rotation_deg,
        lay.anchor_x, lay.anchor_y, lay.opacity, lay.blend_mode,
        lay.is_visible, lay.is_locked, lay.common_style,
        lay.flip_horizontal, lay.flip_vertical,
        lay.created_at, lay.updated_at,
        
        -- Text layer data
        lt.content, lt.font_id, lt.font_size, lt.line_height, lt.letter_spacing,
        lt.align, lt.baseline, lt.fill_hex, lt.fill_alpha, lt.stroke_hex,
        lt.stroke_alpha, lt.stroke_width, lt.stroke_align, lt.gradient as text_gradient,
        
        -- Shape layer data
        ls.shape_kind, ls.svg_path, ls.points, ls.rx, ls.ry,
        ls.fill_hex as shape_fill_hex, ls.fill_alpha as shape_fill_alpha,
        ls.gradient as shape_gradient, ls.stroke_hex as shape_stroke_hex,
        ls.stroke_alpha as shape_stroke_alpha, ls.stroke_width as shape_stroke_width,
        ls.stroke_dash, ls.line_cap, ls.line_join, ls.meta as shape_meta,
        
        -- Icon layer data
        li.asset_id as icon_asset_id, li.tint_hex, li.tint_alpha, li.allow_recolor,
        
        -- Image layer data
        lim.asset_id as image_asset_id, lim.crop, lim.fit, lim.rounding,
        lim.blur, lim.brightness, lim.contrast,
        
        -- Background layer data
        lb.mode, lb.fill_hex as bg_fill_hex, lb.fill_alpha as bg_fill_alpha,
        lb.gradient as bg_gradient, lb.asset_id as bg_asset_id,
        lb.repeat, lb.position, lb.size,
        
        -- Asset data for icons and images
        ai.id as asset_id, ai.kind as asset_kind, ai.name as asset_name,
        ai.url as asset_url, ai.width as asset_width, ai.height as asset_height,
        ai.has_alpha as asset_has_alpha, ai.vector_svg, ai.meta as asset_meta,
        
        -- Font data for text layers
        f.family as font_family, f.style as font_style, f.weight as font_weight,
        f.url as font_url, f.fallbacks as font_fallbacks
      FROM layers lay
      LEFT JOIN layer_text lt ON lt.layer_id = lay.id
      LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
      LEFT JOIN layer_icon li ON li.layer_id = lay.id
      LEFT JOIN layer_image lim ON lim.layer_id = lay.id
      LEFT JOIN layer_background lb ON lb.layer_id = lay.id
      LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id OR ai.id = lb.asset_id)
      LEFT JOIN fonts f ON f.id = lt.font_id
      WHERE lay.logo_id = $1
      ORDER BY lay.z_index ASC, lay.created_at ASC
    `, [id]);

    // Process layers and group by type
    const layers = layersRes.rows.map(row => {
      const baseLayer = {
        id: row.id,
        logo_id: row.logo_id,
        type: row.type,
        name: row.name,
        z_index: row.z_index,
        x_norm: row.x_norm,
        y_norm: row.y_norm,
        scale: row.scale,
        rotation_deg: row.rotation_deg,
        anchor_x: row.anchor_x,
        anchor_y: row.anchor_y,
        opacity: row.opacity,
        blend_mode: row.blend_mode,
        is_visible: row.is_visible,
        is_locked: row.is_locked,
        common_style: row.common_style,
        flip_horizontal: row.flip_horizontal,
        flip_vertical: row.flip_vertical,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      // Add type-specific properties
      switch (row.type) {
        case 'TEXT':
          return {
            ...baseLayer,
            text: {
              content: row.content,
              font_id: row.font_id,
              font_size: row.font_size,
              line_height: row.line_height,
              letter_spacing: row.letter_spacing,
              align: row.align,
              baseline: row.baseline,
              fill_hex: row.fill_hex,
              fill_alpha: row.fill_alpha,
              stroke_hex: row.stroke_hex,
              stroke_alpha: row.stroke_alpha,
              stroke_width: row.stroke_width,
              stroke_align: row.stroke_align,
              gradient: row.text_gradient,
              font: row.font_family ? {
                family: row.font_family,
                style: row.font_style,
                weight: row.font_weight,
                url: row.font_url,
                fallbacks: row.font_fallbacks
              } : null
            }
          };

        case 'SHAPE':
          return {
            ...baseLayer,
            shape: {
              shape_kind: row.shape_kind,
              svg_path: row.svg_path,
              points: row.points,
              rx: row.rx,
              ry: row.ry,
              fill_hex: row.shape_fill_hex,
              fill_alpha: row.shape_fill_alpha,
              gradient: row.shape_gradient,
              stroke_hex: row.shape_stroke_hex,
              stroke_alpha: row.shape_stroke_alpha,
              stroke_width: row.shape_stroke_width,
              stroke_dash: row.stroke_dash,
              line_cap: row.line_cap,
              line_join: row.line_join,
              meta: row.shape_meta
            }
          };

        case 'ICON':
          return {
            ...baseLayer,
            icon: {
              asset_id: row.icon_asset_id,
              tint_hex: row.tint_hex,
              tint_alpha: row.tint_alpha,
              allow_recolor: row.allow_recolor,
              asset: row.asset_id ? {
                id: row.asset_id,
                kind: row.asset_kind,
                name: row.asset_name,
                url: row.asset_url,
                width: row.asset_width,
                height: row.asset_height,
                has_alpha: row.asset_has_alpha,
                vector_svg: row.vector_svg,
                meta: row.asset_meta
              } : null
            }
          };

        case 'IMAGE':
          return {
            ...baseLayer,
            image: {
              asset_id: row.image_asset_id,
              crop: row.crop,
              fit: row.fit,
              rounding: row.rounding,
              blur: row.blur,
              brightness: row.brightness,
              contrast: row.contrast,
              asset: row.asset_id ? {
                id: row.asset_id,
                kind: row.asset_kind,
                name: row.asset_name,
                url: row.asset_url,
                width: row.asset_width,
                height: row.asset_height,
                has_alpha: row.asset_has_alpha,
                meta: row.asset_meta
              } : null
            }
          };

        case 'BACKGROUND':
          return {
            ...baseLayer,
            background: {
              mode: row.mode,
              fill_hex: row.bg_fill_hex,
              fill_alpha: row.bg_fill_alpha,
              gradient: row.bg_gradient,
              asset_id: row.bg_asset_id,
              repeat: row.repeat,
              position: row.position,
              size: row.size,
              asset: row.asset_id ? {
                id: row.asset_id,
                kind: row.asset_kind,
                name: row.asset_name,
                url: row.asset_url,
                width: row.asset_width,
                height: row.asset_height,
                has_alpha: row.asset_has_alpha,
                meta: row.asset_meta
              } : null
            }
          };

        default:
          return baseLayer;
      }
    });

    // Build the response in the expected JSON format
    const response = {
      logoId: logo.id.toString(),
      templateId: logo.template_id ? logo.template_id.toString() : null,
      userId: logo.owner_id || 'current_user',
      name: logo.title,
      description: logo.description || `Logo created on ${new Date(logo.created_at).toISOString()}`,
      canvas: {
        aspectRatio: logo.canvas_h ? logo.canvas_w / logo.canvas_h : 1.0,
        background: {
          type: logo.canvas_background_type || 'solid',
          solidColor: logo.canvas_background_solid_color || '#ffffff',
          gradient: logo.canvas_background_gradient || null,
          image: logo.canvas_background_image_path ? {
            type: logo.canvas_background_image_type || 'imported',
            path: logo.canvas_background_image_path
          } : null
        }
      },
      layers: layers.map(layer => ({
        layerId: layer.id.toString(),
        type: layer.type.toLowerCase(),
        visible: layer.is_visible,
        order: layer.z_index,
        position: {
          x: layer.x_norm,
          y: layer.y_norm
        },
        scaleFactor: layer.scale,
        rotation: layer.rotation_deg,
        opacity: layer.opacity,
        flip: {
          horizontal: layer.flip_horizontal || false,
          vertical: layer.flip_vertical || false
        },
        // Include type-specific data
        ...(layer.text && { text: {
          value: layer.text.content || '',
          font: layer.text.font?.family || 'Arial',
          fontColor: layer.text.fill_hex || '#000000',
          fontWeight: layer.text.font?.weight || 'normal',
          fontStyle: layer.text.font?.style || 'normal',
          alignment: layer.text.align || 'center',
          lineHeight: layer.text.line_height || 1.0,
          letterSpacing: layer.text.letter_spacing || 0
        }}),
        ...(layer.icon && { icon: {
          src: layer.icon.asset?.name || `icon_${layer.icon.asset_id}`,
          color: layer.icon.tint_hex || '#000000'
        }}),
        ...(layer.image && { image: {
          src: layer.image.asset?.url || '',
          color: layer.image.asset?.tint_hex || null
        }}),
        ...(layer.shape && { shape: {
          type: layer.shape.shape_kind || 'rect',
          color: layer.shape.fill_hex || '#000000',
          strokeColor: layer.shape.stroke_hex || null,
          strokeWidth: layer.shape.stroke_width || 0
        }}),
        ...(layer.background && { background: {
          type: layer.background.mode || 'solid',
          color: layer.background.fill_hex || '#ffffff',
          image: layer.background.asset?.url ? {
            type: 'imported',
            path: layer.background.asset.url
          } : null
        }})
      })),
      colorsUsed: logo.colors_used || [],
      alignments: {
        verticalAlign: logo.vertical_align || 'center',
        horizontalAlign: logo.horizontal_align || 'center'
      },
      responsive: {
        version: logo.responsive_version || '3.0',
        description: logo.responsive_description || 'Fully responsive logo data - no absolute sizes stored',
        scalingMethod: logo.scaling_method || 'scaleFactor',
        positionMethod: logo.position_method || 'relative',
        fullyResponsive: logo.fully_responsive || true
      },
      metadata: {
        createdAt: new Date(logo.created_at).toISOString(),
        updatedAt: new Date(logo.updated_at).toISOString(),
        tags: logo.tags || ['logo', 'design', 'responsive'],
        version: logo.version || 3,
        responsive: logo.responsive || true
      },
      export: {
        format: logo.export_format || 'png',
        transparentBackground: logo.export_transparent_background || true,
        quality: logo.export_quality || 100,
        responsive: {
          scalable: logo.export_scalable || true,
          maintainAspectRatio: logo.export_maintain_aspect_ratio || true
        }
      }
    };

    res.json({ 
      success: true, 
      data: response
    });
  } catch (error) {
    console.error('Error fetching logo with layers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logo' });
  }
});

module.exports = router;



