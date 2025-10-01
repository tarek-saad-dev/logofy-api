# Logo Maker API Documentation

## Overview

This is a comprehensive Logo Maker API built with Express.js and PostgreSQL. It provides full functionality for creating, managing, and exporting logos with multiple layer types, templates, and asset management.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the API does not implement authentication. In production, you should add JWT or session-based authentication.

## Database Schema

The API uses a comprehensive PostgreSQL schema with the following main entities:

- **Users**: User accounts
- **Assets**: Files (images, SVGs, fonts) stored on Cloudinary
- **Logos**: Logo projects with canvas dimensions
- **Layers**: Logo layers with common properties
- **Layer Types**: Text, Shape, Icon, Image, Background
- **Templates**: Reusable logo templates
- **Categories**: Template categories
- **Versions**: Logo version history

## API Endpoints

### 1. Mobile-Compatible Endpoints

For mobile app integration, use these endpoints that return data in the exact JSON format expected by the mobile team:

#### Get Logo in Mobile Format
```http
GET /api/logo/:id/mobile
```

#### Create Logo from Mobile Format
```http
POST /api/logo/mobile
Content-Type: application/json

{
  "logoId": "1759094821977",
  "templateId": null,
  "userId": "current_user",
  "name": "My Logo",
  "description": "Logo description",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid",
      "solidColor": "#ffffff",
      "gradient": null,
      "image": null
    }
  },
  "layers": [
    {
      "layerId": "1759074588677",
      "type": "text",
      "visible": true,
      "order": 0,
      "position": { "x": 0.5, "y": 0.5 },
      "scaleFactor": 1.0,
      "rotation": 0.0,
      "opacity": 1.0,
      "flip": { "horizontal": false, "vertical": false },
      "text": {
        "value": "My Text",
        "font": "Arial",
        "fontColor": "#000000",
        "fontWeight": "normal",
        "fontStyle": "normal",
        "alignment": "center",
        "lineHeight": 1.0,
        "letterSpacing": 0
      }
    }
  ],
  "colorsUsed": [
    {
      "role": "text",
      "color": "#000000"
    }
  ],
  "alignments": {
    "verticalAlign": "center",
    "horizontalAlign": "center"
  },
  "responsive": {
    "version": "3.0",
    "description": "Fully responsive logo data",
    "scalingMethod": "scaleFactor",
    "positionMethod": "relative",
    "fullyResponsive": true
  },
  "metadata": {
    "createdAt": "2025-09-29T00:27:01.974384",
    "updatedAt": "2025-09-29T00:27:01.974384",
    "tags": ["logo", "design", "responsive"],
    "version": 3,
    "responsive": true
  },
  "export": {
    "format": "png",
    "transparentBackground": true,
    "quality": 100,
    "responsive": {
      "scalable": true,
      "maintainAspectRatio": true
    }
  }
}
```

**Alternative Format Support:**
```http
GET /api/logo/:id?format=mobile
POST /api/logo?format=mobile
```

For detailed mobile API documentation, see [MOBILE_API_DOCUMENTATION.md](./MOBILE_API_DOCUMENTATION.md).

### 2. Logo Management

#### Create Logo
```http
POST /api/logo
Content-Type: application/json

{
  "owner_id": "uuid",
  "title": "My Logo",
  "canvas_w": 1080,
  "canvas_h": 1080,
  "dpi": 300,
  "category_id": "uuid",
  "is_template": false,
  "layers": [
    {
      "type": "BACKGROUND",
      "name": "Background",
      "z_index": 0,
      "x_norm": 0,
      "y_norm": 0,
      "scale": 1,
      "rotation_deg": 0,
      "opacity": 1,
      "blend_mode": "normal",
      "background": {
        "mode": "gradient",
        "gradient": {
          "type": "linear",
          "angle": 45,
          "stops": [
            {"offset": 0, "hex": "#FF0000", "alpha": 1},
            {"offset": 1, "hex": "#0000FF", "alpha": 1}
          ]
        }
      }
    },
    {
      "type": "TEXT",
      "name": "Title",
      "z_index": 10,
      "x_norm": 0.5,
      "y_norm": 0.5,
      "scale": 1,
      "text": {
        "content": "My Logo",
        "font_id": "uuid",
        "font_size": 48,
        "fill_hex": "#FFFFFF",
        "align": "center"
      }
    }
  ]
}
```

#### Get Logo
```http
GET /api/logo/:id
```

#### Update Logo
```http
PATCH /api/logo/:id
Content-Type: application/json

{
  "title": "Updated Logo",
  "canvas_w": 1920,
  "canvas_h": 1080
}
```

#### Delete Logo
```http
DELETE /api/logo/:id
```

### 2. Layer Management

#### Get Layer
```http
GET /api/layers/:id
```

#### Update Layer Common Properties
```http
PATCH /api/layers/:id
Content-Type: application/json

{
  "x_norm": 0.6,
  "y_norm": 0.4,
  "scale": 1.2,
  "rotation_deg": 15,
  "opacity": 0.8,
  "is_visible": true,
  "is_locked": false
}
```

#### Update Text Layer
```http
PATCH /api/layers/:id/text
Content-Type: application/json

{
  "content": "New Text",
  "font_size": 64,
  "fill_hex": "#FF0000",
  "stroke_hex": "#000000",
  "stroke_width": 2
}
```

#### Update Shape Layer
```http
PATCH /api/layers/:id/shape
Content-Type: application/json

{
  "shape_kind": "rect",
  "fill_hex": "#00FF00",
  "stroke_hex": "#000000",
  "stroke_width": 3,
  "rx": 10,
  "ry": 10
}
```

#### Update Icon Layer
```http
PATCH /api/layers/:id/icon
Content-Type: application/json

{
  "asset_id": "uuid",
  "tint_hex": "#FF0000",
  "tint_alpha": 0.8
}
```

#### Update Image Layer
```http
PATCH /api/layers/:id/image
Content-Type: application/json

{
  "asset_id": "uuid",
  "crop": {"x": 0, "y": 0, "w": 1, "h": 1},
  "fit": "contain",
  "brightness": 1.2,
  "contrast": 1.1
}
```

#### Update Background Layer
```http
PATCH /api/layers/:id/background
Content-Type: application/json

{
  "mode": "gradient",
  "gradient": {
    "type": "radial",
    "stops": [
      {"offset": 0, "hex": "#FF0000", "alpha": 1},
      {"offset": 1, "hex": "#0000FF", "alpha": 1}
    ]
  }
}
```

#### Reorder Layer
```http
POST /api/layers/:id/reorder
Content-Type: application/json

{
  "z_index": 5
}
```

#### Delete Layer
```http
DELETE /api/layers/:id
```

### 3. Asset Management

#### Get Assets
```http
GET /api/assets?kind=vector&category=icons&search=arrow&page=1&limit=20
```

#### Upload Asset
```http
POST /api/assets/upload
Content-Type: multipart/form-data

file: [binary]
kind: "vector"
name: "Arrow Icon"
meta: {"category": "icons", "tags": ["arrow", "direction"]}
```

#### Create Asset Record
```http
POST /api/assets
Content-Type: application/json

{
  "kind": "vector",
  "name": "Custom Icon",
  "storage": "cloudinary",
  "url": "https://res.cloudinary.com/...",
  "provider_id": "public_id",
  "mime_type": "image/svg+xml",
  "width": 100,
  "height": 100,
  "has_alpha": true,
  "vector_svg": "<svg>...</svg>"
}
```

#### Update Asset
```http
PATCH /api/assets/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "meta": {"category": "business", "tags": ["logo", "brand"]}
}
```

#### Delete Asset
```http
DELETE /api/assets/:id
```

### 4. Template Management

#### Get Templates
```http
GET /api/templates?category_id=uuid&search=gaming&page=1&limit=20
```

#### Create Template
```http
POST /api/templates
Content-Type: application/json

{
  "title": "Gaming Logo Template",
  "description": "Template for gaming logos",
  "category_id": "uuid",
  "base_logo_id": "uuid",
  "preview_url": "https://..."
}
```

#### Use Template
```http
POST /api/templates/:id/use
Content-Type: application/json

{
  "owner_id": "uuid",
  "title": "My Gaming Logo"
}
```

#### Get Categories
```http
GET /api/templates/categories
```

#### Create Category
```http
POST /api/templates/categories
Content-Type: application/json

{
  "name": "Gaming",
  "description": "Gaming-related templates",
  "icon_asset_id": "uuid"
}
```

### 5. Export & Rendering

#### Export as PNG
```http
GET /api/logo/:id/export.png?width=1920&height=1080&dpi=300&quality=95
```

#### Export as SVG
```http
GET /api/logo/:id/export.svg?width=1920&height=1080
```

#### Generate Thumbnail
```http
GET /api/logo/:id/thumbnail?width=300&height=300
```

### 6. Version Control

#### Create Version
```http
POST /api/logo/:id/version
Content-Type: application/json

{
  "note": "Added new text layer"
}
```

#### Get Versions
```http
GET /api/logo/:id/versions?page=1&limit=20
```

## Data Types

### Layer Types
- `BACKGROUND`: Background layers (solid, gradient, image)
- `TEXT`: Text layers with font properties
- `SHAPE`: Shape layers (rect, circle, path)
- `ICON`: Icon layers with SVG assets
- `IMAGE`: Image layers with raster assets

### Blend Modes
- `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`
- `color-burn`, `color-dodge`, `difference`, `exclusion`
- `hue`, `saturation`, `color`, `luminosity`, `soft-light`, `hard-light`

### Asset Kinds
- `raster`: PNG, JPEG, WebP images
- `vector`: SVG files
- `font`: Font files (TTF, WOFF2)
- `pattern`: Pattern/texture images

## Coordinate System

All coordinates are normalized (0-1) relative to the canvas:
- `x_norm`, `y_norm`: Position (0,0 = top-left, 1,1 = bottom-right)
- `anchor_x`, `anchor_y`: Anchor point (0.5,0.5 = center)
- `scale`: Scale factor (1.0 = original size)
- `rotation_deg`: Rotation in degrees
- `opacity`: Opacity (0-1)

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented. In production, consider adding rate limiting for:
- File uploads
- Export operations
- API calls

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/logo_maker
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NODE_ENV=development
PORT=3000
```

## Database Migration

To migrate from the old schema to the new Logo Maker schema:

```bash
npm run migrate
```

This will:
1. Create all new tables and enums
2. Preserve existing data
3. Set up proper relationships and constraints
4. Create helper functions

## Example Usage

### Creating a Complete Logo

```javascript
// 1. Upload assets
const iconAsset = await fetch('/api/assets/upload', {
  method: 'POST',
  body: formData // with icon file
});

// 2. Create logo with layers
const logo = await fetch('/api/logo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner_id: 'user-uuid',
    title: 'My Brand Logo',
    canvas_w: 1080,
    canvas_h: 1080,
    layers: [
      {
        type: 'BACKGROUND',
        name: 'Background',
        z_index: 0,
        x_norm: 0, y_norm: 0,
        background: {
          mode: 'gradient',
          gradient: {
            type: 'linear',
            angle: 45,
            stops: [
              { offset: 0, hex: '#FF6B6B', alpha: 1 },
              { offset: 1, hex: '#4ECDC4', alpha: 1 }
            ]
          }
        }
      },
      {
        type: 'ICON',
        name: 'Icon',
        z_index: 10,
        x_norm: 0.5, y_norm: 0.4,
        icon: {
          asset_id: iconAsset.id,
          tint_hex: '#FFFFFF'
        }
      },
      {
        type: 'TEXT',
        name: 'Title',
        z_index: 20,
        x_norm: 0.5, y_norm: 0.7,
        text: {
          content: 'MY BRAND',
          font_size: 48,
          fill_hex: '#FFFFFF',
          align: 'center'
        }
      }
    ]
  })
});

// 3. Export as PNG
const exportUrl = `/api/logo/${logo.id}/export.png?width=1920&height=1080&dpi=300`;
```

This comprehensive API provides everything needed to build a full-featured logo maker application with professional-grade functionality.
