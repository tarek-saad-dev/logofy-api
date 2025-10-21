# Multilingual Support Documentation

This document describes the multilingual support implementation for the Logo Maker API, which allows storing and retrieving logos, categories, and assets in both English and Arabic.

## Overview

The multilingual feature provides:
- **Dual Language Storage**: Store content in both English and Arabic
- **Language-based Retrieval**: Get content in the requested language with fallback support
- **RTL Support**: Proper right-to-left text direction for Arabic content
- **Backward Compatibility**: Existing single-language data continues to work

## Supported Languages

- **English (en)**: Default language
- **Arabic (ar)**: Full RTL support

## Database Schema Changes

### New Columns Added

#### Logos Table
- `title_en` - English title
- `title_ar` - Arabic title
- `description_en` - English description
- `description_ar` - Arabic description
- `tags_en` - English tags (JSONB array)
- `tags_ar` - Arabic tags (JSONB array)

#### Categories Table
- `name_en` - English name
- `name_ar` - Arabic name
- `description_en` - English description
- `description_ar` - Arabic description

#### Assets Table
- `name_en` - English name
- `name_ar` - Arabic name
- `description_en` - English description
- `description_ar` - Arabic description
- `tags_en` - English tags (JSONB array)
- `tags_ar` - Arabic tags (JSONB array)

#### Templates Table
- `title_en` - English title
- `title_ar` - Arabic title
- `description_en` - English description
- `description_ar` - Arabic description

### Database Functions

#### `get_localized_text(text_en, text_ar, fallback, language)`
Returns the appropriate text based on language preference with fallback support.

#### `get_localized_tags(tags_en, tags_ar, fallback, language)`
Returns the appropriate tags array based on language preference with fallback support.

### Database Views

- `localized_logos` - View with all multilingual logo fields
- `localized_categories` - View with all multilingual category fields
- `localized_assets` - View with all multilingual asset fields
- `localized_templates` - View with all multilingual template fields

## API Usage

### Language Detection

The API detects the requested language through:
1. Query parameter: `?lang=en` or `?lang=ar`
2. Accept-Language header
3. Defaults to English if not specified

### Creating Multilingual Content

#### Logo Creation

```javascript
// POST /api/logo
{
  "title": "My Logo",           // Legacy field (fallback)
  "title_en": "My Logo",        // English title
  "title_ar": "شعاري",          // Arabic title
  "description": "A beautiful logo",
  "description_en": "A beautiful logo",
  "description_ar": "شعار جميل",
  "tags": ["logo", "design"],
  "tags_en": ["logo", "design"],
  "tags_ar": ["شعار", "تصميم"],
  // ... other fields
}
```

#### Category Creation

```javascript
// POST /api/categories
{
  "name": "Business",           // Legacy field (fallback)
  "name_en": "Business",        // English name
  "name_ar": "أعمال",           // Arabic name
  "description": "Business related logos",
  "description_en": "Business related logos",
  "description_ar": "شعارات متعلقة بالأعمال"
}
```

### Retrieving Localized Content

#### Get Logo in English
```bash
GET /api/logo/{id}?lang=en
```

#### Get Logo in Arabic
```bash
GET /api/logo/{id}?lang=ar
```

#### Response Format

```javascript
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Logo",           // Localized based on lang parameter
    "description": "A beautiful logo",
    "category_name": "Business",
    "language": "en",             // Requested language
    "direction": "ltr",           // Text direction
    "tags": ["logo", "design"],
    // ... other fields
  }
}
```

### Supported Endpoints

All logo and category endpoints support the `lang` query parameter:

- `GET /api/logo/{id}?lang=ar`
- `GET /api/logo/thumbnails?lang=ar`
- `GET /api/logo/mobile?lang=ar`
- `GET /api/logo/{id}/mobile?lang=ar`
- `GET /api/categories?lang=ar`
- `GET /api/categories/{id}?lang=ar`

## Migration

### Running the Migration

```bash
# Run the multilingual migration
npm run migrate:multilingual

# Or directly
npm run db:migrate:multilingual
```

### Migration Process

1. Adds multilingual columns to existing tables
2. Creates database functions for text localization
3. Creates views for easy multilingual queries
4. Adds constraints to ensure data integrity
5. Creates indexes for performance

## Fallback Behavior

The API implements intelligent fallback:

1. **For Arabic requests (`lang=ar`)**:
   - Arabic text → English text → Legacy text
   
2. **For English requests (`lang=en`)**:
   - English text → Legacy text

3. **For no language specified**:
   - Defaults to English fallback behavior

## Testing

### Run Multilingual Tests

```bash
# Test logo multilingual functionality
npm run test:multilingual

# Test category multilingual functionality
npm run test:categories-multilingual
```

### Test Coverage

- ✅ Multilingual logo creation
- ✅ Language-specific retrieval
- ✅ Fallback behavior
- ✅ RTL direction support
- ✅ All endpoint language support
- ✅ Mobile format localization

## Examples

### Creating a Logo with Both Languages

```javascript
const logoData = {
  title_en: "Tech Startup Logo",
  title_ar: "شعار شركة تقنية ناشئة",
  description_en: "Modern logo for tech companies",
  description_ar: "شعار عصري للشركات التقنية",
  tags_en: ["tech", "startup", "modern"],
  tags_ar: ["تقنية", "ناشئة", "عصري"],
  canvas_w: 1080,
  canvas_h: 1080,
  layers: []
};

const response = await fetch('/api/logo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logoData)
});
```

### Retrieving in Different Languages

```javascript
// English
const enResponse = await fetch('/api/logo/123?lang=en');
const enData = await enResponse.json();
console.log(enData.data.title); // "Tech Startup Logo"

// Arabic
const arResponse = await fetch('/api/logo/123?lang=ar');
const arData = await arResponse.json();
console.log(arData.data.title); // "شعار شركة تقنية ناشئة"
console.log(arData.data.direction); // "rtl"
```

## Best Practices

1. **Always provide both languages** when creating content
2. **Use the `lang` parameter** consistently in API calls
3. **Handle RTL direction** in your frontend for Arabic content
4. **Test fallback behavior** when one language is missing
5. **Use the language metadata** (`language`, `direction`) in your UI

## Troubleshooting

### Common Issues

1. **Migration not applied**: Run `npm run migrate:multilingual`
2. **Missing language data**: Check that both `_en` and `_ar` fields are provided
3. **RTL not working**: Ensure you're using the `direction` field in your CSS
4. **Fallback not working**: Verify the fallback logic in the API responses

### Debugging

Enable detailed logging by setting the environment variable:
```bash
DEBUG=logo-api:* npm start
```

## Future Enhancements

- Support for additional languages
- Automatic translation integration
- Language-specific search
- Bulk language updates
- Language-specific validation rules
