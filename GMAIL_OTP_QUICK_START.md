# Gmail OTP Authentication - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Install Dependencies ✅
Already done! `nodemailer` is installed.

### Step 2: Get Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select:
   - App: **Mail**
   - Device: **Other (Custom name)**
   - Name: **Logo Maker API**
5. Click **Generate**
6. Copy the **16-character password** (remove spaces)

### Step 3: Configure .env

Add to your `.env` file:
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

⚠️ **Important**: 
- Use your Gmail address (not app password as username)
- Remove spaces from app password
- Use the 16-character app password (not your regular Gmail password)

### Step 4: Run Migration

```bash
npm run migrate:otp
```

Or:
```bash
node run_otp_migration.js
```

### Step 5: Restart Server

```bash
npm run dev
```

## ✅ Testing

### Test Login Flow

1. **Request OTP**:
   ```bash
   POST http://localhost:3000/api/auth/login/request-otp
   {
     "email": "your-email@gmail.com"
   }
   ```

2. **Check Gmail** for 6-digit code

3. **Verify OTP**:
   ```bash
   POST http://localhost:3000/api/auth/login/verify-otp
   {
     "email": "your-email@gmail.com",
     "code": "123456"
   }
   ```

### Test Password Reset

1. **Request Reset OTP**:
   ```bash
   POST http://localhost:3000/api/auth/reset-password/request-otp
   {
     "email": "your-email@gmail.com"
   }
   ```

2. **Check Gmail** for reset code

3. **Reset Password**:
   ```bash
   POST http://localhost:3000/api/auth/reset-password/verify-otp
   {
     "email": "your-email@gmail.com",
     "code": "123456",
     "newPassword": "newpassword123"
   }
   ```

## 📋 Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|--------------|
| `/api/auth/login/request-otp` | POST | Request login OTP |
| `/api/auth/login/verify-otp` | POST | Verify OTP and login |
| `/api/auth/reset-password/request-otp` | POST | Request password reset OTP |
| `/api/auth/reset-password/verify-otp` | POST | Verify OTP and reset password |
| `/api/auth/register` | POST | Register (requires Gmail) |
| `/api/auth/change-password` | POST | Change password (authenticated) |

## 🔒 Security

- ✅ Only Gmail addresses accepted
- ✅ OTP expires in 10 minutes
- ✅ Single-use codes
- ✅ Rate limited (5 requests/hour)
- ✅ No email enumeration

## 🐛 Troubleshooting

### Email Not Sending?

1. Check `.env` has correct Gmail credentials
2. Verify 2-Step Verification is enabled
3. Check app password has no spaces
4. Check server logs for errors

### OTP Not Working?

1. Check code hasn't expired (10 minutes)
2. Verify code is exactly 6 digits
3. Check rate limiting (max 5/hour)
4. Verify database has OTP table

### Routes Not Found?

1. Restart server: `npm run dev`
2. Check routes are loaded in `api/index.js`
3. Verify server is running on correct port

## 📝 Notes

- Old `/api/auth/login` (password-based) is **removed**
- Registration still requires password (for account creation)
- After registration, users **must** use OTP to login
- All emails must be Gmail addresses

Ready to go! 🎉

