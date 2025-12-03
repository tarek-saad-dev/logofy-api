# Legacy Mobile Format Endpoints - Request Examples

## 1. PATCH /api/logo/:id/mobile/legacy - Update Logo

### Basic Update (Name and Description Only)

**cURL:**
```bash
curl -X PATCH "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Logo Name",
    "description": "Updated description for the logo"
  }'
```

**JSON Body:**
```json
{
  "name": "Updated Logo Name",
  "description": "Updated description for the logo"
}
```

---

### Complete Update with All Fields

**cURL:**
```bash
curl -X PATCH "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d @update-logo.json
```

**JSON Body (update-logo.json):**
```json
{
  "name": "My Updated Logo",
  "description": "A comprehensive logo update example",
  "name_en": "My Updated Logo",
  "name_ar": "شعاري المحدث",
  "description_en": "A comprehensive logo update example",
  "description_ar": "مثال شامل لتحديث الشعار",
  "tags_en": ["updated", "modern", "design"],
  "tags_ar": ["محدث", "حديث", "تصميم"],
  "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
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
        "value": "Updated Text",
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
    },
    {
      "layerId": "icon-layer-1",
      "type": "icon",
      "visible": true,
      "order": 1,
      "position": {
        "x": 0.5,
        "y": 0.3
      },
      "scaleFactor": 0.8,
      "rotation": 0,
      "opacity": 1.0,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "icon": {
        "src": "star_icon",
        "url": "https://example.com/icons/star.svg",
        "color": "#ffc107"
      }
    },
    {
      "layerId": "image-layer-1",
      "type": "image",
      "visible": true,
      "order": 2,
      "position": {
        "x": 0.5,
        "y": 0.7
      },
      "scaleFactor": 0.6,
      "rotation": 0,
      "opacity": 1.0,
      "flip": {
        "horizontal": false,
        "vertical": false
      },
      "image": {
        "src": "https://example.com/images/logo-image.png",
        "type": "imported",
        "path": "https://example.com/images/logo-image.png"
      }
    },
    {
      "layerId": "shape-layer-1",
      "type": "shape",
      "visible": true,
      "order": 3,
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
      "shape": {
        "src": "assets/local/Basic/13.svg",
        "type": "rect",
        "color": "#000000",
        "strokeColor": "#ffffff",
        "strokeWidth": 2
      }
    },
    {
      "layerId": "background-layer-1",
      "type": "background",
      "visible": true,
      "order": -1,
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
      "background": {
        "type": "solid",
        "color": "#f0f0f0",
        "image": null,
        "repeat": "no-repeat",
        "position": "center",
        "size": "cover"
      }
    }
  ],
  "colorsUsed": [
    {
      "role": "text",
      "color": "#333333"
    },
    {
      "role": "icon",
      "color": "#ffc107"
    },
    {
      "role": "background",
      "color": "#f0f0f0"
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
    "tags": ["updated", "modern", "design", "responsive"],
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

---

### Partial Update (Only Specific Fields)

**cURL:**
```bash
curl -X PATCH "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Name Only",
    "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8"
  }'
```

**JSON Body:**
```json
{
  "name": "New Name Only",
  "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8"
}
```

---

### Update with Gradient Background

**cURL:**
```bash
curl -X PATCH "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "gradient",
        "solidColor": null,
        "gradient": {
          "angle": 90,
          "stops": [
            {
              "color": "#ff0000",
              "position": 0
            },
            {
              "color": "#0000ff",
              "position": 1
            }
          ]
        },
        "image": null
      }
    }
  }'
```

**JSON Body:**
```json
{
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "gradient",
      "solidColor": null,
      "gradient": {
        "angle": 90,
        "stops": [
          {
            "color": "#ff0000",
            "position": 0
          },
          {
            "color": "#0000ff",
            "position": 1
          }
        ]
      },
      "image": null
    }
  }
}
```

---

### Update Only Layers (Replace All Layers)

**cURL:**
```bash
curl -X PATCH "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json" \
  -d '{
    "layers": [
      {
        "type": "text",
        "visible": true,
        "order": 0,
        "position": { "x": 0.5, "y": 0.5 },
        "scaleFactor": 1.0,
        "rotation": 0,
        "opacity": 1.0,
        "flip": { "horizontal": false, "vertical": false },
        "text": {
          "value": "New Text Layer",
          "font": "Helvetica",
          "fontSize": 36,
          "fontColor": "#000000",
          "fontWeight": "normal",
          "fontStyle": "normal",
          "alignment": "center"
        }
      }
    ]
  }'
```

**JSON Body:**
```json
{
  "layers": [
    {
      "type": "text",
      "visible": true,
      "order": 0,
      "position": { "x": 0.5, "y": 0.5 },
      "scaleFactor": 1.0,
      "rotation": 0,
      "opacity": 1.0,
      "flip": { "horizontal": false, "vertical": false },
      "text": {
        "value": "New Text Layer",
        "font": "Helvetica",
        "fontSize": 36,
        "fontColor": "#000000",
        "fontWeight": "normal",
        "fontStyle": "normal",
        "alignment": "center"
      }
    }
  ]
}
```

---

## 2. DELETE /api/logo/:id/mobile/legacy - Delete Logo

### Delete Request (No Body Required)

**cURL:**
```bash
curl -X DELETE "http://localhost:3000/api/logo/bdd8c50a-383c-44c4-a212-ede3c06e6102/mobile/legacy" \
  -H "Content-Type: application/json"
```

**Note:** DELETE requests don't require a request body. The logo ID is provided in the URL path.

---

## Response Examples

### PATCH Success Response

```json
{
  "success": true,
  "message": "Logo updated successfully",
  "data": {
    "logoId": "bdd8c50a-383c-44c4-a212-ede3c06e6102",
    "templateId": null,
    "userId": "user-uuid-here",
    "name": "My Updated Logo",
    "description": "A comprehensive logo update example",
    "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
    "canvas": {
      "aspectRatio": 1.0,
      "background": {
        "type": "solid",
        "solidColor": "#ffffff",
        "gradient": null,
        "image": null
      }
    },
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
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "tags": ["updated", "modern", "design"],
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

### DELETE Success Response

```json
{
  "success": true,
  "message": "Logo deleted successfully",
  "data": {
    "logoId": "bdd8c50a-383c-44c4-a212-ede3c06e6102",
    "name": "My Logo Name"
  },
  "language": "en",
  "direction": "ltr"
}
```

### Error Response (Logo Not Found)

```json
{
  "success": false,
  "message": "Logo not found",
  "language": "en",
  "direction": "ltr"
}
```

### Error Response (Invalid Logo ID)

```json
{
  "success": false,
  "message": "Invalid logo ID format",
  "language": "en",
  "direction": "ltr"
}
```

---

## Postman Collection Format

### PATCH Request
- **Method:** PATCH
- **URL:** `{{baseUrl}}/api/logo/:id/mobile/legacy`
- **Path Variable:** `id` = `bdd8c50a-383c-44c4-a212-ede3c06e6102`
- **Headers:** 
  - `Content-Type: application/json`
- **Body:** (raw JSON) - Use any of the JSON examples above

### DELETE Request
- **Method:** DELETE
- **URL:** `{{baseUrl}}/api/logo/:id/mobile/legacy`
- **Path Variable:** `id` = `bdd8c50a-383c-44c4-a212-ede3c06e6102`
- **Headers:** 
  - `Content-Type: application/json`
- **Body:** None (DELETE doesn't require body)

---

## Notes

1. **Partial Updates:** The PATCH endpoint supports partial updates. You only need to include the fields you want to update.

2. **Layer Replacement:** If you provide a `layers` array, ALL existing layers will be deleted and replaced with the new layers.

3. **UUID Format:** Logo IDs must be valid UUIDs in the format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

4. **Multilingual Support:** You can update multilingual fields (`name_en`, `name_ar`, `description_en`, `description_ar`, `tags_en`, `tags_ar`) independently.

5. **Transaction Safety:** Both endpoints use database transactions, so if any part fails, all changes are rolled back.

6. **Cascade Delete:** When deleting a logo, all associated layers are automatically deleted due to database CASCADE constraints.

