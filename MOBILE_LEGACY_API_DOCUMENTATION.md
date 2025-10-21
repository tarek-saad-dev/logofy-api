# Mobile Legacy Format API Documentation

This document provides comprehensive documentation for the Mobile Legacy Format API endpoints for the Logo Maker application.

## Base URL
```
http://localhost:3000/api
```

## Overview

The Mobile Legacy Format API provides endpoints to retrieve logos in a legacy-compatible format optimized for mobile applications. This format ensures backward compatibility with older mobile app versions while maintaining full functionality.

## Features

- **Legacy Format Support**: Ensures compatibility with older mobile app versions
- **Comprehensive Error Handling**: Detailed error responses with multilingual support
- **Pagination Support**: Efficient data retrieval with pagination
- **Multilingual Support**: English and Arabic language support
- **Mobile Optimization**: Optimized for mobile device performance
- **Gradient Transformation**: Automatic transformation of gradients to legacy format
- **Flip Support**: Full support for horizontal and vertical layer flipping

## Authentication

Currently, no authentication is required for these endpoints. All endpoints are publicly accessible.

## Endpoints

### 1. Get All Logos in Mobile Legacy Format

**Endpoint:** `GET /api/logo/mobile/legacy`

**Description:** Retrieves all logos that support legacy format in mobile-compatible JSON structure.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of logos per page (default: 20, max: 100)
- `lang` (optional): Language preference - 'en' or 'ar' (default: 'en')

**Example Request:**
```bash
GET /api/logo/mobile/legacy?page=1&limit=10&lang=en
```

**Response Format:**
```json
{
  "success": true,
  "message": "Logos fetched in legacy format successfully",
  "language": "en",
  "direction": "ltr",
  "data": {
    "data": [
      {
        "logoId": "bdd8c50a-383c-44c4-a212-ede3c06e6102",
        "templateId": null,
        "userId": "current_user",
        "name": "working_logo_test",
        "description": "Logo created on 2025-10-21T06:16:02.171Z",
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
            "layerId": "layer-uuid-here",
            "type": "text",
            "visible": true,
            "order": 0,
            "position": {
              "x": 0.5,
              "y": 0.5
            },
            "scaleFactor": 1.0,
            "rotation": 0,
            "opacity": 1.0,
            "flip": {
              "horizontal": false,
              "vertical": false
            },
            "text": {
              "value": "Sample Text",
              "font": "Arial",
              "fontSize": 48,
              "fontColor": "#000000",
              "fontWeight": "normal",
              "fontStyle": "normal",
              "alignment": "center",
              "baseline": "alphabetic",
              "lineHeight": 1.0,
              "letterSpacing": 0,
              "fillAlpha": 1.0,
              "strokeHex": null,
              "strokeAlpha": null,
              "strokeWidth": null,
              "strokeAlign": null,
              "gradient": null,
              "underline": false,
              "underlineDirection": "horizontal",
              "textCase": "normal",
              "textDecoration": "none",
              "textTransform": "none",
              "fontVariant": "normal"
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
          "description": "Fully responsive logo data - no absolute sizes stored",
          "scalingMethod": "scaleFactor",
          "positionMethod": "relative",
          "fullyResponsive": true
        },
        "metadata": {
          "createdAt": "2025-10-21T06:16:02.171Z",
          "updatedAt": "2025-10-21T06:16:02.171Z",
          "tags": ["logo", "design", "responsive"],
          "version": 3,
          "responsive": true,
          "legacyFormat": true,
          "legacyVersion": "1.0",
          "mobileOptimized": true
        },
        "export": {
          "format": "png",
          "transparentBackground": true,
          "quality": 100,
          "responsive": {
            "scalable": true,
            "maintainAspectRatio": true
          }
        },
        "language": "en",
        "direction": "ltr"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 81,
      "pages": 5
    }
  }
}
```

### 2. Get Single Logo in Mobile Legacy Format

**Endpoint:** `GET /api/logo/:id/mobile/legacy`

**Description:** Retrieves a specific logo by ID in mobile legacy format.

**Path Parameters:**
- `id` (required): Logo UUID

**Query Parameters:**
- `lang` (optional): Language preference - 'en' or 'ar' (default: 'en')

**Example Request:**
```bash
GET /api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy?lang=en
```

**Response Format:**
```json
{
  "success": true,
  "message": "Logo fetched in legacy format successfully",
  "language": "en",
  "direction": "ltr",
  "data": {
    "logoId": "bdd8c50a-383c-44c4-a212-ede3c06e6102",
    "templateId": null,
    "userId": "current_user",
    "name": "working_logo_test",
    "description": "Logo created on 2025-10-21T06:16:02.171Z",
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
      // ... layer objects as shown above
    ],
    "colorsUsed": [
      // ... color objects as shown above
    ],
    "alignments": {
      "verticalAlign": "center",
      "horizontalAlign": "center"
    },
    "responsive": {
      "version": "3.0",
      "description": "Fully responsive logo data - no absolute sizes stored",
      "scalingMethod": "scaleFactor",
      "positionMethod": "relative",
      "fullyResponsive": true
    },
    "metadata": {
      "createdAt": "2025-10-21T06:16:02.171Z",
      "updatedAt": "2025-10-21T06:16:02.171Z",
      "tags": ["logo", "design", "responsive"],
      "version": 3,
      "responsive": true,
      "legacyFormat": true,
      "legacyVersion": "1.0",
      "mobileOptimized": true
    },
    "export": {
      "format": "png",
      "transparentBackground": true,
      "quality": 100,
      "responsive": {
        "scalable": true,
        "maintainAspectRatio": true
      }
    },
    "language": "en",
    "direction": "ltr"
  }
}
```

## Layer Types

### Text Layer
```json
{
  "layerId": "string",
  "type": "text",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0.0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "text": {
    "value": "Text content",
    "font": "Arial",
    "fontSize": 48,
    "fontColor": "#000000",
    "fontWeight": "normal",
    "fontStyle": "normal",
    "alignment": "center",
    "baseline": "alphabetic",
    "lineHeight": 1.0,
    "letterSpacing": 0,
    "fillAlpha": 1.0,
    "strokeHex": null,
    "strokeAlpha": null,
    "strokeWidth": null,
    "strokeAlign": null,
    "gradient": null,
    "underline": false,
    "underlineDirection": "horizontal",
    "textCase": "normal",
    "textDecoration": "none",
    "textTransform": "none",
    "fontVariant": "normal"
  }
}
```

### Icon Layer
```json
{
  "layerId": "string",
  "type": "icon",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0.0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "icon": {
    "src": "icon_58873",
    "color": "#ffc107"
  }
}
```

### Image Layer
```json
{
  "layerId": "string",
  "type": "image",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0.0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "image": {
    "type": "imported",
    "path": "https://example.com/images/image.jpg"
  }
}
```

### Shape Layer
```json
{
  "layerId": "string",
  "type": "shape",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0.0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "shape": {
    "src": "assets/local/Basic/13.svg",
    "type": "rect",
    "color": "#000000",
    "strokeColor": null,
    "strokeWidth": 0
  }
}
```

### Background Layer
```json
{
  "layerId": "string",
  "type": "background",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1.0,
  "rotation": 0.0,
  "opacity": 1.0,
  "flip": { "horizontal": false, "vertical": false },
  "background": {
    "type": "solid",
    "color": "#ffffff",
    "image": null
  }
}
```

## Canvas Structure

```json
{
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid|gradient|image",
      "solidColor": "#ffffff",
      "gradient": {
        "angle": 0.0,
        "stops": [
          {
            "color": "#ff0000",
            "position": 0.0
          },
          {
            "color": "#0000ff",
            "position": 1.0
          }
        ]
      },
      "image": {
        "type": "imported",
        "path": "https://example.com/backgrounds/bg.jpg"
      }
    }
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid logo ID format",
  "language": "en",
  "direction": "ltr"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Logo not found",
  "language": "en",
  "direction": "ltr"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "language": "en",
  "direction": "ltr"
}
```

## Legacy Format Features

### Gradient Transformation
The API automatically transforms modern gradient formats to legacy format for backward compatibility:

**Modern Format:**
```json
{
  "gradient": {
    "angle": 45,
    "stops": [
      {
        "hex": "#ff0000",
        "offset": 0.0
      },
      {
        "hex": "#0000ff",
        "offset": 1.0
      }
    ]
  }
}
```

**Legacy Format:**
```json
{
  "gradient": {
    "angle": 45.0,
    "stops": [
      {
        "color": "#ff0000",
        "position": 0.0
      },
      {
        "color": "#0000ff",
        "position": 1.0
      }
    ]
  }
}
```

### Flip Support
Full support for horizontal and vertical layer flipping:

```json
{
  "flip": {
    "horizontal": true,
    "vertical": false
  }
}
```

### Mobile Optimization
All logos returned by the legacy endpoints are optimized for mobile devices with:
- Responsive scaling
- Optimized layer structure
- Mobile-friendly metadata
- Legacy compatibility flags

## Usage Examples

### cURL Examples

**Get all logos in legacy format:**
```bash
curl -X GET "http://localhost:3000/api/logo/mobile/legacy?page=1&limit=10&lang=en" \
  -H "Content-Type: application/json"
```

**Get specific logo in legacy format:**
```bash
curl -X GET "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy?lang=en" \
  -H "Content-Type: application/json"
```

### JavaScript Examples

**Fetch all logos:**
```javascript
const response = await fetch('http://localhost:3000/api/logo/mobile/legacy?page=1&limit=10&lang=en');
const data = await response.json();
console.log(data);
```

**Fetch specific logo:**
```javascript
const logoId = 'bdd8c50a-383c-44c4-a212-ede3c06e6102';
const response = await fetch(`http://localhost:3000/api/logo/${logoId}/mobile/legacy?lang=en`);
const data = await response.json();
console.log(data);
```

### PowerShell Examples

**Get all logos:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/logo/mobile/legacy?page=1&limit=10&lang=en" -Method GET -ContentType "application/json"
```

**Get specific logo:**
```powershell
$logoId = "bdd8c50a-383c-44c4-a212-ede3c06e6102"
Invoke-RestMethod -Uri "http://localhost:3000/api/logo/$logoId/mobile/legacy?lang=en" -Method GET -ContentType "application/json"
```

## Database Schema

The legacy format endpoints require the following database columns:

### logos table
- `legacy_format_supported` (BOOLEAN) - Whether logo supports legacy format
- `mobile_optimized` (BOOLEAN) - Whether logo is optimized for mobile
- `legacy_compatibility_version` (VARCHAR) - Version of legacy compatibility

### layers table
- `flip_horizontal` (BOOLEAN) - Whether layer is flipped horizontally
- `flip_vertical` (BOOLEAN) - Whether layer is flipped vertically

## Migration

To enable legacy format support, run the following SQL migration:

```sql
-- Add legacy format support columns
ALTER TABLE logos 
ADD COLUMN IF NOT EXISTS legacy_format_supported BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS mobile_optimized BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS legacy_compatibility_version VARCHAR(10) DEFAULT '1.0';

-- Add flip columns to layers table
ALTER TABLE layers 
ADD COLUMN IF NOT EXISTS flip_horizontal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flip_vertical BOOLEAN DEFAULT FALSE;
```

## Performance Considerations

- **Pagination**: Use pagination to limit response size
- **Caching**: Consider implementing caching for frequently accessed logos
- **Compression**: Enable gzip compression for better performance
- **Database Indexing**: Ensure proper indexing on frequently queried columns

## Troubleshooting

### Common Issues

1. **Route not found**: Ensure the server is running and routes are properly configured
2. **Invalid logo ID**: Verify the logo ID is a valid UUID format
3. **Legacy format not supported**: Check if the logo has `legacy_format_supported = true`
4. **Database connection issues**: Verify database connection and schema

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=logo-api:legacy
```

## Support

For technical support or questions about the Mobile Legacy Format API, please contact the development team or refer to the main API documentation.
