const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');
const { getEntitlementForUser } = require('../services/entitlementService');
const User = require('../models/User');

/**
 * Get user data with subscription/plan status
 * This is the single source of truth for user plan information
 * (Same function as in auth.js - duplicated here for independence)
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
 * PATCH /api/user/profile
 * Update authenticated user's profile name
 */
router.patch('/profile', authenticate, async(req, res) => {
    try {
        const { name } = req.body;

        // Validate input
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name is required and must be a non-empty string'
            });
        }

        const trimmedName = name.trim();

        // Update user name (User.update handles both name and display_name)
        const updatedUser = await req.user.update({
            name: trimmedName,
            display_name: trimmedName
        });

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update user profile'
            });
        }

        // Get updated user with subscription status (same format as /api/auth/me)
        const userWithStatus = await getUserWithSubscriptionStatus(updatedUser.id);

        if (!userWithStatus) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch updated user data'
            });
        }

        res.json({
            success: true,
            data: {
                user: userWithStatus
            },
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * DELETE /api/user/delete
 * Permanently delete authenticated user's account and all related data
 */
router.delete('/delete', authenticate, async(req, res) => {
    try {
        const userId = req.user.id;

        // Check if user has active Stripe subscription and cancel it
        try {
            const activeSubscriptions = await query(`
                SELECT stripe_sub_id, stripe_customer_id, status
                FROM subscriptions
                WHERE user_id = $1 
                    AND status IN ('active', 'trialing', 'past_due')
            `, [userId]);

            // Cancel active subscriptions via Stripe API
            if (activeSubscriptions.rows.length > 0 && process.env.STRIPE_SECRET_KEY) {
                const Stripe = require('stripe');
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                    apiVersion: '2024-12-18.acacia',
                });

                for (const sub of activeSubscriptions.rows) {
                    try {
                        // Cancel the subscription immediately
                        await stripe.subscriptions.cancel(sub.stripe_sub_id);
                        console.log(`Cancelled Stripe subscription ${sub.stripe_sub_id} for user ${userId}`);
                    } catch (stripeError) {
                        // Log but don't fail - subscription might already be cancelled
                        console.warn(`Could not cancel Stripe subscription ${sub.stripe_sub_id}:`, stripeError.message);
                    }
                }
            }
        } catch (stripeError) {
            // Log but don't fail - Stripe cancellation is optional
            console.warn('Error cancelling Stripe subscriptions:', stripeError.message);
        }

        // Clean up refresh tokens (they should cascade, but let's be explicit)
        try {
            await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        } catch (tokenError) {
            // Log but don't fail - tokens might not exist or table might not exist
            console.warn('Error deleting refresh tokens:', tokenError.message);
        }

        // Delete user (this will cascade delete:
        // - logos (via owner_id ON DELETE CASCADE)
        // - subscriptions (via user_id ON DELETE CASCADE)
        // - projects (via user_id ON DELETE CASCADE)
        // - layers (via logos cascade)
        // - refresh_tokens (we already cleaned up, but CASCADE will handle if needed)
        const deleted = await req.user.delete();

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete user account'
            });
        }

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user account',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;


