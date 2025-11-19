import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';

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
router.post('/create-checkout-session', authenticate, async (req: Request, res: Response) => {
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
    const priceIdMap: Record<string, string> = {
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

    // Get frontend URL for success/cancel redirects
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const successUrl = `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/billing/cancel`;

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
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

