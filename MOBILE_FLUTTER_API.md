## Mobile Flutter API Documentation

This document describes the mobile-focused endpoints, payload shape, and examples for integrating the Logo Maker API in Flutter.

### Base URLs
- Local: `http://localhost:3000`
- Production: `https://logo-maker-endpoints.vercel.app`

### Endpoints Summary
- GET `/api/logo/thumbnails` — Lightweight logo list with thumbnails for home page
- GET `/api/logo/mobile` — Paginated list of logos in mobile shape
- GET `/api/logo/:id/mobile` — Single logo in mobile shape
- GET `/api/logo/:id/mobile-structured` — Single logo with strict/verbose mobile fields
- POST `/api/logo/mobile` — Create a logo from the mobile JSON shape

---

### 1) GET /api/logo/thumbnails (Home page thumbnails)
Perfect for home page logo listings - returns only essential data (ID, title, thumbnail) with category filtering.

Query params:
- `page` (number, default 1, min 1)
- `limit` (number, default 20, max 100)
- `category_id` (string, optional) - Filter by category UUID

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "<uuid>",
      "title": "Logo Name",
      "thumbnailUrl": "https://...",
      "categoryId": "<uuid|null>",
      "categoryName": "Category Name",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 123, "pages": 7 }
}
```

Examples:
```bash
# Get all thumbnails
curl -s http://localhost:3000/api/logo/thumbnails | jq '.data[0]'

# Get thumbnails for specific category
curl -s "http://localhost:3000/api/logo/thumbnails?category_id=123e4567-e89b-12d3-a456-426614174000" | jq '.data'

# Get thumbnails with pagination
curl -s "http://localhost:3000/api/logo/thumbnails?page=2&limit=10" | jq '.pagination'
```

---

### 2) GET /api/logo/mobile (Paginated list)
Returns an array of logos, each in the same shape as the single mobile endpoint.

Query params:
- `page` (number, default 1, min 1)
- `limit` (number, default 20, max 100)

Response:
```json
{
  "success": true,
  "data": [MobileLogo, ...],
  "pagination": { "page": 1, "limit": 20, "total": 123, "pages": 7 }
}
```

MobileLogo schema (core fields):
```json
{
  "logoId": "<uuid>",
  "templateId": "<uuid|null>",
  "userId": "<uuid|null>",
  "name": "string",
  "description": "string",
  "canvas": {
    "aspectRatio": 1.0,
    "background": {
      "type": "solid|gradient|image",
      "solidColor": "#ffffff",
      "gradient": null,
      "image": { "type": "imported", "path": "https://..." } | null
    }
  },
  "layers": [MobileLayer, ...],
  "colorsUsed": [ { "role": "text|icon|shape", "color": "#RRGGBB" } ],
  "alignments": { "verticalAlign": "center", "horizontalAlign": "center" },
  "responsive": {
    "version": "3.0",
    "description": "Fully responsive logo data - no absolute sizes stored",
    "scalingMethod": "scaleFactor",
    "positionMethod": "relative",
    "fullyResponsive": true
  },
  "metadata": { "createdAt": "ISO8601", "updatedAt": "ISO8601", "tags": ["..."], "version": 3, "responsive": true },
  "export": {
    "format": "png",
    "transparentBackground": true,
    "quality": 100,
    "responsive": { "scalable": true, "maintainAspectRatio": true }
  }
}
```

MobileLayer schema (by type):
```json
{
  "layerId": "<uuid>",
  "type": "text|icon|image|shape|background",
  "visible": true,
  "order": 0,
  "position": { "x": 0.5, "y": 0.5 },
  "scaleFactor": 1,
  "rotation": 0,
  "opacity": 1,
  "flip": { "horizontal": false, "vertical": false },
  "text": {
    "value": "Your text",
    "font": "Arial",
    "fontColor": "#000000",
    "fontWeight": "normal",
    "fontStyle": "normal",
    "alignment": "center",
    "lineHeight": 1,
    "letterSpacing": 0
  },
  "icon": {
    "src": "icon_12345",
    "color": "#FF0000"
  },
  "image": {
    "type": "imported",
    "path": "https://..."
  },
  "shape": {
    "type": "rect|ellipse|polygon|path",
    "color": "#000000",
    "strokeColor": "#000000",
    "strokeWidth": 0
  },
  "background": {
    "type": "solid|gradient|image",
    "color": "#ffffff",
    "image": { "type": "imported", "path": "https://..." }
  }
}
```

Notes:
- All numeric fields are returned as numbers, not strings.
- `icon.src` will fallback to `icon_<asset_id>` when a human-readable name is missing.
- `colorsUsed` falls back to computed colors when DB colors array is empty.

Examples:
```bash
curl -s http://localhost:3000/api/logo/mobile | jq '.pagination, .data[0]'
```

---

### 3) GET /api/logo/:id/mobile (Single)
Returns one `MobileLogo` object.

```bash
curl -s http://localhost:3000/api/logo/<UUID>/mobile | jq '.logoId, .layers | length'
```

---

### 4) GET /api/logo/:id/mobile-structured (Single, structured)
Same logical data as above, but includes more verbose joins and exact fields expected for strict validation.

```bash
curl -s http://localhost:3000/api/logo/<UUID>/mobile-structured | jq '.responsive, .export'
```

---

### 5) POST /api/logo/mobile (Create from mobile shape)
Accepts the same `MobileLogo` shape and creates a logo with layers.

Body (example minimal):
```json
{
  "name": "New Mobile Logo",
  "canvas": { "aspectRatio": 1, "background": { "type": "solid", "solidColor": "#ffffff" } },
  "layers": [
    { "type": "text", "position": { "x": 0.5, "y": 0.5 }, "scaleFactor": 1, "rotation": 0, "opacity": 1, "visible": true, "text": { "value": "Hello", "font": "Arial", "fontColor": "#000" } }
  ]
}
```

Response: `201 Created` with the created `MobileLogo`.

---

### Flutter Integration Tips
- Prefer defining Dart models that mirror the schemas above.
- Use `double` for all numeric fields including `position`, `scaleFactor`, `rotation`, `opacity`, `lineHeight`, `letterSpacing`, and `strokeWidth`.
- For pagination, maintain `page` and `limit` in state; continue requesting until `page > pages`.
- Some fields may be nullable; add safe defaults in your UI layer.

Dart model sketch:
```dart
class MobileLogo {
  final String logoId;
  final String? templateId;
  final String? userId;
  final String name;
  final String? description;
  final CanvasData canvas;
  final List<MobileLayer> layers;
  final List<ColorUsed> colorsUsed;
  // ... alignments, responsive, metadata, export
  MobileLogo({required this.logoId, required this.name, required this.canvas, required this.layers, required this.colorsUsed, this.templateId, this.userId, this.description});
}
```

---

### Error Format
```json
{ "success": false, "message": "Error description" }
```

If you need sample payloads or Postman collection exports, see:
- `MOBILE_API_DOCUMENTATION.md`
- `logo-maker-api.postman_collection.json`
