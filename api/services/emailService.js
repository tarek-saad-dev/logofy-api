const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email Service
 * Handles sending emails via Gmail SMTP
 */

let transporter = null;

/**
 * Initialize email transporter
 */
function initializeEmailService() {
    // Check if email credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️  Gmail credentials not configured. Email service will not work.');
        console.warn('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
        console.warn('   Get App Password: https://myaccount.google.com/apppasswords');
        transporter = null;
        return false;
    }

    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password, not regular password
            }
        });

        // Test connection
        transporter.verify((error, success) => {
            if (error) {
                console.error('❌ Gmail SMTP connection failed:', error.message);
                console.error('   Please verify GMAIL_USER and GMAIL_APP_PASSWORD are correct');
                transporter = null;
            } else {
                console.log('✅ Email service initialized and verified');
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize email service:', error.message);
        transporter = null;
        return false;
    }
}

/**
 * Send OTP email for login
 * @param {string} to - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>}
 */
async function sendLoginOTP(to, otpCode) {
    // Check if transporter is initialized
    if (!transporter) {
        // Try to initialize
        const initialized = initializeEmailService();
        if (!initialized || !transporter) {
            throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file. Get App Password: https://myaccount.google.com/apppasswords');
        }
    }

    const mailOptions = {
        from: `"Logo Maker" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Your Login Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #4CAF50; text-align: center; padding: 20px; background: white; margin: 20px 0; border-radius: 5px; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Login Verification Code</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>You requested a verification code to login to your Logo Maker account.</p>
                        <p>Your verification code is:</p>
                        <div class="otp-code">${otpCode}</div>
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
                        </div>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <p>Best regards,<br>Logo Maker Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Login Verification Code
            
            Hello,
            
            You requested a verification code to login to your Logo Maker account.
            
            Your verification code is: ${otpCode}
            
            ⚠️ Important: This code will expire in 10 minutes. Do not share this code with anyone.
            
            If you didn't request this code, please ignore this email.
            
            Best regards,
            Logo Maker Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Login OTP email sent to ${to}:`, info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending login OTP email:', error);
        throw error;
    }
}

/**
 * Send password reset OTP email
 * @param {string} to - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>}
 */
async function sendPasswordResetOTP(to, otpCode) {
    // Check if transporter is initialized
    if (!transporter) {
        // Try to initialize
        const initialized = initializeEmailService();
        if (!initialized || !transporter) {
            throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file. Get App Password: https://myaccount.google.com/apppasswords');
        }
    }

    const mailOptions = {
        from: `"Logo Maker" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Password Reset Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #f44336; text-align: center; padding: 20px; background: white; margin: 20px 0; border-radius: 5px; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔒 Password Reset Verification Code</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>You requested to reset your password for your Logo Maker account.</p>
                        <p>Your verification code is:</p>
                        <div class="otp-code">${otpCode}</div>
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
                        </div>
                        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                        <p>Best regards,<br>Logo Maker Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Password Reset Verification Code
            
            Hello,
            
            You requested to reset your password for your Logo Maker account.
            
            Your verification code is: ${otpCode}
            
            ⚠️ Important: This code will expire in 10 minutes. Do not share this code with anyone.
            
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            
            Best regards,
            Logo Maker Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset OTP email sent to ${to}:`, info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending password reset OTP email:', error);
        throw error;
    }
}

/**
 * Send registration OTP email
 * @param {string} to - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<boolean>}
 */
async function sendRegistrationOTP(to, otpCode) {
    // Check if transporter is initialized
    if (!transporter) {
        // Try to initialize
        const initialized = initializeEmailService();
        if (!initialized || !transporter) {
            throw new Error('Email service not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file. Get App Password: https://myaccount.google.com/apppasswords');
        }
    }

    const mailOptions = {
        from: `"Logo Maker" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Verify Your Email - Registration',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #2196F3; text-align: center; padding: 20px; background: white; margin: 20px 0; border-radius: 5px; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Thank you for registering with Logo Maker. Please verify your email address to complete your registration.</p>
                        <p>Your verification code is:</p>
                        <div class="otp-code">${otpCode}</div>
                        <div class="warning">
                            <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
                        </div>
                        <p>If you didn't create an account, please ignore this email.</p>
                        <p>Best regards,<br>Logo Maker Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Verify Your Email - Registration
            
            Hello,
            
            Thank you for registering with Logo Maker. Please verify your email address to complete your registration.
            
            Your verification code is: ${otpCode}
            
            ⚠️ Important: This code will expire in 10 minutes. Do not share this code with anyone.
            
            If you didn't create an account, please ignore this email.
            
            Best regards,
            Logo Maker Team
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Registration OTP email sent to ${to}:`, info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending registration OTP email:', error);
        throw error;
    }
}

/**
 * Verify email format (any valid email, not just Gmail)
 * @param {string} email - Email to verify
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email) return false;
    
    // Check if it's a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Verify Gmail email format (kept for backward compatibility)
 * @param {string} email - Email to verify
 * @returns {boolean}
 */
function isValidGmail(email) {
    if (!email) return false;
    
    // Check if it's a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    // Check if it's a Gmail address
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    return gmailRegex.test(email);
}

// Initialize on module load (but don't fail if credentials not set)
// This allows the server to start even without email config
// The service will initialize when first used
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    initializeEmailService();
} else {
    console.warn('⚠️  Gmail credentials not found in environment variables.');
    console.warn('   Email service will be initialized when first used.');
    console.warn('   Set GMAIL_USER and GMAIL_APP_PASSWORD to enable email sending.');
    console.warn('   Get App Password: https://myaccount.google.com/apppasswords');
}

module.exports = {
    sendLoginOTP,
    sendPasswordResetOTP,
    sendRegistrationOTP,
    isValidEmail,
    isValidGmail,
    initializeEmailService
};

