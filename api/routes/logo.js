const express = require('express');
const router = express.Router();
const { query, getClient } = require('../config/database');
const { localization } = require('../middleware/localization');
const { ok, fail } = require('../utils/envelope');
const { getLogoMobile } = require('../controllers/logoMobile');
const { getLogoMobileLegacy, getAllLogosMobileLegacy } = require('../controllers/logoMobileLegacy');

// ==============================================
// GRADIENT TRANSFORMATION UTILITIES
// ==============================================

/**
 * Transform new gradient format to legacy format for backward compatibility
 * @param {Object} gradient - The gradient object in new format
 * @returns {Object|null} - The gradient object in legacy format or null
 */
function transformGradientToLegacy(gradient) {
    if (!gradient || typeof gradient !== 'object') {
        return null;
    }

    // If it's already in legacy format, return as-is
    if (gradient.stops && gradient.stops[0] && gradient.stops[0].color !== undefined) {
        return gradient;
    }

    // Transform new format to legacy format
    if (gradient.stops && Array.isArray(gradient.stops)) {
        return {
            angle: gradient.angle || 0.0,
            stops: gradient.stops.map(stop => ({
                color: stop.hex || stop.color || '#000000',
                position: stop.offset !== undefined ? stop.offset : (stop.position !== undefined ? stop.position : 0)
            }))
        };
    }

    return null;
}

/**
 * Transform background object to legacy format
 * @param {Object} background - The background object
 * @returns {Object} - The background object in legacy format
 */
function transformBackgroundToLegacy(background) {
    if (!background || typeof background !== 'object') {
        return {
            type: 'solid',
            gradient: null
        };
    }

    const result = {
        type: background.type || 'solid'
    };

    // Only include gradient if it exists and is not null
    if (background.gradient) {
        const legacyGradient = transformGradientToLegacy(background.gradient);
        if (legacyGradient) {
            result.gradient = legacyGradient;
        }
    }

    return result;
}

// ==============================================
// LOCALIZATION MIDDLEWARE
// ==============================================

// Apply localization middleware to all routes
router.use(localization);

// ==============================================
// STATIC ROUTES FIRST (avoid shadowing by /:id)
// ==============================================

// GET /api/logo/thumbnails - Get lightweight logo list with thumbnails
// Supports two pagination modes:
// 1. When categoryId is provided: Returns logos for that category with logo pagination
// 2. When categoryId is NOT provided: Returns paginated categories with limited logos per category
router.get('/thumbnails', async(req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const categoryId = req.query.category_id || req.query.categoryId;
        const lang = req.query.lang || 'en';
        const logosPerCategory = Math.min(20, Math.max(1, parseInt(req.query.logos_per_category || '10', 10)));

        // MODE 1: Get logos for a specific category (logo pagination)
        if (categoryId) {
            const offset = (page - 1) * limit;

            // Get logos for the specific category
            const logosRes = await query(`
                SELECT 
                    l.id,
                    l.title,
                    l.title_en,
                    l.title_ar,
                    l.description,
                    l.description_en,
                    l.description_ar,
                    l.thumbnail_url,
                    l.category_id,
                    c.name as category_name,
                    c.name_en as category_name_en,
                    c.name_ar as category_name_ar,
                    c.description as category_description,
                    c.description_en as category_description_en,
                    c.description_ar as category_description_ar,
                    l.created_at,
                    l.updated_at
                FROM logos l
                LEFT JOIN categories c ON c.id = l.category_id
                WHERE l.category_id = $3
                ORDER BY l.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset, categoryId]);

            // Get total count of logos in this category
            const totalRes = await query(`
                SELECT COUNT(*)::int AS total 
                FROM logos l
                WHERE l.category_id = $1
            `, [categoryId]);
            const total = totalRes.rows[0].total;

            // Get category info
            const categoryRes = await query(`
                SELECT 
                    id,
                    name,
                    name_en,
                    name_ar,
                    description,
                    description_en,
                    description_ar
                FROM categories
                WHERE id = $1
            `, [categoryId]);

            const categoryInfo = categoryRes.rows[0] || null;

            // Format logos
            const formattedLogos = logosRes.rows.map(logo => ({
                id: logo.id,
                title: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
                thumbnailUrl: logo.thumbnail_url,
                description: lang === 'ar' ?
                    (logo.description_ar || logo.description_en || logo.description) :
                    (logo.description_en || logo.description),
                categoryId: logo.category_id,
                createdAt: new Date(logo.created_at).toISOString(),
                updatedAt: new Date(logo.updated_at).toISOString(),
                language: lang,
                direction: lang === 'ar' ? 'rtl' : 'ltr'
            }));

            const currentLang = res.locals.lang || "en";
            return res.json(ok({
                data: formattedLogos,
                category: categoryInfo ? {
                    id: categoryInfo.id,
                    name: lang === 'ar' ? (categoryInfo.name_ar || categoryInfo.name_en || categoryInfo.name) : (categoryInfo.name_en || categoryInfo.name),
                    description: lang === 'ar' ?
                        (categoryInfo.description_ar || categoryInfo.description_en || categoryInfo.description) :
                        (categoryInfo.description_en || categoryInfo.description)
                } : null,
                pagination: {
                    type: 'logos',
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasMore: page < Math.ceil(total / limit)
                }
            }, currentLang, currentLang === "ar" ? "تم جلب الشعارات بنجاح" : "Logos fetched successfully"));
        }

        // MODE 2: Get paginated categories with limited logos per category (category pagination)
        const offset = (page - 1) * limit;

        // Get paginated categories that have logos
        const categoriesRes = await query(`
            SELECT DISTINCT
                c.id,
                c.name,
                c.name_en,
                c.name_ar,
                c.description,
                c.description_en,
                c.description_ar
            FROM categories c
            INNER JOIN logos l ON l.category_id = c.id
            GROUP BY c.id, c.name, c.name_en, c.name_ar, c.description, c.description_en, c.description_ar
            ORDER BY c.id ASC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        // Get total count of categories that have logos
        const totalCategoriesRes = await query(`
            SELECT COUNT(DISTINCT c.id)::int AS total
            FROM categories c
            INNER JOIN logos l ON l.category_id = c.id
        `);
        const totalCategories = totalCategoriesRes.rows[0].total;

        // Get logos for each category (limited per category)
        const categoryGroups = [];

        for (const category of categoriesRes.rows) {
            const logosRes = await query(`
                SELECT 
                    l.id,
                    l.title,
                    l.title_en,
                    l.title_ar,
                    l.description,
                    l.description_en,
                    l.description_ar,
                    l.thumbnail_url,
                    l.category_id,
                    l.created_at,
                    l.updated_at
                FROM logos l
                WHERE l.category_id = $1
                ORDER BY l.created_at DESC
                LIMIT $2
            `, [category.id, logosPerCategory]);

            // Get total count of logos in this category
            const categoryTotalRes = await query(`
                SELECT COUNT(*)::int AS total
                FROM logos
                WHERE category_id = $1
            `, [category.id]);
            const categoryTotal = categoryTotalRes.rows[0].total;

            const formattedLogos = logosRes.rows.map(logo => ({
                id: logo.id,
                title: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
                thumbnailUrl: logo.thumbnail_url,
                description: lang === 'ar' ?
                    (logo.description_ar || logo.description_en || logo.description) :
                    (logo.description_en || logo.description),
                categoryId: logo.category_id,
                createdAt: new Date(logo.created_at).toISOString(),
                updatedAt: new Date(logo.updated_at).toISOString(),
                language: lang,
                direction: lang === 'ar' ? 'rtl' : 'ltr'
            }));

            categoryGroups.push({
                category: {
                    id: category.id,
                    name: lang === 'ar' ? (category.name_ar || category.name_en || category.name) : (category.name_en || category.name),
                    description: lang === 'ar' ?
                        (category.description_ar || category.description_en || category.description) :
                        (category.description_en || category.description)
                },
                logos: formattedLogos,
                logoPagination: {
                    total: categoryTotal,
                    returned: formattedLogos.length,
                    hasMore: categoryTotal > formattedLogos.length
                }
            });
        }

        const currentLang = res.locals.lang || "en";
        return res.json(ok({
            data: categoryGroups,
            pagination: {
                type: 'categories',
                page,
                limit,
                total: totalCategories,
                pages: Math.ceil(totalCategories / limit),
                hasMore: page < Math.ceil(totalCategories / limit),
                logosPerCategory: logosPerCategory
            }
        }, currentLang, currentLang === "ar" ? "تم جلب الفئات والشعارات بنجاح" : "Categories and logos fetched successfully"));
    } catch (err) {
        console.error('Error fetching logo thumbnails:', err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch logo thumbnails",
            language: "en",
            direction: "ltr"
        });
    }
});

// GET /api/logo/categories - Get all categories with only id and name
router.get('/categories', async(req, res) => {
    try {
        const lang = req.query.lang || res.locals.lang || 'en';

        // Query categories with localized name
        const result = await query(`
            SELECT 
                id,
                name,
                name_en,
                name_ar
            FROM categories
            ORDER BY name ASC
        `);

        // Format response with localized names
        const categories = result.rows.map(category => {
            // Use localized name based on language preference
            let displayName;
            if (lang === 'ar') {
                displayName = category.name_ar || category.name_en || category.name;
            } else {
                displayName = category.name_en || category.name;
            }

            return {
                id: category.id,
                name: displayName
            };
        });

        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// GET /api/logo/mobile - list all logos in mobile-compatible format (paginated)
router.get('/mobile', async(req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const lang = req.query.lang || 'en';
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
                position: { x: (num(row.x_norm) !== null && num(row.x_norm) !== undefined) ? num(row.x_norm) : 0.5, y: (num(row.y_norm) !== null && num(row.y_norm) !== undefined) ? num(row.y_norm) : 0.5 },
                scaleFactor: (num(row.scale) !== null && num(row.scale) !== undefined) ? num(row.scale) : 1,
                rotation: (num(row.rotation_deg) !== null && num(row.rotation_deg) !== undefined) ? num(row.rotation_deg) : 0,
                opacity: (num(row.opacity) !== null && num(row.opacity) !== undefined) ? num(row.opacity) : 1,
                flip: { horizontal: !!row.flip_horizontal, vertical: !!row.flip_vertical }
            };
            switch (row.type) {
                case 'TEXT':
                    return {
                        ...baseLayer,
                        text: {
                            value: row.content || '',
                            font: row.font_family || 'Arial',
                            fontSize: (num(row.font_size) !== null && num(row.font_size) !== undefined) ? num(row.font_size) : 48,
                            fontColor: row.fill_hex || '#000000',
                            fontWeight: row.font_weight || 'normal',
                            fontStyle: row.font_style || 'normal',
                            alignment: row.align || 'center',
                            baseline: row.baseline || 'alphabetic',
                            lineHeight: (num(row.line_height) !== null && num(row.line_height) !== undefined) ? num(row.line_height) : 1.0,
                            letterSpacing: (num(row.letter_spacing) !== null && num(row.letter_spacing) !== undefined) ? num(row.letter_spacing) : 0,
                            fillAlpha: (num(row.fill_alpha) !== null && num(row.fill_alpha) !== undefined) ? num(row.fill_alpha) : 1.0,
                            strokeHex: row.stroke_hex || null,
                            strokeAlpha: (num(row.stroke_alpha) !== null && num(row.stroke_alpha) !== undefined) ? num(row.stroke_alpha) : null,
                            strokeWidth: (num(row.stroke_width) !== null && num(row.stroke_width) !== undefined) ? num(row.stroke_width) : null,
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
                            src: (row.shape_meta && row.shape_meta.src) || null,
                            type: row.shape_kind || 'rect',
                            color: row.shape_fill_hex || '#000000',
                            strokeColor: row.shape_stroke_hex || null,
                            strokeWidth: (num(row.shape_stroke_width) !== null && num(row.shape_stroke_width) !== undefined) ? num(row.shape_stroke_width) : 0
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
        };

        const data = logosRes.rows.map(logo => {
            const rows = byLogo.get(logo.id) || [];

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
                name: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
                description: lang === 'ar' ? (logo.description_ar || logo.description_en || logo.description) : (logo.description_en || logo.description) || `Logo created on ${new Date(logo.created_at).toISOString()}`,
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
                    fullyResponsive: (logo.fully_responsive !== null && logo.fully_responsive !== undefined) ? logo.fully_responsive : true
                },
                metadata: {
                    createdAt: new Date(logo.created_at).toISOString(),
                    updatedAt: new Date(logo.updated_at).toISOString(),
                    tags: Array.isArray(logo.tags) ? logo.tags : ['logo', 'design', 'responsive'],
                    version: logo.version || 3,
                    responsive: (logo.responsive !== null && logo.responsive !== undefined) ? logo.responsive : true
                },
                export: {
                    format: logo.export_format || 'png',
                    transparentBackground: (logo.export_transparent_background !== null && logo.export_transparent_background !== undefined) ? logo.export_transparent_background : true,
                    quality: logo.export_quality || 100,
                    responsive: { scalable: (logo.export_scalable !== null && logo.export_scalable !== undefined) ? logo.export_scalable : true, maintainAspectRatio: (logo.export_maintain_aspect_ratio !== null && logo.export_maintain_aspect_ratio !== undefined) ? logo.export_maintain_aspect_ratio : true }
                },
                // Add language metadata
                language: lang,
                direction: lang === 'ar' ? 'rtl' : 'ltr'
            };
        });

        const totalRes = await query(`SELECT COUNT(*)::int AS total FROM logos`);
        const total = totalRes.rows[0].total;

        res.json({
            success: true,
            message: "Logos fetched successfully",
            data,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            language: "en",
            direction: "ltr"
        });
    } catch (err) {
        console.error('Error fetching mobile logos list:', err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mobile logos list",
            language: "en",
            direction: "ltr"
        });
    }
});

// Keep POST /mobile above parameterized routes to avoid shadowing by POST /:id
// POST /api/logo/mobile - Create logo from mobile-compatible format
router.post('/mobile', async(req, res) => {
    const client = await getClient();
    try {
        const {
            logoId,
            templateId,
            userId,
            name,
            description,
            // Multilingual fields
            name_en,
            name_ar,
            description_en,
            description_ar,
            tags_en,
            tags_ar,
            canvas,
            layers = [],
            colorsUsed = [],
            alignments,
            responsive,
            metadata,
            export: exportSettings,
            categoryId
        } = req.body;

        // Validate that at least one name is provided
        if (!name && !name_en && !name_ar) {
            return res.status(400).json({
                success: false,
                message: "At least one name is required (name, name_en, or name_ar)",
                language: "en",
                direction: "ltr"
            });
        }

        // Validate categoryId if provided
        if (categoryId && !categoryId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            return res.status(400).json({
                success: false,
                message: "Invalid categoryId format",
                language: "en",
                direction: "ltr"
            });
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
          id, owner_id, title, description, canvas_w, canvas_h, dpi, is_template, template_id, category_id,
          colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
          scaling_method, position_method, fully_responsive, tags, version, responsive,
          export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
          canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
          canvas_background_image_type, canvas_background_image_path,
          title_en, title_ar, description_en, description_ar, tags_en, tags_ar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37)
        RETURNING *
      `, [
                logoId, ownerId, name, description || `Logo created on ${new Date().toISOString()}`,
                (canvas && canvas.aspectRatio) ? 1080 : 1080, (canvas && canvas.aspectRatio) ? Math.round(1080 / canvas.aspectRatio) : 1080,
                300, !!templateId, templateId || null, categoryId || null, JSON.stringify(colorsUsed),
                (alignments && alignments.verticalAlign) || 'center', (alignments && alignments.horizontalAlign) || 'center',
                (responsive && responsive.version) || '3.0', (responsive && responsive.description) || 'Fully responsive logo data - no absolute sizes stored',
                (responsive && responsive.scalingMethod) || 'scaleFactor', (responsive && responsive.positionMethod) || 'relative',
                (responsive && responsive.fullyResponsive) || true, JSON.stringify((metadata && metadata.tags) || ['logo', 'design', 'responsive']),
                (metadata && metadata.version) || 3, (metadata && metadata.responsive) || true, (exportSettings && exportSettings.format) || 'png',
                (exportSettings && exportSettings.transparentBackground) || true, (exportSettings && exportSettings.quality) || 100,
                (exportSettings && exportSettings.responsive && exportSettings.responsive.scalable) || true, (exportSettings && exportSettings.responsive && exportSettings.responsive.maintainAspectRatio) || true,
                (canvas && canvas.background && canvas.background.type) || 'solid', (canvas && canvas.background && canvas.background.solidColor) || '#ffffff',
                (canvas && canvas.background && canvas.background.gradient) ? JSON.stringify(canvas.background.gradient) : null,
                (canvas && canvas.background && canvas.background.image && canvas.background.image.type) || null, (canvas && canvas.background && canvas.background.image && canvas.background.image.path) || null,
                name_en, name_ar, description_en, description_ar,
                tags_en ? JSON.stringify(tags_en) : null,
                tags_ar ? JSON.stringify(tags_ar) : null
            ]);
        } else {
            logoRes = await client.query(`
        INSERT INTO logos (
          owner_id, title, description, canvas_w, canvas_h, dpi, is_template, template_id, category_id,
          colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
          scaling_method, position_method, fully_responsive, tags, version, responsive,
          export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
          canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
          canvas_background_image_type, canvas_background_image_path,
          title_en, title_ar, description_en, description_ar, tags_en, tags_ar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
        RETURNING *
      `, [
                ownerId, name, description || `Logo created on ${new Date().toISOString()}`,
                (canvas && canvas.aspectRatio) ? 1080 : 1080, (canvas && canvas.aspectRatio) ? Math.round(1080 / canvas.aspectRatio) : 1080,
                300, !!templateId, templateId || null, categoryId || null, JSON.stringify(colorsUsed),
                (alignments && alignments.verticalAlign) || 'center', (alignments && alignments.horizontalAlign) || 'center',
                (responsive && responsive.version) || '3.0', (responsive && responsive.description) || 'Fully responsive logo data - no absolute sizes stored',
                (responsive && responsive.scalingMethod) || 'scaleFactor', (responsive && responsive.positionMethod) || 'relative',
                (responsive && responsive.fullyResponsive) || true, JSON.stringify((metadata && metadata.tags) || ['logo', 'design', 'responsive']),
                (metadata && metadata.version) || 3, (metadata && metadata.responsive) || true, (exportSettings && exportSettings.format) || 'png',
                (exportSettings && exportSettings.transparentBackground) || true, (exportSettings && exportSettings.quality) || 100,
                (exportSettings && exportSettings.responsive && exportSettings.responsive.scalable) || true, (exportSettings && exportSettings.responsive && exportSettings.responsive.maintainAspectRatio) || true,
                (canvas && canvas.background && canvas.background.type) || 'solid', (canvas && canvas.background && canvas.background.solidColor) || '#ffffff',
                (canvas && canvas.background && canvas.background.gradient) || null, (canvas && canvas.background && canvas.background.image && canvas.background.image.type) || null,
                (canvas && canvas.background && canvas.background.image && canvas.background.image.path) || null,
                name_en, name_ar, description_en, description_ar,
                tags_en ? JSON.stringify(tags_en) : null,
                tags_ar ? JSON.stringify(tags_ar) : null
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
                        // Look up font by name if provided, create if doesn't exist
                        let fontId = null;
                        if (text.font) {
                            try {
                                // First try to find existing font
                                let fontRes = await client.query(`SELECT id FROM fonts WHERE family = $1 AND weight = $2 LIMIT 1`, [text.font, text.fontWeight === 'bold' ? 700 : 400]);
                                if (fontRes.rows.length > 0) {
                                    fontId = fontRes.rows[0].id;
                                } else {
                                    // If not found, try to find any weight/style of this font family
                                    fontRes = await client.query(`SELECT id FROM fonts WHERE family = $1 LIMIT 1`, [text.font]);
                                    if (fontRes.rows.length > 0) {
                                        fontId = fontRes.rows[0].id;
                                    } else {
                                        // Create font if it doesn't exist (using system font or Google Fonts)
                                        const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(text.font)}:wght@400&display=swap`;
                                        const newFontRes = await client.query(`
                      INSERT INTO fonts (family, style, weight, url, fallbacks, meta)
                      VALUES ($1, $2, $3, $4, $5, $6)
                      ON CONFLICT (family, weight, style) DO UPDATE SET family = EXCLUDED.family
                      RETURNING id
                    `, [
                                            text.font,
                                            'Regular',
                                            400,
                                            fontUrl, ['sans-serif'],
                                            { source: 'auto_created', created_at: new Date().toISOString() }
                                        ]);
                                        fontId = newFontRes.rows[0].id;
                                        console.log(`Created new font: ${text.font}`);
                                    }
                                }
                            } catch (fontError) {
                                console.log('Could not look up or create font:', fontError.message);
                                // Continue with null font_id if lookup fails
                            }
                        }
                        await client.query(`
              INSERT INTO layer_text (
                layer_id, content, font_id, font_size, line_height, letter_spacing,
                align, baseline, fill_hex, fill_alpha, stroke_hex, stroke_alpha,
                stroke_width, stroke_align, gradient, underline, underline_direction,
                text_case, font_style, font_weight, text_decoration, text_transform, font_variant
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            `, [
                            layer.id,
                            text.value || '',
                            fontId, // font_id - looked up by font name
                            text.fontSize || 48,
                            text.lineHeight || 1.0,
                            text.letterSpacing || 0,
                            text.alignment || 'center',
                            text.baseline || 'alphabetic',
                            text.fontColor || '#000000',
                            text.fillAlpha || 1.0,
                            text.strokeHex || null,
                            text.strokeAlpha || null,
                            text.strokeWidth || null,
                            text.strokeAlign || null,
                            text.gradient || null,
                            text.underline || false,
                            text.underlineDirection || 'horizontal',
                            text.textCase || 'normal',
                            text.fontStyle || 'normal',
                            text.fontWeight || 'normal',
                            text.textDecoration || 'none',
                            text.textTransform || 'none',
                            text.fontVariant || 'normal'
                        ]);
                    }
                    break;
                case 'ICON':
                    if (icon) {
                        // Check if asset already exists by name
                        const assetRes = await client.query(`SELECT id FROM assets WHERE name = $1 LIMIT 1`, [icon.src]);
                        let assetId = (assetRes.rows[0] && assetRes.rows[0].id);

                        if (!assetId) {
                            // Create new asset with proper URL structure
                            // For icons, we'll use a placeholder URL structure that can be replaced with actual URLs
                            const iconUrl = icon.url || `https://example.com/icons/${icon.src}`;
                            const newAssetRes = await client.query(`
                INSERT INTO assets (kind, name, storage, url, mime_type, width, height, has_alpha) 
                VALUES ('vector', $1, 'local', $2, 'image/svg+xml', 100, 100, true) 
                RETURNING id
              `, [icon.src, iconUrl]);
                            assetId = newAssetRes.rows[0].id;
                        }
                        await client.query(`INSERT INTO layer_icon (layer_id, asset_id, tint_hex, tint_alpha) VALUES ($1, $2, $3, $4)`, [layer.id, assetId, icon.color || '#000000', 1.0]);
                    }
                    break;
                case 'IMAGE':
                    if (image) {
                        const assetRes = await client.query(`SELECT id FROM assets WHERE url = $1 LIMIT 1`, [image.src]);
                        let assetId = (assetRes.rows[0] && assetRes.rows[0].id);
                        if (!assetId) {
                            const newAssetRes = await client.query(`INSERT INTO assets (kind, name, url, width, height, has_alpha) VALUES ('raster', $1, $2, 100, 100, true) RETURNING id`, [image.src, image.src]);
                            assetId = newAssetRes.rows[0].id;
                        }
                        await client.query(`INSERT INTO layer_image (layer_id, asset_id, fit) VALUES ($1, $2, $3)`, [layer.id, assetId, 'contain']);
                    }
                    break;
                case 'SHAPE':
                    if (shape) {
                        const shapeMeta = shape.src ? { src: shape.src } : null;
                        await client.query(`
              INSERT INTO layer_shape (
                layer_id, shape_kind, fill_hex, fill_alpha, stroke_hex, stroke_width, meta
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [layer.id, shape.type || 'rect', shape.color || '#000000', 1.0, shape.strokeColor || null, shape.strokeWidth || 0, JSON.stringify(shapeMeta)]);
                    }
                    break;
                case 'BACKGROUND':
                    if (background) {
                        let assetId = null;

                        // If background has an image, store it in the assets table
                        if (background.image && background.image.src) {
                            // Check if asset already exists by name or URL
                            const assetRes = await client.query(`
                SELECT id FROM assets WHERE name = $1 OR url = $2 LIMIT 1
              `, [background.image.src, background.image.path || background.image.src]);

                            if (assetRes.rows.length > 0) {
                                assetId = assetRes.rows[0].id;
                            } else {
                                // Create new asset for background image
                                const backgroundUrl = background.image.url || background.image.path || `https://example.com/backgrounds/${background.image.src}`;
                                const newAssetRes = await client.query(`
                  INSERT INTO assets (kind, name, storage, url, mime_type, width, height, has_alpha) 
                  VALUES ('raster', $1, 'local', $2, 'image/jpeg', 1920, 1080, false) 
                  RETURNING id
                `, [background.image.src, backgroundUrl]);
                                assetId = newAssetRes.rows[0].id;
                            }
                        }

                        await client.query(`
              INSERT INTO layer_background (
                layer_id, mode, fill_hex, fill_alpha, asset_id, repeat, position, size
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                            layer.id,
                            background.type || 'solid',
                            background.color || '#ffffff',
                            1.0,
                            assetId,
                            background.repeat || 'no-repeat',
                            background.position || 'center',
                            background.size || 'cover'
                        ]);
                    }
                    break;
            }
            createdLayers.push(layer);
        }

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            message: "Logo created successfully",
            data: {
                logoId: logo.id.toString(),
                templateId: logo.template_id ? logo.template_id.toString() : null,
                userId: logo.owner_id,
                name: logo.title,
                description: logo.description,
                categoryId: logo.category_id,
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
            },
            language: "en",
            direction: "ltr"
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating logo from mobile format:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create logo",
            language: "en",
            direction: "ltr"
        });
    } finally {
        client.release();
    }
});

// ==============================================
// ICON LIBRARY ENDPOINTS (Client-Side Focused)
// ==============================================

// GET /api/logo/icons/library - Get icons optimized for client-side library display
router.get('/icons/library', async(req, res) => {
    try {
        const {
            page = 1,
                limit = 100,
                category,
                type,
                search,
                tags,
                sort = 'popularity',
                order = 'desc',
                featured = false,
                style
        } = req.query;

        const offset = (page - 1) * limit;
        const lang = req.query.lang || 'en';

        // Build WHERE clause with filters
        let whereClause = "WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)";
        let queryParams = [];
        let paramCount = 0;

        // Featured filter
        if (featured === 'true') {
            whereClause += ` AND (ai.meta->>'is_featured' = 'true' OR ai.meta->>'is_popular' = 'true')`;
        }

        // Category filter
        if (category) {
            paramCount++;
            whereClause += ` AND ai.meta->>'category' = $${paramCount}`;
            queryParams.push(category);
        }

        // Type filter (vector/raster)
        if (type) {
            paramCount++;
            whereClause += ` AND ai.kind = $${paramCount}`;
            queryParams.push(type);
        }

        // Style filter (outline, filled, etc.)
        if (style) {
            paramCount++;
            whereClause += ` AND ai.meta->>'style' = $${paramCount}`;
            queryParams.push(style);
        }

        // Search filter (name, tags, description)
        if (search) {
            paramCount++;
            whereClause += ` AND (
        ai.name ILIKE $${paramCount} OR 
        ai.meta->>'description' ILIKE $${paramCount} OR
        ai.meta->>'tags' ILIKE $${paramCount} OR
        ai.meta->>'keywords' ILIKE $${paramCount}
      )`;
            queryParams.push(`%${search}%`);
        }

        // Tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',');
            paramCount++;
            whereClause += ` AND ai.meta->'tags' @> $${paramCount}`;
            queryParams.push(JSON.stringify(tagArray));
        }

        // Custom sorting for library display
        let orderClause = '';
        switch (sort) {
            case 'popularity':
                orderClause = 'ORDER BY (ai.meta->>\'download_count\')::int DESC, ai.created_at DESC';
                break;
            case 'newest':
                orderClause = 'ORDER BY ai.created_at DESC';
                break;
            case 'oldest':
                orderClause = 'ORDER BY ai.created_at ASC';
                break;
            case 'name':
                orderClause = `ORDER BY ai.name ${order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}`;
                break;
            case 'category':
                orderClause = 'ORDER BY ai.meta->>\'category\' ASC, ai.name ASC';
                break;
            default:
                orderClause = 'ORDER BY (ai.meta->>\'download_count\')::int DESC, ai.created_at DESC';
        }

        // Add limit and offset parameters
        paramCount++;
        queryParams.push(limit);
        paramCount++;
        queryParams.push(offset);

        const iconsRes = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at
      FROM assets ai
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

        // Get total count for pagination (without limit and offset)
        const countParams = queryParams.slice(0, -2); // Remove limit and offset from end
        const totalRes = await query(`
      SELECT COUNT(*)::int AS total 
      FROM assets ai 
      ${whereClause}
    `, countParams);

        const total = totalRes.rows[0].total;

        // Get category statistics
        const categoriesRes = await query(`
      SELECT 
        ai.meta->>'category' as category, 
        COUNT(*) as count,
        COUNT(CASE WHEN ai.meta->>'is_featured' = 'true' THEN 1 END) as featured_count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND ai.meta->>'category' IS NOT NULL
      GROUP BY ai.meta->>'category'
      ORDER BY count DESC
    `);

        // Format icons for client-side display
        const icons = iconsRes.rows.map(icon => ({
            id: icon.id,
            name: icon.name,
            url: icon.url,
            type: icon.kind,
            width: icon.width,
            height: icon.height,
            hasAlpha: icon.has_alpha,
            vectorSvg: icon.vector_svg,
            dominantColor: icon.dominant_hex,
            category: (icon.meta && icon.meta.category) || 'general',
            tags: Array.isArray(icon.meta && icon.meta.tags) ? icon.meta.tags : ((icon.meta && icon.meta.tags) ? icon.meta.tags.split(',') : []),
            description: (icon.meta && icon.meta.description) || '',
            keywords: (icon.meta && icon.meta.keywords) || [],
            style: (icon.meta && icon.meta.style) || 'outline',
            isFeatured: (icon.meta && icon.meta.is_featured) || false,
            isPopular: (icon.meta && icon.meta.is_popular) || false,
            isNew: (icon.meta && icon.meta.is_new) || false,
            downloadCount: parseInt((icon.meta && icon.meta.download_count) || 0),
            rating: parseFloat((icon.meta && icon.meta.rating) || 0),
            createdAt: new Date(icon.created_at).toISOString(),
            updatedAt: new Date(icon.updated_at).toISOString()
        }));

        // Prepare response optimized for client-side library
        const response = {
            success: true,
            data: {
                icons: icons,
                totalIcons: total,
                categories: categoriesRes.rows.map(cat => ({
                    name: cat.category,
                    count: parseInt(cat.count),
                    featuredCount: parseInt(cat.featured_count)
                }))
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: {
                availableCategories: categoriesRes.rows.map(cat => cat.category),
                availableTypes: ['vector', 'raster'],
                availableStyles: ['outline', 'filled', 'duotone', 'solid'],
                sortOptions: [
                    { value: 'popularity', label: 'Most Popular' },
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'name', label: 'Name A-Z' },
                    { value: 'category', label: 'Category' }
                ]
            },
            metadata: {
                searchTerm: search || null,
                appliedFilters: {
                    category: category || null,
                    type: type || null,
                    style: style || null,
                    featured: featured === 'true' || null,
                    tags: tags || null
                },
                sort: {
                    field: sort,
                    order: order
                },
                language: lang
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching icon library:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch icon library",
            language: "en",
            direction: "ltr"
        });
    }
});

// GET /api/logo/icons/categories - Get all icon categories with counts
router.get('/icons/categories', async(req, res) => {
    try {
        const { includeEmpty = false } = req.query;

        let whereClause = "WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)";
        if (includeEmpty !== 'true') {
            whereClause += " AND ai.meta->>'category' IS NOT NULL";
        }

        const categoriesRes = await query(`
      SELECT 
        COALESCE(ai.meta->>'category', 'uncategorized') as category,
        COUNT(*) as total_count,
        COUNT(CASE WHEN ai.meta->>'is_featured' = 'true' THEN 1 END) as featured_count,
        COUNT(CASE WHEN ai.meta->>'is_new' = 'true' THEN 1 END) as new_count,
        COUNT(CASE WHEN ai.kind = 'vector' THEN 1 END) as vector_count,
        COUNT(CASE WHEN ai.kind = 'raster' THEN 1 END) as raster_count
      FROM assets ai
      ${whereClause}
      GROUP BY COALESCE(ai.meta->>'category', 'uncategorized')
      ORDER BY total_count DESC
    `);

        const categories = categoriesRes.rows.map(cat => ({
            name: cat.category,
            totalCount: parseInt(cat.total_count),
            featuredCount: parseInt(cat.featured_count),
            newCount: parseInt(cat.new_count),
            vectorCount: parseInt(cat.vector_count),
            rasterCount: parseInt(cat.raster_count)
        }));

        res.json({
            success: true,
            message: "Icon categories fetched successfully",
            data: categories,
            totalCategories: categories.length,
            language: "en",
            direction: "ltr"
        });
    } catch (error) {
        console.error('Error fetching icon categories:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch icon categories",
            language: "en",
            direction: "ltr"
        });
    }
});

// GET /api/logo/icons/featured - Get featured icons
router.get('/icons/featured', async(req, res) => {
    try {
        const { limit = 20 } = req.query;

        const iconsRes = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
        ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') 
      AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND (ai.meta->>'is_featured' = 'true' OR ai.meta->>'is_popular' = 'true')
      ORDER BY (ai.meta->>'download_count')::int DESC, ai.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

        const icons = iconsRes.rows.map(icon => ({
            id: icon.id,
            name: icon.name,
            url: icon.url,
            type: icon.kind,
            width: icon.width,
            height: icon.height,
            hasAlpha: icon.has_alpha,
            vectorSvg: icon.vector_svg,
            dominantColor: icon.dominant_hex,
            category: icon.meta && typeof icon.meta.category !== 'undefined' ? icon.meta.category : 'general',
            tags: icon.meta && Array.isArray(icon.meta.tags) ? icon.meta.tags : (icon.meta && icon.meta.tags ? icon.meta.tags.split(',') : []),
            description: icon.meta && typeof icon.meta.description !== 'undefined' ? icon.meta.description : '',
            style: icon.meta && typeof icon.meta.style !== 'undefined' ? icon.meta.style : 'outline',
            isFeatured: icon.meta && typeof icon.meta.is_featured !== 'undefined' ? icon.meta.is_featured : false,
            isPopular: icon.meta && typeof icon.meta.is_popular !== 'undefined' ? icon.meta.is_popular : false,
            downloadCount: icon.meta && typeof icon.meta.download_count !== 'undefined' ? parseInt(icon.meta.download_count) : 0,
            createdAt: new Date(icon.created_at).toISOString()
        }));

        res.json({
            success: true,
            message: "Featured icons fetched successfully",
            data: icons,
            count: icons.length,
            language: "en",
            direction: "ltr"
        });
    } catch (error) {
        console.error('Error fetching featured icons:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch featured icons",
            language: "en",
            direction: "ltr"
        });
    }
});

// GET /api/logo/icons - Get all icon assets for client-side library display
router.get('/icons', async(req, res) => {
    try {
        const {
            page = 1,
                limit = 50,
                category, // Legacy: meta->>'category'
                icon_category_id, // New: icon_categories.id
                type,
                search,
                tags,
                sort = 'created_at',
                order = 'desc',
                groupBy = 'category',
                include_categories = 'true' // Include categories in icon response
        } = req.query;

        const offset = (page - 1) * limit;
        const lang = req.query.lang || 'en';

        // Build WHERE clause with filters
        let whereClause = "WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)";
        let queryParams = [];
        let paramCount = 0;

        // Legacy category filter (meta->>'category')
        if (category) {
            paramCount++;
            whereClause += ` AND ai.meta->>'category' = $${paramCount}`;
            queryParams.push(category);
        }

        // New icon category filter (icon_category_id)
        if (icon_category_id) {
            paramCount++;
            whereClause += ` AND ai.id IN (
        SELECT icon_id FROM icon_category_assignments WHERE category_id = $${paramCount}
      )`;
            queryParams.push(icon_category_id);
        }

        // Type filter (vector/raster)
        if (type) {
            paramCount++;
            whereClause += ` AND ai.kind = $${paramCount}`;
            queryParams.push(type);
        }

        // Search filter (name, tags, description)
        if (search) {
            paramCount++;
            whereClause += ` AND (
        ai.name ILIKE $${paramCount} OR 
        ai.meta->>'description' ILIKE $${paramCount} OR
        ai.meta->>'tags' ILIKE $${paramCount}
      )`;
            queryParams.push(`%${search}%`);
        }

        // Tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tagArray.length > 0) {
                paramCount++;
                whereClause += ` AND ai.meta->'tags' @> $${paramCount}::jsonb`;
                queryParams.push(JSON.stringify(tagArray));
            }
        }

        // Validate sort field and build ORDER BY clause safely
        const allowedSortFields = ['created_at', 'updated_at', 'name', 'category'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Build ORDER BY clause safely
        let orderByClause = '';
        if (sortField === 'category') {
            orderByClause = `ORDER BY ai.meta->>'category' ${sortOrder}, ai.created_at DESC`;
        } else {
            // Safe to use sortField directly since it's validated from allowedSortFields
            orderByClause = `ORDER BY ai.${sortField} ${sortOrder}`;
        }

        // Add limit and offset parameters at the end
        paramCount++;
        const limitParamIndex = paramCount;
        queryParams.push(parseInt(limit));
        paramCount++;
        const offsetParamIndex = paramCount;
        queryParams.push(parseInt(offset));

        // Try to include categories, but handle gracefully if tables don't exist
        let iconsRes;
        try {
            iconsRes = await query(`
        SELECT 
          ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
          ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
          ai.created_at, ai.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ic.id,
                'name', ic.name,
                'name_en', ic.name_en,
                'name_ar', ic.name_ar,
                'slug', ic.slug
              )
            ) FILTER (WHERE ic.id IS NOT NULL),
            '[]'::json
          ) as categories
        FROM assets ai
        LEFT JOIN icon_category_assignments ica ON ica.icon_id = ai.id
        LEFT JOIN icon_categories ic ON ic.id = ica.category_id AND ic.is_active = TRUE
        ${whereClause}
        GROUP BY ai.id
        ${orderByClause}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `, queryParams);
        } catch (joinError) {
            // If join fails (tables don't exist), use simpler query without categories
            if (joinError.message && joinError.message.includes('does not exist')) {
                iconsRes = await query(`
          SELECT 
            ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
            ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
            ai.created_at, ai.updated_at,
            '[]'::json as categories
          FROM assets ai
          ${whereClause}
          ${orderByClause}
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `, queryParams);
            } else {
                throw joinError;
            }
        }

        // Get total count for pagination (without limit and offset)
        const countParams = queryParams.slice(0, -2); // Remove limit and offset from end
        // Use DISTINCT to count unique icons when using GROUP BY in main query
        let totalRes;
        try {
            totalRes = await query(`
        SELECT COUNT(DISTINCT ai.id)::int AS total 
        FROM assets ai
        LEFT JOIN icon_category_assignments ica ON ica.icon_id = ai.id
        LEFT JOIN icon_categories ic ON ic.id = ica.category_id AND ic.is_active = TRUE
        ${whereClause}
      `, countParams);
        } catch (joinError) {
            // If join fails, use simpler count query
            if (joinError.message && joinError.message.includes('does not exist')) {
                totalRes = await query(`
          SELECT COUNT(*)::int AS total 
          FROM assets ai
          ${whereClause}
        `, countParams);
            } else {
                throw joinError;
            }
        }

        const total = totalRes.rows[0].total;

        // Get all categories for filtering
        const categoriesRes = await query(`
      SELECT DISTINCT ai.meta->>'category' as category, COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
      AND ai.meta->>'category' IS NOT NULL
      GROUP BY ai.meta->>'category'
      ORDER BY count DESC
    `);

        // Format icons with enhanced metadata and categories
        const includeCategories = include_categories === 'true';
        const icons = iconsRes.rows.map(icon => {
            const iconData = {
                id: icon.id,
                name: icon.name,
                url: icon.url,
                type: icon.kind,
                width: icon.width,
                height: icon.height,
                hasAlpha: icon.has_alpha,
                vectorSvg: icon.vector_svg,
                dominantColor: icon.dominant_hex,
                category: icon.meta && typeof icon.meta.category !== 'undefined' ? icon.meta.category : 'general', // Legacy category
                tags: icon.meta && Array.isArray(icon.meta.tags) ? icon.meta.tags :
                    (icon.meta && icon.meta.tags ? icon.meta.tags.split(',') : []),
                description: icon.meta && typeof icon.meta.description !== 'undefined' ? icon.meta.description : '',
                keywords: icon.meta && typeof icon.meta.keywords !== 'undefined' ? icon.meta.keywords : [],
                style: icon.meta && typeof icon.meta.style !== 'undefined' ? icon.meta.style : 'outline',
                isPopular: icon.meta && typeof icon.meta.is_popular !== 'undefined' ? icon.meta.is_popular : false,
                isNew: icon.meta && typeof icon.meta.is_new !== 'undefined' ? icon.meta.is_new : false,
                downloadCount: icon.meta && typeof icon.meta.download_count !== 'undefined' ? icon.meta.download_count : 0,
                createdAt: new Date(icon.created_at).toISOString(),
                updatedAt: new Date(icon.updated_at).toISOString()
            };

            // Add categories if requested
            if (includeCategories && icon.categories) {
                iconData.categories = Array.isArray(icon.categories) ?
                    icon.categories :
                    (typeof icon.categories === 'string' ? JSON.parse(icon.categories) : []);
            }

            return iconData;
        });

        // Group icons by category if requested
        let groupedData = icons;
        if (groupBy === 'category') {
            const categoryGroups = {};
            icons.forEach(icon => {
                const categoryName = icon.category || 'uncategorized';
                if (!categoryGroups[categoryName]) {
                    categoryGroups[categoryName] = {
                        category: categoryName,
                        count: 0,
                        icons: []
                    };
                }
                categoryGroups[categoryName].icons.push(icon);
                categoryGroups[categoryName].count++;
            });

            groupedData = Object.values(categoryGroups).sort((a, b) => b.count - a.count);
        }

        // Prepare response
        const response = {
            success: true,
            data: groupedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                categories: categoriesRes.rows.map(cat => ({
                    name: cat.category,
                    count: parseInt(cat.count)
                })),
                types: [
                    { name: 'vector', count: icons.filter(i => i.type === 'vector').length },
                    { name: 'raster', count: icons.filter(i => i.type === 'raster').length }
                ]
            },
            metadata: {
                totalIcons: total,
                searchTerm: search || null,
                appliedFilters: {
                    category: category || null,
                    type: type || null,
                    tags: tags || null
                },
                sort: {
                    field: sortField,
                    order: order
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching icons:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: "Failed to fetch icons",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            language: "en",
            direction: "ltr"
        });
    }
});

// POST /api/logo/icons - Add new icon to library
router.post('/icons', async(req, res) => {
    try {
        const {
            name,
            url,
            type = 'vector',
            width = 100,
            height = 100,
            hasAlpha = true,
            vectorSvg = null,
            category = 'general',
            tags = [],
            description = ''
        } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'name and url are required'
            });
        }

        const meta = {
            library_type: 'icon',
            category,
            tags,
            description
        };

        const result = await query(`
      INSERT INTO assets (kind, name, url, width, height, has_alpha, vector_svg, meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [type, name, url, width, height, hasAlpha, vectorSvg, JSON.stringify(meta)]);

        const icon = result.rows[0];

        res.status(201).json({
            success: true,
            data: {
                id: icon.id,
                name: icon.name,
                url: icon.url,
                type: icon.kind,
                width: icon.width,
                height: icon.height,
                hasAlpha: icon.has_alpha,
                vectorSvg: icon.vector_svg,
                category: (icon.meta && typeof icon.meta.category !== 'undefined') ? icon.meta.category : 'general',
                tags: (icon.meta && typeof icon.meta.tags !== 'undefined') ? icon.meta.tags : [],
                description: (icon.meta && typeof icon.meta.description !== 'undefined') ? icon.meta.description : '',
                createdAt: new Date(icon.created_at).toISOString(),
                updatedAt: new Date(icon.updated_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating icon:', error);
        res.status(500).json({ success: false, message: 'Failed to create icon' });
    }
});

// GET /api/logo/shapes - Get all shape assets for client-side library display
router.get('/shapes', async(req, res) => {
    try {
        const {
            page = 1,
                limit = 50,
                category, // Legacy: meta->>'category'
                shape_category_id, // New: shape_categories.id
                type,
                search,
                tags,
                sort = 'created_at',
                order = 'desc',
                groupBy = 'category',
                include_categories = 'true' // Include categories in shape response
        } = req.query;

        const offset = (page - 1) * limit;
        const lang = req.query.lang || 'en';

        // Build WHERE clause with filters
        let whereClause = "WHERE ai.kind IN ('vector', 'raster') AND ai.meta->>'library_type' = 'shape'";
        let queryParams = [];
        let paramCount = 0;

        // Legacy category filter (meta->>'category')
        if (category) {
            paramCount++;
            whereClause += ` AND ai.meta->>'category' = $${paramCount}`;
            queryParams.push(category);
        }

        // New shape category filter (shape_category_id)
        if (shape_category_id) {
            paramCount++;
            whereClause += ` AND ai.id IN (
        SELECT shape_id FROM shape_category_assignments WHERE category_id = $${paramCount}
      )`;
            queryParams.push(shape_category_id);
        }

        // Type filter (vector/raster)
        if (type) {
            paramCount++;
            whereClause += ` AND ai.kind = $${paramCount}`;
            queryParams.push(type);
        }

        // Search filter (name, tags, description)
        if (search) {
            paramCount++;
            whereClause += ` AND (
        ai.name ILIKE $${paramCount} OR 
        ai.meta->>'description' ILIKE $${paramCount} OR
        ai.meta->>'tags' ILIKE $${paramCount}
      )`;
            queryParams.push(`%${search}%`);
        }

        // Tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tagArray.length > 0) {
                paramCount++;
                whereClause += ` AND ai.meta->'tags' @> $${paramCount}::jsonb`;
                queryParams.push(JSON.stringify(tagArray));
            }
        }

        // Validate sort field and build ORDER BY clause safely
        const allowedSortFields = ['created_at', 'updated_at', 'name', 'category'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

        // Build ORDER BY clause safely
        let orderByClause = '';
        if (sortField === 'category') {
            orderByClause = `ORDER BY ai.meta->>'category' ${sortOrder}, ai.created_at DESC`;
        } else {
            // Safe to use sortField directly since it's validated from allowedSortFields
            orderByClause = `ORDER BY ai.${sortField} ${sortOrder}`;
        }

        // Add limit and offset parameters at the end
        paramCount++;
        const limitParamIndex = paramCount;
        queryParams.push(parseInt(limit));
        paramCount++;
        const offsetParamIndex = paramCount;
        queryParams.push(parseInt(offset));

        // Try to include categories, but handle gracefully if tables don't exist
        let shapesRes;
        try {
            shapesRes = await query(`
        SELECT 
          ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
          ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
          ai.created_at, ai.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', sc.id,
                'name', sc.name,
                'name_en', sc.name_en,
                'name_ar', sc.name_ar,
                'slug', sc.slug
              )
            ) FILTER (WHERE sc.id IS NOT NULL),
            '[]'::json
          ) as categories
        FROM assets ai
        LEFT JOIN shape_category_assignments sca ON sca.shape_id = ai.id
        LEFT JOIN shape_categories sc ON sc.id = sca.category_id AND sc.is_active = TRUE
        ${whereClause}
        GROUP BY ai.id
        ${orderByClause}
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
      `, queryParams);
        } catch (joinError) {
            // If join fails (tables don't exist), use simpler query without categories
            if (joinError.message && joinError.message.includes('does not exist')) {
                shapesRes = await query(`
          SELECT 
            ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
            ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
            ai.created_at, ai.updated_at,
            '[]'::json as categories
          FROM assets ai
          ${whereClause}
          ${orderByClause}
          LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `, queryParams);
            } else {
                throw joinError;
            }
        }

        // Get total count for pagination (without limit and offset)
        const countParams = queryParams.slice(0, -2); // Remove limit and offset from end
        // Use DISTINCT to count unique shapes when using GROUP BY in main query
        let totalRes;
        try {
            totalRes = await query(`
        SELECT COUNT(DISTINCT ai.id)::int AS total 
        FROM assets ai
        LEFT JOIN shape_category_assignments sca ON sca.shape_id = ai.id
        LEFT JOIN shape_categories sc ON sc.id = sca.category_id AND sc.is_active = TRUE
        ${whereClause}
      `, countParams);
        } catch (joinError) {
            // If join fails, use simpler count query
            if (joinError.message && joinError.message.includes('does not exist')) {
                totalRes = await query(`
          SELECT COUNT(*)::int AS total 
          FROM assets ai
          ${whereClause}
        `, countParams);
            } else {
                throw joinError;
            }
        }

        const total = totalRes.rows[0].total;

        // Get all categories for filtering
        const categoriesRes = await query(`
      SELECT DISTINCT ai.meta->>'category' as category, COUNT(*) as count
      FROM assets ai
      WHERE ai.kind IN ('vector', 'raster') AND ai.meta->>'library_type' = 'shape'
      AND ai.meta->>'category' IS NOT NULL
      GROUP BY ai.meta->>'category'
      ORDER BY count DESC
    `);

        // Format shapes with enhanced metadata and categories
        const includeCategories = include_categories === 'true';
        const shapes = shapesRes.rows.map(shape => {
            const shapeData = {
                id: shape.id,
                name: shape.name,
                url: shape.url,
                type: shape.kind,
                width: shape.width,
                height: shape.height,
                hasAlpha: shape.has_alpha,
                vectorSvg: shape.vector_svg,
                dominantColor: shape.dominant_hex,
                category: shape.meta && typeof shape.meta.category !== 'undefined' ? shape.meta.category : 'general', // Legacy category
                tags: (shape.meta && Array.isArray(shape.meta.tags)) ? shape.meta.tags :
                    (shape.meta && shape.meta.tags ? shape.meta.tags.split(',') : []),
                description: shape.meta && typeof shape.meta.description !== 'undefined' ? shape.meta.description : '',
                keywords: shape.meta && typeof shape.meta.keywords !== 'undefined' ? shape.meta.keywords : [],
                style: shape.meta && typeof shape.meta.style !== 'undefined' ? shape.meta.style : 'outline',
                isPopular: shape.meta && typeof shape.meta.is_popular !== 'undefined' ? shape.meta.is_popular : false,
                isNew: shape.meta && typeof shape.meta.is_new !== 'undefined' ? shape.meta.is_new : false,
                downloadCount: shape.meta && typeof shape.meta.download_count !== 'undefined' ? shape.meta.download_count : 0,
                createdAt: new Date(shape.created_at).toISOString(),
                updatedAt: new Date(shape.updated_at).toISOString()
            };

            // Add categories if requested
            if (includeCategories && shape.categories) {
                shapeData.categories = Array.isArray(shape.categories) ?
                    shape.categories :
                    (typeof shape.categories === 'string' ? JSON.parse(shape.categories) : []);
            }

            return shapeData;
        });

        // Group shapes by category if requested
        let groupedData = shapes;
        if (groupBy === 'category') {
            const categoryGroups = {};
            shapes.forEach(shape => {
                const categoryName = shape.category || 'uncategorized';
                if (!categoryGroups[categoryName]) {
                    categoryGroups[categoryName] = {
                        category: categoryName,
                        count: 0,
                        shapes: []
                    };
                }
                categoryGroups[categoryName].shapes.push(shape);
                categoryGroups[categoryName].count++;
            });

            groupedData = Object.values(categoryGroups).sort((a, b) => b.count - a.count);
        }

        // Prepare response
        const response = {
            success: true,
            data: groupedData,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                categories: categoriesRes.rows.map(cat => ({
                    name: cat.category,
                    count: parseInt(cat.count)
                })),
                types: [
                    { name: 'vector', count: shapes.filter(s => s.type === 'vector').length },
                    { name: 'raster', count: shapes.filter(s => s.type === 'raster').length }
                ]
            },
            metadata: {
                totalShapes: total,
                searchTerm: search || null,
                appliedFilters: {
                    category: category || null,
                    type: type || null,
                    tags: tags || null
                },
                sort: {
                    field: sortField,
                    order: order
                }
            }
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching shapes:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: "Failed to fetch shapes",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            language: "en",
            direction: "ltr"
        });
    }
});

// POST /api/logo/shapes - Add new shape to library
router.post('/shapes', async(req, res) => {
    try {
        const {
            name,
            url,
            type = 'vector',
            width = 100,
            height = 100,
            hasAlpha = true,
            vectorSvg = null,
            category = 'general',
            tags = [],
            description = ''
        } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'name and url are required'
            });
        }

        const meta = {
            library_type: 'shape',
            category,
            tags,
            description
        };

        const result = await query(`
      INSERT INTO assets (kind, name, url, width, height, has_alpha, vector_svg, meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [type, name, url, width, height, hasAlpha, vectorSvg, JSON.stringify(meta)]);

        const shape = result.rows[0];

        res.status(201).json({
            success: true,
            data: {
                id: shape.id,
                name: shape.name,
                url: shape.url,
                type: shape.kind,
                width: shape.width,
                height: shape.height,
                hasAlpha: shape.has_alpha,
                vectorSvg: shape.vector_svg,
                category: (shape.meta && shape.meta.category) ? shape.meta.category : 'general',
                tags: (shape.meta && shape.meta.tags) ? shape.meta.tags : [],
                description: (shape.meta && shape.meta.description) ? shape.meta.description : '',
                createdAt: new Date(shape.created_at).toISOString(),
                updatedAt: new Date(shape.updated_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error creating shape:', error);
        res.status(500).json({ success: false, message: 'Failed to create shape' });
    }
});

// DELETE /api/logo/shapes/:id - Delete specific shape
router.delete('/shapes/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // First check if the shape exists and is a shape type
        const shapeCheck = await query(`
      SELECT id FROM assets 
      WHERE id = $1 AND kind IN ('vector', 'raster') 
      AND meta->>'library_type' = 'shape'
    `, [id]);

        if (shapeCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Shape not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        // Delete shape category assignments first (if they exist)
        try {
            await query(`
        DELETE FROM shape_category_assignments WHERE shape_id = $1
      `, [id]);
        } catch (assignmentError) {
            // If table doesn't exist or error, continue with deletion
            console.warn('Warning: Could not delete shape category assignments:', assignmentError.message);
        }

        // Delete the shape
        const result = await query(`
      DELETE FROM assets 
      WHERE id = $1 AND kind IN ('vector', 'raster') 
      AND meta->>'library_type' = 'shape'
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Shape not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            message: 'Shape deleted successfully',
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error deleting shape:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete shape',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// GET /api/logo/backgrounds - Get all background assets
router.get('/backgrounds', async(req, res) => {
    try {
        const { page = 1, limit = 20, category, type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE ai.kind IN ('raster', 'vector') AND ai.meta->>'library_type' = 'background'";
        let queryParams = [];
        let paramCount = 0;

        if (category) {
            paramCount++;
            whereClause += ` AND ai.meta->>'category' = $${paramCount}`;
            queryParams.push(category);
        }

        if (type) {
            paramCount++;
            whereClause += ` AND ai.kind = $${paramCount}`;
            queryParams.push(type);
        }

        // Add limit and offset parameters
        paramCount++;
        queryParams.push(limit);
        paramCount++;
        queryParams.push(offset);

        const backgroundsRes = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta,
        ai.created_at, ai.updated_at
      FROM assets ai
      ${whereClause}
      ORDER BY ai.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

        const totalRes = await query(`
      SELECT COUNT(*)::int AS total 
      FROM assets ai 
      ${whereClause}
    `, queryParams.slice(0, -2));

        const total = totalRes.rows[0].total;

        const backgrounds = backgroundsRes.rows.map(bg => ({
            id: bg.id,
            name: bg.name,
            url: bg.url,
            type: bg.kind,
            width: bg.width,
            height: bg.height,
            hasAlpha: bg.has_alpha,
            vectorSvg: bg.vector_svg,
            category: bg.meta && bg.meta.category ? bg.meta.category : 'general',
            tags: bg.meta && bg.meta.tags ? bg.meta.tags : [],
            description: bg.meta && bg.meta.description ? bg.meta.description : '',
            createdAt: new Date(bg.created_at).toISOString(),
            updatedAt: new Date(bg.updated_at).toISOString()
        }));

        res.json({
            success: true,
            message: "Backgrounds fetched successfully",
            data: backgrounds,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            language: "en",
            direction: "ltr"
        });
    } catch (error) {
        console.error('Error fetching backgrounds:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch backgrounds",
            language: "en",
            direction: "ltr"
        });
    }
});

// POST /api/logo/backgrounds - Add new background to library
router.post('/backgrounds', async(req, res) => {
    try {
        const {
            name,
            url,
            type = 'raster',
            width = 1920,
            height = 1080,
            hasAlpha = false,
            vectorSvg = null,
            category = 'general',
            tags = [],
            description = ''
        } = req.body;

        if (!name || !url) {
            return res.status(400).json({
                success: false,
                message: 'name and url are required',
                language: "en",
                direction: "ltr"
            });
        }

        const meta = {
            library_type: 'background',
            category,
            tags,
            description
        };

        const result = await query(`
      INSERT INTO assets (kind, name, url, width, height, has_alpha, vector_svg, meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [type, name, url, width, height, hasAlpha, vectorSvg, JSON.stringify(meta)]);

        const background = result.rows[0];

        res.status(201).json({
            success: true,
            message: "Background created successfully",
            data: {
                id: background.id,
                name: background.name,
                url: background.url,
                type: background.kind,
                width: background.width,
                height: background.height,
                hasAlpha: background.has_alpha,
                vectorSvg: background.vector_svg,
                category: background.meta && background.meta.category ? background.meta.category : 'general',
                tags: background.meta && background.meta.tags ? background.meta.tags : [],
                description: background.meta && background.meta.description ? background.meta.description : '',
                createdAt: new Date(background.created_at).toISOString(),
                updatedAt: new Date(background.updated_at).toISOString()
            },
            language: "en",
            direction: "ltr"
        });
    } catch (error) {
        console.error('Error creating background:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create background',
            language: "en",
            direction: "ltr"
        });
    }
});

// GET /api/logo/icons/:id - Get specific icon with categories
router.get('/icons/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const { include_categories = 'true', lang = 'en' } = req.query;

        // Try to include categories, but handle gracefully if tables don't exist
        let result;
        try {
            result = await query(`
        SELECT 
          ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
          ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
          ai.created_at, ai.updated_at,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ic.id,
                'name', CASE WHEN $2 = 'ar' THEN COALESCE(ic.name_ar, ic.name_en, ic.name) ELSE COALESCE(ic.name_en, ic.name) END,
                'name_en', ic.name_en,
                'name_ar', ic.name_ar,
                'slug', ic.slug,
                'description', CASE WHEN $2 = 'ar' THEN COALESCE(ic.description_ar, ic.description_en, ic.description) ELSE COALESCE(ic.description_en, ic.description) END
              )
            ) FILTER (WHERE ic.id IS NOT NULL),
            '[]'::json
          ) as categories
        FROM assets ai
        LEFT JOIN icon_category_assignments ica ON ica.icon_id = ai.id
        LEFT JOIN icon_categories ic ON ic.id = ica.category_id AND ic.is_active = TRUE
        WHERE ai.id = $1 AND ai.kind IN ('vector', 'raster') 
        AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
        GROUP BY ai.id
      `, [id, lang]);
        } catch (joinError) {
            // If join fails (tables don't exist), use simpler query without categories
            if (joinError.message && joinError.message.includes('does not exist')) {
                result = await query(`
          SELECT 
            ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
            ai.has_alpha, ai.vector_svg, ai.meta, ai.dominant_hex,
            ai.created_at, ai.updated_at,
            '[]'::json as categories
          FROM assets ai
          WHERE ai.id = $1 AND ai.kind IN ('vector', 'raster') 
          AND (ai.meta->>'library_type' = 'icon' OR ai.meta->>'library_type' IS NULL)
        `, [id]);
            } else {
                throw joinError;
            }
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Icon not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        const icon = result.rows[0];
        const iconData = {
            id: icon.id,
            kind: icon.kind,
            name: icon.name,
            url: icon.url,
            width: icon.width,
            height: icon.height,
            has_alpha: icon.has_alpha,
            vector_svg: icon.vector_svg,
            meta: icon.meta,
            dominant_hex: icon.dominant_hex,
            created_at: icon.created_at,
            updated_at: icon.updated_at
        };

        // Add categories if requested
        if (include_categories === 'true' && icon.categories) {
            iconData.categories = Array.isArray(icon.categories) ?
                icon.categories :
                (typeof icon.categories === 'string' ? JSON.parse(icon.categories) : []);
        }

        res.json({
            success: true,
            data: iconData,
            language: lang,
            direction: lang === 'ar' ? 'rtl' : 'ltr'
        });
    } catch (error) {
        console.error('Error fetching icon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch icon',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// PATCH /api/logo/icons/:id - Update specific icon
router.patch('/icons/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic update query
        const setClause = [];
        const values = [];
        let paramCount = 0;

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                paramCount++;
                setClause.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided',
                language: 'en',
                direction: 'ltr'
            });
        }

        paramCount++;
        values.push(id);

        const result = await query(`
      UPDATE assets 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND kind IN ('vector', 'raster') 
      AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
      RETURNING *
    `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Icon not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error updating icon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update icon',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// DELETE /api/logo/icons/:id - Delete specific icon
router.delete('/icons/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // First check if the icon exists and is an icon type
        const iconCheck = await query(`
      SELECT id FROM assets 
      WHERE id = $1 AND kind IN ('vector', 'raster') 
      AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
    `, [id]);

        if (iconCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Icon not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        // Check if the icon is referenced in any layers
        const layerCheck = await query(`
      SELECT COUNT(*) as count FROM layer_icon WHERE asset_id = $1
    `, [id]);

        if (parseInt(layerCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete icon: it is being used in existing logos',
                language: 'en',
                direction: 'ltr'
            });
        }

        // Delete icon category assignments first (if they exist)
        try {
            await query(`
        DELETE FROM icon_category_assignments WHERE icon_id = $1
      `, [id]);
        } catch (assignmentError) {
            // If table doesn't exist or error, continue with deletion
            console.warn('Warning: Could not delete icon category assignments:', assignmentError.message);
        }

        // Delete the icon
        const result = await query(`
      DELETE FROM assets 
      WHERE id = $1 AND kind IN ('vector', 'raster') 
      AND (meta->>'library_type' = 'icon' OR meta->>'library_type' IS NULL)
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Icon not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            message: 'Icon deleted successfully',
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error deleting icon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete icon',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            language: 'en',
            direction: 'ltr'
        });
    }
});

// GET /api/logo/backgrounds/:id - Get specific background
router.get('/backgrounds/:id', async(req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        ai.id, ai.kind, ai.name, ai.url, ai.width, ai.height, 
        ai.has_alpha, ai.vector_svg, ai.meta,
        ai.created_at, ai.updated_at
      FROM assets ai
      WHERE ai.id = $1 AND ai.kind IN ('raster', 'vector') 
      AND ai.meta->>'library_type' = 'background'
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Background not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error fetching background:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch background',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// PATCH /api/logo/backgrounds/:id - Update specific background
router.patch('/backgrounds/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Build dynamic update query
        const setClause = [];
        const values = [];
        let paramCount = 0;

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                paramCount++;
                setClause.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
            }
        });

        if (setClause.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided',
                language: 'en',
                direction: 'ltr'
            });
        }

        paramCount++;
        values.push(id);

        const result = await query(`
      UPDATE assets 
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND kind IN ('raster', 'vector') 
      AND meta->>'library_type' = 'background'
      RETURNING *
    `, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Background not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error updating background:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update background',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// DELETE /api/logo/backgrounds/:id - Delete specific background
router.delete('/backgrounds/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // First check if the background is referenced in any layers
        const layerCheck = await query(`
      SELECT COUNT(*) as count FROM layer_background WHERE asset_id = $1
    `, [id]);

        if (parseInt(layerCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete background: it is being used in existing logos',
                language: 'en',
                direction: 'ltr'
            });
        }

        const result = await query(`
      DELETE FROM assets 
      WHERE id = $1 AND kind IN ('raster', 'vector') 
      AND meta->>'library_type' = 'background'
      RETURNING *
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Background not found',
                language: 'en',
                direction: 'ltr'
            });
        }

        res.json({
            success: true,
            message: 'Background deleted successfully',
            data: result.rows[0],
            language: 'en',
            direction: 'ltr'
        });
    } catch (error) {
        console.error('Error deleting background:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete background',
            language: 'en',
            direction: 'ltr'
        });
    }
});

// ==============================================
// LOGO SEARCH ENDPOINT
// ==============================================

// GET /api/logo/search - Search logos by tags, title, and description
// Supports:
// - query parameter: text search in titles, descriptions, and tags
// - tags parameter: filter by multiple tags (OR logic - logo must contain ANY of the tags)
//   Can be passed as: tags=Diet,Discipline,Disk-Like or tags[]=Diet&tags[]=Discipline&tags[]=Disk-Like
router.get('/search', async(req, res) => {
    try {
        const { query: searchQuery, tags: tagsParam, lang = 'en', page = 1, limit = 20 } = req.query;

        // At least one of query or tags must be provided
        const hasQuery = searchQuery && searchQuery.trim().length > 0;
        const hasTags = tagsParam && (Array.isArray(tagsParam) ? tagsParam.length > 0 : tagsParam.trim().length > 0);

        if (!hasQuery && !hasTags) {
            const currentLang = res.locals.lang || "en";
            return res.status(400).json(fail(currentLang, currentLang === "ar" ? "يرجى إدخال نص البحث أو علامات" : "Search query or tags are required"));
        }

        const searchTerm = hasQuery ? searchQuery.trim() : null;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const offset = (pageNum - 1) * limitNum;

        // Parse tags parameter - support both comma-separated string and array format
        let selectedTags = [];
        if (hasTags) {
            if (Array.isArray(tagsParam)) {
                selectedTags = tagsParam.map(t => t.trim()).filter(Boolean);
            } else {
                selectedTags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
            }
        }

        // Build WHERE conditions
        const whereConditions = [];
        const queryParams = [];
        let paramIndex = 1;

        // Text search condition (if query provided)
        if (hasQuery) {
            const searchPattern = `%${searchTerm}%`;
            whereConditions.push(`(
                -- Search in title fields
                l.title ILIKE $${paramIndex} OR
                l.title_en ILIKE $${paramIndex} OR
                l.title_ar ILIKE $${paramIndex} OR
                -- Search in description fields
                l.description ILIKE $${paramIndex} OR
                l.description_en ILIKE $${paramIndex} OR
                l.description_ar ILIKE $${paramIndex} OR
                -- Search in tags (JSONB array) - check if any tag contains the search term
                EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                    WHERE tag ILIKE $${paramIndex}
                ) OR
                EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                    WHERE tag ILIKE $${paramIndex}
                ) OR
                EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags_ar, '[]'::jsonb)) AS tag
                    WHERE tag ILIKE $${paramIndex}
                )
            )`);
            queryParams.push(searchPattern);
            paramIndex++;
        }

        // Tags filter condition (OR logic - logo must contain ANY of the selected tags)
        // We check each tag in the appropriate localized tags array
        if (selectedTags.length > 0) {
            const tagConditions = [];
            for (const tag of selectedTags) {
                // Check if tag exists in any of the localized tag arrays (tags, tags_en, tags_ar)
                // For the given language, prefer the language-specific tags, then fallback to base tags
                if (lang === 'ar') {
                    // For Arabic: check tags_ar first, then tags_en, then tags
                    tagConditions.push(`(
                        EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags_ar, '[]'::jsonb)) AS tag
                            WHERE LOWER(tag) = LOWER($${paramIndex})
                        ) OR
                        EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                            WHERE LOWER(tag) = LOWER($${paramIndex})
                        ) OR
                        EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                            WHERE LOWER(tag) = LOWER($${paramIndex})
                        )
                    )`);
                } else {
                    // For English and other languages: check tags_en first, then tags
                    tagConditions.push(`(
                        EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                            WHERE LOWER(tag) = LOWER($${paramIndex})
                        ) OR
                        EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                            WHERE LOWER(tag) = LOWER($${paramIndex})
                        )
                    )`);
                }
                queryParams.push(tag);
                paramIndex++;
            }
            // Any tag condition can be true (OR logic)
            whereConditions.push(`(${tagConditions.join(' OR ')})`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Query to search logos
        const logosRes = await query(`
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
                c.name as category_name, c.name_en as category_name_en, c.name_ar as category_name_ar,
                c.description as category_description, c.description_en as category_description_en, c.description_ar as category_description_ar
            FROM logos l
            LEFT JOIN categories c ON c.id = l.category_id
            ${whereClause}
            ORDER BY l.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limitNum, offset]);

        // Get total count for pagination
        const totalRes = await query(`
            SELECT COUNT(*)::int AS total
            FROM logos l
            ${whereClause}
        `, queryParams);

        const total = totalRes.rows[0].total;
        const pages = Math.ceil(total / limitNum);
        const hasMore = pageNum < pages;

        // If no logos found, return empty result
        if (logosRes.rows.length === 0) {
            const currentLang = res.locals.lang || "en";
            return res.json(ok({
                data: [],
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: 0,
                    pages: 0,
                    hasMore: false
                },
                query: searchTerm || null,
                tags: selectedTags.length > 0 ? selectedTags : null
            }, currentLang, currentLang === "ar" ? "لم يتم العثور على نتائج" : "No results found"));
        }

        // Transform logos to simplified format (id, name, description only)
        const data = logosRes.rows.map(logo => {
            // Get localized name (title)
            const name = lang === 'ar' ?
                (logo.title_ar || logo.title_en || logo.title) :
                (logo.title_en || logo.title);

            // Get localized description
            const description = lang === 'ar' ?
                (logo.description_ar || logo.description_en || logo.description) :
                (logo.description_en || logo.description);

            return {
                id: logo.id.toString(),
                name: name || '',
                description: description || ''
            };
        });

        const currentLang = res.locals.lang || "en";
        return res.json(ok({
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages,
                hasMore
            },
            query: searchTerm || null,
            tags: selectedTags.length > 0 ? selectedTags : null
        }, currentLang, currentLang === "ar" ? "تم البحث بنجاح" : "Search completed successfully"));
    } catch (error) {
        console.error('Error searching logos:', error);
        const currentLang = res.locals.lang || "en";
        return res.status(500).json(fail(currentLang, currentLang === "ar" ? "خطأ في البحث" : "Failed to search logos"));
    }
});

// ==============================================
// TAG SUGGESTIONS ENDPOINT
// ==============================================

// GET /api/logo/tags/suggest - Get tag suggestions for autocomplete and trending tags
// Query parameters:
//   - query (optional): Filter tags by text (case-insensitive prefix/contains match)
//   - lang (optional, default: 'en'): Language for localized tags
//   - limit (optional, default: 20): Maximum number of tags to return
// Behavior:
//   - If query is empty/missing: Returns trending/most used tags (top N)
//   - If query is provided: Returns tags that match the query, sorted by relevance
router.get('/tags/suggest', async(req, res) => {
    try {
        const { query: searchQuery, lang = 'en', limit = 20 } = req.query;
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const hasQuery = searchQuery && searchQuery.trim().length > 0;
        const searchTerm = hasQuery ? searchQuery.trim().toLowerCase() : null;

        let result;
        if (hasQuery) {
            // Search mode: Find tags that match the query (prefix or contains match)
            // We'll search across all tag columns and aggregate unique tags with their usage counts
            // For Arabic: search tags_ar, tags_en, tags
            // For English/others: search tags_en, tags
            if (lang === 'ar') {
                result = await query(`
                    WITH all_tags AS (
                        -- Get tags from tags_ar column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_ar, '[]'::jsonb)) AS tag
                        WHERE l.tags_ar IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_ar, '[]'::jsonb)) > 0
                            AND (LOWER(tag) LIKE $1 OR LOWER(tag) LIKE $2)
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from tags_en column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                        WHERE l.tags_en IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_en, '[]'::jsonb)) > 0
                            AND (LOWER(tag) LIKE $1 OR LOWER(tag) LIKE $2)
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from base tags column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                        WHERE l.tags IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags, '[]'::jsonb)) > 0
                            AND (LOWER(tag) LIKE $1 OR LOWER(tag) LIKE $2)
                        GROUP BY LOWER(tag), tag
                    )
                    SELECT 
                        tag_original as tag,
                        SUM(usage_count) as usage_count
                    FROM all_tags
                    GROUP BY tag_original
                    ORDER BY 
                        -- Prioritize prefix matches (tags starting with query)
                        CASE WHEN LOWER(tag_original) LIKE $3 THEN 0 ELSE 1 END,
                        -- Then by usage count (most frequent first)
                        SUM(usage_count) DESC,
                        -- Then alphabetically
                        tag_original ASC
                    LIMIT $4
                `, [
                    `${searchTerm}%`, // Prefix match
                    `%${searchTerm}%`, // Contains match
                    `${searchTerm}%`, // For prefix priority
                    limitNum
                ]);
            } else {
                result = await query(`
                    WITH all_tags AS (
                        -- Get tags from tags_en column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                        WHERE l.tags_en IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_en, '[]'::jsonb)) > 0
                            AND (LOWER(tag) LIKE $1 OR LOWER(tag) LIKE $2)
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from base tags column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                        WHERE l.tags IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags, '[]'::jsonb)) > 0
                            AND (LOWER(tag) LIKE $1 OR LOWER(tag) LIKE $2)
                        GROUP BY LOWER(tag), tag
                    )
                    SELECT 
                        tag_original as tag,
                        SUM(usage_count) as usage_count
                    FROM all_tags
                    GROUP BY tag_original
                    ORDER BY 
                        -- Prioritize prefix matches (tags starting with query)
                        CASE WHEN LOWER(tag_original) LIKE $3 THEN 0 ELSE 1 END,
                        -- Then by usage count (most frequent first)
                        SUM(usage_count) DESC,
                        -- Then alphabetically
                        tag_original ASC
                    LIMIT $4
                `, [
                    `${searchTerm}%`, // Prefix match
                    `%${searchTerm}%`, // Contains match
                    `${searchTerm}%`, // For prefix priority
                    limitNum
                ]);
            }
        } else {
            // Trending mode: Return most used tags (top N)
            if (lang === 'ar') {
                result = await query(`
                    WITH all_tags AS (
                        -- Get tags from tags_ar column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_ar, '[]'::jsonb)) AS tag
                        WHERE l.tags_ar IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_ar, '[]'::jsonb)) > 0
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from tags_en column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                        WHERE l.tags_en IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_en, '[]'::jsonb)) > 0
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from base tags column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                        WHERE l.tags IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags, '[]'::jsonb)) > 0
                        GROUP BY LOWER(tag), tag
                    )
                    SELECT 
                        tag_original as tag,
                        SUM(usage_count) as usage_count
                    FROM all_tags
                    GROUP BY tag_original
                    ORDER BY 
                        SUM(usage_count) DESC,  -- Most frequent first
                        tag_original ASC        -- Then alphabetically
                    LIMIT $1
                `, [limitNum]);
            } else {
                result = await query(`
                    WITH all_tags AS (
                        -- Get tags from tags_en column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags_en, '[]'::jsonb)) AS tag
                        WHERE l.tags_en IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags_en, '[]'::jsonb)) > 0
                        GROUP BY LOWER(tag), tag
                        
                        UNION ALL
                        
                        -- Get tags from base tags column
                        SELECT 
                            LOWER(tag) as tag_lower,
                            tag as tag_original,
                            COUNT(*) as usage_count
                        FROM logos l,
                        LATERAL jsonb_array_elements_text(COALESCE(l.tags, '[]'::jsonb)) AS tag
                        WHERE l.tags IS NOT NULL 
                            AND jsonb_array_length(COALESCE(l.tags, '[]'::jsonb)) > 0
                        GROUP BY LOWER(tag), tag
                    )
                    SELECT 
                        tag_original as tag,
                        SUM(usage_count) as usage_count
                    FROM all_tags
                    GROUP BY tag_original
                    ORDER BY 
                        SUM(usage_count) DESC,  -- Most frequent first
                        tag_original ASC        -- Then alphabetically
                    LIMIT $1
                `, [limitNum]);
            }
        }

        // Format response
        const tags = result.rows.map(row => ({
            tag: row.tag,
            usageCount: parseInt(row.usage_count, 10) || 0
        }));

        const currentLang = res.locals.lang || lang;
        return res.json({
            success: true,
            data: tags,
            query: searchTerm || null,
            lang: currentLang
        });
    } catch (error) {
        console.error('Error fetching tag suggestions:', error);
        const currentLang = res.locals.lang || "en";
        return res.status(500).json({
            success: false,
            message: currentLang === "ar" ? "فشل في جلب اقتراحات العلامات" : "Failed to fetch tag suggestions",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==============================================
// LOGO CRUD OPERATIONS
// ==============================================

// GET /api/logo/:id - Get logo by ID with all layers and their properties
router.get('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const { format, lang = 'en' } = req.query;

        // If mobile format is requested, redirect to mobile endpoint
        if (format === 'mobile') {
            return res.redirect(`/api/logo/${id}/mobile`);
        }

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
        c.name as category_name, c.name_en as category_name_en, c.name_ar as category_name_ar,
        c.description as category_description, c.description_en as category_description_en, c.description_ar as category_description_ar
      FROM logos l
      LEFT JOIN categories c ON c.id = l.category_id
      WHERE l.id = $1
    `, [id]);

        if (logoRes.rows.length === 0) {
            const currentLang = res.locals.lang || "en";
            return res.status(404).json(fail(currentLang, currentLang === "ar" ? "Ø§Ù„Ø´Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "Logo not found"));
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
        
        -- Asset data for icons and images (separate joins for different asset types)
        ai.id as asset_id, ai.kind as asset_kind, ai.name as asset_name,
        ai.url as asset_url, ai.width as asset_width, ai.height as asset_height,
        ai.has_alpha as asset_has_alpha, ai.vector_svg, ai.meta as asset_meta,
        
        -- Background asset data (separate join to ensure background assets are retrieved)
        ai_bg.id as bg_asset_joined_id, ai_bg.kind as bg_asset_kind, ai_bg.name as bg_asset_name,
        ai_bg.url as bg_asset_url, ai_bg.width as bg_asset_width, ai_bg.height as bg_asset_height,
        ai_bg.has_alpha as bg_asset_has_alpha, ai_bg.vector_svg as bg_asset_vector_svg, ai_bg.meta as bg_asset_meta,
        
        -- Font data for text layers (use different aliases to avoid conflict with layer_text fields)
        f.family as font_family, f.style as default_font_style, f.weight as default_font_weight,
        f.url as font_url, f.fallbacks as font_fallbacks
      FROM layers lay
      LEFT JOIN layer_text lt ON lt.layer_id = lay.id
      LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
      LEFT JOIN layer_icon li ON li.layer_id = lay.id
      LEFT JOIN layer_image lim ON lim.layer_id = lay.id
      LEFT JOIN layer_background lb ON lb.layer_id = lay.id
      LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id)
      LEFT JOIN assets ai_bg ON ai_bg.id = lb.asset_id
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
                            // Top-level font properties using actual DB values from layer_text (not hardcoded defaults)
                            font: row.font_family || null,
                            fontWeight: row.font_weight || null,
                            fontStyle: row.font_style || null,
                            // Nested font object with full details
                            fontDetails: row.font_family ? {
                                family: row.font_family,
                                style: row.font_style || row.default_font_style,
                                weight: row.font_weight || row.default_font_weight,
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
                    // Use the dedicated background asset join (ai_bg) for background layers
                    const bgAssetId = row.bg_asset_id || row.bg_asset_joined_id;
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
                            // Use the dedicated background asset join data
                            asset: row.bg_asset_joined_id ? {
                                id: row.bg_asset_joined_id,
                                kind: row.bg_asset_kind,
                                name: row.bg_asset_name,
                                url: row.bg_asset_url,
                                width: row.bg_asset_width,
                                height: row.bg_asset_height,
                                has_alpha: row.bg_asset_has_alpha,
                                vector_svg: row.bg_asset_vector_svg,
                                meta: row.bg_asset_meta
                            } : (row.bg_asset_id ? {
                                // If bg_asset_id exists but join didn't return data, still include asset_id
                                id: row.bg_asset_id,
                                url: null,
                                note: 'Asset data not found - asset may not exist in assets table'
                            } : null)
                        }
                    };

                default:
                    return baseLayer;
            }
        });

        // Parse tags arrays from JSON if they are strings
        const tags_en = logo.tags_en ? (typeof logo.tags_en === 'string' ? JSON.parse(logo.tags_en) : logo.tags_en) : [];
        const tags_ar = logo.tags_ar ? (typeof logo.tags_ar === 'string' ? JSON.parse(logo.tags_ar) : logo.tags_ar) : [];
        const tags = logo.tags ? (typeof logo.tags === 'string' ? JSON.parse(logo.tags) : logo.tags) : [];

        // Localize the logo data based on language preference
        const localizedLogo = {
            ...logo,
            // Add all required top-level fields
            categoryId: logo.category_id,
            name_en: logo.title_en,
            name_ar: logo.title_ar,
            description_en: logo.description_en,
            description_ar: logo.description_ar,
            tags_en: tags_en,
            tags_ar: tags_ar,
            // Use localized text based on language preference
            title: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
            description: lang === 'ar' ? (logo.description_ar || logo.description_en || logo.description) : (logo.description_en || logo.description),
            tags: lang === 'ar' ? tags_ar : tags_en.length > 0 ? tags_en : tags,
            category_name: lang === 'ar' ? (logo.category_name_ar || logo.category_name_en || logo.category_name) : (logo.category_name_en || logo.category_name),
            category_description: lang === 'ar' ? (logo.category_description_ar || logo.category_description_en || logo.category_description) : (logo.category_description_en || logo.category_description),
            // Add language metadata
            language: lang,
            direction: lang === 'ar' ? 'rtl' : 'ltr'
        };

        const currentLang = res.locals.lang || "en";
        return res.json(ok({
            ...localizedLogo,
            layers
        }, currentLang, currentLang === "ar" ? "ØªÙ… Ø¬Ù„Ø¨ Ø§Ù„Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­" : "Logo fetched successfully"));
    } catch (error) {
        console.error('Error fetching logo with layers:', error);
        const lang = res.locals.lang || "en";
        return res.status(500).json(fail(lang, lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ø´Ø¹Ø§Ø±" : "Failed to fetch logo"));
    }
});

// (removed duplicated legacy CRUD routes below; keeping newer implementations later in file)

// ==============================================
// MOBILE-COMPATIBLE ENDPOINTS
// ==============================================

// (Removed earlier duplicate mobile endpoints to use the robust versions below)

// POST /api/logo - Create new logo with layers
router.post('/', async(req, res) => {
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
            // Multilingual fields
            title_en,
            title_ar,
            description_en,
            description_ar,
            tags_en,
            tags_ar,
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

        // Validate that at least one title is provided (either legacy title or multilingual)
        if (!title && !title_en && !title_ar) {
            return res.status(400).json({
                success: false,
                message: "At least one title is required (title, title_en, or title_ar)",
                language: "en",
                direction: "ltr"
            });
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

        // Create logo with all new fields including multilingual support
        const logoRes = await client.query(`
      INSERT INTO logos (
        owner_id, title, description, canvas_w, canvas_h, dpi, category_id, is_template, template_id,
        colors_used, vertical_align, horizontal_align, responsive_version, responsive_description,
        scaling_method, position_method, fully_responsive, tags, version, responsive,
        export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
        canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
        canvas_background_image_type, canvas_background_image_path,
        title_en, title_ar, description_en, description_ar, tags_en, tags_ar
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)
      RETURNING *
    `, [
            actualOwnerId, title, description, canvas_w, canvas_h, dpi, category_id, is_template, template_id,
            JSON.stringify(colors_used), vertical_align, horizontal_align, responsive_version, responsive_description,
            scaling_method, position_method, fully_responsive, JSON.stringify(tags), version, responsive,
            export_format, export_transparent_background, export_quality, export_scalable, export_maintain_aspect_ratio,
            canvas_background_type, canvas_background_solid_color, canvas_background_gradient,
            canvas_background_image_type, canvas_background_image_path,
            title_en, title_ar, description_en, description_ar,
            tags_en ? JSON.stringify(tags_en) : null,
            tags_ar ? JSON.stringify(tags_ar) : null
        ]);

        const logo = logoRes.rows[0];
        const createdLayers = [];

        // Process each layer
        for (const layerData of layers) {
            const {
                type: rawType,
                name,
                z_index = 0,
                x_norm = 0.5,
                y_norm = 0.5,
                scale = 1,
                rotation_deg = 0,
                anchor_x = 0.5,
                anchor_y = 0.5,
                opacity = 1,
                blend_mode = 'normal',
                is_visible = true,
                is_locked = false,
                flip_horizontal = false,
                flip_vertical = false,
                common_style,
                text,
                shape,
                icon,
                image,
                background
            } = layerData;

            // Normalize type to uppercase for database compatibility
            const type = rawType ? rawType.toUpperCase() : 'TEXT';

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
                stroke_width, stroke_align, gradient, underline, underline_direction,
                text_case, font_style, font_weight, text_decoration, text_transform, font_variant
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
            `, [
                            layer.id, text.content, text.font_id, text.font_size, text.line_height,
                            text.letter_spacing, text.align, text.baseline, text.fill_hex, text.fill_alpha,
                            text.stroke_hex, text.stroke_alpha, text.stroke_width, text.stroke_align, text.gradient,
                            text.underline || false, text.underline_direction || 'horizontal',
                            text.text_case || 'normal', text.font_style || 'normal', text.font_weight || 'normal',
                            text.text_decoration || 'none', text.text_transform || 'none', text.font_variant || 'normal'
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

        const lang = res.locals.lang || "en";
        return res.status(201).json(ok({
            ...logo,
            layers: createdLayers
        }, lang, lang === "ar" ? "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­" : "Logo created successfully"));
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating logo:', error);
        const lang = res.locals.lang || "en";
        return res.status(500).json(fail(lang, lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø´Ø¹Ø§Ø±" : "Failed to create logo"));
    } finally {
        client.release();
    }
});

// PATCH /api/logo/:id - Update logo
router.patch('/:id', async(req, res) => {
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
            const currentLang = (typeof res.locals.lang !== 'undefined' && res.locals.lang !== null) ? res.locals.lang : "en";
            return res.status(404).json(fail(currentLang, currentLang === "ar" ? "Ø§Ù„Ø´Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "Logo not found"));
        }

        const lang = (typeof res.locals.lang !== 'undefined' && res.locals.lang !== null) ? res.locals.lang : "en";
        return res.json(ok(result.rows[0], lang, lang === "ar" ? "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­" : "Logo updated successfully"));
    } catch (error) {
        console.error('Error updating logo:', error);
        const lang = (typeof res.locals.lang !== 'undefined' && res.locals.lang !== null) ? res.locals.lang : "en";
        return res.status(500).json(fail(lang, lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø´Ø¹Ø§Ø±" : "Failed to update logo"));
    }
});

// DELETE /api/logo/:id - Delete logo
router.delete('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM logos WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            const currentLang = res.locals.lang && res.locals.lang !== undefined ? res.locals.lang : "en";
            return res.status(404).json(fail(currentLang, currentLang === "ar" ? "Ø§Ù„Ø´Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "Logo not found"));
        }

        const lang = res.locals.lang && res.locals.lang !== undefined ? res.locals.lang : "en";
        return res.json(ok(result.rows[0], lang, lang === "ar" ? "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø´Ø¹Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­" : "Logo deleted successfully"));
    } catch (error) {
        console.error('Error deleting logo:', error);
        const lang = res.locals.lang && res.locals.lang !== undefined ? res.locals.lang : "en";
        return res.status(500).json(fail(lang, lang === "ar" ? "Ø®Ø·Ø£ ÙÙŠ Ø­Ø°Ù Ø§Ù„Ø´Ø¹Ø§Ø±" : "Failed to delete logo"));
    }
});

// POST /api/logo/:id/version - Create version snapshot
router.post('/:id/version', async(req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        // Get current logo with all layers
        const logoResult = await query('SELECT get_logo_with_layers($1) as snapshot', [id]);

        if (!logoResult.rows[0].snapshot) {
            const currentLang = (typeof res.locals.lang !== 'undefined' && res.locals.lang !== null) ? res.locals.lang : "en";
            return res.status(404).json(fail(currentLang, currentLang === "ar" ? "Ø§Ù„Ø´Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "Logo not found"));
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
router.get('/:id/versions', async(req, res) => {
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

// GET /api/logo/mobile/legacy - Get all logos in mobile legacy format (must be before /:id routes)
router.get('/mobile/legacy', getAllLogosMobileLegacy);

// GET /api/logo/:id/mobile - Get logo in mobile-compatible format
router.get('/:id/mobile', getLogoMobile);

// GET /api/logo/:id/mobile/legacy - Get logo in mobile legacy format
router.get('/:id/mobile/legacy', getLogoMobileLegacy);


// GET /api/logo/:id/mobile-structured - Return exact mobile JSON structure as requested
router.get('/:id/mobile-structured', async(req, res) => {
    try {
        const { id } = req.params;
        const { format } = req.query;
        const useLegacyFormat = format === 'legacy';

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
            const currentLang = res.locals.lang ? res.locals.lang : "en";
            return res.status(404).json(fail(currentLang, currentLang === "ar" ? "Ø§Ù„Ø´Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯" : "Logo not found"));
        }

        const logo = logoRes.rows[0];

        // Fetch layers with joins for type-specific and asset/font data
        const layersRes = await query(`
      SELECT 
        lay.id, lay.logo_id, lay.type, lay.z_index, lay.x_norm, lay.y_norm, lay.scale, lay.rotation_deg,
        lay.opacity, lay.is_visible, lay.flip_horizontal, lay.flip_vertical,
        -- Text
        lt.content, lt.font_id, lt.font_size, lt.line_height, lt.letter_spacing,
        lt.align, lt.baseline, lt.fill_hex, lt.fill_alpha, lt.stroke_hex,
        lt.stroke_alpha, lt.stroke_width, lt.stroke_align, lt.gradient as text_gradient,
        f.family as font_family, f.style as font_style, f.weight as font_weight,
        -- Shape
        ls.shape_kind, ls.fill_hex as shape_fill_hex, ls.stroke_hex as shape_stroke_hex,
        ls.stroke_width as shape_stroke_width, ls.meta as shape_meta,
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
      LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
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
                position: { x: (num(row.x_norm) !== null && num(row.x_norm) !== undefined ? num(row.x_norm) : 0.5), y: (num(row.y_norm) !== null && num(row.y_norm) !== undefined ? num(row.y_norm) : 0.5) },
                scaleFactor: (num(row.scale) !== null && num(row.scale) !== undefined ? num(row.scale) : 1),
                rotation: (num(row.rotation_deg) !== null && num(row.rotation_deg) !== undefined ? num(row.rotation_deg) : 0),
                opacity: (num(row.opacity) !== null && num(row.opacity) !== undefined ? num(row.opacity) : 1),
                flip: { horizontal: !!row.flip_horizontal, vertical: !!row.flip_vertical }
            };

            switch (row.type) {
                case 'TEXT':
                    return {
                        ...base,
                        text: {
                            value: row.content || '',
                            font: row.font_family || 'Arial',
                            fontSize: typeof num(row.font_size) !== 'undefined' && num(row.font_size) !== null ? num(row.font_size) : 48,
                            fontColor: row.fill_hex ? row.fill_hex : '#000000',
                            fontWeight: row.font_weight ? row.font_weight : 'normal',
                            fontStyle: row.font_style ? row.font_style : 'normal',
                            alignment: row.align ? row.align : 'center',
                            baseline: row.baseline ? row.baseline : 'alphabetic',
                            lineHeight: typeof num(row.line_height) !== 'undefined' && num(row.line_height) !== null ? num(row.line_height) : 1.0,
                            letterSpacing: typeof num(row.letter_spacing) !== 'undefined' && num(row.letter_spacing) !== null ? num(row.letter_spacing) : 0,
                            fillAlpha: typeof num(row.fill_alpha) !== 'undefined' && num(row.fill_alpha) !== null ? num(row.fill_alpha) : 1.0,
                            strokeHex: row.stroke_hex ? row.stroke_hex : null,
                            strokeAlpha: typeof num(row.stroke_alpha) !== 'undefined' && num(row.stroke_alpha) !== null ? num(row.stroke_alpha) : null,
                            strokeWidth: typeof num(row.stroke_width) !== 'undefined' && num(row.stroke_width) !== null ? num(row.stroke_width) : null,
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
                        ...base,
                        icon: {
                            src: row.asset_url || row.asset_name || (row.asset_id ? `icon_${row.asset_id}` : ''),
                            color: row.tint_hex || '#000000'
                        }
                    };
                case 'IMAGE':
                    return {
                        ...base,
                        image: { type: 'imported', path: row.asset_url || '' }
                    };
                case 'SHAPE':
                    return {
                        ...base,
                        shape: {
                            src: (row.shape_meta && row.shape_meta.src) ? row.shape_meta.src : null,
                            type: row.shape_kind ? row.shape_kind : 'rect',
                            color: row.shape_fill_hex ? row.shape_fill_hex : '#000000',
                            strokeColor: row.shape_stroke_hex ? row.shape_stroke_hex : null,
                            strokeWidth: typeof num(row.shape_stroke_width) !== 'undefined' && num(row.shape_stroke_width) !== null ? num(row.shape_stroke_width) : 0
                        }
                    };
                case 'BACKGROUND':
                    return {
                        ...base,
                        background: {
                            type: row.bg_mode || 'solid',
                            color: row.bg_fill_hex || '#ffffff',
                            image: row.bg_asset_url ? {
                                type: 'imported',
                                path: row.bg_asset_url,
                                src: row.asset_name || row.bg_asset_url
                            } : null
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
                background: useLegacyFormat ?
                    transformBackgroundToLegacy({
                        type: logo.canvas_background_type || 'solid',
                        solidColor: logo.canvas_background_solid_color || null,
                        gradient: logo.canvas_background_gradient || null,
                        image: logo.canvas_background_image_path ? { type: logo.canvas_background_image_type || 'imported', path: logo.canvas_background_image_path } : null
                    }) : {
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
                fullyResponsive: (typeof logo.fully_fresponsive !== 'undefined' && logo.fully_fresponsive !== null) ? logo.fully_fresponsive : true
            },
            metadata: {
                createdAt: new Date(logo.created_at).toISOString(),
                updatedAt: new Date(logo.updated_at).toISOString(),
                tags: Array.isArray(logo.tags) ? logo.tags : ['logo', 'design', 'responsive'],
                version: logo.version || 3,
                responsive: (typeof logo.responsive !== 'undefined' && logo.responsive !== null) ? logo.responsive : true
            },
            export: {
                format: logo.export_format || 'png',
                transparentBackground: typeof logo.export_transparent_background !== 'undefined' ? logo.export_transparent_background : true,
                quality: logo.export_quality || 100,
                responsive: {
                    scalable: typeof logo.export_scalable !== 'undefined' ? logo.export_scalable : true,
                    maintainAspectRatio: typeof logo.export_maintain_aspect_ratio !== 'undefined' ? logo.export_maintain_aspect_ratio : true
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

// ==============================================
module.exports = router;