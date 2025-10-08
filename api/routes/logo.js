const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');

// ==============================================
// STATIC ROUTES FIRST (avoid shadowing by /:id)
// ==============================================

// GET /api/logo/thumbnails - Get lightweight logo list with thumbnails grouped by category
router.get('/thumbnails', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
    const categoryId = req.query.category_id;
    const offset = (page - 1) * limit;

    // Build query with optional category filter
    let whereClause = '';
    let queryParams = [limit, offset];
    
    if (categoryId) {
      whereClause = 'WHERE l.category_id = $3';
      queryParams = [limit, offset, categoryId];
    }

    const logosRes = await query(`
      SELECT 
        l.id,
        l.title,
        l.thumbnail_url,
        l.category_id,
        c.name as category_name,
        l.created_at,
        l.updated_at
      FROM logos l
      LEFT JOIN categories c ON c.id = l.category_id
      ${whereClause}
      ORDER BY l.category_id ASC, l.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*)::int AS total FROM logos l';
    let countParams = [];
    
    if (categoryId) {
      countQuery += ' WHERE l.category_id = $1';
      countParams = [categoryId];
    }
    
    const totalRes = await query(countQuery, countParams);
    const total = totalRes.rows[0].total;

    // Format response data
    const formattedLogos = logosRes.rows.map(logo => ({
      id: logo.id,
      title: logo.title,
      thumbnailUrl: logo.thumbnail_url,
      categoryId: logo.category_id,
      categoryName: logo.category_name,
      createdAt: new Date(logo.created_at).toISOString(),
      updatedAt: new Date(logo.updated_at).toISOString()
    }));

    // Group logos by category into list of lists
    const categoryGroups = [];
    const categoryMap = new Map();

    formattedLogos.forEach(logo => {
      const categoryKey = logo.categoryId || 'uncategorized';
      const categoryName = logo.categoryName || 'Uncategorized';
      
      if (!categoryMap.has(categoryKey)) {
        const categoryGroup = {
          categoryId: logo.categoryId,
          categoryName: categoryName,
          logos: []
        };
        categoryMap.set(categoryKey, categoryGroup);
        categoryGroups.push(categoryGroup);
      }
      
      categoryMap.get(categoryKey).logos.push(logo);
    });

    // Convert to list of lists format as requested
    const groupedData = categoryGroups.map(group => ({
      category: {
        id: group.categoryId,
        name: group.categoryName
      },
      logos: group.logos
    }));

    res.json({ 
      success: true, 
      data: groupedData,
      pagination: { 
        page, 
        limit, 
        total, 
        pages: Math.ceil(total / limit),
        categoriesCount: categoryGroups.length
      } 
    });
  } catch (err) {
    console.error('Error fetching logo thumbnails:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch logo thumbnails' });
  }
});

// GET /api/logo/mobile - list all logos in mobile-compatible format (paginated)
router.get('/mobile', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)));
    const offset = (page - 1) * limit;

    const logosRes = await query(`
      SELECT l.*
      FROM logos l
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    if (logosRes.rows.length === 0) {
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const logoIds = logosRes.rows.map(r => r.id);

    const layersRes = await query(`
      SELECT
        lay.*,
        lt.content, lt.font_id, lt.font_size, lt.line_height, lt.letter_spacing,
        lt.align, lt.baseline, lt.fill_hex, lt.fill_alpha, lt.stroke_hex,
        lt.stroke_alpha, lt.stroke_width, lt.stroke_align, lt.gradient as text_gradient,
        ls.shape_kind, ls.svg_path, ls.points, ls.rx, ls.ry,
        ls.fill_hex as shape_fill_hex, ls.fill_alpha as shape_fill_alpha,
        ls.gradient as shape_gradient, ls.stroke_hex as shape_stroke_hex,
        ls.stroke_alpha as shape_stroke_alpha, ls.stroke_width as shape_stroke_width,
        ls.stroke_dash, ls.line_cap, ls.line_join, ls.meta as shape_meta,
        li.asset_id as icon_asset_id, li.tint_hex, li.tint_alpha, li.allow_recolor,
        lim.asset_id as image_asset_id, lim.crop, lim.fit, lim.rounding, lim.blur, lim.brightness, lim.contrast,
        lb.mode, lb.fill_hex as bg_fill_hex, lb.fill_alpha as bg_fill_alpha,
        lb.gradient as bg_gradient, lb.asset_id as bg_asset_id, lb.repeat, lb.position, lb.size,
        ai.id as asset_id, ai.kind as asset_kind, ai.name as asset_name, ai.url as asset_url,
        ai.width as asset_width, ai.height as asset_height, ai.has_alpha as asset_has_alpha, ai.vector_svg, ai.meta as asset_meta,
        f.family as font_family, f.style as font_style, f.weight as font_weight, f.url as font_url, f.fallbacks as font_fallbacks
      FROM layers lay
      LEFT JOIN layer_text lt ON lt.layer_id = lay.id
      LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
      LEFT JOIN layer_icon li  ON li.layer_id  = lay.id
      LEFT JOIN layer_image lim ON lim.layer_id = lay.id
      LEFT JOIN layer_background lb ON lb.layer_id = lay.id
      LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id OR ai.id = lb.asset_id)
      LEFT JOIN fonts f ON f.id = lt.font_id
      WHERE lay.logo_id = ANY($1::uuid[])
      ORDER BY lay.logo_id, lay.z_index ASC, lay.created_at ASC
    `, [logoIds]);

    const byLogo = new Map();
    for (const row of layersRes.rows) {
      if (!byLogo.has(row.logo_id)) byLogo.set(row.logo_id, []);
      byLogo.get(row.logo_id).push(row);
    }

    const num = v => (v === null || v === undefined ? null : typeof v === 'number' ? v : parseFloat(v));
    const mapRowToMobileLayer = (row) => {
      const baseLayer = {
        layerId: row.id.toString(),
        type: row.type.toLowerCase(),
        visible: !!row.is_visible,
        order: row.z_index | 0,
        position: { x: num(row.x_norm) ?? 0.5, y: num(row.y_norm) ?? 0.5 },
        scaleFactor: num(row.scale) ?? 1,
        rotation: num(row.rotation_deg) ?? 0,
        opacity: num(row.opacity) ?? 1,
        flip: { horizontal: !!row.flip_horizontal, vertical: !!row.flip_vertical }
      };
      switch (row.type) {
        case 'TEXT':
          return {
            ...baseLayer,
            text: {
              value: row.content || '',
              font: row.font_family || 'Arial',
              fontColor: row.fill_hex || '#000000',
              fontWeight: row.font_weight || 'normal',
              fontStyle: row.font_style || 'normal',
              alignment: row.align || 'center',
              lineHeight: num(row.line_height) ?? 1.0,
              letterSpacing: num(row.letter_spacing) ?? 0
            }
          };
        case 'ICON':
          return {
            ...baseLayer,
            icon: { src: row.asset_name || (row.asset_id ? `icon_${row.asset_id}` : ''), color: row.tint_hex || '#000000' }
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
              image: row.asset_url ? { type: 'imported', path: row.asset_url } : null
            }
          };
        default:
          return baseLayer;
      }
    };

    const data = logosRes.rows.map(logo => {
      const rows = byLogo.get(logo.id) ?? [];

      const colorsUsed = [];
      for (const r of rows) {
        if (r.fill_hex && r.type === 'TEXT') colorsUsed.push({ role: 'text', color: r.fill_hex });
        if (r.tint_hex && (r.type === 'ICON' || r.type === 'IMAGE')) colorsUsed.push({ role: 'icon', color: r.tint_hex });
        if (r.shape_fill_hex && r.type === 'SHAPE') colorsUsed.push({ role: 'shape', color: r.shape_fill_hex });
      }
      const uniqueColors = colorsUsed.filter((c, i, self) => i === self.findIndex(x => x.role === c.role && x.color === c.color));

      const computedColors = uniqueColors;
      const dbColors = Array.isArray(logo.colors_used) ? logo.colors_used : null;
      const colorsUsedFinal = (dbColors && dbColors.length > 0) ? dbColors : computedColors;

      return {
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
            image: logo.canvas_background_image_path ? { type: logo.canvas_background_image_type || 'imported', path: logo.canvas_background_image_path } : null
          }
        },
        layers: rows.map(mapRowToMobileLayer),
        colorsUsed: colorsUsedFinal,
        alignments: { verticalAlign: logo.vertical_align || 'center', horizontalAlign: logo.horizontal_align || 'center' },
        responsive: {
          version: logo.responsive_version || '3.0',
          description: logo.responsive_description || 'Fully responsive logo data - no absolute sizes stored',
          scalingMethod: logo.scaling_method || 'scaleFactor',
          positionMethod: logo.position_method || 'relative',
          fullyResponsive: logo.fully_responsive ?? true
        },
        metadata: {
          createdAt: new Date(logo.created_at).toISOString(),
          updatedAt: new Date(logo.updated_at).toISOString(),
          tags: Array.isArray(logo.tags) ? logo.tags : ['logo', 'design', 'responsive'],
          version: logo.version || 3,
          responsive: logo.responsive ?? true
        },
        export: {
          format: logo.export_format || 'png',
          transparentBackground: logo.export_transparent_background ?? true,
          quality: logo.export_quality || 100,
          responsive: { scalable: logo.export_scalable ?? true, maintainAspectRatio: logo.export_maintain_aspect_ratio ?? true }
        }
      };
    });

    const totalRes = await query(`SELECT COUNT(*)::int AS total FROM logos`);
    const total = totalRes.rows[0].total;

    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching mobile logos list:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch logos' });
  }
});

// Keep POST /mobile above parameterized routes to avoid shadowing by POST /:id
// POST /api/logo/mobile - Create logo from mobile-compatible format
router.post('/mobile', async (req, res) => {
  const client = await getClient();
  try {
    const {
      logoId,
      templateId,
      userId,
      name,
      description,
      canvas,
      layers = [],
      colorsUsed = [],
      alignments,
      responsive,
      metadata,
      export: exportSettings
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    await client.query('BEGIN');

    let ownerId = userId;
    if (userId && !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      try {
        const userRes = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [userId]);
        if (userRes.rows.length > 0) {
          ownerId = userRes.rows[0].id;
        } else {
          const newUserRes = await client.query(`INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id`, [userId, userId]);
          ownerId = newUserRes.rows[0].id;
        }
      } catch (userError) {
        console.log('Could not create user, using null owner_id');
        ownerId = null;
        // If user creation failed, we need to rollback and restart the transaction
        await client.query('ROLLBACK');
        await client.query('BEGIN');
      }
    }

    let logoRes;
    if (logoId) {
      logoRes = await client.query(`
        INSERT INTO logos (
          id, owner_id, title, description, canvas_w, canvas_h, dpi, is_template, template_id,
          colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
          scaling_method, position_method, fully_responsive, tags, version, responsive,
          export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
          canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
          canvas_background_image_type, canvas_background_image_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
        RETURNING *
      `, [
        logoId, ownerId, name, description || `Logo created on ${new Date().toISOString()}`,
        canvas?.aspectRatio ? 1080 : 1080, canvas?.aspectRatio ? Math.round(1080 / canvas.aspectRatio) : 1080,
        300, !!templateId, templateId || null, JSON.stringify(colorsUsed),
        alignments?.verticalAlign || 'center', alignments?.horizontalAlign || 'center',
        responsive?.version || '3.0', responsive?.description || 'Fully responsive logo data - no absolute sizes stored',
        responsive?.scalingMethod || 'scaleFactor', responsive?.positionMethod || 'relative',
        responsive?.fullyResponsive || true, JSON.stringify(metadata?.tags || ['logo', 'design', 'responsive']),
        metadata?.version || 3, metadata?.responsive || true, exportSettings?.format || 'png',
        exportSettings?.transparentBackground || true, exportSettings?.quality || 100,
        exportSettings?.responsive?.scalable || true, exportSettings?.responsive?.maintainAspectRatio || true,
        canvas?.background?.type || 'solid', canvas?.background?.solidColor || '#ffffff',
        canvas?.background?.gradient || null, canvas?.background?.image?.type || null,
        canvas?.background?.image?.path || null
      ]);
    } else {
      logoRes = await client.query(`
        INSERT INTO logos (
          owner_id, title, description, canvas_w, canvas_h, dpi, is_template, template_id,
          colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
          scaling_method, position_method, fully_responsive, tags, version, responsive,
          export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
          canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
          canvas_background_image_type, canvas_background_image_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
        RETURNING *
      `, [
        ownerId, name, description || `Logo created on ${new Date().toISOString()}`,
        canvas?.aspectRatio ? 1080 : 1080, canvas?.aspectRatio ? Math.round(1080 / canvas.aspectRatio) : 1080,
        300, !!templateId, templateId || null, JSON.stringify(colorsUsed),
        alignments?.verticalAlign || 'center', alignments?.horizontalAlign || 'center',
        responsive?.version || '3.0', responsive?.description || 'Fully responsive logo data - no absolute sizes stored',
        responsive?.scalingMethod || 'scaleFactor', responsive?.positionMethod || 'relative',
        responsive?.fullyResponsive || true, JSON.stringify(metadata?.tags || ['logo', 'design', 'responsive']),
        metadata?.version || 3, metadata?.responsive || true, exportSettings?.format || 'png',
        exportSettings?.transparentBackground || true, exportSettings?.quality || 100,
        exportSettings?.responsive?.scalable || true, exportSettings?.responsive?.maintainAspectRatio || true,
        canvas?.background?.type || 'solid', canvas?.background?.solidColor || '#ffffff',
        canvas?.background?.gradient || null, canvas?.background?.image?.type || null,
        canvas?.background?.image?.path || null
      ]);
    }

    const logo = logoRes.rows[0];
    const createdLayers = [];
    for (const layerData of layers) {
      const { layerId, type, visible = true, order = 0, position = { x: 0.5, y: 0.5 }, scaleFactor = 1, rotation = 0, opacity = 1, flip = { horizontal: false, vertical: false }, text, icon, image, shape, background } = layerData;
      const dbType = type.toUpperCase();

      let layerRes;
      if (layerId && layerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        layerRes = await client.query(`
          INSERT INTO layers (
            id, logo_id, type, name, z_index, x_norm, y_norm, scale, rotation_deg,
            anchor_x, anchor_y, opacity, blend_mode, is_visible, is_locked,
            flip_horizontal, flip_vertical
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *
        `, [layerId, logo.id, dbType, `${type}_layer_${order}`, order, position.x, position.y, scaleFactor, rotation, 0.5, 0.5, opacity, 'normal', visible, false, flip.horizontal, flip.vertical]);
      } else {
        layerRes = await client.query(`
          INSERT INTO layers (
            logo_id, type, name, z_index, x_norm, y_norm, scale, rotation_deg,
            anchor_x, anchor_y, opacity, blend_mode, is_visible, is_locked,
            flip_horizontal, flip_vertical
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `, [logo.id, dbType, `${type}_layer_${order}`, order, position.x, position.y, scaleFactor, rotation, 0.5, 0.5, opacity, 'normal', visible, false, flip.horizontal, flip.vertical]);
      }

      const layer = layerRes.rows[0];
      switch (dbType) {
        case 'TEXT':
          if (text) {
            await client.query(`
              INSERT INTO layer_text (
                layer_id, content, font_size, line_height, letter_spacing,
                align, fill_hex, fill_alpha
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [layer.id, text.value || '', text.fontSize || 48, text.lineHeight || 1.0, text.letterSpacing || 0, text.alignment || 'center', text.fontColor || '#000000', 1.0]);
          }
          break;
        case 'ICON':
          if (icon) {
            const assetRes = await client.query(`SELECT id FROM assets WHERE name = $1 LIMIT 1`, [icon.src]);
            let assetId = assetRes.rows[0]?.id;
            if (!assetId) {
              const newAssetRes = await client.query(`INSERT INTO assets (kind, name, url, width, height, has_alpha) VALUES ('vector', $1, '', 100, 100, true) RETURNING id`, [icon.src]);
              assetId = newAssetRes.rows[0].id;
            }
            await client.query(`INSERT INTO layer_icon (layer_id, asset_id, tint_hex, tint_alpha) VALUES ($1, $2, $3, $4)`, [layer.id, assetId, icon.color || '#000000', 1.0]);
          }
          break;
        case 'IMAGE':
          if (image) {
            const assetRes = await client.query(`SELECT id FROM assets WHERE url = $1 LIMIT 1`, [image.src]);
            let assetId = assetRes.rows[0]?.id;
            if (!assetId) {
              const newAssetRes = await client.query(`INSERT INTO assets (kind, name, url, width, height, has_alpha) VALUES ('raster', $1, $2, 100, 100, true) RETURNING id`, [image.src, image.src]);
              assetId = newAssetRes.rows[0].id;
            }
            await client.query(`INSERT INTO layer_image (layer_id, asset_id, fit) VALUES ($1, $2, $3)`, [layer.id, assetId, 'contain']);
          }
          break;
        case 'SHAPE':
          if (shape) {
            await client.query(`
              INSERT INTO layer_shape (
                layer_id, shape_kind, fill_hex, fill_alpha, stroke_hex, stroke_width
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [layer.id, shape.type || 'rect', shape.color || '#000000', 1.0, shape.strokeColor || null, shape.strokeWidth || 0]);
          }
          break;
        case 'BACKGROUND':
          if (background) {
            await client.query(`
              INSERT INTO layer_background (
                layer_id, mode, fill_hex, fill_alpha, asset_id
              ) VALUES ($1, $2, $3, $4, $5)
            `, [layer.id, background.type || 'solid', background.color || '#ffffff', 1.0, null]);
          }
          break;
      }
      createdLayers.push(layer);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        logoId: logo.id.toString(),
        templateId: logo.template_id ? logo.template_id.toString() : null,
        userId: logo.owner_id,
        name: logo.title,
        description: logo.description,
        canvas: {
          aspectRatio: logo.canvas_h ? logo.canvas_w / logo.canvas_h : 1.0,
          background: {
            type: logo.canvas_background_type || 'solid',
            solidColor: logo.canvas_background_solid_color || '#ffffff',
            gradient: logo.canvas_background_gradient || null,
            image: logo.canvas_background_image_path ? { type: logo.canvas_background_image_type || 'imported', path: logo.canvas_background_image_path } : null
          }
        },
        layers: createdLayers.map(layer => ({
          layerId: layer.id.toString(),
          type: layer.type.toLowerCase(),
          visible: layer.is_visible,
          order: layer.z_index,
          position: { x: layer.x_norm, y: layer.y_norm },
          scaleFactor: layer.scale,
          rotation: layer.rotation_deg,
          opacity: layer.opacity,
          flip: { horizontal: layer.flip_horizontal, vertical: layer.flip_vertical }
        })),
        colorsUsed: colorsUsed,
        alignments: alignments || { verticalAlign: 'center', horizontalAlign: 'center' },
        responsive: responsive || { version: '3.0', description: 'Fully responsive logo data - no absolute sizes stored', scalingMethod: 'scaleFactor', positionMethod: 'relative', fullyResponsive: true },
        metadata: { createdAt: new Date(logo.created_at).toISOString(), updatedAt: new Date(logo.updated_at).toISOString(), tags: logo.tags || ['logo', 'design', 'responsive'], version: logo.version || 3, responsive: logo.responsive || true },
        export: exportSettings || { format: 'png', transparentBackground: true, quality: 100, responsive: { scalable: true, maintainAspectRatio: true } }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating logo from mobile format:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create logo' });
  } finally {
    client.release();
  }
});

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

    res.json({ 
      success: true, 
      data: { 
        ...logo, 
        layers 
      } 
    });
  } catch (error) {
    console.error('Error fetching logo with layers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logo' });
  }
});

// (removed duplicated legacy CRUD routes below; keeping newer implementations later in file)

// ==============================================
// MOBILE-COMPATIBLE ENDPOINTS
// ==============================================

// (Removed earlier duplicate mobile endpoints to use the robust versions below)

// POST /api/logo - Create new logo with layers
router.post('/', async (req, res) => {
  const client = await getClient();
  try {
    const { format } = req.query;
    
    // If mobile format is requested, redirect to mobile endpoint
    if (format === 'mobile') {
      return res.redirect('/api/logo/mobile');
    }
    
    const { 
      owner_id, 
      title, 
      description,
      canvas_w = 1080, 
      canvas_h = 1080, 
      dpi, 
      category_id, 
      is_template = false,
      template_id,
      colors_used = [],
      vertical_align = 'center',
      horizontal_align = 'center',
      responsive_version = '3.0',
      responsive_description = 'Fully responsive logo data - no absolute sizes stored',
      scaling_method = 'scaleFactor',
      position_method = 'relative',
      fully_responsive = true,
      tags = ['logo', 'design', 'responsive'],
      version = 3,
      responsive = true,
      export_format = 'png',
      export_transparent_background = true,
      export_quality = 100,
      export_scalable = true,
      export_maintain_aspect_ratio = true,
      canvas_background_type = 'solid',
      canvas_background_solid_color = '#ffffff',
      canvas_background_gradient = null,
      canvas_background_image_type = null,
      canvas_background_image_path = null,
      layers = [] 
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required' });
    }

    await client.query('BEGIN');

    // Handle owner_id - if it's not a valid UUID, create a user record or use a default
    let actualOwnerId = owner_id;
    if (owner_id && !owner_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // If owner_id is not a UUID, try to find or create a user
      try {
        const userRes = await client.query(`
          SELECT id FROM users WHERE email = $1 LIMIT 1
        `, [owner_id]);
        
        if (userRes.rows.length > 0) {
          actualOwnerId = userRes.rows[0].id;
        } else {
          // Create a new user with the owner_id as email
          const newUserRes = await client.query(`
            INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id
          `, [owner_id, owner_id]);
          actualOwnerId = newUserRes.rows[0].id;
        }
      } catch (userError) {
        console.log('Could not create user, using null owner_id');
        actualOwnerId = null;
        // If user creation failed, we need to rollback and restart the transaction
        await client.query('ROLLBACK');
        await client.query('BEGIN');
      }
    }

    // Create logo with all new fields
    const logoRes = await client.query(`
      INSERT INTO logos (
        owner_id, title, description, canvas_w, canvas_h, dpi, category_id, is_template, template_id,
        colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
        scaling_method, position_method, fully_responsive, tags, version, responsive,
        export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
        canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
        canvas_background_image_type, canvas_background_image_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *
    `, [
      actualOwnerId, title, description, canvas_w, canvas_h, dpi, category_id, is_template, template_id,
      JSON.stringify(colors_used), vertical_align, horizontal_align, responsive_version, responsive_description,
      scaling_method, position_method, fully_responsive, JSON.stringify(tags), version, responsive,
      export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
      canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
      canvas_background_image_type, canvas_background_image_path
    ]);

    const logo = logoRes.rows[0];
    const createdLayers = [];

    // Process each layer
    for (const layerData of layers) {
      const {
        type, name, z_index = 0, x_norm = 0.5, y_norm = 0.5, scale = 1,
        rotation_deg = 0, anchor_x = 0.5, anchor_y = 0.5, opacity = 1,
        blend_mode = 'normal', is_visible = true, is_locked = false,
        flip_horizontal = false, flip_vertical = false,
        common_style, text, shape, icon, image, background
      } = layerData;

      // Create base layer
      const layerRes = await client.query(`
        INSERT INTO layers (
          logo_id, type, name, z_index, x_norm, y_norm, scale, rotation_deg,
          anchor_x, anchor_y, opacity, blend_mode, is_visible, is_locked, common_style,
          flip_horizontal, flip_vertical
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        logo.id, type, name, z_index, x_norm, y_norm, scale, rotation_deg,
        anchor_x, anchor_y, opacity, blend_mode, is_visible, is_locked, common_style,
        flip_horizontal, flip_vertical
      ]);

      const layer = layerRes.rows[0];

      // Create type-specific data
      switch (type) {
        case 'TEXT':
          if (text) {
            await client.query(`
              INSERT INTO layer_text (
                layer_id, content, font_id, font_size, line_height, letter_spacing,
                align, baseline, fill_hex, fill_alpha, stroke_hex, stroke_alpha,
                stroke_width, stroke_align, gradient
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
              layer.id, text.content, text.font_id, text.font_size, text.line_height,
              text.letter_spacing, text.align, text.baseline, text.fill_hex, text.fill_alpha,
              text.stroke_hex, text.stroke_alpha, text.stroke_width, text.stroke_align, text.gradient
            ]);
          }
          break;

        case 'SHAPE':
          if (shape) {
            await client.query(`
              INSERT INTO layer_shape (
                layer_id, shape_kind, svg_path, points, rx, ry, fill_hex, fill_alpha,
                gradient, stroke_hex, stroke_alpha, stroke_width, stroke_dash,
                line_cap, line_join, meta
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            `, [
              layer.id, shape.shape_kind, shape.svg_path, shape.points, shape.rx, shape.ry,
              shape.fill_hex, shape.fill_alpha, shape.gradient, shape.stroke_hex,
              shape.stroke_alpha, shape.stroke_width, shape.stroke_dash, shape.line_cap,
              shape.line_join, shape.meta
            ]);
          }
          break;

        case 'ICON':
          if (icon && icon.asset_id) {
            await client.query(`
              INSERT INTO layer_icon (layer_id, asset_id, tint_hex, tint_alpha, allow_recolor)
              VALUES ($1, $2, $3, $4, $5)
            `, [layer.id, icon.asset_id, icon.tint_hex, icon.tint_alpha, icon.allow_recolor]);
          }
          break;

        case 'IMAGE':
          if (image && image.asset_id) {
            await client.query(`
              INSERT INTO layer_image (layer_id, asset_id, crop, fit, rounding, blur, brightness, contrast)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              layer.id, image.asset_id, image.crop, image.fit, image.rounding,
              image.blur, image.brightness, image.contrast
            ]);
          }
          break;

        case 'BACKGROUND':
          if (background) {
            await client.query(`
              INSERT INTO layer_background (
                layer_id, mode, fill_hex, fill_alpha, gradient, asset_id, repeat, position, size
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              layer.id, background.mode, background.fill_hex, background.fill_alpha,
              background.gradient, background.asset_id, background.repeat,
              background.position, background.size
            ]);
          }
          break;
      }

      createdLayers.push(layer);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ...logo,
        layers: createdLayers
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating logo:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create logo' });
  } finally {
    client.release();
  }
});

// PATCH /api/logo/:id - Update logo
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const setClause = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined && key !== 'layers') {
        paramCount++;
        setClause.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
      }
    });

    if (setClause.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    paramCount++;
    values.push(id);

    const result = await query(`
      UPDATE logos 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ success: false, message: 'Failed to update logo' });
  }
});

// DELETE /api/logo/:id - Delete logo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM logos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }

    res.json({ 
      success: true, 
      message: 'Logo deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ success: false, message: 'Failed to delete logo' });
  }
});

// POST /api/logo/:id/version - Create version snapshot
router.post('/:id/version', async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    // Get current logo with all layers
    const logoResult = await query('SELECT get_logo_with_layers($1) as snapshot', [id]);
    
    if (!logoResult.rows[0].snapshot) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }

    // Create version
    const versionResult = await query(`
      INSERT INTO logo_versions (logo_id, snapshot, note)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, logoResult.rows[0].snapshot, note]);

    res.status(201).json({
      success: true,
      data: versionResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating version:', error);
    res.status(500).json({ success: false, message: 'Failed to create version' });
  }
});

// GET /api/logo/:id/versions - Get logo versions
router.get('/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT id, logo_id, snapshot, note, created_at
      FROM logo_versions
      WHERE logo_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total FROM logo_versions WHERE logo_id = $1
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch versions' });
  }
});

// ==============================================
// MOBILE-COMPATIBLE ENDPOINTS
// ==============================================

// GET /api/logo/:id/mobile - Get logo in mobile-compatible format
router.get('/:id/mobile', async (req, res) => {
  try {
    const { id } = req.params;

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
              fontColor: row.fill_hex || '#000000',
              fontWeight: row.font_weight || 'normal',
              fontStyle: row.font_style || 'normal',
              alignment: row.align || 'center',
              lineHeight: num(row.line_height) ?? 1.0,
              letterSpacing: num(row.letter_spacing) ?? 0
            }
          };

        case 'ICON':
          return {
            ...baseLayer,
            icon: { src: row.asset_name || (row.asset_id ? `icon_${row.asset_id}` : ''), color: row.tint_hex || '#000000' }
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
                path: row.asset_url
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

    // Build mobile-compatible response
    const mobileResponse = {
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

    res.json(mobileResponse);
  } catch (error) {
    console.error('Error fetching logo in mobile format:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logo' });
  }
});


// GET /api/logo/:id/mobile-structured - Return exact mobile JSON structure as requested
router.get('/:id/mobile-structured', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch logo with full set of mobile-related fields
    const logoRes = await query(`
      SELECT 
        l.id, l.owner_id, l.title, l.description, l.canvas_w, l.canvas_h,
        l.is_template, l.template_id,
        l.colors_used, l.vertical_align, l.horizontal_align,
        l.responsive_version, l.responsive_description, l.scaling_method, l.position_method,
        l.fully_responsive, l.tags, l.version, l.responsive,
        l.export_format, l.export_transparent_background, l.export_quality,
        l.export_scalable, l.export_maintain_aspect_ratio,
        l.canvas_background_type, l.canvas_background_solid_color, l.canvas_background_gradient,
        l.canvas_background_image_type, l.canvas_background_image_path,
        l.created_at, l.updated_at
      FROM logos l
      WHERE l.id = $1
    `, [id]);

    if (logoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }

    const logo = logoRes.rows[0];

    // Fetch layers with joins for type-specific and asset/font data
    const layersRes = await query(`
      SELECT 
        lay.id, lay.logo_id, lay.type, lay.z_index, lay.x_norm, lay.y_norm, lay.scale, lay.rotation_deg,
        lay.opacity, lay.is_visible, lay.flip_horizontal, lay.flip_vertical,
        -- Text
        lt.content, lt.line_height, lt.letter_spacing, lt.align,
        f.family as font_family, f.style as font_style, f.weight as font_weight,
        lt.fill_hex,
        -- Icon
        li.asset_id as icon_asset_id, li.tint_hex,
        -- Image
        lim.asset_id as image_asset_id,
        -- Background
        lb.mode as bg_mode, lb.fill_hex as bg_fill_hex, ai_bg.url as bg_asset_url,
        -- Asset data (icon/image)
        ai.id as asset_id, ai.name as asset_name, ai.url as asset_url
      FROM layers lay
      LEFT JOIN layer_text lt ON lt.layer_id = lay.id
      LEFT JOIN fonts f ON f.id = lt.font_id
      LEFT JOIN layer_icon li ON li.layer_id = lay.id
      LEFT JOIN layer_image lim ON lim.layer_id = lay.id
      LEFT JOIN layer_background lb ON lb.layer_id = lay.id
      LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id)
      LEFT JOIN assets ai_bg ON ai_bg.id = lb.asset_id
      WHERE lay.logo_id = $1
      ORDER BY lay.z_index ASC, lay.created_at ASC
    `, [id]);

    const num = v => (v === null || v === undefined ? null : typeof v === 'number' ? v : parseFloat(v));
    const layers = layersRes.rows.map(row => {
      const base = {
        layerId: row.id.toString(),
        type: row.type.toLowerCase(),
        visible: !!row.is_visible,
        order: row.z_index | 0,
        position: { x: num(row.x_norm) ?? 0.5, y: num(row.y_norm) ?? 0.5 },
        scaleFactor: num(row.scale) ?? 1,
        rotation: num(row.rotation_deg) ?? 0,
        opacity: num(row.opacity) ?? 1,
        flip: { horizontal: !!row.flip_horizontal, vertical: !!row.flip_vertical }
      };

      switch (row.type) {
        case 'TEXT':
          return {
            ...base,
            text: {
              value: row.content || '',
              font: row.font_family || 'Arial',
              fontColor: row.fill_hex || '#000000',
              fontWeight: row.font_weight || 'normal',
              fontStyle: row.font_style || 'normal',
              alignment: row.align || 'center',
              lineHeight: num(row.line_height) ?? 1.0,
              letterSpacing: num(row.letter_spacing) ?? 0
            }
          };
        case 'ICON':
          return {
            ...base,
            icon: { src: row.asset_name ? row.asset_name : (row.asset_id ? `icon_${row.asset_id}` : ''), color: row.tint_hex || '#000000' }
          };
        case 'IMAGE':
          return {
            ...base,
            image: { type: 'imported', path: row.asset_url || '' }
          };
        case 'BACKGROUND':
          return {
            ...base,
            background: {
              type: row.bg_mode || 'solid',
              color: row.bg_fill_hex || '#ffffff',
              image: row.bg_asset_url ? { type: 'imported', path: row.bg_asset_url } : null
            }
          };
        default:
          return base;
      }
    });

    // Colors used aggregation
    const colorsUsed = [];
    layersRes.rows.forEach(row => {
      if (row.fill_hex && row.type === 'TEXT') {
        colorsUsed.push({ role: 'text', color: row.fill_hex });
      }
      if (row.tint_hex && row.type === 'ICON') {
        colorsUsed.push({ role: 'icon', color: row.tint_hex });
      }
    });
    const uniqueColors = colorsUsed.filter((c, i, self) => i === self.findIndex(x => x.role === c.role && x.color === c.color));

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
          solidColor: logo.canvas_background_solid_color || null,
          gradient: logo.canvas_background_gradient || null,
          image: logo.canvas_background_image_path ? { type: logo.canvas_background_image_type || 'imported', path: logo.canvas_background_image_path } : null
        }
      },
      layers,
      colorsUsed: Array.isArray(logo.colors_used) ? logo.colors_used : uniqueColors,
      alignments: {
        verticalAlign: logo.vertical_align || 'center',
        horizontalAlign: logo.horizontal_align || 'center'
      },
      responsive: {
        version: logo.responsive_version || '3.0',
        description: logo.responsive_description || 'Fully responsive logo data - no absolute sizes stored',
        scalingMethod: logo.scaling_method || 'scaleFactor',
        positionMethod: logo.position_method || 'relative',
        fullyResponsive: logo.fully_responsive ?? true
      },
      metadata: {
        createdAt: new Date(logo.created_at).toISOString(),
        updatedAt: new Date(logo.updated_at).toISOString(),
        tags: Array.isArray(logo.tags) ? logo.tags : ['logo', 'design', 'responsive'],
        version: logo.version || 3,
        responsive: logo.responsive ?? true
      },
      export: {
        format: logo.export_format || 'png',
        transparentBackground: logo.export_transparent_background ?? true,
        quality: logo.export_quality || 100,
        responsive: {
          scalable: logo.export_scalable ?? true,
          maintainAspectRatio: logo.export_maintain_aspect_ratio ?? true
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching mobile-structured logo:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logo' });
  }
});

// (removed older duplicate list route block; unified above)

module.exports = router;


