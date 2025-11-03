# Authentication Documentation

This document describes the authentication system implemented for the Logo Maker API.

## Overview

The authentication system uses JWT (JSON Web Tokens) for stateless authentication. Passwords are hashed using bcrypt before being stored in the database.

## Features

- User registration with email and password
- User login with email and password
- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes using authentication middleware
- Current user endpoint
- Password change functionality
- Token refresh endpoint

## Setup

### 1. Install Dependencies

The required packages (`bcrypt` and `jsonwebtoken`) are already installed.

### 2. Environment Variables

Add the following to your `.env` file:

```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Important**: In production, use a strong, random secret key for `JWT_SECRET`. You can generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Database Migration

Run the authentication migration to add the `password_hash` column to the users table:

```bash
npm run migrate:auth
```

Or it will run automatically during database initialization in development mode.

## API Endpoints

### Base URL
All authentication endpoints are prefixed with `/api/auth`

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "display_name": "John",
  "avatar_url": "https://example.com/avatar.jpg" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John",
      "avatar_url": "https://example.com/avatar.jpg",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Validation:**
- Email must be valid format
- Password must be at least 6 characters
- Email must be unique

### Login

**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John",
      "avatar_url": "https://example.com/avatar.jpg",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400`: Email or password missing
- `401`: Invalid email or password

### Get Current User

**GET** `/api/auth/me`

Get the currently authenticated user's information. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "John",
      "avatar_url": "https://example.com/avatar.jpg",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  }
}
```

### Refresh Token

**POST** `/api/auth/refresh`

Get a new JWT token. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

### Change Password

**POST** `/api/auth/change-password`

Change the user's password. Requires authentication.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Missing passwords or new password too short
- `401`: Current password is incorrect

## Using Authentication Middleware

To protect routes, use the `authenticate` middleware:

```javascript
const { authenticate } = require('../middleware/auth');

router.get('/protected-route', authenticate, async (req, res) => {
  // req.user contains the authenticated user
  // req.userId contains the user's ID
  res.json({ message: 'This is a protected route', user: req.user });
});
```

### Optional Authentication

For routes that work with or without authentication:

```javascript
const { optionalAuth } = require('../middleware/auth');

router.get('/public-route', optionalAuth, async (req, res) => {
  // req.user will be set if token is valid, otherwise undefined
  if (req.user) {
    // User is authenticated
  } else {
    // User is not authenticated
  }
});
```

## Error Responses

All authentication endpoints follow the standard error response format:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required or failed)
- `409`: Conflict (email already exists)
- `500`: Internal Server Error

## Security Best Practices

1. **Password Requirements**: Enforce minimum 6 characters (can be increased)
2. **Token Expiration**: Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`)
3. **HTTPS**: Always use HTTPS in production
4. **Secret Key**: Use a strong, random secret for `JWT_SECRET` in production
5. **Password Hashing**: Passwords are hashed with bcrypt (10 salt rounds)
6. **Never Expose Passwords**: Passwords are never returned in API responses

## Client Integration Examples

### JavaScript/Fetch

```javascript
// Register
const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe'
  })
});

const { data } = await registerResponse.json();
const token = data.token;

// Use token for authenticated requests
const meResponse = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Get current user
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Schema

The users table has been extended with:

- `password_hash` (TEXT): Bcrypt hashed password (nullable for backward compatibility)

## Migration Notes

- Existing users without passwords can still use the system (password_hash is nullable)
- Users can add passwords later through the password change endpoint
- The migration is idempotent (safe to run multiple times)

