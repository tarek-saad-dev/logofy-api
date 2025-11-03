const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * OTP Service
 * Handles generation, storage, and verification of OTP codes
 */

// OTP configuration
const OTP_EXPIRY_MINUTES = 10; // OTP expires after 10 minutes
const OTP_LENGTH = 6; // 6-digit OTP code

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store OTP in database
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @param {string} type - 'login' or 'reset_password'
 * @returns {Promise<void>}
 */
async function storeOTP(email, code, type = 'login') {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Delete any existing OTPs for this email and type
    await query(
        'DELETE FROM otp_codes WHERE email = $1 AND type = $2', [email, type]
    );

    // Insert new OTP
    await query(
        `INSERT INTO otp_codes (email, code, type, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())`, [email, code, type, expiresAt]
    );
}

/**
 * Verify OTP code
 * @param {string} email - User email
 * @param {string} code - OTP code to verify
 * @param {string} type - 'login' or 'reset_password'
 * @returns {Promise<boolean>}
 */
async function verifyOTP(email, code, type = 'login') {
    const result = await query(
        `SELECT * FROM otp_codes 
         WHERE email = $1 AND code = $2 AND type = $3 AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`, [email, code, type]
    );

    if (result.rows.length === 0) {
        return false;
    }

    // Delete the used OTP
    await query(
        'DELETE FROM otp_codes WHERE email = $1 AND code = $2 AND type = $3', [email, code, type]
    );

    return true;
}

/**
 * Check if OTP exists and is valid (without deleting it)
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @param {string} type - 'login' or 'reset_password'
 * @returns {Promise<boolean>}
 */
async function checkOTP(email, code, type = 'login') {
    const result = await query(
        `SELECT * FROM otp_codes 
         WHERE email = $1 AND code = $2 AND type = $3 AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`, [email, code, type]
    );

    return result.rows.length > 0;
}

/**
 * Clean up expired OTPs
 */
async function cleanupExpiredOTPs() {
    await query(
        'DELETE FROM otp_codes WHERE expires_at < NOW()'
    );
}

/**
 * Get remaining attempts for email (rate limiting)
 * @param {string} email - User email
 * @param {string} type - 'login' or 'reset_password'
 * @returns {Promise<number>} - Number of attempts in last hour
 */
async function getOTPAttempts(email, type = 'login') {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const result = await query(
        `SELECT COUNT(*) as count FROM otp_codes
         WHERE email = $1 AND type = $2 AND created_at > $3`, [email, type, oneHourAgo]
    );

    return parseInt(result.rows[0].count);
}

module.exports = {
    generateOTP,
    storeOTP,
    verifyOTP,
    checkOTP,
    cleanupExpiredOTPs,
    getOTPAttempts,
    OTP_EXPIRY_MINUTES,
    OTP_LENGTH
};