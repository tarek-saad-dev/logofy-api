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
 * Query parameters:
 *   - lang: 'en' or 'ar' (optional, defaults to 'en')
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
 *     "stripe_yearly_price_id": "price_...",
 *     "plan_types": {
 *       "pro": { "name_en": "Pro", "name_ar": "احترافي" },
 *       "guest": { "name_en": "Guest", "name_ar": "ضيف" },
 *       "trial": { "name_en": "Trial", "name_ar": "تجربة" }
 *     }
 *   }
 * }
 */
router.get('/', async(req, res) => {
    try {
        // Get language from query parameter or default to 'en'
        const lang = (req.query.lang || 'en').toLowerCase();
        const isArabic = lang === 'ar';

        // Get the active subscription price configuration
        const result = await query(
            `SELECT 
                weekly_price,
                weekly_price_ar,
                monthly_price,
                monthly_price_ar,
                yearly_price,
                yearly_price_ar,
                trial_days,
                currency,
                currency_name_en,
                currency_name_ar,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                updated_at
            FROM subscription_prices
            WHERE is_active = TRUE
            ORDER BY updated_at DESC
            LIMIT 1`
        );

        // Get plan types
        const planTypesResult = await query(
            `SELECT plan_key, name_en, name_ar, description_en, description_ar
            FROM plan_types
            WHERE is_active = TRUE
            ORDER BY plan_key`
        );

        // Build plan types object
        const planTypes = {};
        planTypesResult.rows.forEach(plan => {
            planTypes[plan.plan_key] = {
                name_en: plan.name_en,
                name_ar: plan.name_ar,
                description_en: plan.description_en,
                description_ar: plan.description_ar
            };
        });

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
                    currency_name_en: 'US Dollar',
                    currency_name_ar: 'دولار أمريكي',
                    stripe_weekly_price_id: null,
                    stripe_monthly_price_id: null,
                    stripe_yearly_price_id: null,
                    plan_types: planTypes
                },
                message: 'No active subscription prices configured. Using default values.'
            });
        }

        const priceData = result.rows[0];

        // Use Arabic prices if language is Arabic and Arabic prices exist, otherwise use English
        const weeklyPrice = isArabic && priceData.weekly_price_ar ?
            parseFloat(priceData.weekly_price_ar) :
            (priceData.weekly_price ? parseFloat(priceData.weekly_price) : null);

        const monthlyPrice = isArabic && priceData.monthly_price_ar ?
            parseFloat(priceData.monthly_price_ar) :
            parseFloat(priceData.monthly_price);

        const yearlyPrice = isArabic && priceData.yearly_price_ar ?
            parseFloat(priceData.yearly_price_ar) :
            parseFloat(priceData.yearly_price);

        // Use Arabic currency name if language is Arabic and Arabic name exists, otherwise use English
        const currencyName = isArabic && priceData.currency_name_ar ?
            priceData.currency_name_ar :
            (priceData.currency_name_en || priceData.currency);

        res.json({
            success: true,
            data: {
                weekly_price: weeklyPrice,
                monthly_price: monthlyPrice,
                yearly_price: yearlyPrice,
                trial_days: priceData.trial_days,
                currency: priceData.currency,
                currency_name: currencyName,
                currency_name_en: priceData.currency_name_en || priceData.currency,
                currency_name_ar: priceData.currency_name_ar || priceData.currency,
                stripe_weekly_price_id: priceData.stripe_weekly_price_id,
                stripe_monthly_price_id: priceData.stripe_monthly_price_id,
                stripe_yearly_price_id: priceData.stripe_yearly_price_id,
                plan_types: planTypes
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
 *   "weekly_price_ar": 24.99,
 *   "monthly_price": 97.99,
 *   "monthly_price_ar": 97.99,
 *   "yearly_price": 999.99,
 *   "yearly_price_ar": 999.99,
 *   "trial_days": 3,
 *   "currency": "EGP",
 *   "currency_name_en": "Egyptian Pound",
 *   "currency_name_ar": "جنيه مصري",
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
            weekly_price_ar,
            monthly_price,
            monthly_price_ar,
            yearly_price,
            yearly_price_ar,
            trial_days,
            currency,
            currency_name_en,
            currency_name_ar,
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

        if (weekly_price_ar !== undefined && weekly_price_ar !== null && (typeof weekly_price_ar !== 'number' || weekly_price_ar < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'weekly_price_ar must be a non-negative number');
        }

        if (typeof monthly_price !== 'number' || monthly_price < 0) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'monthly_price must be a non-negative number');
        }

        if (monthly_price_ar !== undefined && monthly_price_ar !== null && (typeof monthly_price_ar !== 'number' || monthly_price_ar < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'monthly_price_ar must be a non-negative number');
        }

        if (typeof yearly_price !== 'number' || yearly_price < 0) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'yearly_price must be a non-negative number');
        }

        if (yearly_price_ar !== undefined && yearly_price_ar !== null && (typeof yearly_price_ar !== 'number' || yearly_price_ar < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'yearly_price_ar must be a non-negative number');
        }

        if (trial_days !== undefined && (typeof trial_days !== 'number' || trial_days < 0)) {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'trial_days must be a non-negative integer');
        }

        if (currency && typeof currency !== 'string') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'currency must be a string');
        }

        if (currency_name_en && typeof currency_name_en !== 'string') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'currency_name_en must be a string');
        }

        if (currency_name_ar && typeof currency_name_ar !== 'string') {
            return badRequest(res, ERROR_CODES.GENERAL.VALIDATION_ERROR,
                'currency_name_ar must be a string');
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
                weekly_price_ar,
                monthly_price,
                monthly_price_ar,
                yearly_price,
                yearly_price_ar,
                trial_days,
                currency,
                currency_name_en,
                currency_name_ar,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
            RETURNING 
                weekly_price,
                weekly_price_ar,
                monthly_price,
                monthly_price_ar,
                yearly_price,
                yearly_price_ar,
                trial_days,
                currency,
                currency_name_en,
                currency_name_ar,
                stripe_weekly_price_id,
                stripe_monthly_price_id,
                stripe_yearly_price_id,
                created_at,
                updated_at`, [
                weekly_price || null,
                weekly_price_ar || null,
                monthly_price,
                monthly_price_ar || null,
                yearly_price,
                yearly_price_ar || null,
                trial_days || 0,
                currency || 'USD',
                currency_name_en || null,
                currency_name_ar || null,
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
                weekly_price_ar: newPriceData.weekly_price_ar ? parseFloat(newPriceData.weekly_price_ar) : null,
                monthly_price: parseFloat(newPriceData.monthly_price),
                monthly_price_ar: newPriceData.monthly_price_ar ? parseFloat(newPriceData.monthly_price_ar) : null,
                yearly_price: parseFloat(newPriceData.yearly_price),
                yearly_price_ar: newPriceData.yearly_price_ar ? parseFloat(newPriceData.yearly_price_ar) : null,
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