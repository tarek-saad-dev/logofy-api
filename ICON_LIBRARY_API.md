# Icon Library API Documentation

This document describes the icon library API endpoints designed for client-side display of icons in a logo maker application.

## Overview

The icon library API provides comprehensive endpoints for fetching, filtering, and managing icons that can be displayed in a client-side library interface. The API supports pagination, search, filtering by categories, and various sorting options.

## Base URL

All endpoints are prefixed with `/api/logo`

## Endpoints

### 1. Get Icon Library (Main Endpoint)

**GET** `/api/logo/icons/library`

This is the main endpoint for fetching icons optimized for client-side library display.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 100 | Number of icons per page |
| `category` | string | - | Filter by category (e.g., 'navigation', 'user', 'system') |
| `type` | string | - | Filter by type ('vector' or 'raster') |
| `search` | string | - | Search in name, description, tags, and keywords |
| `tags` | string/array | - | Filter by tags (comma-separated or array) |
| `sort` | string | 'popularity' | Sort by: 'popularity', 'newest', 'oldest', 'name', 'category' |
| `order` | string | 'desc' | Sort order: 'asc' or 'desc' |
| `featured` | boolean | false | Show only featured icons |
| `style` | string | - | Filter by style: 'outline', 'filled', 'duotone', 'solid' |
| `lang` | string | 'en' | Language preference |

#### Example Request

```bash
GET /api/logo/icons/library?page=1&limit=20&category=navigation&sort=popularity&featured=true
```

#### Example Response

```json
{
  "success": true,
  "message": "Icon library fetched successfully",
  "data": {
    "icons": [
      {
        "id": "uuid-here",
        "name": "home-icon",
        "url": "https://example.com/icons/home.svg",
        "type": "vector",
        "width": 24,
        "height": 24,
        "hasAlpha": true,
        "vectorSvg": "<svg>...</svg>",
        "dominantColor": "#000000",
        "category": "navigation",
        "tags": ["home", "house", "navigation"],
        "description": "Home icon for navigation",
        "keywords": ["home", "house"],
        "style": "outline",
        "isFeatured": true,
        "isPopular": false,
        "isNew": false,
        "downloadCount": 150,
        "rating": 4.5,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalIcons": 1000,
    "categories": [
      {
        "name": "navigation",
        "count": 50,
        "featuredCount": 10
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "pages": 50,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "availableCategories": ["navigation", "user", "system"],
    "availableTypes": ["vector", "raster"],
    "availableStyles": ["outline", "filled", "duotone", "solid"],
    "sortOptions": [
      { "value": "popularity", "label": "Most Popular" },
      { "value": "newest", "label": "Newest" },
      { "value": "oldest", "label": "Oldest" },
      { "value": "name", "label": "Name A-Z" },
      { "value": "category", "label": "Category" }
    ]
  },
  "metadata": {
    "searchTerm": null,
    "appliedFilters": {
      "category": "navigation",
      "type": null,
      "style": null,
      "featured": true,
      "tags": null
    },
    "sort": {
      "field": "popularity",
      "order": "desc"
    },
    "language": "en"
  }
}
```

### 2. Get Icon Categories

**GET** `/api/logo/icons/categories`

Get all available icon categories with their counts.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeEmpty` | boolean | false | Include categories with no icons |

#### Example Response

```json
{
  "success": true,
  "message": "Icon categories fetched successfully",
  "data": [
    {
      "name": "navigation",
      "totalCount": 50,
      "featuredCount": 10,
      "newCount": 5,
      "vectorCount": 45,
      "rasterCount": 5
    }
  ],
  "totalCategories": 10
}
```

### 3. Get Featured Icons

**GET** `/api/logo/icons/featured`

Get featured/popular icons.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of featured icons to return |

#### Example Response

```json
{
  "success": true,
  "message": "Featured icons fetched successfully",
  "data": [
    {
      "id": "uuid-here",
      "name": "home-icon",
      "url": "https://example.com/icons/home.svg",
      "type": "vector",
      "width": 24,
      "height": 24,
      "hasAlpha": true,
      "vectorSvg": "<svg>...</svg>",
      "dominantColor": "#000000",
      "category": "navigation",
      "tags": ["home", "house", "navigation"],
      "description": "Home icon for navigation",
      "style": "outline",
      "isFeatured": true,
      "isPopular": true,
      "downloadCount": 150,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 20
}
```

### 4. Get All Icons (Basic)

**GET** `/api/logo/icons`

Basic endpoint for fetching all icons with simple filtering.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Icons per page |
| `category` | string | - | Filter by category |
| `type` | string | - | Filter by type |

## Usage Examples

### Client-Side Implementation

```javascript
// Fetch icons for library display
async function fetchIcons(filters = {}) {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    sort: filters.sort || 'popularity',
    order: filters.order || 'desc',
    ...filters
  });
  
  const response = await fetch(`/api/logo/icons/library?${params}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  throw new Error(data.message);
}

// Example usage
const icons = await fetchIcons({
  category: 'navigation',
  featured: true,
  limit: 50
});
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function IconLibrary() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    category: '',
    search: ''
  });

  useEffect(() => {
    fetchIcons();
  }, [filters]);

  const fetchIcons = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/logo/icons/library?${new URLSearchParams(filters)}`);
      const data = await response.json();
      if (data.success) {
        setIcons(data.data.icons);
      }
    } catch (error) {
      console.error('Error fetching icons:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="icon-library">
      {loading ? (
        <div>Loading icons...</div>
      ) : (
        <div className="icons-grid">
          {icons.map(icon => (
            <div key={icon.id} className="icon-item">
              <img src={icon.url} alt={icon.name} />
              <span>{icon.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

Common error codes:
- `validationError`: Invalid request parameters
- `serverError`: Internal server error
- `notFound`: Resource not found

## Performance Considerations

- Use pagination to limit the number of icons returned
- Implement client-side caching for frequently accessed icons
- Use the `featured` filter to show only popular icons on initial load
- Consider implementing infinite scroll with the pagination data

## Database Schema

Icons are stored in the `assets` table with the following structure:

- `id`: UUID primary key
- `kind`: 'vector' or 'raster'
- `name`: Icon name
- `url`: Icon URL
- `width`/`height`: Dimensions
- `has_alpha`: Boolean for transparency
- `vector_svg`: SVG content for vector icons
- `meta`: JSON metadata including:
  - `library_type`: 'icon'
  - `category`: Icon category
  - `tags`: Array of tags
  - `description`: Icon description
  - `style`: Icon style (outline, filled, etc.)
  - `is_featured`: Boolean
  - `is_popular`: Boolean
  - `download_count`: Number of downloads
  - `rating`: User rating
