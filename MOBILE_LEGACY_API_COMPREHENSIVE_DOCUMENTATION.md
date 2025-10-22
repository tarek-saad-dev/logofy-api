# Mobile Legacy Format API - Comprehensive Documentation

## Overview

This document provides comprehensive documentation for the Mobile Legacy Format API endpoints for the Logo Maker application. The API supports both GET and POST operations for logos in a legacy-compatible format optimized for mobile applications.

## Table of Contents

1. [Base URL and Environment](#base-url-and-environment)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Handling](#error-handling)
6. [Testing](#testing)
7. [Performance Considerations](#performance-considerations)
8. [Database Schema](#database-schema)
9. [Migration Guide](#migration-guide)

## Base URL and Environment

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

Currently, no authentication is required for these endpoints. All endpoints are publicly accessible.

## API Endpoints

### Health Check

#### GET /health
Check if the API server is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2025-10-21T23:52:21.166Z"
}
```

### Mobile Legacy Format - GET Endpoints

#### GET /logo/mobile/legacy
Retrieves all logos that support legacy format in mobile-compatible JSON structure.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of logos per page (default: 20, max: 100)
- `lang` (optional): Language preference - 'en' or 'ar' (default: 'en')

**Example Request:**
```bash
GET /api/logo/mobile/legacy?page=1&limit=10&lang=en
```

**Response:**
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
        "layers": [],
        "colorsUsed": [],
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
      "limit": 10,
      "total": 81,
      "pages": 9
    }
  }
}
```

#### GET /logo/:id/mobile/legacy
Retrieves a specific logo by ID in mobile legacy format.

**Path Parameters:**
- `id` (required): Logo UUID

**Query Parameters:**
- `lang` (optional): Language preference - 'en' or 'ar' (default: 'en')

**Example Request:**
```bash
GET /api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy?lang=en
```

**Response:**
Same structure as the list endpoint, but returns a single logo object instead of an array.

### Mobile Legacy Format - POST Endpoints

#### POST /logo/mobile
Creates a new logo using the mobile API format.

**Request Body:**
```json
{
  "name": "Test Logo",
  "description": "A test logo created via mobile API",
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
      "layerId": "text-layer-1",
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
        "value": "Hello World",
        "font": "Arial",
        "fontSize": 48,
        "fontColor": "#333333",
        "fontWeight": "bold",
        "fontStyle": "normal",
        "alignment": "center",
        "baseline": "alphabetic",
        "lineHeight": 1.2,
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
      "color": "#333333"
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
    "tags": ["test", "mobile"],
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

**Response:**
```json
{
  "success": true,
  "message": "Logo created successfully",
  "data": {
    "logoId": "90d50631-6dfa-495b-b377-1e054e2d09cf",
    "templateId": null,
    "userId": null,
    "name": "Test Logo",
    "description": "A test logo created via mobile API",
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
        "layerId": "text-layer-1",
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
        }
      }
    ],
    "colorsUsed": [
      {
        "role": "text",
        "color": "#333333"
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
      "createdAt": "2025-10-21T23:52:37.729Z",
      "updatedAt": "2025-10-21T23:52:37.729Z",
      "tags": ["test", "mobile"],
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
  },
  "language": "en",
  "direction": "ltr"
}
```

## Request/Response Formats

### Layer Types

#### Text Layer
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

#### Icon Layer
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

#### Image Layer
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

#### Shape Layer
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

### Canvas Structure

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

## Error Handling

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

## Testing

### Postman Collection

A comprehensive Postman collection is available at:
- `mobile_legacy_api_comprehensive.postman_collection.json`

The collection includes:
- Health check tests
- GET endpoint tests (English and Arabic)
- POST endpoint tests with various layer types
- Error handling tests
- Performance tests
- Validation tests

### Test Scripts

Run the comprehensive test suite:
```bash
node test_mobile_legacy_comprehensive.js
```

Run the basic legacy format tests:
```bash
node test_mobile_legacy_endpoints.js
```

### Test Coverage

The test suite covers:
- ✅ Health check endpoint
- ✅ GET all logos (legacy format) - English
- ✅ GET all logos (legacy format) - Arabic
- ✅ GET single logo (legacy format) - English
- ✅ GET single logo (legacy format) - Arabic
- ✅ POST create logo (basic)
- ✅ POST create logo (with text layer)
- ✅ POST create logo (with gradient background)
- ✅ Error handling (invalid ID format)
- ✅ Error handling (logo not found)
- ✅ Error handling (missing required fields)
- ✅ Pagination tests
- ✅ Performance tests
- ✅ Validation tests

## Performance Considerations

### Response Times
- Single logo retrieval: < 2000ms
- All logos (20 items): < 3000ms
- Logo creation: < 5000ms
- Large page size (100 items): < 5000ms

### Optimization Tips
- Use pagination to limit response size
- Consider implementing caching for frequently accessed logos
- Enable gzip compression for better performance
- Ensure proper database indexing on frequently queried columns

## Database Schema

### Required Columns

#### logos table
- `legacy_format_supported` (BOOLEAN) - Whether logo supports legacy format
- `mobile_optimized` (BOOLEAN) - Whether logo is optimized for mobile
- `legacy_compatibility_version` (VARCHAR) - Version of legacy compatibility

#### layers table
- `flip_horizontal` (BOOLEAN) - Whether layer is flipped horizontally
- `flip_vertical` (BOOLEAN) - Whether layer is flipped vertically

### Migration

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

## Migration Guide

### From Regular Mobile API to Legacy Format

1. **Database Migration**: Run the SQL migration script to add legacy columns
2. **API Endpoints**: Use the `/mobile/legacy` endpoints instead of `/mobile`
3. **Response Format**: The legacy format includes additional metadata fields
4. **Gradient Format**: Gradients are automatically transformed to legacy format
5. **Flip Support**: Full support for horizontal and vertical layer flipping

### Key Differences

| Feature | Regular Mobile API | Legacy Format API |
|---------|-------------------|-------------------|
| Endpoint | `/logo/mobile` | `/logo/mobile/legacy` |
| Gradient Format | Modern format | Legacy format with `color` and `position` |
| Metadata | Basic | Includes `legacyFormat`, `legacyVersion`, `mobileOptimized` |
| Flip Support | Limited | Full horizontal/vertical flip support |
| Compatibility | Current mobile apps | Older mobile app versions |

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

**Create logo with mobile format:**
```bash
curl -X POST "http://localhost:3000/api/logo/mobile" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Logo",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
      }
    },
    "layers": []
  }'
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

**Create logo:**
```javascript
const logoData = {
  name: 'Test Logo',
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: 'solid',
      solidColor: '#ffffff'
    }
  },
  layers: []
};

const response = await fetch('http://localhost:3000/api/logo/mobile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(logoData)
});

const result = await response.json();
console.log(result);
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

## Troubleshooting

### Common Issues

1. **Route not found**: Ensure the server is running and routes are properly configured
2. **Invalid logo ID**: Verify the logo ID is a valid UUID format
3. **Legacy format not supported**: Check if the logo has `legacy_format_supported = true`
4. **Database connection issues**: Verify database connection and schema
5. **Missing required fields**: Ensure all required fields are provided in POST requests

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=logo-api:legacy
```

## Support

For technical support or questions about the Mobile Legacy Format API, please contact the development team or refer to the main API documentation.

## Changelog

### Version 2.0.0
- Added comprehensive POST endpoint support
- Enhanced error handling and validation
- Improved performance testing
- Added gradient background support
- Full flip support for layers
- Comprehensive test coverage

### Version 1.0.0
- Initial release with basic GET endpoints
- Legacy format support
- Multilingual support (English/Arabic)
- Pagination support
- Basic error handling
