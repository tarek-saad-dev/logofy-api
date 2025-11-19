# Billing System Quick Reference

## Routes

### Create Checkout Session
```javascript
POST /api/billing/create-checkout-session
Authorization: Bearer <JWT_TOKEN>
Body: { "plan": "weekly" | "monthly" | "yearly" }
Response: { "success": true, "url": "https://checkout.stripe.com/..." }
```

### Stripe Webhook
```javascript
POST /api/stripe/webhook
Headers: stripe-signature: <signature>
Body: <raw JSON from Stripe>
```

## Middleware Usage

### Basic Entitlement Check
```javascript
const { authenticate } = require('./middleware/auth');
const { entitlementMiddleware } = require('./middleware/entitlement');

router.get('/route', authenticate, entitlementMiddleware, (req, res) => {
  const entitlement = req.entitlement; // 'guest' | 'trial' | 'pro'
  // Use entitlement...
});
```

### Pro-Only Route
```javascript
const { authenticate } = require('./middleware/auth');
const { entitlementMiddleware, requirePro } = require('./middleware/entitlement');

router.get('/pro-only', authenticate, entitlementMiddleware, requirePro, (req, res) => {
  // Only Pro users can access
});
```

## Entitlement Logic

```
Priority Order:
1. Stripe subscription (active/trialing + valid period_end) → 'pro'
2. Manual trial (tier='trial' + tier_expires_at > now) → 'trial'
3. Default → 'guest'
```

## Database Queries

### Check User Subscription
```sql
SELECT * FROM subscriptions 
WHERE user_id = 'user-uuid' 
  AND status IN ('active', 'trialing') 
  AND current_period_end > NOW();
```

### Grant Manual Trial
```sql
UPDATE users 
SET tier = 'trial', 
    tier_expires_at = NOW() + INTERVAL '7 days'
WHERE id = 'user-uuid';
```

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_WEEKLY=price_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
FRONTEND_URL=http://localhost:3000
```

