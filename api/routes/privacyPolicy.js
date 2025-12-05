const express = require('express');
const { query } = require('../config/database');
const { badRequest, internalError, notFound, ERROR_CODES } = require('../utils/errorHandler');

const router = express.Router();

/**
 * GET /api/privacy-policy
 * 
 * Get the current active privacy policy content
 * 
 * This endpoint is public (no authentication required) so the mobile app
 * can fetch privacy policy without user login.
 * 
 * Query parameters:
 *   - lang: 'en' or 'ar' (optional, defaults to 'en')
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "content": "Privacy policy content in requested language",
 *     "content_en": "English content",
 *     "content_ar": "Arabic content",
 *     "version": 1,
 *     "updated_at": "2025-01-15T10:30:00.000Z"
 *   }
 * }
 */
router.get('/', async(req, res) => {
    try {
        // Get language from query parameter or default to 'en'
        const lang = (req.query.lang || 'en').toLowerCase();
        const isArabic = lang === 'ar';

        // Get the active privacy policy
        const result = await query(
            `SELECT 
                content_en,
                content_ar,
                version,
                updated_at
            FROM privacy_policy
            WHERE is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 1`
        );

        if (result.rows.length === 0) {
            // Return default values if no active policy is configured
            return res.json({
                success: true,
                data: {
                    content: isArabic ?
                        'هذه هي سياسة الخصوصية الافتراضية. يرجى تحديثها بمحتوى سياسة الخصوصية الفعلي.' : 'This is the default privacy policy. Please update it with your actual privacy policy content.',
                    content_en: 'This is the default privacy policy. Please update it with your actual privacy policy content.',
                    content_ar: 'هذه هي سياسة الخصوصية الافتراضية. يرجى تحديثها بمحتوى سياسة الخصوصية الفعلي.',
                    version: 1,
                    updated_at: new Date().toISOString()
                },
                message: 'No active privacy policy configured. Using default values.'
            });
        }

        const policyData = result.rows[0];

        // Use Arabic content if language is Arabic, otherwise use English
        const content = isArabic ? policyData.content_ar : policyData.content_en;

        res.json({
            success: true,
            data: {
                content: content,
                content_en: policyData.content_en,
                content_ar: policyData.content_ar,
                version: policyData.version,
                updated_at: policyData.updated_at
            }
        });
    } catch (error) {
        console.error('Error fetching privacy policy:', error);
        return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR,
            'Failed to fetch privacy policy');
    }
});

/**
 * PUT /api/privacy-policy
 * 
 * Update privacy policy content (for project owner/dashboard)
 * 
 * No authentication required. Public endpoint for updating privacy policy.
 * 
 * Request body:
 * {
 *   "content_en": "Privacy policy content in English",
 *   "content_ar": "محتوى سياسة الخصوصية بالعربية"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Privacy policy updated successfully",
 *   "data": {
 *     "content_en": "...",
 *     "content_ar": "...",
 *     "version": 2,
 *     "updated_at": "..."
 *   }
 * }
 */
router.put('/', async(req, res) => {
    try {
        const {
            content_en,
            content_ar
        } = req.body;

        // Validate required fields
        if (!content_en || typeof content_en !== 'string' || content_en.trim() === '') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'content_en is required and must be a non-empty string');
        }

        if (!content_ar || typeof content_ar !== 'string' || content_ar.trim() === '') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'content_ar is required and must be a non-empty string');
        }

        // Get current version to increment
        const currentVersionResult = await query(
            `SELECT COALESCE(MAX(version), 0) as max_version 
            FROM privacy_policy`
        );
        const newVersion = ((currentVersionResult.rows[0] && currentVersionResult.rows[0].max_version) ? currentVersionResult.rows[0].max_version : 0) + 1;

        // Deactivate all existing active policies
        await query(
            `UPDATE privacy_policy 
            SET is_active = FALSE 
            WHERE is_active = TRUE`
        );

        // Insert new active policy
        const result = await query(
            `INSERT INTO privacy_policy (
                content_en,
                content_ar,
                version,
                is_active
            ) VALUES ($1, $2, $3, TRUE)
            RETURNING 
                content_en,
                content_ar,
                version,
                created_at,
                updated_at`, [
                content_en.trim(),
                content_ar.trim(),
                newVersion
            ]
        );

        const newPolicyData = result.rows[0];

        res.json({
            success: true,
            message: 'Privacy policy updated successfully',
            data: {
                content_en: newPolicyData.content_en,
                content_ar: newPolicyData.content_ar,
                version: newPolicyData.version,
                created_at: newPolicyData.created_at,
                updated_at: newPolicyData.updated_at
            }
        });
    } catch (error) {
        console.error('Error updating privacy policy:', error);
        return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR,
            'Failed to update privacy policy');
    }
});

module.exports = router;