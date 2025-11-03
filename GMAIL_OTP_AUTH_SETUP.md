# Gmail OTP Authentication Setup Guide

## Overview

The authentication system now uses **Gmail-only login with OTP (One-Time Password) verification**. Users must:
1. Request a verification code sent to their Gmail
2. Enter the code to login
3. Use the same process for password reset

## Features

✅ **Gmail-only authentication** - Only Gmail addresses are accepted  
✅ **OTP-based login** - No password required for login  
✅ **Password reset via OTP** - Secure password reset via Gmail  
✅ **Rate limiting** - Max 5 OTP requests per hour per email  
✅ **OTP expiration** - Codes expire after 10 minutes  
✅ **Security** - OTPs are single-use and automatically deleted after verification  

## Setup Instructions

### 1. Install Dependencies

```bash
npm install nodemailer
```

### 2. Configure Gmail App Password

You need to create a Gmail App Password (not your regular Gmail password):

1. **Enable 2-Step Verification** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "Logo Maker API" as the name
   - Click "Generate"
   - Copy the 16-character password (it looks like: `abcd efgh ijkl mnop`)

3. **Add to .env file**:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```
   ⚠️ **Important**: Remove spaces from the app password (it's 16 characters without spaces)

### 3. Run Database Migration

The OTP table needs to be created:

```bash
node run_otp_migration.js
```

Or if you prefer:
```bash
npm run migrate:otp
```

### 4. Verify Setup

Check that:
- ✅ OTP table exists in database
- ✅ Gmail credentials are set in .env
- ✅ Server can send test emails

## API Endpoints

### Login Flow

#### Step 1: Request OTP
**POST** `/api/auth/login/request-otp`

Request body:
```json
{
  "email": "user@gmail.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Verification code sent to your Gmail. Please check your inbox."
}
```

#### Step 2: Verify OTP and Login
**POST** `/api/auth/login/verify-otp`

Request body:
```json
{
  "email": "user@gmail.com",
  "code": "123456"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@gmail.com",
      "name": "User Name",
      ...
    },
    "token": "jwt-token-here"
  },
  "message": "Login successful"
}
```

### Password Reset Flow

#### Step 1: Request Password Reset OTP
**POST** `/api/auth/reset-password/request-otp`

Request body:
```json
{
  "email": "user@gmail.com"
}
```

Response:
```json
{
  "success": true,
  "message": "Password reset code sent to your Gmail. Please check your inbox."
}
```

#### Step 2: Verify OTP and Reset Password
**POST** `/api/auth/reset-password/verify-otp`

Request body:
```json
{
  "email": "user@gmail.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

Response:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password."
}
```

### Registration (Still Available)

**POST** `/api/auth/register`

Now requires Gmail email:
```json
{
  "email": "user@gmail.com",
  "password": "password123",
  "name": "User Name"
}
```

## Security Features

1. **Gmail-only validation** - Only `@gmail.com` addresses are accepted
2. **OTP expiration** - Codes expire after 10 minutes
3. **Single-use OTPs** - Each code can only be used once
4. **Rate limiting** - Maximum 5 OTP requests per hour per email
5. **Automatic cleanup** - Expired OTPs are automatically cleaned up
6. **No email enumeration** - Doesn't reveal if email exists (for login)

## OTP Details

- **Length**: 6 digits
- **Expiration**: 10 minutes
- **Format**: Numeric only (e.g., `123456`)
- **Storage**: Database table `otp_codes`
- **Types**: `login` or `reset_password`

## Email Templates

The system sends beautifully formatted HTML emails with:
- ✅ Clear verification code display
- ✅ Expiration warnings
- ✅ Security reminders
- ✅ Professional branding

## Troubleshooting

### Email Not Sending

1. **Check Gmail credentials**:
   - Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` in .env
   - Make sure app password has no spaces
   - Ensure 2-Step Verification is enabled

2. **Check server logs**:
   - Look for email service initialization messages
   - Check for SMTP errors

3. **Test Gmail connection**:
   ```bash
   # You can test by making a request to /api/auth/login/request-otp
   ```

### OTP Not Working

1. **Check expiration**: OTPs expire after 10 minutes
2. **Check format**: Must be exactly 6 digits
3. **Check database**: Verify OTP was stored correctly
4. **Rate limiting**: Check if you've exceeded 5 requests per hour

### Migration Issues

If OTP table migration fails:
```bash
# Check database connection
# Verify DATABASE_URL in .env
# Run migration manually: node run_otp_migration.js
```

## Testing

After setup, test the flow:

1. **Request login OTP**:
   ```bash
   POST /api/auth/login/request-otp
   { "email": "your-email@gmail.com" }
   ```

2. **Check your Gmail inbox** for the 6-digit code

3. **Verify OTP**:
   ```bash
   POST /api/auth/login/verify-otp
   { "email": "your-email@gmail.com", "code": "123456" }
   ```

## Migration from Old System

If you have existing users:
- ✅ Old login endpoint removed (password-based)
- ✅ Users can still register with password (for account creation)
- ✅ All logins now require Gmail OTP
- ✅ Password reset uses Gmail OTP

## Notes

- The old `/api/auth/login` endpoint has been replaced with OTP flow
- Registration still accepts password (for initial account setup)
- After registration, users must use OTP to login
- Password change endpoint still works for authenticated users

