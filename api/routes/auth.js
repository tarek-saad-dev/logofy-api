const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { generateOTP, storeOTP, verifyOTP, getOTPWithMetadata, getOTPAttempts, checkOTP } = require('../services/otpService');
const { sendLoginOTP, sendPasswordResetOTP, sendRegistrationOTP, isValidEmail, isValidGmail } = require('../services/emailService');
const { query } = require('../config/database');
const { getEntitlementForUser } = require('../services/entitlementService');

/**
 * Generate short-lived access token for user (15 minutes to 1 hour)
 */
const generateAccessToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    // Default to 1 hour, can be configured via JWT_ACCESS_EXPIRES_IN
    const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
    return jwt.sign({ userId, type: 'access' },
        process.env.JWT_SECRET, { expiresIn }
    );
};

/**
 * Generate long-lived refresh token for user (30 days)
 * This token will be stored in the database
 */
const generateRefreshToken = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    // Use crypto to generate a secure random token
    const crypto = require('crypto');
    return crypto.randomBytes(64).toString('hex');
};

/**
 * Store refresh token in database
 */
const storeRefreshToken = async(userId, refreshToken) => {
    const expiresInDays = parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    try {
        await query(
            `INSERT INTO refresh_tokens (user_id, token, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (token) DO NOTHING`, [userId, refreshToken, expiresAt]
        );
    } catch (error) {
        // If table doesn't exist, try to run migration
        if (error.code === '42P01' && error.message.includes('refresh_tokens')) {
            console.log('⚠️  refresh_tokens table not found, attempting to create it...');
            try {
                const { migrateRefreshTokens } = require('../config/migrate-refresh-tokens');
                await migrateRefreshTokens();
                // Retry the insert
                await query(
                    `INSERT INTO refresh_tokens (user_id, token, expires_at)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (token) DO NOTHING`, [userId, refreshToken, expiresAt]
                );
            } catch (migrationError) {
                console.error('❌ Failed to create refresh_tokens table:', migrationError.message);
                throw new Error('Refresh tokens table not available. Please run migration: POST /api/migration/refresh-tokens');
            }
        } else {
            throw error;
        }
    }

    return expiresAt;
};

/**
 * Verify and get refresh token from database
 */
const verifyRefreshToken = async(refreshToken) => {
    const result = await query(
        `SELECT rt.*, u.id as user_id, u.email
         FROM refresh_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token = $1 
           AND rt.expires_at > NOW() 
           AND rt.revoked = FALSE`, [refreshToken]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0];
};

/**
 * Revoke refresh token
 */
const revokeRefreshToken = async(refreshToken) => {
    await query(
        `UPDATE refresh_tokens 
         SET revoked = TRUE 
         WHERE token = $1`, [refreshToken]
    );
};

/**
 * Revoke all refresh tokens for a user
 */
const revokeAllRefreshTokens = async(userId) => {
    await query(
        `UPDATE refresh_tokens 
         SET revoked = TRUE 
         WHERE user_id = $1`, [userId]
    );
};

/**
 * Generate both access and refresh tokens for a user
 */
const generateTokenPair = async(userId) => {
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(userId, refreshToken);

    return {
        accessToken,
        refreshToken
    };
};

/**
 * Get user data with subscription/plan status
 * This is the single source of truth for user plan information
 */
const getUserWithSubscriptionStatus = async(userId) => {
    try {
        // Get user basic info
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }

        // Get entitlement (pro, trial, or guest)
        const entitlement = await getEntitlementForUser(userId);

        // Get subscription details if user has one
        let subscription = null;
        if (entitlement === 'pro') {
            // Try to select with plan_type, fallback if column doesn't exist
            let subResult;
            try {
                subResult = await query(
                    `SELECT 
                        status, 
                        current_period_end, 
                        stripe_sub_id, 
                        stripe_customer_id,
                        plan_type,
                        created_at,
                        updated_at
                    FROM subscriptions
                    WHERE user_id = $1 
                        AND status IN ('active', 'trialing')
                        AND current_period_end > NOW()
                    ORDER BY current_period_end DESC
                    LIMIT 1`, [userId]
                );
            } catch (error) {
                // If plan_type column doesn't exist, query without it
                if (error.message && error.message.includes('plan_type')) {
                    console.warn('plan_type column not found, querying without it. Please run migration: add_plan_type_to_subscriptions.sql');
                    subResult = await query(
                        `SELECT 
                            status, 
                            current_period_end, 
                            stripe_sub_id, 
                            stripe_customer_id,
                            created_at,
                            updated_at
                        FROM subscriptions
                        WHERE user_id = $1 
                            AND status IN ('active', 'trialing')
                            AND current_period_end > NOW()
                        ORDER BY current_period_end DESC
                        LIMIT 1`, [userId]
                    );
                } else {
                    throw error;
                }
            }

            if (subResult.rows.length > 0) {
                subscription = subResult.rows[0];
                // Ensure plan_type is included (will be null if column doesn't exist)
                if (subscription.plan_type === undefined) {
                    subscription.plan_type = null;
                }
            }
        }

        // Build user object with subscription info
        const userData = user.toJSON();
        return {
            ...userData,
            plan: entitlement, // 'pro', 'trial', or 'guest'
            is_pro: entitlement === 'pro',
            is_trial: entitlement === 'trial',
            is_guest: entitlement === 'guest',
            subscription: subscription
        };
    } catch (error) {
        console.error('Error getting user with subscription status:', error);
        // Return basic user data if subscription check fails
        const user = await User.findById(userId);
        if (!user) return null;
        return {
            ...user.toJSON(),
            plan: 'guest',
            is_pro: false,
            is_trial: false,
            is_guest: true,
            subscription: null
        };
    }
};

/**
 * Generate short-lived JWT token for password reset
 * Valid for 15 minutes
 */
const generateResetToken = (email) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return jwt.sign({ email, type: 'password_reset' },
        process.env.JWT_SECRET, { expiresIn: '15m' }
    );
};

/**
 * POST /api/auth/register
 * Register a new user - Step 1: Send OTP to email
 */
router.post('/register', async(req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check rate limiting (max 5 OTP requests per hour)
        const attempts = await getOTPAttempts(email, 'register');
        if (attempts >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Too many registration attempts. Please try again later.'
            });
        }

        // Generate and store OTP with registration data in metadata
        const otpCode = generateOTP();
        const registrationData = {
            name,
            email,
            password
        };
        await storeOTP(email, otpCode, 'register', registrationData);

        // Send OTP email
        try {
            await sendRegistrationOTP(email, otpCode);
        } catch (emailError) {
            console.error('Error sending registration OTP email:', emailError);

            // Check if it's a configuration error
            if (emailError.message && emailError.message.includes('not configured')) {
                return res.status(500).json({
                    success: false,
                    message: 'Email service not configured. Please contact administrator.',
                    error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to send verification code. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }

        res.json({
            success: true,
            message: 'Verification code sent to your email. Please check your inbox to complete registration.'
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send verification code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/register/verify-otp
 * Register a new user - Step 2: Verify OTP and create account
 * Only requires email and code - registration data is retrieved from stored metadata
 */
router.post('/register/verify-otp', async(req, res) => {
    try {
        const { email, code } = req.body;

        // Validation
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code format. Code must be 6 digits.'
            });
        }

        // Get OTP with metadata (before deletion)
        const otpRecord = await getOTPWithMetadata(email, code, 'register');

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Extract registration data from metadata
        const registrationData = otpRecord.metadata;
        if (!registrationData || !registrationData.name || !registrationData.email || !registrationData.password) {
            return res.status(400).json({
                success: false,
                message: 'Registration data not found. Please start the registration process again.'
            });
        }

        const { name, password } = registrationData;

        // Verify OTP (this will delete it)
        const isValid = await verifyOTP(email, code, 'register');
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Check if user already exists (double check)
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = await User.create({
            email,
            password,
            name,
            display_name: name
        });

        // Generate token pair
        const { accessToken, refreshToken } = await generateTokenPair(newUser.id);

        // Get user with subscription status (single source of truth)
        const userWithStatus = await getUserWithSubscriptionStatus(newUser.id);

        // Return user data (without password) and tokens
        res.status(201).json({
            success: true,
            data: {
                user: userWithStatus,
                access_token: accessToken,
                refresh_token: refreshToken
            },
            message: 'User registered successfully'
        });
    } catch (error) {
        console.error('Error verifying registration OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await user.verifyPassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token pair
        const { accessToken, refreshToken } = await generateTokenPair(user.id);

        // Get user with subscription status (single source of truth)
        const userWithStatus = await getUserWithSubscriptionStatus(user.id);

        // Return user data and tokens
        res.json({
            success: true,
            data: {
                user: userWithStatus,
                access_token: accessToken,
                refresh_token: refreshToken
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/login/request-otp
 * Request OTP code for login (Gmail only)
 */
router.post('/login/request-otp', async(req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check rate limiting (max 5 OTP requests per hour)
        const attempts = await getOTPAttempts(email, 'login');
        if (attempts >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Too many OTP requests. Please try again later.'
            });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            // For security, don't reveal if user exists, but still send success message
            // This prevents email enumeration attacks
            return res.json({
                success: true,
                message: 'If this email exists, a verification code will be sent to your Gmail.'
            });
        }

        // Generate and store OTP
        const otpCode = generateOTP();
        await storeOTP(email, otpCode, 'login');

        // Send OTP email
        try {
            await sendLoginOTP(email, otpCode);
        } catch (emailError) {
            console.error('Error sending OTP email:', emailError);

            // Check if it's a configuration error
            if (emailError.message && emailError.message.includes('not configured')) {
                return res.status(500).json({
                    success: false,
                    message: 'Email service not configured. Please contact administrator.',
                    error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to send verification code. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }

        res.json({
            success: true,
            message: 'Verification code sent to your Gmail. Please check your inbox.'
        });
    } catch (error) {
        console.error('Error requesting login OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send verification code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/login/verify-otp
 * Verify OTP code and login (Gmail only)
 */
router.post('/login/verify-otp', async(req, res) => {
    try {
        const { email, code } = req.body;

        // Validation
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        // Validate Gmail email
        if (!isValidGmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Only Gmail addresses are allowed'
            });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code format. Code must be 6 digits.'
            });
        }

        // Verify OTP
        const isValid = await verifyOTP(email, code, 'login');

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate token pair
        const { accessToken, refreshToken } = await generateTokenPair(user.id);

        // Get user with subscription status (single source of truth)
        const userWithStatus = await getUserWithSubscriptionStatus(user.id);

        // Return user data and tokens
        res.json({
            success: true,
            data: {
                user: userWithStatus,
                access_token: accessToken,
                refresh_token: refreshToken
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Error verifying login OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/auth/me
 * Get current authenticated user with subscription status
 * This is the single source of truth for user plan information
 */
router.get('/me', authenticate, async(req, res) => {
    try {
        // Get user with subscription status (single source of truth)
        const userWithStatus = await getUserWithSubscriptionStatus(req.user.id);

        if (!userWithStatus) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: userWithStatus
            }
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user information',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * This endpoint does NOT require authentication - it accepts refresh_token only
 * Works even if access_token is expired
 */
router.post('/refresh', async(req, res) => {
    try {
        const { refresh_token } = req.body;

        // Validation
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token from database
        const tokenRecord = await verifyRefreshToken(refresh_token);

        if (!tokenRecord) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }

        // Revoke the old refresh token (token rotation for security)
        await revokeRefreshToken(refresh_token);

        // Generate new token pair
        const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(tokenRecord.user_id);

        res.json({
            success: true,
            data: {
                access_token: accessToken,
                refresh_token: newRefreshToken
            },
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/reset-password/request-otp
 * Request OTP code for password reset (Gmail only)
 */
router.post('/reset-password/request-otp', async(req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check rate limiting (max 5 OTP requests per hour)
        const attempts = await getOTPAttempts(email, 'reset_password');
        if (attempts >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Too many password reset requests. Please try again later.'
            });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            // Don't reveal if user exists for security
            return res.json({
                success: true,
                message: 'If this email exists, a password reset code will be sent to your email.'
            });
        }

        // Generate and store OTP
        const otpCode = generateOTP();
        await storeOTP(email, otpCode, 'reset_password');

        // Send OTP email
        try {
            await sendPasswordResetOTP(email, otpCode);
        } catch (emailError) {
            console.error('Error sending password reset OTP email:', emailError);

            // Check if it's a configuration error
            if (emailError.message && emailError.message.includes('not configured')) {
                return res.status(500).json({
                    success: false,
                    message: 'Email service not configured. Please contact administrator.',
                    error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to send verification code. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }

        res.json({
            success: true,
            message: 'Password reset code sent to your email. Please check your inbox.'
        });
    } catch (error) {
        console.error('Error requesting password reset OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send password reset code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/verify-reset-code
 * Verify reset code and return temporary token - Step 1: Verify OTP code
 */
router.post('/verify-reset-code', async(req, res) => {
    try {
        const { email, code } = req.body;

        // Validation
        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Email and verification code are required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code format. Code must be 6 digits.'
            });
        }

        // Check if OTP is valid (without deleting it)
        const isValid = await checkOTP(email, code, 'reset_password');

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code. Please request a new code.'
            });
        }

        // Check if user exists
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate short-lived reset token (15 minutes)
        const resetToken = generateResetToken(email);

        res.json({
            success: true,
            message: 'Code verified successfully.',
            data: {
                token: resetToken
            }
        });
    } catch (error) {
        console.error('Error verifying reset code:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify reset code',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using temporary token - Step 2: Reset password with token
 */
router.post('/reset-password', async(req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validation
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        // Validate password
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Verify and decode reset token
        let decoded;
        try {
            if (!process.env.JWT_SECRET) {
                throw new Error('JWT_SECRET is not set in environment variables');
            }
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Reset token has expired. Please verify your code again.'
                });
            }
            if (tokenError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid reset token'
                });
            }
            throw tokenError;
        }

        // Verify token type
        if (decoded.type !== 'password_reset') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        const email = decoded.email;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify that a valid OTP still exists for this email (to ensure it wasn't already used)
        // This prevents token reuse and ensures the OTP can only be used once
        const otpCheck = await query(
            `SELECT * FROM otp_codes 
             WHERE email = $1 AND type = $2 AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`, [email, 'reset_password']
        );

        if (otpCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Reset code has already been used or expired. Please request a new code.'
            });
        }

        // Delete all OTPs for this email and type (consume the OTP)
        await query(
            'DELETE FROM otp_codes WHERE email = $1 AND type = $2', [email, 'reset_password']
        );

        // Update password
        await user.update({ password: newPassword });

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/reset-password/verify-otp
 * @deprecated This endpoint is deprecated. Use /api/auth/verify-reset-code and /api/auth/reset-password instead.
 * Verify OTP code and set new password in a single request
 */
router.post('/reset-password/verify-otp', async(req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        // Validation
        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, verification code, and new password are required'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Validate OTP format
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code format. Code must be 6 digits.'
            });
        }

        // Validate password
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Verify OTP (this will delete it if valid)
        const isValid = await verifyOTP(email, code, 'reset_password');

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code. Please request a new code.'
            });
        }

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password
        await user.update({ password: newPassword });

        res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authenticate, async(req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Verify current password
        const isPasswordValid = await req.user.verifyPassword(currentPassword);

        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        await req.user.update({ password: newPassword });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user by revoking refresh token(s)
 * Can revoke a specific refresh token or all tokens for the user
 */
router.post('/logout', authenticate, async(req, res) => {
    try {
        const { refresh_token, revoke_all } = req.body;
        const userId = req.user.id;

        // If revoke_all is true, revoke all refresh tokens for this user
        if (revoke_all === true || revoke_all === 'true') {
            await revokeAllRefreshTokens(userId);

            return res.json({
                success: true,
                message: 'All refresh tokens revoked successfully. User logged out from all devices.'
            });
        }

        // If specific refresh_token provided, revoke only that one
        if (refresh_token) {
            // Verify the token belongs to this user
            const tokenRecord = await verifyRefreshToken(refresh_token);

            if (!tokenRecord || tokenRecord.user_id !== userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid refresh token'
                });
            }

            await revokeRefreshToken(refresh_token);

            return res.json({
                success: true,
                message: 'Refresh token revoked successfully. User logged out.'
            });
        }

        // If no refresh_token provided and revoke_all is false, revoke all tokens
        await revokeAllRefreshTokens(userId);

        res.json({
            success: true,
            message: 'All refresh tokens revoked successfully. User logged out.'
        });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to logout',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;