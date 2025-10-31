# Icon Categories System

This document describes the icon categorization system implemented for the Logo Maker API.

## Overview

The icon categories system allows icons to be organized into categories, making it easier for users to search and discover icons. Icons can belong to multiple categories (many-to-many relationship).

## Database Schema

### Tables Created

1. **`icon_categories`** - Stores icon category information
   - `id` (UUID, Primary Key)
   - `name` (TEXT, Unique, Required)
   - `name_en` (TEXT, English name)
   - `name_ar` (TEXT, Arabic name)
   - `description` (TEXT)
   - `description_en` (TEXT, English description)
   - `description_ar` (TEXT, Arabic description)
   - `icon_asset_id` (UUID, References assets.id)
   - `slug` (TEXT, Unique, URL-friendly identifier)
   - `parent_id` (UUID, References icon_categories.id, for nested categories)
   - `sort_order` (INTEGER, for custom sorting)
   - `is_active` (BOOLEAN, default: TRUE)
   - `meta` (JSONB, additional metadata)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. **`icon_category_assignments`** - Junction table for many-to-many relationship
   - `id` (UUID, Primary Key)
   - `icon_id` (UUID, References assets.id, CASCADE DELETE)
   - `category_id` (UUID, References icon_categories.id, CASCADE DELETE)
   - `created_at` (TIMESTAMPTZ)
   - UNIQUE constraint on (icon_id, category_id) to prevent duplicates

### Migration File

Run the migration SQL file to create the tables:
```sql
-- File: api/config/migration_add_icon_categories.sql
```

## API Endpoints

### Icon Categories CRUD

#### GET `/api/icon-categories`
Get all icon categories with optional filtering.

**Query Parameters:**
- `include_inactive` (boolean, default: false) - Include inactive categories
- `include_counts` (boolean, default: true) - Include icon count per category
- `parent_id` (UUID) - Filter by parent category
- `lang` (string, default: 'en') - Language preference ('en' or 'ar')

**Response:**
```json
{
  "success": true,
  "message": "Icon categories fetched successfully",
  "language": "en",
  "direction": "ltr",
  "data": {
    "categories": [
      {
        "id": "...",
        "name": "Business",
        "name_en": "Business",
        "name_ar": "أعمال",
        "description": "...",
        "slug": "business",
        "iconAssetId": null,
        "parentId": null,
        "sortOrder": 1,
        "isActive": true,
        "iconCount": 25,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 10
  }
}
```

#### GET `/api/icon-categories/:id`
Get a specific icon category by ID.

**Query Parameters:**
- `lang` (string, default: 'en') - Language preference

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Business",
    "iconCount": 25,
    ...
  }
}
```

#### POST `/api/icon-categories`
Create a new icon category.

**Request Body:**
```json
{
  "name": "Technology",
  "name_en": "Technology",
  "name_ar": "تقنية",
  "description": "Technology and IT icons",
  "slug": "technology",
  "parent_id": null,
  "sort_order": 2,
  "is_active": true,
  "icon_asset_id": null,
  "meta": {}
}
```

#### PATCH `/api/icon-categories/:id`
Update an existing icon category.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "sort_order": 1
}
```

#### DELETE `/api/icon-categories/:id`
Delete an icon category (only if no icons are assigned).

### Icon-Category Assignments

#### GET `/api/icon-categories/:id/icons`
Get all icons in a specific category.

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `lang` (string, default: 'en')

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "...",
    "categoryName": "Business",
    "icons": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
  }
}
```

#### POST `/api/icon-categories/:id/icons`
Assign one or more icons to a category.

**Request Body:**
```json
{
  "icon_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "categoryId": "...",
    "categoryName": "Business",
    "assignments": [
      {
        "icon_id": "uuid1",
        "assignment_id": "..."
      }
    ],
    "totalAssigned": 3
  }
}
```

#### DELETE `/api/icon-categories/:categoryId/icons/:iconId`
Remove an icon from a category.

#### GET `/api/icon-categories/by-icon/:iconId`
Get all categories for a specific icon.

**Query Parameters:**
- `lang` (string, default: 'en')

**Response:**
```json
{
  "success": true,
  "data": {
    "iconId": "...",
    "iconName": "Icon Name",
    "categories": [
      {
        "id": "...",
        "name": "Business",
        "slug": "business",
        "assignedAt": "..."
      }
    ],
    "total": 2
  }
}
```

### Updated Icon Endpoints

#### GET `/api/logo/icons`
Get all icons (updated to support icon categories).

**New Query Parameters:**
- `icon_category_id` (UUID) - Filter by icon category ID
- `include_categories` (boolean, default: true) - Include categories in icon response

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Icon Name",
      "url": "...",
      "categories": [
        {
          "id": "...",
          "name": "Business",
          "name_en": "Business",
          "name_ar": "أعمال",
          "slug": "business"
        }
      ],
      ...
    }
  ],
  "pagination": {...}
}
```

#### GET `/api/logo/icons/:id`
Get a specific icon (updated to include categories).

**Query Parameters:**
- `include_categories` (boolean, default: true)
- `lang` (string, default: 'en')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Icon Name",
    "categories": [
      {
        "id": "...",
        "name": "Business",
        "slug": "business"
      }
    ],
    ...
  }
}
```

## Usage Examples

### Create a Category
```bash
POST /api/icon-categories
{
  "name": "Business",
  "name_en": "Business",
  "name_ar": "أعمال",
  "description": "Business and professional icons",
  "slug": "business"
}
```

### Assign Icons to Category
```bash
POST /api/icon-categories/{categoryId}/icons
{
  "icon_ids": ["icon-uuid-1", "icon-uuid-2"]
}
```

### Get Icons by Category
```bash
GET /api/icon-categories/{categoryId}/icons?page=1&limit=20
```

### Filter Icons by Category
```bash
GET /api/logo/icons?icon_category_id={categoryId}&include_categories=true
```

### Get Categories for an Icon
```bash
GET /api/icon-categories/by-icon/{iconId}
```

## Sample Data

The migration file includes sample categories:
- Business
- Technology
- Social Media
- Communication
- Finance
- Healthcare
- Education
- Transportation
- Food & Drink
- Sports

## Notes

1. Icons can belong to multiple categories
2. Categories support nested hierarchies via `parent_id`
3. Categories support multilingual names (English and Arabic)
4. Categories can be deactivated without deleting them (`is_active`)
5. Categories are sorted by `sort_order` for custom ordering
6. Icon count is automatically calculated based on assignments

## Migration Instructions

1. Run the migration SQL file:
   ```bash
   psql -U your_user -d your_database -f api/config/migration_add_icon_categories.sql
   ```

2. Or execute via Node.js:
   ```javascript
   const { query } = require('./api/config/database');
   const fs = require('fs');
   const migrationSQL = fs.readFileSync('api/config/migration_add_icon_categories.sql', 'utf8');
   await query(migrationSQL);
   ```

The migration will:
- Create the `icon_categories` table
- Create the `icon_category_assignments` junction table
- Add indexes for performance
- Create triggers for `updated_at` timestamps
- Insert sample categories

