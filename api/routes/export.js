const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { entitlementMiddleware, requirePro } = require('../middleware/entitlement');
const { notFound, badRequest, forbidden, unprocessableEntity, internalError, ERROR_CODES } = require('../utils/errorHandler');
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
            return notFound(res, ERROR_CODES.LOGO.NOT_FOUND, 'Logo not found');
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

                        console.log(`Fetched missing asset URL for IMAGE layer ${row.id}: ${(row.asset_url || '').substring(0, 50)}`);
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
                            text_case: row.text_case || row.textCase,
                            underline: row.underline, // Add underline field from database
                            underline_direction: row.underline_direction,
                            // Add font URL and fallbacks for @font-face support
                            font_url: row.font_url,
                            font_fallbacks: row.font_fallbacks
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
            return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
                'Failed to generate SVG from logo data');
        }

        // DEBUG: Add hard-coded debug text element to test Resvg text rendering
        const debugText = `
  <text x="100" y="100" font-size="60" fill="#ff0000" font-family="DejaVu Sans, Arial, sans-serif">DEBUG</text>`;
        svg = svg.replace('</svg>', `${debugText}\n</svg>`);
        console.log('DEBUG: Added hard-coded debug text element to SVG');

        // DEBUG: Count text elements before cleaning
        const textCountBefore = (svg.match(/<text\b/gi) || []).length;
        console.log('DEBUG text elements BEFORE cleanSVGAttributes:', textCountBefore);

        // Log SVG before cleaning (first 500 chars)
        console.log('SVG before cleanSVGAttributes (first 500 chars):', svg.substring(0, 500));
        console.log('SVG before cleanSVGAttributes - starts with:', svg.substring(0, 100));
        console.log('SVG before cleanSVGAttributes - length:', svg.length);

        // CRITICAL: Clean the entire SVG to remove newlines from attribute values
        // This aggressively fixes any attribute formatting issues
        svg = cleanSVGAttributes(svg);

        // DEBUG: Count text elements after cleaning
        const textCountAfter = (svg.match(/<text\b/gi) || []).length;
        console.log('DEBUG text elements AFTER cleanSVGAttributes:', textCountAfter);

        if (textCountBefore > 0 && textCountAfter !== textCountBefore) {
            console.error(`DEBUG: CRITICAL - Text element count changed! Before: ${textCountBefore}, After: ${textCountAfter}`);
        }

        // Log SVG after cleaning (first 500 chars)
        console.log('SVG after cleanSVGAttributes (first 500 chars):', svg.substring(0, 500));
        console.log('SVG after cleanSVGAttributes - starts with:', svg.substring(0, 100));
        console.log('SVG after cleanSVGAttributes - length:', svg.length);

        // DEBUG: Write final SVG to disk for browser inspection
        try {
            await fs.writeFile('debug-export.svg', svg, 'utf8');
            console.log('DEBUG: wrote debug-export.svg to disk - open in browser to verify text visibility');
        } catch (writeError) {
            console.warn('DEBUG: Failed to write debug-export.svg:', writeError.message);
        }

        // Validate font-family strings in the SVG to catch any issues early
        const fontFamilyMatches = svg.match(/font-family:\s*([^;]+)/g);
        if (fontFamilyMatches) {
            fontFamilyMatches.forEach((match, idx) => {
                // Check for problematic patterns: nested double quotes
                if (match.includes('"') && match.includes('style=')) {
                    console.warn(`Potential font-family issue at match ${idx + 1}: ${match.substring(0, 100)}`);
                }
            });
        }

        // DEBUG: For specific logo, dump final SVG to temp file
        if (id === 'b1ebda84-b153-4e49-ab2a-4e5f91369ff5') {
            try {
                const tempDir = path.join(__dirname, '../../temp');
                await fs.mkdir(tempDir, { recursive: true });
                const svgPath = path.join(tempDir, `logo-${id}-final.svg`);
                await fs.writeFile(svgPath, svg, 'utf8');
                console.log(`DEBUG: Final SVG dumped to ${svgPath}`);

                // Also count text elements
                const textMatches = svg.match(/<text[^>]*>/g);
                console.log(`DEBUG: Found ${textMatches ? textMatches.length : 0} <text> elements in final SVG`);
                if (textMatches) {
                    textMatches.forEach((match, idx) => {
                        console.log(`DEBUG: Text element ${idx + 1}: ${match.substring(0, 200)}`);
                    });
                }
            } catch (debugError) {
                console.warn('DEBUG: Failed to dump SVG:', debugError.message);
            }
        }

        // Additional SVG validation: Check for common issues that cause resvg parsing errors
        // Check for extremely long data URLs or malformed content
        const svgSizeMB = (svg.length / 1024 / 1024).toFixed(2);
        if (svg.length > 1000000) { // 1MB limit
            console.warn(`SVG is very large: ${svg.length} characters (${svgSizeMB}MB)`);
        } else {
            console.log(`SVG size: ${svg.length} characters (${svgSizeMB}MB)`);
        }

        // Validate SVG structure - ensure it's well-formed XML
        // Check if it starts with XML declaration or <svg tag
        const trimmedSvg = svg.trim();
        const startsWithXml = trimmedSvg.startsWith('<?xml');
        const startsWithSvg = trimmedSvg.startsWith('<svg');
        const hasSvgTag = trimmedSvg.includes('<svg');

        console.log('SVG validation check:', {
            startsWithXml,
            startsWithSvg,
            hasSvgTag,
            svgSize: `${svgSizeMB}MB`,
            firstChars: trimmedSvg.substring(0, 200)
        });

        console.log('Starting PNG conversion process...');

        if (!startsWithXml && !startsWithSvg && !hasSvgTag) {
            console.error('SVG does not start with <svg tag or <?xml declaration');
            console.error('SVG first 500 chars:', trimmedSvg.substring(0, 500));
            return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
                'Invalid SVG structure: SVG does not start correctly',
                process.env.NODE_ENV === 'development' ? {
                    svgPreview: trimmedSvg.substring(0, 500),
                    startsWithXml,
                    startsWithSvg,
                    hasSvgTag
                } : null);
        }

        // Check for unclosed tags or malformed XML
        const openTags = (svg.match(/<[^/!?][^>]*>/g) || []).length;
        const closeTags = (svg.match(/<\/[^>]+>/g) || []).length;
        // Note: This is a rough check - SVG can have self-closing tags
        if (Math.abs(openTags - closeTags) > 100) {
            console.warn(`SVG tag mismatch: ${openTags} open tags, ${closeTags} close tags`);
        }

        // Try to convert SVG to PNG using @resvg/resvg-js first
        let pngBuffer;
        let useCloudinary = false;
        let resvgError = null;

        try {
            console.log('Attempting Resvg conversion...');
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

            console.log('Creating Resvg instance...');
            // Configure Resvg with font support
            // Try to load system fonts and use DejaVu Sans as default/fallback
            const resvgOptions = {
                background: background,
                fitTo: {
                    mode: 'width',
                    value: canvasWidth
                },
                dpi: parseInt(dpi) || 300,
                // Font configuration for Resvg
                // Note: @resvg/resvg-js may not support all font options, but we try
                font: {
                    loadSystemFonts: true, // Allow system fonts if present
                    defaultFontFamily: 'DejaVu Sans', // Used when SVG says sans-serif
                    fontFallbacks: ['DejaVu Sans', 'Arial', 'sans-serif']
                }
            };

            // Try to add explicit font file if available (optional, may not be needed)
            // const fontPath = path.join(__dirname, '..', 'fonts', 'DejaVuSans.ttf');
            // if (await fs.access(fontPath).then(() => true).catch(() => false)) {
            //     resvgOptions.font.fontFiles = [fontPath];
            //     console.log('Resvg: Using explicit font file:', fontPath);
            // }

            console.log('Resvg options:', JSON.stringify(resvgOptions, null, 2));
            const resvg = new Resvg(svg, resvgOptions);

            console.log('Rendering PNG with Resvg (this may take a while for large SVGs)...');
            const renderStartTime = Date.now();
            const pngData = resvg.render();
            const renderDuration = Date.now() - renderStartTime;
            console.log(`Resvg render completed in ${(renderDuration / 1000).toFixed(2)}s`);

            console.log('Converting to PNG buffer...');
            pngBuffer = pngData.asPng();
            console.log(`PNG buffer created: ${(pngBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        } catch (svgError) {
            resvgError = svgError;
            console.warn('Resvg failed, falling back to Cloudinary:', svgError.message);
            if (svgError.message && svgError.message.includes('unknown token')) {
                // Log the problematic area of the SVG
                const errorPos = svgError.message.match(/at (\d+):(\d+)/);
                if (errorPos) {
                    const lineNum = parseInt(errorPos[1]);
                    const charNum = parseInt(errorPos[2]);
                    const lines = svg.split('\n');
                    if (lines[lineNum - 1]) {
                        const problemLine = lines[lineNum - 1];
                        const start = Math.max(0, charNum - 50);
                        const end = Math.min(problemLine.length, charNum + 50);
                        console.error('Problematic SVG area:', {
                            line: lineNum,
                            char: charNum,
                            snippet: problemLine.substring(start, end)
                        });
                    }
                }
            }
            useCloudinary = true;

            // Fallback: Use Cloudinary to convert SVG to PNG
            try {
                console.log('Starting Cloudinary conversion fallback...');
                console.log(`SVG size: ${(svg.length / 1024 / 1024).toFixed(2)}MB`);

                // Convert SVG to base64 data URL
                console.log('Converting SVG to base64...');
                const svgBase64 = Buffer.from(svg).toString('base64');
                const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
                console.log(`Base64 data URL size: ${(svgDataUrl.length / 1024 / 1024).toFixed(2)}MB`);

                // Build Cloudinary upload options
                // NOTE: Cloudinary doesn't support 'transparent' as a flag in upload options
                // PNG format supports transparency by default, so we just ensure format is PNG
                const uploadOptions = {
                    resource_type: 'image',
                    format: 'png',
                    width: canvasWidth,
                    height: canvasHeight,
                    dpr: (parseInt(dpi) || 300) / 72, // Convert DPI to device pixel ratio
                    quality: format === 'jpg' || format === 'jpeg' ? parseInt(quality) : 'auto',
                    fetch_format: format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png',
                    timeout: 120000 // Increase timeout to 2 minutes for large files
                };

                // For transparent backgrounds, ensure we use PNG (which supports transparency)
                // Don't add invalid 'transparent' flag - PNG format handles transparency natively
                if (logo.export_transparent_background) {
                    uploadOptions.fetch_format = 'png';
                    // PNG supports transparency by default, no flag needed
                }

                // Upload SVG to Cloudinary and convert to PNG
                console.log('Uploading SVG to Cloudinary (this may take a while for large files)...');
                const uploadStartTime = Date.now();
                const uploadResult = await cloudinary.uploader.upload(svgDataUrl, uploadOptions);
                const uploadDuration = Date.now() - uploadStartTime;
                console.log(`Cloudinary upload completed in ${(uploadDuration / 1000).toFixed(2)}s`);
                console.log(`Upload result URL: ${uploadResult.secure_url}`);

                // Download the converted PNG from Cloudinary
                console.log('Downloading converted PNG from Cloudinary...');
                const downloadStartTime = Date.now();
                const imageResponse = await axios.get(uploadResult.secure_url, {
                    responseType: 'arraybuffer',
                    timeout: 120000 // Increase timeout to 2 minutes
                });
                const downloadDuration = Date.now() - downloadStartTime;
                console.log(`PNG download completed in ${(downloadDuration / 1000).toFixed(2)}s`);
                console.log(`PNG size: ${(imageResponse.data.length / 1024 / 1024).toFixed(2)}MB`);

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
                // Return proper JSON error instead of 500
                return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
                    'Failed to export logo: Both Resvg and Cloudinary conversion failed',
                    process.env.NODE_ENV === 'development' ? {
                        resvg: resvgError ? resvgError.message : 'Unknown error',
                        cloudinary: cloudinaryError.message || cloudinaryError.toString(),
                        svgLength: svg.length,
                        svgPreview: svg.substring(0, 500) // First 500 chars for debugging
                    } : {
                        resvg: resvgError ? 'SVG parsing failed' : 'Unknown error',
                        cloudinary: 'Image conversion failed'
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
            return internalError(res, ERROR_CODES.EXPORT.UPLOAD_FAILED,
                'Failed to upload logo to Cloudinary',
                process.env.NODE_ENV === 'development' ? { error: uploadError.message } : null);
        }
    } catch (error) {
        console.error('Error exporting logo:', error);
        return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
            'Failed to export logo',
            process.env.NODE_ENV === 'development' ? { error: error.message } : null);
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
        return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR,
            'Failed to fetch layer data',
            process.env.NODE_ENV === 'development' ? { error: error.message } : null);
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
            return notFound(res, ERROR_CODES.LOGO.NOT_FOUND, 'Logo not found');
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

// GET /api/project/:id/export - Export project (stored as JSON) as PNG
// Requires authentication and pro subscription
router.get('/project/:id/export', authenticate, entitlementMiddleware, requirePro, async(req, res) => {
    try {
        const { id } = req.params;
        const { width, height, dpi = 300, quality = 100, format = 'png' } = req.query;
        const userId = (req.user && req.user.id) || req.userId;

        if (!userId) {
            return forbidden(res, ERROR_CODES.AUTH.UNAUTHORIZED, 'Authentication required');
        }

        // Fetch project from database
        const projectRes = await query(
            `SELECT id, user_id, title, json_doc, created_at, updated_at
             FROM projects
             WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
             LIMIT 1`, [id, userId]
        );

        if (projectRes.rows.length === 0) {
            return notFound(res, ERROR_CODES.PROJECT.NOT_FOUND, 'Project not found or access denied');
        }

        const project = projectRes.rows[0];
        const jsonDoc = typeof project.json_doc === 'string' ?
            JSON.parse(project.json_doc) :
            project.json_doc;

        // Extract logo data from json_doc
        // Support multiple possible structures
        let logoData = null;
        let layersData = [];

        // Structure 1: Direct logo structure
        if (jsonDoc.canvas && jsonDoc.layers) {
            logoData = {
                id: project.id,
                owner_id: project.user_id,
                title: project.title || jsonDoc.title || 'Untitled Project',
                canvas_w: jsonDoc.canvas.width || jsonDoc.canvas.w || 1000,
                canvas_h: jsonDoc.canvas.height || jsonDoc.canvas.h || 1000,
                dpi: jsonDoc.canvas.dpi || 300,
                canvas_background_type: jsonDoc.canvas.backgroundType || jsonDoc.canvas.backgroundColor ? 'solid' : 'transparent',
                canvas_background_solid_color: jsonDoc.canvas.backgroundColor || jsonDoc.canvas.background_color || '#ffffff',
                canvas_background_gradient: jsonDoc.canvas.gradient || null,
                canvas_background_image_type: jsonDoc.canvas.backgroundImage ? 'image' : null,
                canvas_background_image_path: jsonDoc.canvas.backgroundImage || null,
                export_format: (jsonDoc.export && jsonDoc.export.format) || 'png',
                export_transparent_background: (jsonDoc.export && jsonDoc.export.transparentBackground) !== false,
                export_quality: (jsonDoc.export && jsonDoc.export.quality) || 100,
                export_scalable: (jsonDoc.export && jsonDoc.export.scalable) !== false,
                export_maintain_aspect_ratio: (jsonDoc.export && jsonDoc.export.maintainAspectRatio) !== false
            };
            layersData = jsonDoc.layers || [];
        }
        // Structure 2: Nested logo structure
        else if (jsonDoc.logo) {
            logoData = {
                id: project.id,
                owner_id: project.user_id,
                title: project.title || jsonDoc.logo.title || 'Untitled Project',
                canvas_w: jsonDoc.logo.canvas_w || (jsonDoc.logo.canvas && jsonDoc.logo.canvas.width) || 1000,
                canvas_h: jsonDoc.logo.canvas_h || (jsonDoc.logo.canvas && jsonDoc.logo.canvas.height) || 1000,
                dpi: jsonDoc.logo.dpi || 300,
                canvas_background_type: jsonDoc.logo.canvas_background_type || 'transparent',
                canvas_background_solid_color: jsonDoc.logo.canvas_background_solid_color || '#ffffff',
                canvas_background_gradient: jsonDoc.logo.canvas_background_gradient || null,
                canvas_background_image_type: jsonDoc.logo.canvas_background_image_type || null,
                canvas_background_image_path: jsonDoc.logo.canvas_background_image_path || null,
                export_format: jsonDoc.logo.export_format || 'png',
                export_transparent_background: jsonDoc.logo.export_transparent_background !== false,
                export_quality: jsonDoc.logo.export_quality || 100,
                export_scalable: jsonDoc.logo.export_scalable !== false,
                export_maintain_aspect_ratio: jsonDoc.logo.export_maintain_aspect_ratio !== false
            };
            layersData = jsonDoc.logo.layers || [];
        }
        // Structure 3: Try to find logo and layers at root level
        else {
            // Try to extract from root level
            logoData = {
                id: project.id,
                owner_id: project.user_id,
                title: project.title || jsonDoc.title || 'Untitled Project',
                canvas_w: jsonDoc.width || jsonDoc.canvas_w || 1000,
                canvas_h: jsonDoc.height || jsonDoc.canvas_h || 1000,
                dpi: jsonDoc.dpi || 300,
                canvas_background_type: jsonDoc.backgroundType || 'transparent',
                canvas_background_solid_color: jsonDoc.backgroundColor || '#ffffff',
                canvas_background_gradient: jsonDoc.gradient || null,
                canvas_background_image_type: jsonDoc.backgroundImage ? 'image' : null,
                canvas_background_image_path: jsonDoc.backgroundImage || null,
                export_format: jsonDoc.format || 'png',
                export_transparent_background: jsonDoc.transparentBackground !== false,
                export_quality: jsonDoc.quality || 100,
                export_scalable: jsonDoc.scalable !== false,
                export_maintain_aspect_ratio: jsonDoc.maintainAspectRatio !== false
            };
            layersData = jsonDoc.layers || [];
        }

        if (!logoData || !layersData || layersData.length === 0) {
            return badRequest(res, ERROR_CODES.VALIDATION.INVALID_INPUT,
                'Invalid project structure. Project must contain canvas and layers data.');
        }

        // Convert layers to the format expected by generateSVGFromLogo
        // The layers from json_doc might be in a different format, so we need to normalize them
        const normalizedLayers = layersData.map((layer, index) => {
            // Normalize layer structure to match database format
            const normalized = {
                id: layer.id || `layer-${index}`,
                type: (layer.type && layer.type.toUpperCase()) || 'TEXT',
                z_index: layer.z_index !== undefined ? layer.z_index : (layer.zIndex !== undefined ? layer.zIndex : index),
                x_norm: layer.x_norm !== undefined ? layer.x_norm : (layer.x !== undefined ? layer.x / logoData.canvas_w : 0),
                y_norm: layer.y_norm !== undefined ? layer.y_norm : (layer.y !== undefined ? layer.y / logoData.canvas_h : 0),
                scale: layer.scale || 1,
                rotation_deg: layer.rotation_deg !== undefined ? layer.rotation_deg : (layer.rotation !== undefined ? layer.rotation : 0),
                opacity: layer.opacity !== undefined ? layer.opacity : 1,
                is_visible: layer.is_visible !== false && layer.visible !== false,
                flip_horizontal: layer.flip_horizontal || layer.flipHorizontal || false,
                flip_vertical: layer.flip_vertical || layer.flipVertical || false,
                common_style: layer.common_style || layer.style || null
            };

            // Add type-specific data
            if (normalized.type === 'TEXT' && layer.text) {
                normalized.text = {
                    content: layer.text.content || layer.content || '',
                    font_family: layer.text.fontFamily || layer.fontFamily || 'Arial',
                    font_size: layer.text.fontSize || layer.fontSize || 48,
                    fill_hex: layer.text.fillHex || layer.text.color || layer.color || '#000000',
                    fill_alpha: layer.text.fillAlpha !== undefined ? layer.text.fillAlpha : 1
                };
            } else if (normalized.type === 'SHAPE' && layer.shape) {
                normalized.shape = {
                    shape_kind: layer.shape.kind || layer.shape.shape_kind || 'rectangle',
                    fill_hex: layer.shape.fillHex || layer.shape.fill || '#000000',
                    fill_alpha: layer.shape.fillAlpha !== undefined ? layer.shape.fillAlpha : 1,
                    stroke_hex: layer.shape.strokeHex || layer.shape.stroke || null,
                    stroke_width: layer.shape.strokeWidth || 0,
                    meta: layer.shape.meta || {}
                };
            } else if (normalized.type === 'ICON' && layer.icon) {
                normalized.icon = {
                    asset_id: layer.icon.assetId || layer.icon.asset_id || null,
                    path: layer.icon.path || layer.icon.url || null,
                    tint_hex: layer.icon.tintHex || layer.icon.tint || null,
                    tint_alpha: layer.icon.tintAlpha !== undefined ? layer.icon.tintAlpha : 1,
                    asset: layer.icon.asset || null
                };
            } else if (normalized.type === 'IMAGE' && layer.image) {
                normalized.image = {
                    asset_id: layer.image.assetId || layer.image.asset_id || null,
                    path: layer.image.path || layer.image.url || null,
                    asset: layer.image.asset || null
                };
            }

            return normalized;
        });

        // Determine canvas dimensions
        const canvasWidth = width ? parseInt(width) : logoData.canvas_w;
        const canvasHeight = height ? parseInt(height) : logoData.canvas_h;

        // Generate SVG from logo data
        let svg = await generateSVGFromLogo(logoData, normalizedLayers, canvasWidth, canvasHeight);

        // Validate SVG before processing
        if (!svg || typeof svg !== 'string' || svg.trim().length === 0) {
            return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
                'Failed to generate SVG from project data');
        }

        // Clean the SVG
        svg = cleanSVGAttributes(svg);

        // Additional SVG validation
        if (svg.length > 1000000) {
            console.warn('SVG is very large:', svg.length, 'characters');
        }

        // Convert SVG to PNG using @resvg/resvg-js
        let pngBuffer;
        let useCloudinary = false;
        let resvgError = null;

        try {
            let background = 'rgba(0,0,0,0)';
            if (logoData.canvas_background_type === 'transparent' || logoData.export_transparent_background) {
                background = 'rgba(0,0,0,0)';
            } else if (logoData.canvas_background_type === 'image') {
                background = 'rgba(0,0,0,0)';
            } else if (logoData.canvas_background_type === 'solid') {
                background = logoData.canvas_background_solid_color || '#ffffff';
            } else {
                background = logoData.canvas_background_solid_color || '#ffffff';
            }

            // Configure Resvg with font support
            const resvgOptions = {
                background: background,
                fitTo: {
                    mode: 'width',
                    value: canvasWidth
                },
                dpi: parseInt(dpi) || 300,
                // Font configuration for Resvg
                font: {
                    loadSystemFonts: true, // Allow system fonts if present
                    defaultFontFamily: 'DejaVu Sans', // Used when SVG says sans-serif
                    fontFallbacks: ['DejaVu Sans', 'Arial', 'sans-serif']
                }
            };

            console.log('Resvg options (project export):', JSON.stringify(resvgOptions, null, 2));
            const resvg = new Resvg(svg, resvgOptions);

            const pngData = resvg.render();
            pngBuffer = pngData.asPng();
        } catch (svgError) {
            resvgError = svgError;
            console.warn('Resvg failed, falling back to Cloudinary:', svgError.message);
            if (svgError.message && svgError.message.includes('unknown token')) {
                const errorPos = svgError.message.match(/at (\d+):(\d+)/);
                if (errorPos) {
                    const lineNum = parseInt(errorPos[1]);
                    const charNum = parseInt(errorPos[2]);
                    const lines = svg.split('\n');
                    if (lines[lineNum - 1]) {
                        const problemLine = lines[lineNum - 1];
                        const start = Math.max(0, charNum - 50);
                        const end = Math.min(problemLine.length, charNum + 50);
                        console.error('Problematic SVG area:', {
                            line: lineNum,
                            char: charNum,
                            snippet: problemLine.substring(start, end)
                        });
                    }
                }
            }
            useCloudinary = true;

            try {
                const svgBase64 = Buffer.from(svg).toString('base64');
                const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

                // Build Cloudinary upload options
                // NOTE: Cloudinary doesn't support 'transparent' as a flag in upload options
                // PNG format supports transparency by default, so we just ensure format is PNG
                const uploadOptions = {
                    resource_type: 'image',
                    format: 'png',
                    width: canvasWidth,
                    height: canvasHeight,
                    dpr: (parseInt(dpi) || 300) / 72,
                    quality: format === 'jpg' || format === 'jpeg' ? parseInt(quality) : 'auto',
                    fetch_format: format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png'
                };

                // For transparent backgrounds, ensure we use PNG (which supports transparency)
                // Don't add invalid 'transparent' flag - PNG format handles transparency natively
                if (logoData.export_transparent_background) {
                    uploadOptions.fetch_format = 'png';
                    // PNG supports transparency by default, no flag needed
                }

                const uploadResult = await cloudinary.uploader.upload(svgDataUrl, uploadOptions);

                const imageResponse = await axios.get(uploadResult.secure_url, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                pngBuffer = Buffer.from(imageResponse.data);

                try {
                    await cloudinary.uploader.destroy(uploadResult.public_id);
                } catch (cleanupError) {
                    console.warn('Failed to cleanup Cloudinary temp file:', cleanupError.message);
                }
            } catch (cloudinaryError) {
                console.error('Cloudinary conversion also failed:', cloudinaryError);
                return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
                    'Failed to export project: Both Resvg and Cloudinary conversion failed',
                    process.env.NODE_ENV === 'development' ? {
                        resvg: resvgError ? resvgError.message : 'Unknown error',
                        cloudinary: cloudinaryError.message || cloudinaryError.toString(),
                        svgLength: svg.length,
                        svgPreview: svg.substring(0, 500)
                    } : {
                        resvg: resvgError ? 'SVG parsing failed' : 'Unknown error',
                        cloudinary: 'Image conversion failed'
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
                folder: 'project-exports',
                public_id: `project-${id}-${Date.now()}`,
                format: format === 'jpg' || format === 'jpeg' ? 'jpg' : 'png',
                overwrite: false,
                invalidate: true
            };

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

            return res.json({
                success: true,
                message: 'Project exported successfully',
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
            return internalError(res, ERROR_CODES.EXPORT.UPLOAD_FAILED,
                'Failed to upload project to Cloudinary',
                process.env.NODE_ENV === 'development' ? { error: uploadError.message } : null);
        }
    } catch (error) {
        console.error('Error exporting project:', error);
        return internalError(res, ERROR_CODES.EXPORT.EXPORT_FAILED,
            'Failed to export project',
            process.env.NODE_ENV === 'development' ? { error: error.message } : null);
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

/**
 * Unified transformation builder for all layer types (TEXT, SHAPE, IMAGE, ICON)
 * Applies transformations in the correct order to match the editor:
 * 1. Move to canvas position (normalized → absolute)
 * 2. Apply anchor offsets
 * 3. Rotate around center
 * 4. Apply flip (horizontal/vertical)
 * 5. Apply scale based on normalized scale factor
 * 
 * @param {Object} params - Transformation parameters
 * @param {number} params.x_norm - Normalized X position (0-1)
 * @param {number} params.y_norm - Normalized Y position (0-1)
 * @param {number} params.scale - Normalized scale factor
 * @param {number} params.rotation_deg - Rotation in degrees
 * @param {boolean} params.flip_horizontal - Flip horizontally
 * @param {boolean} params.flip_vertical - Flip vertically
 * @param {number} params.anchor_x - Anchor X offset (-0.5 to 0.5, where 0 is center)
 * @param {number} params.anchor_y - Anchor Y offset (-0.5 to 0.5, where 0 is center)
 * @param {number} params.elementWidth - Element width for anchor calculation
 * @param {number} params.elementHeight - Element height for anchor calculation
 * @param {number} params.canvasWidth - Canvas width
 * @param {number} params.canvasHeight - Canvas height
 * @returns {string} SVG transform string
 */
function buildUnifiedTransform(params) {
    const {
        x_norm = 0,
            y_norm = 0,
            scale = 1,
            rotation_deg = 0,
            flip_horizontal = false,
            flip_vertical = false,
            anchor_x = 0,
            anchor_y = 0,
            elementWidth = 0,
            elementHeight = 0,
            canvasWidth = 1000,
            canvasHeight = 1000
    } = params;

    // Step 1: Convert normalized position to absolute canvas coordinates
    const canvasX = (x_norm || 0) * canvasWidth;
    const canvasY = (y_norm || 0) * canvasHeight;

    // Step 2: Calculate anchor offsets
    // Anchor is relative to element center (-0.5 = left/top, 0 = center, 0.5 = right/bottom)
    const anchorOffsetX = (anchor_x || 0) * (elementWidth || 0);
    const anchorOffsetY = (anchor_y || 0) * (elementHeight || 0);

    // Step 3: Build transform in correct order
    // Order: translate → rotate → flip → scale
    // CRITICAL: Flip must be applied around the element's center (0,0 after translation),
    // not around the global origin, to match editor behavior
    // We need to apply anchor offset before rotation, so we combine it with the position
    const finalX = canvasX - anchorOffsetX;
    const finalY = canvasY - anchorOffsetY;

    const validRotation = isNaN(rotation_deg) ? 0 : rotation_deg;
    const validScale = isNaN(scale) ? 1 : scale;
    const hasFlip = flip_horizontal || flip_vertical;

    // Step 4 & 5: Build transform with proper order: translate → rotate → flip (around center) → scale
    // CRITICAL FIX: Flip must be applied around the element's geometric center,
    // not around (0,0). The element is positioned at (0,0) in local coordinates,
    // but its center is at (elementWidth/2, elementHeight/2).
    // To flip around center: translate to center, flip, translate back

    let transform = '';

    if (hasFlip && (elementWidth > 0 || elementHeight > 0)) {
        // Calculate element center in local coordinates
        const centerX = (elementWidth || 0) / 2;
        const centerY = (elementHeight || 0) / 2;

        // Apply transforms in order: translate → rotate → translate to center → flip → translate back
        // Pattern: translate(x, y) rotate(r) translate(cx, cy) scale(sx, sy) translate(-cx, -cy)
        const scaleX = (flip_horizontal ? -1 : 1) * validScale;
        const scaleY = (flip_vertical ? -1 : 1) * validScale;

        transform = `translate(${finalX}, ${finalY})`;
        if (validRotation !== 0) {
            transform += ` rotate(${validRotation})`;
        }
        transform += ` translate(${centerX}, ${centerY}) scale(${scaleX}, ${scaleY}) translate(${-centerX}, ${-centerY})`;
    } else {
        // No flip, apply transforms normally
        transform = `translate(${finalX}, ${finalY})`;
        if (validRotation !== 0) {
            transform += ` rotate(${validRotation})`;
        }
        if (validScale !== 1) {
            transform += ` scale(${validScale}, ${validScale})`;
        }
    }

    // Clean transform
    transform = transform.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

    return transform;
}

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

    // Process each layer using unified transformation model
    for (const layer of sortedLayers) {
        const opacity = layer.opacity !== undefined ? layer.opacity : 1;

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

        // Parse scale from layer - handle string values from database
        let parsedScale = 1;
        if (layer.scale !== undefined && layer.scale !== null) {
            if (Array.isArray(layer.scale)) {
                parsedScale = layer.scale.length > 0 ? parseFloat(layer.scale[0]) : 1;
            } else if (typeof layer.scale === 'number' && !isNaN(layer.scale)) {
                parsedScale = layer.scale;
            } else if (typeof layer.scale === 'string' && layer.scale.trim() !== '') {
                parsedScale = parseFloat(layer.scale);
            }
        }
        // Ensure parsedScale is valid
        if (isNaN(parsedScale) || parsedScale <= 0) {
            parsedScale = 1;
        }

        // Common transform parameters for unified transform
        const transformParams = {
            x_norm: layer.x_norm || 0,
            y_norm: layer.y_norm || 0,
            scale: parsedScale,
            rotation_deg: layer.rotation_deg || 0,
            flip_horizontal: layer.flip_horizontal || false,
            flip_vertical: layer.flip_vertical || false,
            anchor_x: layer.anchor_x || 0,
            anchor_y: layer.anchor_y || 0,
            canvasWidth: width,
            canvasHeight: height
        };

        switch (layer.type) {
            case 'TEXT':
                const textSvg = await generateTextSVG(layer, transformParams, style, defs, width, height);
                svgContent += textSvg;
                if (textSvg) console.log(`  ✓ TEXT layer ${layer.id} rendered`);
                break;
            case 'SHAPE':
                console.log(`Processing SHAPE layer ${layer.id}:`, {
                    hasShape: !!layer.shape,
                    shapeKind: layer.shape && layer.shape.shape_kind,
                    hasMetaSrc: !!(layer.shape && layer.shape.meta && layer.shape.meta.src),
                    metaSrc: layer.shape && layer.shape.meta && layer.shape.meta.src,
                    x_norm: layer.x_norm,
                    y_norm: layer.y_norm,
                    scale: layer.scale,
                    rotation: layer.rotation_deg,
                    anchor_x: layer.anchor_x,
                    anchor_y: layer.anchor_y,
                    opacity: opacity,
                    isVisible: layer.is_visible
                });
                const shapeSvg = await generateShapeSVG(layer, transformParams, style, defs, width, height);
                svgContent += shapeSvg;
                if (shapeSvg) {
                    console.log(`  ✓ SHAPE layer ${layer.id} rendered (length: ${shapeSvg.length})`);
                    // Log a snippet of the actual SVG to verify structure
                    console.log(`  SHAPE SVG snippet: ${shapeSvg.substring(0, Math.min(500, shapeSvg.length))}...`);
                } else {
                    console.warn(`  ✗ SHAPE layer ${layer.id} failed to render`);
                }
                break;
            case 'ICON':
                const iconSvg = await generateIconSVG(layer, transformParams, style, defs, width, height);
                svgContent += iconSvg;
                if (iconSvg) console.log(`  ✓ ICON layer ${layer.id} rendered`);
                break;
            case 'IMAGE':
                console.log(`Processing IMAGE layer ${layer.id}:`, {
                    hasImage: !!layer.image,
                    imagePath: layer.image && layer.image.path,
                    assetUrl: layer.image && layer.image.asset && layer.image.asset.url,
                    assetId: layer.image && layer.image.asset_id,
                    x_norm: layer.x_norm,
                    y_norm: layer.y_norm,
                    scale: layer.scale,
                    anchor_x: layer.anchor_x,
                    anchor_y: layer.anchor_y,
                    opacity: opacity,
                    isVisible: layer.is_visible
                });
                const imageSvg = await generateImageSVG(layer, transformParams, style, defs, width, height);
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
                // For external URLs, try to download and convert to PNG data URL for better compatibility
                // This ensures Resvg can render the image (Resvg may not support WebP data URLs)
                try {
                    let imageBuffer;
                    let mimeType = 'image/png'; // Default to PNG

                    if (bgImageUrl.startsWith('http://') || bgImageUrl.startsWith('https://')) {
                        const imageResponse = await axios.get(bgImageUrl, {
                            responseType: 'arraybuffer',
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0'
                            }
                        });
                        imageBuffer = Buffer.from(imageResponse.data);
                        const originalMimeType = imageResponse.headers['content-type'] || 'image/jpeg';

                        // Convert to PNG if it's WebP or other formats that resvg might not support well
                        if (originalMimeType === 'image/webp' || originalMimeType === 'image/avif' || originalMimeType === 'image/heic') {
                            console.log(`Canvas background image: Converting ${originalMimeType} to PNG for resvg compatibility`);
                            imageBuffer = await sharp(imageBuffer).png().toBuffer();
                            mimeType = 'image/png';
                        } else {
                            mimeType = originalMimeType;
                        }
                    } else if (bgImageUrl.startsWith('data:')) {
                        // Already a data URL - extract the data and convert if needed
                        const dataUrlMatch = bgImageUrl.match(/^data:([^;]+);base64,(.+)$/);
                        if (dataUrlMatch) {
                            const originalMimeType = dataUrlMatch[1];
                            const base64Data = dataUrlMatch[2];
                            imageBuffer = Buffer.from(base64Data, 'base64');

                            // Convert to PNG if it's WebP or other formats
                            if (originalMimeType === 'image/webp' || originalMimeType === 'image/avif' || originalMimeType === 'image/heic') {
                                console.log(`Canvas background image: Converting data URL ${originalMimeType} to PNG for resvg compatibility`);
                                imageBuffer = await sharp(imageBuffer).png().toBuffer();
                                mimeType = 'image/png';
                            } else {
                                mimeType = originalMimeType;
                            }
                        } else {
                            // Invalid data URL format, try to use as-is
                            console.warn('Canvas background image: Invalid data URL format, using as-is');
                        }
                    }

                    // Convert to base64 data URL
                    if (imageBuffer) {
                        const base64Image = imageBuffer.toString('base64');
                        bgImageUrl = `data:${mimeType};base64,${base64Image}`;
                        console.log(`Canvas background image: Converted to ${mimeType} data URL (${Math.round(base64Image.length / 1024)}KB)`);
                    }
                } catch (downloadError) {
                    console.warn('Failed to download/convert background image, using URL directly:', downloadError.message);
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

    // Log font definitions for debugging
    const fontDefs = cleanDefs.filter(def => def.includes('@font-face'));
    if (fontDefs.length > 0) {
        console.log(`generateSVGFromLogo: Added ${fontDefs.length} @font-face definition(s) to SVG`);
    } else {
        console.warn('generateSVGFromLogo: No @font-face definitions found - text may not render if fonts are missing');
    }

    // Count text elements in SVG for debugging
    const textElements = (svgContent.match(/<text[^>]*>/g) || []).length;
    if (textElements > 0) {
        console.log(`generateSVGFromLogo: SVG contains ${textElements} <text> element(s)`);
    }

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

async function generateTextSVG(layer, transformParams, style, defs, canvasWidth, canvasHeight) {
    const { text } = layer;
    // Support both content (database) and value (legacy JSON)
    const textContent = text && text.content ? text.content : (text && text.value ? text.value : undefined);
    if (!text || !textContent) return '';

    // TEMP DEBUG MODE: Super-simple text rendering to isolate transform/font-size issues
    // Enable with LOGO_EXPORT_TEXT_DEBUG=true environment variable
    if (process.env.LOGO_EXPORT_TEXT_DEBUG === 'true') {
        console.log('EXPORT DEBUG: Using simple text mode (ignoring all transforms/scaling)');

        // Completely ignore: normalizedScale, elementWidth/Height, anchors, flip, rotation, transforms
        const debugFontSize = 80; // Large and clearly visible
        const x = canvasWidth * 0.5; // Center X
        const y = canvasHeight * 0.5; // Center Y

        // Get fill color from layer
        const fillColor = validateHexColor(text.fill_hex || text.fontColor || '#ff0000');
        const opacity = layer.opacity !== undefined ? layer.opacity : 1;

        const textSvg = `
  <text
    x="${x}"
    y="${y}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="DejaVu Sans, Arial, sans-serif"
    font-size="${debugFontSize}"
    fill="${fillColor}"
    opacity="${opacity}"
  >
    ${escapeXml(textContent || 'NO_CONTENT')}
  </text>`;

        console.log('EXPORT DEBUG: final text element =', textSvg);
        return textSvg;
    }

    // Support both snake_case and camelCase for font_size
    // The font_size in the database is the base size, which needs to be scaled based on canvas size
    const baseFontSize = parseFloat(text.font_size || text.fontSize || 16);

    // Calculate actual font size based on canvas size and scale
    // For TEXT layers, the editor bakes the scaleFactor into the font-size directly
    // rather than applying it via transform, so we do the same to match editor behavior
    // Formula: actualFontSize = baseFontSize * normalizedScale * (canvasRefSize / baseCanvasSize)
    // Where baseCanvasSize is typically 1000 (the reference canvas size)
    const baseCanvasSize = 1000; // Reference canvas size used by editor
    const canvasRefSize = Math.max(canvasWidth, canvasHeight);
    // Parse scale value (may be string from database)
    const rawScale = transformParams.scale || 1;
    const normalizedScale = typeof rawScale === 'string' ? parseFloat(rawScale) : (typeof rawScale === 'number' && !isNaN(rawScale) ? rawScale : 1);
    // Ensure normalizedScale is valid
    const validNormalizedScale = isNaN(normalizedScale) || normalizedScale <= 0 ? 1 : normalizedScale;
    // Bake scale into font-size for TEXT layers to match editor preview
    const actualFontSize = baseFontSize * validNormalizedScale * (canvasRefSize / baseCanvasSize);

    console.log(`generateTextSVG: Font size calculation:`, {
        baseFontSize: baseFontSize,
        canvasRefSize: canvasRefSize,
        baseCanvasSize: baseCanvasSize,
        normalizedScale: validNormalizedScale,
        actualFontSize: actualFontSize
    });

    // Calculate text dimensions for anchor calculation
    // Estimate text width and height (approximate, but better than nothing)
    // This is a rough estimate - for precise measurement, we'd need font metrics
    // NOTE: Include normalizedScale in dimension calculation since scale is baked into font-size
    const baseLetterSpacing = text.letter_spacing !== undefined ? text.letter_spacing : (text.letterSpacing !== undefined ? text.letterSpacing : 0);
    const scaledLetterSpacingForDims = baseLetterSpacing !== undefined && baseLetterSpacing !== null && !isNaN(baseLetterSpacing) ?
        baseLetterSpacing * validNormalizedScale * (canvasRefSize / baseCanvasSize) : 0;
    const lineHeight = text.line_height !== undefined ? text.line_height : 1.2;
    const estimatedTextWidth = textContent.length * (actualFontSize * 0.6) + (textContent.length - 1) * scaledLetterSpacingForDims;
    const estimatedTextHeight = actualFontSize * lineHeight;

    // Build unified transform with text dimensions
    // For TEXT layers, scale is already baked into font-size, so we should NOT apply scale again in transform
    // This prevents double-scaling which makes text invisible (e.g., 6.84px * 0.1267 ≈ 0.86px)
    // We still need to handle position, rotation, and flips, but scale should be 1
    // Flips will work correctly as scale(-1, 1) or scale(1, -1) when scale=1
    const unifiedTransform = buildUnifiedTransform({
        ...transformParams,
        scale: 1, // Scale is baked into font-size, so use 1 here to avoid double-scaling
        elementWidth: estimatedTextWidth,
        elementHeight: estimatedTextHeight
    });

    // Log transform for debugging (especially for the problematic logo)
    console.log(`generateTextSVG: Layer ${layer.id} transform:`, {
        x_norm: transformParams.x_norm,
        y_norm: transformParams.y_norm,
        scale: transformParams.scale,
        rotation_deg: transformParams.rotation_deg,
        anchor_x: transformParams.anchor_x,
        anchor_y: transformParams.anchor_y,
        elementWidth: estimatedTextWidth,
        elementHeight: estimatedTextHeight,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        unifiedTransform: unifiedTransform
    });

    // Ensure font size is valid
    const validFontSize = isNaN(actualFontSize) || actualFontSize <= 0 ? 16 : actualFontSize;

    // Font family - use the actual font from database (e.g., "Pacifico")
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

    // DEBUGGING MODE: Disable all custom fonts to test if font loading is the issue
    // TEMPORARY: Force all text to use simple system font (sans-serif)
    // This helps us determine if the missing text issue is caused by font loading or something else

    // IGNORE: font_url, font_family, font_fallbacks
    // DO NOT: Insert any @font-face blocks

    // Force simple system font with explicit fallbacks that Resvg can use
    // DejaVu Sans is a common system font, Arial and sans-serif as fallbacks
    const fontFamilyString = 'DejaVu Sans, Arial, sans-serif';

    console.log(`generateTextSVG: Using DEFAULT font-family "${fontFamilyString}" (no @font-face, no custom fonts)`);

    let textStyle = `font-size: ${validFontSize}px; font-family: ${fontFamilyString};`;
    textStyle += `fill: ${fillColor}; fill-opacity: ${fillAlpha};`;

    // CRITICAL: Ensure fill is never 'none' or transparent for text
    if (!fillColor || fillColor === 'none' || fillColor === 'transparent') {
        textStyle = textStyle.replace(/fill:[^;]+;?/g, '');
        textStyle += `fill: #000000;`; // Fallback to black if invalid
    }

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
    // Letter spacing needs to be scaled based on canvas size and normalizedScale
    // For TEXT layers, scale is baked into font-size, so we bake it into letter-spacing too
    // Reuse baseLetterSpacing from dimension calculation above
    const scaledLetterSpacing = baseLetterSpacing !== undefined && baseLetterSpacing !== null && !isNaN(baseLetterSpacing) ?
        baseLetterSpacing * validNormalizedScale * (canvasRefSize / baseCanvasSize) :
        0;
    if (scaledLetterSpacing !== 0) {
        textStyle += `letter-spacing: ${scaledLetterSpacing}px;`;
    }
    // Support both snake_case and camelCase for text_decoration
    // Also check the underline field directly (boolean or string)
    const textDecoration = text.text_decoration || text.textDecoration;
    const underline = text.underline;

    // Handle text-decoration: can be 'underline', 'overline', 'line-through', or combination
    if (textDecoration) {
        if (textDecoration === 'underline' || textDecoration === 'overline' || textDecoration === 'line-through') {
            textStyle += `text-decoration: ${textDecoration};`;
        } else if (textDecoration.includes('underline') || textDecoration.includes('overline') || textDecoration.includes('line-through')) {
            // Handle combinations like "underline overline"
            textStyle += `text-decoration: ${textDecoration};`;
        }
    } else if (underline === true || underline === 'true' || underline === 'underline') {
        // Fallback: if underline field is set but text_decoration is not
        textStyle += `text-decoration: underline;`;
    }

    // Support both snake_case and camelCase for stroke
    const strokeHex = text.stroke_hex || text.strokeHex;
    const strokeWidth = text.stroke_width || text.strokeWidth;
    if (strokeHex && strokeWidth && !isNaN(strokeWidth)) {
        const strokeColor = validateHexColor(strokeHex);
        const strokeAlpha = clampAlpha((text.stroke_alpha !== undefined ? text.stroke_alpha : text.strokeAlpha) || 1);
        // Scale stroke width based on canvas size and normalizedScale
        // For TEXT layers, scale is baked into font-size, so we bake it into stroke-width too
        const scaledStrokeWidth = strokeWidth * validNormalizedScale * (canvasRefSize / baseCanvasSize);
        textStyle += `stroke: ${strokeColor}; stroke-width: ${scaledStrokeWidth}; stroke-opacity: ${strokeAlpha};`;
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

    // Detect Arabic text and set direction attribute for proper RTL rendering
    // Check if text contains Arabic characters (Unicode range: \u0600-\u06FF)
    // Use finalTextContent after transforms are applied
    const hasArabicChars = /[\u0600-\u06FF]/.test(finalTextContent);
    const textDirection = hasArabicChars ? 'rtl' : 'ltr';

    // All attributes must be on the same line to avoid parsing errors
    // Text is positioned at origin (0,0) and the transform handles positioning
    // CRITICAL FIX: Wrap text in <g> tag with transform, similar to SHAPE/IMAGE layers
    // This ensures consistent transform handling and prevents issues with resvg
    // Add direction attribute for RTL text (Arabic)
    const textElement = `<text x="0" y="0" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" direction="${textDirection}" style="${textStyle} ${style}">${escapeXml(finalTextContent)}</text>`;

    // Wrap in <g> with transform for consistency with other layer types
    // This also helps resvg properly apply transforms
    const finalTextSvg = `<g transform="${unifiedTransform}">${textElement}</g>`;

    // Log the final text element for debugging
    console.log('EXPORT DEBUG: final text element =', finalTextSvg);

    return finalTextSvg;
}

async function generateShapeSVG(layer, transformParams, style, defs, canvasWidth, canvasHeight) {
    const { shape } = layer;
    if (!shape) return '';

    // Ensure style is always a string
    // ok here
    const styleString = typeof style === 'string' ? style : (style ? String(style) : '');

    // Extract and validate transform parameters from transformParams
    const x_norm = typeof transformParams.x_norm === 'number' ? transformParams.x_norm : (layer.x_norm || 0);
    const y_norm = typeof transformParams.y_norm === 'number' ? transformParams.y_norm : (layer.y_norm || 0);
    const scale = Array.isArray(transformParams.scale) ? transformParams.scale[0] : (typeof transformParams.scale === 'number' ? transformParams.scale : (layer.scale || 1));
    const rotation_deg = typeof transformParams.rotation_deg === 'number' ? transformParams.rotation_deg : (layer.rotation_deg || 0);
    const anchor_x = typeof transformParams.anchor_x === 'number' ? transformParams.anchor_x : (layer.anchor_x || 0);
    const anchor_y = typeof transformParams.anchor_y === 'number' ? transformParams.anchor_y : (layer.anchor_y || 0);
    const flip_horizontal = transformParams.flip_horizontal !== undefined ? transformParams.flip_horizontal : (layer.flip_horizontal || false);
    const flip_vertical = transformParams.flip_vertical !== undefined ? transformParams.flip_vertical : (layer.flip_vertical || false);

    // Ensure canvas dimensions are valid
    const validCanvasWidth = typeof canvasWidth === 'number' && !isNaN(canvasWidth) && canvasWidth > 0 ? canvasWidth : 1000;
    const validCanvasHeight = typeof canvasHeight === 'number' && !isNaN(canvasHeight) && canvasHeight > 0 ? canvasHeight : 1000;

    // Ensure scale is a single number, not an array
    // Handle string values from database by parsing them
    let validScale = 1;
    if (Array.isArray(scale)) {
        validScale = scale.length > 0 ? parseFloat(scale[0]) : 1;
    } else if (typeof scale === 'number' && !isNaN(scale)) {
        validScale = scale;
    } else if (typeof scale === 'string' && scale.trim() !== '') {
        validScale = parseFloat(scale);
    }
    // Ensure validScale is a valid number
    if (isNaN(validScale) || validScale <= 0) {
        validScale = 1;
    }

    // Ensure rotation comes from rotation_deg
    const validRotation = typeof rotation_deg === 'number' && !isNaN(rotation_deg) ? rotation_deg : 0;

    // Log transform parameters for debugging
    console.log(`generateShapeSVG: Layer ${layer.id} transform params:`, {
        x_norm: x_norm,
        y_norm: y_norm,
        scale: validScale,
        rotation_deg: validRotation,
        anchor_x: anchor_x,
        anchor_y: anchor_y,
        flip_horizontal: flip_horizontal,
        flip_vertical: flip_vertical,
        canvasWidth: validCanvasWidth,
        canvasHeight: validCanvasHeight
    });

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
    // Ensure style is a string before calling .replace
    const cleanStyle = styleString.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanShapeStyle = shapeStyle.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

    // Check if shape has a src (local SVG asset)
    if (shape.meta && typeof shape.meta === 'object' && shape.meta.src) {
        try {
            console.log(`generateShapeSVG: Fetching SVG from ${shape.meta.src}`);
            // Try to fetch the SVG content
            const svgContent = await fetchSVGContent(shape.meta.src);
            if (svgContent && svgContent.trim().length > 0) {
                console.log(`generateShapeSVG: Fetched SVG content (${svgContent.length} chars), first 200 chars: ${svgContent.substring(0, 200)}`);

                // Extract SVG viewBox and dimensions BEFORE sanitization
                let svgViewBox = null;
                let svgWidth = null;
                let svgHeight = null;

                // Try to extract viewBox from the original SVG
                const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
                if (viewBoxMatch) {
                    const viewBoxParts = viewBoxMatch[1].split(/\s+/);
                    if (viewBoxParts.length >= 4) {
                        svgViewBox = {
                            x: parseFloat(viewBoxParts[0]) || 0,
                            y: parseFloat(viewBoxParts[1]) || 0,
                            width: parseFloat(viewBoxParts[2]) || 0,
                            height: parseFloat(viewBoxParts[3]) || 0
                        };
                        console.log(`generateShapeSVG: Extracted viewBox: ${viewBoxMatch[1]}`);
                    }
                }

                // Try to extract width/height from SVG attributes
                const widthMatch = svgContent.match(/width=["']([^"']+)["']/i);
                const heightMatch = svgContent.match(/height=["']([^"']+)["']/i);
                if (widthMatch) {
                    const widthValue = parseFloat(widthMatch[1]);
                    if (!isNaN(widthValue)) svgWidth = widthValue;
                }
                if (heightMatch) {
                    const heightValue = parseFloat(heightMatch[1]);
                    if (!isNaN(heightValue)) svgHeight = heightValue;
                }

                // Use viewBox dimensions if available, otherwise use width/height
                const baseSvgWidth = svgViewBox ? svgViewBox.width : (svgWidth || 100);
                const baseSvgHeight = svgViewBox ? svgViewBox.height : (svgHeight || 100);

                console.log(`generateShapeSVG: SVG base dimensions: ${baseSvgWidth}x${baseSvgHeight}`);

                // CRITICAL: Sanitize embedded SVG to remove XML declarations, comments, and <svg> wrapper
                let processedSvg = sanitizeEmbeddedSVG(svgContent);

                // Verify sanitization worked
                if (processedSvg.includes('<?xml') || processedSvg.includes('<?XML')) {
                    console.error('generateShapeSVG: ERROR - XML declaration still present after sanitization!');
                    // Force remove one more time as emergency fallback
                    processedSvg = processedSvg.replace(/<\?xml[^>]*\?>/gi, '');
                }

                console.log(`generateShapeSVG: Sanitized SVG (${processedSvg.length} chars), first 200 chars: ${processedSvg.substring(0, 200)}`);

                // Verify sanitized SVG has actual content (not just whitespace)
                if (!processedSvg || processedSvg.trim().length === 0) {
                    console.error(`generateShapeSVG: ERROR - Sanitized SVG is empty! Original was ${svgContent.length} chars`);
                    // Fall through to use default shape
                } else {
                    // Get fill and stroke colors from database
                    const dbFillColor = shape.fill_hex ? validateHexColor(shape.fill_hex) : null;
                    const dbFillAlpha = clampAlpha(shape.fill_alpha !== undefined ? shape.fill_alpha : 1);
                    const dbStrokeColor = shape.stroke_hex ? validateHexColor(shape.stroke_hex) : null;
                    const dbStrokeWidth = shape.stroke_width && !isNaN(shape.stroke_width) ? shape.stroke_width : 0;
                    const dbStrokeAlpha = clampAlpha(shape.stroke_alpha !== undefined ? shape.stroke_alpha : 1);

                    console.log(`generateShapeSVG: Applying colors - fill: ${dbFillColor || 'none'}, stroke: ${dbStrokeColor || 'none'}, stroke-width: ${dbStrokeWidth}`);

                    // Step 1: Aggressively replace fill/stroke attributes in the SVG content
                    // Replace fill in various formats: fill="...", fill='...', fill=..., fill: ...;
                    if (dbFillColor) {
                        // Replace fill="..." (double quotes)
                        processedSvg = processedSvg.replace(/fill="[^"]*"/gi, `fill="${dbFillColor}"`);
                        // Replace fill='...' (single quotes)
                        processedSvg = processedSvg.replace(/fill='[^']*'/gi, `fill="${dbFillColor}"`);
                        // Replace fill=... (no quotes)
                        processedSvg = processedSvg.replace(/fill=([^\s>]+)/gi, `fill="${dbFillColor}"`);
                        // Replace fill: ...; in style attributes
                        processedSvg = processedSvg.replace(/fill:\s*[^;]+/gi, `fill: ${dbFillColor}`);
                        // Replace currentColor with the fill color
                        processedSvg = processedSvg.replace(/currentColor/gi, dbFillColor);
                        // Replace fill="none" only if we want to force a color (but preserve "none" if it's intentional)
                        // Actually, let's not replace "none" as it might be intentional for holes
                    }

                    if (dbStrokeColor && dbStrokeWidth > 0) {
                        // Replace stroke="..." (double quotes)
                        processedSvg = processedSvg.replace(/stroke="[^"]*"/gi, `stroke="${dbStrokeColor}"`);
                        // Replace stroke='...' (single quotes)
                        processedSvg = processedSvg.replace(/stroke='[^']*'/gi, `stroke="${dbStrokeColor}"`);
                        // Replace stroke=... (no quotes)
                        processedSvg = processedSvg.replace(/stroke=([^\s>]+)/gi, `stroke="${dbStrokeColor}"`);
                        // Replace stroke: ...; in style attributes
                        processedSvg = processedSvg.replace(/stroke:\s*[^;]+/gi, `stroke: ${dbStrokeColor}`);
                        // Replace stroke-width if it exists
                        processedSvg = processedSvg.replace(/stroke-width="[^"]*"/gi, `stroke-width="${dbStrokeWidth}"`);
                        processedSvg = processedSvg.replace(/stroke-width='[^']*'/gi, `stroke-width="${dbStrokeWidth}"`);
                        processedSvg = processedSvg.replace(/stroke-width:\s*[^;]+/gi, `stroke-width: ${dbStrokeWidth}`);
                    } else if (dbStrokeWidth === 0) {
                        // If stroke width is 0, remove stroke attributes
                        processedSvg = processedSvg.replace(/stroke="[^"]*"/gi, 'stroke="none"');
                        processedSvg = processedSvg.replace(/stroke='[^']*'/gi, 'stroke="none"');
                        processedSvg = processedSvg.replace(/stroke:\s*[^;]+/gi, 'stroke: none');
                    }

                    // Ensure processed SVG doesn't have any remaining problematic content
                    if (processedSvg.includes('<?xml') || processedSvg.includes('<?XML')) {
                        console.error('generateShapeSVG: ERROR - XML declaration still in processed SVG!');
                        processedSvg = processedSvg.replace(/<\?xml[^>]*\?>/gi, '');
                    }

                    // Step 2: Build inner group style with fill/stroke as fallback
                    // This ensures that even if some paths don't have explicit fill/stroke, they inherit from the group
                    let innerGroupStyle = '';
                    if (dbFillColor) {
                        innerGroupStyle += `fill: ${dbFillColor}; fill-opacity: ${dbFillAlpha};`;
                    } else {
                        innerGroupStyle += 'fill: none;';
                    }
                    if (dbStrokeColor && dbStrokeWidth > 0) {
                        innerGroupStyle += `stroke: ${dbStrokeColor}; stroke-width: ${dbStrokeWidth}; stroke-opacity: ${dbStrokeAlpha};`;
                    } else {
                        innerGroupStyle += 'stroke: none; stroke-width: 0;';
                    }
                    innerGroupStyle = innerGroupStyle.trim();

                    // Step 3: Calculate proper scale and dimensions for unified transform
                    // The normalized scale (e.g., 0.2544) needs to be converted to actual pixel scale
                    // The editor likely scales based on canvas size, so we need to calculate the target size
                    // Target size = normalized_scale * canvas_size (or some base size)
                    // Then scale factor = target_size / base_svg_size

                    // Calculate target size based on normalized scale and canvas dimensions
                    const canvasRefSize = Math.max(validCanvasWidth, validCanvasHeight);
                    const targetSize = validScale * canvasRefSize;

                    // Calculate actual SVG scale factor
                    // The scale factor tells us how much to scale the base SVG to reach target size
                    const svgScaleFactor = baseSvgWidth > 0 ? targetSize / baseSvgWidth : 1;
                    const svgScaleFactorY = baseSvgHeight > 0 ? targetSize / baseSvgHeight : 1;

                    // Calculate scaled dimensions for anchor calculation
                    const scaledWidth = baseSvgWidth * svgScaleFactor;
                    const scaledHeight = baseSvgHeight * svgScaleFactorY;

                    console.log(`generateShapeSVG: Scale calculation:`, {
                        normalizedScale: validScale,
                        canvasWidth: validCanvasWidth,
                        canvasHeight: validCanvasHeight,
                        canvasRefSize: canvasRefSize,
                        targetSize: targetSize,
                        baseSvgWidth: baseSvgWidth,
                        baseSvgHeight: baseSvgHeight,
                        svgScaleFactor: svgScaleFactor,
                        svgScaleFactorY: svgScaleFactorY,
                        scaledWidth: scaledWidth,
                        scaledHeight: scaledHeight
                    });

                    // Build unified transform with shape dimensions
                    // The svgScaleFactor is the actual scale multiplier needed to scale the base SVG to target size
                    // We need to apply this scale in the transform, combined with flips
                    // The scale in buildUnifiedTransform is a multiplier, so we use svgScaleFactor directly
                    // Apply flips by negating the scale factor
                    const scaleX = flip_horizontal ? -svgScaleFactor : svgScaleFactor;
                    const scaleY = flip_vertical ? -svgScaleFactorY : svgScaleFactorY;

                    // Build transform manually to apply the correct scale factor
                    // Order: translate → rotate → scale (with flips)
                    const canvasX = (x_norm || 0) * validCanvasWidth;
                    const canvasY = (y_norm || 0) * validCanvasHeight;
                    const anchorOffsetX = (anchor_x || 0) * scaledWidth;
                    const anchorOffsetY = (anchor_y || 0) * scaledHeight;
                    const finalX = canvasX - anchorOffsetX;
                    const finalY = canvasY - anchorOffsetY;

                    let transform = `translate(${finalX}, ${finalY})`;
                    if (validRotation !== 0) {
                        transform += ` rotate(${validRotation})`;
                    }
                    // Always apply scale (even if 1) to ensure consistent behavior
                    transform += ` scale(${scaleX}, ${scaleY})`;
                    const unifiedTransform = transform.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

                    console.log(`generateShapeSVG: Final unified transform: "${unifiedTransform}"`);

                    // Step 4: Wrap processed SVG in inner group with fill/stroke styles, then wrap in transform group
                    // Center the SVG at origin before applying transform (like images do)
                    // Structure: <g transform="[unified transform]" style="opacity: ..."> <g style="fill: ...; stroke: ...; transform: translate(-w/2, -h/2)"> <inner SVG paths> </g> </g>
                    const centerTransform = `translate(${-baseSvgWidth / 2}, ${-baseSvgHeight / 2})`;
                    const innerGroupWithCenter = innerGroupStyle ?
                        `<g style="${innerGroupStyle}" transform="${centerTransform}">${processedSvg}</g>` :
                        `<g transform="${centerTransform}">${processedSvg}</g>`;
                    const finalSvg = `<g transform="${unifiedTransform}" style="${cleanStyle}">${innerGroupWithCenter}</g>`;

                    console.log(`generateShapeSVG: Final SVG element (${finalSvg.length} chars)`);
                    console.log(`generateShapeSVG: Final SVG snippet (first 500 chars): ${finalSvg.substring(0, 500)}`);
                    console.log(`generateShapeSVG: Transform in final SVG: "${unifiedTransform}"`);
                    console.log(`generateShapeSVG: Inner group style: "${innerGroupStyle}"`);
                    console.log(`generateShapeSVG: Processed SVG content length: ${processedSvg.length} chars`);
                    console.log(`generateShapeSVG: Processed SVG snippet (first 300 chars): ${processedSvg.substring(0, 300)}`);
                    console.log(`generateShapeSVG: Processed SVG snippet (last 200 chars): ${processedSvg.substring(Math.max(0, processedSvg.length - 200))}`);
                    return finalSvg;
                }
            } else {
                console.warn(`generateShapeSVG: Fetched SVG content is empty for ${shape.meta.src}`);
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

    // Default shape dimensions for anchor calculation (100x100 base size)
    let baseShapeWidth = 100;
    let baseShapeHeight = 100;

    switch (shape.shape_kind) {
        case 'rect':
            // All attributes on one line to avoid parsing errors
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" rx="${validRx}" ry="${validRy}" style="${combinedStyle}"/>`;
            baseShapeWidth = 100;
            baseShapeHeight = 100;
            break;
        case 'circle':
            shapeElement = `<circle cx="0" cy="0" r="50" style="${combinedStyle}"/>`;
            baseShapeWidth = 100;
            baseShapeHeight = 100;
            break;
        case 'ellipse':
            shapeElement = `<ellipse cx="0" cy="0" rx="50" ry="50" style="${combinedStyle}"/>`;
            baseShapeWidth = 100;
            baseShapeHeight = 100;
            break;
        case 'path':
            if (shape.svg_path && shape.svg_path.trim().length > 0) {
                // Escape path data
                const escapedPath = shape.svg_path.replace(/"/g, '&quot;');
                shapeElement = `<path d="${escapedPath}" style="${combinedStyle}"/>`;
                // For paths, we can't easily determine dimensions, use default
                baseShapeWidth = 100;
                baseShapeHeight = 100;
            } else {
                // Default to rect if path is invalid
                shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
                baseShapeWidth = 100;
                baseShapeHeight = 100;
            }
            break;
        default:
            // Default to rect for any unknown shape type
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
            baseShapeWidth = 100;
            baseShapeHeight = 100;
    }

    // Ensure shapeElement is not empty
    if (!shapeElement || shapeElement.trim().length === 0) {
        shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${combinedStyle}"/>`;
        baseShapeWidth = 100;
        baseShapeHeight = 100;
    }

    // Calculate scaled dimensions for anchor calculation
    const canvasRefSize = Math.max(validCanvasWidth, validCanvasHeight);
    const targetSize = validScale * canvasRefSize;
    const scaledWidth = baseShapeWidth * (targetSize / baseShapeWidth);
    const scaledHeight = baseShapeHeight * (targetSize / baseShapeHeight);

    // Build unified transform for fallback shapes
    const fallbackTransform = buildUnifiedTransform({
        x_norm: x_norm,
        y_norm: y_norm,
        scale: validScale,
        rotation_deg: validRotation,
        flip_horizontal: flip_horizontal,
        flip_vertical: flip_vertical,
        anchor_x: anchor_x,
        anchor_y: anchor_y,
        elementWidth: scaledWidth,
        elementHeight: scaledHeight,
        canvasWidth: validCanvasWidth,
        canvasHeight: validCanvasHeight
    });

    return `<g transform="${fallbackTransform}" style="${cleanStyle}">${shapeElement}</g>`;
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

        // CRITICAL: Sanitize embedded SVG to remove XML declarations, comments, and <svg> wrapper
        svgContent = sanitizeEmbeddedSVG(svgContent);

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

async function generateImageSVG(layer, transformParams, style, defs, canvasWidth, canvasHeight) {
    const { image } = layer;
    if (!image) {
        console.warn('generateImageSVG: No image object in layer');
        return '';
    }

    // CRITICAL: Ensure style is always a string before any operations
    // Build a pure CSS string from layer properties
    const opacity = layer.opacity !== undefined ? layer.opacity : 1;
    const imageStyle = typeof style === 'string' ? style : `opacity: ${opacity};`;
    // Ensure it's a string - if style was an object/array, we've replaced it with opacity string
    const styleString = typeof imageStyle === 'string' ? imageStyle : (imageStyle ? String(imageStyle) : `opacity: ${opacity};`);

    // Extract and validate transform parameters from transformParams
    const x_norm = typeof transformParams.x_norm === 'number' ? transformParams.x_norm : (layer.x_norm || 0);
    const y_norm = typeof transformParams.y_norm === 'number' ? transformParams.y_norm : (layer.y_norm || 0);
    const scale = Array.isArray(transformParams.scale) ? transformParams.scale[0] : (typeof transformParams.scale === 'number' ? transformParams.scale : (layer.scale || 1));
    const rotation_deg = typeof transformParams.rotation_deg === 'number' ? transformParams.rotation_deg : (layer.rotation_deg || 0);
    const anchor_x = typeof transformParams.anchor_x === 'number' ? transformParams.anchor_x : (layer.anchor_x !== undefined ? layer.anchor_x : 0);
    const anchor_y = typeof transformParams.anchor_y === 'number' ? transformParams.anchor_y : (layer.anchor_y !== undefined ? layer.anchor_y : 0);
    const flip_horizontal = transformParams.flip_horizontal !== undefined ? transformParams.flip_horizontal : (layer.flip_horizontal || false);
    const flip_vertical = transformParams.flip_vertical !== undefined ? transformParams.flip_vertical : (layer.flip_vertical || false);

    // Ensure canvas dimensions are valid
    const validCanvasWidth = typeof canvasWidth === 'number' && !isNaN(canvasWidth) && canvasWidth > 0 ? canvasWidth : 1000;
    const validCanvasHeight = typeof canvasHeight === 'number' && !isNaN(canvasHeight) && canvasHeight > 0 ? canvasHeight : 1000;

    // Ensure scale is a single number, not an array
    // Handle string values from database by parsing them
    let validScale = 1;
    if (Array.isArray(scale)) {
        validScale = scale.length > 0 ? parseFloat(scale[0]) : 1;
    } else if (typeof scale === 'number' && !isNaN(scale)) {
        validScale = scale;
    } else if (typeof scale === 'string' && scale.trim() !== '') {
        validScale = parseFloat(scale);
    }
    // Ensure validScale is a valid number
    if (isNaN(validScale) || validScale <= 0) {
        validScale = 1;
    }

    // Ensure rotation comes from rotation_deg
    const validRotation = typeof rotation_deg === 'number' && !isNaN(rotation_deg) ? rotation_deg : 0;

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

    // Calculate base dimensions from asset metadata
    let baseWidth, baseHeight;
    const baseSize = 300; // Default base size

    if (image.asset && image.asset.width && image.asset.height) {
        baseWidth = image.asset.width;
        baseHeight = image.asset.height;
        console.log(`generateImageSVG: Using actual asset dimensions: ${baseWidth}x${baseHeight}`);
    } else {
        baseWidth = baseSize;
        baseHeight = baseSize;
        console.log(`generateImageSVG: Using default dimensions: ${baseSize}x${baseSize}`);
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

    // Calculate scaled dimensions based on normalized scale and canvas size
    // Similar to SHAPE layer: target size = normalized_scale * canvas_ref_size
    const canvasRefSize = Math.max(validCanvasWidth, validCanvasHeight);
    const targetSize = validScale * canvasRefSize;

    // Calculate scale factors while maintaining aspect ratio
    const aspectRatio = baseWidth / baseHeight;
    let scaledWidth, scaledHeight;

    // Scale based on the larger dimension to maintain aspect ratio
    if (baseWidth >= baseHeight) {
        scaledWidth = targetSize;
        scaledHeight = targetSize / aspectRatio;
    } else {
        scaledHeight = targetSize;
        scaledWidth = targetSize * aspectRatio;
    }

    console.log(`generateImageSVG: Scale calculation:`, {
        normalizedScale: validScale,
        canvasRefSize: canvasRefSize,
        targetSize: targetSize,
        baseWidth: baseWidth,
        baseHeight: baseHeight,
        aspectRatio: aspectRatio,
        scaledWidth: scaledWidth,
        scaledHeight: scaledHeight
    });

    // Build unified transform with image dimensions
    // Scale is already applied via scaledWidth/scaledHeight in the <image> tag
    // So we use scale=1 in transform to avoid double-scaling
    // The scaledWidth/scaledHeight are used for both image size and anchor calculation
    const unifiedTransform = buildUnifiedTransform({
        x_norm: x_norm,
        y_norm: y_norm,
        scale: 1, // Scale already applied via width/height attributes
        rotation_deg: validRotation,
        flip_horizontal: flip_horizontal,
        flip_vertical: flip_vertical,
        anchor_x: anchor_x,
        anchor_y: anchor_y,
        elementWidth: scaledWidth,
        elementHeight: scaledHeight,
        canvasWidth: validCanvasWidth,
        canvasHeight: validCanvasHeight
    });

    console.log(`generateImageSVG: Unified transform: "${unifiedTransform}"`);

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

        // Clean style string (now guaranteed to be a string)
        const cleanStyle = styleString.replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();

        // Clean transform
        const cleanTransform = unifiedTransform.replace(/\s+/g, ' ').trim();

        // Use scaled dimensions (scale is applied via unified transform, but we also need to set the image size)
        // The unified transform handles position, rotation, flip, and scale
        // We set the image dimensions to the scaled size, and center it at origin
        const imageWidth = scaledWidth;
        const imageHeight = scaledHeight;

        console.log(`generateImageSVG: Image layer final: ${imageWidth}x${imageHeight} (scaled), position: (${x_norm}, ${y_norm}), scale: ${validScale}, rotation: ${validRotation}, anchor: (${anchor_x}, ${anchor_y}), URL length: ${cleanImageUrl.length}`);

        // Wrap image in a group with unified transform
        // Position image centered at origin, then group transform will move/scale/rotate it
        // Use both href (SVG 2) and xlink:href (SVG 1.1) for maximum compatibility
        const imageElement = `<g transform="${cleanTransform}" style="${cleanStyle}"><image href="${cleanImageUrl}" xlink:href="${cleanImageUrl}" x="${-imageWidth / 2}" y="${-imageHeight / 2}" width="${imageWidth}" height="${imageHeight}"/></g>`;
        console.log(`generateImageSVG: Generated image SVG element (first 200 chars): ${imageElement.substring(0, 200)}`);
        return imageElement;
    } else {
        console.warn(`Invalid image URL (length: ${cleanImageUrl ? cleanImageUrl.length : 0}): ${cleanImageUrl ? cleanImageUrl.substring(0, 100) : 'null'}...`);
        return '';
    }
}

// Helper function to sanitize embedded SVG content
// Removes XML declarations, comments, and extracts only the inner SVG content
// This prevents embedded SVG assets from breaking the parent SVG with invalid XML
function sanitizeEmbeddedSVG(svgContent) {
    if (!svgContent || typeof svgContent !== 'string') {
        console.warn('sanitizeEmbeddedSVG: Invalid input');
        return '';
    }

    let cleaned = svgContent.trim();
    const originalLength = cleaned.length;

    // Step 1: Remove ALL XML declarations (<?xml ... ?>) - there should only be one at the top level
    // Use global flag to catch multiple declarations if they exist (this is the main issue)
    const beforeXml = cleaned;
    cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    if (cleaned.length !== beforeXml.length) {
        console.log('sanitizeEmbeddedSVG: Removed XML declaration(s)');
    }

    // Step 2: Remove ALL comments (<!-- ... -->) - comments can appear anywhere
    const beforeComments = cleaned;
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    if (cleaned.length !== beforeComments.length) {
        console.log('sanitizeEmbeddedSVG: Removed comment(s)');
    }

    // Step 3: Extract inner content from <svg>...</svg> tags if present
    // This handles cases where the SVG is wrapped in an <svg> tag
    // Find the first <svg> tag and extract everything between it and the last </svg>
    const svgOpenIndex = cleaned.search(/<svg[^>]*>/i);
    if (svgOpenIndex !== -1) {
        const svgOpenMatch = cleaned.match(/<svg[^>]*>/i);
        const openTag = svgOpenMatch[0];
        const afterOpenTag = cleaned.substring(svgOpenIndex + openTag.length);

        // Find the last </svg> tag (in case there are nested SVGs, we want the outermost closing tag)
        const lastCloseIndex = afterOpenTag.lastIndexOf('</svg>');
        if (lastCloseIndex !== -1) {
            // Extract content between opening and closing tags
            cleaned = afterOpenTag.substring(0, lastCloseIndex).trim();
            console.log('sanitizeEmbeddedSVG: Extracted inner content from <svg> wrapper');
        } else {
            // No closing tag found, just take everything after the opening tag
            cleaned = afterOpenTag.trim();
            console.log('sanitizeEmbeddedSVG: Extracted content after <svg> tag (no closing tag found)');
        }
    }

    // Step 4: Remove any remaining XML declarations that might have been inside the SVG content
    // (This is critical - embedded SVGs might have their own XML declarations)
    const beforeFinalXml = cleaned;
    cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    if (cleaned.length !== beforeFinalXml.length) {
        console.log('sanitizeEmbeddedSVG: Removed additional XML declaration(s) from inner content');
    }

    // Step 5: Remove any remaining comments
    const beforeFinalComments = cleaned;
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    if (cleaned.length !== beforeFinalComments.length) {
        console.log('sanitizeEmbeddedSVG: Removed additional comment(s) from inner content');
    }

    // Step 6: Verify no XML declarations remain (critical check)
    if (cleaned.includes('<?xml') || cleaned.includes('<?XML')) {
        console.error('sanitizeEmbeddedSVG: WARNING - XML declaration still present after sanitization!');
        // Force remove one more time
        cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    }

    // Step 7: Clean up any remaining whitespace issues
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    console.log(`sanitizeEmbeddedSVG: Sanitized ${originalLength} chars to ${cleaned.length} chars`);

    return cleaned;
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

/**
 * Builds a safe CSS font-family string for use inside SVG style attributes
 * 
 * Rules:
 * - Font names with spaces or special chars are wrapped in single quotes (not double)
 * - Single quotes are used because the style attribute itself is double-quoted
 * - Commas are followed by spaces
 * - Generic families (sans-serif, serif, monospace) are never quoted
 * - Ensures no invalid XML characters that would break SVG parsing
 * 
 * @param {string|string[]} fonts - Font name(s) or array of font names
 * @param {string[]} fallbacks - Optional array of fallback fonts
 * @returns {string} Safe CSS font-family string
 * 
 * @example
 * buildFontFamilyString('Noto Naskh Arabic', ['Arial Unicode MS', 'Tahoma', 'sans-serif'])
 * // Returns: 'Noto Naskh Arabic', 'Arial Unicode MS', Tahoma, sans-serif
 */
function buildFontFamilyString(fonts, fallbacks = []) {
    const genericFamilies = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

    // Normalize input to array
    const fontArray = Array.isArray(fonts) ? fonts : [fonts];

    // Combine fonts and fallbacks, filter out invalid entries
    const allFonts = [...fontArray, ...fallbacks]
        .filter(f => f && typeof f === 'string' && f.trim().length > 0)
        .map(f => f.trim());

    if (allFonts.length === 0) {
        return 'sans-serif';
    }

    // Process each font name
    const processedFonts = allFonts.map(font => {
        // Remove any existing quotes to avoid double-quoting
        let trimmed = font.replace(/^["']|["']$/g, '').trim();

        // Remove any characters that could break XML/SVG parsing
        // Keep alphanumeric, spaces, hyphens, and common punctuation
        trimmed = trimmed.replace(/[<>]/g, ''); // Remove XML-breaking chars

        if (trimmed.length === 0) {
            return null; // Skip empty fonts after cleaning
        }

        // Generic families are never quoted
        if (genericFamilies.includes(trimmed.toLowerCase())) {
            return trimmed;
        }

        // Font names with spaces, commas, parentheses, or quotes need single quotes
        // Single quotes because they'll be inside a double-quoted style attribute
        if (/[\s,()]/.test(trimmed) || trimmed.includes("'") || trimmed.includes('"')) {
            // Escape single quotes by doubling them (CSS escaping: ' becomes '')
            const escaped = trimmed.replace(/'/g, "''");
            return `'${escaped}'`;
        }

        // Simple font names without spaces don't need quotes
        return trimmed;
    }).filter(f => f !== null); // Remove any null entries

    if (processedFonts.length === 0) {
        return 'sans-serif'; // Fallback if all fonts were invalid
    }

    // Join with comma-space and ensure no double spaces
    const result = processedFonts.join(', ').replace(/\s+/g, ' ').trim();

    // Final validation: ensure no double quotes (which would break XML)
    if (result.includes('"')) {
        console.warn('buildFontFamilyString: Warning - double quotes detected in result, replacing with single quotes');
        return result.replace(/"/g, "'");
    }

    return result;
}

/**
 * Validates that a font-family string is safe for use in SVG style attributes
 * Checks for common issues that would break XML/SVG parsing
 * 
 * @param {string} fontFamilyString - The font-family CSS string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateFontFamilyString(fontFamilyString) {
    if (!fontFamilyString || typeof fontFamilyString !== 'string') {
        return false;
    }

    // Check for double quotes (should use single quotes inside double-quoted style)
    if (fontFamilyString.includes('"')) {
        console.warn('validateFontFamilyString: Double quotes found in font-family string');
        return false;
    }

    // Check for unclosed quotes
    const singleQuotes = (fontFamilyString.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
        console.warn('validateFontFamilyString: Unclosed single quotes in font-family string');
        return false;
    }

    // Check for XML-breaking characters
    if (/[<>]/.test(fontFamilyString)) {
        console.warn('validateFontFamilyString: XML-breaking characters found');
        return false;
    }

    return true;
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
// Also handles very long data URLs and other potential parsing issues
function cleanSVGAttributes(svg) {
    if (!svg || typeof svg !== 'string') return svg;

    // Preserve XML declaration and opening <svg> tag structure
    let xmlDeclaration = '';
    let svgStartTag = '';
    let svgContent = '';
    let svgEndTag = '';

    // Extract XML declaration if present
    const xmlMatch = svg.match(/^<\?xml[^>]*\?>\s*/);
    if (xmlMatch) {
        xmlDeclaration = xmlMatch[0];
        svg = svg.substring(xmlMatch[0].length);
    }

    // Extract opening <svg> tag (may span multiple lines)
    // First try single-line match
    let svgTagMatch = svg.match(/^<svg[^>]*>/);
    if (!svgTagMatch) {
        // Try multi-line match (tag might have newlines in attributes)
        svgTagMatch = svg.match(/^<svg[\s\S]*?>/);
    }
    if (svgTagMatch) {
        svgStartTag = svgTagMatch[0];
        svg = svg.substring(svgTagMatch[0].length);
    }

    // Extract closing </svg> tag if present
    const svgEndMatch = svg.match(/<\/svg>\s*$/);
    if (svgEndMatch) {
        svgEndTag = svgEndMatch[0];
        svgContent = svg.substring(0, svg.length - svgEndMatch[0].length);
    } else {
        svgContent = svg;
    }

    // If we couldn't extract the structure, process the whole thing (fallback)
    if (!svgStartTag) {
        console.warn('cleanSVGAttributes: Could not extract <svg> tag, processing entire string');
        svgContent = svg;
        svgStartTag = '';
        svgEndTag = '';
    }

    let cleaned = svgContent;

    // Step 0: Fix potential issues with very long data URLs that might cause parsing errors
    // If a data URL is extremely long (>500KB), it might cause issues - log a warning
    const dataUrlPattern = /data:image\/[^;]+;base64,([A-Za-z0-9+\/=]+)/g;
    let match;
    while ((match = dataUrlPattern.exec(cleaned)) !== null) {
        const dataUrl = match[0];
        if (dataUrl.length > 500000) { // 500KB limit
            console.warn(`Very large data URL detected (${dataUrl.length} chars) at position ${match.index}. This may cause parsing issues.`);
        }
    }

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

    // Step 5: Fix nested quotes in style attributes
    // NOTE: New code uses buildFontFamilyString() which generates correct single quotes
    // This step is kept for backward compatibility with legacy SVGs or edge cases
    cleaned = cleaned.replace(/style="([^"]*?)"/g, (match, content) => {
        let fixed = content;

        // Fix double quotes inside font-family (legacy issue)
        // Pattern: font-family: "Font Name" -> font-family: 'Font Name'
        fixed = fixed.replace(/font-family:\s*"([^"]+)"\s*,/g, "font-family: '$1',");

        // Ensure single quotes are properly escaped if they appear in font names
        // CSS escaping: single quote in single-quoted string is doubled ('')
        // But we don't want to break valid CSS, so only fix obvious issues

        // Remove any newlines
        fixed = fixed.replace(/[\r\n]+/g, ' ');
        // Clean up multiple spaces but preserve single spaces
        fixed = fixed.replace(/\s+/g, ' ').trim();
        // Ensure semicolons are followed by spaces (if not already)
        fixed = fixed.replace(/;([^\s])/g, '; $1');

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

    // Safety check: Verify that text elements are preserved
    // Count <text> elements before and after (rough check)
    const textElementsBefore = (svgContent.match(/<text[^>]*>/gi) || []).length;
    const textElementsAfter = (cleaned.match(/<text[^>]*>/gi) || []).length;
    if (textElementsBefore > 0 && textElementsAfter !== textElementsBefore) {
        console.warn(`cleanSVGAttributes: Text element count changed! Before: ${textElementsBefore}, After: ${textElementsAfter}`);
    }

    // Reconstruct the SVG with preserved structure
    if (svgStartTag) {
        // Clean the opening <svg> tag attributes (remove newlines from attributes)
        const cleanedSvgTag = svgStartTag.replace(/(\w+)="([^"]*?)[\r\n]+([^"]*?)"/g, '$1="$2 $3"');
        // Also clean any newlines in the tag itself
        const cleanedSvgTagFinal = cleanedSvgTag.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
        const finalSvg = xmlDeclaration + cleanedSvgTagFinal + cleaned + svgEndTag;

        // Final verification: ensure text elements are still present
        const finalTextCount = (finalSvg.match(/<text[^>]*>/gi) || []).length;
        if (textElementsBefore > 0 && finalTextCount !== textElementsBefore) {
            console.error(`cleanSVGAttributes: CRITICAL - Text elements lost! Before: ${textElementsBefore}, Final: ${finalTextCount}`);
        }

        return finalSvg;
    } else {
        // Fallback: return cleaned content as-is (shouldn't happen if SVG is well-formed)
        console.warn('cleanSVGAttributes: Returning without <svg> tag structure');
        return xmlDeclaration + cleaned + svgEndTag;
    }
}

module.exports = router;