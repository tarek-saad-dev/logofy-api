# Final Comprehensive Logo JSON with All Working Attributes

This document provides the complete JSON structure with all possible working attributes for posting a logo to the mobile API endpoint.

## API Endpoint
```
POST /api/logo/mobile
```

## Complete JSON Structure with Comments

```json
{
  // ==============================================
  // REQUIRED FIELDS - At least one name must be provided
  // ==============================================
  
  "name": "Complete Logo with All Working Attributes", // REQUIRED: Primary logo name
  "description": "A comprehensive logo demonstrating all possible working attributes", // REQUIRED: Primary description
  
  // ==============================================
  // MULTILINGUAL SUPPORT (ALL OPTIONAL)
  // ==============================================
  
  "name_en": "Complete Logo with All Working Attributes", // OPTIONAL: English name
  "name_ar": "شعار كامل بجميع الخصائص العاملة", // OPTIONAL: Arabic name
  "description_en": "A comprehensive logo demonstrating all possible working attributes", // OPTIONAL: English description
  "description_ar": "شعار شامل يعرض جميع الخصائص العاملة الممكنة", // OPTIONAL: Arabic description
  "tags_en": ["complete", "working", "comprehensive", "demo", "all-attributes"], // OPTIONAL: English tags array
  "tags_ar": ["كامل", "عامل", "شامل", "عرض-تجريبي", "جميع-الخصائص"], // OPTIONAL: Arabic tags array
  
  // ==============================================
  // CANVAS CONFIGURATION (REQUIRED)
  // ==============================================
  
  "canvas": {
    "aspectRatio": 1.0, // REQUIRED: Width/height ratio (1.0 = square, 1.5 = landscape, 0.75 = portrait)
    "background": {
      "type": "gradient", // REQUIRED: "solid", "gradient", or "image"
      "solidColor": "#ffffff", // OPTIONAL: Fallback color for solid backgrounds
      "gradient": { // OPTIONAL: Gradient configuration
        "angle": 135.0, // OPTIONAL: Gradient angle in degrees (0-360)
        "stops": [ // REQUIRED if type is "gradient": Array of gradient stops
          {
            "color": "#667eea", // REQUIRED: Color in hex format
            "position": 0.0 // REQUIRED: Position from 0.0 to 1.0
          },
          {
            "color": "#764ba2",
            "position": 0.5
          },
          {
            "color": "#f093fb",
            "position": 1.0
          }
        ]
      }
    }
  },
  
  // ==============================================
  // LAYERS ARRAY (REQUIRED - can be empty)
  // ==============================================
  
  "layers": [
    {
      // ==============================================
      // LAYER COMMON PROPERTIES
      // ==============================================
      
      "type": "background", // REQUIRED: Layer type - "background", "text", "shape", "icon", "image"
      "visible": true, // OPTIONAL: Layer visibility (default: true)
      "order": 0, // OPTIONAL: Layer stacking order (default: 0, lower numbers appear behind)
      "position": { // REQUIRED: Layer position (normalized coordinates 0.0-1.0)
        "x": 0.5, // REQUIRED: X position (0.0 = left, 1.0 = right)
        "y": 0.5  // REQUIRED: Y position (0.0 = top, 1.0 = bottom)
      },
      "scaleFactor": 1.0, // OPTIONAL: Scale multiplier (default: 1.0)
      "rotation": 0, // OPTIONAL: Rotation in degrees (default: 0)
      "opacity": 1.0, // OPTIONAL: Opacity from 0.0 to 1.0 (default: 1.0)
      "flip": { // OPTIONAL: Flip transformations
        "horizontal": false, // OPTIONAL: Flip horizontally (default: false)
        "vertical": false    // OPTIONAL: Flip vertically (default: false)
      },
      
      // ==============================================
      // BACKGROUND LAYER PROPERTIES (REQUIRED if type is "background")
      // ==============================================
      
      "background": {
        "type": "solid", // REQUIRED: "solid", "gradient", or "image"
        "color": "#f8f9fa" // REQUIRED if type is "solid": Background color
      }
    },
    {
      "type": "text",
      "visible": true,
      "order": 1,
      "position": { "x": 0.5, "y": 0.4 },
      "scaleFactor": 1.0,
      "rotation": 0,
      "opacity": 1.0,
      "flip": { "horizontal": false, "vertical": false },
      
      // ==============================================
      // TEXT LAYER PROPERTIES (REQUIRED if type is "text")
      // ==============================================
      
      "text": {
        "value": "COMPREHENSIVE", // REQUIRED: Text content
        "font": "Arial", // OPTIONAL: Font family (default: "Arial")
        "fontSize": 72, // OPTIONAL: Font size in pixels (default: 48)
        "fontColor": "#2c3e50", // OPTIONAL: Text color (default: "#000000")
        "fontWeight": "bold", // OPTIONAL: "normal", "bold", "100"-"900" (default: "normal")
        "fontStyle": "normal", // OPTIONAL: "normal", "italic", "oblique" (default: "normal")
        "alignment": "center", // OPTIONAL: "left", "center", "right" (default: "center")
        "baseline": "alphabetic", // OPTIONAL: "alphabetic", "top", "hanging", "middle", "ideographic", "bottom" (default: "alphabetic")
        "lineHeight": 1.2, // OPTIONAL: Line height multiplier (default: 1.0)
        "letterSpacing": 2, // OPTIONAL: Letter spacing in pixels (default: 0)
        "fillAlpha": 1.0, // OPTIONAL: Fill opacity (default: 1.0)
        "strokeHex": "#34495e", // OPTIONAL: Stroke color (default: null)
        "strokeAlpha": 0.8, // OPTIONAL: Stroke opacity (default: null)
        "strokeWidth": 2, // OPTIONAL: Stroke width in pixels (default: null)
        "strokeAlign": "outside", // OPTIONAL: "inside", "outside", "center" (default: null)
        "gradient": { // OPTIONAL: Text gradient
          "angle": 90.0,
          "stops": [
            { "color": "#f39c12", "position": 0.0 },
            { "color": "#e67e22", "position": 1.0 }
          ]
        },
        "underline": true, // OPTIONAL: Underline text (default: false)
        "underlineDirection": "horizontal", // OPTIONAL: "horizontal", "vertical" (default: "horizontal")
        "textCase": "uppercase", // OPTIONAL: "normal", "uppercase", "lowercase", "capitalize" (default: "normal")
        "textDecoration": "underline", // OPTIONAL: "none", "underline", "overline", "line-through" (default: "none")
        "textTransform": "uppercase", // OPTIONAL: "none", "uppercase", "lowercase", "capitalize" (default: "none")
        "fontVariant": "normal" // OPTIONAL: "normal", "small-caps" (default: "normal")
      }
    },
    {
      "type": "shape",
      "visible": true,
      "order": 2,
      "position": { "x": 0.2, "y": 0.3 },
      "scaleFactor": 1.2,
      "rotation": 15,
      "opacity": 0.8,
      "flip": { "horizontal": false, "vertical": false },
      
      // ==============================================
      // SHAPE LAYER PROPERTIES (REQUIRED if type is "shape")
      // ==============================================
      
      "shape": {
        "type": "rect", // REQUIRED: "rect", "circle", "ellipse", "polygon", "line", "path"
        "color": "#e74c3c", // REQUIRED: Fill color
        "strokeColor": "#c0392b", // OPTIONAL: Stroke color (default: null)
        "strokeWidth": 3 // OPTIONAL: Stroke width in pixels (default: 0)
      }
    },
    {
      "type": "icon",
      "visible": true,
      "order": 3,
      "position": { "x": 0.15, "y": 0.15 },
      "scaleFactor": 0.5,
      "rotation": 45,
      "opacity": 0.8,
      "flip": { "horizontal": false, "vertical": false },
      
      // ==============================================
      // ICON LAYER PROPERTIES (REQUIRED if type is "icon")
      // ==============================================
      
      "icon": {
        "src": "star-icon", // REQUIRED: Icon identifier or name
        "color": "#f1c40f" // OPTIONAL: Tint color (default: "#000000")
      }
    },
    {
      "type": "image",
      "visible": true,
      "order": 4,
      "position": { "x": 0.3, "y": 0.8 },
      "scaleFactor": 0.6,
      "rotation": 0,
      "opacity": 0.9,
      "flip": { "horizontal": false, "vertical": false },
      
      // ==============================================
      // IMAGE LAYER PROPERTIES (REQUIRED if type is "image")
      // ==============================================
      
      "image": {
        "type": "imported", // OPTIONAL: "imported" or "url" (default: "imported")
        "path": "https://example.com/images/decoration.png", // REQUIRED: Image URL or path
        "src": "decoration.png" // OPTIONAL: Image source identifier
      }
    }
  ],
  
  // ==============================================
  // COLOR MANAGEMENT (OPTIONAL)
  // ==============================================
  
  "colorsUsed": [ // OPTIONAL: Array of colors used in the logo
    {
      "role": "text", // REQUIRED: Color role - "text", "icon", "shape", "background"
      "color": "#2c3e50" // REQUIRED: Color in hex format
    },
    {
      "role": "icon",
      "color": "#f1c40f"
    },
    {
      "role": "shape",
      "color": "#e74c3c"
    },
    {
      "role": "background",
      "color": "#f8f9fa"
    }
  ],
  
  // ==============================================
  // ALIGNMENT SETTINGS (OPTIONAL)
  // ==============================================
  
  "alignments": {
    "verticalAlign": "center", // OPTIONAL: "top", "center", "bottom" (default: "center")
    "horizontalAlign": "center" // OPTIONAL: "left", "center", "right" (default: "center")
  },
  
  // ==============================================
  // RESPONSIVE SETTINGS (OPTIONAL)
  // ==============================================
  
  "responsive": {
    "version": "3.0", // OPTIONAL: Responsive version (default: "3.0")
    "description": "Fully responsive logo data - no absolute sizes stored", // OPTIONAL: Responsive description
    "scalingMethod": "scaleFactor", // OPTIONAL: "scaleFactor", "viewport" (default: "scaleFactor")
    "positionMethod": "relative", // OPTIONAL: "relative", "absolute" (default: "relative")
    "fullyResponsive": true // OPTIONAL: Whether logo is fully responsive (default: true)
  },
  
  // ==============================================
  // METADATA (OPTIONAL)
  // ==============================================
  
  "metadata": {
    "createdAt": "2024-01-15T10:30:00.000Z", // OPTIONAL: Creation timestamp (ISO 8601 format)
    "updatedAt": "2024-01-15T10:30:00.000Z", // OPTIONAL: Last update timestamp (ISO 8601 format)
    "tags": ["complete", "working", "comprehensive", "demo", "all-attributes"], // OPTIONAL: Tags array
    "version": 3, // OPTIONAL: Logo version number (default: 3)
    "responsive": true, // OPTIONAL: Whether logo supports responsive behavior (default: true)
    "legacyFormat": true, // OPTIONAL: Whether logo supports legacy format (default: true)
    "legacyVersion": "1.0", // OPTIONAL: Legacy compatibility version (default: "1.0")
    "mobileOptimized": true // OPTIONAL: Whether logo is optimized for mobile (default: true)
  },
  
  // ==============================================
  // EXPORT SETTINGS (OPTIONAL)
  // ==============================================
  
  "export": {
    "format": "png", // OPTIONAL: Export format - "png", "jpg", "svg", "pdf" (default: "png")
    "transparentBackground": true, // OPTIONAL: Whether to use transparent background (default: true)
    "quality": 100, // OPTIONAL: Export quality 1-100 (default: 100)
    "responsive": { // OPTIONAL: Responsive export settings
      "scalable": true, // OPTIONAL: Whether export is scalable (default: true)
      "maintainAspectRatio": true // OPTIONAL: Whether to maintain aspect ratio (default: true)
    }
  },
  
  // ==============================================
  // LANGUAGE AND DIRECTION (OPTIONAL)
  // ==============================================
  
  "language": "en", // OPTIONAL: Primary language - "en", "ar" (default: "en")
  "direction": "ltr" // OPTIONAL: Text direction - "ltr", "rtl" (default: "ltr")
}
```

## Summary of All Working Attributes

### Root Level Attributes (20 total)
- **Required (2)**: `name`, `description`
- **Multilingual (6)**: `name_en`, `name_ar`, `description_en`, `description_ar`, `tags_en`, `tags_ar`
- **Configuration (12)**: `canvas`, `layers`, `colorsUsed`, `alignments`, `responsive`, `metadata`, `export`, `language`, `direction`

### Layer Types (5 total)
- **Background**: Solid colors, gradients, images
- **Text**: Rich text with fonts, colors, gradients, styling
- **Shape**: Geometric shapes with fills and strokes
- **Icon**: Vector icons with color tinting
- **Image**: Raster images with positioning

### Layer Properties (9 common + type-specific)
- **Common**: `type`, `visible`, `order`, `position`, `scaleFactor`, `rotation`, `opacity`, `flip`
- **Type-specific**: `background`, `text`, `shape`, `icon`, `image` objects

### Text Properties (20 total)
- **Content**: `value`
- **Font**: `font`, `fontSize`, `fontColor`, `fontWeight`, `fontStyle`
- **Layout**: `alignment`, `baseline`, `lineHeight`, `letterSpacing`
- **Styling**: `fillAlpha`, `strokeHex`, `strokeAlpha`, `strokeWidth`, `strokeAlign`
- **Effects**: `gradient`, `underline`, `underlineDirection`, `textCase`, `textDecoration`, `textTransform`, `fontVariant`

### Canvas Properties (3 total)
- **Basic**: `aspectRatio`
- **Background**: `type`, `solidColor`, `gradient`, `image`

### Responsive Properties (5 total)
- **Version**: `version`, `description`
- **Behavior**: `scalingMethod`, `positionMethod`, `fullyResponsive`

### Export Properties (5 total)
- **Format**: `format`, `transparentBackground`, `quality`
- **Responsive**: `scalable`, `maintainAspectRatio`

### Metadata Properties (8 total)
- **Timestamps**: `createdAt`, `updatedAt`
- **Classification**: `tags`, `version`
- **Capabilities**: `responsive`, `legacyFormat`, `legacyVersion`, `mobileOptimized`

## Files Available

1. **`FINAL_WORKING_COMPREHENSIVE_LOGO.json`** - Complete working JSON (no comments)
2. **`FINAL_COMPREHENSIVE_LOGO_JSON.json`** - Complete JSON with detailed comments
3. **`test_final_working.js`** - Test script for the working JSON
4. **`ALL_POSSIBLE_ATTRIBUTES_DOCUMENTATION.md`** - Complete attribute reference

## Usage

```bash
# Test the working comprehensive logo
node test_final_working.js

# Use the JSON in your application
curl -X POST http://localhost:3000/api/logo/mobile \
  -H "Content-Type: application/json" \
  -d @FINAL_WORKING_COMPREHENSIVE_LOGO.json
```

This comprehensive JSON demonstrates all possible working attributes for creating logos with the mobile API! 🎉
