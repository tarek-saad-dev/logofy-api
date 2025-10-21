# 🚀 How to Run the Multilingual Migration

Since the command line tools aren't available in your current environment, here are the steps to run the migration:

## Method 1: Using Postman (Recommended)

1. **Start your API server** (if not already running)
2. **Open Postman** and import the `ULTIMATE_COMPREHENSIVE_POSTMAN_COLLECTION.json`
3. **Run these requests in order:**

### Step 1: Check Migration Status
- **Method:** GET
- **URL:** `{{baseUrl}}/migration/status`
- **Description:** Check if migration is needed

### Step 2: Run Migration (if needed)
- **Method:** POST  
- **URL:** `{{baseUrl}}/migration/multilingual`
- **Body:** `{}` (empty JSON)
- **Description:** Run the multilingual migration

## Method 2: Using curl (if available)

```bash
# Check status
curl -X GET http://localhost:3000/api/migration/status

# Run migration
curl -X POST http://localhost:3000/api/migration/multilingual \
  -H "Content-Type: application/json" \
  -d "{}"
```

## Method 3: Using the existing npm script

If you can access npm/node from a different terminal:

```bash
npm run migrate:multilingual
```

## What the Migration Does

✅ **Adds multilingual columns:**
- `title_en`, `title_ar` - English and Arabic titles
- `description_en`, `description_ar` - English and Arabic descriptions  
- `tags_en`, `tags_ar` - English and Arabic tags

✅ **Creates performance indexes**

✅ **Adds data integrity constraints**

✅ **Creates localized views and functions**

✅ **Maintains backward compatibility**

## After Migration

Once the migration completes successfully, you can:

1. **Test with the multilingual example** in Postman
2. **Create logos with English and Arabic content**
3. **Use all advanced features** (gradients, shape src, etc.)

## Troubleshooting

If the migration fails:
1. Check that your API server is running
2. Verify database connection
3. Check the API logs for detailed error messages

The migration is **safe to run multiple times** - it uses `IF NOT EXISTS` clauses.
