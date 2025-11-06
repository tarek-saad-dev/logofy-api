const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { generateOTP, storeOTP, verifyOTP, getOTPWithMetadata, getOTPAttempts } = require('../services/otpService');
const { sendLoginOTP, sendPasswordResetOTP, sendRegistrationOTP, isValidEmail, isValidGmail } = require('../services/emailService');

/**
 * Generate JWT token for user
 */
const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not set in environment variables');
    }
    return jwt.sign({ userId },
        process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
            return res.status(401).json({
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
            return res.status(401).json({
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

        // Generate token
        const token = generateToken(newUser.id);

        // Return user data (without password) and token
        res.status(201).json({
            success: true,
            data: {
                user: newUser.toJSON(),
                token
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
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isPasswordValid = await user.verifyPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Return user data and token
        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                token
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
            return res.status(401).json({
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

        // Generate token
        const token = generateToken(user.id);

        // Return user data and token
        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                token
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
 * Get current authenticated user
 */
router.get('/me', authenticate, async(req, res) => {
    try {
        // User is already attached to req by authenticate middleware
        res.json({
            success: true,
            data: {
                user: req.user.toJSON()
            }
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user information'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (optional - can be implemented later)
 */
router.post('/refresh', authenticate, async(req, res) => {
    try {
        // Generate new token
        const token = generateToken(req.user.id);

        res.json({
            success: true,
            data: {
                token
            },
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
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
 * POST /api/auth/reset-password/verify-otp
 * Verify OTP code and set new password - Step 2: Verify OTP and set password
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
            return res.status(401).json({
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
            return res.status(401).json({
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

module.exports = router;