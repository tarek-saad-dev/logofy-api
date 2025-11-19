const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/billing/create-checkout-session
 * 
 * Creates a Stripe Checkout Session for subscription
 * 
 * Request body:
 *   { "plan": "weekly" | "monthly" | "yearly" }
 * 
 * Response:
 *   { "url": "https://checkout.stripe.com/..." }
 * 
 * Flow:
 * 1. Read logged-in user from req.user (set by auth middleware)
 * 2. Get plan from request body
 * 3. Map plan to Stripe price ID from environment variables
 * 4. Create Stripe Checkout Session
 * 5. Return checkout URL
 */
router.post('/create-checkout-session', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Validate plan
    if (!plan || !['weekly', 'monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be "weekly", "monthly", or "yearly"'
      });
    }

    // Validate user
    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Map plan to Stripe price ID from environment variables
    const priceIdMap = {
      weekly: process.env.STRIPE_PRICE_WEEKLY || '',
      monthly: process.env.STRIPE_PRICE_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_YEARLY || ''
    };

    const priceId = priceIdMap[plan];

    if (!priceId) {
      return res.status(500).json({
        success: false,
        message: `Stripe price ID not configured for plan: ${plan}`
      });
    }

    // Get public API URL for success/cancel redirects
    // This should be the same domain that Stripe can call via webhooks
    const baseUrl = process.env.API_PUBLIC_URL || 'https://logofy-api.vercel.app';
    const successUrl = `${baseUrl}/billing/success`;
    const cancelUrl = `${baseUrl}/billing/cancel`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        userId: userId,
        plan: plan,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    // Return checkout URL
    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /billing/success
 * 
 * Simple HTML page shown after successful payment
 * Mobile app users will see this page, then the app can check subscription status
 */
router.get('/success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Success</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            text-align: center;
            padding: 40px 20px;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          h1 {
            color: #10b981;
            font-size: 2.5em;
            margin: 0 0 20px 0;
          }
          p {
            color: #6b7280;
            font-size: 1.1em;
            line-height: 1.6;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ Payment Completed</h1>
          <p>Your subscription has been activated successfully.</p>
          <p style="margin-top: 20px;">You can now go back to the app.</p>
        </div>
      </body>
    </html>
  `);
});

/**
 * GET /billing/cancel
 * 
 * Simple HTML page shown when payment is canceled
 * Mobile app users will see this page if they cancel the checkout
 */
router.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Canceled</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            text-align: center;
            padding: 40px 20px;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          h1 {
            color: #ef4444;
            font-size: 2.5em;
            margin: 0 0 20px 0;
          }
          p {
            color: #6b7280;
            font-size: 1.1em;
            line-height: 1.6;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Payment Canceled</h1>
          <p>Your payment was canceled.</p>
          <p style="margin-top: 20px;">If this was a mistake, you can start the payment again from the app.</p>
        </div>
      </body>
    </html>
  `);
});

/**
 * GET /api/billing/status
 * 
 * Get the current user's subscription status
 * Mobile app can call this endpoint to check if user has an active subscription
 * 
 * Returns:
 *   - active: boolean (true if status is 'active')
 *   - status: string (subscription status from database)
 *   - current_period_end: timestamp or null
 *   - stripe_sub_id: subscription ID from Stripe
 *   - stripe_customer_id: customer ID from Stripe
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the most recent subscription for this user
    const result = await query(
      `SELECT 
        status, 
        current_period_end, 
        stripe_sub_id, 
        stripe_customer_id,
        created_at,
        updated_at
      FROM subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        active: false,
        status: 'none',
        subscription: null
      });
    }

    const sub = result.rows[0];

    // Determine if subscription is active
    // For now, just check status. Later you can add logic to check current_period_end
    const isActive = sub.status === 'active' || sub.status === 'trialing';

    res.json({
      success: true,
      active: isActive,
      status: sub.status,
      current_period_end: sub.current_period_end,
      stripe_sub_id: sub.stripe_sub_id,
      stripe_customer_id: sub.stripe_customer_id,
      created_at: sub.created_at,
      updated_at: sub.updated_at
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

