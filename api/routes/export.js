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
      LEFT JOIN assets ai ON (ai.id = li.asset_id OR ai.id = lim.asset_id)
      LEFT JOIN assets ai_bg ON ai_bg.id = lb.asset_id
      LEFT JOIN fonts f ON f.id = lt.font_id
      WHERE lay.logo_id = $1
      ORDER BY lay.z_index ASC, lay.created_at ASC
    `, [id]);

        // Process layers
        const layers = layersRes.rows.map(row => {
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
                            content: row.content,
                            font_size: row.font_size,
                            fill_hex: row.fill_hex,
                            fill_alpha: row.fill_alpha,
                            stroke_hex: row.stroke_hex,
                            stroke_alpha: row.stroke_alpha,
                            stroke_width: row.stroke_width,
                            align: row.align,
                            baseline: row.baseline,
                            font_family: row.font_family || 'Arial',
                            font_weight: row.font_weight,
                            font_style: row.font_style,
                            letter_spacing: row.letter_spacing,
                            text_decoration: row.text_decoration,
                            text_transform: row.text_transform,
                            text_case: row.text_case
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
                    return {
                        ...baseLayer,
                        image: {
                            asset_id: row.image_asset_id,
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
        const svg = await generateSVGFromLogo(logo, layers, canvasWidth, canvasHeight);

        // Convert SVG to PNG using @resvg/resvg-js
        const resvg = new Resvg(svg, {
            background: logo.canvas_background_type === 'transparent' || logo.export_transparent_background ?
                'rgba(0,0,0,0)' : logo.canvas_background_solid_color || '#ffffff',
            fitTo: {
                mode: 'width',
                value: canvasWidth
            },
            dpi: parseInt(dpi)
        });

        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

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

        // Set response headers
        res.setHeader('Content-Type', format === 'png' ? 'image/png' : 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="logo-${id}.${format}"`);
        res.setHeader('Content-Length', finalBuffer.length);

        // Send the image
        res.send(finalBuffer);
    } catch (error) {
        console.error('Error exporting logo:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export logo',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const sortedLayers = layers
        .filter(layer => layer.is_visible !== false)
        .sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

    // Process each layer
    for (const layer of sortedLayers) {
        const x = (layer.x_norm || 0) * width;
        const y = (layer.y_norm || 0) * height;
        const scale = layer.scale || 1;
        const rotation = layer.rotation_deg || 0;
        const opacity = layer.opacity !== undefined ? layer.opacity : 1;
        const flipH = layer.flip_horizontal;
        const flipV = layer.flip_vertical;

        // Build transform string with flip support
        // Order matters: translate -> rotate -> scale (including flip) -> final scale
        let transform = `translate(${x}, ${y})`;
        if (rotation !== 0) {
            transform += ` rotate(${rotation})`;
        }
        // Apply flip as part of scale transformation
        const scaleX = (flipH ? -1 : 1) * scale;
        const scaleY = (flipV ? -1 : 1) * scale;
        if (scaleX !== 1 || scaleY !== 1) {
            transform += ` scale(${scaleX}, ${scaleY})`;
        }

        // Build style string
        let style = `opacity: ${opacity};`;
        if (layer.common_style) {
            const shadow = layer.common_style.shadow;
            const shadowColor = hexToRgba(shadow.hex || '#000000', shadow.alpha || 0.5);
            style += `filter: drop-shadow(${shadow.dx || 0}px ${shadow.dy || 0}px ${shadow.blur || 0}px ${shadowColor});`;
        }

        switch (layer.type) {
            case 'BACKGROUND':
                svgContent += await generateBackgroundSVG(layer, width, height, style, defs);
                break;
            case 'TEXT':
                svgContent += generateTextSVG(layer, x, y, scale, rotation, style, defs);
                break;
            case 'SHAPE':
                svgContent += await generateShapeSVG(layer, x, y, scale, rotation, style, defs);
                break;
            case 'ICON':
                svgContent += await generateIconSVG(layer, x, y, scale, rotation, style, defs);
                break;
            case 'IMAGE':
                svgContent += await generateImageSVG(layer, x, y, scale, rotation, style, defs);
                break;
        }
    }

    // Build background
    let backgroundRect = '';
    if (logo.canvas_background_type === 'solid' && logo.canvas_background_solid_color) {
        backgroundRect = `<rect width="${width}" height="${height}" fill="${logo.canvas_background_solid_color}"/>`;
    } else if (logo.canvas_background_type === 'gradient' && logo.canvas_background_gradient) {
        const gradientId = 'bg-gradient';
        const gradient = typeof logo.canvas_background_gradient === 'string' ?
            JSON.parse(logo.canvas_background_gradient) :
            logo.canvas_background_gradient;

        let gradientDef = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`;
        if (gradient.stops && Array.isArray(gradient.stops)) {
            for (const stop of gradient.stops) {
                gradientDef += `<stop offset="${(stop.offset || 0) * 100}%" stop-color="${stop.hex || '#000000'}" stop-opacity="${stop.alpha || 1}"/>`;
            }
        }
        gradientDef += `</linearGradient></defs>`;
        defs.push(gradientDef);
        backgroundRect = `<rect width="${width}" height="${height}" fill="url(#${gradientId})"/>`;
    } else if (logo.export_transparent_background) {
        // Transparent background - no rect needed
    } else {
        backgroundRect = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${defs.join('\n  ')}
  ${backgroundRect}
  ${svgContent}
</svg>`;
}

async function generateBackgroundSVG(layer, width, height, style, defs) {
    const { background } = layer;

    if (background.mode === 'solid' && background.fill_hex) {
        return `<rect width="${width}" height="${height}" fill="${background.fill_hex}" fill-opacity="${background.fill_alpha || 1}" style="${style}"/>`;
    } else if (background.mode === 'gradient' && background.gradient) {
        const gradientId = `gradient-bg-${layer.id}`;
        const gradient = typeof background.gradient === 'string' ? JSON.parse(background.gradient) : background.gradient;

        let gradientDef = `<defs><linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">`;
        if (gradient.stops && Array.isArray(gradient.stops)) {
            for (const stop of gradient.stops) {
                gradientDef += `<stop offset="${(stop.offset || 0) * 100}%" stop-color="${stop.hex || '#000000'}" stop-opacity="${stop.alpha || 1}"/>`;
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
    if (!text || !text.content) return '';

    const fontSize = (text.font_size || 16) * scale;
    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order
    let transform = `translate(${x}, ${y})`;
    if (rotation !== 0) {
        transform += ` rotate(${rotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * scale;
    const scaleY = (flipV ? -1 : 1) * scale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    let textStyle = `font-size: ${fontSize}px; font-family: "${text.font_family || 'Arial'}", sans-serif;`;
    textStyle += `fill: ${text.fill_hex || '#000000'}; fill-opacity: ${text.fill_alpha !== undefined ? text.fill_alpha : 1};`;

    if (text.font_weight) {
        textStyle += `font-weight: ${text.font_weight};`;
    }
    if (text.font_style) {
        textStyle += `font-style: ${text.font_style};`;
    }
    if (text.letter_spacing !== undefined && text.letter_spacing !== null) {
        textStyle += `letter-spacing: ${text.letter_spacing}px;`;
    }
    if (text.text_decoration === 'underline') {
        textStyle += `text-decoration: underline;`;
    } else if (text.text_decoration === 'line-through') {
        textStyle += `text-decoration: line-through;`;
    }

    if (text.stroke_hex && text.stroke_width) {
        textStyle += `stroke: ${text.stroke_hex}; stroke-width: ${text.stroke_width}; stroke-opacity: ${text.stroke_alpha !== undefined ? text.stroke_alpha : 1};`;
    }

    const textAnchor = text.align === 'left' ? 'start' : text.align === 'right' ? 'end' : 'middle';
    const dominantBaseline = text.baseline || 'alphabetic';

    // Apply text transform
    let textContent = text.content;
    if (text.text_transform === 'uppercase') {
        textContent = textContent.toUpperCase();
    } else if (text.text_transform === 'lowercase') {
        textContent = textContent.toLowerCase();
    } else if (text.text_transform === 'capitalize') {
        textContent = textContent.replace(/\b\w/g, l => l.toUpperCase());
    }

    return `<text x="0" y="0" text-anchor="${textAnchor}" dominant-baseline="${dominantBaseline}" 
          transform="${transform}" style="${textStyle} ${style}">${escapeXml(textContent)}</text>`;
}

async function generateShapeSVG(layer, x, y, scale, rotation, style, defs) {
    const { shape } = layer;
    if (!shape) return '';

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order
    let transform = `translate(${x}, ${y})`;
    if (rotation !== 0) {
        transform += ` rotate(${rotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * scale;
    const scaleY = (flipV ? -1 : 1) * scale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    let shapeElement = '';
    let shapeStyle = `fill: ${shape.fill_hex || 'none'}; fill-opacity: ${shape.fill_alpha !== undefined ? shape.fill_alpha : 1};`;

    if (shape.stroke_hex && shape.stroke_width) {
        shapeStyle += `stroke: ${shape.stroke_hex}; stroke-width: ${shape.stroke_width}; stroke-opacity: ${shape.stroke_alpha !== undefined ? shape.stroke_alpha : 1};`;
    }

    // Check if shape has a src (local SVG asset)
    if (shape.meta && typeof shape.meta === 'object' && shape.meta.src) {
        try {
            // Try to fetch the SVG content
            const svgContent = await fetchSVGContent(shape.meta.src);
            if (svgContent) {
                // Apply color transformation to the SVG
                let processedSvg = svgContent;
                if (shape.fill_hex) {
                    // Replace fill colors in the SVG
                    processedSvg = processedSvg.replace(/fill="[^"]*"/g, `fill="${shape.fill_hex}"`);
                    processedSvg = processedSvg.replace(/fill='[^']*'/g, `fill="${shape.fill_hex}"`);
                    processedSvg = processedSvg.replace(/fill:\s*[^;]+/g, `fill: ${shape.fill_hex}`);
                }
                if (shape.stroke_hex) {
                    processedSvg = processedSvg.replace(/stroke="[^"]*"/g, `stroke="${shape.stroke_hex}"`);
                    processedSvg = processedSvg.replace(/stroke='[^']*'/g, `stroke="${shape.stroke_hex}"`);
                }
                return `<g transform="${transform}" style="${style}">${processedSvg}</g>`;
            }
        } catch (error) {
            console.warn(`Failed to load SVG from ${shape.meta.src}:`, error.message);
        }
    }

    // Fallback to basic shapes
    switch (shape.shape_kind) {
        case 'rect':
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" rx="${shape.rx || 0}" ry="${shape.ry || 0}" 
                        style="${shapeStyle} ${style}"/>`;
            break;
        case 'circle':
            shapeElement = `<circle cx="0" cy="0" r="50" style="${shapeStyle} ${style}"/>`;
            break;
        case 'ellipse':
            shapeElement = `<ellipse cx="0" cy="0" rx="50" ry="50" style="${shapeStyle} ${style}"/>`;
            break;
        case 'path':
            if (shape.svg_path) {
                shapeElement = `<path d="${shape.svg_path}" style="${shapeStyle} ${style}"/>`;
            }
            break;
        default:
            // Default to rect
            shapeElement = `<rect x="-50" y="-50" width="100" height="100" style="${shapeStyle} ${style}"/>`;
    }

    return `<g transform="${transform}">${shapeElement}</g>`;
}

async function generateIconSVG(layer, x, y, scale, rotation, style, defs) {
    const { icon } = layer;
    if (!icon || !icon.asset) return '';

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order
    let transform = `translate(${x}, ${y})`;
    if (rotation !== 0) {
        transform += ` rotate(${rotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * scale;
    const scaleY = (flipV ? -1 : 1) * scale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    const tintColor = icon.tint_hex || '#000000';
    const tintOpacity = icon.tint_alpha !== undefined ? icon.tint_alpha : 1;

    // If it's an SVG asset, use the vector_svg content
    if (icon.asset.vector_svg) {
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
    if (icon.asset.url) {
        return `<image href="${icon.asset.url}" x="-50" y="-50" width="100" height="100" 
            transform="${transform}" style="${style}" opacity="${tintOpacity}"/>`;
    }

    return '';
}

async function generateImageSVG(layer, x, y, scale, rotation, style, defs) {
    const { image } = layer;
    if (!image || !image.asset) return '';

    const flipH = layer.flip_horizontal;
    const flipV = layer.flip_vertical;

    // Build transform with proper order
    let transform = `translate(${x}, ${y})`;
    if (rotation !== 0) {
        transform += ` rotate(${rotation})`;
    }
    const scaleX = (flipH ? -1 : 1) * scale;
    const scaleY = (flipV ? -1 : 1) * scale;
    if (scaleX !== 1 || scaleY !== 1) {
        transform += ` scale(${scaleX}, ${scaleY})`;
    }

    if (image.asset.url) {
        return `<image href="${image.asset.url}" x="-50" y="-50" width="100" height="100" 
            transform="${transform}" style="${style}"/>`;
    }

    return '';
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

module.exports = router;