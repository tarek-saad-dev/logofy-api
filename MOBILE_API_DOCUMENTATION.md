# Mobile-Compatible Logo Maker API

This document describes the mobile-compatible endpoints that align with the expected JSON structure for mobile app integration.

## Base URL
```
http://localhost:3000/api
```

## Mobile-Compatible Endpoints

### 1. Get Logo in Mobile Format

**Endpoint:** `GET /api/logo/:id/mobile`

**Description:** Retrieves a logo in the exact JSON format expected by the mobile team.

**Response Format:**
```json
{
  "logoId": "1759094821977",
  "templateId": null,
  "userId": "current_user",
  "name": "My Logo 1759094821974",
  "description": "Logo created on 2025-09-29 00:27:01.974384",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "image",
      "solidColor": null,
      "gradient": null,
      "image": {
        "type": "imported",
        "path": "/data/user/0/com.example.onlyledger/cache/scaled_1000337156.jpg"
      }
    }
  },
  "layers": [
    {
      "layerId": "1759074588677",
      "type": "icon",
      "visible": true,
      "order": 0,
      "position": {
        "x": 0.25,
        "y": 0.5
      },
      "scaleFactor": 0.15,
      "rotation": -25.090909090909083,
      "opacity": 1.0,
      "flip": {
        "horizontal": true,
        "vertical": true
      },
      "icon": {
        "src": "icon_58873",
        "color": "#ffc107"
      }
    },
    {
      "layerId": "1759074588679",
      "type": "text",
      "visible": true,
      "order": 1,
      "position": {
        "x": 0.75,
        "y": 0.5
      },
      "scaleFactor": 0.28,
      "rotation": 0.0,
      "opacity": 1.0,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "text": {
        "value": "hassan",
        "font": "Courier New",
        "fontColor": "#e91e63",
        "fontWeight": "900",
        "fontStyle": "normal",
        "alignment": "center",
        "lineHeight": 1.0,
        "letterSpacing": -2.5
      }
    }
  ],
  "colorsUsed": [
    {
      "role": "icon",
      "color": "#ffc107"
    },
    {
      "role": "text",
      "color": "#e91e63"
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
    "createdAt": "2025-09-29T00:27:01.974384",
    "updatedAt": "2025-09-29T00:27:01.974384",
    "tags": [
      "logo",
      "design",
      "responsive"
    ],
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

### 2. Create Logo from Mobile Format

**Endpoint:** `POST /api/logo/mobile`

**Description:** Creates a new logo from the mobile-compatible JSON format.

**Request Body:** Same format as the response above.

**Response:** Returns the created logo in mobile format.

### 3. Alternative Format Support

**Endpoint:** `GET /api/logo/:id?format=mobile`

**Description:** Alternative way to get mobile format using query parameter.

**Endpoint:** `POST /api/logo?format=mobile`

**Description:** Alternative way to create logo in mobile format using query parameter.

## Layer Types Supported

### 1. Text Layer
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
    "fontColor": "#000000",
    "fontWeight": "normal",
    "fontStyle": "normal",
    "alignment": "center",
    "lineHeight": 1.0,
    "letterSpacing": 0
  }
}
```

### 2. Icon Layer
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
    "src": "icon_name",
    "color": "#ffc107"
  }
}
```

### 3. Image Layer
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
    "src": "image_url",
    "color": null
  }
}
```

### 4. Shape Layer
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
    "type": "rect",
    "color": "#000000",
    "strokeColor": null,
    "strokeWidth": 0
  }
}
```

### 5. Background Layer
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
      "gradient": null,
      "image": {
        "type": "imported",
        "path": "image_path"
      }
    }
  }
}
```

## Colors Used Structure

```json
{
  "colorsUsed": [
    {
      "role": "text|icon|shape|background",
      "color": "#ffc107"
    }
  ]
}
```

## Responsive Structure

```json
{
  "responsive": {
    "version": "3.0",
    "description": "Fully responsive logo data - no absolute sizes stored",
    "scalingMethod": "scaleFactor",
    "positionMethod": "relative",
    "fullyResponsive": true
  }
}
```

## Metadata Structure

```json
{
  "metadata": {
    "createdAt": "2025-09-29T00:27:01.974384",
    "updatedAt": "2025-09-29T00:27:01.974384",
    "tags": ["logo", "design", "responsive"],
    "version": 3,
    "responsive": true
  }
}
```

## Export Structure

```json
{
  "export": {
    "format": "png|svg|jpg",
    "transparentBackground": true,
    "quality": 100,
    "responsive": {
      "scalable": true,
      "maintainAspectRatio": true
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Usage Examples

### Get Logo in Mobile Format
```bash
curl -X GET "http://localhost:3000/api/logo/123/mobile"
```

### Create Logo from Mobile Format
```bash
curl -X POST "http://localhost:3000/api/logo/mobile" \
  -H "Content-Type: application/json" \
  -d '{
    "logoId": "1759094821977",
    "userId": "current_user",
    "name": "My Logo",
    "description": "Logo created on 2025-09-29",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff"
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
  }'
```

## Backward Compatibility

The existing API endpoints remain unchanged and fully functional. The mobile-compatible endpoints are additional endpoints that provide the exact JSON structure expected by the mobile team.

## Migration Notes

- All existing functionality is preserved
- New mobile endpoints are additive, not replacing existing ones
- The mobile format includes all necessary fields from the expected JSON structure
- Default values are provided for optional fields to ensure compatibility
- The API automatically maps between the internal database format and the mobile-compatible format



