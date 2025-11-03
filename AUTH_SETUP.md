# Authentication Setup Instructions

## Quick Fix for Missing `display_name` Column

If you're getting an error about `display_name` column not existing, you need to run the migration:

### Option 1: Run Migration Manually

```bash
npm run migrate:auth
```

### Option 2: Migration Runs Automatically

The migration should run automatically when the server starts in development mode. However, on production (Vercel), you may need to run it manually or ensure it runs on deployment.

### Option 3: Temporary Fallback (Already Implemented)

The User model now has fallback logic to use `name` column if `display_name` doesn't exist. This means:
- ✅ Registration will work even without `display_name` column
- ✅ The code will automatically use `name` column as fallback
- ⚠️ But it's recommended to run the migration to add `display_name` for consistency

## Migration What It Does

The `migrate-auth.js` script:
1. Adds `password_hash` column to `users` table (if missing)
2. Adds `display_name` column to `users` table (if missing)

## Testing

After running the migration, test the registration:

```bash
curl -X POST https://your-api-url.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

## Current Status

✅ Auth routes are registered  
✅ User model handles both `name` and `display_name` columns  
✅ Password hashing is implemented  
✅ JWT token generation is working  
⚠️ Need to ensure `display_name` column exists (run migration)

