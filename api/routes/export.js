const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configure Cloudinary
cloudinary.config({});

// ==============================================
// EXPORT/RENDER ENDPOINTS
// ==============================================

// GET /api/logo/:id/export - Export logo as PNG (comprehensive server-side rendering)
router.get('/logo/:id/export', async(req, res) => {
    try {
        const { id } = req.params;
        const { width, height, dpi = 300, quality = 100, format = 'png' } = req.query;

        // Fetch logo with all layers using the same query as GET /api/logo/:id
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
        l.created_at, l.updated_at
      FROM logos l
      WHERE l.id = $1
    `, [id]);

        if (logoRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Logo not found' });
        }

        const logo = logoRes.rows[0];

        // Debug: Log canvas background info
        if (logo.canvas_background_type === 'image') {
            console.log('Canvas background image debug:', {
                type: logo.canvas_background_type,
                imagePath: logo.canvas_background_image_path,
                imageType: logo.canvas_background_image_type,
                pathType: typeof logo.canvas_background_image_path
            });
        }

        // Fetch all layers with their type-specific data
        const layersRes = await query(`
      SELECT 
        lay.id, lay.logo_id, lay.type, lay.name, lay.z_index,
        lay.x_norm, lay.y_norm, lay.scale, lay.rotation_deg,
        lay.anchor_x, lay.anchor_y, lay.opacity, lay.blend_mode,
        lay.is_visible, lay.is_locked, lay.common_style,
        COALESCE(lay.flip_horizontal, false) as flip_horizontal,
        COALESCE(lay.flip_vertical, false) as flip_vertical,
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
        
        -- Background asset data
        ai_bg.id as bg_asset_joined_id, ai_bg.kind as bg_asset_kind, ai_bg.name as bg_asset_name,
        ai_bg.url as bg_asset_url, ai_bg.width as bg_asset_width, ai_bg.height as bg_asset_height,
        ai_bg.has_alpha as bg_asset_has_alpha, ai_bg.vector_svg as bg_asset_vector_svg, ai_bg.meta as bg_asset_meta,
        
        -- Font data for text layers
        f.family as font_family, f.style as default_font_style, f.weight as default_font_weight,
        f.url as font_url, f.fallbacks as font_fallbacks
      FROM layers lay
      LEFT JOIN layer_text lt ON lt.layer_id = lay.id
      LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
      LEFT JOIN layer_icon li ON li.layer_id = lay.id
      LEFT JOIN layer_image lim ON lim.layer_id = lay.id
      LEFT JOIN layer_background lb ON lb.layer_id = lay.id
      LEFT JOIN assets ai ON (
        (lay.type = 'ICON' AND ai.id = li.asset_id) OR
        (lay.type = 'IMAGE' AND ai.id = lim.asset_id)
      )
      LEFT JOIN assets ai_bg ON ai_bg.id = lb.asset_id
      LEFT JOIN fonts f ON f.id = lt.font_id
      WHERE lay.logo_id = $1
      ORDER BY lay.z_index ASC, lay.created_at ASC
    `, [id]);

        // Post-process: If any IMAGE layers are missing asset URLs, try to fetch them separately
        const layersWithAssets = await Promise.all(layersRes.rows.map(async(row) => {
            // If it's an IMAGE layer and we have asset_id but no asset_url, try to fetch it
            if (row.type === 'IMAGE' && row.image_asset_id && !row.asset_url) {
                try {
                    const assetRes = await query('SELECT url, width, height, meta FROM assets WHERE id = $1', [row.image_asset_id]);
                    if (assetRes.rows.length > 0) {
                        const asset = assetRes.rows[0];
                        row.asset_url = asset.url;
                        row.asset_width = asset.width;
                        row.asset_height = asset.height;
                        row.asset_id = row.image_asset_id;
                        row.asset_kind = 'raster';

                        // Also check metadata for URL if main URL is missing
                        if (!row.asset_url && asset.meta) {
                            const meta = typeof asset.meta === 'string' ? JSON.parse(asset.meta) : asset.meta;
                            row.asset_url = (meta && meta.url) || (meta && meta.path) || (meta && meta.image && meta.image.path) || null;
                        }

                        console.log(`Fetched missing asset URL for IMAGE layer ${row.id}: ${row.asset_url?.substring(0, 50)}`);
                    } else {
                        console.warn(`Asset ${row.image_asset_id} not found in database for IMAGE layer ${row.id}`);
                    }
                } catch (err) {
                    console.warn(`Failed to fetch asset for IMAGE layer ${row.id}:`, err.message);
                }
            }
            // Also check if IMAGE layer has no asset_id at all - might need to create/link it
            if (row.type === 'IMAGE' && !row.image_asset_id && !row.asset_url) {
                console.warn(`IMAGE layer ${row.id} has no asset_id and no asset_url - cannot render image`);
            }
            return row;
        }));

        // Process layers
        const layers = layersWithAssets.map(row => {
            const baseLayer = {
                id: row.id,
                type: row.type,
                z_index: row.z_index,
                x_norm: row.x_norm,
                y_norm: row.y_norm,
                scale: row.scale,
                rotation_deg: row.rotation_deg,
                opacity: row.opacity,
                is_visible: row.is_visible,
                flip_horizontal: row.flip_horizontal,
                flip_vertical: row.flip_vertical,
                common_style: row.common_style
            };

            switch (row.type) {
                case 'TEXT':
                    return {
                        ...baseLayer,
                        text: {
                            // Support both database format (content) and legacy format (value)
                            content: row.content || row.value,
                            // Support both snake_case and camelCase
                            font_size: row.font_size || row.fontSize,
                            fill_hex: row.fill_hex || row.fontColor,
                            fill_alpha: row.fill_alpha !== undefined ? row.fill_alpha : (row.fillAlpha !== undefined ? row.fillAlpha : 1),
                            stroke_hex: row.stroke_hex || row.strokeHex,
                            stroke_alpha: row.stroke_alpha !== undefined ? row.stroke_alpha : row.strokeAlpha,
                            stroke_width: row.stroke_width || row.strokeWidth,
                            align: row.align || row.alignment,
                            baseline: row.baseline,
                            font_family: row.font_family || row.font || 'Arial',
                            font_weight: row.font_weight || row.fontWeight,
                            font_style: row.font_style || row.fontStyle,
                            letter_spacing: row.letter_spacing !== undefined ? row.letter_spacing : (row.letterSpacing !== undefined ? row.letterSpacing : 0),
                            text_decoration: row.text_decoration || row.textDecoration,
                            text_transform: row.text_transform || row.textTransform,
                            text_case: row.text_case || row.textCase
                        }
                    };
                case 'SHAPE':
                    return {
                        ...baseLayer,
                        shape: {
                            shape_kind: row.shape_kind,
                            svg_path: row.svg_path,
                            fill_hex: row.shape_fill_hex,
                            fill_alpha: row.shape_fill_alpha,
                            stroke_hex: row.shape_stroke_hex,
                            stroke_width: row.shape_stroke_width,
                            rx: row.rx,
                            ry: row.ry,
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
                            // Support both database format (asset.url) and legacy format (path)
                            path: row.asset_url || null,
                            asset: row.asset_id ? {
                                id: row.asset_id,
                                kind: row.asset_kind,
                                name: row.asset_name,
                                url: row.asset_url,
                                vector_svg: row.vector_svg
                            } : null
                        }
                    };
                case 'IMAGE':
                    // Debug: Log what we're getting from the database
                    if (!row.asset_url && row.image_asset_id) {
                        console.warn(`IMAGE layer ${row.id}: asset_id exists (${row.image_asset_id}) but asset_url is null. Asset might not be linked in database.`);
                    }
                    return {
                        ...baseLayer,
                        image: {
                            asset_id: row.image_asset_id,
                            // Support both database format (asset.url) and legacy format (path)
                            path: row.asset_url || null,
                            asset: row.asset_id ? {
                                id: row.asset_id,
                                kind: row.asset_kind,
                                name: row.asset_name,
                                url: row.asset_url,
                                width: row.asset_width,
                                height: row.asset_height
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
                            asset: row.bg_asset_joined_id ? {
                                id: row.bg_asset_joined_id,
                                url: row.bg_asset_url
                            } : null
                        }
                    };
                default:
                    return baseLayer;
            }
        });

        // Determine canvas dimensions
        const canvasWidth = width ? parseInt(width) : (logo.canvas_w || 1000);
        const canvasHeight = height ? parseInt(height) : (logo.canvas_h || 1000);

        // Generate SVG from logo data
        let svg = await generateSVGFromLogo(logo, layers, canvasWidth, canvasHeight);

        // Validate SVG before processing
        if (!svg || typeof svg !== 'string' || svg.trim().length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate SVG from logo data'
            });
        }

        // CRITICAL: Clean the entire SVG to remove newlines from attribute values
        // This aggressively fixes any attribute formatting issues
        svg = cleanSVGAttributes(svg);

        // Try to convert SVG to PNG using @resvg/resvg-js first
        let pngBuffer;
        let useCloudinary = false;

        try {
            // Only set background color if it's not an image background
            // For image backgrounds, let the SVG handle it
            let background = 'rgba(0,0,0,0)'; // Transparent by default
            if (logo.canvas_background_type === 'transparent' || logo.export_transparent_background) {
                background = 'rgba(0,0,0,0)';
            } else if (logo.canvas_background_type === 'image') {
                // For image backgrounds, use transparent so the SVG image shows through
                background = 'rgba(0,0,0,0)';
            } else if (logo.canvas_background_type === 'solid') {
                background = logo.canvas_background_solid_color || '#ffffff';
            } else {
                background = logo.canvas_background_solid_color || '#ffffff';
            }

            const resvg = new Resvg(svg, {
                background: background,
                fitTo: {
                    mode: 'width',
                    value: canvasWidth
                },
                dpi: parseInt(dpi) || 300
            });

            const pngData = resvg.render();
            pngBuffer = pngData.asPng();
        } catch (svgError) {
            console.warn('Resvg failed, falling back to Cloudinary:', svgError.message);
            useCloudinary = true;

            // Fallback: Use Cloudinary to convert SVG to PNG
            try {
                // Convert SVG to base64 data URL
                const svgBase64 = Buffer.from(svg).toString('base64');
                const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

                // Upload SVG to Cloudinary and convert to PNG
                const uploadResult = await cloudinary.uploader.upload(svgDataUrl, {
                    resource_type: 'image',
                    format: 'png',
                    width: canvasWidth,
                    height: canvasHeight,
                    dpr: (parseInt(dpi) || 300) / 72, // Convert DPI to device pixel ratio
                    quality: format === 'jpg' || format === 'jpeg' ? parseInt(quality) : 'auto',
                    fetch_format: format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png',
                    flags: logo.export_transparent_background ? 'transparent' : undefined
                });

                // Download the converted PNG from Cloudinary
                const imageResponse = await axios.get(uploadResult.secure_url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                pngBuffer = Buffer.from(imageResponse.data);

                // Clean up the uploaded file from Cloudinary (optional)
                try {
                    await cloudinary.uploader.destroy(uploadResult.public_id);
                } catch (cleanupError) {
                    // Ignore cleanup errors
                    console.warn('Failed to cleanup Cloudinary temp file:', cleanupError.message);
                }
            } catch (cloudinaryError) {
                console.error('Cloudinary conversion also failed:', cloudinaryError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to export logo: Both Resvg and Cloudinary conversion failed',
                    error: process.env.NODE_ENV === 'development' ? {
                        resvg: svgError.message,
                        cloudinary: cloudinaryError.message
                    } : undefined
                });
            }
        }

        // Apply quality compression if needed
        let finalBuffer = pngBuffer;
        if (format === 'png' && quality < 100) {
            finalBuffer = await sharp(pngBuffer)
                .png({ quality: parseInt(quality), compressionLevel: 9 })
                .toBuffer();
        } else if (format === 'jpg' || format === 'jpeg') {
            finalBuffer = await sharp(pngBuffer)
                .jpeg({ quality: parseInt(quality) })
                .toBuffer();
        }

        // Upload PNG to Cloudinary
        try {
            const uploadOptions = {
                resource_type: 'image',
                folder: 'logo-exports',
                public_id: `logo-${id}-${Date.now()}`,
                format: format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png',
                overwrite: false,
                invalidate: true
            };

            // Upload buffer to Cloudinary using upload_stream
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(finalBuffer);
            });

            // Return JSON response with Cloudinary URL
            return res.json({
                success: true,
                message: 'Logo exported successfully',
                data: {
                    url: uploadResult.secure_url,
                    public_id: uploadResult.public_id,
                    format: uploadResult.format,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    bytes: uploadResult.bytes,
                    created_at: uploadResult.created_at
                }
            });
        } catch (uploadError) {
            console.error('Error uploading to Cloudinary:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload logo to Cloudinary',
                error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
            });
        }
    } catch (error) {
        console.error('Error exporting logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export logo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Debug endpoint to inspect layer data
router.get('/logo/:id/export/layers-debug', async(req, res) => {
    try {
        const { id } = req.params;

        const layersRes = await query(`
            SELECT 
                lay.id, lay.type, lay.z_index,
                lim.asset_id as image_asset_id,
                ai.id as asset_id, ai.url as asset_url, ai.width, ai.height
            FROM layers lay
            LEFT JOIN layer_image lim ON lim.layer_id = lay.id
            LEFT JOIN assets ai ON ai.id = lim.asset_id
            WHERE lay.logo_id = $1 AND lay.type = 'IMAGE'
            ORDER BY lay.z_index ASC
        `, [id]);

        res.json({
            success: true,
            layers: layersRes.rows.map(row => ({
                layerId: row.id,
                imageAssetId: row.image_asset_id,
                assetId: row.asset_id,
                assetUrl: row.asset_url,
                width: row.width,
                height: row.height
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to see the generated SVG
router.get('/logo/:id/export/debug', async(req, res) => {
    try {
        const { id } = req.params;

        // Fetch logo (same as export endpoint)
        const logoRes = await query(`
            SELECT 
                l.id, l.owner_id, l.title, l.description, l.canvas_w, l.canvas_h, l.dpi,
                l.canvas_background_type, l.canvas_background_solid_color, l.canvas_background_gradient,
                l.export_transparent_background
            FROM logos l
            WHERE l.id = $1
        `, [id]);

        if (logoRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Logo not found' });
        }

        const logo = logoRes.rows[0];
        const layersRes = await query(`
            SELECT 
                lay.id, lay.logo_id, lay.type, lay.name, lay.z_index,
                lay.x_norm, lay.y_norm, lay.scale, lay.rotation_deg,
                lay.opacity, lay.is_visible, lay.common_style,
                COALESCE(lay.flip_horizontal, false) as flip_horizontal,
                COALESCE(lay.flip_vertical, false) as flip_vertical,
                lt.content, lt.font_id, lt.font_size, lt.fill_hex, lt.fill_alpha,
                lt.font_family, ls.shape_kind, ls.fill_hex as shape_fill_hex,
                ls.meta as shape_meta, li.asset_id as icon_asset_id, li.tint_hex,
                lim.asset_id as image_asset_id, ai.url as asset_url, ai.vector_svg
            FROM layers lay
            LEFT JOIN layer_text lt ON lt.layer_id = lay.id
            LEFT JOIN layer_shape ls ON ls.layer_id = lay.id
            LEFT JOIN layer_icon li ON li.layer_id = lay.id
            LEFT JOIN layer_image lim ON lim.layer_id = lay.id
            LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id)
            WHERE lay.logo_id = $1
            ORDER BY lay.z_index ASC
        `, [id]);

        const layers = layersRes.rows.map(row => ({
            id: row.id,
            type: row.type,
            z_index: row.z_index,
            x_norm: row.x_norm,
            y_norm: row.y_norm,
            scale: row.scale,
            rotation_deg: row.rotation_deg,
            opacity: row.opacity,
            is_visible: row.is_visible,
            flip_horizontal: row.flip_horizontal,
            flip_vertical: row.flip_vertical,
            text: row.content ? {
                content: row.content,
                font_family: row.font_family,
                font_size: row.font_size,
                fill_hex: row.fill_hex
            } : null,
            shape: row.shape_kind ? {
                shape_kind: row.shape_kind,
                fill_hex: row.shape_fill_hex,
                meta: row.shape_meta
            } : null
        }));

        const svg = await generateSVGFromLogo(logo, layers, logo.canvas_w || 1000, logo.canvas_h || 1000);
        const svgLines = svg.split('\n');

        res.json({
            success: true,
            svg: svg,
            lineCount: svgLines.length,
            line8: svgLines.length >= 8 ? svgLines[7] : null,
            line8Length: svgLines.length >= 8 ? svgLines[7].length : 0,
            charAt183: svgLines.length >= 8 && svgLines[7].length >= 183 ? svgLines[7][182] : null,
            context: svgLines.length >= 8 && svgLines[7].length >= 183 ?
                svgLines[7].substring(Math.max(0, 173), Math.min(svgLines[7].length, 193)) : null
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Legacy endpoint for backward compatibility
router.get('/logo/:id/export.png', async(req, res) => {
    req.params.id = req.params.id;
    req.query.format = 'png';
    return router.handle({...req, url: `/api/logo/${req.params.id}/export`, method: 'GET' }, res);
});

// ==============================================
// HELPER FUNCTIONS
// ==============================================

async function generateSVGFromLogo(logo, layers, width, height) {
    let svgContent = '';
    const defs = [];

    // Sort layers by z_index
    // Exclude BACKGROUND layers from regular processing - canvas background is handled separately
    const sortedLayers = layers
        .filter(layer => layer.is_visible !== false && layer.type !== 'BACKGROUND')
        .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

    console.log(`Processing ${sortedLayers.length} layers (excluding BACKGROUND layers)`);
    sortedLayers.forEach(layer => {
        console.log(`  - Layer ${layer.id}: type=${layer.type}, z_index=${layer.z_index}`);
    });

    // Process each layer
    for (const layer of sortedLayers) {
        const x = (layer.x_norm || 0) * width;
        const y = (layer.y_norm || 0) * height;
        const scale = layer.scale || 1;
        const rotation = layer.rotation_deg || 0;
        const opacity = layer.opacity !== undefined ? layer.opacity : 1;
        const flipH = layer.flip_horizontal;
        const flipV = layer.flip_vertical;

        // Build transform string with flip support - ensure all values are valid numbers
        const validX = isNaN(x) ? 0 : x;
        const validY = isNaN(y) ? 0 : y;
        const validRotation = isNaN(rotation) ? 0 : rotation;
        const validScale = isNaN(scale) ? 1 : scale;

        let transform = `translate(${validX}, ${validY})`;
        if (validRotation !== 0) {
            transform += ` rotate(${validRotation})`;
        }
        // Apply flip as part of scale transformation
        const scaleX = (flipH ? -1 : 1) * validScale;
        const scaleY = (flipV ? -1 : 1) * validScale;
        if (scaleX !== 1 || scaleY !== 1) {
            transform += ` scale(${scaleX}, ${scaleY})`;
        }
        // Clean transform to ensure no newlines or extra spaces
        transform = transform.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

        // Build style string - ensure no newlines
        let style = `opacity: ${opacity};`;
        if (layer.common_style && layer.common_style.shadow) {
            const shadow = layer.common_style.shadow;
            if (shadow && typeof shadow === 'object') {
                const shadowColor = hexToRgba(shadow.hex || '#000000', shadow.alpha || 0.5);
                const dx = shadow.dx || 0;
                const dy = shadow.dy || 0;
                const blur = shadow.blur || 0;
                style += `filter: drop-shadow(${dx}px ${dy}px ${blur}px ${shadowColor});`;
            }
        }
        // Clean style to remove any newlines or extra whitespace
        style = style.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

        switch (layer.type) {
            case 'TEXT':
                const textSvg = generateTextSVG(layer, x, y, scale, rotation, style, defs);
                svgContent += textSvg;
                if (textSvg) console.log(`  ✓ TEXT layer ${layer.id} rendered`);
                break;
            case 'SHAPE':
                const shapeSvg = await generateShapeSVG(layer, x, y, scale, rotation, style, defs);
                svgContent += shapeSvg;
                if (shapeSvg) console.log(`  ✓ SHAPE layer ${layer.id} rendered`);
                break;
            case 'ICON':
                const iconSvg = await generateIconSVG(layer, x, y, scale, rotation, style, defs);
                svgContent += iconSvg;
                if (iconSvg) console.log(`  ✓ ICON layer ${layer.id} rendered`);
                break;
            case 'IMAGE':
                console.log(`Processing IMAGE layer ${layer.id}:`, {
                    hasImage: !!layer.image,
                    imagePath: layer.image && layer.image.path,
                    assetUrl: layer.image && layer.image.asset && layer.image.asset.url,
                    assetId: layer.image && layer.image.asset_id,
                    x: validX,
                    y: validY,
                    scale: validScale,
                    opacity: opacity,
                    isVisible: layer.is_visible
                });
                const imageSvg = await generateImageSVG(layer, x, y, scale, rotation, style, defs);
                svgContent += imageSvg;
                if (imageSvg) {
                    console.log(`  ✓ IMAGE layer ${layer.id} rendered (length: ${imageSvg.length})`);
                    // Log a snippet of the actual SVG to verify structure
                    console.log(`  SVG snippet: ${imageSvg.substring(0, Math.min(300, imageSvg.length))}...`);
                } else {
                    console.warn(`  ✗ IMAGE layer ${layer.id} failed to render`);
                }
                break;
        }
    }

    // Build background
    let backgroundRect = '';
    if (logo.canvas_background_type === 'solid' && logo.canvas_background_solid_color) {
        const bgColor = validateHexColor(logo.canvas_background_solid_color);
        backgroundRect = `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
    } else if (logo.canvas_background_type === 'gradient' && logo.canvas_background_gradient) {
        const gradientId = 'bg-gradient';
        const gradient = typeof logo.canvas_background_gradient === 'string' ?
            JSON.parse(logo.canvas_background_gradient) :
            logo.canvas_background_gradient;

        // Calculate gradient direction from angle (0 = top to bottom, 90 = left to right)
        const angle = gradient.angle !== undefined ? parseFloat(gradient.angle) : 0;
        const radians = (angle * Math.PI) / 180;
        const x1 = 50 + 50 * Math.sin(radians);
        const y1 = 50 - 50 * Math.cos(radians);
        const x2 = 50 - 50 * Math.sin(radians);
        const y2 = 50 + 50 * Math.cos(radians);

        let gradientDef = `<defs><linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
        if (gradient.stops && Array.isArray(gradient.stops)) {
            for (const stop of gradient.stops) {
                // Support both formats: {color, position} and {hex, offset, alpha}
                const offset = Math.max(0, Math.min(100, ((stop.position !== undefined ? stop.position : (stop.offset || 0)) * 100)));
                const stopColor = validateHexColor(stop.color || stop.hex || '#000000');
                const stopAlpha = clampAlpha(stop.alpha !== undefined ? stop.alpha : 1);
                gradientDef += `<stop offset="${offset}%" stop-color="${stopColor}" stop-opacity="${stopAlpha}"/>`;
            }
        }
        gradientDef += `</linearGradient></defs>`;
        defs.push(gradientDef);
        backgroundRect = `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`;
    } else if (logo.canvas_background_type === 'image') {
        // Handle canvas background image
        // Support both direct path string and JSON structure
        let bgImageUrl = null;

        // Check if we have canvas_background_image_path
        if (logo.canvas_background_image_path) {
            try {
                let parsed = logo.canvas_background_image_path;

                // If it's a string, try to parse as JSON
                if (typeof parsed === 'string') {
                    const trimmed = parsed.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        try {
                            parsed = JSON.parse(trimmed);
                        } catch (parseError) {
                            // If JSON parsing fails, treat as direct URL string
                            parsed = trimmed;
                        }
                    } else {
                        // Not JSON, treat as direct URL string
                        parsed = trimmed;
                    }
                }

                // If parsed is already an object (JSONB from database), use it directly
                // Extract path from different possible structures
                if (typeof parsed === 'string') {
                    bgImageUrl = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    // Try multiple possible paths in the object structure
                    // Priority: image.path > image.url > path > url > nested structures
                    if (parsed.image) {
                        bgImageUrl = parsed.image.path || parsed.image.url || null;
                    } else if (parsed.path) {
                        bgImageUrl = parsed.path;
                    } else if (parsed.url) {
                        bgImageUrl = parsed.url;
                    } else if (parsed.background && parsed.background.image) {
                        bgImageUrl = parsed.background.image.path || parsed.background.image.url || null;
                    }
                }
            } catch (e) {
                console.warn('Error parsing canvas_background_image_path:', e.message);
                // If parsing fails, use as direct string
                bgImageUrl = String(logo.canvas_background_image_path);
            }
        }

        // If still no URL found, log for debugging
        if (!bgImageUrl) {
            console.warn('Canvas background image: No URL found', {
                backgroundType: logo.canvas_background_type,
                imagePath: logo.canvas_background_image_path,
                imageType: logo.canvas_background_image_type
            });
        }

        if (bgImageUrl) {
            bgImageUrl = String(bgImageUrl).trim();

            if (bgImageUrl && (bgImageUrl.startsWith('http://') || bgImageUrl.startsWith('https://') || bgImageUrl.startsWith('data:'))) {
                // For external URLs, try to download and convert to data URL for better compatibility
                // This ensures Resvg can render the image even if it can't fetch external URLs
                try {
                    if (bgImageUrl.startsWith('http://') || bgImageUrl.startsWith('https://')) {
                        const imageResponse = await axios.get(bgImageUrl, {
                            responseType: 'arraybuffer',
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0'
                            }
                        });
                        const imageBuffer = Buffer.from(imageResponse.data);
                        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
                        const base64Image = imageBuffer.toString('base64');
                        bgImageUrl = `data:${mimeType};base64,${base64Image}`;
                        console.log('Canvas background image: Converted to data URL');
                    }
                } catch (downloadError) {
                    console.warn('Failed to download background image, using URL directly:', downloadError.message);
                    // Continue with the original URL - Cloudinary conversion should handle it
                }

                // Escape quotes for XML
                const escapedUrl = bgImageUrl.replace(/"/g, '&quot;');
                // Use SVG image element with proper attributes
                // Use both href (SVG 2) and xlink:href (SVG 1.1) for maximum compatibility
                backgroundRect = `<image href="${escapedUrl}" xlink:href="${escapedUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
                console.log('Canvas background image: Successfully set', bgImageUrl.substring(0, 100));
            } else {
                console.warn('Canvas background image: Invalid URL format', bgImageUrl);
                // Fallback to solid color if image URL is invalid
                const bgColor = validateHexColor(logo.canvas_background_solid_color || '#ffffff');
                backgroundRect = `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
            }
        } else {
            console.warn('Canvas background image: No URL extracted from path', {
                rawPath: logo.canvas_background_image_path,
                pathType: typeof logo.canvas_background_image_path
            });
            // Fallback to solid color if no path found
            const bgColor = validateHexColor(logo.canvas_background_solid_color || '#ffffff');
            backgroundRect = `<rect width="${width}" height="${height}" fill="${bgColor}"/>`;
        }
    } else if (logo.export_transparent_background) {
        // Transparent background - no rect needed
    } else {
        backgroundRect = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
    }

    // Ensure width and height are valid numbers
    const validWidth = isNaN(width) || width <= 0 ? 1000 : width;
    const validHeight = isNaN(height) || height <= 0 ? 1000 : height;

    // Clean up defs - remove any empty entries
    const cleanDefs = defs.filter(def => def && def.trim().length > 0);

    // Clean up svgContent to remove any problematic characters and ensure proper formatting
    const cleanSvgContent = (svgContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // IMPORTANT: Background must be FIRST in SVG so layers render on top
    // Structure: <defs> -> <background> -> <layers>
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${validWidth}" height="${validHeight}" viewBox="0 0 ${validWidth} ${validHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
${cleanDefs.length > 0 ? '  ' + cleanDefs.join('\n  ') + '\n' : ''}${backgroundRect ? '  ' + backgroundRect + '\n' : ''}${cleanSvgContent}
</svg>`;
}

async function generateBackgroundSVG(layer, width, height, style, defs) {
    const { background } = layer;

    if (background.mode === 'solid' && background.fill_hex) {
        const bgFillColor = validateHexColor(background.fill_hex);
        const bgFillAlpha = clampAlpha(background.fill_alpha !== undefined ? background.fill_alpha : 1);
        return `<rect width="${width}" height="${height}" fill="${bgFillColor}" fill-opacity="${bgFillAlpha}" style="${style}"/>`;
    } else if (background.mode === 'gradient' && background.gradient) {
        const gradientId = `gradient-bg-${layer.id}`;
        const gradient = typeof background.gradient === 'string' ? JSON.parse(background.gradient) : background.gradient;

        // Calculate gradient direction from angle (0 = top to bottom, 90 = left to right)
        const angle = gradient.angle !== undefined ? parseFloat(gradient.angle) : 0;
        const radians = (angle * Math.PI) / 180;
        const x1 = 50 + 50 * Math.sin(radians);
        const y1 = 50 - 50 * Math.cos(radians);
        const x2 = 50 - 50 * Math.sin(radians);
        const y2 = 50 + 50 * Math.cos(radians);

        let gradientDef = `<defs><linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`;
        if (gradient.stops && Array.isArray(gradient.stops)) {
            for (const stop of gradient.stops) {
                // Support both formats: {color, position} and {hex, offset, alpha}
                const offset = Math.max(0, Math.min(100, ((stop.position !== undefined ? stop.position : (stop.offset || 0)) * 100)));
                const stopColor = validateHexColor(stop.color || stop.hex || '#000000');
                const stopAlpha = clampAlpha(stop.alpha !== undefined ? stop.alpha : 1);
                gradientDef += `<stop offset="${offset}%" stop-color="${stopColor}" stop-opacity="${stopAlpha}"/>`;
            }
        }
        gradientDef += `</linearGradient></defs>`;
        defs.push(gradientDef);

        return `<rect width="${width}" height="${height}" fill="url(#${gradientId})" style="${style}"/>`;
    }

    return '';
}

function generateTextSVG(layer, x, y, scale, rotation, style, defs) {
    const { text } = layer;
    // Support both content (database) and value (legacy JSON)
    const textContent = text && text.content ? text.content : (text && text.value ? text.value : undefined);
    if (!text || !textContent) return '';

    // Support both snake_case and camelCase for font_size
    // Use fontSize directly from JSON - fontSize is the final size we want
    const fontSize = parseFloat(text.font_size || text.fontSize || 16);
    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order - ensure all values are valid numbers
    const validX = isNaN(x) ? 0 : x;
    const validY = isNaN(y) ? 0 : y;
    const validRotation = isNaN(rotation) ? 0 : rotation;

    let transform = `translate(${validX}, ${validY})`;
    if (validRotation !== 0) {
        transform += ` rotate(${validRotation})`;
    }
    // For text, fontSize is already the final size, so we don't apply scale transform
    // Scale is only used for flip operations
    const scaleX = flipH ? -1 : 1;
    const scaleY = flipV ? -1 : 1;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    // Ensure font size is valid
    const validFontSize = isNaN(fontSize) || fontSize <= 0 ? 16 : fontSize;
    // Font family - default to Arial if not found, remove quotes since we're already inside a quoted style attribute
    // Support both snake_case (font_family) and camelCase (font)
    let fontFamilyName = text.font_family || text.font || 'Arial';
    // If font_family is null, undefined, or empty, use Arial
    if (!fontFamilyName || fontFamilyName === 'null' || fontFamilyName === 'undefined') {
        fontFamilyName = 'Arial';
    }
    fontFamilyName = String(fontFamilyName).replace(/"/g, '').replace(/'/g, '');
    // Support both snake_case (fill_hex) and camelCase (fontColor)
    const fillColor = validateHexColor(text.fill_hex || text.fontColor || '#000000');
    // Support both snake_case and camelCase for fill_alpha
    const fillAlpha = clampAlpha(text.fill_alpha !== undefined ? text.fill_alpha : (text.fillAlpha !== undefined ? text.fillAlpha : 1));

    // Build style without nested quotes - font-family should NOT have quotes inside style attribute
    // Escape any special characters in font name, but don't add quotes
    const safeFontFamily = fontFamilyName.replace(/[;:]/g, ' ').trim() || 'Arial';
    let textStyle = `font-size: ${validFontSize}px; font-family: ${safeFontFamily}, sans-serif;`;
    textStyle += `fill: ${fillColor}; fill-opacity: ${fillAlpha};`;

    // Handle font weight - support both font_weight and fontWeight
    const fontWeight = text.font_weight || text.fontWeight;
    if (fontWeight && fontWeight !== 'normal') {
        textStyle += `font-weight: ${fontWeight};`;
    }
    // Handle font style - support both font_style and fontStyle
    const fontStyle = text.font_style || text.fontStyle;
    if (fontStyle && fontStyle !== 'normal') {
        textStyle += `font-style: ${fontStyle};`;
    }
    // Support both snake_case and camelCase for letter_spacing
    const letterSpacing = text.letter_spacing !== undefined ? text.letter_spacing : text.letterSpacing;
    if (letterSpacing !== undefined && letterSpacing !== null && !isNaN(letterSpacing) && letterSpacing !== 0) {
        textStyle += `letter-spacing: ${letterSpacing}px;`;
    }
    // Support both snake_case and camelCase for text_decoration
    const textDecoration = text.text_decoration || text.textDecoration;
    if (textDecoration === 'underline') {
        textStyle += `text-decoration: underline;`;
    } else if (textDecoration === 'line-through') {
        textStyle += `text-decoration: line-through;`;
    }

    // Support both snake_case and camelCase for stroke
    const strokeHex = text.stroke_hex || text.strokeHex;
    const strokeWidth = text.stroke_width || text.strokeWidth;
    if (strokeHex && strokeWidth && !isNaN(strokeWidth)) {
        const strokeColor = validateHexColor(strokeHex);
        const strokeAlpha = clampAlpha((text.stroke_alpha !== undefined ? text.stroke_alpha : text.strokeAlpha) || 1);
        textStyle += `stroke: ${strokeColor}; stroke-width: ${strokeWidth}; stroke-opacity: ${strokeAlpha};`;
    }

    // Support both snake_case (align) and camelCase (alignment)
    const align = text.align || text.alignment || 'center';
    const textAnchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
    const dominantBaseline = text.baseline || 'alphabetic';

    // Apply text transform - support both snake_case and camelCase
    let finalTextContent = textContent;
    const textTransform = text.text_transform || text.textTransform;
    if (textTransform === 'uppercase') {
        finalTextContent = finalTextContent.toUpperCase();
    } else if (textTransform === 'lowercase') {
        finalTextContent = finalTextContent.toLowerCase();
    } else if (textTransform === 'capitalize') {
        finalTextContent = finalTextContent.replace(/\b\w/g, l => l.toUpperCase());
    }

    // All attributes must be on the same line to avoid parsing errors
    return `<text x="0" y="0" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" transform="${transform}" style="${textStyle} ${style}">${escapeXml(finalTextContent)}</text>`;
}

async function generateShapeSVG(layer, x, y, scale, rotation, style, defs) {
    const { shape } = layer;
    if (!shape) return '';

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order - ensure all values are valid numbers
    const validX = isNaN(x) ? 0 : x;
    const validY = isNaN(y) ? 0 : y;
    const validRotation = isNaN(rotation) ? 0 : rotation;
    const validScale = isNaN(scale) ? 1 : scale;

    let transform = `translate(${validX}, ${validY})`;
    if (validRotation !== 0) {
        transform += ` rotate(${validRotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * validScale;
    const scaleY = (flipV ? -1 : 1) * validScale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    let shapeElement = '';
    const fillColor = shape.fill_hex ? validateHexColor(shape.fill_hex) : 'none';
    const fillAlpha = clampAlpha(shape.fill_alpha !== undefined ? shape.fill_alpha : 1);
    let shapeStyle = `fill: ${fillColor}; fill-opacity: ${fillAlpha};`;

    if (shape.stroke_hex && shape.stroke_width && !isNaN(shape.stroke_width)) {
        const strokeColor = validateHexColor(shape.stroke_hex);
        const strokeAlpha = clampAlpha(shape.stroke_alpha !== undefined ? shape.stroke_alpha : 1);
        shapeStyle += `stroke: ${strokeColor}; stroke-width: ${shape.stroke_width}; stroke-opacity: ${strokeAlpha};`;
    }

    // Clean the style parameter to remove any newlines or extra spaces
    const cleanStyle = (style || '').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanShapeStyle = shapeStyle.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

    // Check if shape has a src (local SVG asset)
    if (shape.meta && typeof shape.meta === 'object' && shape.meta.src) {
        try {
            // Try to fetch the SVG content
            const svgContent = await fetchSVGContent(shape.meta.src);
            if (svgContent && svgContent.trim().length > 0) {
                // Apply color transformation to the SVG
                let processedSvg = svgContent;
                if (shape.fill_hex) {
                    const fillColor = validateHexColor(shape.fill_hex);
                    // Replace fill colors in the SVG
                    processedSvg = processedSvg.replace(/fill="[^"]*"/g, `fill="${fillColor}"`);
                    processedSvg = processedSvg.replace(/fill='[^']*'/g, `fill="${fillColor}"`);
                    processedSvg = processedSvg.replace(/fill:\s*[^;]+/g, `fill: ${fillColor}`);
                }
                if (shape.stroke_hex) {
                    const strokeColor = validateHexColor(shape.stroke_hex);
                    processedSvg = processedSvg.replace(/stroke="[^"]*"/g, `stroke="${strokeColor}"`);
                    processedSvg = processedSvg.replace(/stroke='[^']*'/g, `stroke="${strokeColor}"`);
                }
                return `<g transform="${transform}" style="${style}">${processedSvg}</g>`;
            }
        } catch (error) {
            console.warn(`Failed to load SVG from ${shape.meta.src}, using default shape:`, error.message);
        }
    }

    // Fallback to basic shapes - always render something even if SVG asset fails
    const validRx = isNaN(shape.rx) ? 0 : Math.max(0, shape.rx);
    const validRy = isNaN(shape.ry) ? 0 : Math.max(0, shape.ry);

    // Combine styles and clean them
    const combinedStyle = `${cleanShapeStyle} ${cleanStyle}`.trim();

    switch (shape.shape_kind) {
        case 'rect':
            // All attributes on one line to avoid parsing errors
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" rx="${validRx}" ry="${validRy}" style="${combinedStyle}"/>`;
            break;
        case 'circle':
            shapeElement = `<circle cx="0" cy="0" r="50" style="${combinedStyle}"/>`;
            break;
        case 'ellipse':
            shapeElement = `<ellipse cx="0" cy="0" rx="50" ry="50" style="${combinedStyle}"/>`;
            break;
        case 'path':
            if (shape.svg_path && shape.svg_path.trim().length > 0) {
                // Escape path data
                const escapedPath = shape.svg_path.replace(/"/g, '&quot;');
                shapeElement = `<path d="${escapedPath}" style="${combinedStyle}"/>`;
            } else {
                // Default to rect if path is invalid
                shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
            }
            break;
        default:
            // Default to rect for any unknown shape type
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
    }

    // Ensure shapeElement is not empty
    if (!shapeElement || shapeElement.trim().length === 0) {
        shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
    }

    return `<g transform="${transform}">${shapeElement}</g>`;
}

async function generateIconSVG(layer, x, y, scale, rotation, style, defs) {
    const { icon } = layer;
    if (!icon) {
        console.warn('generateIconSVG: No icon object in layer');
        return '';
    }

    // Support both database format (icon.asset.url) and legacy format (icon.path)
    const iconUrl = (icon.asset && icon.asset.url) || icon.path;
    if (!iconUrl) {
        console.warn('generateIconSVG: No icon URL found', {
            hasAsset: !!icon.asset,
            assetUrl: icon.asset && icon.asset.url,
            path: icon.path,
            assetId: icon.asset_id
        });
        return '';
    }

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order - ensure all values are valid numbers
    const validX = isNaN(x) ? 0 : x;
    const validY = isNaN(y) ? 0 : y;
    const validRotation = isNaN(rotation) ? 0 : rotation;
    const validScale = isNaN(scale) ? 1 : scale;

    let transform = `translate(${validX}, ${validY})`;
    if (validRotation !== 0) {
        transform += ` rotate(${validRotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * validScale;
    const scaleY = (flipV ? -1 : 1) * validScale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    const tintColor = icon.tint_hex || '#000000';
    const tintOpacity = icon.tint_alpha !== undefined ? icon.tint_alpha : 1;

    // If it's an SVG asset, use the vector_svg content
    if (icon.asset && icon.asset.vector_svg) {
        let svgContent = icon.asset.vector_svg;
        // Apply tint color
        svgContent = svgContent.replace(/currentColor/g, tintColor);
        svgContent = svgContent.replace(/fill="[^"]*"/g, (match) => {
            if (!match.includes('none')) {
                return `fill="${tintColor}" fill-opacity="${tintOpacity}"`;
            }
            return match;
        });

        return `<g transform="${transform}" style="${style}">${svgContent}</g>`;
    }

    // For raster images or URLs, use image element
    // Ensure URL is properly formatted for XML/SVG
    let cleanIconUrl = String(iconUrl).trim();

    // Remove any whitespace/newlines from URL (URLs shouldn't have these)
    cleanIconUrl = cleanIconUrl.replace(/\s+/g, '');

    // Only escape quotes in URL (for XML attribute), but preserve & and other URL characters
    cleanIconUrl = cleanIconUrl.replace(/"/g, '&quot;');

    // Validate URL format
    if (cleanIconUrl && cleanIconUrl.length > 0 && (cleanIconUrl.startsWith('http://') || cleanIconUrl.startsWith('https://') || cleanIconUrl.startsWith('data:'))) {
        // Ensure style and transform don't have any issues (no newlines, extra spaces)
        const cleanStyle = (style || '').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanTransform = (transform || '').replace(/\s+/g, ' ').trim();

        // Calculate icon dimensions based on scale
        // Use actual dimensions if available, otherwise use default size
        let iconWidth, iconHeight;
        if (icon.asset && icon.asset.width) {
            iconWidth = icon.asset.width * validScale;
        } else {
            iconWidth = 100 * validScale;
        }
        if (icon.asset && icon.asset.height) {
            iconHeight = icon.asset.height * validScale;
        } else {
            iconHeight = 100 * validScale;
        }

        // All attributes must be on the same line to avoid parsing errors
        return `<image href="${cleanIconUrl}" x="${-iconWidth / 2}" y="${-iconHeight / 2}" width="${iconWidth}" height="${iconHeight}" transform="${cleanTransform}" style="${cleanStyle}" opacity="${tintOpacity}"/>`;
    } else {
        console.warn(`Invalid icon URL (length: ${cleanIconUrl ? cleanIconUrl.length : 0}): ${cleanIconUrl ? cleanIconUrl.substring(0, 100) : 'null'}...`);
        return '';
    }
}

async function generateImageSVG(layer, x, y, scale, rotation, style, defs) {
    const { image } = layer;
    if (!image) {
        console.warn('generateImageSVG: No image object in layer');
        return '';
    }

    // Support both database format (image.asset.url) and legacy format (image.path)
    // Also check if path might be nested in image.image.path (from JSON structure)
    let imageUrl = (image.asset && image.asset.url) || image.path;

    // If still no URL, check for nested structure like {image: {path: "..."}}
    if (!imageUrl && image.image && (image.image.path || image.image.url)) {
        imageUrl = image.image.path || image.image.url;
        console.log('generateImageSVG: Found nested image path');
    }

    if (!imageUrl) {
        console.warn('generateImageSVG: No image URL found', {
            hasAsset: !!image.asset,
            assetUrl: image.asset && image.asset.url,
            path: image.path,
            assetId: image.asset_id,
            hasNestedImage: !!image.image,
            nestedPath: image.image && image.image.path,
            imageObjectKeys: Object.keys(image || {})
        });
        return '';
    }
    console.log('generateImageSVG: Found image URL', imageUrl.substring(0, 100));

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order - ensure all values are valid numbers
    const validX = isNaN(x) ? 0 : x;
    const validY = isNaN(y) ? 0 : y;
    const validRotation = isNaN(rotation) ? 0 : rotation;
    const validScale = isNaN(scale) ? 1 : scale;

    // Calculate base dimensions (unscaled) - we'll apply scale in transform
    let baseWidth, baseHeight;
    const baseSize = 300; // Default base size

    if (image.asset && image.asset.width && image.asset.height) {
        baseWidth = image.asset.width;
        baseHeight = image.asset.height;
        console.log(`Using actual asset dimensions: ${baseWidth}x${baseHeight}`);
    } else {
        baseWidth = baseSize;
        baseHeight = baseSize;
        console.log(`Using default dimensions: ${baseSize}x${baseSize}`);
    }

    // Ensure minimum base size
    const minBaseSize = 20;
    if (baseWidth < minBaseSize) {
        console.warn(`Base width ${baseWidth} too small, using minimum ${minBaseSize}`);
        baseWidth = minBaseSize;
    }
    if (baseHeight < minBaseSize) {
        console.warn(`Base height ${baseHeight} too small, using minimum ${minBaseSize}`);
        baseHeight = minBaseSize;
    }

    // Build transform: translate -> rotate -> scale (including flips)
    // Position is the center point, so we offset by half dimensions
    let transform = `translate(${validX}, ${validY})`;
    if (validRotation !== 0) {
        transform += ` rotate(${validRotation})`;
    }
    // Apply scale and flips together
    const scaleX = (flipH ? -1 : 1) * validScale;
    const scaleY = (flipV ? -1 : 1) * validScale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    // Ensure URL is properly formatted for XML/SVG
    let cleanImageUrl = String(imageUrl).trim();

    // Remove any whitespace/newlines from URL (URLs shouldn't have these)
    cleanImageUrl = cleanImageUrl.replace(/\s+/g, '');

    // Validate URL format
    if (cleanImageUrl && cleanImageUrl.length > 0 && (cleanImageUrl.startsWith('http://') || cleanImageUrl.startsWith('https://') || cleanImageUrl.startsWith('data:'))) {
        // For external URLs, download and convert to data URL for better compatibility with Resvg
        try {
            if (cleanImageUrl.startsWith('http://') || cleanImageUrl.startsWith('https://')) {
                const imageResponse = await axios.get(cleanImageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
                const imageBuffer = Buffer.from(imageResponse.data);
                let mimeType = imageResponse.headers['content-type'] || 'image/png';

                // Resvg may have issues with WebP, so convert to PNG if needed
                // For now, keep original format but log it
                if (mimeType === 'image/webp') {
                    console.log('Image layer: WebP format detected - Resvg should support it');
                }

                const base64Image = imageBuffer.toString('base64');
                cleanImageUrl = `data:${mimeType};base64,${base64Image}`;
                console.log(`Image layer: Converted to data URL (${mimeType}, ${Math.round(base64Image.length / 1024)}KB)`);
            }
        } catch (downloadError) {
            console.warn('Failed to download image layer, using URL directly:', downloadError.message);
            // Continue with the original URL - Cloudinary conversion should handle it
        }

        // Escape quotes for XML
        cleanImageUrl = cleanImageUrl.replace(/"/g, '&quot;');

        // Ensure style and transform don't have any issues (no newlines, extra spaces)
        const cleanStyle = (style || '').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanTransform = (transform || '').replace(/\s+/g, ' ').trim();

        // Use base dimensions (scale is applied in transform)
        const imageWidth = baseWidth;
        const imageHeight = baseHeight;

        console.log(`Image layer final: ${imageWidth}x${imageHeight} (base), position: (${validX}, ${validY}), scale: ${validScale}, URL length: ${cleanImageUrl.length}`);

        // Wrap image in a group with transform - this is more reliable than transform on image element
        // Position image centered at origin, then group transform will move/scale/rotate it
        // Use both href (SVG 2) and xlink:href (SVG 1.1) for maximum compatibility
        const imageElement = `<g transform="${cleanTransform}" style="${cleanStyle}"><image href="${cleanImageUrl}" xlink:href="${cleanImageUrl}" x="${-imageWidth / 2}" y="${-imageHeight / 2}" width="${imageWidth}" height="${imageHeight}"/></g>`;
        console.log(`Generated image SVG element (first 200 chars): ${imageElement.substring(0, 200)}`);
        return imageElement;
    } else {
        console.warn(`Invalid image URL (length: ${cleanImageUrl ? cleanImageUrl.length : 0}): ${cleanImageUrl ? cleanImageUrl.substring(0, 100) : 'null'}...`);
        return '';
    }
}

// Helper function to fetch SVG content
async function fetchSVGContent(src) {
    try {
        // If it's a URL, fetch it
        if (src.startsWith('http://') || src.startsWith('https://')) {
            const response = await axios.get(src, { timeout: 5000 });
            return response.data;
        }

        // If it's a local path like "assets/local/Basic/13.svg"
        // Try to construct a URL or fetch from Cloudinary
        if (src.startsWith('assets/local/')) {
            // Try to construct a Cloudinary URL
            // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{path}
            const cloudName = cloudinary.config().cloud_name;
            if (cloudName) {
                // Remove 'assets/local/' prefix and construct URL
                const path = src.replace('assets/local/', '');
                const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${path}`;
                try {
                    const response = await axios.get(cloudinaryUrl, { timeout: 5000 });
                    return response.data;
                } catch (error) {
                    // If Cloudinary doesn't have it, try as raw SVG path
                    const rawUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${path}`;
                    try {
                        const response = await axios.get(rawUrl, { timeout: 5000 });
                        return response.data;
                    } catch (err) {
                        console.warn(`SVG not found at Cloudinary path: ${path}`);
                    }
                }
            }

            // If Cloudinary doesn't work, you might want to serve from a static directory
            // For now, return null and fall back to basic shapes
            return null;
        }

        return null;
    } catch (error) {
        console.warn(`Failed to fetch SVG from ${src}:`, error.message);
        return null;
    }
}

function hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(0, 0, 0, ${alpha})`;
}

function escapeXml(unsafe) {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '&':
                return '&amp;';
            case '\'':
                return '&apos;';
            case '"':
                return '&quot;';
            default:
                return c;
        }
    });
}

// Helper function to validate and escape CSS strings (like font names)
function escapeCssString(str) {
    if (!str || typeof str !== 'string') return '"Arial"';
    // If it contains spaces or special characters, wrap in quotes
    if (/[\s"'(),;]/.test(str)) {
        return `"${str.replace(/"/g, '\\"')}"`;
    }
    return `"${str}"`;
}

// Helper function to validate hex colors
function validateHexColor(hex) {
    if (!hex || typeof hex !== 'string') return '#000000';
    // Remove # if present
    hex = hex.replace('#', '');
    // Validate hex color (3 or 6 digits)
    if (/^[0-9A-Fa-f]{3}$/.test(hex) || /^[0-9A-Fa-f]{6}$/.test(hex)) {
        return `#${hex}`;
    }
    return '#000000';
}

// Helper function to clamp alpha values between 0 and 1
function clampAlpha(alpha) {
    if (isNaN(alpha) || alpha < 0) return 0;
    if (alpha > 1) return 1;
    return alpha;
}

// CRITICAL: Clean SVG to remove newlines from attribute values
// This function aggressively removes newlines and fixes attribute formatting
function cleanSVGAttributes(svg) {
    if (!svg || typeof svg !== 'string') return svg;

    let cleaned = svg;

    // Step 1: Remove newlines from within quoted attribute values
    // This regex matches: attribute="...content with\nnewline..." and replaces \n with space
    cleaned = cleaned.replace(/(\w+)="([^"]*?)[\r\n]+([^"]*?)"/g, '$1="$2 $3"');

    // Step 2: Handle attributes that span multiple lines (more complex pattern)
    // Match: attribute="value\n" or attribute="\nvalue" or attribute="value1\nvalue2"
    cleaned = cleaned.replace(/="([^"]*?)[\r\n]+([^"]*?)"/g, '="$1 $2"');

    // Step 3: Remove newlines from specific critical attributes
    cleaned = cleaned.replace(/style="([^"]*?)[\r\n\s]+([^"]*?)"/g, (match, p1, p2) => {
        return `style="${p1.trim()} ${p2.trim()}"`;
    });
    cleaned = cleaned.replace(/transform="([^"]*?)[\r\n\s]+([^"]*?)"/g, (match, p1, p2) => {
        return `transform="${p1.trim()} ${p2.trim()}"`;
    });
    cleaned = cleaned.replace(/href="([^"]*?)[\r\n\s]+([^"]*?)"/g, (match, p1, p2) => {
        return `href="${p1.trim()}${p2.trim()}"`;
    });

    // Step 4: Process line by line to fix attributes that span lines
    const lines = cleaned.split(/\r?\n/);
    const result = [];
    let buffer = '';
    let inQuotes = false;

    for (const line of lines) {
        let lineQuotes = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
                lineQuotes++;
            }
        }

        if (lineQuotes % 2 === 1) {
            // Odd number of quotes means we're entering or leaving a quoted section
            inQuotes = !inQuotes;
            buffer += (buffer ? ' ' : '') + line.trim();
            if (!inQuotes) {
                // We've closed the quotes, add the line
                result.push(buffer);
                buffer = '';
            }
        } else if (inQuotes) {
            // We're inside quotes, continue on same line
            buffer += ' ' + line.trim();
        } else {
            // Normal line, not in quotes
            if (buffer) {
                result.push(buffer);
                buffer = '';
            }
            result.push(line);
        }
    }

    if (buffer) {
        result.push(buffer);
    }

    cleaned = result.join('\n');

    // Step 5: Fix nested quotes in style attributes (e.g., font-family:"Arial" should be font-family: Arial)
    // This is critical - nested quotes break SVG parsing
    cleaned = cleaned.replace(/style="([^"]*?)"/g, (match, content) => {
        // Remove ALL nested quotes from font-family values (both double and single)
        let fixed = content.replace(/font-family:\s*["']([^"']+)["']\s*,/g, 'font-family: $1,');
        fixed = fixed.replace(/font-family:\s*"([^"]+)"\s*,/g, 'font-family: $1,');
        fixed = fixed.replace(/font-family:\s*'([^']+)'\s*,/g, "font-family: $1,");
        // Also fix any other nested quotes in the style
        fixed = fixed.replace(/:\s*"([^"]+)"\s*;/g, ': $1;');
        fixed = fixed.replace(/:\s*'([^']+)'\s*;/g, ": $1;");
        // Remove any newlines
        fixed = fixed.replace(/[\r\n]+/g, ' ');
        // Clean up multiple spaces
        fixed = fixed.replace(/\s+/g, ' ').trim();
        return `style="${fixed}"`;
    });

    // Step 6: Final cleanup - remove any remaining newlines in ALL attributes
    cleaned = cleaned.replace(/="([^"]*?)"/g, (match, content) => {
        const cleanedContent = content.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        return `="${cleanedContent}"`;
    });

    // Step 7: Clean up extra spaces but preserve structure
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/>\s+</g, '><');

    return cleaned;
}

module.exports = router;