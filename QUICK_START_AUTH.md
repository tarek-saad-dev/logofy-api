# Quick Start - Fix Authentication Issues

## 🚀 Fast Solution

Your database has schema issues. Here's the quickest fix:

### Step 1: Recreate Users Table

Run this command to recreate the users table with the correct schema:

```bash
npm run migrate:recreate-users
```

**⚠️ Warning:** This will delete all existing users! Only run if you're okay with that.

### Step 2: Test Registration

After running the migration, test registration:

```bash
POST /api/auth/register
{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
}
```

## 📋 What Gets Created

The new `users` table will have:
- ✅ `id` (UUID) - Primary key
- ✅ `email` (TEXT) - Unique, required
- ✅ `name` (TEXT) - Optional
- ✅ `display_name` (TEXT) - Optional
- ✅ `avatar_url` (TEXT) - Optional
- ✅ `password_hash` (TEXT) - For authentication
- ✅ `created_at` (TIMESTAMPTZ) - Auto timestamp
- ✅ `updated_at` (TIMESTAMPTZ) - Auto timestamp

## ✅ Expected Result

After migration, authentication will work perfectly:
- Registration ✅
- Login ✅
- Get current user ✅
- Change password ✅
- Token refresh ✅

## 🧪 Use Postman Collection

Import `auth-api.postman_collection.json` into Postman to test all endpoints easily!

## 📝 Manual Migration (Alternative)

If you can't use npm scripts:

```bash
node api/config/recreate-users-table.js
```

That's it! Your authentication should work after this. 🎉

