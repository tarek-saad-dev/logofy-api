// controllers/logoMobile.js
const { query } = require('../config/database');
const { ok, fail } = require('../utils/envelope');
const { applyLegacyIfRequested } = require('../utils/gradient');
const { formatISOToLocale } = require('../utils/date');

/**
 * Get logo in mobile format with envelope and legacy support
 */
async function getLogoMobile(req, res, next) {
  try {
    const lang = res.locals.lang ?? "en";
    const wantLegacy = (req.query.format === "legacy");

    const { id } = req.params;

    // Fetch logo basic info with all new fields including multilingual support
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
        -- Multilingual fields
        l.title_en, l.title_ar, l.description_en, l.description_ar, l.tags_en, l.tags_ar,
        -- Category multilingual fields
        c.name as category_name, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM logos l
      LEFT JOIN categories c ON c.id = l.category_id
      WHERE l.id = $1
    `, [id]);

    if (logoRes.rows.length === 0) {
      return res.status(404).json(fail(lang, lang === "ar" ? "الشعار غير موجود" : "Logo not found"));
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
        lt.underline, lt.underline_direction, lt.text_case, lt.font_style, lt.font_weight,
        lt.text_decoration, lt.text_transform, lt.font_variant,
        
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

    // Process layers into mobile-compatible format
    const num = v => (v === null || v === undefined ? null : typeof v === 'number' ? v : parseFloat(v));
    const layers = layersRes.rows.map(row => {
      const baseLayer = {
        layerId: row.id.toString(),
        type: row.type.toLowerCase(),
        visible: !!row.is_visible,
        order: row.z_index | 0,
        position: {
          x: num(row.x_norm) ?? 0.5,
          y: num(row.y_norm) ?? 0.5
        },
        scaleFactor: num(row.scale) ?? 1,
        rotation: num(row.rotation_deg) ?? 0,
        opacity: num(row.opacity) ?? 1,
        flip: {
          horizontal: !!row.flip_horizontal,
          vertical: !!row.flip_vertical
        }
      };

      // Add type-specific properties
      switch (row.type) {
        case 'TEXT':
          return {
            ...baseLayer,
            text: {
              value: row.content || '',
              font: row.font_family || 'Arial',
              fontSize: num(row.font_size) ?? 48,
              fontColor: row.fill_hex || '#000000',
              fontWeight: row.font_weight || 'normal',
              fontStyle: row.font_style || 'normal',
              alignment: row.align || 'center',
              baseline: row.baseline || 'alphabetic',
              lineHeight: num(row.line_height) ?? 1.0,
              letterSpacing: num(row.letter_spacing) ?? 0,
              fillAlpha: num(row.fill_alpha) ?? 1.0,
              strokeHex: row.stroke_hex || null,
              strokeAlpha: num(row.stroke_alpha) ?? null,
              strokeWidth: num(row.stroke_width) ?? null,
              strokeAlign: row.stroke_align || null,
              gradient: row.text_gradient || null,
              underline: row.underline || false,
              underlineDirection: row.underline_direction || 'horizontal',
              textCase: row.text_case || 'normal',
              fontStyle: row.font_style || 'normal',
              fontWeight: row.font_weight || 'normal',
              textDecoration: row.text_decoration || 'none',
              textTransform: row.text_transform || 'none',
              fontVariant: row.font_variant || 'normal'
            }
          };

        case 'ICON':
          return {
            ...baseLayer,
            icon: { 
              src: row.asset_url || row.asset_name || (row.asset_id ? `icon_${row.asset_id}` : ''), 
              color: row.tint_hex || '#000000' 
            }
          };

        case 'IMAGE':
          return {
            ...baseLayer,
            image: row.asset_url ? { type: 'imported', path: row.asset_url } : null
          };

        case 'SHAPE':
          return {
            ...baseLayer,
            shape: {
              src: row.shape_meta?.src || null,
              type: row.shape_kind || 'rect',
              color: row.shape_fill_hex || '#000000',
              strokeColor: row.shape_stroke_hex || null,
              strokeWidth: num(row.shape_stroke_width) ?? 0
            }
          };

        case 'BACKGROUND':
          return {
            ...baseLayer,
            background: {
              type: row.mode || 'solid',
              color: row.bg_fill_hex || '#ffffff',
              image: row.asset_url ? {
                type: 'imported',
                path: row.asset_url,
                src: row.asset_name || row.asset_url
              } : null
            }
          };

        default:
          return baseLayer;
      }
    });

    // Extract colors used from layers
    const colorsUsed = [];
    layersRes.rows.forEach(row => {
      if (row.fill_hex && row.type === 'TEXT') {
        colorsUsed.push({
          role: 'text',
          color: row.fill_hex
        });
      }
      if (row.tint_hex && (row.type === 'ICON' || row.type === 'IMAGE')) {
        colorsUsed.push({
          role: 'icon',
          color: row.tint_hex
        });
      }
      if (row.shape_fill_hex && row.type === 'SHAPE') {
        colorsUsed.push({
          role: 'shape',
          color: row.shape_fill_hex
        });
      }
    });

    // Remove duplicates
    const uniqueColors = colorsUsed.filter((color, index, self) => 
      index === self.findIndex(c => c.color === color.color && c.role === color.role)
    );

    // Build canvas with legacy support
    const canvas = {
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
    };

    // Apply legacy transformation if requested
    const transformedCanvas = applyLegacyIfRequested(canvas, wantLegacy);

    // Format dates
    const createdAtFormatted = formatISOToLocale(logo.created_at, lang);
    const updatedAtFormatted = formatISOToLocale(logo.updated_at, lang);

    // Build mobile-compatible response with localization
    const mobileResponse = {
      logoId: logo.id.toString(),
      templateId: logo.template_id ? logo.template_id.toString() : null,
      userId: logo.owner_id || 'current_user',
      name: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
      description: lang === 'ar' ? (logo.description_ar || logo.description_en || logo.description) : (logo.description_en || logo.description) || `Logo created on ${new Date(logo.created_at).toISOString()}`,
      canvas: transformedCanvas,
      layers: layers,
      colorsUsed: logo.colors_used || uniqueColors,
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
        responsive: logo.responsive || true,
        // Add formatted dates
        createdAtFormatted,
        updatedAtFormatted
      },
      export: {
        format: logo.export_format || 'png',
        transparentBackground: logo.export_transparent_background || true,
        quality: logo.export_quality || 100,
        responsive: {
          scalable: logo.export_scalable || true,
          maintainAspectRatio: logo.export_maintain_aspect_ratio || true
        }
      },
      // Add language metadata
      language: lang,
      direction: lang === 'ar' ? 'rtl' : 'ltr'
    };

    return res.json(ok(mobileResponse, lang, lang === "ar" ? "تم جلب الشعار بنجاح" : "Logo fetched successfully"));
  } catch (error) {
    console.error('Error fetching logo in mobile format:', error);
    const lang = res.locals.lang ?? "en";
    return res.status(500).json(fail(lang, lang === "ar" ? "خطأ في الخادم" : "Internal server error"));
  }
}

module.exports = {
  getLogoMobile
};
