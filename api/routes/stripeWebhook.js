const express = require('express');
const Stripe = require('stripe');
const { query } = require('../config/database');

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});

// Webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/stripe/webhook
 * 
 * Handles Stripe webhook events for subscription updates
 * 
 * Events handled:
 * - checkout.session.completed: When user completes checkout
 * - customer.subscription.created: When subscription is created
 * - customer.subscription.updated: When subscription is updated
 * - customer.subscription.deleted: When subscription is canceled/deleted
 * 
 * Flow:
 * 1. Verify webhook signature using STRIPE_WEBHOOK_SECRET
 * 2. Handle each event type appropriately
 * 3. Update subscriptions table in database
 * 4. Return 200 on success
 * 
 * IMPORTANT: 
 * - This route must use express.raw() middleware to verify signature
 * - Always enforces signature verification (works with both test and live keys)
 * - For testing, use Stripe Test Mode with test keys and Stripe CLI or Dashboard
 * - To go live, simply swap environment variables from test keys to live keys
 */
router.post(
    '/webhook',
    // Use raw body parser for webhook signature verification
    express.raw({ type: 'application/json' }),
    async(req, res) => {
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            return res.status(400).json({
                success: false,
                message: 'Missing stripe-signature header'
            });
        }

        if (!webhookSecret) {
            console.error('STRIPE_WEBHOOK_SECRET is not configured');
            return res.status(500).json({
                success: false,
                message: 'Webhook secret not configured'
            });
        }

        let event;

        try {
            // Always verify webhook signature (works with both test and live keys)
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                webhookSecret
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).json({
                success: false,
                message: `Webhook Error: ${err.message}`
            });
        }

        // Handle the event
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await handleCheckoutSessionCompleted(event.data.object);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await handleSubscriptionCreatedOrUpdated(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await handleSubscriptionDeleted(event.data.object);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            // Return 200 to acknowledge receipt
            res.json({ received: true });
        } catch (error) {
            console.error('Error handling webhook event:', error);
            // Still return 200 to prevent Stripe from retrying
            // Log the error for manual investigation
            res.status(200).json({
                received: true,
                error: error.message
            });
        }
    }
);

/**
 * Handle checkout.session.completed event
 * 
 * When a user completes checkout, we need to:
 * 1. Get the subscription from the session
 * 2. Upsert subscription data into our database
 */
async function handleCheckoutSessionCompleted(session) {
    if (session.mode !== 'subscription' || !session.subscription) {
        console.log('Checkout session is not a subscription, skipping');
        return;
    }

    console.log(`Processing checkout.session.completed for subscription: ${session.subscription}`);

    try {
        // Retrieve the full subscription object from Stripe
        // This is required because the session object doesn't include subscription details like current_period_end
        // Expand items.data.price to get plan_type from recurring interval
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription, {
                expand: ['items.data.price'] // Expand price to get recurring.interval for plan_type
            }
        );

        // Validate that we got a proper subscription object
        if (!subscription || !subscription.id) {
            throw new Error(`Failed to retrieve subscription ${session.subscription} from Stripe`);
        }

        // Validate that subscription has required fields
        // Sometimes newly created subscriptions might not have current_period_end immediately
        // Retry once after a short delay if it's missing
        if (subscription.current_period_end === undefined || subscription.current_period_end === null) {
            console.warn(`Subscription ${subscription.id} retrieved from Stripe is missing current_period_end, retrying after 1 second...`);
            console.warn(`Subscription object:`, {
                subscription_id: subscription.id,
                status: subscription.status,
                current_period_end: subscription.current_period_end,
                subscription_keys: Object.keys(subscription)
            });

            // Wait 1 second and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            const retrySubscription = await stripe.subscriptions.retrieve(session.subscription);

            if (retrySubscription.current_period_end === undefined || retrySubscription.current_period_end === null) {
                console.error(`Subscription ${subscription.id} still missing current_period_end after retry`);
                throw new Error(`Subscription ${subscription.id} is missing required field: current_period_end (even after retry)`);
            }

            // Use the retried subscription
            subscription.current_period_end = retrySubscription.current_period_end;
            console.log(`Retry successful: subscription ${subscription.id} now has current_period_end: ${subscription.current_period_end}`);
        }

        console.log(`Successfully retrieved subscription ${subscription.id} with current_period_end: ${subscription.current_period_end}`);

        // Get userId from session metadata (most reliable source)
        let userId = null;
        if (session.metadata && session.metadata.userId) {
            userId = session.metadata.userId;
            console.log(`Found userId from checkout session metadata: ${userId}`);
        }

        // If plan_type is in session metadata, add it to subscription metadata for upsertSubscription
        if (session.metadata && session.metadata.plan && !subscription.metadata) {
            subscription.metadata = { plan: session.metadata.plan };
        } else if (session.metadata && session.metadata.plan) {
            subscription.metadata = subscription.metadata || {};
            subscription.metadata.plan = session.metadata.plan;
        }

        // Process the subscription (pass userId if we have it)
        await upsertSubscription(subscription, userId);
    } catch (error) {
        console.error(`Error handling checkout.session.completed for subscription ${session.subscription}:`, error);
        // Re-throw to let the webhook handler know this failed
        // Stripe will retry the webhook if we return a non-200 status
        throw error;
    }
}

/**
 * Handle customer.subscription.created or customer.subscription.updated events
 * 
 * Upsert subscription data into database
 */
async function handleSubscriptionCreatedOrUpdated(subscription) {
    // Ensure we have items expanded to extract plan_type
    // Stripe webhooks usually include items, but if not, retrieve with expansion
    if (!subscription.items || !subscription.items.data || subscription.items.data.length === 0) {
        console.log(`Subscription ${subscription.id} from webhook doesn't have items, retrieving with expansion...`);
        subscription = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ['items.data.price']
        });
    } else if (subscription.items.data[0].price && typeof subscription.items.data[0].price === 'string') {
        // Price is just an ID, need to expand
        console.log(`Subscription ${subscription.id} has price IDs but not expanded, retrieving with expansion...`);
        subscription = await stripe.subscriptions.retrieve(subscription.id, {
            expand: ['items.data.price']
        });
    }
    
    await upsertSubscription(subscription);
}

/**
 * Handle customer.subscription.deleted event
 * 
 * Mark subscription as canceled in database
 */
async function handleSubscriptionDeleted(subscription) {
    try {
        // Update subscription status to canceled
        await query(
            `UPDATE subscriptions 
       SET status = 'canceled', 
           canceled_at = NOW(),
           updated_at = NOW()
       WHERE stripe_sub_id = $1`, [subscription.id]
        );

        console.log(`Subscription ${subscription.id} marked as canceled`);
    } catch (error) {
        console.error('Error handling subscription deleted:', error);
        throw error;
    }
}

/**
 * Upsert subscription data into database
 * 
 * This function:
 * 1. Uses userId if provided (from checkout session metadata - most reliable)
 * 2. Otherwise finds the user by Stripe customer ID (from subscription.customer)
 * 3. If user not found, tries to find by email from customer object
 * 4. Upserts subscription data into subscriptions table
 * 
 * @param {Object} subscription - Stripe subscription object
 * @param {string|null} userId - Optional userId from checkout session metadata
 */
async function upsertSubscription(subscription, userId = null) {
    try {
        // Log subscription data for debugging
        console.log(`Processing subscription ${subscription.id}:`, {
            customer: subscription.customer,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_end_type: typeof subscription.current_period_end,
            canceled_at: subscription.canceled_at,
            canceled_at_type: typeof subscription.canceled_at
        });

        const stripeCustomerId = subscription.customer;
        const stripeSubId = subscription.id;
        const status = mapStripeStatusToDb(subscription.status);

        // Extract plan_type from subscription items
        // Get the billing interval from the first subscription item's price
        let planType = null;
        if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
            const firstItem = subscription.items.data[0];
            if (firstItem.price && firstItem.price.recurring && firstItem.price.recurring.interval) {
                const interval = firstItem.price.recurring.interval.toLowerCase();
                // Map Stripe interval to our plan_type format
                const intervalMap = {
                    'day': 'daily',
                    'week': 'weekly',
                    'month': 'monthly',
                    'year': 'yearly'
                };
                planType = intervalMap[interval] || interval;
                console.log(`Extracted plan_type for subscription ${stripeSubId}: ${planType} (from interval: ${interval})`);
            }
        }

        // If plan_type not found from items, try to get from checkout session metadata
        // This is a fallback for subscriptions created via checkout
        if (!planType && subscription.metadata && subscription.metadata.plan) {
            planType = subscription.metadata.plan;
            console.log(`Extracted plan_type from subscription metadata for ${stripeSubId}: ${planType}`);
        }

        // Parse current_period_end from Stripe timestamp (Unix timestamp in seconds)
        // IMPORTANT: Use Stripe's actual current_period_end, never use created_at
        let currentPeriodEnd = null;
        if (subscription.current_period_end !== undefined && subscription.current_period_end !== null) {
            const periodEndTimestamp = typeof subscription.current_period_end === 'number' ?
                subscription.current_period_end :
                Number(subscription.current_period_end);

            if (!isNaN(periodEndTimestamp) && isFinite(periodEndTimestamp) && periodEndTimestamp > 0) {
                currentPeriodEnd = new Date(periodEndTimestamp * 1000);

                // Validate the Date is valid
                if (isNaN(currentPeriodEnd.getTime())) {
                    console.warn(`Invalid current_period_end Date for subscription ${stripeSubId}, setting to null`);
                    currentPeriodEnd = null;
                } else {
                    console.log(`Parsed current_period_end for subscription ${stripeSubId}: ${currentPeriodEnd.toISOString()}`);
                    // Verify it's not the same as created_at (which would indicate an error)
                    if (subscription.created) {
                        const createdAt = new Date(subscription.created * 1000);
                        const timeDiff = currentPeriodEnd.getTime() - createdAt.getTime();
                        if (Math.abs(timeDiff) < 60000) { // Less than 1 minute difference
                            console.error(`WARNING: current_period_end (${currentPeriodEnd.toISOString()}) is very close to created_at (${createdAt.toISOString()}) for subscription ${stripeSubId}. This may indicate an issue.`);
                        }
                    }
                }
            } else {
                console.warn(`Invalid current_period_end value for subscription ${stripeSubId}, setting to null`);
                currentPeriodEnd = null;
            }
        } else {
            console.warn(`Subscription ${stripeSubId} has no current_period_end, setting to null`);
        }

        // Safely derive canceled_at
        let canceledAt = null;
        if (subscription.canceled_at !== undefined && subscription.canceled_at !== null) {
            const canceledTimestamp = typeof subscription.canceled_at === 'number' ?
                subscription.canceled_at :
                Number(subscription.canceled_at);

            if (!isNaN(canceledTimestamp) && isFinite(canceledTimestamp) && canceledTimestamp > 0) {
                canceledAt = new Date(canceledTimestamp * 1000);

                // Validate the Date is valid
                if (isNaN(canceledAt.getTime())) {
                    console.warn(`Invalid canceled_at Date for subscription ${stripeSubId}, setting to null`);
                    canceledAt = null;
                }
            } else {
                console.warn(`Invalid canceled_at value for subscription ${stripeSubId}, setting to null`);
                canceledAt = null;
            }
        }

        // If userId not provided, try to find user
        if (!userId) {
            // Try to find user by Stripe customer ID in existing subscriptions
            let userResult = await query(
                `SELECT user_id FROM subscriptions 
           WHERE stripe_customer_id = $1 
           ORDER BY created_at DESC 
           LIMIT 1`, [stripeCustomerId]
            );

            if (userResult.rows.length > 0) {
                // Found user from existing subscription
                userId = userResult.rows[0].user_id;
                console.log(`Found userId from existing subscription: ${userId}`);
            }
        }

        if (!userId) {
            // Try to find user by email from Stripe customer
            try {
                const customer = await stripe.customers.retrieve(stripeCustomerId);

                if (customer && !customer.deleted && customer.email) {
                    const emailResult = await query(
                        `SELECT id FROM users WHERE email = $1 LIMIT 1`, [customer.email]
                    );

                    if (emailResult.rows.length > 0) {
                        userId = emailResult.rows[0].id;
                    }
                }
            } catch (customerError) {
                console.warn('Could not retrieve customer from Stripe:', customerError);
            }
        }

        if (!userId) {
            console.warn(`Could not find user for Stripe customer ${stripeCustomerId}`);
            // Still upsert the subscription - we can link it later
            // For now, we'll skip if we can't find the user
            return;
        }

        // Log the values we're about to insert
        console.log(`Inserting subscription ${stripeSubId} with:`, {
            userId,
            stripeCustomerId,
            stripeSubId,
            status,
            planType,
            currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
            canceledAt: canceledAt ? canceledAt.toISOString() : null
        });

        // Upsert subscription using ON CONFLICT
        // Note: plan_type column may not exist yet if migration hasn't been run
        // We'll handle this gracefully by checking if the column exists
        try {
            await query(
                `INSERT INTO subscriptions (
              user_id, 
              stripe_customer_id, 
              stripe_sub_id, 
              status, 
              current_period_end, 
              canceled_at,
              plan_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (stripe_sub_id) 
            DO UPDATE SET
              status = EXCLUDED.status,
              current_period_end = EXCLUDED.current_period_end,
              canceled_at = EXCLUDED.canceled_at,
              plan_type = EXCLUDED.plan_type,
              updated_at = NOW()`, [userId, stripeCustomerId, stripeSubId, status, currentPeriodEnd, canceledAt, planType]
            );
        } catch (error) {
            // If plan_type column doesn't exist, try without it
            if (error.message && error.message.includes('plan_type')) {
                console.warn(`plan_type column not found, inserting without it. Please run migration: add_plan_type_to_subscriptions.sql`);
                await query(
                    `INSERT INTO subscriptions (
                  user_id, 
                  stripe_customer_id, 
                  stripe_sub_id, 
                  status, 
                  current_period_end, 
                  canceled_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (stripe_sub_id) 
                DO UPDATE SET
                  status = EXCLUDED.status,
                  current_period_end = EXCLUDED.current_period_end,
                  canceled_at = EXCLUDED.canceled_at,
                  updated_at = NOW()`, [userId, stripeCustomerId, stripeSubId, status, currentPeriodEnd, canceledAt]
                );
            } else {
                throw error;
            }
        }

        console.log(`Subscription ${stripeSubId} upserted for user ${userId}`);
    } catch (error) {
        console.error('Error upserting subscription:', error);
        throw error;
    }
}

/**
 * Map Stripe subscription status to our database status enum
 */
function mapStripeStatusToDb(stripeStatus) {
    const statusMap = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'canceled', // Map unpaid to canceled
        incomplete: 'canceled', // Map incomplete to canceled
        incomplete_expired: 'canceled', // Map incomplete_expired to canceled
    };

    return statusMap[stripeStatus] || 'canceled';
}

module.exports = router;