# Comprehensive Logo JSON Guide

This guide provides a complete JSON example for creating logos with all possible layer types and properties using the mobile API.

## Overview

The comprehensive logo JSON demonstrates all supported layer types:
- **Background Layer**: Solid colors, gradients, and images
- **Text Layer**: Rich text with fonts, colors, gradients, and styling
- **Shape Layer**: Geometric shapes with fills and strokes
- **Icon Layer**: Vector icons with color tinting
- **Image Layer**: Raster images with positioning and effects

## Base Structure

```json
{
  "name": "Logo Name",
  "description": "Logo Description",
  "canvas": {
    "aspectRatio": 1.0,
    "background": { /* background configuration */ }
  },
  "layers": [ /* array of layer objects */ ],
  "colorsUsed": [ /* array of color objects */ ],
  "alignments": { /* alignment settings */ },
  "responsive": { /* responsive settings */ },
  "metadata": { /* metadata */ },
  "export": { /* export settings */ }
}
```

## Layer Types and Properties

### 1. Background Layer

```json
{
  "type": "background",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "background": {
    "type": "solid", // "solid", "gradient", or "image"
    "color": "#ffffff",
    "image": null, // or image object
    "repeat": "no-repeat", // "repeat", "no-repeat", "repeat-x", "repeat-y"
    "position": "center", // "top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"
    "size": "cover" // "auto", "cover", "contain", or specific dimensions
  }
}
```

### 2. Text Layer

```json
{
  "type": "text",
  "visible": true,
  "order": 1,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "text": {
    "value": "Text Content",
    "font": "Arial",
    "fontSize": 48,
    "fontColor": "#000000",
    "fontWeight": "normal", // "normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"
    "fontStyle": "normal", // "normal", "italic", "oblique"
    "alignment": "center", // "left", "center", "right"
    "baseline": "alphabetic", // "alphabetic", "top", "hanging", "middle", "ideographic", "bottom"
    "lineHeight": 1.0,
    "letterSpacing": 0,
    "fillAlpha": 1.0,
    "strokeHex": null, // stroke color
    "strokeAlpha": null, // stroke opacity
    "strokeWidth": null, // stroke width
    "strokeAlign": null, // "inside", "outside", "center"
    "gradient": null, // gradient object
    "underline": false,
    "underlineDirection": "horizontal", // "horizontal", "vertical"
    "textCase": "normal", // "normal", "uppercase", "lowercase", "capitalize"
    "textDecoration": "none", // "none", "underline", "overline", "line-through"
    "textTransform": "none", // "none", "uppercase", "lowercase", "capitalize"
    "fontVariant": "normal" // "normal", "small-caps"
  }
}
```

### 3. Shape Layer

```json
{
  "type": "shape",
  "visible": true,
  "order": 2,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "shape": {
    "src": null, // SVG path or URL
    "type": "rect", // "rect", "circle", "ellipse", "polygon", "line", "path"
    "color": "#000000",
    "strokeColor": null, // stroke color
    "strokeWidth": 0 // stroke width
  }
}
```

### 4. Icon Layer

```json
{
  "type": "icon",
  "visible": true,
  "order": 3,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "icon": {
    "src": "icon-name", // icon identifier
    "color": "#000000", // tint color
    "url": "https://example.com/icon.svg" // optional URL
  }
}
```

### 5. Image Layer

```json
{
  "type": "image",
  "visible": true,
  "order": 4,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "image": {
    "type": "imported", // "imported", "url"
    "path": "https://example.com/image.jpg",
    "src": "image.jpg"
  }
}
```

## Gradient Configuration

Gradients can be used in text and background layers:

```json
{
  "gradient": {
    "angle": 45.0, // gradient angle in degrees
    "stops": [
      {
        "color": "#ff0000", // color in hex format
        "position": 0.0 // position from 0.0 to 1.0
      },
      {
        "color": "#0000ff",
        "position": 1.0
      }
    ]
  }
}
```

## Canvas Background

Canvas background supports solid colors, gradients, and images:

```json
{
  "canvas": {
    "aspectRatio": 1.0, // width/height ratio
    "background": {
      "type": "gradient", // "solid", "gradient", "image"
      "solidColor": "#ffffff",
      "gradient": { /* gradient object */ },
      "image": {
        "type": "imported",
        "path": "https://example.com/background.jpg"
      }
    }
  }
}
```

## Color Management

Define colors used in the logo:

```json
{
  "colorsUsed": [
    {
      "role": "text", // "text", "icon", "shape", "background"
      "color": "#000000"
    },
    {
      "role": "icon",
      "color": "#ff0000"
    }
  ]
}
```

## Multilingual Support

Support for English and Arabic:

```json
{
  "name": "English Name",
  "name_en": "English Name",
  "name_ar": "الاسم العربي",
  "description": "English Description",
  "description_en": "English Description",
  "description_ar": "الوصف العربي",
  "tags_en": ["tag1", "tag2"],
  "tags_ar": ["علامة1", "علامة2"]
}
```

## Responsive Settings

Configure responsive behavior:

```json
{
  "responsive": {
    "version": "3.0",
    "description": "Fully responsive logo data",
    "scalingMethod": "scaleFactor", // "scaleFactor", "viewport"
    "positionMethod": "relative", // "relative", "absolute"
    "fullyResponsive": true
  }
}
```

## Export Settings

Configure export options:

```json
{
  "export": {
    "format": "png", // "png", "jpg", "svg", "pdf"
    "transparentBackground": true,
    "quality": 100, // 1-100
    "responsive": {
      "scalable": true,
      "maintainAspectRatio": true
    }
  }
}
```

## Complete Example

See `comprehensive_logo_simplified.json` for a complete working example that demonstrates all layer types and properties.

## API Endpoints

- **POST** `/api/logo/mobile` - Create logo from mobile format
- **GET** `/api/logo/:id/mobile` - Get logo in mobile format
- **GET** `/api/logo/:id/mobile/legacy` - Get logo in legacy format
- **GET** `/api/logo/mobile/legacy` - Get all logos in legacy format

## Testing

Use the provided test scripts to verify your logo JSON:

- `test_simple_logo.js` - Test basic logo creation
- `test_comprehensive_step_by_step.js` - Test each layer type individually
- `test_simplified_comprehensive.js` - Test complete comprehensive logo

## Best Practices

1. **Layer Order**: Use the `order` property to control layer stacking (lower numbers appear behind higher numbers)
2. **Positioning**: Use normalized coordinates (0.0 to 1.0) for responsive positioning
3. **Performance**: Keep the number of layers reasonable for better performance
4. **Colors**: Define all colors in the `colorsUsed` array for better color management
5. **Validation**: Always test your JSON with the provided test scripts before production use
