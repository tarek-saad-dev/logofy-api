const express = require('express');
const { query } = require('../config/database');
const { badRequest, internalError, notFound, ERROR_CODES } = require('../utils/errorHandler');

const router = express.Router();

/**
 * GET /api/subscription-prices
 * 
 * Get the current active subscription prices for the mobile app
 * 
 * This endpoint is public (no authentication required) so the mobile app
 * can fetch prices without user login.
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "weekly_price": 24.99,
 *     "monthly_price": 97.99,
 *     "yearly_price": 999.99,
 *     "trial_days": 3,
 *     "currency": "EGP",
 *     "stripe_weekly_price_id": "price_...",
 *     "stripe_monthly_price_id": "price_...",
 *     "stripe_yearly_price_id": "price_..."
 *   }
 * }
 */
router.get('/', async(req, res) => {
    try {
        // Get the active subscription price configuration
        const result = await query(
            `SELECT 
                weekly_price,
                monthly_price,
                yearly_price,
                trial_days,
                currency,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                updated_at
            FROM subscription_prices
            WHERE is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 1`
        );

        if (result.rows.length === 0) {
            // Return default values if no active price is configured
            return res.json({
                success: true,
                data: {
                    weekly_price: 0.00,
                    monthly_price: 0.00,
                    yearly_price: 0.00,
                    trial_days: 0,
                    currency: 'USD',
                    stripe_weekly_price_id: null,
                    stripe_monthly_price_id: null,
                    stripe_yearly_price_id: null
                },
                message: 'No active subscription prices configured. Using default values.'
            });
        }

        const priceData = result.rows[0];

        res.json({
            success: true,
            data: {
                weekly_price: priceData.weekly_price ? parseFloat(priceData.weekly_price) : null,
                monthly_price: parseFloat(priceData.monthly_price),
                yearly_price: parseFloat(priceData.yearly_price),
                trial_days: priceData.trial_days,
                currency: priceData.currency,
                stripe_weekly_price_id: priceData.stripe_weekly_price_id,
                stripe_monthly_price_id: priceData.stripe_monthly_price_id,
                stripe_yearly_price_id: priceData.stripe_yearly_price_id
            }
        });
    } catch (error) {
        console.error('Error fetching subscription prices:', error);
        return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR,
            'Failed to fetch subscription prices');
    }
});

/**
 * POST /api/subscription-prices
 * 
 * Update subscription prices (for project owner/dashboard)
 * 
 * No authentication required. Public endpoint for updating prices.
 * 
 * Request body:
 * {
 *   "weekly_price": 24.99,
 *   "monthly_price": 97.99,
 *   "yearly_price": 999.99,
 *   "trial_days": 3,
 *   "currency": "EGP",
 *   "stripe_weekly_price_id": "price_...",
 *   "stripe_monthly_price_id": "price_...",
 *   "stripe_yearly_price_id": "price_..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Subscription prices updated successfully",
 *   "data": { ... }
 * }
 */
router.post('/', async(req, res) => {
    try {
        const {
            weekly_price,
            monthly_price,
            yearly_price,
            trial_days,
            currency,
            stripe_weekly_price_id,
            stripe_monthly_price_id,
            stripe_yearly_price_id
        } = req.body;

        // Validate required fields
        if (monthly_price === undefined || monthly_price === null) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'monthly_price is required');
        }

        if (yearly_price === undefined || yearly_price === null) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'yearly_price is required');
        }

        // Validate data types and ranges
        if (weekly_price !== undefined && weekly_price !== null && (typeof weekly_price !== 'number' || weekly_price < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'weekly_price must be a non-negative number');
        }

        if (typeof monthly_price !== 'number' || monthly_price < 0) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'monthly_price must be a non-negative number');
        }

        if (typeof yearly_price !== 'number' || yearly_price < 0) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'yearly_price must be a non-negative number');
        }

        if (trial_days !== undefined && (typeof trial_days !== 'number' || trial_days < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'trial_days must be a non-negative integer');
        }

        if (currency && typeof currency !== 'string') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'currency must be a string');
        }

        // Deactivate all existing active prices
        await query(
            `UPDATE subscription_prices 
            SET is_active = FALSE 
            WHERE is_active = TRUE`
        );

        // Insert new active price configuration
        const result = await query(
            `INSERT INTO subscription_prices (
                weekly_price,
                monthly_price,
                yearly_price,
                trial_days,
                currency,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
            RETURNING 
                weekly_price,
                monthly_price,
                yearly_price,
                trial_days,
                currency,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                created_at,
                updated_at`, [
                weekly_price || null,
                monthly_price,
                yearly_price,
                trial_days || 0,
                currency || 'USD',
                stripe_weekly_price_id || null,
                stripe_monthly_price_id || null,
                stripe_yearly_price_id || null
            ]
        );

        const newPriceData = result.rows[0];

        res.json({
            success: true,
            message: 'Subscription prices updated successfully',
            data: {
                weekly_price: newPriceData.weekly_price ? parseFloat(newPriceData.weekly_price) : null,
                monthly_price: parseFloat(newPriceData.monthly_price),
                yearly_price: parseFloat(newPriceData.yearly_price),
                trial_days: newPriceData.trial_days,
                currency: newPriceData.currency,
                stripe_weekly_price_id: newPriceData.stripe_weekly_price_id,
                stripe_monthly_price_id: newPriceData.stripe_monthly_price_id,
                stripe_yearly_price_id: newPriceData.stripe_yearly_price_id,
                created_at: newPriceData.created_at,
                updated_at: newPriceData.updated_at
            }
        });
    } catch (error) {
        console.error('Error updating subscription prices:', error);
        return internalError(res, ERROR_CODES.GENERAL.INTERNAL_ERROR,
            'Failed to update subscription prices');
    }
});

module.exports = router;