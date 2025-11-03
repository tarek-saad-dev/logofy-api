# Gmail Setup Instructions

## Quick Setup Guide

The error you're seeing means Gmail credentials are not configured. Follow these steps:

## Step 1: Get Gmail App Password

1. **Go to Google Account**: https://myaccount.google.com/
2. **Security Tab**: Click on "Security" in the left sidebar
3. **Enable 2-Step Verification** (if not already enabled):
   - Scroll to "How you sign in to Google"
   - Click "2-Step Verification"
   - Follow the setup process
4. **Create App Password**:
   - Go back to Security page
   - Scroll to "2-Step Verification" section
   - Click "App passwords" (or go directly to: https://myaccount.google.com/apppasswords)
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **Logo Maker API**
   - Click **Generate**
5. **Copy the 16-character password**:
   - It will look like: `abcd efgh ijkl mnop`
   - Copy it (you'll need to remove spaces)

## Step 2: Add to .env File

Open your `.env` file and add:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Important Notes:**
- Use your **Gmail address** (not the app password) for `GMAIL_USER`
- Use the **16-character app password** (remove spaces) for `GMAIL_APP_PASSWORD`
- Do NOT use your regular Gmail password
- The app password should be exactly 16 characters (no spaces)

## Step 3: Restart Server

After adding credentials, restart your server:

```bash
npm run dev
```

Or if using production:
```bash
npm start
```

## Step 4: Verify Setup

Check server logs for:
```
✅ Email service initialized and verified
```

If you see errors, double-check:
- ✅ Gmail address is correct
- ✅ App password has no spaces
- ✅ 2-Step Verification is enabled
- ✅ App password is for "Mail" service

## Common Issues

### "Invalid login" Error
- **Cause**: Wrong app password or Gmail address
- **Fix**: Regenerate app password and verify .env file

### "Email service not configured"
- **Cause**: Missing GMAIL_USER or GMAIL_APP_PASSWORD in .env
- **Fix**: Add both variables to .env file

### "2-Step Verification required"
- **Cause**: 2-Step Verification not enabled
- **Fix**: Enable it first, then create app password

### "Cannot create app password"
- **Cause**: 2-Step Verification not enabled
- **Fix**: Enable 2-Step Verification first

## Testing

After setup, test with:

```bash
POST http://localhost:3000/api/auth/login/request-otp
{
  "email": "your-email@gmail.com"
}
```

Check your Gmail inbox for the 6-digit code.

## Security Note

- ✅ App passwords are safer than regular passwords
- ✅ App passwords can be revoked individually
- ✅ Never commit .env file to git
- ✅ Use different app passwords for different environments

