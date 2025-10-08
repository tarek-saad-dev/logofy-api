# Mobile Logo Endpoint Category Support

## Overview
The mobile logo endpoint (`POST /api/logo/mobile`) has been updated to support category assignment for logos. Each logo can now be associated with a specific category using a category ID.

## Changes Made

### 1. Request Body Updates
The endpoint now accepts an optional `categoryId` parameter in the request body:

```json
{
  "logoId": "optional-uuid",
  "templateId": "optional-uuid", 
  "userId": "user-identifier",
  "name": "Logo Name",
  "description": "Logo description",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000", // NEW: Optional category UUID
  "canvas": { ... },
  "layers": [ ... ],
  "colorsUsed": [ ... ],
  "alignments": { ... },
  "responsive": { ... },
  "metadata": { ... },
  "export": { ... }
}
```

### 2. Validation
- `categoryId` must be a valid UUID format if provided
- If `categoryId` is not provided, it will be set to `null` in the database
- Invalid UUID format will return a 400 error with message: "categoryId must be a valid UUID"

### 3. Database Storage
- The `category_id` field in the `logos` table is populated with the provided `categoryId`
- If no `categoryId` is provided, `category_id` is set to `null`

### 4. Response Updates
The response now includes the `categoryId` field:

```json
{
  "success": true,
  "data": {
    "logoId": "generated-uuid",
    "templateId": null,
    "userId": "user-id",
    "name": "Logo Name",
    "description": "Logo description",
    "categoryId": "550e8400-e29b-41d4-a716-446655440000", // NEW: Category ID
    "canvas": { ... },
    "layers": [ ... ],
    "colorsUsed": [ ... ],
    "alignments": { ... },
    "responsive": { ... },
    "metadata": { ... },
    "export": { ... }
  }
}
```

## Usage Examples

### Creating a Logo with Category
```javascript
const logoData = {
  name: "My Logo",
  categoryId: "550e8400-e29b-41d4-a716-446655440000",
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid",
      solidColor: "#ffffff"
    }
  },
  layers: [
    {
      type: "text",
      text: {
        value: "My Logo",
        font: "Arial",
        fontColor: "#000000"
      }
    }
  ],
  // ... other fields
};

const response = await fetch('/api/logo/mobile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logoData)
});
```

### Creating a Logo without Category
```javascript
const logoData = {
  name: "My Logo",
  // categoryId omitted - will be set to null
  canvas: {
    aspectRatio: 1.0,
    background: {
      type: "solid", 
      solidColor: "#ffffff"
    }
  },
  layers: [
    {
      type: "text",
      text: {
        value: "My Logo",
        font: "Arial",
        fontColor: "#000000"
      }
    }
  ],
  // ... other fields
};

const response = await fetch('/api/logo/mobile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(logoData)
});
```

## Testing
A test file `test_mobile_category.js` has been created to verify the category functionality:

```bash
node test_mobile_category.js
```

The test covers:
- ✅ Creating logos with valid categoryId
- ✅ Creating logos without categoryId (sets to null)
- ✅ Rejecting invalid categoryId format
- ✅ Verifying categoryId in response

## Database Schema
The implementation uses the existing `category_id` field in the `logos` table:

```sql
CREATE TABLE logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category_id UUID REFERENCES categories(id), -- Used for category assignment
  -- ... other fields
);
```

## Backward Compatibility
This change is fully backward compatible:
- Existing API calls without `categoryId` will continue to work
- The `categoryId` field is optional
- No breaking changes to existing functionality
