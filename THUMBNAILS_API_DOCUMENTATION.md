# Logo Thumbnails API Documentation

## Overview
The Logo Thumbnails API provides access to logo thumbnails with support for pagination, category filtering, and multilingual content. This API is designed to efficiently serve logo data for mobile applications and web interfaces.

## Base URL
```
http://localhost:3000/api/logo
```

## Authentication
No authentication required for this endpoint.

## Endpoints

### GET /thumbnails
Retrieves paginated logo thumbnails grouped by category.

#### URL Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `limit` | integer | No | 20 | Number of logos per page |
| `category_id` | UUID | No | null | Filter logos by specific category |
| `lang` | string | No | "en" | Language preference ("en" or "ar") |

#### Example Requests

**Basic Request (English)**
```http
GET /api/logo/thumbnails
```

**With Pagination**
```http
GET /api/logo/thumbnails?page=2&limit=10
```

**Filter by Category**
```http
GET /api/logo/thumbnails?category_id=e8a45f2f-0c09-43dd-9741-fca53a074be8
```

**Arabic Language**
```http
GET /api/logo/thumbnails?lang=ar
```

**Combined Parameters**
```http
GET /api/logo/thumbnails?page=1&limit=5&category_id=e8a45f2f-0c09-43dd-9741-fca53a074be8&lang=ar
```

#### Response Format

**Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Logos fetched successfully",
  "language": "en",
  "direction": "ltr",
  "data": {
    "data": [
      {
        "category": {
          "id": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
          "name": "Gaming"
        },
        "logos": [
          {
            "id": "logo-uuid-1",
            "title": "Gaming Logo 1",
            "description": "A modern gaming logo design",
            "thumbnailUrl": "https://example.com/thumbnails/gaming1.jpg",
            "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
            "categoryName": "Gaming",
            "tags": ["gaming", "modern", "logo"],
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "categoriesCount": 5
    }
  }
}
```

**Arabic Response Example**
```json
{
  "success": true,
  "message": "تم جلب الشعارات بنجاح",
  "language": "ar",
  "direction": "rtl",
  "data": {
    "data": [
      {
        "category": {
          "id": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
          "name": "الألعاب"
        },
        "logos": [
          {
            "id": "logo-uuid-1",
            "title": "شعار ألعاب 1",
            "description": "تصميم شعار ألعاب حديث",
            "thumbnailUrl": "https://example.com/thumbnails/gaming1.jpg",
            "categoryId": "e8a45f2f-0c09-43dd-9741-fca53a074be8",
            "categoryName": "الألعاب",
            "tags": ["ألعاب", "حديث", "شعار"],
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8,
      "categoriesCount": 5
    }
  }
}
```

**Error Response (500 Internal Server Error)**
```json
{
  "success": false,
  "message": "Failed to fetch logo thumbnails",
  "language": "en",
  "direction": "ltr"
}
```

#### Response Fields

**Main Response Object**
| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `message` | string | Success or error message |
| `language` | string | Language of the response ("en" or "ar") |
| `direction` | string | Text direction ("ltr" or "rtl") |
| `data` | object | Contains the actual data and pagination info |

**Data Object**
| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of category groups containing logos |
| `pagination` | object | Pagination information |

**Category Group Object**
| Field | Type | Description |
|-------|------|-------------|
| `category` | object | Category information |
| `logos` | array | Array of logos in this category |

**Category Object**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Category UUID |
| `name` | string | Category name (localized) |

**Logo Object**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Logo UUID |
| `title` | string | Logo title (localized) |
| `description` | string | Logo description (localized) |
| `thumbnailUrl` | string | URL to the logo thumbnail image |
| `categoryId` | string | Category UUID |
| `categoryName` | string | Category name (localized) |
| `tags` | array | Array of tags (localized) |
| `createdAt` | string | Creation timestamp (ISO 8601) |
| `updatedAt` | string | Last update timestamp (ISO 8601) |

**Pagination Object**
| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Number of items per page |
| `total` | integer | Total number of logos across all categories |
| `pages` | integer | Total number of pages |
| `categoriesCount` | integer | Number of categories in current response |

## Language Support

The API supports two languages:
- **English (en)**: Default language, left-to-right text direction
- **Arabic (ar)**: Right-to-left text direction

When `lang=ar` is specified:
- Category names are returned in Arabic
- Logo titles and descriptions are returned in Arabic
- Tags are returned in Arabic
- Response message is in Arabic
- Text direction is set to "rtl"

## Pagination

The API implements cursor-based pagination:
- Use `page` parameter to specify which page to retrieve
- Use `limit` parameter to control page size (max recommended: 50)
- Total count includes logos across all categories
- Categories are grouped and logos within each category are paginated

## Category Filtering

Filter logos by specific category:
- Use `category_id` parameter with a valid UUID
- Only logos from the specified category will be returned
- Pagination still applies to filtered results

## Error Handling

The API returns appropriate HTTP status codes:
- **200 OK**: Successful request
- **500 Internal Server Error**: Server-side error (database issues, etc.)

All error responses include:
- `success: false`
- Error message
- Language and direction information

## Rate Limiting

No rate limiting is currently implemented, but consider implementing it for production use.

## Testing

### Using PowerShell (Windows)
```powershell
# Basic test
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/logo/thumbnails" -Method GET -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
Write-Host "Success: $($json.success)"
Write-Host "Total logos: $($json.data.pagination.total)"

# Test with Arabic
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/logo/thumbnails?lang=ar" -Method GET -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
Write-Host "Arabic message: $($json.message)"

# Test category filtering
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/logo/thumbnails?category_id=e8a45f2f-0c09-43dd-9741-fca53a074be8" -Method GET -UseBasicParsing
$json = $response.Content | ConvertFrom-Json
Write-Host "Gaming logos: $($json.data.pagination.total)"
```

### Using cURL
```bash
# Basic test
curl -X GET "http://localhost:3000/api/logo/thumbnails"

# Test with parameters
curl -X GET "http://localhost:3000/api/logo/thumbnails?page=1&limit=5&lang=ar"

# Test category filtering
curl -X GET "http://localhost:3000/api/logo/thumbnails?category_id=e8a45f2f-0c09-43dd-9741-fca53a074be8"
```

## Database Schema

The API requires the following database tables with multilingual support:

### logos table
```sql
CREATE TABLE logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en VARCHAR(255),
  title_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  thumbnail_url VARCHAR(500),
  category_id UUID REFERENCES categories(id),
  tags_en TEXT[],
  tags_ar TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### categories table
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en VARCHAR(255),
  name_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Scripts

Run these migration scripts to add multilingual support:

1. **logos table migration** (`api/config/migrate-multilingual.sql`):
```sql
ALTER TABLE logos ADD COLUMN IF NOT EXISTS title_en VARCHAR(255);
ALTER TABLE logos ADD COLUMN IF NOT EXISTS title_ar VARCHAR(255);
ALTER TABLE logos ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE logos ADD COLUMN IF NOT EXISTS tags_en TEXT[];
ALTER TABLE logos ADD COLUMN IF NOT EXISTS tags_ar TEXT[];
```

2. **categories table migration** (`api/config/migrate-categories-multilingual.sql`):
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_ar VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_ar TEXT;
```

## Performance Considerations

- The API uses efficient SQL queries with proper indexing
- Pagination prevents large data transfers
- Category grouping reduces redundant data
- Consider implementing caching for frequently accessed data
- Monitor database performance with large datasets

## Security Considerations

- Input validation on query parameters
- SQL injection protection through parameterized queries
- Consider implementing API key authentication for production
- Rate limiting recommended for production deployment

## Changelog

### Version 1.0.0
- Initial implementation of thumbnails API
- Added multilingual support (English/Arabic)
- Implemented pagination and category filtering
- Added comprehensive error handling
- Database schema migration for multilingual columns
