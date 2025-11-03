# Recreate Users Table - Migration Guide

## Overview

This migration script recreates the `users` table from scratch with the correct schema for authentication. This fixes all column compatibility issues.

## ⚠️ WARNING

**This will DELETE all existing user data!** Make sure to backup your database before running this migration if you have important user data.

## What This Migration Does

1. **Drops** the existing `users` table (and related foreign keys)
2. **Creates** a new `users` table with proper schema:
   - `id` (UUID, Primary Key)
   - `email` (TEXT, Unique, Not Null)
   - `name` (TEXT, Nullable)
   - `display_name` (TEXT, Nullable)
   - `avatar_url` (TEXT, Nullable)
   - `password_hash` (TEXT, Nullable)
   - `created_at` (TIMESTAMPTZ, Not Null)
   - `updated_at` (TIMESTAMPTZ, Not Null)
3. **Creates** indexes for performance
4. **Sets up** trigger for automatic `updated_at` timestamp

## How to Run

### Option 1: NPM Script (Recommended)

```bash
npm run migrate:recreate-users
```

### Option 2: Direct Node

```bash
node api/config/recreate-users-table.js
```

### Option 3: On Vercel/Production

You may need to run this manually through your database management tool or via a one-time migration endpoint.

## Expected Output

```
🔄 Starting users table recreation...
🗑️  Dropping existing users table...
✅ Old users table dropped
📝 Creating new users table...
📊 Creating indexes...
⚙️  Creating updated_at trigger...
✅ Users table recreated successfully!

📋 Table schema:
   - id (UUID, PRIMARY KEY)
   - email (TEXT, UNIQUE, NOT NULL)
   - name (TEXT, nullable)
   - display_name (TEXT, nullable)
   - avatar_url (TEXT, nullable)
   - password_hash (TEXT, nullable)
   - created_at (TIMESTAMPTZ, NOT NULL)
   - updated_at (TIMESTAMPTZ, NOT NULL)

✅ Ready for authentication!
✅ Migration completed successfully
```

## After Migration

Once the migration completes, test authentication:

```bash
POST /api/auth/register
{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
}
```

## Benefits

✅ **No More Column Errors**: Table schema matches code exactly  
✅ **Proper Types**: UUID for IDs, nullable columns where appropriate  
✅ **Authentication Ready**: password_hash column included  
✅ **Flexible**: Both `name` and `display_name` supported  
✅ **Clean Slate**: No legacy schema issues  

## Troubleshooting

If you get errors:
1. **Connection issues**: Check your DATABASE_URL in .env
2. **Permission errors**: Ensure database user has CREATE/DROP permissions
3. **Foreign key errors**: The script uses CASCADE to handle this

## Alternative: Keep Existing Data

If you need to preserve existing user data, you would need to:
1. Export existing users
2. Run the migration
3. Import users back (converting IDs if needed)

But for a fresh start, this migration is the cleanest solution.

