import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { query } from '../config/database';

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
 * IMPORTANT: This route must use express.raw() middleware to verify signature
 */
router.post(
  '/webhook',
  // Use raw body parser for webhook signature verification
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe-signature header'
      });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
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
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Return 200 to acknowledge receipt
      res.json({ received: true });
    } catch (error: any) {
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
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription' || !session.subscription) {
    console.log('Checkout session is not a subscription, skipping');
    return;
  }

  // Retrieve the full subscription object
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Process the subscription
  await upsertSubscription(subscription);
}

/**
 * Handle customer.subscription.created or customer.subscription.updated events
 * 
 * Upsert subscription data into database
 */
async function handleSubscriptionCreatedOrUpdated(subscription: Stripe.Subscription): Promise<void> {
  await upsertSubscription(subscription);
}

/**
 * Handle customer.subscription.deleted event
 * 
 * Mark subscription as canceled in database
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  try {
    // Find user by Stripe customer ID
    const userResult = await query(
      `SELECT user_id FROM subscriptions 
       WHERE stripe_customer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [subscription.customer as string]
    );

    if (userResult.rows.length === 0) {
      console.warn(`No subscription found for customer ${subscription.customer}`);
      return;
    }

    const userId = userResult.rows[0].user_id;

    // Update subscription status to canceled
    await query(
      `UPDATE subscriptions 
       SET status = 'canceled', 
           canceled_at = NOW(),
           updated_at = NOW()
       WHERE stripe_sub_id = $1`,
      [subscription.id]
    );

    console.log(`Subscription ${subscription.id} marked as canceled for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

/**
 * Upsert subscription data into database
 * 
 * This function:
 * 1. Finds the user by Stripe customer ID (from subscription.customer)
 * 2. If user not found, tries to find by email from customer object
 * 3. Upserts subscription data into subscriptions table
 */
async function upsertSubscription(subscription: Stripe.Subscription): Promise<void> {
  try {
    const stripeCustomerId = subscription.customer as string;
    const stripeSubId = subscription.id;
    const status = mapStripeStatusToDb(subscription.status);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const canceledAt = subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null;

    // Try to find user by Stripe customer ID in existing subscriptions
    let userResult = await query(
      `SELECT user_id FROM subscriptions 
       WHERE stripe_customer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [stripeCustomerId]
    );

    let userId: string | null = null;

    if (userResult.rows.length > 0) {
      // Found user from existing subscription
      userId = userResult.rows[0].user_id;
    } else {
      // Try to find user by email from Stripe customer
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId);
        
        if (customer && !customer.deleted && 'email' in customer && customer.email) {
          const emailResult = await query(
            `SELECT id FROM users WHERE email = $1 LIMIT 1`,
            [customer.email]
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
      // Use a placeholder or skip - for now, we'll skip
      return;
    }

    // Upsert subscription
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
        updated_at = NOW()`,
      [userId, stripeCustomerId, stripeSubId, status, currentPeriodEnd, canceledAt]
    );

    console.log(`Subscription ${stripeSubId} upserted for user ${userId}`);
  } catch (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }
}

/**
 * Map Stripe subscription status to our database status enum
 */
function mapStripeStatusToDb(stripeStatus: Stripe.Subscription.Status): string {
  const statusMap: Record<string, string> = {
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

